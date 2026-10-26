from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from urllib.parse import quote


class Settings(BaseSettings):
    # Identitas aplikasi
    PROJECT_NAME: str = "Simulasi Analisis AI Dashboard - Satu Data Depok"
    APP_VERSION: str = "2.0.0"

    # LLM Selection: "gemini" atau "claude"
    LLM_PROVIDER: str = "gemini"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.8-flash"

    # Anthropic Claude
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # Redis Cache
    REDIS_URL: str = ""
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_SSL: bool = False
    # Naikkan versi ini saat prompt/format insight berubah agar cache lama
    # tidak menampilkan hasil dengan aturan prompt sebelumnya.
    CACHE_KEY_PREFIX: str = "tableau_insight:v3"
    CACHE_EXPIRE_SECONDS: int = 86400  # 24 jam

    # Scraper (fallback bila data tabel tidak tersedia)
    SCRAPER_TIMEOUT_SECONDS: int = 40
    SCRAPER_SETTLE_SECONDS: int = 7
    VIEWPORT_WIDTH: int = 1440
    VIEWPORT_HEIGHT: int = 900
    ALLOWED_SCRAPE_HOSTS: str = "public.tableau.com,satudata.depok.go.id"
    MAX_TABLE_ROWS: int = 1000

    # LLM input
    LLM_MAX_INPUT_CHARS: int = 24000

    # Privasi: masking kolom PII sebelum data dikirim ke LLM
    MASK_PII: bool = True
    PII_KEYWORDS: str = (
        "nama,nik,nip,alamat,email,telepon,phone,hp,"
        "tanggal_lahir,tgl_lahir,tempat_lahir,no_kk,kk,"
        "pegawai,penduduk,no_hp,whatsapp"
    )

    # HTTP / keamanan
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "https://satudata.depok.go.id"
    )
    RATE_LIMIT_PER_MINUTE: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        use_ssl = self.REDIS_SSL or "upstash.io" in self.REDIS_HOST
        scheme = "rediss" if use_ssl else "redis"
        password = quote(self.REDIS_PASSWORD, safe="") if self.REDIS_PASSWORD else ""
        auth = f":{password}@" if password else ""
        return f"{scheme}://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [item.strip() for item in self.ALLOWED_ORIGINS.split(",") if item.strip()]

    @property
    def allowed_scrape_hosts(self) -> List[str]:
        return [item.strip().lower() for item in self.ALLOWED_SCRAPE_HOSTS.split(",") if item.strip()]

    @property
    def pii_keywords(self) -> List[str]:
        return [item.strip().lower() for item in self.PII_KEYWORDS.split(",") if item.strip()]


settings = Settings()
