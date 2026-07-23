"""Factory building the :class:`InferenceEngine` for the selected ``MODEL_ARCH``.

Switching ``MODEL_ARCH=densenet121`` to ``efficientnet_b0`` changes only the
classifier the registry returns — the engine and all callers are unchanged
(see ``docs/09_AI_Architecture.md``).
"""

from __future__ import annotations

from app.core.config import Settings
from app.domain.ports.inference import InferenceEngine
from app.infrastructure.ml.classifier.registry import get_classifier
from app.infrastructure.ml.inference_engine import TorchInferenceEngine


def get_inference_engine(settings: Settings) -> InferenceEngine:
    """Return the ENV-selected :class:`InferenceEngine`."""
    classifier = get_classifier(settings)
    return TorchInferenceEngine(classifier, settings)
