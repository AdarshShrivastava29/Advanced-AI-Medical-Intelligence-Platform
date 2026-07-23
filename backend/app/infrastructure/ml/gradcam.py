"""Grad-CAM explainability: heatmap computation and image rendering.

Registers forward/backward hooks on the classifier's ``target_layer`` to obtain
class-discriminative localisation maps, then renders the original, heatmap and
overlay images as PNG bytes (see ``docs/12_GradCAM.md``).
"""

from __future__ import annotations

from types import TracebackType

import cv2
import numpy as np
import torch
from torch import nn

from app.infrastructure.ml.preprocessing import IMAGE_SIZE

_OVERLAY_ALPHA = 0.40
_EPS = 1e-8


class GradCAM:
    """Computes a Grad-CAM heatmap for a model's convolutional ``target_layer``.

    Use as a context manager so the hooks are always removed::

        with GradCAM(model, layer) as cam:
            heatmap = cam.generate(input_tensor, class_idx)
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module) -> None:
        self._model = model
        self._activations: torch.Tensor | None = None
        self._gradients: torch.Tensor | None = None
        self._fwd_handle = target_layer.register_forward_hook(self._save_activation)
        self._bwd_handle = target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, _: nn.Module, __: object, output: torch.Tensor) -> None:
        self._activations = output.detach()

    def _save_gradient(
        self,
        _: nn.Module,
        __: tuple[torch.Tensor, ...] | torch.Tensor,
        grad_output: tuple[torch.Tensor, ...] | torch.Tensor,
    ) -> None:
        grad = grad_output[0] if isinstance(grad_output, tuple) else grad_output
        self._gradients = grad.detach()

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """Return a normalised ``[H, W]`` heatmap in ``[0, 1]`` for ``class_idx``."""
        self._model.zero_grad()
        with torch.enable_grad():
            logits = self._model(input_tensor)
            score = logits[0, class_idx]
            score.backward()

        if self._activations is None or self._gradients is None:  # pragma: no cover
            raise RuntimeError("Grad-CAM hooks did not capture activations/gradients.")

        activations = self._activations[0]
        gradients = self._gradients[0]
        weights = gradients.mean(dim=(1, 2))
        cam = torch.relu((weights[:, None, None] * activations).sum(dim=0))
        cam = cam / (cam.max() + _EPS)
        return cam.cpu().numpy().astype(np.float32)

    def close(self) -> None:
        """Remove the registered hooks."""
        self._fwd_handle.remove()
        self._bwd_handle.remove()

    def __enter__(self) -> GradCAM:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.close()


def _encode_png(rgb_uint8: np.ndarray) -> bytes:
    """Encode an RGB uint8 array to PNG bytes."""
    bgr = cv2.cvtColor(rgb_uint8, cv2.COLOR_RGB2BGR)
    ok, buffer = cv2.imencode(".png", bgr)
    if not ok:  # pragma: no cover - encoding failure is not expected
        raise RuntimeError("Failed to encode PNG image.")
    return buffer.tobytes()


def render_gradcam(rgb_uint8: np.ndarray, heatmap: np.ndarray) -> tuple[bytes, bytes, bytes]:
    """Render ``(original_png, heatmap_png, overlay_png)`` from an image + heatmap.

    Args:
        rgb_uint8: The 224x224 RGB image the model saw.
        heatmap: A ``[H, W]`` map in ``[0, 1]`` from :meth:`GradCAM.generate`.
    """
    cam_resized = cv2.resize(heatmap, (IMAGE_SIZE, IMAGE_SIZE))
    cam_uint8 = (255 * cam_resized).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
    overlay_rgb = cv2.addWeighted(
        rgb_uint8, 1 - _OVERLAY_ALPHA, heatmap_rgb, _OVERLAY_ALPHA, 0
    )
    return _encode_png(rgb_uint8), _encode_png(heatmap_rgb), _encode_png(overlay_rgb)
