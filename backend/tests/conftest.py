"""Shared pytest fixtures.

Provides validated test settings, fake-backed services, and an ASGI test client
whose composition root is stubbed so no real MongoDB is required
(see docs/27_Testing_Strategy.md).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

from app.application.services.analytics_service import AnalyticsService
from app.application.services.auth_service import AuthService
from app.application.services.chat_service import ChatService
from app.application.services.document_service import INGEST_JOB, DocumentService
from app.application.services.prediction_service import PredictionService
from app.application.services.report_service import ReportService
from app.application.services.user_service import UserService
from app.core.config import Settings
from app.infrastructure.ml.classifier.densenet import DenseNet121Classifier
from app.infrastructure.ml.inference_engine import TorchInferenceEngine
from app.infrastructure.providers.llm.mock_provider import MockLLMProvider
from app.infrastructure.providers.vector_db.faiss_store import FaissVectorStore
from app.infrastructure.rag.engine import RagRetrievalEngine
from app.infrastructure.storage.local_storage import LocalFileStorage
from app.interface.dependencies import (
    get_analytics_service,
    get_auth_service,
    get_chat_service,
    get_document_service,
    get_prediction_service,
    get_user_service,
)
from app.main import create_app
from app.workers.ingest import make_ingest_handler
from tests.fakes import (
    FakeEmbeddingProvider,
    InMemoryAnalyticsRepository,
    InMemoryChatMessageRepository,
    InMemoryDocumentChunkRepository,
    InMemoryDocumentRepository,
    InMemoryPredictionRepository,
    InMemoryRefreshTokenRepository,
    InMemoryReportRepository,
    InMemoryUserRepository,
    SyncTaskQueue,
)


@pytest.fixture
def test_settings() -> Settings:
    """Return validated settings for tests (key-free providers, ignoring any .env)."""
    return Settings(
        _env_file=None,
        env="development",
        log_json=False,
        llm_provider="mock",
        embedding_provider="sentence_transformer",
        vector_db="faiss",
        cache_provider="memory",
        task_queue="inprocess",
        jwt_secret="test-secret-0123456789abcdef0123456789abcdef",
        access_token_expire_minutes=30,
        refresh_token_expire_days=7,
        max_login_attempts=3,
        lockout_minutes=15,
    )


@pytest.fixture
def user_repo() -> InMemoryUserRepository:
    """A fresh in-memory user repository."""
    return InMemoryUserRepository()


@pytest.fixture
def token_repo() -> InMemoryRefreshTokenRepository:
    """A fresh in-memory refresh-token repository."""
    return InMemoryRefreshTokenRepository()


@pytest.fixture
def auth_service(
    user_repo: InMemoryUserRepository,
    token_repo: InMemoryRefreshTokenRepository,
    test_settings: Settings,
) -> AuthService:
    """An :class:`AuthService` backed by in-memory repositories."""
    return AuthService(user_repo, token_repo, test_settings)


@pytest.fixture
def user_service(user_repo: InMemoryUserRepository) -> UserService:
    """A :class:`UserService` backed by an in-memory repository."""
    return UserService(user_repo)


@pytest.fixture
def prediction_repo() -> InMemoryPredictionRepository:
    """A fresh in-memory prediction repository."""
    return InMemoryPredictionRepository()


@pytest.fixture
def report_repo() -> InMemoryReportRepository:
    """A fresh in-memory report repository."""
    return InMemoryReportRepository()


@pytest.fixture
def prediction_service(
    prediction_repo: InMemoryPredictionRepository,
    report_repo: InMemoryReportRepository,
    test_settings: Settings,
    tmp_path_factory: pytest.TempPathFactory,
) -> PredictionService:
    """A real :class:`PredictionService`: random-init DenseNet engine (no download),
    local file storage in a temp dir, mock LLM for reports, in-memory repos."""
    storage_root = tmp_path_factory.mktemp("media")
    file_storage = LocalFileStorage(
        {
            "uploads": str(storage_root / "uploads"),
            "gradcam": str(storage_root / "gradcam"),
        }
    )
    engine = TorchInferenceEngine(
        DenseNet121Classifier(), test_settings, pretrained=False
    )
    report_service = ReportService(MockLLMProvider(), test_settings)
    return PredictionService(
        inference_engine=engine,
        file_storage=file_storage,
        prediction_repository=prediction_repo,
        report_repository=report_repo,
        report_service=report_service,
        settings=test_settings,
    )


@pytest.fixture
def analytics_service(
    prediction_repo: InMemoryPredictionRepository,
) -> AnalyticsService:
    """An :class:`AnalyticsService` sharing the prediction repo used by ``/predict``."""
    return AnalyticsService(
        analytics_repository=InMemoryAnalyticsRepository(prediction_repo),
        prediction_repository=prediction_repo,
    )


# --- RAG fixtures (fake embeddings + real FAISS + mock LLM + in-memory repos) --- #


@pytest.fixture
def rag_document_repo() -> InMemoryDocumentRepository:
    """A fresh in-memory document repository."""
    return InMemoryDocumentRepository()


@pytest.fixture
def rag_chunk_repo() -> InMemoryDocumentChunkRepository:
    """A fresh in-memory chunk repository."""
    return InMemoryDocumentChunkRepository()


@pytest.fixture
def rag_chat_repo() -> InMemoryChatMessageRepository:
    """A fresh in-memory chat repository."""
    return InMemoryChatMessageRepository()


@pytest.fixture
def rag_engine(
    rag_document_repo: InMemoryDocumentRepository,
    rag_chunk_repo: InMemoryDocumentChunkRepository,
    test_settings: Settings,
    tmp_path_factory: pytest.TempPathFactory,
) -> RagRetrievalEngine:
    """A real RAG engine: fake embeddings, FAISS index (temp), mock LLM, fake repos."""
    embeddings = FakeEmbeddingProvider(dimension=64)
    index_dir = tmp_path_factory.mktemp("vector_index")
    vector_store = FaissVectorStore(dimension=64, index_path=str(index_dir))
    return RagRetrievalEngine(
        embedding_provider=embeddings,
        vector_store=vector_store,
        llm_provider=MockLLMProvider(),
        document_repository=rag_document_repo,
        chunk_repository=rag_chunk_repo,
        settings=test_settings,
    )


@pytest.fixture
def document_service(
    rag_document_repo: InMemoryDocumentRepository,
    rag_engine: RagRetrievalEngine,
    test_settings: Settings,
    tmp_path_factory: pytest.TempPathFactory,
) -> DocumentService:
    """A :class:`DocumentService` whose sync queue ingests inline on upload."""
    storage_root = tmp_path_factory.mktemp("docs")
    file_storage = LocalFileStorage({"documents": str(storage_root)})
    queue = SyncTaskQueue()
    queue.register(INGEST_JOB, make_ingest_handler(rag_document_repo, rag_engine))
    return DocumentService(
        document_repository=rag_document_repo,
        rag_engine=rag_engine,
        file_storage=file_storage,
        task_queue=queue,
        settings=test_settings,
    )


@pytest.fixture
def chat_service(
    rag_engine: RagRetrievalEngine, rag_chat_repo: InMemoryChatMessageRepository
) -> ChatService:
    """A :class:`ChatService` sharing the RAG engine used by ``/documents``."""
    return ChatService(rag_engine=rag_engine, chat_repository=rag_chat_repo)


class _StubContainer:
    """Minimal stand-in for the composition root used by the readiness probe."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def startup(self) -> None:
        """No-op: tests do not connect to external services."""

    async def shutdown(self) -> None:
        """No-op."""

    async def check_readiness(self) -> dict[str, bool]:
        """Report all components healthy in tests."""
        return {"database": True, "cache": True, "task_queue": True}


@pytest_asyncio.fixture
async def client(
    test_settings: Settings,
    auth_service: AuthService,
    user_service: UserService,
    prediction_service: PredictionService,
    analytics_service: AnalyticsService,
    document_service: DocumentService,
    chat_service: ChatService,
) -> AsyncIterator[AsyncClient]:
    """Yield an ASGI client with a stubbed container and fake-backed services."""
    app = create_app(test_settings)
    app.state.container = _StubContainer(test_settings)
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    app.dependency_overrides[get_user_service] = lambda: user_service
    app.dependency_overrides[get_prediction_service] = lambda: prediction_service
    app.dependency_overrides[get_analytics_service] = lambda: analytics_service
    app.dependency_overrides[get_document_service] = lambda: document_service
    app.dependency_overrides[get_chat_service] = lambda: chat_service

    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            yield ac
    app.dependency_overrides.clear()
