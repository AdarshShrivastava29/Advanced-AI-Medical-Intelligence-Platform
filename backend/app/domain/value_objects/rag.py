"""Value objects for the RAG pipeline (framework-agnostic)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RetrievedChunk:
    """A chunk returned by retrieval with its fused relevance score."""

    chunk_id: str
    document_id: str
    filename: str
    text: str
    page: int
    score: float


@dataclass(frozen=True)
class Citation:
    """A source reference attached to a grounded answer."""

    index: int
    document_id: str
    filename: str
    chunk_id: str
    page: int
    score: float
    snippet: str


@dataclass(frozen=True)
class ChatAnswer:
    """The result of answering a query against the knowledge base."""

    answer: str
    grounded: bool
    citations: list[Citation] = field(default_factory=list)


@dataclass(frozen=True)
class IngestResult:
    """Outcome of ingesting a single document."""

    document_id: str
    chunk_count: int
    pages: int
