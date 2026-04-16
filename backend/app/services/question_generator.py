from __future__ import annotations

import json
import logging
import os
from typing import Dict, List, Optional

try:
    from openai import OpenAI
except Exception as e:
    OpenAI = None
    _OPENAI_IMPORT_ERROR = str(e)
else:
    _OPENAI_IMPORT_ERROR = None

from .attribute_scorer import get_most_stale_attribute, get_weakest_attribute
from .property_context_service import get_reviews_for_property

logger = logging.getLogger(__name__)


def infer_property_type(property_data: Dict) -> str:
    stars = property_data.get("star_rating") or 0
    if stars >= 4.5:
        return "premium hotel"
    if stars >= 4:
        return "upscale hotel"
    if stars >= 3:
        return "midscale hotel"
    return "budget stay"


def _recent_review_snippets(property_id: str, limit: int = 5) -> List[str]:
    rows = get_reviews_for_property(property_id, limit=limit)
    snippets: List[str] = []
    for row in rows:
        text = row.get("review_text") or row.get("review_title")
        if text:
            snippets.append(str(text)[:320])
    return snippets


def _attribute_signal_gap(attribute: Dict) -> float:
    return round(
        ((100 - attribute["confidence_score"]) * 0.55)
        + ((100 - attribute["freshness_score"]) * 0.45),
        1,
    )


def _extract_json_object(text: str) -> Optional[Dict]:
    text = text.strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    if "```" in text:
        parts = text.split("```")
        for part in parts:
            candidate = part.strip()
            if candidate.startswith("json"):
                candidate = candidate[4:].strip()
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start : end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None

    return None


def _fallback_question(property_data: Dict, attribute: Dict, step: int, mode: str) -> Dict:
    city = property_data.get("city", "this location")
    ptype = infer_property_type(property_data)

    templates = {
        "wifi": f"How reliable was the Wi-Fi recently at this property in {city}? Was it fast enough for calls, work, or streaming?",
        "gym": f"What was the gym actually like during your stay at this property in {city}?",
        "pool": f"How was the pool recently at this property in {city}? Was it open, clean, and worth using?",
        "parking": f"What was parking really like at this property in {city}? Was it easy, limited, or stressful?",
        "pet_policy": f"If you noticed it, how clear and practical was the pet policy at this property in {city}?",
        "breakfast": f"How was breakfast recently at this property in {city}? Was it worth it?",
        "checkin_experience": f"How smooth was check-in at this property in {city}?",
        "cleanliness": f"How clean did this property in {city} feel during your stay?",
        "room_condition": f"How up-to-date did the room feel at this property in {city}?",
        "bathroom": f"What was the bathroom actually like at this property in {city}?",
        "quietness": f"How quiet was this property in {city}, especially at night?",
        "safety": f"How safe did the property and surrounding area feel during your stay in {city}?",
        "staff": f"How was the staff at this property in {city}: helpful, efficient, or inconsistent?",
        "location_access": f"How convenient was the location of this property in {city} in practice?",
        "value_for_money": f"Did the price you paid for this property in {city} feel fair given what you actually got?",
    }

    question = templates.get(
        attribute["key"],
        f"What was your recent experience with {attribute['label'].lower()} at this property?"
    )

    if mode == "improve":
        why = f"{attribute['label']} is currently the weakest remaining signal for this {ptype}."
        uncertainty = f"A fresh detail here would most improve confidence for {attribute['label'].lower()}."
    elif mode == "followup":
        why = f"After the first answer, {attribute['label']} is still the weakest remaining signal for this {ptype}."
        uncertainty = f"This reduces uncertainty around {attribute['label'].lower()} and strengthens the overall trust score."
    else:
        why = f"This is one of the stalest and least verified signals for this {ptype}."
        uncertainty = f"A fresh answer here gives the biggest immediate trust gain for {attribute['label'].lower()}."

    return {
        "attribute_key": attribute["key"],
        "attribute_label": attribute["label"],
        "question": question,
        "why_this_question": why,
        "uncertainty_reduced": uncertainty,
        "inferred_property_type": ptype,
        "signal_strength": _attribute_signal_gap(attribute),
        "step": step,
        "source": "fallback",
    }


def _llm_prompt(property_data: Dict, attribute: Dict, step: int, mode: str) -> Optional[Dict]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

    if OpenAI is None:
        logger.error("OpenAI import failed in question_generator.py: %s", _OPENAI_IMPORT_ERROR)
        return None

    if not api_key:
        logger.error("OPENAI_API_KEY is empty inside question_generator.py at request time.")
        return None

    client = OpenAI(api_key=api_key)
    snippets = _recent_review_snippets(property_data["id"], limit=5)
    ptype = infer_property_type(property_data)

    system = (
        "You generate exactly one high-signal follow-up question for a hotel trust product. "
        "Return strict JSON only with exactly these keys: question, why_this_question, uncertainty_reduced. "
        "The question must feel like a polished travel product, not a chatbot or survey. "
        "It must be one sentence, concrete, guest-observable, and specific to the property when possible. "
        "Do not mention scores, stale data, confidence values, or internal reasoning."
    )

    user_payload = {
        "mode": mode,
        "step": step,
        "property": {
            "name": property_data.get("name"),
            "city": property_data.get("city"),
            "country": property_data.get("country"),
            "star_rating": property_data.get("star_rating"),
            "property_type": ptype,
            "area_description": property_data.get("area_description"),
            "property_description": property_data.get("property_description"),
            "amenities": property_data.get("amenities", []),
            "pet_policy": property_data.get("pet_policy"),
            "checkin_policy": property_data.get("checkin_policy"),
            "checkout_policy": property_data.get("checkout_policy"),
            "latest_review_title": property_data.get("latest_review_title"),
            "latest_review_text": property_data.get("latest_review_text"),
        },
        "target_attribute": {
            "key": attribute["key"],
            "label": attribute["label"],
            "confidence_score": attribute["confidence_score"],
            "freshness_score": attribute["freshness_score"],
            "value_score": attribute["value_score"],
            "signal_gap": _attribute_signal_gap(attribute),
        },
        "recent_reviews": snippets,
        "instructions": [
            "Ask one concrete question that would most improve trust for the target attribute.",
            "Prefer details that a recent guest would know immediately.",
            "Make it concise, natural, and premium.",
            "Avoid generic phrasing like 'please share your experience' unless necessary.",
            "The why_this_question field should explain why this question matters right now for this property.",
            "The uncertainty_reduced field should explain what becomes clearer if the user answers.",
        ],
    }

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
            temperature=0.2,
        )

        text = response.choices[0].message.content
        if not text:
            logger.error("OpenAI returned no output_text.")
            return None

        parsed = _extract_json_object(text)
        if not parsed:
            logger.error("Could not parse OpenAI JSON output: %s", text[:500])
            return None

        question = str(parsed.get("question", "")).strip()
        why = str(parsed.get("why_this_question", "")).strip()
        uncertainty = str(parsed.get("uncertainty_reduced", "")).strip()

        if not question or not why or not uncertainty:
            logger.error("OpenAI JSON missing fields: %s", parsed)
            return None

        return {
            "attribute_key": attribute["key"],
            "attribute_label": attribute["label"],
            "question": question,
            "why_this_question": why,
            "uncertainty_reduced": uncertainty,
            "inferred_property_type": ptype,
            "signal_strength": _attribute_signal_gap(attribute),
            "step": step,
            "source": "ai",
        }
    except Exception as e:
        logger.exception("AI question generation failed: %s", e)
        return None


def _build_prompt(property_data: Dict, attribute: Dict, step: int, mode: str) -> Dict:
    require_ai = os.getenv("REQUIRE_AI_QUESTIONS", "0").strip() == "1"

    llm = _llm_prompt(property_data, attribute, step=step, mode=mode)
    if llm:
        return llm

    if require_ai:
        raise RuntimeError(
            f"AI question generation failed for property={property_data.get('id')} attribute={attribute['key']}"
        )

    return _fallback_question(property_data, attribute, step=step, mode=mode)


def build_initial_prompt(property_data: Dict, attribute_scores: List[Dict]) -> Dict:
    attribute = get_most_stale_attribute(attribute_scores)
    return _build_prompt(property_data, attribute, step=1, mode="initial")


def build_followup_prompt(property_data: Dict, attribute_scores: List[Dict], previous_answer: str) -> Dict:
    attribute = get_weakest_attribute(attribute_scores)
    return _build_prompt(property_data, attribute, step=2, mode="followup")


def build_weakest_signal_prompt(property_data: Dict, attribute_scores: List[Dict]) -> Dict:
    attribute = get_weakest_attribute(attribute_scores)
    return _build_prompt(property_data, attribute, step=3, mode="improve")