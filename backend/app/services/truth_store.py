import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.db_models import (
    PropertyAttributeStateDB,
    PropertyInteractionEventDB,
    PropertyTruthRecordDB,
)
from app.models.schemas import PropertyAttributeState, PropertyTruthRecord


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _json_loads(value: Optional[str], default: Any):
    if not value:
        return default
    try:
        return json.loads(value)
    except Exception:
        return default


def get_truth_record(db: Session, property_id: str) -> Optional[PropertyTruthRecord]:
    snapshot = (
        db.query(PropertyTruthRecordDB)
        .filter(PropertyTruthRecordDB.property_id == property_id)
        .first()
    )
    if snapshot is None:
        return None

    rows = (
        db.query(PropertyAttributeStateDB)
        .filter(PropertyAttributeStateDB.property_id == property_id)
        .all()
    )

    attributes: Dict[str, PropertyAttributeState] = {}
    for row in rows:
        attributes[row.attribute] = PropertyAttributeState(
            attribute=row.attribute,
            label=row.label,
            current_status=row.current_status,
            freshness=row.freshness,
            confidence=row.confidence or 0.0,
            source=row.source,
            sentiment=row.sentiment,
            last_evidence=row.last_evidence,
            last_updated_at=row.last_updated_at,
            history=_json_loads(row.history_json, []),
        )

    return PropertyTruthRecord(
        property_id=snapshot.property_id,
        property_name=snapshot.property_name,
        attributes=attributes,
        confidence_score=snapshot.confidence_score or 0,
        summary=snapshot.summary or "",
        audit_log=_json_loads(snapshot.audit_log_json, []),
    )


def upsert_truth_record(db: Session, record: PropertyTruthRecord) -> PropertyTruthRecord:
    snapshot = (
        db.query(PropertyTruthRecordDB)
        .filter(PropertyTruthRecordDB.property_id == record.property_id)
        .first()
    )

    if snapshot is None:
        snapshot = PropertyTruthRecordDB(
            property_id=record.property_id,
            property_name=record.property_name,
        )
        db.add(snapshot)

    snapshot.property_name = record.property_name
    snapshot.confidence_score = record.confidence_score
    snapshot.summary = record.summary or ""
    snapshot.audit_log_json = _json_dumps(record.audit_log)

    existing_rows = {
        row.attribute: row
        for row in db.query(PropertyAttributeStateDB)
        .filter(PropertyAttributeStateDB.property_id == record.property_id)
        .all()
    }

    seen_attributes = set()

    for attribute, state in record.attributes.items():
        row = existing_rows.get(attribute)
        if row is None:
            row = PropertyAttributeStateDB(
                property_id=record.property_id,
                attribute=attribute,
            )
            db.add(row)

        row.label = state.label
        row.current_status = state.current_status
        row.freshness = state.freshness
        row.confidence = state.confidence
        row.source = state.source
        row.sentiment = state.sentiment
        row.last_evidence = state.last_evidence
        row.last_updated_at = state.last_updated_at
        row.history_json = _json_dumps(state.history)

        seen_attributes.add(attribute)

    for attribute, row in existing_rows.items():
        if attribute not in seen_attributes:
            db.delete(row)

    db.commit()
    return get_truth_record(db, record.property_id)


def append_event(
    db: Session,
    property_id: str,
    event_type: str,
    content: Optional[str] = None,
    attribute: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> None:
    event = PropertyInteractionEventDB(
        property_id=property_id,
        event_type=event_type,
        attribute=attribute,
        content=content,
        payload_json=_json_dumps(payload or {}),
    )
    db.add(event)
    db.commit()


def list_events(
    db: Session,
    property_id: str,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    rows = (
        db.query(PropertyInteractionEventDB)
        .filter(PropertyInteractionEventDB.property_id == property_id)
        .order_by(PropertyInteractionEventDB.created_at.asc())
        .limit(limit)
        .all()
    )

    events: List[Dict[str, Any]] = []
    for row in rows:
        events.append(
            {
                "event_type": row.event_type,
                "attribute": row.attribute,
                "content": row.content,
                "payload": _json_loads(row.payload_json, {}),
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )
    return events