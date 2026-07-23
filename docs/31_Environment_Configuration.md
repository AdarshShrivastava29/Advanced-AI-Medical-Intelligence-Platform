# 31 — Environment Configuration

> Part of the **Advanced AI Medical Intelligence Platform (AIMIP)** documentation set.
> Canonical names, ENV vars, ports and services are defined in [`_CANON.md`](_CANON.md).
> This document is the authoritative reference for **every** variable in [`_CANON.md`](_CANON.md) §5.
> Related: [27_Testing_Strategy](27_Testing_Strategy.md) · [28_Deployment](28_Deployment.md) ·
> [29_Docker](29_Docker.md) · [30_CICD](30_CICD.md) ·
> [02_Software_Requirements_Specification](02_Software_Requirements_Specification.md).

**Disclaimer:** AIMIP is clinical **decision-support**, not a medical device; outputs are
informational, not a diagnosis, and a licensed clinician must review all results.

---

## 1. How configuration works

All configuration is environment variables (12-factor III, [28_Deployment](28_Deployment.md) §1).
The backend loads them into a single typed `Settings` object built with **Pydantic v2 +
pydantic-settings** (`app/core/config.py`, [`_CANON.md`](_CANON.md) §1, §4). The object is
constructed once at startup, injected through the composition-root container
([`_CANON.md`](_CANON.md) §2), and read by the provider factories
(`get_<x>_provider(settings)`, [`_CANON.md`](_CANON.md) §3).

**Config fails fast** ([`_CANON.md`](_CANON.md) §5): invalid, missing-but-required, or
inconsistent configuration raises at startup, so a misconfigured process never accepts traffic
and is kept out of the load-balancer rotation ([28_Deployment](28_Deployment.md) §7).

The frontend uses **Vite** env vars: only variables prefixed `VITE_` are exposed to the browser
bundle at **build time** ([`_CANON.md`](_CANON.md) §5, [29_Docker](29_Docker.md) §3).

---

## 2. Complete ENV reference (canon §5)

Legend — **Req?**: ✅ always required · ⚠️ conditionally required (see validation) · ⭕ optional
(has a default). **Sub-system** maps to [`_CANON.md`](_CANON.md) ports/services.

### 2.1 App

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `ENV` | enum(str) | `development` | `development` · `staging` · `production` | ✅ | must be one of the three | Selects environment profile; drives prod-only safety checks (§4) | App / core |
| `LOG_LEVEL` | enum(str) | `INFO` | `DEBUG` · `INFO` · `WARNING` · `ERROR` · `CRITICAL` | ⭕ | valid Python logging level | `structlog` verbosity | Logging (`core/logging.py`) |
| `CORS_ORIGINS` | csv(list[str]) | `http://localhost:5173` | comma-separated origin URLs | ⭕ | each must be a valid `http(s)://` origin; `*` forbidden when `ENV=production` | Allowed browser origins for CORS middleware | Interface / middleware |
| `API_V1_PREFIX` | str | `/api/v1` | path starting with `/` | ⭕ | must start with `/` | Mount prefix for versioned routers | Interface / api |

### 2.2 Provider selectors ([`_CANON.md`](_CANON.md) §3)

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `LLM_PROVIDER` | enum(str) | `openai` | `openai` · `gemini` · `mock` | ✅ | one of the three; `openai`→`OPENAI_API_KEY` required, `gemini`→`GEMINI_API_KEY` required | Selects `AIProvider` adapter (report + chat generation) | `AIProvider` port |
| `EMBEDDING_PROVIDER` | enum(str) | `openai` | `openai` · `gemini` · `sentence_transformer` | ✅ | one of the three; `openai`→`OPENAI_API_KEY`, `gemini`→`GEMINI_API_KEY` required | Selects `EmbeddingProvider` adapter | `EmbeddingProvider` port |
| `VECTOR_DB` | enum(str) | `faiss` | `faiss` · `chroma` · `pinecone` | ✅ | one of the three; `pinecone`→`PINECONE_API_KEY` required | Selects `VectorStore` adapter | `VectorStore` port |
| `MODEL_ARCH` | enum(str) | `densenet121` | `densenet121` · `efficientnet_b0` | ✅ | one of the two | Selects `Classifier` architecture (2-class head `[NORMAL, PNEUMONIA]`) | `Classifier` port / ML |
| `AUTH_PROVIDER` | enum(str) | `jwt` | `jwt` | ✅ | must be `jwt` (oauth2/keycloak reserved for future) | Selects `AuthProvider` adapter | `AuthProvider` port |
| `STORAGE_PROVIDER` | enum(str) | `mongodb` | `mongodb` | ✅ | must be `mongodb` (postgres/s3 reserved for future) | Selects `StorageProvider` (repositories + blob) | `StorageProvider` port |
| `CACHE_PROVIDER` | enum(str) | `memory` | `memory` · `redis` | ✅ | one of the two; `redis`→`REDIS_URL` required | Selects `CacheProvider`; must be `redis` for multi-replica | `CacheProvider` port |
| `TASK_QUEUE` | enum(str) | `inprocess` | `inprocess` · `celery` | ✅ | one of the two; `celery`→`REDIS_URL` required | Selects `TaskQueue`; `celery` for async ingest/train/report_regen | `TaskQueue` port / workers |

### 2.3 Keys & models

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `OPENAI_API_KEY` | secret(str) | `` (empty) | any non-empty secret | ⚠️ | **required & non-empty** iff `LLM_PROVIDER=openai` or `EMBEDDING_PROVIDER=openai` | OpenAI SDK credential (used only inside the openai adapter) | `AIProvider` / `EmbeddingProvider` |
| `GEMINI_API_KEY` | secret(str) | `` (empty) | any non-empty secret | ⚠️ | **required & non-empty** iff `LLM_PROVIDER=gemini` or `EMBEDDING_PROVIDER=gemini` | Google Generative AI credential | `AIProvider` / `EmbeddingProvider` |
| `LLM_MODEL` | str | `gpt-4o-mini` | provider-specific model id | ⭕ | non-empty string | Model id passed to the active `AIProvider` | `AIProvider` port |
| `EMBEDDING_MODEL` | str | `text-embedding-3-small` | provider-specific model id | ⭕ | non-empty string | Model id passed to the active `EmbeddingProvider` | `EmbeddingProvider` port |

### 2.4 Data stores

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `MONGODB_URI` | secret(url) | `mongodb://localhost:27017` | `mongodb://` or `mongodb+srv://` URI | ✅ | must parse as a Mongo connection URI | Motor async client connection string (Atlas in prod) | DB / `StorageProvider` |
| `DB_NAME` | str | `aimip` | valid Mongo db name | ✅ | non-empty; no `/\. "$*<>:|?` | Database name (`aimip_test` in tests) | DB |
| `REDIS_URL` | secret(url) | `redis://localhost:6379/0` | `redis://` / `rediss://` URL | ⚠️ | valid Redis URL; **required** iff `CACHE_PROVIDER=redis` or `TASK_QUEUE=celery` | Cache backend + Celery broker/result backend | `CacheProvider` / `TaskQueue` |
| `PINECONE_API_KEY` | secret(str) | `` (empty) | any non-empty secret | ⚠️ | **required & non-empty** iff `VECTOR_DB=pinecone` | Pinecone credential (optional vector store) | `VectorStore` port |

### 2.5 Auth / security ([20_Authorization_RBAC](20_Authorization_RBAC.md))

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `JWT_SECRET` | secret(str) | `change-me` | any non-empty secret | ✅ | non-empty; **must NOT equal `change-me` when `ENV=production`**; recommend ≥ 32 chars | HMAC signing key for access/refresh tokens | `AuthProvider` / security |
| `JWT_ALGORITHM` | enum(str) | `HS256` | `HS256` · `HS384` · `HS512` | ⭕ | one of the allowed HMAC algorithms | JWT signing algorithm | `AuthProvider` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | `30` | `1`–`1440` | ⭕ | `> 0` | Access-token lifetime (minutes) | `AuthProvider` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | int | `7` | `1`–`90` | ⭕ | `> 0` | Refresh-token lifetime (days); TTL index on `refresh_tokens` | `AuthProvider` / DB |
| `MAX_LOGIN_ATTEMPTS` | int | `5` | `1`–`20` | ⭕ | `>= 1` | Failed logins before lockout | `AuthService` |
| `LOCKOUT_MINUTES` | int | `15` | `1`–`1440` | ⭕ | `> 0` | Account lockout duration (minutes) | `AuthService` |

### 2.6 ML / storage paths ([`_CANON.md`](_CANON.md) §9)

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `MODEL_PATH` | path(str) | `./data/weights/model.pt` | filesystem path | ⭕ | parent dir must be creatable; warns (not fails) if file absent → pretrained-inference fallback | Trained checkpoint location | ML / inference |
| `UPLOAD_PATH` | path(str) | `./data/uploads` | filesystem path | ⭕ | directory created at startup if missing | Where uploaded X-ray images are stored | ML / storage |
| `GRADCAM_PATH` | path(str) | `./data/gradcam` | filesystem path | ⭕ | directory created at startup if missing | Grad-CAM PNGs (original/heatmap/overlay) | ML / Grad-CAM |
| `VECTOR_INDEX_PATH` | path(str) | `./data/vector_index` | filesystem path | ⭕ | directory created at startup if missing | Persisted faiss/chroma index location | `VectorStore` / RAG |
| `PDF_PATH` | path(str) | `./data/pdfs` | filesystem path | ⭕ | directory created at startup if missing | Source medical PDFs for RAG ingest | RAG |
| `MAX_UPLOAD_SIZE` | int(bytes) | `10485760` | `1`–`52428800` | ⭕ | `> 0`; enforced by API + nginx `client_max_body_size` | Max upload size in bytes (10 MB) | Interface / upload |
| `ALLOWED_IMAGE_TYPES` | csv(list[str]) | `image/png,image/jpeg` | comma-separated MIME types | ⭕ | each must be a valid `image/*` MIME | Accepted upload content types | Interface / upload |

### 2.7 RAG ([`_CANON.md`](_CANON.md) §9)

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `RAG_TOP_K` | int | `5` | `1`–`50` | ⭕ | `>= 1` | Number of chunks retrieved per query | RAG / retriever |
| `RAG_CHUNK_SIZE` | int | `800` | `100`–`4000` | ⭕ | `> RAG_CHUNK_OVERLAP` | Chunk size (characters) | RAG / chunker |
| `RAG_CHUNK_OVERLAP` | int | `120` | `0`–`RAG_CHUNK_SIZE-1` | ⭕ | `>= 0` and `< RAG_CHUNK_SIZE` | Overlap between consecutive chunks | RAG / chunker |
| `RAG_MIN_SCORE` | float | `0.2` | `0.0`–`1.0` | ⭕ | `0.0 <= x <= 1.0` | Retrieval score below which the assistant **refuses** ("insufficient context") | RAG / grounding |

### 2.8 Frontend (Vite — build-time, browser-exposed)

| Name | Type | Default | Allowed values | Req? | Validation rule | Description | Sub-system |
|------|------|---------|----------------|------|-----------------|-------------|------------|
| `VITE_API_BASE_URL` | url(str) | `http://localhost:8000/api/v1` | absolute `http(s)://…/api/v1` URL | ✅ (frontend) | valid absolute URL; Zod-validated in `src/lib` env module | Base URL the Axios client targets | Frontend / api client |

---

## 3. `Settings` model (backend)

```python
# app/core/config.py  (Pydantic v2 + pydantic-settings)
from typing import Literal
from pydantic import Field, field_validator, model_validator, AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8",
        case_sensitive=True, extra="forbid",   # unknown vars fail fast
    )

    # --- App ---
    ENV: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG","INFO","WARNING","ERROR","CRITICAL"] = "INFO"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    API_V1_PREFIX: str = "/api/v1"

    # --- Provider selectors (canon §3) ---
    LLM_PROVIDER: Literal["openai","gemini","mock"] = "openai"
    EMBEDDING_PROVIDER: Literal["openai","gemini","sentence_transformer"] = "openai"
    VECTOR_DB: Literal["faiss","chroma","pinecone"] = "faiss"
    MODEL_ARCH: Literal["densenet121","efficientnet_b0"] = "densenet121"
    AUTH_PROVIDER: Literal["jwt"] = "jwt"
    STORAGE_PROVIDER: Literal["mongodb"] = "mongodb"
    CACHE_PROVIDER: Literal["memory","redis"] = "memory"
    TASK_QUEUE: Literal["inprocess","celery"] = "inprocess"

    # --- Keys & models ---
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # --- Data stores ---
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "aimip"
    REDIS_URL: str = "redis://localhost:6379/0"
    PINECONE_API_KEY: str = ""

    # --- Auth / security ---
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: Literal["HS256","HS384","HS512"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, gt=0, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, gt=0, le=90)
    MAX_LOGIN_ATTEMPTS: int = Field(5, ge=1, le=20)
    LOCKOUT_MINUTES: int = Field(15, gt=0, le=1440)

    # --- ML / storage paths ---
    MODEL_PATH: str = "./data/weights/model.pt"
    UPLOAD_PATH: str = "./data/uploads"
    GRADCAM_PATH: str = "./data/gradcam"
    VECTOR_INDEX_PATH: str = "./data/vector_index"
    PDF_PATH: str = "./data/pdfs"
    MAX_UPLOAD_SIZE: int = Field(10_485_760, gt=0, le=52_428_800)
    ALLOWED_IMAGE_TYPES: list[str] = ["image/png", "image/jpeg"]

    # --- RAG ---
    RAG_TOP_K: int = Field(5, ge=1, le=50)
    RAG_CHUNK_SIZE: int = Field(800, ge=100, le=4000)
    RAG_CHUNK_OVERLAP: int = Field(120, ge=0)
    RAG_MIN_SCORE: float = Field(0.2, ge=0.0, le=1.0)

    # ---------------- fail-fast cross-field validation ----------------
    @field_validator("CORS_ORIGINS", "ALLOWED_IMAGE_TYPES", mode="before")
    @classmethod
    def _split_csv(cls, v):
        return [s.strip() for s in v.split(",")] if isinstance(v, str) else v

    @model_validator(mode="after")
    def _validate_consistency(self) -> "Settings":
        # 1) Provider keys (canon §5 example: openai needs OPENAI_API_KEY)
        if "openai" in (self.LLM_PROVIDER, self.EMBEDDING_PROVIDER) and not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required when a provider is 'openai'")
        if "gemini" in (self.LLM_PROVIDER, self.EMBEDDING_PROVIDER) and not self.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required when a provider is 'gemini'")
        if self.VECTOR_DB == "pinecone" and not self.PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY is required when VECTOR_DB=pinecone")

        # 2) Redis-backed selectors need REDIS_URL
        if (self.CACHE_PROVIDER == "redis" or self.TASK_QUEUE == "celery") and not self.REDIS_URL:
            raise ValueError("REDIS_URL is required for CACHE_PROVIDER=redis / TASK_QUEUE=celery")

        # 3) Chunk overlap must be smaller than chunk size
        if self.RAG_CHUNK_OVERLAP >= self.RAG_CHUNK_SIZE:
            raise ValueError("RAG_CHUNK_OVERLAP must be < RAG_CHUNK_SIZE")

        # 4) Production safety
        if self.ENV == "production":
            if self.JWT_SECRET == "change-me" or len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be a strong non-default value in production")
            if "*" in self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS must not be '*' in production")
        return self
```

`extra="forbid"` means a typo'd or unknown ENV var is a startup error — no silent misconfig.

---

## 4. Fail-fast validation summary

Validation runs the moment `Settings()` is constructed (before the app serves traffic). The
process exits non-zero and stays out of the LB rotation ([28_Deployment](28_Deployment.md) §7).

| Rule | Trigger | Error |
|------|---------|-------|
| Enum membership | any selector set to an unlisted value | `Input should be 'openai', 'gemini' or 'mock'` (etc.) |
| **OpenAI key** | `LLM_PROVIDER=openai` **or** `EMBEDDING_PROVIDER=openai` with empty `OPENAI_API_KEY` | `OPENAI_API_KEY is required when a provider is 'openai'` |
| **Gemini key** | `LLM_PROVIDER=gemini` or `EMBEDDING_PROVIDER=gemini` with empty `GEMINI_API_KEY` | `GEMINI_API_KEY is required when a provider is 'gemini'` |
| **Pinecone key** | `VECTOR_DB=pinecone` with empty `PINECONE_API_KEY` | `PINECONE_API_KEY is required when VECTOR_DB=pinecone` |
| **Redis URL** | `CACHE_PROVIDER=redis` or `TASK_QUEUE=celery` with empty `REDIS_URL` | `REDIS_URL is required …` |
| RAG bounds | `RAG_CHUNK_OVERLAP >= RAG_CHUNK_SIZE` | `RAG_CHUNK_OVERLAP must be < RAG_CHUNK_SIZE` |
| Prod JWT | `ENV=production` and `JWT_SECRET` is `change-me` / too short | `JWT_SECRET must be a strong non-default value in production` |
| Prod CORS | `ENV=production` and `CORS_ORIGINS` contains `*` | `CORS_ORIGINS must not be '*' in production` |
| Numeric bounds | out-of-range int/float (e.g. `ACCESS_TOKEN_EXPIRE_MINUTES=0`) | Pydantic field error |
| Unknown var | any ENV name not in the model | `extra fields not permitted` |

This is exactly the behavior mandated by [`_CANON.md`](_CANON.md) §5:
*"`LLM_PROVIDER=openai` with empty `OPENAI_API_KEY` raises at startup."* It is covered by tests
in [27_Testing_Strategy](27_Testing_Strategy.md) (config unit tests + provider-swap test).

---

## 5. Configuration precedence

Highest wins (pydantic-settings resolution order):

1. **Explicit constructor args** — used by tests (`Settings(LLM_PROVIDER="mock", …)`,
   [27_Testing_Strategy](27_Testing_Strategy.md) §4).
2. **Process environment variables** — how containers, CI, and secret managers inject config
   ([28_Deployment](28_Deployment.md) §6; [29_Docker](29_Docker.md) §4 `environment:` overrides;
   [30_CICD](30_CICD.md) job `env:`).
3. **`.env` file** — local development only (gitignored).
4. **Model defaults** — the canon §5 defaults baked into `Settings`.

Practical consequences:
- In compose, the `environment:` block (e.g. `MONGODB_URI: mongodb://mongo:27017`) **overrides**
  the `.env` localhost default because process env beats the file ([29_Docker](29_Docker.md) §4.1).
- In CI, the job `env:` selects deterministic `mock`/`faiss` adapters regardless of any `.env`
  ([30_CICD](30_CICD.md) §3).
- Production injects secrets from the secret manager as process env — never from a committed file.

---

## 6. `.env.example` layout

Two example files ship (`backend/.env.example`, `frontend/.env.example`,
[`_CANON.md`](_CANON.md) §4). They contain **every** variable with safe placeholder/dev values
and **empty** secrets. The real `.env` is gitignored and never committed
([28_Deployment](28_Deployment.md) §6).

### 6.1 `backend/.env.example`

```dotenv
# ================= App =================
ENV=development                     # development|staging|production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
API_V1_PREFIX=/api/v1

# ============ Providers (selectors — canon §3) ============
LLM_PROVIDER=openai                 # openai|gemini|mock
EMBEDDING_PROVIDER=openai           # openai|gemini|sentence_transformer
VECTOR_DB=faiss                     # faiss|chroma|pinecone
MODEL_ARCH=densenet121              # densenet121|efficientnet_b0
AUTH_PROVIDER=jwt
STORAGE_PROVIDER=mongodb
CACHE_PROVIDER=memory               # memory|redis
TASK_QUEUE=inprocess                # inprocess|celery

# ================= Keys & models =================
OPENAI_API_KEY=                     # required iff any provider = openai
GEMINI_API_KEY=                     # required iff any provider = gemini
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# ================= Data stores =================
MONGODB_URI=mongodb://localhost:27017
DB_NAME=aimip
REDIS_URL=redis://localhost:6379/0  # required iff CACHE_PROVIDER=redis or TASK_QUEUE=celery
PINECONE_API_KEY=                   # required iff VECTOR_DB=pinecone

# ================= Auth / security =================
JWT_SECRET=change-me                # MUST be strong & non-default in production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15

# ================= ML / storage paths =================
MODEL_PATH=./data/weights/model.pt
UPLOAD_PATH=./data/uploads
GRADCAM_PATH=./data/gradcam
VECTOR_INDEX_PATH=./data/vector_index
PDF_PATH=./data/pdfs
MAX_UPLOAD_SIZE=10485760            # bytes (10 MB)
ALLOWED_IMAGE_TYPES=image/png,image/jpeg

# ================= RAG =================
RAG_TOP_K=5
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
RAG_MIN_SCORE=0.2
```

### 6.2 `frontend/.env.example`

```dotenv
# Only VITE_-prefixed vars are exposed to the browser bundle (build-time).
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 6.3 Quick-start recipes

```dotenv
# Fully offline / no external services (great for the current Docker-less dev machine)
LLM_PROVIDER=mock
EMBEDDING_PROVIDER=sentence_transformer
VECTOR_DB=faiss
CACHE_PROVIDER=memory
TASK_QUEUE=inprocess
# (no OPENAI_API_KEY / REDIS_URL needed)
```

```dotenv
# Production-like (Atlas + Redis + OpenAI)
ENV=production
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-********
VECTOR_DB=faiss
CACHE_PROVIDER=redis
TASK_QUEUE=celery
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<64-char random secret>
CORS_ORIGINS=https://app.example.com
```

---

## 7. Cross-references

- Provider ports/adapters the selectors choose: [`_CANON.md`](_CANON.md) §3.
- How these vars flow into containers and secret managers:
  [28_Deployment](28_Deployment.md) §1, §6 and [29_Docker](29_Docker.md) §4.
- How CI injects deterministic values and scans for leaked secrets:
  [30_CICD](30_CICD.md) §3, §4.4.
- Tests that assert fail-fast + provider swap: [27_Testing_Strategy](27_Testing_Strategy.md) §6.5.
- Auth/security semantics of the JWT/lockout vars: [20_Authorization_RBAC](20_Authorization_RBAC.md).
