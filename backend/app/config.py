from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Market Doppelganger API"
    environment: str = "development"
    frontend_origins: list[str] = ["http://localhost:3000"]
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    database_url: str | None = None
    market_data_api_url: str | None = None
    market_data_api_key: str | None = None
    market_data_timeout_seconds: int = 10
    market_data_stale_after_seconds: int = 900
    fingerprint_feature_version: str = "v1"
    llm_api_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "configured-model"
    llm_timeout_seconds: int = 8

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
