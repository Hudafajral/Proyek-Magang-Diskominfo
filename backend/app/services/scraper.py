import asyncio
import logging
from importlib import import_module
from typing import Tuple, Optional
from urllib.parse import urlparse, urlunparse
from app.core.config import settings

logger = logging.getLogger(__name__)

def normalize_tableau_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    clean_path = parsed.path
    clean_query = ":showVizHome=no&:embed=true"
    return urlunparse((
        parsed.scheme,
        parsed.netloc,
        clean_path,
        "",
        clean_query,
        ""
    ))

def _sync_capture(url: str) -> Tuple[bytes, Optional[dict]]:
    target_url = normalize_tableau_url(url)
    extracted_data: Optional[dict] = None

    playwright_api = import_module("playwright.sync_api")
    sync_playwright = playwright_api.sync_playwright
    playwright_timeout_error = playwright_api.TimeoutError

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        )
        context = browser.new_context(
            viewport={"width": settings.VIEWPORT_WIDTH, "height": settings.VIEWPORT_HEIGHT},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        def handle_response(response):
            nonlocal extracted_data
            try:
                if any(endpoint in response.url for endpoint in ["performSheetAction", "bootstrapSession"]):
                    if "json" in response.headers.get("content-type", ""):
                        data = response.json()
                        if not extracted_data:
                            extracted_data = data
            except Exception:
                pass

        page.on("response", handle_response)

        try:
            page.goto(
                target_url,
                wait_until="load",
                timeout=settings.SCRAPER_TIMEOUT_SECONDS * 1000
            )
            page.wait_for_timeout(7000)

            try:
                page.wait_for_selector(".tabGlassPane", state="hidden", timeout=10000)
            except Exception:
                pass

            screenshot_bytes = page.screenshot(full_page=False, type="png")
            return screenshot_bytes, extracted_data

        except playwright_timeout_error as e:
            logger.error(f"Timeout Tableau: {e}")
            raise RuntimeError("Koneksi timeout saat memuat visual Tableau.")
        except Exception as e:
            logger.error(f"Error scraping: {e}")
            raise RuntimeError(str(e))
        finally:
            context.close()
            browser.close()

class TableauScraperService:
    @staticmethod
    async def capture_dashboard(url: str) -> Tuple[bytes, Optional[dict]]:
        return await asyncio.to_thread(_sync_capture, url)