"""Repository ports.

The generic :class:`Repository` captures CRUD common to all aggregates; the
specialised repositories add lookups the services need. Concrete Motor-backed
implementations live in ``app.infrastructure.db`` (Repository pattern —
see ``docs/07_Backend_Architecture.md``).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

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
