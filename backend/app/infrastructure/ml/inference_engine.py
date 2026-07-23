"""Torch inference engine implementing the :class:`InferenceEngine` port.

Composes a registry-selected :class:`Classifier`, preprocessing, Grad-CAM and the
OOD guard. The model is loaded lazily (once) and all heavy compute runs in a
threadpool so the event loop is never blocked (see ``docs/11_Model_Inference.md``).
"""

from __future__ import annotations

import asyncio
import threading
from pathlib import Path

import torch
from torch.nn.functional import softmax

from app.core.config import Settings
from app.core.logging import get_logger
from app.domain.ports.inference import InferenceEngine
from app.domain.value_objects.inference_result import GradCamArtifacts, InferenceOutput
from app.infrastructure.ml.classifier.base import Classifier
from app.infrastructure.ml.gradcam import GradCAM, render_gradcam
from app.infrastructure.ml.ood import is_out_of_distribution
from app.infrastructure.ml.preprocessing import preprocess

logger = get_logger(__name__)


class TorchInferenceEngine(InferenceEngine):
    """Runs pneumonia classification + Grad-CAM for one selected architecture."""

    def __init__(
        self, classifier: Classifier, settings: Settings, *, pretrained: bool = True
    ) -> None:
        self._classifier = classifier
        self._settings = settings
        self._pretrained = pretrained
        self._device = torch.device("cpu")
        self._model: torch.nn.Module | None = None
        self._model_version = "uninitialised"
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Model loading (lazy, thread-safe, idempotent)
    # ------------------------------------------------------------------ #
    def _ensure_model(self) -> torch.nn.Module:
        """Build the model once, loading checkpoint weights when present."""
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is not None:  # re-check inside the lock
                return self._model
            model = self._classifier.build(pretrained=self._pretrained)
            source = "imagenet-pretrained" if self._pretrained else "random-init"
            checkpoint = Path(self._settings.model_path)
            if checkpoint.exists():
                state = torch.load(checkpoint, map_location=self._device, weights_only=True)
                model.load_state_dict(state)
                source = "checkpoint"
                logger.info("inference.weights.loaded", path=str(checkpoint))
            else:
                logger.warning(
                    "inference.weights.fallback",
                    detail="MODEL_PATH not found; using pretrained backbone.",
                    path=str(checkpoint),
                )
            model.to(self._device)
            model.eval()
            self._model = model
            self._model_version = f"{self._classifier.arch}:{source}"
        return self._model

    def warmup(self) -> None:
        """Eagerly build/load the model so the first request is not penalised."""
        self._ensure_model()

    # ------------------------------------------------------------------ #
    # Inference (runs off the event loop)
    # ------------------------------------------------------------------ #
    async def predict(self, image_bytes: bytes) -> InferenceOutput:
        """Classify an image with Grad-CAM, executed in a worker thread."""
        return await asyncio.to_thread(self._predict_sync, image_bytes)

    def _predict_sync(self, image_bytes: bytes) -> InferenceOutput:
        """Synchronous inference + explainability pipeline."""
        model = self._ensure_model()
        input_tensor, rgb_uint8 = preprocess(image_bytes)
        input_tensor = input_tensor.to(self._device)

        with torch.no_grad():
            logits = model(input_tensor)
            probs = softmax(logits, dim=1)[0]

        class_idx = int(torch.argmax(probs).item())
        confidence = float(probs[class_idx].item())
        class_names = self._classifier.class_names
        probabilities = {
            class_names[i]: round(float(probs[i].item()), 6) for i in range(len(class_names))
        }

        with GradCAM(model, self._classifier.target_layer(model)) as cam:
            heatmap = cam.generate(input_tensor, class_idx)
        original_png, heatmap_png, overlay_png = render_gradcam(rgb_uint8, heatmap)

        ood = is_out_of_distribution(rgb_uint8, confidence)

        return InferenceOutput(
            predicted_class=class_names[class_idx],
            confidence=round(confidence, 6),
            probabilities=probabilities,
            is_ood=ood,
            model_arch=self._classifier.arch,
            model_version=self._model_version,
            gradcam=GradCamArtifacts(
                original_png=original_png,
                heatmap_png=heatmap_png,
                overlay_png=overlay_png,
            ),
        )
