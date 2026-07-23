"""In-memory fake repositories for fast, isolated tests.

These satisfy the same repository *ports* as the Motor adapters, so services can
be tested without a database — demonstrating the value of the Repository pattern
(see docs/27_Testing_Strategy.md).
"""

from __future__ import annotations

import hashlib
import math
import re
from datetime import UTC, datetime, timedelta
from typing import Any, ClassVar

from app.domain.entities.chat import ChatMessage
from app.domain.entities.document import Document
from app.domain.entities.document_chunk import DocumentChunk
from app.domain.entities.prediction import Prediction
from app.domain.entities.refresh_token import RefreshToken
from app.domain.entities.report import Report
from app.domain.entities.user import User
from app.domain.ports.analytics import AnalyticsRepository
from app.domain.ports.embedding_provider import EmbeddingProvider
from app.domain.ports.repositories import (
    ChatMessageRepository,
    DocumentChunkRepository,
    DocumentRepository,
    PredictionRepository,
    RefreshTokenRepository,
    ReportRepository,
    UserRepository,
)
from app.domain.ports.task_queue import TaskQueue
from app.domain.value_objects.analytics import (
    AnalyticsOverview,
    DistributionBucket,
    TrendPoint,
)


class InMemoryUserRepository(UserRepository):
    """A dict-backed :class:`UserRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, User] = {}
        self._seq = 0

    async def create(self, entity: User) -> User:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> User | None:
        return self._items.get(entity_id)

    async def get_by_email(self, email: str) -> User | None:
        return next(
            (u for u in self._items.values() if u.email == email.lower()), None
        )

    async def update(self, entity: User) -> User:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def list_users(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        ordered = sorted(self._items.values(), key=lambda u: u.created_at, reverse=True)
        return ordered[skip : skip + limit]

    async def count(self) -> int:
        return len(self._items)


class InMemoryRefreshTokenRepository(RefreshTokenRepository):
    """A dict-backed :class:`RefreshTokenRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, RefreshToken] = {}
        self._seq = 0

    async def create(self, entity: RefreshToken) -> RefreshToken:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> RefreshToken | None:
        return self._items.get(entity_id)

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        return next((t for t in self._items.values() if t.jti == jti), None)

    async def update(self, entity: RefreshToken) -> RefreshToken:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def revoke(self, jti: str) -> bool:
        token = await self.get_by_jti(jti)
        if token is None:
            return False
        token.revoked = True
        return True

    async def revoke_all_for_user(self, user_id: str) -> int:
        count = 0
        for token in self._items.values():
            if token.user_id == user_id and not token.revoked:
                token.revoked = True
                count += 1
        return count


class InMemoryPredictionRepository(PredictionRepository):
    """A dict-backed :class:`PredictionRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, Prediction] = {}
        self._seq = 0

    async def create(self, entity: Prediction) -> Prediction:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> Prediction | None:
        return self._items.get(entity_id)

    async def update(self, entity: Prediction) -> Prediction:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def list_for_user(
        self, user_id: str, *, skip: int = 0, limit: int = 20
    ) -> list[Prediction]:
        owned = [p for p in self._items.values() if p.user_id == user_id]
        owned.sort(key=lambda p: p.created_at, reverse=True)
        return owned[skip : skip + limit]

    async def count_for_user(self, user_id: str) -> int:
        return sum(1 for p in self._items.values() if p.user_id == user_id)

    async def get_by_idempotency_key(
        self, user_id: str, idempotency_key: str
    ) -> Prediction | None:
        return next(
            (
                p
                for p in self._items.values()
                if p.user_id == user_id and p.idempotency_key == idempotency_key
            ),
            None,
        )


class InMemoryReportRepository(ReportRepository):
    """A dict-backed :class:`ReportRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, Report] = {}
        self._seq = 0

    async def create(self, entity: Report) -> Report:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> Report | None:
        return self._items.get(entity_id)

    async def update(self, entity: Report) -> Report:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def get_by_prediction_id(self, prediction_id: str) -> Report | None:
        matches = [r for r in self._items.values() if r.prediction_id == prediction_id]
        matches.sort(key=lambda r: r.created_at, reverse=True)
        return matches[0] if matches else None


class InMemoryAnalyticsRepository(AnalyticsRepository):
    """Computes analytics in Python from an in-memory prediction repository."""

    _BOUNDARIES: ClassVar[list[float]] = [0.0, 0.5, 0.7, 0.85, 1.01]
    _LABELS: ClassVar[list[str]] = ["0-50%", "50-70%", "70-85%", "85-100%"]

    def __init__(self, predictions: InMemoryPredictionRepository) -> None:
        self._predictions = predictions

    async def _user_predictions(self, user_id: str) -> list[Prediction]:
        return await self._predictions.list_for_user(user_id, skip=0, limit=100_000)

    async def overview(self, user_id: str) -> AnalyticsOverview:
        preds = await self._user_predictions(user_id)
        if not preds:
            return AnalyticsOverview()
        pneumonia = sum(1 for p in preds if p.predicted_class == "PNEUMONIA")
        normal = sum(1 for p in preds if p.predicted_class == "NORMAL")
        ood = sum(1 for p in preds if p.ood_flag)
        avg = sum(p.confidence for p in preds) / len(preds)
        return AnalyticsOverview(
            total_predictions=len(preds),
            pneumonia_count=pneumonia,
            normal_count=normal,
            ood_count=ood,
            average_confidence=round(avg, 4),
        )

    async def trends(self, user_id: str, *, days: int = 30) -> list[TrendPoint]:
        preds = await self._user_predictions(user_id)
        counts: dict[str, int] = {}
        for p in preds:
            key = p.created_at.date().isoformat()
            counts[key] = counts.get(key, 0) + 1
        start = (datetime.now(UTC) - timedelta(days=days - 1)).date()
        return [
            TrendPoint(
                date=(day := (start + timedelta(days=offset)).isoformat()),
                count=counts.get(day, 0),
            )
            for offset in range(days)
        ]

    async def disease_distribution(self, user_id: str) -> list[DistributionBucket]:
        preds = await self._user_predictions(user_id)
        return [
            DistributionBucket(
                label="NORMAL", count=sum(1 for p in preds if p.predicted_class == "NORMAL")
            ),
            DistributionBucket(
                label="PNEUMONIA",
                count=sum(1 for p in preds if p.predicted_class == "PNEUMONIA"),
            ),
        ]

    async def confidence_distribution(self, user_id: str) -> list[DistributionBucket]:
        preds = await self._user_predictions(user_id)
        buckets = [0] * len(self._LABELS)
        for p in preds:
            for i in range(len(self._LABELS)):
                if self._BOUNDARIES[i] <= p.confidence < self._BOUNDARIES[i + 1]:
                    buckets[i] += 1
                    break
        return [
            DistributionBucket(label=label, count=buckets[i])
            for i, label in enumerate(self._LABELS)
        ]


_WORD = re.compile(r"[a-z0-9]+")


class FakeEmbeddingProvider(EmbeddingProvider):
    """Deterministic bag-of-words hashing embeddings (no model download).

    Texts sharing tokens get higher cosine similarity, which is enough to
    exercise the grounding gate and refusal logic offline.
    """

    name = "fake"

    def __init__(self, dimension: int = 64) -> None:
        self._dimension = dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    def _embed_one(self, text: str) -> list[float]:
        vector = [0.0] * self._dimension
        for token in _WORD.findall(text.lower()):
            bucket = int(hashlib.md5(token.encode()).hexdigest(), 16) % self._dimension
            vector[bucket] += 1.0
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]


class InMemoryDocumentRepository(DocumentRepository):
    """A dict-backed :class:`DocumentRepository` for tests."""

    def __init__(self) -> None:
        self._items: dict[str, Document] = {}
        self._seq = 0

    async def create(self, entity: Document) -> Document:
        self._seq += 1
        entity.id = str(self._seq)
        self._items[entity.id] = entity
        return entity

    async def get(self, entity_id: str) -> Document | None:
        return self._items.get(entity_id)

    async def update(self, entity: Document) -> Document:
        if entity.id is not None:
            self._items[entity.id] = entity
        return entity

    async def delete(self, entity_id: str) -> bool:
        return self._items.pop(entity_id, None) is not None

    async def get_by_hash(self, content_hash: str) -> Document | None:
        return next((d for d in self._items.values() if d.content_hash == content_hash), None)

    async def latest_version(self, filename: str) -> int:
        versions = [d.version for d in self._items.values() if d.filename == filename]
        return max(versions, default=0)

    async def list_all(self, *, skip: int = 0, limit: int = 50) -> list[Document]:
        ordered = sorted(self._items.values(), key=lambda d: d.created_at, reverse=True)
        return ordered[skip : skip + limit]

    async def count(self) -> int:
        return len(self._items)


class InMemoryDocumentChunkRepository(DocumentChunkRepository):
    """A dict-backed :class:`DocumentChunkRepository` for tests."""

    def __init__(self) -> None:
        self._items: list[DocumentChunk] = []
        self._seq = 0

    async def create(self, entity: DocumentChunk) -> DocumentChunk:
        self._seq += 1
        entity.id = str(self._seq)
        self._items.append(entity)
        return entity

    async def get(self, entity_id: str) -> DocumentChunk | None:
        return next((c for c in self._items if c.id == entity_id), None)

    async def update(self, entity: DocumentChunk) -> DocumentChunk:
        return entity

    async def delete(self, entity_id: str) -> bool:
        before = len(self._items)
        self._items = [c for c in self._items if c.id != entity_id]
        return len(self._items) < before

    async def add_many(self, chunks: list[DocumentChunk]) -> None:
        for chunk in chunks:
            await self.create(chunk)

    async def list_all(self) -> list[DocumentChunk]:
        return list(self._items)

    async def get_by_vector_ids(self, vector_ids: list[str]) -> dict[str, DocumentChunk]:
        wanted = set(vector_ids)
        return {c.vector_id: c for c in self._items if c.vector_id in wanted}

    async def delete_by_document(self, document_id: str) -> int:
        before = len(self._items)
        self._items = [c for c in self._items if c.document_id != document_id]
        return before - len(self._items)


class InMemoryChatMessageRepository(ChatMessageRepository):
    """A dict-backed :class:`ChatMessageRepository` for tests."""

    def __init__(self) -> None:
        self._items: list[ChatMessage] = []
        self._seq = 0

    async def create(self, entity: ChatMessage) -> ChatMessage:
        return await self.add(entity)

    async def add(self, message: ChatMessage) -> ChatMessage:
        self._seq += 1
        message.id = str(self._seq)
        self._items.append(message)
        return message

    async def get(self, entity_id: str) -> ChatMessage | None:
        return next((m for m in self._items if m.id == entity_id), None)

    async def update(self, entity: ChatMessage) -> ChatMessage:
        return entity

    async def delete(self, entity_id: str) -> bool:
        before = len(self._items)
        self._items = [m for m in self._items if m.id != entity_id]
        return len(self._items) < before

    async def list_for_user(self, user_id: str, *, limit: int = 100) -> list[ChatMessage]:
        return [m for m in self._items if m.user_id == user_id][:limit]

    async def delete_for_user(self, user_id: str) -> int:
        before = len(self._items)
        self._items = [m for m in self._items if m.user_id != user_id]
        return before - len(self._items)


class SyncTaskQueue(TaskQueue):
    """A TaskQueue test double that runs registered handlers synchronously."""

    name = "sync"

    def __init__(self) -> None:
        self._handlers: dict[str, Any] = {}

    def register(self, job_name: str, handler: Any) -> None:
        self._handlers[job_name] = handler

    async def enqueue(self, job_name: str, payload: dict[str, Any]) -> str:
        handler = self._handlers.get(job_name)
        if handler is not None:
            await handler(payload)
        return "sync-job"
