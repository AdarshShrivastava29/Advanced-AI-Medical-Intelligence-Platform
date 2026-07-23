"""Model registry + ``MODEL_ARCH`` factory.

The registry maps an architecture key to its :class:`Classifier` adapter. Adding
a new model is a two-line change: implement a ``Classifier`` subclass and call
:func:`register_classifier` — no factory or business-logic edits. This is the
Registry + Factory pattern from ``docs/09_AI_Architecture.md``.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.infrastructure.ml.classifier.base import Classifier
from app.infrastructure.ml.classifier.densenet import DenseNet121Classifier
from app.infrastructure.ml.classifier.efficientnet import EfficientNetB0Classifier

# Architecture key -> Classifier adapter class.
MODEL_REGISTRY: dict[str, type[Classifier]] = {}


def register_classifier(cls: type[Classifier]) -> type[Classifier]:
    """Register a :class:`Classifier` adapter under its ``arch`` key."""
    MODEL_REGISTRY[cls.arch] = cls
    return cls


def available_archs() -> list[str]:
    """Return the sorted list of registered architecture keys."""
    return sorted(MODEL_REGISTRY)


def get_classifier(settings: Settings) -> Classifier:
    """Return the :class:`Classifier` selected by ``settings.model_arch``.

    Raises:
        ConfigurationError: If ``MODEL_ARCH`` names an unregistered architecture.
    """
    arch = settings.model_arch
    cls = MODEL_REGISTRY.get(arch)
    if cls is None:
        raise ConfigurationError(
            f"Unsupported MODEL_ARCH: {arch!r}. Registered: {available_archs()}"
        )
    return cls()


# Register the built-in architectures.
register_classifier(DenseNet121Classifier)
register_classifier(EfficientNetB0Classifier)
