"""Shared test helpers: synthetic image generation."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image


def make_png(*, colorful: bool = False, size: int = 64) -> bytes:
    """Return deterministic PNG bytes.

    Args:
        colorful: When True, produce a strongly chromatic image (triggers the OOD
            guard); otherwise a greyscale chest-X-ray-like image.
        size: Square image side length.
    """
    if colorful:
        arr = np.zeros((size, size, 3), dtype=np.uint8)
        arr[..., 0] = 220  # strong red
        arr[..., 1] = 20
        arr[..., 2] = 20
    else:
        gray = np.tile(np.linspace(40, 210, size, dtype=np.uint8), (size, 1))
        arr = np.stack([gray, gray, gray], axis=-1)
    buffer = io.BytesIO()
    Image.fromarray(arr).save(buffer, format="PNG")
    return buffer.getvalue()


def make_pdf(text: str, *, pages: int = 1) -> bytes:
    """Return a minimal valid PDF containing ``text`` on each page (PyMuPDF)."""
    import fitz

    doc = fitz.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_text((72, 72), text, fontsize=11)
    data: bytes = doc.tobytes()
    doc.close()
    return data
