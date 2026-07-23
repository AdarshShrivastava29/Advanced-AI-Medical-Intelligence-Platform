"""Image preprocessing for inference.

Decodes uploaded bytes, resizes to the model input size, applies ImageNet
normalisation and returns both the model tensor and a 224x224 RGB uint8 array
reused for the Grad-CAM overlay (see ``docs/11_Model_Inference.md``).
"""

from __future__ import annotations

import io

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError

from app.core.exceptions import ValidationError

IMAGE_SIZE = 224
_IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
_IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)


def decode_image(image_bytes: bytes) -> Image.Image:
    """Decode raw bytes into an RGB :class:`PIL.Image`.

    Raises:
        ValidationError: If the bytes are not a decodable image.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("Uploaded file is not a valid image.") from exc
    return image.convert("RGB")


def preprocess(image_bytes: bytes) -> tuple[torch.Tensor, np.ndarray]:
    """Return ``(input_tensor[1,3,224,224], rgb_uint8[224,224,3])``.

    The tensor is normalised for the model; the uint8 array is the plain resized
    image used as the Grad-CAM overlay base.
    """
    image = decode_image(image_bytes).resize(
        (IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.BILINEAR
    )
    # np.array (not asarray) yields a writable, contiguous copy for torch/cv2.
    rgb_uint8 = np.array(image, dtype=np.uint8)
    tensor = torch.from_numpy(rgb_uint8).float().permute(2, 0, 1) / 255.0
    tensor = (tensor - _IMAGENET_MEAN) / _IMAGENET_STD
    return tensor.unsqueeze(0), rgb_uint8
