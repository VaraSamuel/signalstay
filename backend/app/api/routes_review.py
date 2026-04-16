from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import ReviewAnswerLog, PropertyAttributeStateDB, ReviewSessionDB
from app.models.schemas import (
    DashboardResponse,
    ImprovePromptResponse,
    ReviewStartResponse,
    ReviewSubmitResponse,
    SubmitReviewRequest,
)
from app.services.attribute_scorer import (
    compute_overall_scores,
    initialize_attribute_scores,
    update_scores_from_answer,
)
from app.services.dashboard_builder import build_dashboard
from app.services.property_context_service import get_property_by_id, list_properties
from app.services.question_generator import (
    build_followup_prompt,
    build_initial_prompt,
    build_weakest_signal_prompt,
)

router = APIRouter(tags=["review"])

# In-memory cache — speeds up reads within the same process lifetime
SESSION_CACHE: dict[str, dict] = {}


def _session_save(session_id: str, data: dict, db: Session) -> None:
    """Write session to DB and update memory cache."""
    SESSION_CACHE[session_id] = data
    row = db.query(ReviewSessionDB).filter(ReviewSessionDB.session_id == session_id).first()
    blob = json.dumps(data)
    if row:
        row.session_json = blob
    else:
        db.add(ReviewSessionDB(session_id=session_id, property_id=str(data["property_id"]), session_json=blob))
    db.commit()


def _session_load(session_id: str, db: Session) -> Optional[dict]:
    """Load session from memory cache, falling back to DB."""
    if session_id in SESSION_CACHE:
        return SESSION_CACHE[session_id]
    row = db.query(ReviewSessionDB).filter(ReviewSessionDB.session_id == session_id).first()
    if not row:
        return None
    data = json.loads(row.session_json)
    SESSION_CACHE[session_id] = data
    return data


def _build_property_payload(prop: dict, overall_conf: float, overall_fresh: float, trust: float) -> dict:
    review_count = int(prop.get("review_count") or 0)
    latest_review_date = prop.get("latest_review_date")

    badges = ["Needs fresh guest input"]
    if overall_conf < 50:
        badges.append("Low confidence")
    if overall_fresh < 50:
        badges.append("Stale signals")
    if review_count >= 20:
        badges.append("Rich review history")

    stale_hint_parts = []
    if prop.get("amenities"):
        stale_hint_parts.append("Amenity signals may still be stale")
    if prop.get("pet_policy") or prop.get("checkin_policy") or prop.get("checkout_policy"):
        stale_hint_parts.append("Policy details can be sharpened with fresh guest evidence")
    if latest_review_date:
        stale_hint_parts.append(f"Latest known review: {latest_review_date}")

    stale_hint = ". ".join(stale_hint_parts) if stale_hint_parts else "Property profile still needs fresher guest evidence."

    return {
        **prop,
        "badges": badges[:3],
        "stale_hint": stale_hint,
        "current_confidence": overall_conf,
        "current_freshness": overall_fresh,
        "trust_score": trust,
    }


def _get_session_or_404(session_id: str, db: Session) -> dict:
    session = _session_load(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Review session not found")
    return session


def _serialize_start_response(session_id: str, session: dict, db: Session) -> ReviewStartResponse:
    prop = session["property"]
    current_scores = session["current_scores"]
    overall_conf, overall_fresh, trust = compute_overall_scores(current_scores)

    first_prompt = session.get("latest_prompt")
    if not first_prompt:
        first_prompt = build_initial_prompt(prop, current_scores)
        session["latest_prompt"] = deepcopy(first_prompt)
        _session_save(session_id, session, db)

    return ReviewStartResponse(
        session_id=session_id,
        property=_build_property_payload(prop, overall_conf, overall_fresh, trust),
        first_prompt=first_prompt,
        attribute_scores=current_scores,
        overall_confidence=overall_conf,
        overall_freshness=overall_fresh,
        overall_trust_score=trust,
    )


@router.get("/review/start/{property_id}", response_model=ReviewStartResponse)
def start_review(
    property_id: str,
    existing_session_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Reuse existing session if caller already has one for this property
    if existing_session_id:
        existing = _session_load(existing_session_id, db)
        if existing and str(existing["property_id"]) == str(property_id):
            return _serialize_start_response(existing_session_id, existing, db)

    initial_scores = initialize_attribute_scores(prop)

    # Load and merge database scores
    db_scores = db.query(PropertyAttributeStateDB).filter(
        PropertyAttributeStateDB.property_id == str(property_id)
    ).all()

    db_scores_map = {row.attribute: row for row in db_scores}
    for score in initial_scores:
        if score["key"] in db_scores_map:
            row = db_scores_map[score["key"]]
            try:
                score["confidence_score"] = float(row.confidence) if row.confidence is not None else score["confidence_score"]
            except (ValueError, TypeError):
                pass
            try:
                score["freshness_score"] = float(row.freshness) if row.freshness is not None else score["freshness_score"]
            except (ValueError, TypeError):
                pass

    first_prompt = build_initial_prompt(prop, initial_scores)
    session_id = str(uuid4())

    new_session = {
        "property_id": str(property_id),
        "property": deepcopy(prop),
        "initial_scores": deepcopy(initial_scores),
        "current_scores": deepcopy(initial_scores),
        "answers": [],
        "latest_prompt": deepcopy(first_prompt),
        "completed": False,
    }
    _session_save(session_id, new_session, db)

    return _serialize_start_response(session_id, new_session, db)


@router.get("/review/session/{session_id}", response_model=ReviewStartResponse)
def get_review_session(session_id: str, db: Session = Depends(get_db)):
    session = _get_session_or_404(session_id, db)
    return _serialize_start_response(session_id, session, db)


@router.post("/review/submit/{property_id}", response_model=ReviewSubmitResponse)
def submit_review(property_id: str, payload: SubmitReviewRequest, db: Session = Depends(get_db)):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    session = _get_session_or_404(payload.session_id, db)

    if str(session["property_id"]) != str(property_id):
        raise HTTPException(status_code=400, detail="Session does not match property")

    answer = (payload.answer or "").strip()
    if not answer:
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    current_scores = deepcopy(session["current_scores"])
    updated_scores = update_scores_from_answer(current_scores, answer)

    session["current_scores"] = deepcopy(updated_scores)
    session["answers"].append(
        {
            "step": payload.step,
            "answer": answer,
            "prompt": deepcopy(session.get("latest_prompt")),
        }
    )

    # Persist updated session
    _session_save(payload.session_id, session, db)

    # Save answer log and attribute scores to database
    try:
        db_log = ReviewAnswerLog(
            property_id=str(property_id),
            review_text=answer,
            asked_questions=str(session.get("latest_prompt", {}).get("question", "")),
            user_answer=answer,
        )
        db.add(db_log)

        # Also save updated attribute scores
        for attr_data in updated_scores:
            attr_key = attr_data.get("key")
            existing = db.query(PropertyAttributeStateDB).filter(
                PropertyAttributeStateDB.property_id == str(property_id),
                PropertyAttributeStateDB.attribute == attr_key,
            ).first()

            if existing:
                existing.confidence = attr_data.get("confidence_score", 0)
                existing.freshness = attr_data.get("freshness_score", 0)
                existing.current_status = attr_data.get("status", "unknown")
                existing.last_evidence = answer[:500]
                existing.last_updated_at = datetime.now().isoformat()
            else:
                db.add(PropertyAttributeStateDB(
                    property_id=str(property_id),
                    attribute=attr_key,
                    label=attr_data.get("label", attr_key),
                    current_status=attr_data.get("status", "unknown"),
                    confidence=attr_data.get("confidence_score", 0),
                    freshness=attr_data.get("freshness_score", 0),
                    last_evidence=answer[:500],
                    last_updated_at=datetime.now().isoformat(),
                ))

        db.commit()
    except Exception as e:
        print(f"Database save error: {e}")
        db.rollback()
        # Don't fail the request if DB save fails, just continue

    # Step 1 => return next prompt, do NOT restart flow
    if payload.step == 1:
        next_prompt = build_followup_prompt(prop, updated_scores, answer)
        session["latest_prompt"] = deepcopy(next_prompt)
        session["completed"] = False

        return ReviewSubmitResponse(
            session_id=payload.session_id,
            completed=False,
            next_prompt=next_prompt,
            dashboard=None,
            attribute_scores=updated_scores,
        )

    # Step 2+ => finalize dashboard FROM SESSION SCORES
    dashboard = build_dashboard(prop, session["initial_scores"], updated_scores, list_properties())
    session["completed"] = True
    _session_save(payload.session_id, session, db)

    return ReviewSubmitResponse(
        session_id=payload.session_id,
        completed=True,
        next_prompt=None,
        dashboard=dashboard,
        attribute_scores=updated_scores,
    )


@router.get("/review/dashboard/{session_id}", response_model=DashboardResponse)
def get_review_dashboard(session_id: str, db: Session = Depends(get_db)):
    session = _get_session_or_404(session_id, db)
    prop = session["property"]
    return build_dashboard(prop, session["initial_scores"], session["current_scores"], list_properties())


@router.get("/improve/{property_id}", response_model=ImprovePromptResponse)
def improve_property(
    property_id: str,
    existing_session_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # If there is an active session, use its live scores
    if existing_session_id:
        existing = _session_load(existing_session_id, db)
        if existing and str(existing["property_id"]) == str(property_id):
            scores = existing["current_scores"]
            prompt = build_weakest_signal_prompt(prop, scores)
            existing["latest_prompt"] = deepcopy(prompt)
            _session_save(existing_session_id, existing, db)
            return ImprovePromptResponse(property_id=property_id, prompt=prompt)

    scores_list = initialize_attribute_scores(prop)
    scores = {s["key"]: s for s in scores_list}

    # Load and merge database scores
    db_scores = db.query(PropertyAttributeStateDB).filter(
        PropertyAttributeStateDB.property_id == str(property_id)
    ).all()

    db_scores_map = {row.attribute: row for row in db_scores}
    for score in scores_list:
        if score["key"] in db_scores_map:
            row = db_scores_map[score["key"]]
            try:
                score["confidence_score"] = float(row.confidence) if row.confidence is not None else score["confidence_score"]
            except (ValueError, TypeError):
                pass  # Keep default
            try:
                score["freshness_score"] = float(row.freshness) if row.freshness is not None else score["freshness_score"]
            except (ValueError, TypeError):
                pass  # Keep default

    prompt = build_weakest_signal_prompt(prop, scores_list)
    return ImprovePromptResponse(property_id=property_id, prompt=prompt)