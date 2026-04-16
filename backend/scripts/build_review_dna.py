import json
import os
import pandas as pd

from app.core.config import settings
from app.services.review_dna import build_review_dna_for_property


def _find_column(df, candidates):
    lower_map = {c.lower(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]
    return None


def main():
    descriptions = pd.read_csv(settings.DESCRIPTIONS_FILE)
    id_col = _find_column(descriptions, ["property_id", "hotel_id", "offering_id", "id"])
    if not id_col:
        raise ValueError("Could not infer property id column from descriptions file.")

    results = {}
    for property_id in descriptions[id_col].astype(str).tolist():
        results[property_id] = build_review_dna_for_property(property_id)

    os.makedirs(settings.PROCESSED_DATA_DIR, exist_ok=True)
    out_file = os.path.join(settings.PROCESSED_DATA_DIR, "review_dna.json")
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()