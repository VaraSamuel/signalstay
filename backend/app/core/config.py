import os
from dataclasses import dataclass, field
from typing import List

from dotenv import load_dotenv

# ✅ THIS LINE loads your backend/.env automatically
load_dotenv()


@dataclass
class Settings:
    APP_NAME: str = "SignalStay API"
    APP_VERSION: str = "0.1.0"

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    RAW_DATA_DIR: str = os.path.join(DATA_DIR, "raw")
    PROCESSED_DATA_DIR: str = os.path.join(DATA_DIR, "processed")
    FAISS_DIR: str = os.path.join(DATA_DIR, "faiss")

    REVIEWS_FILE: str = os.path.join(RAW_DATA_DIR, "Reviews_PROC.csv")
    DESCRIPTIONS_FILE: str = os.path.join(RAW_DATA_DIR, "Description_PROC.csv")

    SQLITE_PATH: str = os.path.join(DATA_DIR, "signalstay.db")
    DATABASE_URL: str = f"sqlite:///{os.path.join(DATA_DIR, 'signalstay.db')}"

    ALLOWED_ORIGINS: List[str] = field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*",
        ]
    )

    MAX_FOLLOW_UP_QUESTIONS: int = 2

    TOPIC_WEIGHTS = {
        "wifi": 1.0,
        "parking": 0.95,
        "pool": 0.75,
        "gym": 0.65,
        "breakfast": 0.85,
        "cleanliness": 0.9,
        "service": 0.8,
        "noise": 0.9,
        "location": 0.7,
        "checkin": 0.8,
        "bathroom": 0.75,
        "bed": 0.7,
        "air_conditioning": 0.85,
    }


settings = Settings()

# ✅ DEBUG PRINT (remove later)
print("OPENAI KEY LOADED:", bool(settings.OPENAI_API_KEY))
print("MODEL:", settings.OPENAI_MODEL)