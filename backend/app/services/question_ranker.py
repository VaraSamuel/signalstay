from typing import Dict, List, Any

from app.core.config import settings
from app.utils.scoring import gap_score


def rank_topics_for_followup(
    topic_status: Dict[str, Any],
    covered_topics: List[str],
) -> List[Dict[str, Any]]:
    ranked = []

    for topic, info in topic_status.items():
        if topic in covered_topics:
            continue

        importance = settings.TOPIC_WEIGHTS.get(topic, 0.6)
        stale_score = info.get("stale_score", 0.0)
        missing_score = info.get("missing_score", 0.0)
        contradiction_score = info.get("contradiction_score", 0.0)

        # Askability: simple heuristic
        askability = 0.9
        if topic in {"location", "cleanliness", "service"}:
            askability = 0.8
        if topic in {"parking", "wifi", "breakfast", "noise"}:
            askability = 1.0

        score = gap_score(
            importance=importance,
            stale_score=stale_score,
            missing_score=missing_score,
            contradiction_score=contradiction_score,
            askability=askability,
        )

        ranked.append(
            {
                "topic": topic,
                "score": score,
                "status": info.get("status"),
                "why": _build_reason(topic, info),
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked


def _build_reason(topic: str, info: Dict[str, Any]) -> str:
    status = info.get("status", "unknown")
    last = info.get("last_mentioned")
    mentions = info.get("mention_count", 0)

    if status == "missing":
        return f"{topic} has not been covered in available reviews."
    if status == "stale":
        return f"{topic} has not been mentioned recently. Last mention: {last}."
    if status == "conflicting":
        return f"{topic} has conflicting review signals and needs verification."
    if status == "aging":
        return f"{topic} has limited recent coverage and only {mentions} mentions."
    return f"{topic} may still benefit from a fresh traveler update."