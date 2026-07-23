"""Context compression and citation assembly for grounded generation."""

from __future__ import annotations

from app.domain.value_objects.rag import Citation, RetrievedChunk
from app.infrastructure.rag.text_processing import sanitise_for_prompt

_SNIPPET_CHARS = 220


def compress_context(
    chunks: list[RetrievedChunk], *, max_chars: int
) -> list[RetrievedChunk]:
    """Keep the highest-ranked chunks that fit within ``max_chars`` total."""
    selected: list[RetrievedChunk] = []
    budget = 0
    for chunk in chunks:
        length = min(len(chunk.text), _MAX_CHUNK_CHARS)
        if budget + length > max_chars and selected:
            break
        selected.append(chunk)
        budget += length
    return selected


_MAX_CHUNK_CHARS = 1200


def format_context(chunks: list[RetrievedChunk]) -> str:
    """Render numbered, sanitised context blocks for the prompt."""
    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        safe = sanitise_for_prompt(chunk.text, max_chars=_MAX_CHUNK_CHARS)
        blocks.append(f"[{index}] (source: {chunk.filename}, page {chunk.page})\n{safe}")
    return "\n\n".join(blocks)


def build_citations(chunks: list[RetrievedChunk]) -> list[Citation]:
    """Build ordered citations aligned to the numbered context blocks."""
    return [
        Citation(
            index=index,
            document_id=chunk.document_id,
            filename=chunk.filename,
            chunk_id=chunk.chunk_id,
            page=chunk.page,
            score=chunk.score,
            snippet=chunk.text[:_SNIPPET_CHARS].strip(),
        )
        for index, chunk in enumerate(chunks, start=1)
    ]
