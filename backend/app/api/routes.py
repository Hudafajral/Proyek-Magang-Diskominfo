import logging
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.insight import DashboardAnalysisRequest, DashboardAnalysisResponse
from app.services.scraper import TableauScraperService
from app.services.cache_service import CacheService
from app.services.llm_service import get_llm_service, BaseLLMService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze-dashboard", response_model=DashboardAnalysisResponse)
async def analyze_dashboard(
    payload: DashboardAnalysisRequest,
    llm_service: BaseLLMService = Depends(get_llm_service)
):
    cache = CacheService()
    target_url = str(payload.url)

    # 1. Scraping visual dashboard & payload mentah jika ada
    try:
        screenshot_bytes, raw_data = await TableauScraperService.capture_dashboard(target_url)
    except Exception as e:
        logger.error(f"Scraper error: {e}")
        raise HTTPException(status_code=502, detail=f"Gagal memuat visual dashboard: {str(e)}")

    # 2. Hitung hash visual
    visual_hash = cache.generate_hash(screenshot_bytes)

    # 3. Validasi Cache jika tidak dipaksa refresh
    if not payload.force_refresh:
        cached_insight = await cache.get_cached_insight(visual_hash)
        if cached_insight:
            return DashboardAnalysisResponse(
                cached=True,
                screenshot_hash=visual_hash,
                has_extracted_data=raw_data is not None,
                insight=cached_insight
            )

    # 4. Kirim ke LLM Multimodal
    try:
        insight = await llm_service.analyze(screenshot_bytes, raw_data)
    except Exception as e:
        logger.error(f"LLM Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisis AI: {str(e)}")

    # 5. Simpan ke Cache
    await cache.set_cached_insight(visual_hash, insight)

    return DashboardAnalysisResponse(
        cached=False,
        screenshot_hash=visual_hash,
        has_extracted_data=raw_data is not None,
        insight=insight
    )