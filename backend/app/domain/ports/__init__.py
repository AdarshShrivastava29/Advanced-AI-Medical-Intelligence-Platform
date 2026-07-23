"""Ports (interfaces) that the application depends on.

Adapters in ``app.infrastructure`` implement these; the application layer only
ever references the ports, so swapping an adapter (chosen by ENV via a factory)
never touches business logic. See ``docs/16_AI_Providers.md``.
"""

from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.embedding_provider import EmbeddingProvider
from app.domain.ports.file_storage import FileStorage, StoredFile
from app.domain.ports.inference import InferenceEngine
from app.domain.ports.llm_provider import AIProvider
from app.domain.ports.rag import RagEngine
from app.domain.ports.repositories import (
    ChatMessageRepository,
    DocumentChunkRepository,
    DocumentRepository,
    PredictionRepository,
    RefreshTokenRepository,
    ReportRepository,
    Repository,
    UserRepository,
)
from app.domain.ports.task_queue import TaskQueue
from app.domain.ports.vector_store import VectorHit, VectorStore

__all__ = [
    "AIProvider",
    "CacheProvider",
    "ChatMessageRepository",
    "DocumentChunkRepository",
    "DocumentRepository",
    "EmbeddingProvider",
    "FileStorage",
    "InferenceEngine",
    "PredictionRepository",
    "RagEngine",
    "RefreshTokenRepository",
    "ReportRepository",
    "Repository",
    "StoredFile",
    "TaskQueue",
    "UserRepository",
    "VectorHit",
    "VectorStore",
]
