import hashlib
import json
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings
from app.schemas.insight import DashboardInsight

class CacheService:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD or None,
            decode_responses=True
        )

    @staticmethod
    def generate_hash(screenshot_bytes: bytes) -> str:
        """Menghasilkan hash SHA-256 dari representasi biner visual dashboard."""
        return hashlib.sha256(screenshot_bytes).hexdigest()

    async def get_cached_insight(self, screenshot_hash: str) -> Optional[DashboardInsight]:
        try:
            cached_val = await self.client.get(f"tableau_insight:{screenshot_hash}")
            if cached_val:
                return DashboardInsight.model_validate_json(cached_val)
        except Exception:
            pass
        return None

    async def set_cached_insight(self, screenshot_hash: str, insight: DashboardInsight) -> None:
        try:
            await self.client.setex(
                f"tableau_insight:{screenshot_hash}",
                settings.CACHE_EXPIRE_SECONDS,
                insight.model_dump_json()
            )
        except Exception:
            pass