from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Dict, List, Tuple
import math
import re

ATTRIBUTE_CONFIG: Dict[str, Dict] = {
    "cleanliness": {
        "label": "Cleanliness",
        "category": "Experience",
        "weight": 1.35,
        "keywords": ["clean", "dirty", "spotless", "smell", "hygiene", "dusty", "filthy", "stained"],
        "default_value": 5.3,
        "default_confidence": 36.0,
        "default_freshness": 31.0,
    },
    "staff": {
        "label": "Staff",
        "category": "Experience",
        "weight": 1.15,
        "keywords": ["staff", "service", "front desk", "helpful", "rude", "friendly", "reception", "manager"],
        "default_value": 5.4,
        "default_confidence": 38.0,
        "default_freshness": 33.0,
    },
    "checkin_experience": {
        "label": "Check-in",
        "category": "Experience",
        "weight": 0.95,
        "keywords": ["check in", "check-in", "late checkin", "front desk", "queue", "waiting", "arrival", "checkin"],
        "default_value": 5.1,
        "default_confidence": 35.0,
        "default_freshness": 29.0,
    },
    "quietness": {
        "label": "Quietness",
        "category": "Experience",
        "weight": 0.95,
        "keywords": ["quiet", "noisy", "noise", "sleep", "street noise", "loud", "thin walls"],
        "default_value": 5.0,
        "default_confidence": 34.0,
        "default_freshness": 30.0,
    },
    "safety": {
        "label": "Safety",
        "category": "Experience",
        "weight": 1.40,
        "keywords": ["safe", "unsafe", "security", "neighborhood", "secure", "dangerous", "sketchy"],
        "default_value": 5.5,
        "default_confidence": 34.0,
        "default_freshness": 29.0,
    },
    "room_condition": {
        "label": "Room Condition",
        "category": "Room",
        "weight": 1.25,
        "keywords": ["room", "broken", "renovated", "old", "condition", "dated", "modern", "worn"],
        "default_value": 5.2,
        "default_confidence": 35.0,
        "default_freshness": 30.0,
    },
    "bathroom": {
        "label": "Bathroom",
        "category": "Room",
        "weight": 1.10,
        "keywords": ["bathroom", "shower", "toilet", "water pressure", "sink", "bath"],
        "default_value": 5.1,
        "default_confidence": 32.0,
        "default_freshness": 28.0,
    },
    "bed_comfort": {
        "label": "Bed Comfort",
        "category": "Room",
        "weight": 1.00,
        "keywords": ["bed", "mattress", "pillows", "sleep", "comfortable", "hard bed", "soft bed"],
        "default_value": 5.3,
        "default_confidence": 33.0,
        "default_freshness": 29.0,
    },
    "wifi": {
        "label": "Wi-Fi",
        "category": "Amenities",
        "weight": 1.00,
        "keywords": ["wifi", "wi-fi", "internet", "connection", "slow internet", "signal", "online"],
        "default_value": 5.0,
        "default_confidence": 28.0,
        "default_freshness": 22.0,
    },
    "pool": {
        "label": "Pool",
        "category": "Amenities",
        "weight": 0.85,
        "keywords": ["pool", "swimming", "crowded pool", "water"],
        "default_value": 5.0,
        "default_confidence": 26.0,
        "default_freshness": 20.0,
    },
    "gym": {
        "label": "Gym",
        "category": "Amenities",
        "weight": 0.85,
        "keywords": ["gym", "fitness", "workout", "machines", "equipment", "weights", "treadmill"],
        "default_value": 5.0,
        "default_confidence": 25.0,
        "default_freshness": 19.0,
    },
    "parking": {
        "label": "Parking",
        "category": "Amenities",
        "weight": 0.80,
        "keywords": ["parking", "garage", "free parking", "valet", "lot"],
        "default_value": 5.1,
        "default_confidence": 31.0,
        "default_freshness": 26.0,
    },
    "breakfast": {
        "label": "Breakfast",
        "category": "Amenities",
        "weight": 0.85,
        "keywords": ["breakfast", "food", "buffet", "coffee", "eggs"],
        "default_value": 5.0,
        "default_confidence": 27.0,
        "default_freshness": 22.0,
    },
    "location_access": {
        "label": "Location Access",
        "category": "Location",
        "weight": 1.20,
        "keywords": ["location", "walkable", "metro", "subway", "close to", "near", "central", "accessible"],
        "default_value": 6.1,
        "default_confidence": 52.0,
        "default_freshness": 48.0,
    },
    "pet_policy": {
        "label": "Pet Policy",
        "category": "Policy",
        "weight": 0.75,
        "keywords": ["pet", "pets", "dog", "cat", "pet fee", "pet policy", "animals"],
        "default_value": 5.0,
        "default_confidence": 26.0,
        "default_freshness": 21.0,
    },
    "value_for_money": {
        "label": "Value for Money",
        "category": "Economy",
        "weight": 1.20,
        "keywords": [
            "price", "value", "worth", "expensive", "cheap", "affordable",
            "overpriced", "deal", "budget", "cost", "money", "rate", "fee",
            "reasonable", "pricey", "good value", "not worth", "bang for",
        ],
        "default_value": 5.0,
        "default_confidence": 29.0,
        "default_freshness": 24.0,
    },
}

POSITIVE_WORDS = {
    "good", "great", "excellent", "clean", "spotless", "helpful", "friendly",
    "fast", "easy", "safe", "quiet", "comfortable", "amazing", "free",
    "modern", "reliable", "smooth", "convenient", "nice", "spacious", "clear"
}
NEGATIVE_WORDS = {
    "bad", "poor", "dirty", "rude", "slow", "broken", "unsafe", "noisy",
    "uncomfortable", "smelly", "crowded", "late", "tiny", "dated",
    "terrible", "awful", "unusable", "unclear", "confusing", "limited", "worn"
}
NEGATIONS = {"not", "no", "never", "wasn't", "weren't", "isn't", "didn't", "don't", "cannot", "can't"}
HIGH_CONFIDENCE_MARKERS = {"actually", "definitely", "clearly", "recently", "during my stay", "when i stayed"}
DIRECT_EXPERIENCE_MARKERS = {"i stayed", "my stay", "we stayed", "when i stayed", "during our stay", "i used", "we used"}


def _safe_float(value) -> float | None:
    try:
        if value is None:
            return None
        v = float(value)
        if math.isnan(v):
            return None
        return v
    except Exception:
        return None


def _contains_any(text: str, options: List[str]) -> bool:
    lowered = text.lower()
    return any(opt in lowered for opt in options)


def _status_from_scores(value_score: float, confidence_score: float, freshness_score: float) -> str:
    if confidence_score >= 72 and freshness_score >= 68 and value_score >= 6.0:
        return "strong"
    if confidence_score >= 48 and freshness_score >= 42:
        return "medium"
    return "weak"


def _split_sentences(text: str) -> List[str]:
    parts = re.split(r"[.!?]\s+|\n+", text.strip())
    return [p.strip().lower() for p in parts if p.strip()]


def _sentence_sentiment(sentence: str) -> float:
    tokens = re.findall(r"\b[\w'-]+\b", sentence.lower())
    score = 0.0
    for i, token in enumerate(tokens):
        negated = i > 0 and tokens[i - 1] in NEGATIONS
        if token in POSITIVE_WORDS:
            score += -1.0 if negated else 1.0
        elif token in NEGATIVE_WORDS:
            score += 1.0 if negated else -1.0
    return score


def _evidence_strength(sentence: str) -> float:
    strength = 1.0
    if any(marker in sentence for marker in HIGH_CONFIDENCE_MARKERS):
        strength += 0.25
    if any(marker in sentence for marker in DIRECT_EXPERIENCE_MARKERS):
        strength += 0.35
    return strength


def initialize_attribute_scores(property_data: Dict | None = None) -> List[Dict]:
    scores: List[Dict] = []
    now = datetime.utcnow().isoformat()

    amenities_text = " ".join((property_data or {}).get("amenities", [])).lower()
    pet_policy_text = str((property_data or {}).get("pet_policy", "")).lower()
    checkin_text = str((property_data or {}).get("checkin_policy", "")).lower()
    checkout_text = str((property_data or {}).get("checkout_policy", "")).lower()
    latest_review_text = str((property_data or {}).get("latest_review_text", "")).lower()

    star_rating = _safe_float((property_data or {}).get("star_rating"))
    expedia_rating = _safe_float((property_data or {}).get("guestrating_avg_expedia"))
    avg_review_rating = _safe_float((property_data or {}).get("avg_review_rating"))
    review_count = int((property_data or {}).get("review_count") or 0)

    for key, cfg in ATTRIBUTE_CONFIG.items():
        value = cfg["default_value"]
        conf = cfg["default_confidence"]
        fresh = cfg["default_freshness"]

        if star_rating is not None:
            value += max(-0.4, min(0.9, (star_rating - 3.0) * 0.35))

        if expedia_rating is not None and expedia_rating > 0:
            value += max(-0.5, min(0.8, (expedia_rating - 3.5) * 0.25))

        if avg_review_rating is not None and avg_review_rating > 0:
            value += max(-0.6, min(0.9, (avg_review_rating - 3.5) * 0.30))
            conf += min(12.0, review_count * 0.15)

        if review_count > 0:
            fresh += min(10.0, math.log1p(review_count) * 2.5)

        if key == "location_access":
            conf += 8.0
            fresh += 6.0

        if key == "pet_policy" and pet_policy_text.strip():
            conf += 18.0
            fresh += 14.0

        if key == "checkin_experience" and checkin_text.strip():
            conf += 12.0
            fresh += 10.0

        if key == "checkin_experience" and checkout_text.strip():
            conf += 4.0
            fresh += 3.0

        if key == "gym" and _contains_any(amenities_text, ["gym", "fitness center", "fitness"]):
            conf += 16.0
            fresh += 12.0

        if key == "pool" and _contains_any(amenities_text, ["pool", "indoor pool", "outdoor pool"]):
            conf += 16.0
            fresh += 12.0

        if key == "wifi" and _contains_any(amenities_text, ["wifi", "wi-fi", "internet"]):
            conf += 12.0
            fresh += 10.0

        if key == "parking" and _contains_any(amenities_text, ["parking", "free parking", "garage", "valet"]):
            conf += 14.0
            fresh += 10.0

        if key == "breakfast" and _contains_any(amenities_text, ["breakfast", "buffet", "continental breakfast"]):
            conf += 12.0
            fresh += 10.0

        if key == "value_for_money":
            # More reviews = stronger price signal
            if review_count > 20:
                conf += min(14.0, review_count * 0.12)
                fresh += min(10.0, review_count * 0.08)
            # If expedia rating exists, guest satisfaction informs value perception
            if expedia_rating is not None and expedia_rating > 0:
                conf += 6.0
            # Economy properties (lower star) tend to be judged more on value
            if star_rating is not None and star_rating <= 3.0:
                conf += 4.0
                fresh += 3.0

        if latest_review_text:
            if any(kw in latest_review_text for kw in cfg["keywords"]):
                conf += 6.0
                fresh += 8.0

        value = max(0.0, min(10.0, round(value, 1)))
        conf = max(0.0, min(100.0, round(conf, 1)))
        fresh = max(0.0, min(100.0, round(fresh, 1)))

        scores.append(
            {
                "key": key,
                "label": cfg["label"],
                "category": cfg["category"],
                "weight": cfg["weight"],
                "value_score": value,
                "confidence_score": conf,
                "freshness_score": fresh,
                "evidence_count": 0,
                "stale": fresh < 50,
                "status": _status_from_scores(value, conf, fresh),
                "last_updated": now,
                "summary": "Property-informed baseline from metadata and historical reviews.",
                "updated_in_latest_review": False,
                "impact_score": 0.0,
            }
        )

    return scores


def compute_overall_scores(attribute_scores: List[Dict]) -> Tuple[float, float, float]:
    total_weight = sum(item["weight"] for item in attribute_scores) or 1.0

    weighted_value = sum(item["value_score"] * item["weight"] for item in attribute_scores) / total_weight
    weighted_conf = sum(item["confidence_score"] * item["weight"] for item in attribute_scores) / total_weight
    weighted_fresh = sum(item["freshness_score"] * item["weight"] for item in attribute_scores) / total_weight

    directly_updated = [x for x in attribute_scores if x.get("updated_in_latest_review")]
    direct_impact_bonus = 0.0
    if directly_updated:
        avg_impact = sum(x.get("impact_score", 0.0) * x["weight"] for x in directly_updated) / (
            sum(x["weight"] for x in directly_updated) or 1.0
        )
        direct_impact_bonus = min(0.6, avg_impact * 0.12)

    trust = (
        (weighted_value * 0.26)
        + ((weighted_conf / 10.0) * 0.37)
        + ((weighted_fresh / 10.0) * 0.37)
        + direct_impact_bonus
    )
    trust = max(0.0, min(10.0, trust))

    return round(weighted_conf, 1), round(weighted_fresh, 1), round(trust, 1)


def get_weakest_attribute(attribute_scores: List[Dict]) -> Dict:
    def weakness(item: Dict) -> float:
        return (
            (10.0 - item["value_score"]) * 0.20
            + ((100.0 - item["confidence_score"]) / 10.0) * 0.42
            + ((100.0 - item["freshness_score"]) / 10.0) * 0.38
        )
    return sorted(attribute_scores, key=weakness, reverse=True)[0]


def get_most_stale_attribute(attribute_scores: List[Dict]) -> Dict:
    return sorted(
        attribute_scores,
        key=lambda item: (item["freshness_score"], item["confidence_score"], item["evidence_count"])
    )[0]


def update_scores_from_answer(attribute_scores: List[Dict], answer: str) -> List[Dict]:
    updated = deepcopy(attribute_scores)
    sentences = _split_sentences(answer)
    now = datetime.utcnow().isoformat()

    for item in updated:
        item["updated_in_latest_review"] = False
        item["impact_score"] = 0.0

    for item in updated:
        cfg = ATTRIBUTE_CONFIG[item["key"]]
        total_hits = 0
        total_sentiment = 0.0
        total_strength = 0.0
        matched_snippets = []

        for sentence in sentences:
            hits = sum(1 for kw in cfg["keywords"] if kw in sentence)
            if hits > 0:
                total_hits += hits
                total_sentiment += _sentence_sentiment(sentence)
                total_strength += _evidence_strength(sentence)
                matched_snippets.append(sentence)

        if total_hits == 0:
            continue

        avg_strength = total_strength / max(len(matched_snippets), 1)

        confidence_boost = min(36.0, 22.0 + (total_hits * 5.0) + (avg_strength * 3.0))
        freshness_boost = min(40.0, 26.0 + (total_hits * 5.0) + (avg_strength * 3.0))

        item["confidence_score"] = min(100.0, item["confidence_score"] + confidence_boost)
        item["freshness_score"] = min(100.0, item["freshness_score"] + freshness_boost)

        value_shift = max(-1.8, min(1.8, total_sentiment * 0.65))
        item["value_score"] = max(0.0, min(10.0, item["value_score"] + value_shift))

        item["evidence_count"] += total_hits
        item["stale"] = item["freshness_score"] < 50
        item["status"] = _status_from_scores(
            item["value_score"], item["confidence_score"], item["freshness_score"]
        )
        item["last_updated"] = now
        item["updated_in_latest_review"] = True
        item["impact_score"] = round((confidence_boost + freshness_boost) / 2.0, 1)
        item["summary"] = (
            f"Updated from {len(matched_snippets)} recent guest evidence snippet"
            f"{'' if len(matched_snippets) == 1 else 's'} mentioning {item['label'].lower()}."
        )

    return updated


def get_directly_updated_attributes(attribute_scores: List[Dict]) -> List[Dict]:
    return [item for item in attribute_scores if item.get("updated_in_latest_review")]