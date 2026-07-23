"""Chat (knowledge assistant) request/response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.chat import ChatMessage
from app.domain.value_objects.rag import ChatAnswer, Citation


class ChatRequest(BaseModel):
    """A user message to the knowledge assistant."""

    message: str = Field(min_length=1, max_length=2000, description="The user's question.")
    session_id: str | None = Field(default=None, description="Optional conversation id.")


class CitationSchema(BaseModel):
    """A source reference backing a grounded answer."""

    index: int
    document_id: str
    filename: str
    chunk_id: str
    page: int
    score: float
    snippet: str


class ChatResponse(BaseModel):
    """The assistant's grounded answer with citations."""

    answer: str
    grounded: bool
    citations: list[CitationSchema] = Field(default_factory=list)
    message_id: str


class ChatMessageSchema(BaseModel):
    """A stored chat message for history."""

    id: str
    role: str
    message: str
    grounded: bool
    citations: list[dict] = Field(default_factory=list)
    created_at: datetime


def _citation(citation: Citation) -> CitationSchema:
    return CitationSchema(
        index=citation.index,
        document_id=citation.document_id,
        filename=citation.filename,
        chunk_id=citation.chunk_id,
        page=citation.page,
        score=citation.score,
        snippet=citation.snippet,
    )


def to_chat_response(answer: ChatAnswer, message_id: str) -> ChatResponse:
    """Map a :class:`ChatAnswer` to the API response schema."""
    return ChatResponse(
        answer=answer.answer,
        grounded=answer.grounded,
        citations=[_citation(c) for c in answer.citations],
        message_id=message_id,
    )


def to_chat_message(message: ChatMessage) -> ChatMessageSchema:
    """Map a stored :class:`ChatMessage` to its response schema."""
    return ChatMessageSchema(
        id=message.id or "",
        role=message.role.value,
        message=message.message,
        grounded=message.grounded,
        citations=message.citations,
        created_at=message.created_at,
    )
