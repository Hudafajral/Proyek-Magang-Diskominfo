from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Dashboard Insight API"
    LLM_PROVIDER: Literal["gemini", "claude"] = "gemini"
    
    # LLM Keys
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    CACHE_EXPIRE_SECONDS: int = 86400  # 24 jam default fallback jika tidak ada perubahan visual
    
    # Scraper
    SCRAPER_TIMEOUT_SECONDS: int = 40
    VIEWPORT_WIDTH: int = 1440
    VIEWPORT_HEIGHT: int = 900

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()