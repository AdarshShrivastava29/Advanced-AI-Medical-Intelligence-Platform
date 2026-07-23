"""Configurable, overlap-aware text chunking.

Splits each page into sentence-aware chunks of ~``chunk_size`` characters with a
``overlap`` character tail carried into the next chunk, preserving the source
page for citations (see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.infrastructure.rag.loader import PageText

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


@dataclass(frozen=True)
class Chunk:
    """A single text chunk with its source page and ordinal index."""

    index: int
    text: str
    page: int


def _split_sentences(text: str) -> list[str]:
    """Split text into sentence-ish units."""
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def _pack_page(
    text: str, page: int, *, chunk_size: int, overlap: int, start_index: int
) -> list[Chunk]:
    """Pack one page's sentences into overlapping chunks."""
    sentences = _split_sentences(text)
    chunks: list[Chunk] = []
    buffer = ""
    index = start_index
    for sentence in sentences:
        candidate = f"{buffer} {sentence}".strip() if buffer else sentence
        if len(candidate) <= chunk_size:
            buffer = candidate
            continue
        if buffer:
            chunks.append(Chunk(index=index, text=buffer, page=page))
            index += 1
            tail = buffer[-overlap:] if overlap > 0 else ""
            buffer = f"{tail} {sentence}".strip()
        else:
            # A single very long sentence — hard-split it.
            for start in range(0, len(sentence), chunk_size):
                piece = sentence[start : start + chunk_size]
                chunks.append(Chunk(index=index, text=piece, page=page))
                index += 1
            buffer = ""
    if buffer:
        chunks.append(Chunk(index=index, text=buffer, page=page))
    return chunks


def chunk_document(
    pages: list[PageText], *, chunk_size: int, overlap: int
) -> list[Chunk]:
    """Chunk every page and return globally-indexed chunks.

    Args:
        pages: Cleaned per-page text.
        chunk_size: Target maximum chunk length in characters.
        overlap: Characters of trailing context carried into the next chunk.
    """
    overlap = max(0, min(overlap, chunk_size // 2))
    chunks: list[Chunk] = []
    for page in pages:
        page_chunks = _pack_page(
            page.text,
            page.page_number,
            chunk_size=chunk_size,
            overlap=overlap,
            start_index=len(chunks),
        )
        chunks.extend(page_chunks)
    # Re-index sequentially so indices are dense and stable.
    return [Chunk(index=i, text=c.text, page=c.page) for i, c in enumerate(chunks)]
