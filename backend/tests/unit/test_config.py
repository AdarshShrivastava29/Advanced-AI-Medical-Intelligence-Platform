"""Unit tests for configuration validation (fail-fast provider/key checks)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.core.config import Settings


def _base(**overrides: object) -> Settings:
    """Construct Settings ignoring any local .env, with test-friendly defaults."""
    defaults: dict[str, object] = {
        "_env_file": None,
        "llm_provider": "mock",
        "embedding_provider": "sentence_transformer",
        "jwt_secret": "x" * 40,
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


def test_mock_providers_require_no_keys() -> None:
    settings = _base()
    assert settings.llm_provider == "mock"
    assert settings.cors_origin_list == ["http://localhost:5173"]


def test_openai_llm_without_key_fails_fast() -> None:
    with pytest.raises(PydanticValidationError):
        _base(llm_provider="openai", openai_api_key="")


def test_openai_llm_with_key_is_valid() -> None:
    settings = _base(llm_provider="openai", openai_api_key="sk-test")
    assert settings.llm_provider == "openai"


def test_production_requires_strong_jwt_secret() -> None:
    with pytest.raises(PydanticValidationError):
        _base(env="production", jwt_secret="change-me")


def test_invalid_log_level_rejected() -> None:
    with pytest.raises(PydanticValidationError):
        _base(log_level="LOUD")


def test_allowed_image_type_set_parsed() -> None:
    settings = _base(allowed_image_types="image/png, image/jpeg")
    assert settings.allowed_image_type_set == {"image/png", "image/jpeg"}
