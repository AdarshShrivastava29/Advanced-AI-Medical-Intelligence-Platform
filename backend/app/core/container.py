"""Composition root — the single place adapters are wired to ports.

The :class:`Container` builds and owns long-lived singletons (database, cache,
task queue) and constructs repositories/services on demand. It is created once at
startup and stored on ``app.state.container``; FastAPI dependencies read from it.
This keeps every other module free of provider-construction knowledge, satisfying
the Dependency Inversion Principle (see ``docs/05_Low_Level_Architecture.md``).
"""

from __future__ import annotations

from app.application.services.analytics_service import AnalyticsService
from app.application.services.auth_service import AuthService
from app.application.services.prediction_service import PredictionService
from app.application.services.report_service import ReportService
from app.application.services.user_service import UserService
from app.core.config import Settings
from app.core.exceptions import DependencyUnavailableError
from app.core.logging import get_logger
from app.domain.ports.analytics import AnalyticsRepository
from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.file_storage import FileStorage
from app.domain.ports.inference import InferenceEngine
from app.domain.ports.llm_provider import AIProvider
from app.domain.ports.repositories import (
    PredictionRepository,
    RefreshTokenRepository,
    ReportRepository,
    UserRepository,
)
from app.domain.ports.task_queue import TaskQueue
from app.infrastructure.db.analytics_repository import MongoAnalyticsRepository
from app.infrastructure.db.client import MongoDatabase
from app.infrastructure.db.prediction_repository import MongoPredictionRepository
from app.infrastructure.db.refresh_token_repository import MongoRefreshTokenRepository
from app.infrastructure.db.report_repository import MongoReportRepository
from app.infrastructure.db.user_repository import MongoUserRepository
from app.infrastructure.providers.cache.factory import get_cache_provider
from app.infrastructure.providers.llm.factory import get_llm_provider
from app.infrastructure.providers.task_queue.factory import get_task_queue
from app.infrastructure.storage.factory import get_file_storage

logger = get_logger(__name__)


class Container:
    """Application composition root holding singletons and building services.

    Args:
        settings: The validated application settings.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.database = MongoDatabase(settings.mongodb_uri, settings.db_name)
        # Stateless provider singletons selected by ENV via their factories.
        self.cache: CacheProvider = get_cache_provider(settings)
        self.task_queue: TaskQueue = get_task_queue(settings)
        self.file_storage: FileStorage = get_file_storage(settings)
        self._llm_provider: AIProvider | None = None
        self._inference_engine: InferenceEngine | None = None

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #
    async def startup(self) -> None:
        """Open external connections. Called from the application lifespan.

        Startup is resilient: if the database is unreachable the app still boots
        in a *degraded* state (liveness stays healthy, readiness reports the
        database as unavailable) rather than crashing the process. This is the
        12-factor liveness/readiness split documented in ``docs/25_Monitoring.md``.
        """
        try:
            await self.database.connect()
        except DependencyUnavailableError as exc:
            logger.error("container.startup.db_unavailable", error=str(exc))
        logger.info(
            "container.startup.ok",
            llm_provider=self.settings.llm_provider,
            embedding_provider=self.settings.embedding_provider,
            vector_db=self.settings.vector_db,
            cache_provider=self.cache.name,
            task_queue=self.task_queue.name,
        )

    async def shutdown(self) -> None:
        """Close external connections. Called from the application lifespan."""
        await self.database.disconnect()
        logger.info("container.shutdown.ok")

    # ------------------------------------------------------------------ #
    # Repositories (Repository pattern)
    # ------------------------------------------------------------------ #
    @property
    def user_repository(self) -> UserRepository:
        """Build a :class:`UserRepository` bound to the ``users`` collection."""
        return MongoUserRepository(self.database.database["users"])

    @property
    def refresh_token_repository(self) -> RefreshTokenRepository:
        """Build a :class:`RefreshTokenRepository` bound to ``refresh_tokens``."""
        return MongoRefreshTokenRepository(self.database.database["refresh_tokens"])

    @property
    def prediction_repository(self) -> PredictionRepository:
        """Build a :class:`PredictionRepository` bound to ``predictions``."""
        return MongoPredictionRepository(self.database.database["predictions"])

    @property
    def report_repository(self) -> ReportRepository:
        """Build a :class:`ReportRepository` bound to ``reports``."""
        return MongoReportRepository(self.database.database["reports"])

    @property
    def analytics_repository(self) -> AnalyticsRepository:
        """Build an :class:`AnalyticsRepository` over the ``predictions`` collection."""
        return MongoAnalyticsRepository(self.database.database["predictions"])

    # ------------------------------------------------------------------ #
    # Services (Service layer)
    # ------------------------------------------------------------------ #
    @property
    def auth_service(self) -> AuthService:
        """Build an :class:`AuthService` with its repository dependencies."""
        return AuthService(
            user_repository=self.user_repository,
            refresh_token_repository=self.refresh_token_repository,
            settings=self.settings,
        )

    @property
    def user_service(self) -> UserService:
        """Build a :class:`UserService`."""
        return UserService(user_repository=self.user_repository)

    @property
    def report_service(self) -> ReportService:
        """Build a :class:`ReportService` backed by the ENV-selected LLM provider."""
        return ReportService(self.llm_provider, self.settings)

    @property
    def prediction_service(self) -> PredictionService:
        """Build the :class:`PredictionService` orchestrating the prediction pipeline."""
        return PredictionService(
            inference_engine=self.inference_engine,
            file_storage=self.file_storage,
            prediction_repository=self.prediction_repository,
            report_repository=self.report_repository,
            report_service=self.report_service,
            settings=self.settings,
        )

    @property
    def analytics_service(self) -> AnalyticsService:
        """Build an :class:`AnalyticsService`."""
        return AnalyticsService(
            analytics_repository=self.analytics_repository,
            prediction_repository=self.prediction_repository,
        )

    # ------------------------------------------------------------------ #
    # Providers on demand (used by later phases; abstractions verified now)
    # ------------------------------------------------------------------ #
    @property
    def llm_provider(self) -> AIProvider:
        """Return the ENV-selected :class:`AIProvider`, constructed once."""
        if self._llm_provider is None:
            self._llm_provider = get_llm_provider(self.settings)
        return self._llm_provider

    @property
    def inference_engine(self) -> InferenceEngine:
        """Return the ``MODEL_ARCH``-selected :class:`InferenceEngine`, built once.

        The ML factory (and torch) is imported lazily so modules that never run
        inference do not pay the import cost.
        """
        if self._inference_engine is None:
            from app.infrastructure.ml.factory import get_inference_engine

            self._inference_engine = get_inference_engine(self.settings)
        return self._inference_engine

    # ------------------------------------------------------------------ #
    # Health
    # ------------------------------------------------------------------ #
    async def check_readiness(self) -> dict[str, bool]:
        """Return a component -> healthy map used by the readiness probe."""
        checks: dict[str, bool] = {}
        try:
            checks["database"] = await self.database.ping()
        except Exception:
            checks["database"] = False
        checks["cache"] = await self.cache.health()
        checks["task_queue"] = await self.task_queue.health()
        return checks
