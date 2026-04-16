import re
from typing import List


def normalize_text(text: str) -> str:
    text = text or ""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def contains_any_keyword(text: str, keywords: List[str]) -> bool:
    norm = normalize_text(text)
    return any(keyword.lower() in norm for keyword in keywords)


def safe_str(value) -> str:
    if value is None:
        return ""
    return str(value)


def split_sentences(text: str) -> List[str]:
    text = safe_str(text)
    parts = re.split(r"[.!?]+", text)
    return [p.strip() for p in parts if p.strip()]