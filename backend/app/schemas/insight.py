from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field, HttpUrl

DISCLAIMER = (
    "Ringkasan ini dihasilkan otomatis oleh AI berdasarkan tampilan dashboard "
    "yang sedang aktif. Hasil bukan interpretasi resmi Pemerintah Kota Depok. "
    "Selalu rujuk kembali angka pada dashboard dan sumber data aslinya."
)


class DashboardAnalysisRequest(BaseModel):
    url: HttpUrl = Field(..., description="URL publik Tableau dashboard")
    dashboard_id: Optional[str] = Field(
        None, description="ID Data Insight (dipakai untuk cache & audit)"
    )
    dashboard_title: Optional[str] = Field(
        None, description="Judul dashboard untuk konteks analisis"
    )
    force_refresh: bool = Field(False, description="Paksa bypass cache jika true")
    image_base64: Optional[str] = Field(
        None, description="Snapshot visual fallback (data URL / base64)"
    )
    raw_table_data: Optional[List[Any]] = Field(
        None, description="Data tabel terstruktur hasil filter aktif"
    )


class DashboardInsight(BaseModel):
    topik: str = Field(..., description="Topik domain dashboard teridentifikasi")
    ringkasan: str = Field(..., description="Ringkasan eksekutif untuk masyarakat umum")
    tren_utama: List[str] = Field(..., description="Daftar tren penting yang terbaca")
    hal_menonjol: List[str] = Field(..., description="Daftar anomali atau angka tertinggi")


class AnalysisMeta(BaseModel):
    dashboard_id: Optional[str] = None
    dashboard_title: Optional[str] = None
    source_url: str
    analyzed_at: datetime
    data_source: Literal["table_data", "screenshot", "uploaded_image"]
    rows_analyzed: int = 0
    pii_masked: bool = False
    model: Optional[str] = None


class CachedAnalysis(BaseModel):
    """Payload yang disimpan di Redis."""

    insight: DashboardInsight
    meta: AnalysisMeta


class DashboardAnalysisResponse(BaseModel):
    cached: bool
    screenshot_hash: str
    has_extracted_data: bool
    insight: DashboardInsight
    meta: AnalysisMeta
    disclaimer: str = DISCLAIMER
