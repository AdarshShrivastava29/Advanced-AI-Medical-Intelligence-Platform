"""Image transforms and augmentation for training and evaluation.

Evaluation transforms mirror the inference preprocessing (resize to the model
input size + ImageNet normalisation) so a trained checkpoint behaves identically
at serving time (see ``app/infrastructure/ml/preprocessing.py``).
"""

from __future__ import annotations

from torchvision import transforms

_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]


def build_train_transforms(image_size: int) -> transforms.Compose:
    """Return the augmentation pipeline used during training."""
    return transforms.Compose(
        [
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize((image_size + 32, image_size + 32)),
            transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=10),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize(_IMAGENET_MEAN, _IMAGENET_STD),
        ]
    )


def build_eval_transforms(image_size: int) -> transforms.Compose:
    """Return the deterministic transform used for validation/test/inference."""
    return transforms.Compose(
        [
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(_IMAGENET_MEAN, _IMAGENET_STD),
        ]
    )
