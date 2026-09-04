from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional

class DashboardAnalysisRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL publik Tableau Public dashboard")
    force_refresh: bool = Field(False, description="Paksa scraping dan bypass cache jika true")

class DashboardInsight(BaseModel):
    topik: str = Field(..., description="Topik domain dashboard teridentifikasi")
    ringkasan: str = Field(..., description="Ringkasan eksekutif untuk masyarakat awam")
    tren_utama: List[str] = Field(..., description="Daftar tren penting yang terbaca")
    hal_menonjol: List[str] = Field(..., description="Daftar anomali, angka tertinggi/terendah, atau temuan unik")

class DashboardAnalysisResponse(BaseModel):
    cached: bool
    screenshot_hash: str
    has_extracted_data: bool
    insight: DashboardInsight