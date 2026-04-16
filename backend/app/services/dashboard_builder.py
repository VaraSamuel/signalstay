from __future__ import annotations

import json
import os
from typing import Dict, List

from .attribute_scorer import (
    compute_overall_scores,
    get_directly_updated_attributes,
    get_weakest_attribute,
)
from .question_generator import build_weakest_signal_prompt
from .revenue_intelligence import (
    calculate_revenue_impact,
    predict_staleness_risk,
    get_competitive_benchmark,
)

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
AI_GENERATE_DASHBOARD_NARRATIVE = os.getenv("AI_GENERATE_DASHBOARD_NARRATIVE", "1").strip() == "1"


def _ai_dashboard_narrative(property_data: Dict, updated_attribute_summaries: List[Dict], weakest: Dict) -> List[str] | None:
    if not AI_GENERATE_DASHBOARD_NARRATIVE or not OPENAI_API_KEY or OpenAI is None:
        return None

    client = OpenAI(api_key=OPENAI_API_KEY)

    payload = {
        "property": {
            "name": property_data.get("name"),
            "city": property_data.get("city"),
            "country": property_data.get("country"),
        },
        "updated_attributes": updated_attribute_summaries[:4],
        "weakest_attribute": {
            "label": weakest["label"],
            "confidence_score": weakest["confidence_score"],
            "freshness_score": weakest["freshness_score"],
            "value_score": weakest["value_score"],
        },
        "instruction": (
            "Write 4 short bullet-style insight lines for a hotel trust dashboard. "
            "Be crisp, product-like, and specific. "
            "Return JSON only with key 'insights' as a list of 4 strings."
        ),
    }

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return strict JSON only. The insights should sound like polished product dashboard copy."
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
            temperature=0.3,
        )

        text = response.choices[0].message.content
        if not text:
            return None

        try:
            parsed = json.loads(text)
        except Exception:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return None
            parsed = json.loads(text[start : end + 1])

        insights = parsed.get("insights")
        if isinstance(insights, list):
            cleaned = [str(x).strip() for x in insights if str(x).strip()]
            if cleaned:
                return cleaned[:4]
        return None
    except Exception:
        return None


def build_dashboard(property_data: Dict, initial_scores: List[Dict], current_scores: List[Dict], all_properties: List[Dict] = None) -> Dict:
    initial_conf, initial_fresh, initial_trust = compute_overall_scores(initial_scores)
    current_conf, current_fresh, current_trust = compute_overall_scores(current_scores)

    weakest = get_weakest_attribute(current_scores)
    weakest_prompt = build_weakest_signal_prompt(property_data, current_scores)
    directly_updated = get_directly_updated_attributes(current_scores)

    before_after = []
    for before in initial_scores:
        after = next(item for item in current_scores if item["key"] == before["key"])
        before_after.append(
            {
                "key": before["key"],
                "label": before["label"],
                "before_confidence": before["confidence_score"],
                "after_confidence": after["confidence_score"],
                "before_freshness": before["freshness_score"],
                "after_freshness": after["freshness_score"],
                "before_value": before["value_score"],
                "after_value": after["value_score"],
                "confidence_delta": round(after["confidence_score"] - before["confidence_score"], 1),
                "freshness_delta": round(after["freshness_score"] - before["freshness_score"], 1),
                "value_delta": round(after["value_score"] - before["value_score"], 1),
                "updated_in_latest_review": after.get("updated_in_latest_review", False),
            }
        )

    freshness_timeline = [
        {
            "stage": "Dataset baseline",
            "confidence": initial_conf,
            "freshness": initial_fresh,
            "trust_score": initial_trust,
        },
        {
            "stage": "Fresh guest evidence",
            "confidence": current_conf,
            "freshness": current_fresh,
            "trust_score": current_trust,
        },
    ]

    updated_attribute_summaries = []
    for item in directly_updated:
        baseline = next(x for x in initial_scores if x["key"] == item["key"])
        updated_attribute_summaries.append(
            {
                "key": item["key"],
                "label": item["label"],
                "confidence_delta": round(item["confidence_score"] - baseline["confidence_score"], 1),
                "freshness_delta": round(item["freshness_score"] - baseline["freshness_score"], 1),
                "value_delta": round(item["value_score"] - baseline["value_score"], 1),
                "impact_score": item.get("impact_score", 0.0),
            }
        )

    if updated_attribute_summaries:
        updated_attribute_summaries = sorted(
            updated_attribute_summaries,
            key=lambda x: x["impact_score"],
            reverse=True,
        )

    insight_summary = [
        f"Confidence improved by {round(current_conf - initial_conf, 1)} points.",
        f"Freshness improved by {round(current_fresh - initial_fresh, 1)} points.",
        f"Overall trust score moved from {initial_trust}/10 to {current_trust}/10.",
        f"The weakest remaining signal is {weakest['label']}.",
    ]

    if updated_attribute_summaries:
        top = updated_attribute_summaries[0]
        insight_summary.insert(
            0,
            f"Biggest direct improvement: {top['label']} (+{top['confidence_delta']} confidence, +{top['freshness_delta']} freshness)."
        )

    ai_insights = _ai_dashboard_narrative(property_data, updated_attribute_summaries, weakest)
    if ai_insights:
        insight_summary = ai_insights

    # Calculate revenue intelligence
    revenue_impact = calculate_revenue_impact(
        property_data, initial_trust, current_trust, initial_fresh, current_fresh
    )

    # Predict staleness risks
    staleness_risks = predict_staleness_risk(current_scores)

    # Competitive benchmark
    benchmark = get_competitive_benchmark(property_data, current_scores, all_properties or [])

    return {
        "property": property_data,
        "overall_confidence": current_conf,
        "overall_freshness": current_fresh,
        "overall_trust_score": current_trust,
        "confidence_delta": round(current_conf - initial_conf, 1),
        "freshness_delta": round(current_fresh - initial_fresh, 1),
        "trust_delta": round(current_trust - initial_trust, 1),
        "weakest_attribute_key": weakest["key"],
        "weakest_attribute_label": weakest["label"],
        "weakest_attribute_reason": (
            f"{weakest['label']} has the lowest combined strength after recent evidence."
        ),
        "weakest_signal_prompt": weakest_prompt,
        "attribute_scores": current_scores,
        "before_after": before_after,
        "freshness_timeline": freshness_timeline,
        "updated_attribute_summaries": updated_attribute_summaries,
        "insight_summary": insight_summary,
        # NEW: Revenue intelligence (winner features!)
        "revenue_impact": revenue_impact,
        "staleness_risks": staleness_risks,
        "competitive_benchmark": benchmark,
    }