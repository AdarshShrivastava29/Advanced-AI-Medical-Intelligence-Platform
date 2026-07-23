"""Classifier abstraction, concrete architectures, and the model registry."""

from app.infrastructure.ml.classifier.base import CLASS_NAMES, Classifier
from app.infrastructure.ml.classifier.registry import (
    available_archs,
    get_classifier,
    register_classifier,
)

__all__ = [
    "CLASS_NAMES",
    "Classifier",
    "available_archs",
    "get_classifier",
    "register_classifier",
]
