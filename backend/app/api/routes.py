import base64
import hashlib
import json
import logging
import time
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.insight import DashboardAnalysisRequest, DashboardAnalysisResponse
from app.services.scraper import TableauScraperService
from app.services.cache_service import CacheService
from app.services.llm_service import get_llm_service, BaseLLMService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze-dashboard", response_model=DashboardAnalysisResponse)
async def analyze_dashboard(
    payload: DashboardAnalysisRequest,
    llm_service: BaseLLMService = Depends(get_llm_service)
):
    total_start_time = time.time()
    cache = CacheService()
    target_url = str(payload.url)

    logger.info("=== MULAI ANALISIS DASHBOARD ===")

    # 1. Prioritas: Data Tabel Murni dari Filter Frontend
    if payload.raw_table_data:
        logger.info(f"Menerima {len(payload.raw_table_data)} grup tabel filter aktif.")
        raw_data = payload.raw_table_data
        screenshot_bytes = None
        data_string = json.dumps(raw_data, sort_keys=True)
        visual_hash = hashlib.md5(data_string.encode()).hexdigest()
    elif payload.image_base64:
        logger.info("Menerima snapshot visual fallback dari frontend.")
        clean_b64 = payload.image_base64.split(",")[-1]
        screenshot_bytes = base64.b64decode(clean_b64)
        raw_data = None
        visual_hash = cache.generate_hash(screenshot_bytes)
    else:
        logger.info("Fallback: Menjalankan Playwright Scraper...")
        scrape_start = time.time()
        screenshot_bytes, raw_data = await TableauScraperService.capture_dashboard(target_url)
        logger.info(f"[TIMER] Playwright Selesai: {time.time() - scrape_start:.2f} detik")
        visual_hash = cache.generate_hash(screenshot_bytes)

    # 2. Cek Cache (hanya jika data default tanpa payload interaktif)
    use_cache = (not payload.force_refresh) and (not payload.raw_table_data) and (payload.image_base64 is None)
    if use_cache:
        try:
            cached_insight = await cache.get_cached_insight(visual_hash)
            if cached_insight:
                return DashboardAnalysisResponse(
                    cached=True,
                    screenshot_hash=visual_hash,
                    has_extracted_data=raw_data is not None,
                    insight=cached_insight
                )
        except Exception:
            pass

    # 3. Kirim ke LLM Service
    try:
        llm_start = time.time()
        insight = await llm_service.analyze(screenshot_bytes, raw_data)
        logger.info(f"[TIMER] LLM Selesai: {time.time() - llm_start:.2f} detik")
    except Exception as e:
        logger.error(f"LLM Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisis AI: {str(e)}")

    logger.info(f"[TIMER] TOTAL WAKTU: {time.time() - total_start_time:.2f} detik")
    return DashboardAnalysisResponse(
        cached=False,
        screenshot_hash=visual_hash,
        has_extracted_data=raw_data is not None,
        insight=insight
    )