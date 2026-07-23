"""Chat service — grounded Q&A over the medical knowledge base.

Delegates retrieval + generation to the :class:`RagEngine` port (which owns the
provider abstractions) and persists the conversation. The assistant answer is
whatever the engine returns — grounded with citations, or a graceful refusal
(see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

from dataclasses import asdict

from app.core.logging import get_logger
from app.domain.entities.chat import ChatMessage, MessageRole
from app.domain.ports.rag import RagEngine
from app.domain.ports.repositories import ChatMessageRepository
from app.domain.value_objects.rag import ChatAnswer

logger = get_logger(__name__)


class ChatService:
    """Coordinates grounded chat turns and conversation history."""

    def __init__(
        self, rag_engine: RagEngine, chat_repository: ChatMessageRepository
    ) -> None:
        self._rag = rag_engine
        self._chat = chat_repository

    async def ask(
        self, *, user_id: str, message: str, session_id: str | None = None
    ) -> tuple[ChatAnswer, ChatMessage]:
        """Answer a user message using only the knowledge base, persisting both turns."""
        session = session_id or user_id
        await self._chat.add(
            ChatMessage(
                session_id=session, user_id=user_id, role=MessageRole.USER, message=message
            )
        )
        answer: ChatAnswer = await self._rag.answer(message)
        assistant = await self._chat.add(
            ChatMessage(
                session_id=session,
                user_id=user_id,
                role=MessageRole.ASSISTANT,
                message=answer.answer,
                citations=[asdict(c) for c in answer.citations],
                grounded=answer.grounded,
            )
        )
        logger.info("chat.answered", user_id=user_id, grounded=answer.grounded)
        return answer, assistant

    async def history(self, user_id: str, *, limit: int = 100) -> list[ChatMessage]:
        """Return the user's chat history in chronological order."""
        return await self._chat.list_for_user(user_id, limit=limit)

    async def clear(self, user_id: str) -> int:
        """Delete the user's chat history; return the number of messages removed."""
        return await self._chat.delete_for_user(user_id)
