from typing import Dict, List

from app.utils.text import normalize_text

TOPICS: Dict[str, List[str]] = {
    "wifi": ["wifi", "wi-fi", "internet", "connection", "streaming", "zoom"],
    "parking": ["parking", "valet", "garage", "car"],
    "pool": ["pool", "swimming"],
    "gym": ["gym", "fitness", "workout"],
    "breakfast": ["breakfast", "buffet", "food"],
    "cleanliness": ["clean", "dirty", "cleanliness", "hygiene"],
    "service": ["staff", "service", "helpful", "front desk"],
    "noise": ["noise", "noisy", "quiet", "loud", "sound"],
    "location": ["location", "area", "nearby", "walkable"],
    "checkin": ["check-in", "check in", "checkin", "front desk", "arrival"],
    "bathroom": ["bathroom", "shower", "toilet"],
    "bed": ["bed", "mattress", "sleep", "pillows"],
    "air_conditioning": ["ac", "a/c", "air conditioning", "temperature", "cold", "hot"],
}


def extract_topics(text: str) -> List[str]:
    norm = normalize_text(text)
    found = []
    for topic, keywords in TOPICS.items():
        if any(keyword in norm for keyword in keywords):
            found.append(topic)
    return found


def get_topic_keywords() -> Dict[str, List[str]]:
    return TOPICS