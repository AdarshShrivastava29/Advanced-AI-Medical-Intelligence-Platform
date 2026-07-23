"""Out-of-distribution (OOD) detection for uploaded images.

Chest X-rays are effectively greyscale, so a strongly *chromatic* image is very
likely not a CXR. This lightweight, deterministic heuristic flags such inputs
(and very low-confidence predictions) so the report can advise caution. It is a
safety guard, not a trained OOD model — see ``docs/11_Model_Inference.md``.
"""

from __future__ import annotations

import numpy as np

# Mean per-pixel colour spread (0-255) above which an image is "too colourful"
# to be a chest X-ray.
_COLORFULNESS_THRESHOLD = 22.0
# Max-class confidence below which a result is considered uncertain.
_MIN_CONFIDENCE = 0.55


def colorfulness(rgb_uint8: np.ndarray) -> float:
    """Return the mean per-pixel standard deviation across RGB channels."""
    channels = rgb_uint8.astype(np.float32)
    return float(channels.std(axis=2).mean())


def is_out_of_distribution(rgb_uint8: np.ndarray, confidence: float) -> bool:
    """Return True if the image looks non-CXR or the prediction is low-confidence.

    Args:
        rgb_uint8: The resized RGB image array.
        confidence: The model's max-class probability.
    """
    if colorfulness(rgb_uint8) > _COLORFULNESS_THRESHOLD:
        return True
    return confidence < _MIN_CONFIDENCE
