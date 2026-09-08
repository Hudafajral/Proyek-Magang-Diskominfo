import hashlib
import json
import logging
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings
from app.schemas.insight import DashboardInsight

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        # Aktifkan ssl=True jika menggunakan cloud Redis seperti Upstash
        is_upstash = "upstash.io" in str(settings.REDIS_HOST)
        
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD or None,
            ssl=is_upstash,
            ssl_cert_reqs="none" if is_upstash else None,
            decode_responses=True
        )

    @staticmethod
    def generate_hash(screenshot_bytes: bytes) -> str:
        return hashlib.sha256(screenshot_bytes).hexdigest()

    async def get_cached_insight(self, screenshot_hash: str) -> Optional[DashboardInsight]:
        try:
            cached_val = await self.client.get(f"tableau_insight:{screenshot_hash}")
            if cached_val:
                return DashboardInsight.model_validate_json(cached_val)
        except Exception as e:
            logger.error(f"[REDIS ERROR - GET]: Gagal membaca cache: {e}")
        return None

    async def set_cached_insight(self, screenshot_hash: str, insight: DashboardInsight) -> None:
        try:
            expire_time = getattr(settings, "CACHE_EXPIRE_SECONDS", 86400) or 86400
            await self.client.setex(
                f"tableau_insight:{screenshot_hash}",
                expire_time,
                insight.model_dump_json()
            )
            logger.info(f"[REDIS OK] Data berhasil disimpan ke key: tableau_insight:{screenshot_hash}")
        except Exception as e:
            logger.error(f"[REDIS ERROR - SET]: Gagal menulis cache: {e}")