# AIMIP — Canonical Source of Truth (CANON)

> This file is the single source of truth for all documentation. Every doc MUST use
> these exact names, paths, ENV vars, endpoints, collections, and interfaces. Do not
> invent alternatives. Cross-link docs with relative paths (e.g. `[SRS](02_Software_Requirements_Specification.md)`).
> This file itself is an internal reference and is NOT one of the 42 deliverable docs.

## 0. Product

- **Name:** Advanced AI Medical Intelligence Platform (**AIMIP**)
- **Type:** Enterprise AI healthcare SaaS (clinical **decision-support**, NOT a medical device).
- **Core capabilities:** chest X-ray pneumonia classification → Explainable AI (Grad-CAM)
  → LLM-generated medical report → RAG medical knowledge assistant, behind JWT auth,
  persisted in MongoDB, with a premium React frontend, analytics, Docker, CI, observability.
- **Disclaimer (must appear in vision/security/report/README):** outputs are informational,
  not a diagnosis; a licensed clinician must review all results. No PHI should be uploaded
  without consent; the platform is not FDA/CE cleared.
- **Copyright holder for LICENSE:** `Copyright (c) 2026 DTable Analytics`. License = MIT.

## 1. Tech stack (authoritative)

**Backend:** Python 3.11+ (dev machine has 3.11.8 — target 3.11+, NOT 3.12), FastAPI,
Pydantic v2 + pydantic-settings, Motor (async MongoDB), PyTorch + torchvision, Pillow,
OpenCV (opencv-python-headless), NumPy, scikit-learn, PyMuPDF (fitz), sentence-transformers,
faiss-cpu, chromadb, openai, google-generativeai, python-jose[cryptography], passlib[bcrypt],
python-multipart, uvicorn[standard], redis, celery, prometheus-client, structlog, httpx,
pytest, pytest-asyncio, ruff, mypy. (TensorFlow and LlamaIndex are intentionally NOT used.)

**Frontend:** React 19, Vite, TypeScript, TailwindCSS, Framer Motion, TanStack Query
(server state), Zustand (UI/client state), React Hook Form + Zod, Axios, React Router v6,
Recharts, Lucide-react, ESLint + Prettier, Vitest + React Testing Library.

**Infra:** MongoDB Atlas, Redis, Docker + docker-compose, nginx (frontend serve + reverse
proxy), GitHub Actions. Docker is NOT installed on the current dev machine (files authored, run later).

## 2. Architecture style

Clean / Hexagonal (Ports & Adapters). Dependency direction:
`domain ← application ← infrastructure ← interface`. Business logic (application/domain)
depends only on **ports** (ABCs); concrete **adapters** are chosen at startup by **factories**
reading ENV. Patterns: Repository, Service layer, Factory, Strategy/Provider, Dependency
Injection (FastAPI Depends + a composition-root container), Builder (report assembly),
Configuration-driven design. SOLID throughout.

## 3. Provider ports & ENV selectors (NEVER call a vendor SDK from business logic)

| Port (ABC)          | ENV var              | Adapters                                    | Key methods |
|---------------------|----------------------|---------------------------------------------|-------------|
| `AIProvider`        | `LLM_PROVIDER`       | `openai` · `gemini` · `mock`                | `generate(prompt, system=None, **opts) -> str`, `stream(...)` |
| `EmbeddingProvider` | `EMBEDDING_PROVIDER` | `openai` · `gemini` · `sentence_transformer`| `embed(texts: list[str]) -> list[list[float]]`, `dimension: int` |
| `VectorStore`       | `VECTOR_DB`          | `faiss` · `chroma` · `pinecone` (optional)  | `add(ids, vectors, metadatas)`, `search(vector, k, filter=None)`, `persist()`, `load()` |
| `Classifier`        | `MODEL_ARCH`         | `densenet121` · `efficientnet_b0`           | `build()`, `predict(tensor) -> logits`, `target_layer` (for Grad-CAM) |
| `AuthProvider`      | `AUTH_PROVIDER`      | `jwt` (future: oauth2, keycloak)            | `create_access`, `create_refresh`, `verify`, `rotate` |
| `StorageProvider`   | `STORAGE_PROVIDER`   | `mongodb` (future: postgres, s3 for blobs)  | repository access + `save_blob/get_blob/delete_blob` |
| `CacheProvider`     | `CACHE_PROVIDER`     | `memory` · `redis`                          | `get`, `set(ttl)`, `delete` |
| `TaskQueue`         | `TASK_QUEUE`         | `inprocess` · `celery`                      | `enqueue(job_name, payload)`, `schedule(...)` |

Each has a factory `get_<x>_provider(settings)` in `infrastructure/providers/<x>/factory.py`.
Every port ships a **shared contract test** in `tests/contract/` that all adapters must pass.
The provider swap (`.env` change only) is itself an automated test.

## 4. Folder structure (monorepo)

```
AI_Prediction_System/
├── backend/
│   ├── app/
│   │   ├── main.py                     # app factory, lifespan, DI wiring, router mount
│   │   ├── core/                       # config.py (Settings), logging.py, security.py, exceptions.py, container.py
│   │   ├── domain/
│   │   │   ├── entities/               # User, Prediction, Report, Document, ChatMessage ...
│   │   │   ├── value_objects/          # Role, RiskLevel, Confidence ...
│   │   │   └── ports/                  # AIProvider, EmbeddingProvider, VectorStore, Classifier,
│   │   │                               #   AuthProvider, StorageProvider, CacheProvider, TaskQueue, *Repository
│   │   ├── application/
│   │   │   ├── services/               # AuthService, PredictionService, ReportService, RagService,
│   │   │   │                           #   DocumentService, AnalyticsService, UserService
│   │   │   └── dto/                    # internal data-transfer objects
│   │   ├── infrastructure/
│   │   │   ├── db/                     # mongo client, indexes, repositories (Repository pattern)
│   │   │   ├── providers/{llm,embeddings,vector_db,cache,task_queue}/  # adapters + factory.py
│   │   │   ├── ml/{classifier,inference,gradcam,training}/
│   │   │   ├── rag/                    # loader, cleaner, chunker, ingest, retriever, reranker, pipeline
│   │   │   ├── auth/                   # jwt adapter
│   │   │   └── storage/                # mongodb storage adapter
│   │   ├── interface/
│   │   │   ├── api/v1/                 # routers: auth, predict, history, reports, chat, documents,
│   │   │   │                           #   analytics, users, settings, health
│   │   │   ├── schemas/                # pydantic request/response models
│   │   │   ├── middleware/             # request_id, timing, rate_limit, error_handler, security_headers
│   │   │   └── dependencies.py         # FastAPI DI providers (get_current_user, require_role, get_*_service)
│   │   └── workers/                    # celery app + tasks (ingest, train, report_regen)
│   ├── tests/{unit,integration,contract}/
│   ├── scripts/                        # seed_db.py, ingest_docs.py, train.py entrypoints
│   ├── pyproject.toml / requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                        # providers, router, query client
│   │   ├── pages/                      # Landing, Login, Register, Dashboard, Prediction, History,
│   │   │                               #   Analytics, KnowledgeAssistant, Documents, Settings, Profile, NotFound
│   │   ├── features/{auth,prediction,history,analytics,chat,documents}/
│   │   ├── components/{ui,layout,charts}/
│   │   ├── hooks/  lib/ (api client, axios interceptors)  store/ (zustand)  styles/  types/
│   ├── package.json / vite.config.ts / tailwind.config.js / nginx.conf
│   ├── Dockerfile
│   └── .env.example
├── docs/                               # the 38 numbered docs (00–37)
├── data/                               # gitignored: uploads/, gradcam/, vector_index/, pdfs/, weights/
├── docker-compose.yml
├── .github/workflows/ci.yml
├── README.md · CHANGELOG.md · CONTRIBUTING.md · LICENSE · .gitignore
```

## 5. ENV variables (canonical — documented in 31_Environment_Configuration.md)

```
# App
ENV=development                     # development|staging|production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
API_V1_PREFIX=/api/v1
# Providers (selectors)
LLM_PROVIDER=openai                 # openai|gemini|mock
EMBEDDING_PROVIDER=openai           # openai|gemini|sentence_transformer
VECTOR_DB=faiss                     # faiss|chroma|pinecone
MODEL_ARCH=densenet121             # densenet121|efficientnet_b0
AUTH_PROVIDER=jwt
STORAGE_PROVIDER=mongodb
CACHE_PROVIDER=memory               # memory|redis
TASK_QUEUE=inprocess                # inprocess|celery
# Keys
OPENAI_API_KEY=
GEMINI_API_KEY=
LLM_MODEL=gpt-4o-mini               # provider-specific default model id
EMBEDDING_MODEL=text-embedding-3-small
# Data stores
MONGODB_URI=mongodb://localhost:27017
DB_NAME=aimip
REDIS_URL=redis://localhost:6379/0
PINECONE_API_KEY=
# Auth / security
JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15
# ML / storage paths
MODEL_PATH=./data/weights/model.pt
UPLOAD_PATH=./data/uploads
GRADCAM_PATH=./data/gradcam
VECTOR_INDEX_PATH=./data/vector_index
PDF_PATH=./data/pdfs
MAX_UPLOAD_SIZE=10485760            # bytes (10 MB)
ALLOWED_IMAGE_TYPES=image/png,image/jpeg
# RAG
RAG_TOP_K=5
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
RAG_MIN_SCORE=0.2
# Frontend
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Config fails fast: e.g. `LLM_PROVIDER=openai` with empty `OPENAI_API_KEY` raises at startup.

## 6. MongoDB collections (documented in 17_Database_Design.md)

- **users**: `_id, email(unique idx), password_hash, full_name, role(admin|doctor|user),
  is_active, failed_login_attempts, locked_until, last_login, created_at, updated_at`
- **refresh_tokens**: `_id, user_id, jti(unique), token_hash, user_agent, ip, expires_at,
  revoked, created_at` (TTL index on expires_at)
- **predictions**: `_id, user_id, image_path, model_arch, model_version, predicted_class,
  confidence, probabilities{NORMAL,PNEUMONIA}, gradcam{original,heatmap,overlay}, ood_flag,
  status(pending|completed|failed), idempotency_key, created_at`
- **reports**: `_id, prediction_id, user_id, llm_provider, llm_model, content_markdown,
  sections{summary,findings,possible_condition,medical_explanation,recommendations,risk_level,disclaimer},
  risk_level(low|moderate|high), created_at`
- **documents**: `_id, filename, title, source(WHO|NIH|research|other), mime, pages, status
  (uploaded|processing|indexed|failed), chunk_count, uploaded_by, created_at`
- **embeddings_metadata**: `_id, document_id, chunk_id, chunk_index, text, page, vector_id,
  embedding_provider, dimension, created_at`
- **chat_sessions**: `_id, user_id, title, created_at, updated_at`
- **chat_history**: `_id, session_id, user_id, role(user|assistant), message, citations[
  {document_id, chunk_id, score}], created_at`
- **audit_logs**: `_id, actor_id, action, resource_type, resource_id, ip, user_agent,
  metadata, created_at` (append-only; access to PHI logged here)

## 7. REST API (versioned under `/api/v1`; documented in 18_API_Design.md)

Error envelope = **RFC 7807** `{type, title, status, detail, instance, errors?}`.
List envelope = `{items, page, size, total, pages}`. Auth = `Authorization: Bearer <access>`.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` (rotation),
  `POST /auth/logout`, `GET /auth/me`
- **Predict:** `POST /predict` (multipart `file`, header `Idempotency-Key`) → prediction +
  gradcam URLs + report; `GET /predict/{id}`
- **History:** `GET /history?page&size&from&to`
- **Reports:** `GET /reports/{prediction_id}`, `POST /reports/{prediction_id}/regenerate`
- **Chat/RAG:** `POST /chat` `{session_id?, message}` → `{session_id, answer, citations[]}`;
  `GET /chat/sessions`; `GET /chat/sessions/{id}`
- **Documents:** `POST /documents` (multipart pdf → async ingest job), `GET /documents`,
  `DELETE /documents/{id}`
- **Analytics:** `GET /analytics/overview`, `/analytics/trends?interval=day|week`,
  `/analytics/disease-distribution`, `/analytics/confidence-distribution`, `/analytics/recent-activity`
- **Users (admin):** `GET /users`, `GET /users/{id}`, `PATCH /users/{id}`, `DELETE /users/{id}`
- **Settings:** `GET /settings`, `PATCH /settings`
- **Ops (no prefix):** `GET /health/live`, `GET /health/ready`, `GET /metrics` (Prometheus), `GET /docs` (Swagger)

## 8. RBAC (documented in 20_Authorization_RBAC.md)

Roles: `user` (own predictions/history/chat/reports), `doctor` (all above + read all
predictions/reports for review), `admin` (full: users, settings, documents, audit logs).
Enforced via `require_role(...)` dependency. Permission matrix lives in doc 20.

## 9. AI/ML specifics

- Default `MODEL_ARCH=densenet121` (torchvision, ImageNet-pretrained), 2-class head
  `[NORMAL, PNEUMONIA]`; alt `efficientnet_b0`. Input 224×224, ImageNet mean/std.
- **Dataset:** Kaggle "Chest X-Ray Images (Pneumonia)" (Kermany et al.), train/val/test.
- **Training:** transfer learning (freeze backbone → fine-tune head → optional unfreeze),
  AdamW, cross-entropy with class weights, early stopping, metrics: accuracy, precision,
  recall, F1, AUROC, confusion matrix; checkpoint → `MODEL_PATH`. Runnable but optional
  (pretrained-inference fallback lets the app work without training or the dataset).
- **Inference:** runs in a threadpool executor (never blocks the event loop); returns
  predicted_class, confidence (softmax max), full probabilities. **OOD guard** rejects
  non-chest-X-ray uploads (heuristic/threshold) → `ood_flag`.
- **Grad-CAM:** forward/backward hooks on `Classifier.target_layer`; outputs original,
  heatmap, overlay PNGs saved under `GRADCAM_PATH`, served as URLs.
- **LLM report** (Builder): sections summary, findings, possible_condition,
  medical_explanation, recommendations, risk_level, disclaimer; Markdown; via `AIProvider`.
- **RAG:** PyMuPDF load → clean → chunk (size/overlap from ENV) → `EmbeddingProvider.embed`
  → `VectorStore` → hybrid retrieve (dense + BM25) → rerank → grounded answer with
  citations; refuses when retrieval score < `RAG_MIN_SCORE` ("insufficient context").

## 10. Frontend pages & design

Pages: Landing, Login, Register, Dashboard, Prediction, History, Analytics,
KnowledgeAssistant (chat), Documents, Settings, Profile, NotFound.
Design: medical palette — primary blue `#0EA5E9`, teal `#14B8A6`, risk semantics
green/amber/red; glassmorphism cards; Inter typography; 8px spacing scale; dark mode
(prefers-color-scheme + toggle); WCAG 2.1 AA; loading skeletons, empty states, error
boundaries. State: TanStack Query (server) + Zustand (UI). Forms: RHF + Zod. Charts: Recharts.

## 11. Non-functional targets (used in SRS 02)

Availability 99.5%; API p95 < 300 ms (excl. model/LLM); prediction end-to-end < 6 s p95;
horizontal-scalable stateless API; test coverage ≥ 80% backend; OWASP ASVS L1; structured
logs + metrics + tracing; 12-factor config; RPO/RTO documented in deployment.
