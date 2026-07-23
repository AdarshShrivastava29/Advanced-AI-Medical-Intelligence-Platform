"""Chat entities — conversation sessions and messages for the RAG assistant."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


def _utcnow() -> datetime:
    """Return the current timezone-aware UTC time."""
    return datetime.now(UTC)


class MessageRole(str, Enum):
    """Author of a chat message."""

    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class ChatSession:
    """A conversation thread (``chat_sessions`` collection)."""

    user_id: str
    title: str
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


@dataclass
class ChatMessage:
    """A single message in a session (``chat_history`` collection).

    ``citations`` is a list of source references (dicts) for assistant messages.
    """

    session_id: str
    user_id: str
    role: MessageRole
    message: str
    citations: list[dict] = field(default_factory=list)
    grounded: bool = True
    id: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
