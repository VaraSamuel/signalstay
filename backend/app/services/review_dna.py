from collections import defaultdict
from typing import Dict, Any

import pandas as pd

from app.core.config import settings
from app.services.topic_extractor import get_topic_keywords
from app.utils.text import safe_str


def _find_column(df: pd.DataFrame, candidates):
    lower_map = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]
    return None


def build_review_dna_for_property(property_id: str) -> Dict[str, Any]:
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
        return {"timeline": {}, "error": "Could not infer required columns from reviews CSV."}

    reviews = reviews[reviews[property_col].astype(str) == str(property_id)].copy()
    if reviews.empty:
        return {"timeline": {}, "error": f"No reviews found for property_id={property_id}"}

    reviews[date_col] = pd.to_datetime(reviews[date_col], errors="coerce")
    reviews = reviews.dropna(subset=[date_col])
    reviews["month"] = reviews[date_col].dt.to_period("M").astype(str)

    topic_keywords = get_topic_keywords()
    timeline = defaultdict(lambda: defaultdict(int))

    for _, row in reviews.iterrows():
        text = safe_str(row[text_col]).lower()
        month = row["month"]
        for topic, keywords in topic_keywords.items():
            if any(keyword in text for keyword in keywords):
                timeline[topic][month] += 1

    return {"timeline": {k: dict(v) for k, v in timeline.items()}}