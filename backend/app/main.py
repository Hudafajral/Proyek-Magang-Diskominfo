import asyncio
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# FIX KHUSUS WINDOWS: Playwright membutuhkan ProactorEventLoop untuk subprocess
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    description=(
        "API simulasi fitur Analisis AI Dashboard untuk portal Satu Data Kota Depok. "
        "Alur: ekstrak data dashboard -> masking PII -> cache Redis -> LLM -> insight."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.APP_VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": (
            settings.GEMINI_MODEL
            if settings.LLM_PROVIDER == "gemini"
            else settings.CLAUDE_MODEL
        ),
    }
