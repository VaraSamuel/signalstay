from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.models.schemas import ExtractedFact, PropertyAttributeState, PropertyTruthRecord

ATTRIBUTE_LABELS: Dict[str, str] = {
    "pool": "Pool",
    "gym": "Gym",
    "parking": "Parking",
    "business_center": "Business Center",
    "wifi": "Wi-Fi",
    "breakfast": "Breakfast",
    "air_conditioning": "Air Conditioning",
    "cleanliness": "Cleanliness",
    "noise": "Noise",
    "service": "Service",
    "location": "Location",
    "checkin": "Checkin",
    "bathroom": "Bathroom",
    "bed": "Bed",
}

DEFAULT_ATTRIBUTE_ORDER: List[str] = [
    "gym",
    "pool",
    "parking",
    "wifi",
    "breakfast",
    "business_center",
    "air_conditioning",
    "cleanliness",
    "noise",
    "service",
    "location",
    "checkin",
    "bathroom",
    "bed",
]


def build_default_record(
    property_id: str,
    property_name: Optional[str],
    property_context: Optional[dict] = None,
) -> PropertyTruthRecord:
    property_context = property_context or {}
    amenities_blob = str(property_context.get("popular_amenities_list") or "").lower()
    property_description = str(property_context.get("property_description") or "").lower()
    check_in_text = str(property_context.get("check_in_instructions") or "").lower()
    area_description = str(property_context.get("area_description") or "").lower()

    def listed(hints: List[str]) -> bool:
        text = f"{amenities_blob} {property_description} {check_in_text} {area_description}"
        return any(hint in text for hint in hints)

    listing_hints = {
        "pool": ["pool", "swimming"],
        "gym": ["gym", "fitness", "workout"],
        "parking": ["parking", "garage", "valet"],
        "wifi": ["wifi", "wi-fi", "internet"],
        "breakfast": ["breakfast"],
        "business_center": ["business center", "business centre"],
        "air_conditioning": ["air conditioning", "a/c", "ac"],
        "checkin": ["check-in", "check in", "front desk"],
        "bathroom": ["bathroom", "shower", "bathtub"],
        "bed": ["bed", "mattress"],
        "location": ["located", "near", "walk to", "minutes by foot"],
    }

    attributes = {}
    for key in DEFAULT_ATTRIBUTE_ORDER:
        is_listed = listed(listing_hints.get(key, []))
        attributes[key] = PropertyAttributeState(
            attribute=key,
            label=ATTRIBUTE_LABELS[key],
            current_status="available" if is_listed and key not in {"cleanliness", "noise", "service", "location"} else "unknown",
            freshness="stale" if is_listed else "unresolved",
            confidence=0.45 if is_listed else 0.0,
            source="listing" if is_listed else None,
            last_evidence="Listed in property description." if is_listed else None,
        )

    return PropertyTruthRecord(
        property_id=property_id,
        property_name=property_name,
        attributes=attributes,
        confidence_score=0,
        summary="",
        audit_log=[],
    )


def _is_conflicting(existing_status: str, new_status: str) -> bool:
    if existing_status == "unknown" or new_status == "unknown":
        return False
    if existing_status == new_status:
        return False

    opposite_pairs = {
        ("open", "closed"),
        ("closed", "open"),
        ("available", "unavailable"),
        ("unavailable", "available"),
        ("working", "not_working"),
        ("not_working", "working"),
        ("clean", "unclean"),
        ("unclean", "clean"),
        ("quiet", "noisy"),
        ("noisy", "quiet"),
        ("positive", "negative"),
        ("negative", "positive"),
    }
    return (existing_status, new_status) in opposite_pairs


def merge_facts(
    record: PropertyTruthRecord,
    facts: List[ExtractedFact],
    source: str,
    raw_text: str,
) -> List[str]:
    now = datetime.now(timezone.utc).isoformat()
    updated_attributes: List[str] = []

    for fact in facts:
        state = record.attributes.get(fact.attribute)
        if state is None:
            continue

        previous_status = state.current_status
        previous_confidence = state.confidence

        if fact.confidence < 0.55:
            state.history.append(
                {
                    "timestamp": now,
                    "source": source,
                    "action": "ignored_low_confidence",
                    "candidate_status": fact.status,
                    "confidence": fact.confidence,
                    "evidence": fact.evidence,
                }
            )
            continue

        if _is_conflicting(previous_status, fact.status) and previous_confidence >= 0.65:
            state.freshness = "conflicting"
            state.history.append(
                {
                    "timestamp": now,
                    "source": source,
                    "action": "conflict_detected",
                    "old_status": previous_status,
                    "new_status": fact.status,
                    "confidence": fact.confidence,
                    "evidence": fact.evidence,
                }
            )
            updated_attributes.append(fact.attribute)
            continue

        state.current_status = fact.status
        state.freshness = "resolved"
        state.confidence = fact.confidence
        state.last_evidence = fact.evidence
        state.last_updated_at = now
        state.source = source
        state.sentiment = fact.sentiment
        state.history.append(
            {
                "timestamp": now,
                "source": source,
                "action": "updated",
                "status": fact.status,
                "confidence": fact.confidence,
                "evidence": fact.evidence,
                "raw_span": fact.raw_span,
                "metadata": fact.metadata,
            }
        )
        updated_attributes.append(fact.attribute)

    resolved = sum(1 for state in record.attributes.values() if state.freshness == "resolved")
    conflicting = sum(1 for state in record.attributes.values() if state.freshness == "conflicting")
    total = len(record.attributes)

    base_score = int((resolved / total) * 100) if total else 0
    penalty = conflicting * 8
    record.confidence_score = max(0, min(100, base_score - penalty))

    record.audit_log.append(
        {
            "timestamp": now,
            "source": source,
            "raw_text": raw_text,
            "updated_attributes": updated_attributes,
        }
    )

    return updated_attributes