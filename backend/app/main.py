from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env BEFORE importing modules that may read env vars at import time
BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

from app.api import routes_properties, routes_property, routes_review  # noqa: E402
from app.core.database import Base, engine  # noqa: E402


def create_app() -> FastAPI:
    app = FastAPI(
        title="SignalStay API",
        version="1.0.0",
    )

    # Create database tables on startup
    Base.metadata.create_all(bind=engine)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "openai_key_loaded": bool(os.getenv("OPENAI_API_KEY")),
            "openai_model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        }

    # Exactly one /api prefix here
    app.include_router(routes_properties.router, prefix="/api")
    app.include_router(routes_property.router, prefix="/api")
    app.include_router(routes_review.router, prefix="/api")

    return app


app = create_app()

print("OPENAI KEY LOADED:", bool(os.getenv("OPENAI_API_KEY")))
print("MODEL:", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))