import base64
import json
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Deque, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.schemas.insight import (
    AnalysisMeta,
    CachedAnalysis,
    DashboardAnalysisRequest,
    DashboardAnalysisResponse,
    DISCLAIMER,
)
from app.services.cache_service import CacheService
from app.services.llm_service import BaseLLMService, get_llm_service
from app.services.sanitizer import sanitize_table_data
from app.services.scraper import TableauScraperService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()

# Rate limit sederhana per IP (in-memory, cukup untuk demo / single worker).
_rate_buckets: Dict[str, Deque[float]] = defaultdict(deque)


def _check_rate_limit(request: Request) -> None:
    limit = settings.RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return

    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() or (
        request.client.host if request.client else "unknown"
    )

    now = time.time()
    bucket = _rate_buckets[client_ip]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                "Terlalu banyak permintaan analisis. "
                "Silakan coba lagi dalam satu menit."
            ),
        )

    bucket.append(now)


@router.post("/analyze-dashboard", response_model=DashboardAnalysisResponse)
async def analyze_dashboard(
    payload: DashboardAnalysisRequest,
    request: Request,
    llm_service: BaseLLMService = Depends(get_llm_service),
) -> DashboardAnalysisResponse:
    _check_rate_limit(request)

    total_start = time.time()
    cache = CacheService()
    target_url = str(payload.url)

    screenshot_bytes: Optional[bytes] = None
    raw_data = None
    data_source = "screenshot"
    pii_masked = False
    rows_analyzed = 0

    logger.info("=== MULAI ANALISIS DASHBOARD ===")
    logger.info(
        "Dashboard ID=%s | title=%s | force_refresh=%s",
        payload.dashboard_id,
        payload.dashboard_title,
        payload.force_refresh,
    )

    # 1. Tentukan sumber data & visual hash
    if payload.raw_table_data:
        raw_data, pii_masked, rows_analyzed = sanitize_table_data(
            payload.raw_table_data,
            settings.pii_keywords,
            settings.MAX_TABLE_ROWS,
        )
        if not raw_data:
            raise HTTPException(
                status_code=422,
                detail="Data tabel yang dikirim kosong atau formatnya tidak dikenali.",
            )
        data_string = json.dumps(raw_data, sort_keys=True, ensure_ascii=False)
        visual_hash = cache.generate_hash(data_string)
        data_source = "table_data"
        logger.info(
            "Sumber: data tabel | baris=%s | PII dimasking=%s",
            rows_analyzed,
            pii_masked,
        )

    elif payload.image_base64:
        try:
            clean_b64 = payload.image_base64.split(",")[-1]
            screenshot_bytes = base64.b64decode(clean_b64, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=422, detail="Format image_base64 tidak valid."
            ) from exc

        visual_hash = cache.generate_hash(screenshot_bytes)
        data_source = "uploaded_image"
        logger.info("Sumber: gambar upload | ukuran=%s bytes", len(screenshot_bytes))

    else:
        logger.info("Data tabel tidak tersedia, menjalankan Playwright scraper...")
        scraper_start = time.time()
        try:
            screenshot_bytes, extracted = await TableauScraperService.capture_dashboard(
                target_url
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=502,
                detail=f"Gagal mengambil dashboard Tableau: {exc}",
            ) from exc

        visual_hash = cache.generate_hash(screenshot_bytes)
        data_source = "screenshot"

        if extracted:
            raw_data, pii_masked, rows_analyzed = sanitize_table_data(
                [{"sheet": "network_capture", "rows": [extracted]}],
                settings.pii_keywords,
                settings.MAX_TABLE_ROWS,
            )

        logger.info(
            "[TIMER] Scraper selesai: %.2f detik | data jaringan=%s",
            time.time() - scraper_start,
            bool(raw_data),
        )

    cache_key = CacheService.build_key(payload.dashboard_id, visual_hash)
    logger.info("Cache key: %s", cache_key)

    # 2. Cek cache (kecuali force_refresh)
    if not payload.force_refresh:
        cache_start = time.time()
        cached = await cache.get_cached_analysis(cache_key)
        if cached:
            logger.info(
                "[TIMER] Cache HIT! Redis: %.3f detik | total: %.2f detik",
                time.time() - cache_start,
                time.time() - total_start,
            )
            return DashboardAnalysisResponse(
                cached=True,
                screenshot_hash=visual_hash,
                has_extracted_data=raw_data is not None,
                insight=cached.insight,
                meta=cached.meta,
                disclaimer=DISCLAIMER,
            )
        logger.info("Cache MISS untuk key: %s", cache_key)
    else:
        logger.info("Bypass cache karena force_refresh=True.")

    # 3. Panggil LLM
    try:
        logger.info("Mengirim data ke LLM (%s)...", llm_service.model_name)
        llm_start = time.time()
        insight = await llm_service.analyze(screenshot_bytes, raw_data)
        logger.info("[TIMER] LLM selesai: %.2f detik", time.time() - llm_start)
    except Exception as exc:  # noqa: BLE001
        logger.error("LLM processing error: %s", exc)
        raise HTTPException(
            status_code=500, detail=f"Gagal menghasilkan analisis AI: {exc}"
        ) from exc

    meta = AnalysisMeta(
        dashboard_id=payload.dashboard_id,
        dashboard_title=payload.dashboard_title,
        source_url=target_url,
        analyzed_at=datetime.now(timezone.utc),
        data_source=data_source,  # type: ignore[arg-type]
        rows_analyzed=rows_analyzed,
        pii_masked=pii_masked,
        model=llm_service.model_name,
    )

    # 4. Simpan ke cache
    await cache.set_cached_analysis(cache_key, CachedAnalysis(insight=insight, meta=meta))

    logger.info("[TIMER] TOTAL tanpa cache: %.2f detik", time.time() - total_start)
    return DashboardAnalysisResponse(
        cached=False,
        screenshot_hash=visual_hash,
        has_extracted_data=raw_data is not None,
        insight=insight,
        meta=meta,
        disclaimer=DISCLAIMER,
    )


@router.get("/cache/health")
async def cache_health() -> dict:
    cache = CacheService()
    ok = await cache.ping()
    return {"redis": "ok" if ok else "unavailable"}
