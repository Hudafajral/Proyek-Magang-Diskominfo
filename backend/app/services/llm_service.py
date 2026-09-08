import base64
import json
import re
import asyncio
import importlib
import logging
from abc import ABC, abstractmethod
from typing import Optional, Any
from app.core.config import settings
from app.schemas.insight import DashboardInsight

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Anda adalah analis data senior instansi pemerintah.
Tugas Anda adalah membaca data dasbor yang sedang aktif/terfilter dan menyusun narasi insight analitis dalam Bahasa Indonesia.

ATURAN ANALISIS:
1. AKURASI ANGKA MUTLAK: Seluruh metrik dan angka yang Anda sebutkan wajib bersumber langsung dari data terlampir. Jangan mengarang angka di luar data.
2. ANALISIS DATA TERFILTER: Data yang diberikan mencerminkan kondisi lembar kerja yang sedang aktif dilihat pengguna. Analisis korelasi antar kolom, volume dominan, serta pola tren yang terbentuk.
3. STRUKTUR OUTPUT: Kembalikan dalam format JSON valid tanpa tanda pembuka/penutup markdown tambahan:
{
  "topik": "Topik spesifik dasbor (sebutkan segmen/tahun aktif jika ada)",
  "ringkasan": "1-2 paragraf padat ringkasan eksekutif berbasis data aktif",
  "tren_utama": ["Poin tren 1", "Poin tren 2"],
  "hal_menonjol": ["Poin angka dominan 1", "Poin angka dominan 2"]
}"""

def extract_json(raw_text: str) -> dict:
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("LLM tidak mengembalikan format JSON yang valid.")

class BaseLLMService(ABC):
    @abstractmethod
    async def analyze(self, image_bytes: Optional[bytes], raw_data: Optional[Any]) -> DashboardInsight:
        pass

class GeminiService(BaseLLMService):
    def __init__(self):
        from google import genai
        from google.genai import types
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.types = types

    async def analyze(self, image_bytes: Optional[bytes], raw_data: Optional[Any]) -> DashboardInsight:
        contents = [self.types.Part.from_text(text=SYSTEM_PROMPT)]

        if raw_data:
            data_str = json.dumps(raw_data, ensure_ascii=False)[:8000]
            contents.append(
                self.types.Part.from_text(
                    text=f"Berikut adalah data terstruktur hasil filter aktif di dasbor:\n{data_str}\n\nBuatlah narasi insight analitis berdasarkan data tersebut."
                )
            )
        elif image_bytes:
            contents.append(self.types.Part.from_bytes(data=image_bytes, mime_type="image/png"))
            contents.append(self.types.Part.from_text(text="Analisis gambar visual dashboard berikut."))

        # Tetapkan ke model resmi gemini-3.6-flash
        target_model = "gemini-3.6-flash"
        max_retries = 3
        delay = 4  # detik

        for attempt in range(max_retries):
            try:
                def _call():
                    return self.client.models.generate_content(
                        model=target_model,
                        contents=contents,
                        config=self.types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2
                        )
                    )
                response = await asyncio.to_thread(_call)
                return DashboardInsight(**extract_json(response.text))
            except Exception as e:
                err_msg = str(e)
                # Tangani limit 429: tunggu jeda lalu coba ulang otomatis
                if "429" in err_msg or "ResourceExhausted" in err_msg or "Too Many Requests" in err_msg:
                    logger.warning(f"Rate limit 429 (Percobaan {attempt + 1}/{max_retries}). Menunggu {delay} detik...")
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                else:
                    logger.error(f"Gagal memanggil model {target_model}: {e}")
                    raise RuntimeError(f"Gagal memproses LLM: {e}")

        raise RuntimeError("Batas kuota API (Rate Limit 429) tercapai. Silakan tunggu 20 detik lalu coba lagi.")
def get_llm_service() -> BaseLLMService:
    return GeminiService()