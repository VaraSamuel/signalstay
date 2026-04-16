def bounded(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def gap_score(
    importance: float,
    stale_score: float,
    missing_score: float,
    contradiction_score: float,
    askability: float,
) -> float:
    raw = (
        0.30 * importance
        + 0.25 * stale_score
        + 0.20 * missing_score
        + 0.15 * contradiction_score
        + 0.10 * askability
    )
    return round(bounded(raw), 4)