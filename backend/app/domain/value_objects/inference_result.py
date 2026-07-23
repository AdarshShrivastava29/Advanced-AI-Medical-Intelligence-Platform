"""Framework-agnostic value objects describing an inference result.

These carry the model output and the Grad-CAM image bytes across the port
boundary without exposing any torch/numpy types to the application layer.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GradCamArtifacts:
    """The three Grad-CAM PNG images produced for an explanation."""

    original_png: bytes
    heatmap_png: bytes
    overlay_png: bytes


@dataclass(frozen=True)
class InferenceOutput:
    """The complete result of running the model on one image.

    Attributes:
        predicted_class: The winning class label (e.g. ``"PNEUMONIA"``).
        confidence: Softmax probability of the winning class in ``[0, 1]``.
        probabilities: Full class -> probability mapping.
        is_ood: True if the input was flagged out-of-distribution (non-CXR).
        model_arch: The architecture that produced this result.
        model_version: The model version/identifier used.
        gradcam: The Grad-CAM image artifacts.
    """

    predicted_class: str
    confidence: float
    probabilities: dict[str, float]
    is_ood: bool
    model_arch: str
    model_version: str
    gradcam: GradCamArtifacts
