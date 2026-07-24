"""Application configuration.

A single, immutable :class:`Settings` object is the source of truth for every
runtime parameter. Values are read from environment variables (and an optional
``.env`` file) — nothing is hardcoded in business logic. The settings object is
validated *fail-fast* at import/startup so that an inconsistent environment
(for example ``LLM_PROVIDER=openai`` with no ``OPENAI_API_KEY``) aborts the
process with a clear message rather than failing deep inside a request.

See ``docs/31_Environment_Configuration.md`` for the canonical variable table.
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Deployment environment."""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Strongly-typed, validated application settings.

    Attributes mirror the canonical environment variables. Provider *selectors*
    (``llm_provider`` etc.) choose which adapter a factory builds; keys are only
    required for the selected network providers.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    env: Environment = Environment.DEVELOPMENT
    log_level: str = "INFO"
    log_json: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    # --- Production hardening ---
    allowed_hosts: str = "*"  # comma-separated; "*" disables host filtering
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 120
    max_request_bytes: int = 15_728_640  # 15 MB hard cap on request bodies
    gzip_min_bytes: int = 1024
    metrics_enabled: bool = True
    warmup_on_startup: bool = False  # eagerly warm model + vector index at boot

    # --- Provider selectors ---
    llm_provider: Literal["openai", "gemini", "mock"] = "openai"
    embedding_provider: Literal["openai", "gemini", "sentence_transformer"] = "openai"
    vector_db: Literal["faiss", "chroma", "pinecone"] = "faiss"
    model_arch: Literal["densenet121", "efficientnet_b0"] = "densenet121"
    auth_provider: Literal["jwt"] = "jwt"
    storage_provider: Literal["mongodb"] = "mongodb"
    cache_provider: Literal["memory", "redis"] = "memory"
    task_queue: Literal["inprocess", "celery"] = "inprocess"

    # --- Provider keys / models ---
    openai_api_key: str = ""
    gemini_api_key: str = ""
    pinecone_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # --- Data stores ---
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "aimip"
    redis_url: str = "redis://localhost:6379/0"

    # --- Auth / security ---
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    max_login_attempts: int = 5
    lockout_minutes: int = 15

    # --- ML / storage paths ---
    model_path: str = "./data/weights/model.pt"
    upload_path: str = "./data/uploads"
    gradcam_path: str = "./data/gradcam"
    vector_index_path: str = "./data/vector_index"
    pdf_path: str = "./data/pdfs"
    max_upload_size: int = 10_485_760
    allowed_image_types: str = "image/png,image/jpeg"

    # --- RAG ---
    rag_top_k: int = 5
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 120
    rag_min_score: float = 0.2

    # ------------------------------------------------------------------ #
    # Derived helpers
    # ------------------------------------------------------------------ #
    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins as a clean list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def allowed_host_list(self) -> list[str]:
        """Trusted hosts as a list (``['*']`` disables filtering)."""
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()] or ["*"]

    @property
    def allowed_image_type_set(self) -> set[str]:
        """Allowed upload MIME types as a set."""
        return {t.strip() for t in self.allowed_image_types.split(",") if t.strip()}

    @property
    def is_production(self) -> bool:
        """True when running in the production environment."""
        return self.env is Environment.PRODUCTION

    # ------------------------------------------------------------------ #
    # Validation (fail-fast)
    # ------------------------------------------------------------------ #
    @field_validator("log_level")
    @classmethod
    def _validate_log_level(cls, value: str) -> str:
        """Ensure the log level is a recognised name."""
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = value.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {sorted(allowed)}, got {value!r}")
        return upper

    @model_validator(mode="after")
    def _validate_provider_keys(self) -> Settings:
        """Require credentials/consistency for the *selected* providers only."""
        if self.llm_provider == "openai" and not self.openai_api_key:
            raise ValueError("LLM_PROVIDER=openai requires OPENAI_API_KEY to be set.")
        if self.llm_provider == "gemini" and not self.gemini_api_key:
            raise ValueError("LLM_PROVIDER=gemini requires GEMINI_API_KEY to be set.")
        if self.embedding_provider == "openai" and not self.openai_api_key:
            raise ValueError("EMBEDDING_PROVIDER=openai requires OPENAI_API_KEY to be set.")
        if self.embedding_provider == "gemini" and not self.gemini_api_key:
            raise ValueError("EMBEDDING_PROVIDER=gemini requires GEMINI_API_KEY to be set.")
        if self.vector_db == "pinecone" and not self.pinecone_api_key:
            raise ValueError("VECTOR_DB=pinecone requires PINECONE_API_KEY to be set.")
        if self.cache_provider == "redis" and not self.redis_url:
            raise ValueError("CACHE_PROVIDER=redis requires REDIS_URL to be set.")
        if self.is_production and self.jwt_secret in {"", "change-me"}:
            raise ValueError("A strong JWT_SECRET must be set in production.")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached, validated singleton :class:`Settings`.

    Cached so the ``.env`` file and environment are parsed exactly once. Used as
    the FastAPI dependency and by the composition root.
    """
    return Settings()
