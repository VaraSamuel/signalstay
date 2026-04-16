from datetime import datetime
import pandas as pd


def to_datetime_safe(value):
    try:
        return pd.to_datetime(value, errors="coerce")
    except Exception:
        return pd.NaT


def months_since(date_value) -> float:
    dt = to_datetime_safe(date_value)
    if pd.isna(dt):
        return 999.0
    now = pd.Timestamp.now()
    return max(0.0, (now - dt).days / 30.0)


def iso_today() -> str:
    return datetime.utcnow().date().isoformat()