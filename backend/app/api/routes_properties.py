from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.db_models import PropertyAttributeStateDB
from app.models.schemas import PropertySummary
from app.services.attribute_scorer import compute_overall_scores, initialize_attribute_scores
from app.services.property_context_service import list_properties

router = APIRouter(tags=["properties"])


def _load_database_scores(property_id: str, db: Session) -> dict:
    """Load attribute scores from database for this property"""
    scores = {}
    rows = db.query(PropertyAttributeStateDB).filter(
        PropertyAttributeStateDB.property_id == str(property_id)
    ).all()

    for row in rows:
        # Try to convert to float, fallback to 0.0 if it's non-numeric
        try:
            confidence = float(row.confidence) if row.confidence is not None else 0.0
        except (ValueError, TypeError):
            confidence = 0.0

        try:
            freshness = float(row.freshness) if row.freshness is not None else 0.0
        except (ValueError, TypeError):
            freshness = 0.0

        scores[row.attribute] = {
            "confidence": confidence,
            "freshness": freshness,
            "status": row.current_status,
            "label": row.label,
            "last_evidence": row.last_evidence,
        }
    return scores


def _merge_scores(base_scores: dict, db_scores: dict) -> dict:
    """Merge database scores over base initialization scores"""
    merged = base_scores.copy()
    for attr_key, db_data in db_scores.items():
        if attr_key in merged:
            # Update confidence and freshness with database values
            merged[attr_key]["confidence"] = db_data.get("confidence", merged[attr_key]["confidence"])
            merged[attr_key]["freshness"] = db_data.get("freshness", merged[attr_key]["freshness"])
    return merged


def _build_property_summary(prop: dict, db: Session) -> PropertySummary:
    scores = initialize_attribute_scores(prop)

    # Load and merge database scores
    db_scores_dict = _load_database_scores(prop["id"], db)
    for score in scores:
        if score["key"] in db_scores_dict:
            db_data = db_scores_dict[score["key"]]
            score["confidence_score"] = float(db_data.get("confidence", score["confidence_score"]))
            score["freshness_score"] = float(db_data.get("freshness", score["freshness_score"]))

    overall_conf, overall_fresh, trust = compute_overall_scores(scores)

    review_count = int(prop.get("review_count") or 0)
    latest_review_date = prop.get("latest_review_date")

    badges: list[str] = []
    if overall_conf < 50:
        badges.append("Low confidence")
    if overall_fresh < 50:
        badges.append("Stale signals")
    if review_count >= 20:
        badges.append("Rich review history")
    if prop.get("pet_policy"):
        badges.append("Policy details available")
    if not badges:
        badges.append("Needs fresh guest input")

    stale_hint_parts: list[str] = []
    if prop.get("amenities"):
        stale_hint_parts.append("Amenity signals may still need fresh guest confirmation")
    if prop.get("pet_policy") or prop.get("checkin_policy") or prop.get("checkout_policy"):
        stale_hint_parts.append("Policy details can be sharpened with recent guest evidence")
    if latest_review_date:
        stale_hint_parts.append(f"Latest known review: {latest_review_date}")

    stale_hint = ". ".join(stale_hint_parts) if stale_hint_parts else "Property profile still needs fresher guest evidence."

    return PropertySummary(
        id=prop["id"],
        name=prop["name"],
        city=prop["city"],
        province=prop.get("province"),
        country=prop["country"],
        area_description=prop.get("area_description"),
        property_description=prop.get("property_description"),
        star_rating=prop.get("star_rating"),
        thumbnail_url=prop.get("thumbnail_url"),
        badges=badges[:3],
        stale_hint=stale_hint,
        current_confidence=overall_conf,
        current_freshness=overall_fresh,
        trust_score=trust,
    )


@router.get("/properties", response_model=list[PropertySummary])
def get_properties(db: Session = Depends(get_db)):
    props = list_properties()
    return [_build_property_summary(prop, db) for prop in props]