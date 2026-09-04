import base64
import json
import re
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings
from app.schemas.insight import DashboardInsight

SYSTEM_PROMPT = """Anda adalah analis data senior untuk instansi pemerintah.
Tugas Anda adalah membaca visual dashboard instansi secara multimodal dan menyusun narasi insight analitis yang dinamis dalam Bahasa Indonesia.

ATURAN ANALISIS:
1. IDENTIFIKASI TOPIK: Tentukan terlebih dahulu topik utama visual (misal: stunting, postur APBD, capaian imunisasi, kependudukan, pengadaan). Sesuaikan terminologi dan sudut pandang narasi dengan topik tersebut.
2. POLA & ANOMALI: Temukan tren pergerakan data, kategori dominan, titik data ekstrem (puncak/dasar), atau perbandingan mencolok.
3. KETELITIAN ANGKA (SANGAT PENTING):
   - Jika tersedia data mentah teks, gunakan angka presisi tersebut.
   - Jika HANYA mengandalkan visual screenshot, HINDARI mengklaim angka presisi desimal kecuali label angkanya terbaca sangat jelas pada grafik. Gunakan bahasa aproksimasi ("berkisar di angka ~...", "mendekati...", "mengalami tren kenaikan signifikan pada periode X").
4. AUDIENS: Susun narasi yang jelas, profesional, dan mudah dicerna oleh pejabat publik serta masyarakat umum. Hindari template kaku.

OUTPUT: Wajib mengeluarkan format JSON valid tunggal tanpa markdown blok pembuka/penutup tambahan yang tidak perlu, dengan skema:
{
  "topik": "Topik spesifik dashboard",
  "ringkasan": "1-2 paragraf padat insight utama",
  "tren_utama": ["poin tren 1", "poin tren 2", "..."],
  "hal_menonjol": ["poin anomali/angka menarik 1", "poin anomali/angka menarik 2", "..."]
}
"""

def extract_json(raw_text: str) -> dict:
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("LLM tidak mengembalikan format JSON yang valid.")

class BaseLLMService(ABC):
    @abstractmethod
    async def analyze(self, image_bytes: bytes, raw_data: Optional[dict]) -> DashboardInsight:
        pass

class GeminiService(BaseLLMService):
    def __init__(self):
        from google import genai
        from google.genai import types
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.types = types

    async def analyze(self, image_bytes: bytes, raw_data: Optional[dict]) -> DashboardInsight:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt_text = "Analisis visual dashboard berikut."
        if raw_data:
            truncated_data = json.dumps(raw_data)[:4000]
            prompt_text += f"\n\nTerdapat data ekstrak tambahan berikut dari server:\n{truncated_data}"
        else:
            prompt_text += "\n\nCatatan: Analisis murni dari screenshot visual tanpa data mentah tambahan."

        response = self.client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[
                self.types.Part.from_text(text=SYSTEM_PROMPT),
                self.types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                self.types.Part.from_text(text=prompt_text)
            ],
            config=self.types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        data = extract_json(response.text)
        return DashboardInsight(**data)

class ClaudeService(BaseLLMService):
    def __init__(self):
        import anthropic
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def analyze(self, image_bytes: bytes, raw_data: Optional[dict]) -> DashboardInsight:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        user_message = "Analisis visual dashboard berikut."
        if raw_data:
            truncated_data = json.dumps(raw_data)[:4000]
            user_message += f"\n\nTerdapat data mentah pendukung:\n{truncated_data}"
        else:
            user_message += "\n\nAnalisis murni dari visual screenshot."

        response = await self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": b64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": user_message
                        }
                    ],
                }
            ],
        )
        content_text = response.content[0].text
        data = extract_json(content_text)
        return DashboardInsight(**data)

def get_llm_service() -> BaseLLMService:
    if settings.LLM_PROVIDER == "claude":
        return ClaudeService()
    return GeminiService()