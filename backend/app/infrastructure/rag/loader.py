"""PDF loading and per-page text extraction (PyMuPDF) with OCR fallback."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.exceptions import ValidationError
from app.core.logging import get_logger
from app.infrastructure.rag.ocr import OCR_MIN_CHARS, ocr_page
from app.infrastructure.rag.text_processing import clean_text

logger = get_logger(__name__)


@dataclass(frozen=True)
class PageText:
    """Cleaned text extracted from a single PDF page (1-indexed)."""

    page_number: int
    text: str


@dataclass(frozen=True)
class LoadedDocument:
    """The result of loading a PDF: page count, title and per-page text."""

    page_count: int
    title: str
    pages: list[PageText]


def load_pdf(raw_bytes: bytes, *, fallback_title: str) -> LoadedDocument:
    """Extract cleaned, per-page text from a PDF, OCR-ing scanned pages.

    Raises:
        ValidationError: If the bytes cannot be opened as a PDF.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:  # pragma: no cover - RAG dependency
        raise ValidationError("PyMuPDF is not installed; cannot process PDFs.") from exc

    try:
        doc = fitz.open(stream=raw_bytes, filetype="pdf")
    except Exception as exc:
        raise ValidationError("Uploaded file is not a valid PDF.") from exc

    pages: list[PageText] = []
    try:
        for index in range(doc.page_count):
            page = doc.load_page(index)
            text = page.get_text("text")
            if len(text.strip()) < OCR_MIN_CHARS:
                ocr_text = ocr_page(page)
                if ocr_text:
                    logger.info("loader.ocr_used", page=index + 1)
                    text = ocr_text
            cleaned = clean_text(text)
            if cleaned:
                pages.append(PageText(page_number=index + 1, text=cleaned))
        title = (doc.metadata or {}).get("title") or fallback_title
        page_count = doc.page_count
    finally:
        doc.close()

    return LoadedDocument(page_count=page_count, title=title, pages=pages)
