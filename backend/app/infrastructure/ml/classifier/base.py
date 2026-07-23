"""The ``Classifier`` abstraction shared by every architecture adapter.

A concrete classifier knows how to (a) build its backbone with a 2-class head for
chest-X-ray pneumonia detection and (b) expose the convolutional ``target_layer``
Grad-CAM hooks into. New architectures are added by subclassing and registering —
no other code changes (see ``docs/09_AI_Architecture.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from torch import nn

# The canonical class order for the pneumonia task (index 0 = NORMAL).
CLASS_NAMES: list[str] = ["NORMAL", "PNEUMONIA"]


class Classifier(ABC):
    """Abstract base for a transfer-learning image classifier."""

    #: Stable architecture key matching the ``MODEL_ARCH`` selector.
    arch: str = "abstract"
    #: Number of output classes.
    num_classes: int = len(CLASS_NAMES)
    #: Human-readable class labels aligned to output indices.
    class_names: list[str] = CLASS_NAMES

    @abstractmethod
    def build(self, *, pretrained: bool = True) -> nn.Module:
        """Construct the backbone with a fresh ``num_classes`` head.

        Args:
            pretrained: Load ImageNet-pretrained backbone weights when True
                (the transfer-learning / inference-fallback path); random init
                otherwise (used by fast tests).
        """

    @abstractmethod
    def target_layer(self, model: nn.Module) -> nn.Module:
        """Return the convolutional feature module Grad-CAM should hook."""
