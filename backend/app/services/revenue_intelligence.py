"""
Revenue Intelligence: Calculate $ impact, predict staleness, competitive benchmarking
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any


def classify_price_tier(star_rating: float) -> Dict[str, Any]:
    """
    Classify a property into an economy segment with metadata.
    Returns tier label, typical ADR (average daily rate) range, and booking sensitivity.
    """
    if star_rating >= 4.5:
        return {
            "tier": "Luxury",
            "tier_code": "luxury",
            "adr_range": "$280–$500+",
            "booking_sensitivity": 0.018,   # 1.8% lift per 0.5 trust pts (luxury = less price-sensitive)
            "typical_adr": 380,
            "typical_monthly_bookings": 115,
            "description": "Premium and luxury segment. Guests prioritize experience over price.",
        }
    elif star_rating >= 4.0:
        return {
            "tier": "Upscale",
            "tier_code": "upscale",
            "adr_range": "$160–$280",
            "booking_sensitivity": 0.022,
            "typical_adr": 210,
            "typical_monthly_bookings": 95,
            "description": "Upscale segment. Trust signals strongly drive conversion.",
        }
    elif star_rating >= 3.0:
        return {
            "tier": "Mid-Range",
            "tier_code": "midrange",
            "adr_range": "$90–$160",
            "booking_sensitivity": 0.028,
            "typical_adr": 130,
            "typical_monthly_bookings": 72,
            "description": "Mid-range segment. Price and value perception are key.",
        }
    else:
        return {
            "tier": "Economy",
            "tier_code": "economy",
            "adr_range": "$50–$90",
            "booking_sensitivity": 0.035,   # 3.5% lift — economy guests are most trust-sensitive
            "typical_adr": 75,
            "typical_monthly_bookings": 55,
            "description": "Economy segment. Value-for-money is the #1 booking driver.",
        }


def calculate_revenue_impact(
    property_data: Dict,
    initial_trust: float,
    current_trust: float,
    initial_freshness: float,
    current_freshness: float,
) -> Dict[str, Any]:
    """
    Calculate revenue impact in dollars from trust improvement.
    Always returns meaningful numbers — uses actual delta when available,
    or a +1.0 trust projection when there's no delta yet.
    """
    star_rating = float(property_data.get("star_rating") or 3.5)
    tier = classify_price_tier(star_rating)

    bookings = tier["typical_monthly_bookings"]
    room_rate = tier["typical_adr"]
    booking_sensitivity = tier["booking_sensitivity"]

    trust_delta = current_trust - initial_trust
    freshness_delta = current_freshness - initial_freshness
    monthly_revenue_baseline = bookings * room_rate

    # When no review has happened yet, show what a 1-point trust improvement would yield
    is_projection = trust_delta <= 0
    display_delta = 1.0 if is_projection else trust_delta
    display_fresh_delta = 5.0 if is_projection else freshness_delta

    trust_booking_lift = (display_delta / 0.5) * booking_sensitivity
    freshness_multiplier = 1 + (display_fresh_delta / 20) * 0.15
    total_booking_lift = trust_booking_lift * freshness_multiplier

    monthly_revenue_new = monthly_revenue_baseline * (1 + total_booking_lift)
    monthly_revenue_delta = monthly_revenue_new - monthly_revenue_baseline
    annual_revenue_impact = monthly_revenue_delta * 12

    if is_projection:
        narrative = (
            f"A +1.0 trust point improvement could unlock "
            f"+${abs(int(monthly_revenue_delta))}/mo for this {tier['tier']} property. "
            f"Answer one question to start moving the needle."
        )
    else:
        tier_note = f" ({tier['tier']} segment: {tier['adr_range']}/night)"
        narrative = (
            f"Improving trust by {trust_delta:.1f} points generates "
            f"+${abs(int(monthly_revenue_delta))}/mo in direct bookings{tier_note}."
        )

    return {
        "trust_delta": round(trust_delta, 1),
        "freshness_delta": round(freshness_delta, 1),
        "booking_rate_lift_percent": round(total_booking_lift * 100, 1),
        "monthly_revenue_impact": round(monthly_revenue_delta, 0),
        "annual_revenue_impact": round(annual_revenue_impact, 0),
        "baseline_monthly_revenue": round(monthly_revenue_baseline, 0),
        "narrative": narrative,
        "is_projection": is_projection,
        "price_tier": tier,
    }


def predict_staleness_risk(scores: List[Dict]) -> List[Dict[str, Any]]:
    """
    Predict which attributes will go stale next using time-decay model.

    Risk = (days_old / confidence) * decay_factor
    """
    today = datetime.now()
    stale_predictions = []

    for score in scores:
        confidence = max(score.get("confidence_score", 50), 10)  # Avoid divide by zero
        freshness = score.get("freshness_score", 50)

        # Model: if freshness is already low, signal is at high risk
        # Low freshness = likely old evidence
        staleness_risk_score = (100 - freshness) * (100 - confidence) / 100

        # Predict days until stale (freshness < 30)
        if freshness > 30:
            # Decay rate: lower freshness/conf = faster decay
            decay_days_per_freshness = 2.5  # 2.5 days per freshness point
            days_until_stale = round((freshness - 30) * decay_days_per_freshness, 0)
        else:
            days_until_stale = 0  # Already stale

        alert_level = "critical" if days_until_stale <= 14 else "warning" if days_until_stale <= 30 else "healthy"

        stale_predictions.append({
            "key": score["key"],
            "label": score["label"],
            "current_freshness": score["freshness_score"],
            "staleness_risk_percent": round(staleness_risk_score, 1),
            "days_until_stale": max(0, int(days_until_stale)),
            "alert_level": alert_level,
            "recommendation": _get_staleness_recommendation(days_until_stale),
        })

    # Sort by risk descending
    return sorted(stale_predictions, key=lambda x: x["staleness_risk_percent"], reverse=True)[:3]


def _get_staleness_recommendation(days_until_stale: float) -> str:
    if days_until_stale <= 0:
        return "🔴 CRITICAL: Ask for fresh evidence NOW. This signal is stale."
    elif days_until_stale <= 14:
        return "⚠️ HIGH RISK: This signal will expire in ~2 weeks. Prioritize next."
    elif days_until_stale <= 30:
        return "📋 MEDIUM: Plan to refresh this signal within 30 days."
    else:
        return "✅ Healthy for now, but monitor."


def get_competitive_benchmark(
    property_data: Dict,
    current_scores: List[Dict],
    all_properties: List[Dict] = None,
) -> Dict[str, Any]:
    """
    Benchmark this property against nearby hotels in the same economy tier.
    Segments by city AND price tier so comparisons are always apples-to-apples.
    """
    if not all_properties:
        all_properties = []

    city = property_data.get("city", "").lower()
    star_rating = float(property_data.get("star_rating") or 3.5)
    this_tier = classify_price_tier(star_rating)

    # Find comparable properties (same city, same price tier)
    comparable = [
        p for p in all_properties
        if p.get("city", "").lower() == city
        and classify_price_tier(float(p.get("star_rating") or 3.5))["tier_code"] == this_tier["tier_code"]
        and p.get("id") != property_data.get("id")
    ]

    if not comparable:
        return {
            "competitors_in_market": 0,
            "market_avg_trust": None,
            "this_property_rank": "N/A",
            "price_tier": this_tier["tier"],
            "benchmark_available": False,
        }

    competitor_trusts = [p.get("trust_score", 5) for p in comparable]
    market_avg_trust = sum(competitor_trusts) / len(competitor_trusts)
    this_trust = property_data.get("trust_score", 5)

    rank = sum(1 for t in competitor_trusts if t > this_trust) + 1
    percentile = round((1 - rank / (len(comparable) + 1)) * 100, 0)

    return {
        "competitors_in_market": len(comparable),
        "market_avg_trust": round(market_avg_trust, 2),
        "this_property_trust": round(this_trust, 2),
        "trust_gap": round(this_trust - market_avg_trust, 2),
        "rank": f"{rank}/{len(comparable) + 1}",
        "percentile": int(percentile),
        "price_tier": this_tier["tier"],
        "tier_description": this_tier["description"],
        "narrative": _get_benchmark_narrative(this_trust, market_avg_trust, rank, len(comparable), this_tier["tier"]),
        "benchmark_available": True,
    }


def _get_benchmark_narrative(this_trust: float, market_avg: float, rank: int, total: int, tier: str = "") -> str:
    tier_label = f" in the {tier} segment" if tier else ""
    if this_trust > market_avg:
        gap = this_trust - market_avg
        return f"You're performing {gap:.1f} points ABOVE market average{tier_label} (#{rank}/{total})."
    elif this_trust < market_avg:
        gap = market_avg - this_trust
        return f"Competitors average {gap:.1f} points higher{tier_label}. Closing this gap = more bookings."
    else:
        return f"You're at market average{tier_label}. Small improvements = competitive advantage."
