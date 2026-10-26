import hashlib
import logging
import re
import time
from typing import Dict, Optional, Tuple

import redis.asyncio as redis

from app.core.config import settings
from app.schemas.insight import CachedAnalysis

logger = logging.getLogger(__name__)

_MEMORY_TTL_SWEEP = 120


class CacheService:
    """Cache Redis dengan fallback in-memory agar demo tetap jalan.

    Fallback in-memory hanya untuk satu proses. Pada produksi multi-worker,
    Redis tetap menjadi sumber utama.
    """

    _memory: Dict[str, Tuple[float, str]] = {}
    _last_sweep: float = 0.0

    def __init__(self) -> None:
        common = {
            "decode_responses": True,
            "socket_connect_timeout": 5,
            "socket_timeout": 5,
            "health_check_interval": 30,
        }
        if settings.REDIS_URL:
            self.client = redis.from_url(settings.redis_url, **common)
        else:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                ssl=settings.REDIS_SSL or "upstash.io" in settings.REDIS_HOST,
                **common,
            )

    # ------------------------------------------------------------------ hash
    @staticmethod
    def generate_hash(payload: bytes | str) -> str:
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    @staticmethod
    def build_key(dashboard_id: Optional[str], content_hash: str) -> str:
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "", dashboard_id or "")[:64] or "anon"
        return f"{settings.CACHE_KEY_PREFIX}:{safe_id}:{content_hash}"

    # --------------------------------------------------------------- redis
    async def ping(self) -> bool:
        try:
            return bool(await self.client.ping())
        except Exception as exc:  # noqa: BLE001
            logger.warning("[REDIS] ping gagal: %s", exc)
            return False

    async def get_cached_analysis(self, key: str) -> Optional[CachedAnalysis]:
        raw_value: Optional[str] = None

        try:
            raw_value = await self.client.get(key)
        except Exception as exc:  # noqa: BLE001
            logger.error("[REDIS ERROR - GET]: %s", exc)

        if not raw_value:
            raw_value = self._memory_get(key)

        if not raw_value:
            return None

        try:
            return CachedAnalysis.model_validate_json(raw_value)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[CACHE] Format cache tidak valid untuk key %s: %s", key, exc)
            return None

    async def set_cached_analysis(self, key: str, value: CachedAnalysis) -> None:
        payload = value.model_dump_json()
        self._memory_set(key, payload, settings.CACHE_EXPIRE_SECONDS)

        try:
            await self.client.set(key, payload, ex=settings.CACHE_EXPIRE_SECONDS)
            logger.info("[REDIS OK] Cache disimpan: %s", key)
        except Exception as exc:  # noqa: BLE001
            logger.error("[REDIS ERROR - SET]: %s (memakai fallback in-memory)", exc)

    # -------------------------------------------------------------- memory
    def _memory_set(self, key: str, payload: str, ttl: int) -> None:
        now = time.time()
        self._memory[key] = (now + ttl, payload)
        self._sweep_memory(now)

    def _memory_get(self, key: str) -> Optional[str]:
        item = self._memory.get(key)
        if not item:
            return None
        expires_at, payload = item
        if expires_at < time.time():
            self._memory.pop(key, None)
            return None
        return payload

    def _sweep_memory(self, now: float) -> None:
        if now - self._last_sweep < _MEMORY_TTL_SWEEP:
            return
        type(self)._last_sweep = now
        expired = [key for key, (exp, _) in self._memory.items() if exp < now]
        for key in expired:
            self._memory.pop(key, None)
