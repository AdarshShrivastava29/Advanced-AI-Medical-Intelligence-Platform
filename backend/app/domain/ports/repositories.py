"""Repository ports.

The generic :class:`Repository` captures CRUD common to all aggregates; the
specialised repositories add lookups the services need. Concrete Motor-backed
implementations live in ``app.infrastructure.db`` (Repository pattern —
see ``docs/07_Backend_Architecture.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from app.domain.entities.chat import ChatMessage
from app.domain.entities.document import Document
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.entities.prediction import Prediction
from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.report import Report
from app.domain.entities.user import User

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """Generic persistence port for an aggregate of type ``T``."""

    @abstractmethod
    async def create(self, entity: T) -> T:
        """Persist a new entity and return it with its assigned id."""

    @abstractmethod
    async def get(self, entity_id: str) -> T | None:
        """Return the entity with ``entity_id`` or None if it does not exist."""

    @abstractmethod
    async def update(self, entity: T) -> T:
        """Persist changes to an existing entity and return it."""

    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """Delete the entity by id; return True if a document was removed."""


class UserRepository(Repository[User], ABC):
    """Persistence port for :class:`User` aggregates."""

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Return the user with the given email (case-insensitive) or None."""

    @abstractmethod
    async def list_users(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        """Return a page of users ordered by creation time."""

    @abstractmethod
    async def count(self) -> int:
        """Return the total number of users."""


class RefreshTokenRepository(Repository[RefreshToken], ABC):
    """Persistence port for :class:`RefreshToken` records."""

    @abstractmethod
    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        """Return the refresh-token record for a ``jti`` or None."""

    @abstractmethod
    async def revoke(self, jti: str) -> bool:
        """Mark the token with ``jti`` as revoked; return True if updated."""

    @abstractmethod
    async def revoke_all_for_user(self, user_id: str) -> int:
        """Revoke every active token for a user; return the number revoked."""


class PredictionRepository(Repository[Prediction], ABC):
    """Persistence port for :class:`Prediction` aggregates."""

    @abstractmethod
    async def list_for_user(
        self, user_id: str, *, skip: int = 0, limit: int = 20
    ) -> list[Prediction]:
        """Return a page of a user's predictions, newest first."""

    @abstractmethod
    async def count_for_user(self, user_id: str) -> int:
        """Return the total number of predictions for a user."""

    @abstractmethod
    async def get_by_idempotency_key(
        self, user_id: str, idempotency_key: str
    ) -> Prediction | None:
        """Return a user's prediction previously stored under ``idempotency_key``."""


class ReportRepository(Repository[Report], ABC):
    """Persistence port for :class:`Report` aggregates."""

    @abstractmethod
    async def get_by_prediction_id(self, prediction_id: str) -> Report | None:
        """Return the report attached to a prediction, or None."""


class DocumentRepository(Repository[Document], ABC):
    """Persistence port for knowledge-base :class:`Document` aggregates."""

    @abstractmethod
    async def get_by_hash(self, content_hash: str) -> Document | None:
        """Return a document with a matching content hash (duplicate detection)."""

    @abstractmethod
    async def latest_version(self, filename: str) -> int:
        """Return the highest existing version for ``filename`` (0 if none)."""

    @abstractmethod
    async def list_all(self, *, skip: int = 0, limit: int = 50) -> list[Document]:
        """Return a page of documents, newest first."""

    @abstractmethod
    async def count(self) -> int:
        """Return the total number of documents."""


class DocumentChunkRepository(Repository[DocumentChunk], ABC):
    """Persistence port for :class:`DocumentChunk` records (``embeddings_metadata``)."""

    @abstractmethod
    async def add_many(self, chunks: list[DocumentChunk]) -> None:
        """Bulk-insert chunks."""

    @abstractmethod
    async def list_all(self) -> list[DocumentChunk]:
        """Return every chunk (used to build the keyword/BM25 index)."""

    @abstractmethod
    async def get_by_vector_ids(self, vector_ids: list[str]) -> dict[str, DocumentChunk]:
        """Return chunks keyed by ``vector_id`` for the given ids."""

    @abstractmethod
    async def delete_by_document(self, document_id: str) -> int:
        """Delete all chunks for a document; return the number removed."""


class ChatMessageRepository(Repository[ChatMessage], ABC):
    """Persistence port for :class:`ChatMessage` records (``chat_history``)."""

    @abstractmethod
    async def add(self, message: ChatMessage) -> ChatMessage:
        """Persist a chat message."""

    @abstractmethod
    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[ChatMessage]:
        """Return a user's messages in chronological order."""

    @abstractmethod
    async def delete_for_user(self, user_id: str) -> int:
        """Delete all of a user's chat messages; return the number removed."""
