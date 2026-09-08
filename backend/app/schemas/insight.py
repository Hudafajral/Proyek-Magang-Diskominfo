from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Any

class DashboardAnalysisRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL publik Tableau Public dashboard")
    force_refresh: bool = Field(False, description="Paksa bypass cache jika true")
    image_base64: Optional[str] = Field(None, description="Snapshot visual fallback")
    raw_table_data: Optional[List[Any]] = Field(None, description="Data tabel terstruktur hasil filter aktif")

class DashboardInsight(BaseModel):
    topik: str = Field(..., description="Topik domain dashboard teridentifikasi")
    ringkasan: str = Field(..., description="Ringkasan eksekutif")
    tren_utama: List[str] = Field(..., description="Daftar tren penting yang terbaca")
    hal_menonjol: List[str] = Field(..., description="Daftar anomali atau angka tertinggi")

class DashboardAnalysisResponse(BaseModel):
    cached: bool
    screenshot_hash: str
    has_extracted_data: bool
    insight: DashboardInsight