import asyncio
import base64
import json
import logging
import re
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Any, Optional

from app.core.config import settings
from app.schemas.insight import DashboardInsight

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Anda adalah analis data pada portal Satu Data Pemerintah Kota Depok.
Tugas Anda membaca data dashboard yang sedang aktif/terfilter, lalu menulis ringkasan
yang mudah dipahami masyarakat umum dan tetap akurat bagi pejabat pemerintahan.

ATURAN ANALISIS:
1. AKURASI ANGKA MUTLAK: Semua angka wajib berasal dari data yang dilampirkan.
   Jangan mengarang, membulatkan tanpa keterangan, atau menambah angka dari luar data.
2. FOKUS PADA DATA AKTIF: Data mencerminkan sheet/filter yang sedang dilihat pengguna.
   Sebutkan periode, wilayah, dan kategori yang benar-benar ada pada data.
3. BAHASA AWAM: Hindari jargon statistik yang tidak dijelaskan. Tulis singkat, jelas,
   dan netral. Jangan menyimpulkan hubungan sebab-akibat yang tidak didukung data.
4. KETERBATASAN: Jika data hanya sebagian, terlalu sedikit, atau tidak lengkap,
   sampaikan keterbatasan itu secara jujur di ringkasan.
5. STRUKTUR OUTPUT: Kembalikan JSON valid tanpa markdown tambahan:
{
  "topik": "Topik spesifik dashboard (sebutkan periode/wilayah aktif jika ada)",
  "ringkasan": "1-2 paragraf padat yang bisa dipahami masyarakat umum",
  "tren_utama": ["Poin tren 1", "Poin tren 2"],
  "hal_menonjol": ["Angka/daerah/kategori paling menonjol 1", "Poin 2"]
}"""


def extract_json(raw_text: str) -> dict:
    """Ambil objek JSON dari respons LLM, termasuk bila dibungkus code fence."""
    if not raw_text:
        raise ValueError("LLM tidak mengembalikan teks apa pun.")

    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))

    raise ValueError("LLM tidak mengembalikan format JSON yang valid.")


def _build_data_prompt(raw_data: Any) -> str:
    data_str = json.dumps(raw_data, ensure_ascii=False, sort_keys=True)
    if len(data_str) > settings.LLM_MAX_INPUT_CHARS:
        data_str = (
            data_str[: settings.LLM_MAX_INPUT_CHARS]
            + "\n...[data dipotong karena melebihi batas]..."
        )
    return (
        "Berikut data terstruktur dari dashboard yang sedang aktif. "
        "Gunakan hanya angka yang terlihat pada data ini:\n\n"
        f"{data_str}\n\n"
        "Susun insight sesuai format JSON yang diminta."
    )


class BaseLLMService(ABC):
    model_name: str = "unknown"

    @abstractmethod
    async def analyze(
        self, image_bytes: Optional[bytes], raw_data: Optional[Any]
    ) -> DashboardInsight:
        raise NotImplementedError


class GeminiService(BaseLLMService):
    def __init__(self) -> None:
        from google import genai
        from google.genai import types

        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY belum diisi. Salin .env.example menjadi .env."
            )

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=60_000),
        )
        self.types = types
        self.model_name = settings.GEMINI_MODEL
        self.fallback_model = settings.GEMINI_FALLBACK_MODEL

    def _generate(self, model: str, contents: list) -> Any:
        return self.client.models.generate_content(
            model=model,
            contents=contents,
            config=self.types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

    def _build_contents(
        self, image_bytes: Optional[bytes], raw_data: Optional[Any]
    ) -> list:
        contents = [self.types.Part.from_text(text=SYSTEM_PROMPT)]

        if raw_data:
            contents.append(self.types.Part.from_text(text=_build_data_prompt(raw_data)))
        elif image_bytes:
            contents.append(
                self.types.Part.from_bytes(data=image_bytes, mime_type="image/png")
            )
            contents.append(
                self.types.Part.from_text(
                    text=(
                        "Analisis visual dashboard pada gambar berikut. "
                        "Baca angka yang terlihat dan susun insight sesuai format JSON."
                    )
                )
            )
        else:
            raise ValueError("Tidak ada data tabel maupun gambar untuk dianalisis.")

        return contents

    async def analyze(
        self, image_bytes: Optional[bytes], raw_data: Optional[Any]
    ) -> DashboardInsight:
        contents = self._build_contents(image_bytes, raw_data)

        models = [self.model_name]
        if self.fallback_model and self.fallback_model != self.model_name:
            models.append(self.fallback_model)

        last_error: Optional[Exception] = None
        retryable_markers = (
            "429",
            "ResourceExhausted",
            "Too Many Requests",
            "503",
            "UNAVAILABLE",
            "500",
            "INTERNAL",
            "504",
            "DEADLINE_EXCEEDED",
            "timeout",
            "timed out",
        )

        for model in models:
            delay = 3
            for attempt in range(2):
                try:
                    response = await asyncio.to_thread(self._generate, model, contents)
                    self.model_name = model
                    return DashboardInsight(**extract_json(response.text or ""))
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    message = str(exc)

                    if any(marker in message for marker in retryable_markers):
                        logger.warning(
                            "[LLM] Model %s sedang sibuk/timeout (percobaan %s/2). "
                            "Menunggu %s detik... Detail: %s",
                            model,
                            attempt + 1,
                            delay,
                            message[:160],
                        )
                        await asyncio.sleep(delay)
                        delay *= 2
                        continue

                    if "404" in message or "NOT_FOUND" in message:
                        logger.warning(
                            "[LLM] Model %s tidak tersedia, mencoba fallback...", model
                        )
                        break

                    logger.error("[LLM] Gagal memanggil model %s: %s", model, exc)
                    raise RuntimeError(f"Gagal memproses LLM: {exc}") from exc

        raise RuntimeError(
            "Semua model LLM gagal dipanggil. "
            f"Periksa GEMINI_MODEL/GEMINI_FALLBACK_MODEL. Detail: {last_error}"
        )


class ClaudeService(BaseLLMService):
    def __init__(self) -> None:
        from anthropic import AsyncAnthropic

        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY belum diisi.")

        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model_name = settings.CLAUDE_MODEL

    async def analyze(
        self, image_bytes: Optional[bytes], raw_data: Optional[Any]
    ) -> DashboardInsight:
        content: list[dict[str, Any]] = []

        if image_bytes:
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    },
                }
            )

        if raw_data:
            content.append({"type": "text", "text": _build_data_prompt(raw_data)})
        elif image_bytes:
            content.append(
                {
                    "type": "text",
                    "text": "Analisis visual dashboard pada gambar dan susun insight JSON.",
                }
            )
        else:
            raise ValueError("Tidak ada data tabel maupun gambar untuk dianalisis.")

        message = await self.client.messages.create(
            model=self.model_name,
            max_tokens=2048,
            temperature=0.2,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        text = "".join(
            block.text for block in message.content if getattr(block, "type", "") == "text"
        )
        return DashboardInsight(**extract_json(text))


@lru_cache(maxsize=1)
def get_llm_service() -> BaseLLMService:
    if settings.LLM_PROVIDER == "claude" and settings.ANTHROPIC_API_KEY:
        return ClaudeService()
    return GeminiService()
