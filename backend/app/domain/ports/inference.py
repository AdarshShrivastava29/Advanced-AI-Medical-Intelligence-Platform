"""Inference engine port (``InferenceEngine``).

The application depends only on this port; the concrete implementation
(torch model + preprocessing + Grad-CAM + OOD guard) lives in
``app.infrastructure.ml`` and is selected/constructed by a factory. This keeps
all ML-framework details out of the application and domain layers
(see ``docs/11_Model_Inference.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.value_objects.inference_result import InferenceOutput


class InferenceEngine(ABC):
    """Port for running image classification with explainability."""

    @abstractmethod
    async def predict(self, image_bytes: bytes) -> InferenceOutput:
        """Classify a single image and return the full result with Grad-CAM.

        Implementations must run heavy compute off the event loop.

        Args:
            image_bytes: The raw uploaded image bytes.
        """

    @abstractmethod
    def warmup(self) -> None:
        """Eagerly load the model so the first request is not penalised."""
