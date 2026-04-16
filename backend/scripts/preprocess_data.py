import json
import os

import pandas as pd

from app.core.config import settings
from app.services.topic_extractor import get_topic_keywords


def main():
    reviews = pd.read_csv(settings.REVIEWS_FILE)

    os.makedirs(settings.PROCESSED_DATA_DIR, exist_ok=True)

    lower_map = {c.lower(): c for c in reviews.columns}
    text_col = None
    for candidate in ["review_text", "review", "text", "reviewbody", "body"]:
        if candidate.lower() in lower_map:
            text_col = lower_map[candidate.lower()]
            break

    if not text_col:
        raise ValueError("Could not infer review text column.")

    topic_keywords = get_topic_keywords()
    rows = []

    for idx, row in reviews.iterrows():
        text = str(row[text_col]).lower()
        topic_hits = [topic for topic, kws in topic_keywords.items() if any(k in text for k in kws)]
        rows.append({"row_index": idx, "topics": topic_hits})

    out_file = os.path.join(settings.PROCESSED_DATA_DIR, "topic_mentions.json")
    with open(out_file, "w") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()