from typing import Dict, Any

import pandas as pd

from app.core.config import settings
from app.services.topic_extractor import get_topic_keywords
from app.services.review_dna import build_review_dna_for_property
from app.services.contradiction_detector import detect_contradictions_for_property
from app.utils.dates import months_since


def detect_gaps_for_property(property_id: str) -> Dict[str, Any]:
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

    date_col = _find_column(reviews, [
    "acquisition_date",   # 🔥 THIS IS YOUR REAL DATE COLUMN
    "date", "review_date", "reviewdate",
    "created_at", "createdat"])


    if not property_col or not text_col or not date_col:
        return {"topic_status": {}, "error": "Could not infer required columns."}

    subset = reviews[reviews[property_col].astype(str) == str(property_id)].copy()
    if subset.empty:
        return {"topic_status": {}, "error": f"No reviews found for property_id={property_id}"}

    subset[date_col] = pd.to_datetime(subset[date_col], errors="coerce")
    subset = subset.dropna(subset=[date_col])

    topic_keywords = get_topic_keywords()
    contradictions = detect_contradictions_for_property(property_id)

    contradiction_topics = {c["topic"] for c in contradictions}
    topic_status = {}

    for topic, keywords in topic_keywords.items():
        mask = subset[text_col].fillna("").astype(str).str.lower().apply(
            lambda t: any(keyword in t for keyword in keywords)
        )
        topic_reviews = subset[mask]

        mention_count = int(len(topic_reviews))
        if mention_count == 0:
            topic_status[topic] = {
                "status": "missing",
                "mention_count": 0,
                "last_mentioned": None,
                "months_since_last_mention": 999,
                "stale_score": 1.0,
                "missing_score": 1.0,
                "contradiction_score": 1.0 if topic in contradiction_topics else 0.0,
            }
            continue

        last_mentioned = topic_reviews[date_col].max()
        since = months_since(last_mentioned)

        status = "fresh"
        stale_score = 0.0
        missing_score = 0.0

        if since >= 6:
            status = "stale"
            stale_score = 1.0
        elif since >= 3:
            status = "aging"
            stale_score = 0.6

        if mention_count <= 2:
            missing_score = 0.8
        elif mention_count <= 5:
            missing_score = 0.4

        if topic in contradiction_topics:
            status = "conflicting"

        topic_status[topic] = {
            "status": status,
            "mention_count": mention_count,
            "last_mentioned": str(last_mentioned.date()) if pd.notna(last_mentioned) else None,
            "months_since_last_mention": round(float(since), 2),
            "stale_score": stale_score,
            "missing_score": missing_score,
            "contradiction_score": 1.0 if topic in contradiction_topics else 0.0,
        }

    dna = build_review_dna_for_property(property_id)

    return {
        "topic_status": topic_status,
        "timeline": dna.get("timeline", {}),
        "contradictions": contradictions,
    }


def _find_column(df: pd.DataFrame, candidates):
    lower_map = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]
    return None