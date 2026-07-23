# 34 — Developer Guide

This guide takes a new contributor from a clean machine to a fully running
**Advanced AI Medical Intelligence Platform (AIMIP)** development environment —
backend API, React frontend, MongoDB, Redis, workers, seed data, PDF ingestion,
model training, and the test suites. It uses the exact names, paths, ENV
variables, and endpoints defined in the [CANON](_CANON.md); see
[Environment Configuration](31_Environment_Configuration.md) for the authoritative
variable reference and [Project Structure](06_Project_Structure.md) for the full
directory map.

> **Clinical disclaimer.** AIMIP outputs are informational and are **not** a
> diagnosis. A licensed clinician must review all results. No PHI is uploaded
> without consent, and the platform is **not** FDA/CE cleared.

> **Docker note.** Docker is **optional** and is **not installed** on the current
> dev machine. Every step below runs the stack natively (Python venv + local
> MongoDB/Redis). The container path is authored but exercised later — see
> [Containerization](28_Containerization_Docker.md) and
> [Deployment](29_Deployment_And_Infrastructure.md).

---

## 1. Prerequisites

| Tool | Version | Purpose | Check |
|------|---------|---------|-------|
| Python | **3.11+** (dev machine runs **3.11.8**, target 3.11 — **not** 3.12) | Backend, ML, workers | `python --version` |
| Node.js | **20+** | Frontend build/dev server | `node --version` |
| npm | 10+ (ships with Node 20) | Frontend package manager | `npm --version` |
| MongoDB | 6+ (local or MongoDB Atlas) | Primary datastore (`DB_NAME=aimip`) | `mongosh --eval "db.runCommand({ping:1})"` |
| Redis | 7+ | Cache + Celery broker/result backend (optional in dev) | `redis-cli ping` → `PONG` |
| Git | 2.40+ | Version control | `git --version` |

Docker Desktop and docker-compose are optional; install them only when you want
to run the containerized stack described in doc 28.

> **Windows note.** On Windows the interpreter is `python`, not `python3`. The dev
> machine ships **Python 3.11.8**. If multiple Pythons are installed, use the
> launcher to pin the version: `py -3.11 --version`. See §13 for more
> Windows-specific guidance.

---

## 2. Clone the repository

```bash
git clone <your-fork-or-origin-url> AI_Prediction_System
cd AI_Prediction_System
```

The monorepo root contains `backend/`, `frontend/`, `docs/`, `data/`,
`docker-compose.yml`, `.github/workflows/ci.yml`, and the root
`README.md · CHANGELOG.md · CONTRIBUTING.md · LICENSE · .gitignore`.

---

## 3. Backend setup (Python 3.11+ venv)

### 3.1 Create and activate a virtual environment

```bash
cd backend

# Windows (PowerShell)
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Windows (Git Bash) / macOS / Linux
python -m venv .venv
source .venv/Scripts/activate   # Git Bash on Windows
# source .venv/bin/activate      # macOS / Linux
```

Confirm the interpreter: `python --version` should print `Python 3.11.8` (or any
3.11.x).

### 3.2 Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
# editable install if pyproject defines the package
pip install -e .
```

The dependency set (per the [CANON](_CANON.md)) includes FastAPI, Pydantic v2 +
pydantic-settings, Motor, PyTorch + torchvision, Pillow, opencv-python-headless,
NumPy, scikit-learn, PyMuPDF (fitz), sentence-transformers, faiss-cpu, chromadb,
openai, google-generativeai, python-jose[cryptography], passlib[bcrypt],
python-multipart, uvicorn[standard], redis, celery, prometheus-client, structlog,
httpx, and the dev tools pytest, pytest-asyncio, ruff, mypy.

> PyTorch is CPU-only by default (see §11 for CUDA). If `pip` cannot resolve
> torch/torchvision for your platform, install them from the official index
> first, then re-run `pip install -r requirements.txt`.

### 3.3 Create the backend `.env`

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

The default `.env.example` boots with fully local, offline-friendly providers.
Minimum to run the app end-to-end without external keys:

```
ENV=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
API_V1_PREFIX=/api/v1

LLM_PROVIDER=mock                 # no key required; deterministic report text
EMBEDDING_PROVIDER=sentence_transformer
VECTOR_DB=faiss
MODEL_ARCH=densenet121
AUTH_PROVIDER=jwt
STORAGE_PROVIDER=mongodb
CACHE_PROVIDER=memory
TASK_QUEUE=inprocess

MONGODB_URI=mongodb://localhost:27017
DB_NAME=aimip
REDIS_URL=redis://localhost:6379/0

JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

MODEL_PATH=./data/weights/model.pt
UPLOAD_PATH=./data/uploads
GRADCAM_PATH=./data/gradcam
VECTOR_INDEX_PATH=./data/vector_index
PDF_PATH=./data/pdfs
MAX_UPLOAD_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/png,image/jpeg

RAG_TOP_K=5
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
RAG_MIN_SCORE=0.2
```

To use real LLMs, set `LLM_PROVIDER=openai` (or `gemini`) and provide the matching
key (`OPENAI_API_KEY` / `GEMINI_API_KEY`), plus `LLM_MODEL` (default
`gpt-4o-mini`) and `EMBEDDING_MODEL` (default `text-embedding-3-small`).

> **Fail fast.** Config validation raises at startup on inconsistent settings —
> for example `LLM_PROVIDER=openai` with an empty `OPENAI_API_KEY`. This is
> intentional; fix the `.env` rather than working around it.

### 3.4 Data directories

The paths above live under the gitignored `data/` folder. They are created on
first use, but you can pre-create them:

```bash
mkdir -p ../data/uploads ../data/gradcam ../data/vector_index ../data/pdfs ../data/weights
```

---

## 4. Start MongoDB and Redis

### 4.1 MongoDB

- **Local:** start `mongod` (or the MongoDB service) listening on
  `mongodb://localhost:27017`. Verify with
  `mongosh --eval "db.runCommand({ping:1})"`.
- **Atlas:** set `MONGODB_URI` to your Atlas SRV connection string and keep
  `DB_NAME=aimip`.

### 4.2 Redis

Redis is only required when `CACHE_PROVIDER=redis` or `TASK_QUEUE=celery`. With
the defaults (`memory` / `inprocess`) you can skip it. To run it locally, start
`redis-server` and confirm `redis-cli ping` returns `PONG`.

---

## 5. Run the backend API

From `backend/` with the venv active and `.env` in place:

```bash
uvicorn app.main:app --reload
```

The app factory in `app/main.py` wires the DI container, mounts the `/api/v1`
routers, and starts the lifespan hooks. It serves on `http://localhost:8000`.

Verify:

| URL | Expectation |
|-----|-------------|
| `http://localhost:8000/health/live` | `200 OK` liveness |
| `http://localhost:8000/health/ready` | `200 OK` once Mongo is reachable |
| `http://localhost:8000/docs` | Swagger UI renders |
| `http://localhost:8000/metrics` | Prometheus exposition text |

All feature routes are versioned under `API_V1_PREFIX` (`/api/v1`); the ops
routes (`/health/*`, `/metrics`, `/docs`) have no prefix. See
[API Design](18_API_Design.md) for the full contract.

---

## 6. Frontend setup (Node 20+ / npm)

Open a second terminal:

```bash
cd frontend
npm install

cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

The frontend `.env` needs one variable pointing at the backend:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Run the dev server:

```bash
npm run dev
```

Vite serves the React 19 SPA on `http://localhost:5173` (the origin already
allowed by the default `CORS_ORIGINS`). The Axios client and interceptors read
`VITE_API_BASE_URL`; TanStack Query manages server state and Zustand manages UI
state. See [Frontend Design System](32_Frontend_Design_System.md) for the design
language and [Frontend Architecture](08_Frontend_Architecture.md) for structure.

Other frontend scripts:

```bash
npm run build      # production build
npm run preview    # preview the production build
npm run lint       # ESLint
npm run test       # Vitest + React Testing Library
```

---

## 7. Workers (Celery)

Workers are only needed when `TASK_QUEUE=celery`. With the default
`TASK_QUEUE=inprocess`, jobs (document ingest, training, report regeneration) run
in-process and no worker is required.

To run the Celery path, set `TASK_QUEUE=celery` and `CACHE_PROVIDER=redis` (Redis
must be running), then from `backend/` with the venv active:

```bash
celery -A app.workers.celery_app worker --loglevel=INFO
# Windows: add --pool=solo if the default prefork pool misbehaves
celery -A app.workers.celery_app worker --loglevel=INFO --pool=solo
```

The Celery app and tasks (`ingest`, `train`, `report_regen`) live in
`app/workers/`. See [Task Queue & Workers](25_Task_Queue_And_Workers.md).

---

## 8. Seeding the database

Seed baseline data (roles, an admin user, reference records) with the entrypoint
script:

```bash
cd backend
python scripts/seed_db.py
```

This creates indexes (unique `email`, TTL on `refresh_tokens.expires_at`, etc. per
[Database Design](17_Database_Design.md)) and an initial admin account. Use the
seeded admin credentials printed to the console to log in from the frontend.

---

## 9. Ingesting PDFs (RAG knowledge base)

Populate the RAG knowledge base so the Knowledge Assistant can answer grounded
questions. Two paths:

**A. CLI ingest** — drop WHO/NIH/research PDFs into `PDF_PATH` (`./data/pdfs`),
then:

```bash
cd backend
python scripts/ingest_docs.py
```

The pipeline runs PyMuPDF load → clean → chunk (`RAG_CHUNK_SIZE=800`,
`RAG_CHUNK_OVERLAP=120`) → `EmbeddingProvider.embed` → `VectorStore` (persisted
to `VECTOR_INDEX_PATH`). A document moves `uploaded → processing → indexed` with a
non-zero `chunk_count`.

**B. API ingest** — as an authenticated admin, `POST /documents` with a multipart
PDF, which enqueues an async ingest job; then `GET /documents` to watch status and
`DELETE /documents/{id}` to remove one.

See [RAG Knowledge Assistant](15_RAG_Knowledge_Assistant.md) for the retrieval and
citation model.

---

## 10. Running training

Training is **optional**. AIMIP ships a **pretrained-inference fallback**, so the
app works without training or the Kaggle dataset. To train the classifier:

1. Download the Kaggle **"Chest X-Ray Images (Pneumonia)"** dataset (Kermany et
   al.) with its `train/val/test` split.
2. Point the training script at the data (see the script's `--help` for flags)
   and run:

```bash
cd backend
python scripts/train.py
```

Transfer learning runs freeze-backbone → fine-tune head → optional unfreeze with
AdamW and class-weighted cross-entropy, early stopping, and reports accuracy,
precision, recall, F1, AUROC, and a confusion matrix. The best checkpoint is
written to `MODEL_PATH` (`./data/weights/model.pt`) and picked up automatically by
inference. See [Machine Learning Pipeline](12_Machine_Learning_Pipeline.md).

> If `MODEL_PATH` has no checkpoint, inference falls back to the
> ImageNet-pretrained backbone with a fresh 2-class head — predictions still run,
> but train for meaningful accuracy.

---

## 11. Tests

From `backend/` with the venv active:

```bash
pytest                              # full suite
pytest tests/unit                   # unit tests
pytest tests/integration            # integration (needs Mongo; Redis if celery)
pytest tests/contract               # shared port contract tests (all adapters)
pytest --cov=app --cov-report=term-missing   # coverage (target >= 80%)
```

The **contract** suite is central to the architecture: every port ships one
shared contract test that all its adapters must pass, and the provider swap (an
`.env` change only) is itself an automated test. See
[Testing Strategy](26_Testing_Strategy.md).

Lint and type-check (the same gates CI enforces):

```bash
ruff check .
mypy app
```

Frontend tests/lint (from `frontend/`):

```bash
npm run test
npm run lint
```

---

## 12. Common developer tasks

| Task | Command / action |
|------|------------------|
| Boot API with reload | `uvicorn app.main:app --reload` (from `backend/`) |
| Boot frontend | `npm run dev` (from `frontend/`) |
| Format + lint backend | `ruff check . && mypy app` |
| Format frontend | `npm run lint` (ESLint + Prettier) |
| Reseed the DB | `python scripts/seed_db.py` |
| Ingest PDFs | `python scripts/ingest_docs.py` |
| Train the model | `python scripts/train.py` |
| Swap LLM provider | edit `.env` → `LLM_PROVIDER=gemini` (+ `GEMINI_API_KEY`); restart uvicorn |
| Swap vector store | edit `.env` → `VECTOR_DB=chroma`; re-ingest |
| Use Redis cache / Celery | `CACHE_PROVIDER=redis`, `TASK_QUEUE=celery`; start Redis + worker |
| Regenerate a report | `POST /reports/{prediction_id}/regenerate` |
| Inspect API contract | open `http://localhost:8000/docs` |
| Add a dependency | update `requirements.txt` / `pyproject.toml`, reinstall |

Provider selection is driven entirely by ENV — business logic never imports a
vendor SDK. To change behavior, change the `.env` selector and restart, never the
service code. See [Provider Adapters](11_Provider_Adapters.md).

---

## 13. Directory quick-reference

```
AI_Prediction_System/
├── backend/
│   ├── app/
│   │   ├── main.py                 # app factory, lifespan, DI wiring, router mount
│   │   ├── core/                   # config.py, logging.py, security.py, exceptions.py, container.py
│   │   ├── domain/                 # entities, value_objects, ports (ABCs)
│   │   ├── application/            # services (Auth, Prediction, Report, Rag, Document, Analytics, User), dto
│   │   ├── infrastructure/         # db, providers/{llm,embeddings,vector_db,cache,task_queue}, ml, rag, auth, storage
│   │   ├── interface/              # api/v1 routers, schemas, middleware, dependencies.py
│   │   └── workers/                # celery app + tasks (ingest, train, report_regen)
│   ├── tests/{unit,integration,contract}/
│   ├── scripts/                    # seed_db.py, ingest_docs.py, train.py
│   ├── pyproject.toml / requirements.txt / Dockerfile / .env.example
├── frontend/
│   ├── src/                        # app, pages, features, components, hooks, lib, store, styles, types
│   ├── package.json / vite.config.ts / tailwind.config.js / nginx.conf / Dockerfile / .env.example
├── docs/                           # numbered docs 00–37
├── data/                           # gitignored: uploads/, gradcam/, vector_index/, pdfs/, weights/
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md · CHANGELOG.md · CONTRIBUTING.md · LICENSE · .gitignore
```

Full detail is in [Project Structure](06_Project_Structure.md).

---

## 14. Windows-specific notes

- **Interpreter name.** Use `python`, not `python3`. Pin the version with the
  launcher: `py -3.11 -m venv .venv`. The dev machine runs **Python 3.11.8**;
  target 3.11+, **not** 3.12.
- **Activate the venv:** `.\.venv\Scripts\Activate.ps1` (PowerShell) or
  `source .venv/Scripts/activate` (Git Bash). If PowerShell blocks the script,
  run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **Copy env files:** `Copy-Item .env.example .env` (PowerShell) instead of `cp`.
- **Celery on Windows:** the prefork pool can fail; start the worker with
  `--pool=solo`.
- **Path separators:** the ENV paths (`./data/...`) are relative and work as-is;
  avoid hardcoding backslashes.
- **Port conflicts:** if `8000` or `5173` is taken, free it or override
  (`uvicorn ... --port 8001`, `npm run dev -- --port 5174`, and update
  `VITE_API_BASE_URL` / `CORS_ORIGINS` accordingly).

More symptom-driven fixes are in [Troubleshooting](36_Troubleshooting.md).

---

## 15. Next steps

- Read the [Contribution Guide](35_Contribution_Guide.md) before opening a PR.
- Skim [System Architecture](03_System_Architecture.md) and
  [Design Patterns](09_Design_Patterns.md) to understand the Clean/Hexagonal
  layering.
- Keep [Troubleshooting](36_Troubleshooting.md) open in a tab for your first run.
- Any change to names, endpoints, ENV, collections, or ports updates the
  [CANON](_CANON.md) first; docs follow.
