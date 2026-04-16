# SignalStay — Session Work Log

Use this file to track what was done in each Claude Code chat session.
Each entry = one session. Most recent at the top.

---

## Session 2 — 2026-04-16

### What was done

**1. Fixed all broken OpenAI API calls (critical bug — AI was non-functional)**
- All 4 service files were using `client.responses.create(input=...)` which is not a valid OpenAI SDK method.
- Fixed to `client.chat.completions.create(messages=...)` and `response.choices[0].message.content`.
- Files fixed:
  - `backend/app/services/question_generator.py`
  - `backend/app/services/dashboard_builder.py`
  - `backend/app/services/property_context_service.py`
  - `backend/app/services/answer_parser.py`

**2. Added "Value for Money" attribute (economy tier)**
- Added `value_for_money` as the 16th tracked attribute in `attribute_scorer.py`.
- Category: `Economy`, weight: `1.20` (high — value perception drives bookings).
- Keywords: price, value, worth, expensive, affordable, overpriced, deal, budget, cost, money, rate, fee, reasonable, pricey, good value, bang for, etc.
- Scoring logic: boosted when review count > 20 (price signal reliability), expedia rating present, or property is economy tier (≤3 stars).
- Added fallback question template in `question_generator.py`:
  > "Did the price you paid for this property in {city} feel fair given what you actually got?"

**3. Added price tier / economy segment classification**
- New function `classify_price_tier(star_rating)` in `revenue_intelligence.py`.
- Four tiers with different booking sensitivities (economy guests are *most* trust-sensitive):
  | Tier | Stars | ADR Range | Booking Sensitivity |
  |------|-------|-----------|---------------------|
  | Economy | <3★ | $50–$90 | 3.5% per 0.5 trust pts |
  | Mid-Range | 3–4★ | $90–$160 | 2.8% |
  | Upscale | 4–4.5★ | $160–$280 | 2.2% |
  | Luxury | 4.5+★ | $280–$500+ | 1.8% |
- `calculate_revenue_impact()` now uses per-tier sensitivity instead of flat 2% for all hotels.
- Revenue narrative now includes the price tier: e.g. "Mid-Range segment ($90–$160/night)".
- `get_competitive_benchmark()` now segments competitors by price tier (not just city + ±0.5 stars), so comparisons are always within the same market segment.
- Benchmark narrative now mentions the tier: e.g. "performing above market average in the Upscale segment".

**4. Fixed star rating display bug**
- `StarRating` component in `PropertyCard.tsx` was receiving `trust_score` (0–10 scale) but rendering stars on a 0–5 visual while showing the raw 0–10 number — so 4 stars would show "8.0" next to them.
- Fix: component now takes `starRating` (the hotel's actual 1–5 star classification) so the visual stars and the number always match.
- Also fixed the SVG `linearGradient` id from `"half"` to `"half-star"` to avoid id collisions when multiple cards render.

**5. Persistent sessions (survive backend restarts)**
- Added `ReviewSessionDB` table to `db_models.py` — stores full session JSON in SQLite.
- Replaced in-memory-only `SESSION_STORE` dict in `routes_review.py` with `_session_save()` / `_session_load()` helpers that write to DB and use memory as a cache.
- All session mutations (start, submit step 1, submit step 2, improve) now persist immediately.
- Old sessions are recovered from DB after restart — no more "session not found" errors.

**6. Fixed Revenue Impact + Competitive Benchmark not rendering on post-review dashboard**
- `submit_review` and `get_review_dashboard` were calling `build_dashboard()` without `all_properties`, so competitive benchmark was always `benchmark_available: False`.
- Fixed by passing `list_properties()` to both calls.

**7. Fixed header branding**
- Label updated: `Hackathon` → `HACK-AI-THON`
- Subtitle updated: `Wharton AI Hackathon 2025` → `Wharton AI & Analytics Hack-AI-Thon` (year removed)

---

## Session 1 — (prior session, details not recorded)

### What was built
- Full SignalStay MVP for Wharton AI Hackathon 2025
- Backend: FastAPI + SQLAlchemy + OpenAI + FAISS
- Frontend: Next.js 14 + Tailwind + Recharts
- 15 tracked hotel attributes across Experience / Room / Amenities / Location / Policy
- AI-driven question generation, answer parsing, trust score updates
- Revenue intelligence with monthly/annual impact estimates
- Competitive benchmarking by city + star rating
- Staleness risk prediction with day-level estimates
- Voice input support on review page

---

## How to run

```bash
# Backend
cd signalstay/backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd signalstay/frontend
npm install
npm run dev
```

Requires `OPENAI_API_KEY` in `backend/.env`.
