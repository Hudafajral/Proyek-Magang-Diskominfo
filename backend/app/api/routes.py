import logging
import time
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.insight import DashboardAnalysisRequest, DashboardAnalysisResponse
from app.services.scraper import TableauScraperService
from app.services.cache_service import CacheService
from app.services.llm_service import get_llm_service, BaseLLMService

# Mengaktifkan logger level INFO agar terlihat di terminal
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

    # 1. Scraping visual dashboard
    try:
        scrape_start = time.time()
        screenshot_bytes, raw_data = await TableauScraperService.capture_dashboard(target_url)
        logger.info(f"[TIMER] Playwright Scraping Selesai: {time.time() - scrape_start:.2f} detik")
    except Exception as e:
        logger.error(f"Scraper error: {e}")
        raise HTTPException(status_code=502, detail=f"Gagal memuat visual dashboard: {str(e)}")

    # 2. Hitung hash visual
    visual_hash = cache.generate_hash(screenshot_bytes)

    # 3. Validasi Cache
    if not payload.force_refresh:
        cache_start = time.time()
        cached_insight = await cache.get_cached_insight(visual_hash)
        logger.info(f"[TIMER] Cek Redis Cache Selesai: {time.time() - cache_start:.2f} detik")
        
        if cached_insight:
            logger.info(f"[TIMER] TOTAL WAKTU (Dari Cache): {time.time() - total_start_time:.2f} detik")
            return DashboardAnalysisResponse(
                cached=True,
                screenshot_hash=visual_hash,
                has_extracted_data=raw_data is not None,
                insight=cached_insight
            )

    # 4. Kirim ke LLM Multimodal
    try:
        llm_start = time.time()
        insight = await llm_service.analyze(screenshot_bytes, raw_data)
        logger.info(f"[TIMER] Gemini API Selesai: {time.time() - llm_start:.2f} detik")
    except Exception as e:
        logger.error(f"LLM Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisis AI: {str(e)}")

    # 5. Simpan ke Cache
    await cache.set_cached_insight(visual_hash, insight)

    logger.info(f"[TIMER] TOTAL WAKTU (Tanpa Cache): {time.time() - total_start_time:.2f} detik")
    logger.info("=== SELESAI ===")

    return DashboardAnalysisResponse(
        cached=False,
        screenshot_hash=visual_hash,
        has_extracted_data=raw_data is not None,
        insight=insight
    )