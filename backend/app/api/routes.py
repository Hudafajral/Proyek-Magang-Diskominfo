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
    logger.info(f"Payload force_refresh: {payload.force_refresh}")

    # 1. Menentukan Visual Hash
    if payload.raw_table_data:
        raw_data = payload.raw_table_data
        screenshot_bytes = None
        data_string = json.dumps(raw_data, sort_keys=True)
        visual_hash = f"json_data_{hashlib.md5(data_string.encode()).hexdigest()}"
        logger.info(f"Key Hash JSON yang dihasilkan: {visual_hash}")
    elif payload.image_base64:
        clean_b64 = payload.image_base64.split(",")[-1]
        screenshot_bytes = base64.b64decode(clean_b64)
        raw_data = None
        visual_hash = cache.generate_hash(screenshot_bytes)
        logger.info(f"Key Hash Image yang dihasilkan: {visual_hash}")
    else:
        logger.info("Menjalankan Playwright Scraper...")
        screenshot_bytes, raw_data = await TableauScraperService.capture_dashboard(target_url)
        visual_hash = cache.generate_hash(screenshot_bytes)
        logger.info(f"Key Hash Fallback yang dihasilkan: {visual_hash}")

    # 2. Cek Cache (Selalu cek Redis terlebih dahulu)
    if True:  # Mengabaikan force_refresh agar cache selalu bekerja
        cache_start = time.time()
        cached_insight = await cache.get_cached_insight(visual_hash)
        if cached_insight:
            logger.info(f"[TIMER] Cache HIT! Waktu Redis: {time.time() - cache_start:.3f} detik")
            logger.info(f"[TIMER] TOTAL WAKTU (Dari Cache): {time.time() - total_start_time:.2f} detik")
            return DashboardAnalysisResponse(
                cached=True,
                screenshot_hash=visual_hash,
                has_extracted_data=raw_data is not None,
                insight=cached_insight
            )
        else:
            logger.info(f"Cache MISS untuk key: {visual_hash}")
    else:
        logger.info("Bypass cache karena force_refresh bernilai True.")

    # 3. Kirim ke LLM Service
    try:
        logger.info("Mengirim data ke LLM...")
        llm_start = time.time()
        insight = await llm_service.analyze(screenshot_bytes, raw_data)
        logger.info(f"[TIMER] LLM Selesai: {time.time() - llm_start:.2f} detik")
    except Exception as e:
        logger.error(f"LLM Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisis AI: {str(e)}")

    # 4. Simpan ke Redis Cache
    await cache.set_cached_insight(visual_hash, insight)

    logger.info(f"[TIMER] TOTAL WAKTU (Tanpa Cache): {time.time() - total_start_time:.2f} detik")
    return DashboardAnalysisResponse(
        cached=False,
        screenshot_hash=visual_hash,
        has_extracted_data=raw_data is not None,
        insight=insight
    )