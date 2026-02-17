from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    db_url: str = "sqlite:///./app.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_issuer: str = "current-state-doc-tool"
    jwt_ttl_minutes: int = 60 * 12

    otel_enabled: bool = False
    otel_service_name: str = "current-state-doc-tool"

    admin_email: str | None = None
    admin_password: str | None = None


settings = Settings()  # type: ignore[arg-type]
