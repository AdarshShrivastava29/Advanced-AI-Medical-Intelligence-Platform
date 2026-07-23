"""Optional OCR fallback for scanned PDF pages.

Uses ``pytesseract`` (+ the Tesseract binary) when available; if it is not
installed the fallback degrades gracefully to an empty string and logs a warning
rather than failing ingestion (see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

from app.core.logging import get_logger

logger = get_logger(__name__)

# A page with fewer than this many extracted characters is treated as "scanned".
OCR_MIN_CHARS = 20

_ocr_available: bool | None = None


def ocr_available() -> bool:
    """Return True if pytesseract + a Tesseract binary are usable."""
    global _ocr_available
    if _ocr_available is None:
        try:
            import pytesseract

            pytesseract.get_tesseract_version()
            _ocr_available = True
        except Exception:
            _ocr_available = False
    return _ocr_available


def ocr_page(page: object) -> str:
    """Return OCR text for a PyMuPDF page, or empty string if OCR is unavailable.

    Args:
        page: A ``fitz.Page`` instance.
    """
    if not ocr_available():
        logger.warning("ocr.unavailable", detail="Scanned page skipped; install Tesseract for OCR.")
        return ""
    try:
        import io

        import pytesseract
        from PIL import Image

        pixmap = page.get_pixmap(dpi=200)  # type: ignore[attr-defined]
        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
        return str(pytesseract.image_to_string(image))
    except Exception:
        logger.exception("ocr.failed")
        return ""
