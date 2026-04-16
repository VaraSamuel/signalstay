from __future__ import annotations

import ast
import hashlib
import json
import math
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


BASE_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = BASE_DIR / "data" / "raw"

DESCRIPTION_PATH = RAW_DIR / "Description_PROC.csv"
REVIEWS_PATH = RAW_DIR / "Reviews_PROC.csv"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
AI_GENERATE_PROPERTY_TITLES = os.getenv("AI_GENERATE_PROPERTY_TITLES", "1").strip() == "1"


IMAGE_POOLS = {
    "united states": [
        "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1200&q=80",
    ],
    "italy": [
        "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=1200&q=80",
    ],
    "france": [
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80",
    ],
    "spain": [
        "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80",
    ],
    "japan": [
        "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80",
    ],
    "thailand": [
        "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1526481280695-3c4694f2d5f3?auto=format&fit=crop&w=1200&q=80",
    ],
    "__default__": [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1200&q=80",
    ],
}

GENERIC_AMENITIES = {
    "ac",
    "internet",
    "wifi",
    "wi-fi",
    "tv",
    "housekeeping",
    "restaurant",
    "bar",
    "no_smoking",
    "outdoor_space",
    "frontdesk_24_hour",
}

AMENITY_PRIORITY = [
    ("free parking", ["free parking", "parking included"]),
    ("breakfast included", ["breakfast included", "free buffet breakfast"]),
    ("pool", ["pool", "indoor pool", "outdoor pool"]),
    ("gym", ["gym", "fitness", "fitness center"]),
    ("spa", ["spa", "wellness"]),
    ("airport shuttle", ["airport shuttle", "shuttle"]),
    ("pet friendly", ["pet friendly", "pets allowed"]),
    ("beach access", ["beach", "beachfront"]),
]


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    text = str(value).strip()
    return text == "" or text.lower() in {"nan", "none", "null"}


def _clean_text(value: Any) -> Optional[str]:
    if _is_missing(value):
        return None
    text = str(value).replace("<br>", " ").replace("<p>", " ").replace("</p>", " ")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\|MASK\|", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _clean_float(value: Any) -> Optional[float]:
    if _is_missing(value):
        return None
    try:
        return float(value)
    except Exception:
        return None


def _parse_possible_json(value: Any) -> Any:
    if _is_missing(value):
        return None
    text = str(value).strip()
    try:
        return json.loads(text)
    except Exception:
        try:
            return ast.literal_eval(text)
        except Exception:
            return text


def _parse_amenities(value: Any) -> List[str]:
    parsed = _parse_possible_json(value)
    items: List[str] = []

    if isinstance(parsed, list):
        raw_items = parsed
    else:
        raw_items = re.split(r"[|,;/•]+", str(parsed))

    seen = set()
    for item in raw_items:
        cleaned = _clean_text(item)
        if not cleaned:
            continue
        cleaned = cleaned.replace("_", " ")
        lowered = cleaned.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        items.append(cleaned)

    return items


def _best_thumbnail(property_id: str, city: Optional[str], country: Optional[str]) -> str:
    pool = IMAGE_POOLS.get((country or "").strip().lower(), IMAGE_POOLS["__default__"])
    digest = hashlib.md5(f"{property_id}:{city}:{country}".encode("utf-8")).hexdigest()
    idx = int(digest, 16) % len(pool)
    return pool[idx]


def _extract_landmark(area_description: Optional[str], property_description: Optional[str]) -> Optional[str]:
    joined = " ".join(filter(None, [area_description, property_description]))
    if not joined:
        return None

    patterns = [
        r"steps from ([A-Za-z0-9&'’\-\s]{4,45})",
        r"near ([A-Za-z0-9&'’\-\s]{4,45})",
        r"close to ([A-Za-z0-9&'’\-\s]{4,45})",
        r"minutes from ([A-Za-z0-9&'’\-\s]{4,45})",
    ]

    for pattern in patterns:
        m = re.search(pattern, joined, flags=re.IGNORECASE)
        if m:
            landmark = re.sub(r"\s+", " ", m.group(1)).strip(" ,.-")
            if landmark:
                return landmark
    return None


def _select_signature_amenity(amenities: List[str]) -> Optional[str]:
    lowered = [a.lower() for a in amenities]

    for label, variants in AMENITY_PRIORITY:
        if any(any(v in item for v in variants) for item in lowered):
            return label

    for amenity in amenities:
        a = amenity.lower().strip()
        if a in GENERIC_AMENITIES or len(a) < 4:
            continue
        return amenity

    return None


def _rating_overall(raw_rating: Any) -> Optional[float]:
    parsed = _parse_possible_json(raw_rating)
    if isinstance(parsed, dict):
        value = parsed.get("overall")
        return _clean_float(value)
    return _clean_float(parsed)


def _heuristic_property_name(row: Dict[str, Any], review_meta: Dict[str, Any]) -> str:
    city = _clean_text(row.get("city")) or "Unknown City"
    star_rating = _clean_float(row.get("star_rating"))
    area_description = _clean_text(row.get("area_description"))
    property_description = _clean_text(row.get("property_description"))
    amenities = _parse_amenities(row.get("popular_amenities_list"))
    landmark = _extract_landmark(area_description, property_description)
    signature_amenity = _select_signature_amenity(amenities)

    if landmark and signature_amenity:
        return f"{city} Stay near {landmark} with {signature_amenity.title()}"
    if landmark and star_rating and star_rating >= 4:
        return f"{city} Hotel near {landmark}"
    if signature_amenity and star_rating and star_rating >= 4:
        return f"{city} Hotel with {signature_amenity.title()}"
    if signature_amenity:
        return f"{city} Stay with {signature_amenity.title()}"
    if star_rating and star_rating >= 4.5:
        return f"Grand Stay in {city}"
    if star_rating and star_rating >= 4.0:
        return f"Modern Hotel in {city}"
    return f"Comfort Stay in {city}"


def _ai_property_name(row: Dict[str, Any], review_meta: Dict[str, Any]) -> Optional[str]:
    if not AI_GENERATE_PROPERTY_TITLES or not OPENAI_API_KEY or OpenAI is None:
        return None

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        payload = {
            "city": _clean_text(row.get("city")),
            "country": _clean_text(row.get("country")),
            "star_rating": _clean_float(row.get("star_rating")),
            "area_description": _clean_text(row.get("area_description")),
            "property_description": _clean_text(row.get("property_description")),
            "amenities": _parse_amenities(row.get("popular_amenities_list"))[:8],
            "latest_review_title": review_meta.get("latest_review_title"),
        }
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Generate one concise premium travel listing name. "
                        "Return strict JSON with a single key: name. "
                        "4 to 8 words. Do not invent a brand. Avoid awkward amenity dumps."
                    ),
                },
                {"role": "user", "content": json.dumps(payload)},
            ],
            temperature=0.4,
        )
        text = response.choices[0].message.content or ""
        parsed = json.loads(text)
        name = _clean_text(parsed.get("name"))
        if name and 4 <= len(name.split()) <= 8:
            return name
    except Exception:
        return None

    return None


def _make_property_name(row: Dict[str, Any], review_meta: Dict[str, Any]) -> str:
    name = _ai_property_name(row, review_meta)
    if name:
        return name
    return _heuristic_property_name(row, review_meta)


def _extract_attribute_hints(row: Dict[str, Any]) -> Dict[str, str]:
    return {
        "pet_policy": _clean_text(row.get("pet_policy")) or "",
        "children_policy": _clean_text(row.get("children_and_extra_bed_policy")) or "",
        "checkin_policy": _clean_text(row.get("check_in_instructions")) or "",
        "checkout_policy": _clean_text(row.get("check_out_policy")) or "",
        "know_before_you_go": _clean_text(row.get("know_before_you_go")) or "",
    }


@lru_cache(maxsize=1)
def _load_description_df() -> pd.DataFrame:
    if not DESCRIPTION_PATH.exists():
        raise FileNotFoundError(f"Description file not found: {DESCRIPTION_PATH}")
    df = pd.read_csv(DESCRIPTION_PATH)
    df["eg_property_id"] = df["eg_property_id"].astype(str)
    return df


@lru_cache(maxsize=1)
def _load_reviews_df() -> pd.DataFrame:
    if not REVIEWS_PATH.exists():
        raise FileNotFoundError(f"Reviews file not found: {REVIEWS_PATH}")
    df = pd.read_csv(REVIEWS_PATH)
    df["eg_property_id"] = df["eg_property_id"].astype(str)
    if "acquisition_date" in df.columns:
        df["acquisition_date"] = pd.to_datetime(df["acquisition_date"], errors="coerce")
    return df


@lru_cache(maxsize=1)
def _review_aggregate_map() -> Dict[str, Dict[str, Any]]:
    reviews = _load_reviews_df().copy()
    aggregates: Dict[str, Dict[str, Any]] = {}

    for property_id, group in reviews.groupby("eg_property_id", dropna=False):
        group = group.sort_values("acquisition_date", ascending=False, na_position="last")

        overall_scores = []
        for _, row in group.iterrows():
            val = _rating_overall(row.get("rating"))
            if val is not None and val > 0:
                overall_scores.append(val)

        latest_title = None
        latest_text = None
        latest_date = None

        for _, row in group.iterrows():
            if latest_title is None:
                latest_title = _clean_text(row.get("review_title"))
            if latest_text is None:
                latest_text = _clean_text(row.get("review_text"))
            if latest_date is None and pd.notna(row.get("acquisition_date")):
                latest_date = row.get("acquisition_date").date().isoformat()

        aggregates[str(property_id)] = {
            "review_count": int(len(group)),
            "avg_review_rating": round(sum(overall_scores) / len(overall_scores), 2) if overall_scores else None,
            "latest_review_date": latest_date,
            "latest_review_title": latest_title,
            "latest_review_text": latest_text,
        }

    return aggregates


def _build_property_record(row: Dict[str, Any], review_meta: Dict[str, Any]) -> Dict[str, Any]:
    property_id = str(row["eg_property_id"])
    city = _clean_text(row.get("city")) or "Unknown City"
    province = _clean_text(row.get("province"))
    country = _clean_text(row.get("country")) or "Unknown Country"
    area_description = _clean_text(row.get("area_description"))
    property_description = _clean_text(row.get("property_description"))
    amenities = _parse_amenities(row.get("popular_amenities_list"))

    return {
        "id": property_id,
        "name": _make_property_name(row, review_meta),
        "city": city,
        "province": province,
        "country": country,
        "area_description": area_description,
        "property_description": property_description,
        "star_rating": _clean_float(row.get("star_rating")),
        "thumbnail_url": _best_thumbnail(property_id, city, country),
        "amenities": amenities,
        "review_count": int(review_meta.get("review_count") or 0),
        "avg_review_rating": review_meta.get("avg_review_rating"),
        "latest_review_date": review_meta.get("latest_review_date"),
        "latest_review_title": review_meta.get("latest_review_title"),
        "latest_review_text": review_meta.get("latest_review_text"),
        "guestrating_avg_expedia": _clean_float(row.get("guestrating_avg_expedia")),
        **_extract_attribute_hints(row),
    }


@lru_cache(maxsize=1)
def _all_properties_cache() -> List[Dict[str, Any]]:
    description = _load_description_df()
    review_map = _review_aggregate_map()

    rows: List[Dict[str, Any]] = []
    for _, row in description.iterrows():
        row_dict = row.to_dict()
        property_id = str(row_dict["eg_property_id"])
        rows.append(
            _build_property_record(
                row_dict,
                review_map.get(
                    property_id,
                    {
                        "review_count": 0,
                        "avg_review_rating": None,
                        "latest_review_date": None,
                        "latest_review_title": None,
                        "latest_review_text": None,
                    },
                ),
            )
        )

    rows.sort(
        key=lambda x: (
            -(x.get("review_count") or 0),
            -((x.get("guestrating_avg_expedia") or 0.0)),
            x["name"],
        )
    )
    return rows


def list_properties() -> List[Dict[str, Any]]:
    return _all_properties_cache()


def get_property_by_id(property_id: str) -> Optional[Dict[str, Any]]:
    for item in _all_properties_cache():
        if str(item["id"]) == str(property_id):
            return item
    return None


def get_reviews_for_property(property_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    reviews = _load_reviews_df()
    subset = reviews[reviews["eg_property_id"].astype(str) == str(property_id)].copy()
    if subset.empty:
        return []

    subset = subset.sort_values("acquisition_date", ascending=False, na_position="last")
    rows: List[Dict[str, Any]] = []
    for _, row in subset.head(limit).iterrows():
        rows.append(
            {
                "eg_property_id": str(row.get("eg_property_id")),
                "acquisition_date": row.get("acquisition_date").date().isoformat()
                if pd.notna(row.get("acquisition_date"))
                else None,
                "rating": _rating_overall(row.get("rating")),
                "review_title": _clean_text(row.get("review_title")),
                "review_text": _clean_text(row.get("review_text")),
            }
        )
    return rows


def clear_property_cache() -> None:
    _all_properties_cache.cache_clear()
    _load_description_df.cache_clear()
    _load_reviews_df.cache_clear()
    _review_aggregate_map.cache_clear()