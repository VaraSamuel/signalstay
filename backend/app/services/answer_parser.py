import json
from pathlib import Path

from openai import OpenAI

from app.core.config import settings
from app.models.schemas import ExtractedFact, ParsedReviewResponse

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "parse_answers.txt"


class AnswerParserService:
    def __init__(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is missing. Set it in backend/.env.")
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

    def parse(
        self,
        property_name: str,
        property_id: str,
        user_text: str,
    ) -> ParsedReviewResponse:
        user_prompt = f"""
Property name:
{property_name}

Property id:
{property_id}

Traveler message:
\"\"\"
{user_text}
\"\"\"

Extract only concrete guest-observed facts.
""".strip()

        response = self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        raw_text = response.choices[0].message.content
        payload = json.loads(raw_text)

        facts = [ExtractedFact(**item) for item in payload.get("facts", [])]
        summary = payload.get("summary", "")

        return ParsedReviewResponse(
            facts=facts,
            summary=summary,
        )