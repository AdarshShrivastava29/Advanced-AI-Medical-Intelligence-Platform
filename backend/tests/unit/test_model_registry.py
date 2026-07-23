"""Unit tests for the model registry and the ``MODEL_ARCH`` factory."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.infrastructure.ml.classifier.registry import available_archs, get_classifier


def _settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "_env_file": None,
        "llm_provider": "mock",
        "embedding_provider": "sentence_transformer",
        "jwt_secret": "x" * 40,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_registry_lists_both_architectures() -> None:
    assert set(available_archs()) == {"densenet121", "efficientnet_b0"}


def test_get_densenet() -> None:
    classifier = get_classifier(_settings(model_arch="densenet121"))
    assert classifier.arch == "densenet121"
    assert classifier.class_names == ["NORMAL", "PNEUMONIA"]


def test_get_efficientnet() -> None:
    classifier = get_classifier(_settings(model_arch="efficientnet_b0"))
    assert classifier.arch == "efficientnet_b0"


def test_unregistered_arch_raises() -> None:
    settings = _settings()
    object.__setattr__(settings, "model_arch", "resnet50")
    with pytest.raises(ConfigurationError):
        get_classifier(settings)
