# 07 — Backend Architecture

> Part of the **Advanced AI Medical Intelligence Platform (AIMIP)** documentation set.
> Authoritative names, paths, ENV vars, endpoints, and collections are defined in
> [_CANON.md](_CANON.md). This document explains **how the backend is structured and why**.
>
> **Disclaimer:** AIMIP is a clinical **decision-support** system, not a medical device.
> Outputs are informational, not a diagnosis; a licensed clinician must review all results.
> The platform is not FDA/CE cleared.

**Related docs:** [Software Requirements Specification](02_Software_Requirements_Specification.md) ·
[Database Design](17_Database_Design.md) · [API Design](18_API_Design.md) ·
[Authorization / RBAC](20_Authorization_RBAC.md) ·
[Environment Configuration](31_Environment_Configuration.md) ·
[Coding Standards](32_Coding_Standards.md) · [Frontend Architecture](08_Frontend_Architecture.md)

---

## 1. Architectural style — Clean / Hexagonal (Ports & Adapters)

The backend follows a **Clean / Hexagonal** architecture. Business rules live at the centre
and know nothing about FastAPI, MongoDB, PyTorch, OpenAI, Redis, or Celery. Those are all
**details** plugged in at the edges through **ports** (abstract base classes) and **adapters**
(concrete implementations selected at startup by **factories** reading ENV).

### 1.1 Dependency direction (the one rule)

```
domain  ←  application  ←  infrastructure  ←  interface
(entities,   (services,       (adapters:        (FastAPI routers,
 value        DTOs,            Mongo, PyTorch,    schemas,
 objects,     use cases)       OpenAI, Gemini,    middleware,
 ports/ABCs)                   Redis, Celery)     dependencies)
```

- **`domain`** depends on **nothing** in the codebase (only the standard library + Pydantic
  primitives for value objects). It defines entities, value objects, and **ports**.
- **`application`** depends **only on `domain`** — specifically on ports (ABCs), never on a
  concrete adapter. Services orchestrate use cases by calling port methods.
- **`infrastructure`** implements the ports (adapters) and depends on `domain` + third-party
  SDKs. This is the **only** layer allowed to `import openai`, `import torch`,
  `from motor.motor_asyncio import ...`, `import celery`, etc.
- **`interface`** is the delivery mechanism (HTTP). It depends on `application` (to call
  services) and wires everything through FastAPI DI. Nothing depends on `interface`.

> **Import-direction is enforced** in CI by a lint rule (see
> [Coding Standards §7](32_Coding_Standards.md)). A violation such as
> `from app.infrastructure... import ...` inside `app/application/**` fails the build.

### 1.2 Why hexagonal here

The product must support **provider swaps by `.env` change only** — `LLM_PROVIDER=openai`
→ `gemini` → `mock`, `VECTOR_DB=faiss` → `chroma`, `MODEL_ARCH=densenet121` →
`efficientnet_b0`, `CACHE_PROVIDER=memory` → `redis`, `TASK_QUEUE=inprocess` → `celery`.
Ports make each of these a one-line configuration change with **zero** business-logic edits,
and each swap is itself an automated test (see [§11](#11-testing-strategy)).

---

## 2. Module map (`backend/app/`)

The canonical folder tree lives in [_CANON.md §4](_CANON.md). Responsibilities per module:

| Path | Layer | Responsibility |
|------|-------|----------------|
| `app/main.py` | interface | App **factory**, **lifespan**, DI wiring, router mount, middleware stack |
| `app/core/config.py` | core | `Settings` (Pydantic v2 + pydantic-settings), fail-fast validation |
| `app/core/logging.py` | core | `structlog` structured JSON logging setup |
| `app/core/security.py` | core | password hashing (`passlib[bcrypt]`), JWT primitives (`python-jose`) |
| `app/core/exceptions.py` | core | domain/application exception hierarchy → mapped to RFC 7807 |
| `app/core/container.py` | core | **composition-root container** (builds adapters + services once) |
| `app/domain/entities/` | domain | `User`, `Prediction`, `Report`, `Document`, `ChatMessage`, … |
| `app/domain/value_objects/` | domain | `Role`, `RiskLevel`, `Confidence`, … |
| `app/domain/ports/` | domain | `AIProvider`, `EmbeddingProvider`, `VectorStore`, `Classifier`, `AuthProvider`, `StorageProvider`, `CacheProvider`, `TaskQueue`, `*Repository` |
| `app/application/services/` | application | `AuthService`, `PredictionService`, `ReportService`, `RagService`, `DocumentService`, `AnalyticsService`, `UserService` |
| `app/application/dto/` | application | internal data-transfer objects (not HTTP schemas) |
| `app/infrastructure/db/` | infrastructure | Motor client, index creation, Mongo repositories |
| `app/infrastructure/providers/{llm,embeddings,vector_db,cache,task_queue}/` | infrastructure | adapters + `factory.py` per provider family |
| `app/infrastructure/ml/{classifier,inference,gradcam,training}/` | infrastructure | PyTorch model build, threadpool inference, Grad-CAM, training |
| `app/infrastructure/rag/` | infrastructure | loader, cleaner, chunker, ingest, retriever, reranker, pipeline |
| `app/infrastructure/auth/` | infrastructure | JWT adapter (`AuthProvider`) |
| `app/infrastructure/storage/` | infrastructure | MongoDB storage adapter (`save_blob/get_blob/delete_blob` + repo access) |
| `app/interface/api/v1/` | interface | routers: `auth, predict, history, reports, chat, documents, analytics, users, settings, health` |
| `app/interface/schemas/` | interface | Pydantic request/response models |
| `app/interface/middleware/` | interface | `request_id, timing, rate_limit, error_handler, security_headers` |
| `app/interface/dependencies.py` | interface | FastAPI DI providers (`get_current_user`, `require_role`, `get_*_service`) |
| `app/workers/` | infrastructure | Celery app + tasks (`ingest`, `train`, `report_regen`) |

---

## 3. Configuration management (`core/config.py`)

All configuration is **12-factor** (environment-driven) and centralised in a single
`Settings` object built on **Pydantic v2 + pydantic-settings**. The full canonical ENV list
lives in [_CANON.md §5](_CANON.md) and [31_Environment_Configuration.md](31_Environment_Configuration.md).

Key behaviours:

- **Single source:** every module receives `Settings` via DI — nothing reads `os.environ`
  directly outside `config.py`.
- **Fail-fast validation:** invalid combinations raise at startup, never at first request.
  Example: `LLM_PROVIDER=openai` with an empty `OPENAI_API_KEY` raises during app creation.
- **Typed & documented:** every field is typed; provider selectors are constrained.

```python
# app/core/config.py
from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # App
    ENV: str = "development"                       # development|staging|production
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:5173"
    API_V1_PREFIX: str = "/api/v1"

    # Provider selectors
    LLM_PROVIDER: str = "openai"                   # openai|gemini|mock
    EMBEDDING_PROVIDER: str = "openai"             # openai|gemini|sentence_transformer
    VECTOR_DB: str = "faiss"                       # faiss|chroma|pinecone
    MODEL_ARCH: str = "densenet121"               # densenet121|efficientnet_b0
    AUTH_PROVIDER: str = "jwt"
    STORAGE_PROVIDER: str = "mongodb"
    CACHE_PROVIDER: str = "memory"                 # memory|redis
    TASK_QUEUE: str = "inprocess"                  # inprocess|celery

    # Keys / models
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Data stores
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "aimip"
    REDIS_URL: str = "redis://localhost:6379/0"
    PINECONE_API_KEY: str = ""

    # Auth / security
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # ML / storage paths
    MODEL_PATH: str = "./data/weights/model.pt"
    UPLOAD_PATH: str = "./data/uploads"
    GRADCAM_PATH: str = "./data/gradcam"
    VECTOR_INDEX_PATH: str = "./data/vector_index"
    PDF_PATH: str = "./data/pdfs"
    MAX_UPLOAD_SIZE: int = 10_485_760              # 10 MB
    ALLOWED_IMAGE_TYPES: str = "image/png,image/jpeg"

    # RAG
    RAG_TOP_K: int = 5
    RAG_CHUNK_SIZE: int = 800
    RAG_CHUNK_OVERLAP: int = 120
    RAG_MIN_SCORE: float = 0.2

    @model_validator(mode="after")
    def _validate_provider_keys(self) -> "Settings":
        # Fail fast: a selected cloud provider must have its key present.
        if self.LLM_PROVIDER == "openai" and not self.OPENAI_API_KEY:
            raise ValueError("LLM_PROVIDER=openai requires OPENAI_API_KEY")
        if self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            raise ValueError("LLM_PROVIDER=gemini requires GEMINI_API_KEY")
        if self.VECTOR_DB == "pinecone" and not self.PINECONE_API_KEY:
            raise ValueError("VECTOR_DB=pinecone requires PINECONE_API_KEY")
        if self.ENV == "production" and self.JWT_SECRET == "change-me":
            raise ValueError("JWT_SECRET must be set in production")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_image_types_list(self) -> list[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",") if t.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — one Settings instance per process."""
    return Settings()
```

---

## 4. Ports (domain contracts)

A **port** is an `abc.ABC` declaring only the methods the application needs. It contains **no
vendor imports**. The canonical port/ENV/adapter/method table is [_CANON.md §3](_CANON.md).

### 4.1 Provider ports (ENV-selected)

| Port (ABC) | ENV var | Adapters | Key methods |
|------------|---------|----------|-------------|
| `AIProvider` | `LLM_PROVIDER` | `openai` · `gemini` · `mock` | `generate(prompt, system=None, **opts) -> str`, `stream(...)` |
| `EmbeddingProvider` | `EMBEDDING_PROVIDER` | `openai` · `gemini` · `sentence_transformer` | `embed(texts) -> list[list[float]]`, `dimension: int` |
| `VectorStore` | `VECTOR_DB` | `faiss` · `chroma` · `pinecone` | `add(ids, vectors, metadatas)`, `search(vector, k, filter=None)`, `persist()`, `load()` |
| `Classifier` | `MODEL_ARCH` | `densenet121` · `efficientnet_b0` | `build()`, `predict(tensor) -> logits`, `target_layer` |
| `AuthProvider` | `AUTH_PROVIDER` | `jwt` | `create_access`, `create_refresh`, `verify`, `rotate` |
| `StorageProvider` | `STORAGE_PROVIDER` | `mongodb` | repository access + `save_blob/get_blob/delete_blob` |
| `CacheProvider` | `CACHE_PROVIDER` | `memory` · `redis` | `get`, `set(ttl)`, `delete` |
| `TaskQueue` | `TASK_QUEUE` | `inprocess` · `celery` | `enqueue(job_name, payload)`, `schedule(...)` |

### 4.2 Example port (ABC) — `AIProvider`

```python
# app/domain/ports/ai_provider.py
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class AIProvider(ABC):
    """Port for LLM text generation. NO vendor SDK is imported in this file."""

    @abstractmethod
    async def generate(self, prompt: str, *, system: str | None = None, **opts: object) -> str:
        """Return a completion for `prompt`, optionally steered by a `system` prompt."""

    @abstractmethod
    def stream(self, prompt: str, *, system: str | None = None, **opts: object) -> AsyncIterator[str]:
        """Yield partial tokens for streaming responses."""
```

### 4.3 Repository ports

Each aggregate has a repository **port** in `app/domain/ports/`, implemented by a Mongo
adapter in `app/infrastructure/db/`. Collections are defined in
[_CANON.md §6](_CANON.md) / [17_Database_Design.md](17_Database_Design.md):
`users`, `refresh_tokens`, `predictions`, `reports`, `documents`, `embeddings_metadata`,
`chat_sessions`, `chat_history`, `audit_logs`.

```python
# app/domain/ports/prediction_repository.py
from abc import ABC, abstractmethod
from app.domain.entities.prediction import Prediction


class PredictionRepository(ABC):
    @abstractmethod
    async def create(self, prediction: Prediction) -> Prediction: ...

    @abstractmethod
    async def get(self, prediction_id: str, *, owner_id: str | None = None) -> Prediction | None: ...

    @abstractmethod
    async def get_by_idempotency_key(self, key: str, owner_id: str) -> Prediction | None: ...

    @abstractmethod
    async def list_for_user(
        self, user_id: str, *, page: int, size: int, date_from: str | None, date_to: str | None
    ) -> tuple[list[Prediction], int]:
        """Return (page items, total count) for the paginated history endpoint."""
```

---

## 5. Adapters (infrastructure implementations)

An **adapter** implements a port using a specific vendor. This is the **only** layer that
imports third-party SDKs.

### 5.1 Example adapter — OpenAI `AIProvider`

```python
# app/infrastructure/providers/llm/openai_adapter.py
from collections.abc import AsyncIterator
from openai import AsyncOpenAI                      # vendor import lives ONLY here
from app.domain.ports.ai_provider import AIProvider


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate(self, prompt: str, *, system: str | None = None, **opts: object) -> str:
        messages = ([{"role": "system", "content": system}] if system else []) + [
            {"role": "user", "content": prompt}
        ]
        resp = await self._client.chat.completions.create(
            model=self._model, messages=messages, **opts
        )
        return resp.choices[0].message.content or ""

    async def stream(self, prompt: str, *, system: str | None = None, **opts: object) -> AsyncIterator[str]:
        messages = ([{"role": "system", "content": system}] if system else []) + [
            {"role": "user", "content": prompt}
        ]
        stream = await self._client.chat.completions.create(
            model=self._model, messages=messages, stream=True, **opts
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
```

The `MockProvider` (`LLM_PROVIDER=mock`) returns deterministic canned text so the app runs
offline and tests need no network — this is the pretrained-inference-style fallback for the LLM.

### 5.2 Provider factories (Factory pattern)

Each provider family exposes a factory `get_<x>_provider(settings)` in
`infrastructure/providers/<x>/factory.py`. The factory is the **only** place that maps an
ENV selector string to a concrete class.

```python
# app/infrastructure/providers/llm/factory.py
from app.core.config import Settings
from app.domain.ports.ai_provider import AIProvider
from app.infrastructure.providers.llm.openai_adapter import OpenAIProvider
from app.infrastructure.providers.llm.gemini_adapter import GeminiProvider
from app.infrastructure.providers.llm.mock_adapter import MockProvider


def get_ai_provider(settings: Settings) -> AIProvider:
    match settings.LLM_PROVIDER:
        case "openai":
            return OpenAIProvider(settings.OPENAI_API_KEY, settings.LLM_MODEL)
        case "gemini":
            return GeminiProvider(settings.GEMINI_API_KEY, settings.LLM_MODEL)
        case "mock":
            return MockProvider()
        case other:
            raise ValueError(f"Unknown LLM_PROVIDER={other!r}")
```

Sibling factories: `get_embedding_provider`, `get_vector_store`, `get_classifier`,
`get_auth_provider`, `get_storage_provider`, `get_cache_provider`, `get_task_queue`.

---

## 6. Composition-root container (`core/container.py`)

A single **composition root** constructs every adapter and every service **once** at startup,
reading `Settings`. Nothing else constructs adapters. This keeps DI wiring in one auditable
place and makes the object graph explicit.

```python
# app/core/container.py
from dataclasses import dataclass
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import Settings
from app.domain.ports.ai_provider import AIProvider
from app.domain.ports.embedding_provider import EmbeddingProvider
from app.domain.ports.vector_store import VectorStore
from app.domain.ports.classifier import Classifier
from app.domain.ports.auth_provider import AuthProvider
from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.task_queue import TaskQueue

from app.infrastructure.providers.llm.factory import get_ai_provider
from app.infrastructure.providers.embeddings.factory import get_embedding_provider
from app.infrastructure.providers.vector_db.factory import get_vector_store
from app.infrastructure.providers.cache.factory import get_cache_provider
from app.infrastructure.providers.task_queue.factory import get_task_queue
from app.infrastructure.ml.classifier.factory import get_classifier
from app.infrastructure.auth.factory import get_auth_provider
from app.infrastructure.db.repositories import (
    MongoUserRepository, MongoPredictionRepository, MongoReportRepository,
    MongoDocumentRepository, MongoChatRepository, MongoRefreshTokenRepository,
    MongoAuditLogRepository,
)
from app.application.services.auth_service import AuthService
from app.application.services.prediction_service import PredictionService
from app.application.services.report_service import ReportService
from app.application.services.rag_service import RagService
from app.application.services.document_service import DocumentService
from app.application.services.analytics_service import AnalyticsService
from app.application.services.user_service import UserService


@dataclass
class Container:
    settings: Settings
    mongo_client: AsyncIOMotorClient
    db: AsyncIOMotorDatabase

    # Ports (adapters chosen by factories from ENV)
    ai: AIProvider
    embeddings: EmbeddingProvider
    vectors: VectorStore
    classifier: Classifier
    auth_provider: AuthProvider
    cache: CacheProvider
    task_queue: TaskQueue

    # Services (depend ONLY on ports/repositories)
    auth_service: AuthService
    prediction_service: PredictionService
    report_service: ReportService
    rag_service: RagService
    document_service: DocumentService
    analytics_service: AnalyticsService
    user_service: UserService


def build_container(settings: Settings) -> Container:
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = mongo_client[settings.DB_NAME]

    # Adapters via factories
    ai = get_ai_provider(settings)
    embeddings = get_embedding_provider(settings)
    vectors = get_vector_store(settings)
    classifier = get_classifier(settings)          # build() lazily loads MODEL_PATH weights
    auth_provider = get_auth_provider(settings)
    cache = get_cache_provider(settings)
    task_queue = get_task_queue(settings)

    # Repositories
    users = MongoUserRepository(db)
    predictions = MongoPredictionRepository(db)
    reports = MongoReportRepository(db)
    documents = MongoDocumentRepository(db)
    chats = MongoChatRepository(db)
    refresh_tokens = MongoRefreshTokenRepository(db)
    audit = MongoAuditLogRepository(db)

    # Services (constructor injection of ports only)
    report_service = ReportService(ai=ai, reports=reports, predictions=predictions)
    prediction_service = PredictionService(
        classifier=classifier, predictions=predictions, cache=cache,
        report_service=report_service, task_queue=task_queue, settings=settings,
    )
    rag_service = RagService(
        ai=ai, embeddings=embeddings, vectors=vectors, chats=chats, settings=settings,
    )
    document_service = DocumentService(documents=documents, task_queue=task_queue, settings=settings)
    analytics_service = AnalyticsService(predictions=predictions, reports=reports)
    auth_service = AuthService(
        users=users, refresh_tokens=refresh_tokens, auth_provider=auth_provider,
        audit=audit, settings=settings,
    )
    user_service = UserService(users=users, audit=audit)

    return Container(
        settings=settings, mongo_client=mongo_client, db=db,
        ai=ai, embeddings=embeddings, vectors=vectors, classifier=classifier,
        auth_provider=auth_provider, cache=cache, task_queue=task_queue,
        auth_service=auth_service, prediction_service=prediction_service,
        report_service=report_service, rag_service=rag_service,
        document_service=document_service, analytics_service=analytics_service,
        user_service=user_service,
    )
```

---

## 7. App factory + lifespan (`main.py`)

The app is created by a **factory function** (`create_app`) rather than a module-level global,
so tests can spin up isolated apps and override the container. Startup/shutdown use the
FastAPI **lifespan** context manager.

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.container import build_container
from app.infrastructure.db.indexes import ensure_indexes
from app.interface.middleware import register_middleware
from app.interface.middleware.error_handler import register_exception_handlers
from app.interface.api.v1 import (
    auth, predict, history, reports, chat, documents, analytics, users, settings as settings_router, health,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.LOG_LEVEL)
    container = build_container(settings)          # composition root
    await ensure_indexes(container.db)             # idempotent index creation
    container.classifier.build()                   # load weights from MODEL_PATH
    container.vectors.load()                        # load persisted vector index
    app.state.container = container
    try:
        yield
    finally:
        container.mongo_client.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Advanced AI Medical Intelligence Platform (AIMIP)",
        version="1.0.0",
        docs_url="/docs",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_middleware(app)                        # request_id, timing, rate_limit, security_headers
    register_exception_handlers(app)                # RFC 7807 mapping

    prefix = settings.API_V1_PREFIX                 # /api/v1
    for router in (auth, predict, history, reports, chat, documents, analytics, users, settings_router):
        app.include_router(router.router, prefix=prefix)
    app.include_router(health.router)               # ops: /health/live, /health/ready (no prefix)
    return app


app = create_app()
```

Ops endpoints live outside the `/api/v1` prefix per [_CANON.md §7](_CANON.md):
`GET /health/live`, `GET /health/ready`, `GET /metrics` (Prometheus), `GET /docs` (Swagger).

---

## 8. Dependency Injection (FastAPI `Depends` + container)

The composition root builds the graph; **FastAPI `Depends`** exposes it to routers. All DI
providers live in `app/interface/dependencies.py`.

```python
# app/interface/dependencies.py
from typing import Annotated
from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.container import Container
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.domain.entities.user import User
from app.domain.value_objects.role import Role
from app.application.services.prediction_service import PredictionService
from app.application.services.auth_service import AuthService

bearer = HTTPBearer(auto_error=False)


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_prediction_service(c: Annotated[Container, Depends(get_container)]) -> PredictionService:
    return c.prediction_service


def get_auth_service(c: Annotated[Container, Depends(get_container)]) -> AuthService:
    return c.auth_service


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Security(bearer)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    if creds is None:
        raise UnauthorizedError("Missing bearer token")
    return await auth_service.user_from_access_token(creds.credentials)


def require_role(*allowed: Role):
    """Dependency factory enforcing RBAC (see 20_Authorization_RBAC.md)."""
    async def _guard(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed:
            raise ForbiddenError(f"Requires one of roles: {[r.value for r in allowed]}")
        return user
    return _guard
```

Router usage stays declarative and thin — routers translate HTTP ⇄ service calls only:

```python
# app/interface/api/v1/predict.py
from typing import Annotated
from fastapi import APIRouter, Depends, File, Header, UploadFile
from app.interface.dependencies import get_current_user, get_prediction_service
from app.interface.schemas.prediction import PredictionResponse

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictionResponse, status_code=201)
async def create_prediction(
    file: Annotated[UploadFile, File()],
    user=Depends(get_current_user),
    service=Depends(get_prediction_service),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    result = await service.predict(user_id=user.id, upload=file, idempotency_key=idempotency_key)
    return PredictionResponse.from_entity(result)
```

---

## 9. Service layer (application)

Services orchestrate use cases. They depend **only on ports** (passed via constructor
injection), never on FastAPI, Motor, or a vendor SDK. Responsibilities:

| Service | Responsibilities |
|---------|------------------|
| `AuthService` | register/login/refresh/logout, password hashing, refresh-token rotation, lockout after `MAX_LOGIN_ATTEMPTS` for `LOCKOUT_MINUTES`, audit logging |
| `PredictionService` | validate upload (`ALLOWED_IMAGE_TYPES`, `MAX_UPLOAD_SIZE`), idempotency via `Idempotency-Key`, run threadpool inference, OOD guard (`ood_flag`), persist `predictions`, trigger Grad-CAM + report |
| `ReportService` | **Builder** assembly of report sections via `AIProvider`, persist `reports`, regenerate on demand |
| `RagService` | embed query, hybrid retrieve + rerank, refuse when score < `RAG_MIN_SCORE`, grounded answer with citations, persist `chat_sessions`/`chat_history` |
| `DocumentService` | accept PDF upload, enqueue async ingest job, track `documents.status` |
| `AnalyticsService` | aggregate overview, trends, disease/confidence distributions, recent activity |
| `UserService` | admin user CRUD, role changes, activation/deactivation, audit logging |

### 9.1 Example service using **only ports**

```python
# app/application/services/prediction_service.py
from fastapi import UploadFile
from app.core.config import Settings
from app.core.exceptions import ValidationError, ConflictError
from app.domain.entities.prediction import Prediction
from app.domain.ports.classifier import Classifier
from app.domain.ports.prediction_repository import PredictionRepository
from app.domain.ports.cache_provider import CacheProvider
from app.domain.ports.task_queue import TaskQueue
from app.infrastructure.ml.inference import run_inference   # threadpool wrapper (see §10)


class PredictionService:
    def __init__(
        self,
        *,
        classifier: Classifier,
        predictions: PredictionRepository,
        cache: CacheProvider,
        report_service: "ReportService",
        task_queue: TaskQueue,
        settings: Settings,
    ) -> None:
        self._classifier = classifier
        self._predictions = predictions
        self._cache = cache
        self._reports = report_service
        self._tasks = task_queue
        self._settings = settings

    async def predict(
        self, *, user_id: str, upload: UploadFile, idempotency_key: str | None
    ) -> Prediction:
        # 1. Idempotency — replay a prior result rather than double-charging inference.
        if idempotency_key:
            existing = await self._predictions.get_by_idempotency_key(idempotency_key, user_id)
            if existing:
                return existing

        # 2. Validate upload against ENV policy.
        raw = await upload.read()
        if upload.content_type not in self._settings.allowed_image_types_list:
            raise ValidationError(f"Unsupported content type: {upload.content_type}")
        if len(raw) > self._settings.MAX_UPLOAD_SIZE:
            raise ValidationError("Upload exceeds MAX_UPLOAD_SIZE")

        # 3. Inference off the event loop (threadpool). OOD guard sets ood_flag.
        outcome = await run_inference(self._classifier, raw)

        # 4. Persist prediction.
        prediction = Prediction.new(
            user_id=user_id,
            model_arch=self._settings.MODEL_ARCH,
            predicted_class=outcome.predicted_class,
            confidence=outcome.confidence,
            probabilities=outcome.probabilities,
            gradcam=outcome.gradcam,
            ood_flag=outcome.ood_flag,
            idempotency_key=idempotency_key,
        )
        prediction = await self._predictions.create(prediction)

        # 5. Generate the LLM report (Builder) — synchronous part of the < 6 s p95 flow.
        await self._reports.generate_for(prediction)
        return prediction
```

Note how the service names **no vendor**: it swaps OpenAI↔Gemini↔mock, DenseNet↔EfficientNet,
memory↔redis cache, inprocess↔celery queue — all without editing this file.

---

## 10. Async model inference via threadpool

PyTorch inference is **CPU/GPU-bound and blocking**; running it directly on the event loop
would stall every concurrent request. Per [_CANON.md §9](_CANON.md), inference runs in a
**threadpool executor** so the event loop stays responsive and the p95 targets in
[_CANON.md §11](_CANON.md) (prediction end-to-end < 6 s p95) hold under load.

```python
# app/infrastructure/ml/inference.py
import anyio
from dataclasses import dataclass
from app.domain.ports.classifier import Classifier
from app.infrastructure.ml.gradcam import compute_gradcam
from app.infrastructure.ml.preprocess import to_tensor, ood_score


@dataclass(frozen=True)
class Outcome:
    predicted_class: str            # "NORMAL" | "PNEUMONIA"
    confidence: float               # softmax max
    probabilities: dict[str, float] # {"NORMAL": .., "PNEUMONIA": ..}
    gradcam: dict[str, str]         # {original, heatmap, overlay} paths under GRADCAM_PATH
    ood_flag: bool


def _predict_sync(classifier: Classifier, raw: bytes) -> Outcome:
    tensor = to_tensor(raw)                         # 224x224, ImageNet mean/std
    ood = ood_score(tensor) < 0.5                   # heuristic OOD guard
    logits = classifier.predict(tensor)
    probs = _softmax(logits)
    gradcam = compute_gradcam(classifier, tensor)   # hooks on classifier.target_layer
    label = "PNEUMONIA" if probs["PNEUMONIA"] >= probs["NORMAL"] else "NORMAL"
    return Outcome(label, max(probs.values()), probs, gradcam, ood)


async def run_inference(classifier: Classifier, raw: bytes) -> Outcome:
    """Offload blocking PyTorch work to a worker thread; never block the event loop."""
    return await anyio.to_thread.run_sync(_predict_sync, classifier, raw)
```

---

## 11. Middleware stack

Registered in `register_middleware(app)` (`app/interface/middleware/`). Order is
outer→inner as listed; the error handler is registered as FastAPI exception handlers.

| Middleware | Purpose |
|------------|---------|
| `request_id` | Generate/propagate `X-Request-ID`; bind it to the structlog context for correlation |
| `timing` | Measure wall-clock latency, emit `X-Response-Time-ms`, feed Prometheus histograms (`/metrics`) |
| `rate_limit` | Token-bucket per client/route backed by `CacheProvider` (memory or redis) |
| `security_headers` | `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security` |
| `error_handler` | Map exceptions → **RFC 7807** problem+json envelope |

### 11.1 RFC 7807 error handler

The error envelope is **RFC 7807** `{type, title, status, detail, instance, errors?}` per
[_CANON.md §7](_CANON.md) and [18_API_Design.md](18_API_Design.md). The domain/application
raise typed exceptions from `core/exceptions.py`; the handler translates them — services never
build HTTP responses.

```python
# app/interface/middleware/error_handler.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    AppError, ValidationError, UnauthorizedError, ForbiddenError,
    NotFoundError, ConflictError,
)

_STATUS = {
    ValidationError: 422, UnauthorizedError: 401, ForbiddenError: 403,
    NotFoundError: 404, ConflictError: 409,
}


def _problem(request: Request, exc: AppError, status: int) -> JSONResponse:
    body = {
        "type": f"https://aimip.dtableanalytics.com/errors/{exc.code}",
        "title": exc.title,
        "status": status,
        "detail": str(exc),
        "instance": str(request.url.path),
    }
    if getattr(exc, "errors", None):
        body["errors"] = exc.errors            # field-level validation details
    return JSONResponse(status_code=status, content=body, media_type="application/problem+json")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle(request: Request, exc: AppError):
        return _problem(request, exc, _STATUS.get(type(exc), 500))
```

---

## 12. Background workers (Celery integration)

Long-running or fan-out work is dispatched through the **`TaskQueue`** port, so the same
service code runs either **in-process** (`TASK_QUEUE=inprocess`, dev/test) or on **Celery**
(`TASK_QUEUE=celery`, prod) with Redis as broker/result backend (`REDIS_URL`). Celery app +
tasks live in `app/workers/`.

Jobs (per [_CANON.md §4](_CANON.md)):

- **`ingest`** — RAG document pipeline: PyMuPDF load → clean → chunk
  (`RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP`) → `EmbeddingProvider.embed` → `VectorStore.add` →
  `persist()`; updates `documents.status` (`uploaded → processing → indexed|failed`).
- **`train`** — model transfer-learning run, checkpoint → `MODEL_PATH` (optional; the app
  runs on the pretrained-inference fallback without it).
- **`report_regen`** — regenerate a report for `POST /reports/{prediction_id}/regenerate`.

```python
# app/workers/celery_app.py
from celery import Celery
from app.core.config import get_settings

settings = get_settings()
celery_app = Celery("aimip", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.update(task_track_started=True, task_time_limit=1800)


# app/workers/tasks.py
from app.workers.celery_app import celery_app
from app.core.config import get_settings
from app.core.container import build_container


@celery_app.task(name="ingest", bind=True, max_retries=3)
def ingest(self, document_id: str) -> None:
    container = build_container(get_settings())
    # DocumentService drives loader→cleaner→chunker→embeddings→vector store→persist.
    container.document_service.ingest_sync(document_id)
```

The `CeleryTaskQueue` adapter implements the `TaskQueue` port by calling
`celery_app.send_task(job_name, kwargs=payload)`; the `InProcessTaskQueue` adapter awaits the
coroutine directly. Services only ever call `task_queue.enqueue(...)`.

---

## 13. Testing strategy (backend)

Tests live in `backend/tests/{unit,integration,contract}/`. Coverage target ≥ 80%
([_CANON.md §11](_CANON.md)). See [32_Coding_Standards.md §9](32_Coding_Standards.md) for
detailed expectations.

- **Unit** — services tested against fake/mock ports; no I/O.
- **Integration** — routers + real Mongo (test DB) + real middleware via `httpx.AsyncClient`.
- **Contract** — every port ships a **shared contract test** in `tests/contract/` that all
  adapters must pass (e.g. `openai`, `gemini`, `mock` all satisfy the `AIProvider` contract).
- **Provider-swap test** — flipping a selector ENV (`LLM_PROVIDER`, `VECTOR_DB`, …) and
  re-resolving the factory is itself an automated test.

---

## 14. Cross-references

- ENV variables & fail-fast rules → [31_Environment_Configuration.md](31_Environment_Configuration.md)
- Collections & indexes → [17_Database_Design.md](17_Database_Design.md)
- Endpoints & envelopes → [18_API_Design.md](18_API_Design.md)
- RBAC roles & permission matrix → [20_Authorization_RBAC.md](20_Authorization_RBAC.md)
- Non-functional targets → [02_Software_Requirements_Specification.md](02_Software_Requirements_Specification.md)
- Patterns, SOLID, style rules → [32_Coding_Standards.md](32_Coding_Standards.md)
- Client that consumes this API → [08_Frontend_Architecture.md](08_Frontend_Architecture.md)
