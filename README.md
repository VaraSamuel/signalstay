# SignalStay

**Hotel trust and freshness intelligence for Expedia.**
Built by Samuel, Hudah, and Muskan for the Wharton AI & Analytics Hack-AI-Thon 2026.

---

## What it does

Guest reviews go stale. Hotels lose bookings because the signals travelers rely on are weeks or months old. SignalStay fixes this by:

1. Identifying the single weakest trust signal for a property
2. Asking the next guest exactly one targeted question (avg. 28 seconds)
3. Updating confidence, freshness, and trust scores in real time
4. Showing revenue impact and competitive benchmarking by price tier

## Tech stack

- **Backend**: Python, FastAPI, SQLAlchemy, OpenAI, SQLite
- **Frontend**: Next.js 14, Tailwind CSS, Recharts

## Running locally

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your OPENAI_API_KEY
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_API_BASE_URL` | No | Backend URL (defaults to `http://localhost:8000`) |

## License

MIT
