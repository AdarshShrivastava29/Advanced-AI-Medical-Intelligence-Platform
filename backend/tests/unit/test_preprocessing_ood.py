"""Unit tests for preprocessing, OOD detection and upload validation."""

from __future__ import annotations

import numpy as np
import pytest

from app.application.services.image_validation import validate_image_upload
from app.core.config import Settings
from app.core.exceptions import ValidationError
from app.infrastructure.ml.ood import colorfulness, is_out_of_distribution
from app.infrastructure.ml.preprocessing import decode_image, preprocess
from tests.helpers import make_png


def _settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "_env_file": None,
        "llm_provider": "mock",
        "embedding_provider": "sentence_transformer",
        "jwt_secret": "x" * 40,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_preprocess_shapes() -> None:
    tensor, rgb = preprocess(make_png())
    assert tuple(tensor.shape) == (1, 3, 224, 224)
    assert rgb.shape == (224, 224, 3)
    assert rgb.dtype == np.uint8


def test_decode_invalid_image_raises() -> None:
    with pytest.raises(ValidationError):
        decode_image(b"this is not an image")


def test_colorfulness_greyscale_is_low() -> None:
    _, grey = preprocess(make_png(colorful=False))
    _, colour = preprocess(make_png(colorful=True))
    assert colorfulness(grey) < colorfulness(colour)


def test_ood_flags_colourful_image() -> None:
    _, colour = preprocess(make_png(colorful=True))
    assert is_out_of_distribution(colour, confidence=0.99) is True


def test_ood_passes_greyscale_high_confidence() -> None:
    _, grey = preprocess(make_png(colorful=False))
    assert is_out_of_distribution(grey, confidence=0.99) is False


def test_ood_flags_low_confidence() -> None:
    _, grey = preprocess(make_png(colorful=False))
    assert is_out_of_distribution(grey, confidence=0.4) is True


def test_validate_accepts_png() -> None:
    assert validate_image_upload(make_png(), "image/png", _settings()) == "image/png"


def test_validate_rejects_empty() -> None:
    with pytest.raises(ValidationError):
        validate_image_upload(b"", "image/png", _settings())


def test_validate_rejects_oversize() -> None:
    with pytest.raises(ValidationError):
        validate_image_upload(make_png(), "image/png", _settings(max_upload_size=10))


def test_validate_rejects_disallowed_type() -> None:
    with pytest.raises(ValidationError):
        validate_image_upload(make_png(), "image/gif", _settings())


def test_validate_rejects_content_mismatch() -> None:
    # PNG bytes declared as JPEG.
    with pytest.raises(ValidationError):
        validate_image_upload(make_png(), "image/jpeg", _settings())


def test_validate_rejects_non_image_bytes() -> None:
    with pytest.raises(ValidationError):
        validate_image_upload(b"plain text pretending", "image/png", _settings())
