import asyncio
import logging
from importlib import import_module
from typing import Optional, Tuple
from urllib.parse import urlparse, urlunparse

from app.core.config import settings

logger = logging.getLogger(__name__)


def validate_scrape_url(raw_url: str) -> str:
    """Cegah SSRF: hanya izinkan host Tableau/Satu Data yang terdaftar."""
    parsed = urlparse(raw_url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL harus menggunakan skema http atau https.")

    host = (parsed.hostname or "").lower()
    allowed_hosts = settings.allowed_scrape_hosts

    if allowed_hosts and not any(
        host == allowed or host.endswith(f".{allowed}") for allowed in allowed_hosts
    ):
        raise ValueError(
            f"Host '{host}' tidak diizinkan untuk scraping. "
            "Tambahkan ke ALLOWED_SCRAPE_HOSTS jika memang diperlukan."
        )

    return raw_url


def normalize_tableau_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            "",
            ":showVizHome=no&:embed=true",
            "",
        )
    )


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
                "--disable-gpu",
            ],
        )
        context = browser.new_context(
            viewport={
                "width": settings.VIEWPORT_WIDTH,
                "height": settings.VIEWPORT_HEIGHT,
            },
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        def handle_response(response) -> None:
            nonlocal extracted_data
            try:
                interesting = ("performSheetAction", "bootstrapSession")
                if any(endpoint in response.url for endpoint in interesting):
                    if "json" in response.headers.get("content-type", ""):
                        data = response.json()
                        if not extracted_data:
                            extracted_data = data
            except Exception:  # noqa: BLE001
                pass

        page.on("response", handle_response)

        try:
            page.goto(
                target_url,
                wait_until="load",
                timeout=settings.SCRAPER_TIMEOUT_SECONDS * 1000,
            )
            page.wait_for_timeout(settings.SCRAPER_SETTLE_SECONDS * 1000)

            try:
                page.wait_for_selector(
                    ".tabGlassPane", state="hidden", timeout=10_000
                )
            except Exception:  # noqa: BLE001
                pass

            screenshot_bytes = page.screenshot(full_page=False, type="png")
            return screenshot_bytes, extracted_data

        except playwright_timeout_error as exc:
            logger.error("Timeout Tableau: %s", exc)
            raise RuntimeError("Koneksi timeout saat memuat visual Tableau.") from exc
        except Exception as exc:  # noqa: BLE001
            logger.error("Error scraping: %s", exc)
            raise RuntimeError(str(exc)) from exc
        finally:
            context.close()
            browser.close()


class TableauScraperService:
    @staticmethod
    async def capture_dashboard(url: str) -> Tuple[bytes, Optional[dict]]:
        validate_scrape_url(url)
        return await asyncio.to_thread(_sync_capture, url)
