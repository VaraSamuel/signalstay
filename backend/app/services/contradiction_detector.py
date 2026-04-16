from typing import Dict, List, Any

import pandas as pd

from app.core.config import settings
from app.services.topic_extractor import get_topic_keywords
from app.utils.text import safe_str


CONTRADICTION_PATTERNS = {
    "parking": [
        ("free parking", "paid parking"),
        ("free parking", "valet"),
        ("self parking", "valet"),
    ],
    "pool": [
        ("pool open", "pool closed"),
    ],
    "breakfast": [
        ("free breakfast", "paid breakfast"),
    ],
}


def detect_contradictions_for_property(property_id: str) -> List[Dict[str, Any]]:
    reviews = pd.read_csv(settings.REVIEWS_FILE)

    property_col = _find_column(reviews, [
    "eg_property_id",
    "property_id", "propertyid",
    "hotel_id", "hotelid",
    "offering_id", "offeringid",
    "id"])

    text_col = _find_column(reviews, [
    "review_text", "reviewtext",
    "review", "text", "reviewbody", "body"])
    



    if not property_col or not text_col:
        return []

    reviews = reviews[reviews[property_col].astype(str) == str(property_id)].copy()
    if reviews.empty:
        return []

    texts = " ".join(reviews[text_col].fillna("").astype(str).str.lower().tolist())

    contradictions = []
    for topic, pairs in CONTRADICTION_PATTERNS.items():
        for left, right in pairs:
            if left in texts and right in texts:
                contradictions.append(
                    {
                        "topic": topic,
                        "type": "review_conflict",
                        "evidence": [left, right],
                        "score": 0.8,
                    }
                )

    return contradictions


def _find_column(df: pd.DataFrame, candidates):
    lower_map = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]
    return None