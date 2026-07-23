# 29 — Docker

> Part of the **Advanced AI Medical Intelligence Platform (AIMIP)** documentation set.
> Canonical names, ENV vars, ports and services are defined in [`_CANON.md`](_CANON.md).
> Related: [27_Testing_Strategy](27_Testing_Strategy.md) · [28_Deployment](28_Deployment.md) ·
> [30_CICD](30_CICD.md) · [31_Environment_Configuration](31_Environment_Configuration.md).

**Disclaimer:** AIMIP is clinical **decision-support**, not a medical device; outputs are
informational, not a diagnosis, and a licensed clinician must review all results.

> **Environment note:** Docker is **not installed** on the current dev machine
> ([`_CANON.md`](_CANON.md) §1). The `Dockerfile`s and `docker-compose.yml` below are the
> **authoritative content** for the files `backend/Dockerfile`, `frontend/Dockerfile`, and the
> repo-root `docker-compose.yml` ([`_CANON.md`](_CANON.md) §4). They are committed now and
> **run later** on a Docker-capable machine or CI runner. This document is the reference; the
> real files carry identical content.

---

## 1. Image layout

| Image | Base | Purpose | Runs |
|-------|------|---------|------|
| **backend** | `python:3.11-slim` | FastAPI API **and** Celery worker (same image, different entrypoint) | `uvicorn app.main:app` / `celery -A app.workers.celery_app worker` |
| **frontend** | multi-stage: `node:20-alpine` → `nginx:1.27-alpine` | Build React 19 (Vite) bundle, serve via nginx + reverse proxy | `nginx -g "daemon off;"` |

Python is pinned to **3.11** ([`_CANON.md`](_CANON.md) §1 — target 3.11+, NOT 3.12). Both
images run as a **non-root** user and declare a **healthcheck**.

---

## 2. Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
# ---- backend/Dockerfile ----
# Python 3.11 (canon §1: target 3.11+, NOT 3.12)
FROM python:3.11-slim AS base

# 12-factor: no .pyc, unbuffered stdout for structlog JSON logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps: build tools for wheels + libs for OpenCV(headless)/Pillow/PyMuPDF.
# curl is used by the container HEALTHCHECK.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libglib2.0-0 \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application code
COPY . .

# Non-root user (canon: non-root). Owns app dir + data mount points.
RUN groupadd -r aimip && useradd -r -g aimip -u 1000 aimip \
    && mkdir -p /app/data/uploads /app/data/gradcam /app/data/vector_index \
                /app/data/pdfs /app/data/weights \
    && chown -R aimip:aimip /app
USER aimip

EXPOSE 8000

# Healthcheck hits the liveness endpoint (canon §7: GET /health/live)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health/live || exit 1

# API process (worker overrides this command in compose, see below)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Notes:
- `opencv-python-headless` ([`_CANON.md`](_CANON.md) §1) avoids GUI libs; only `libglib2.0-0`
  and `libgomp1` (OpenMP for torch/OpenCV) are needed at runtime.
- Data paths match the ENV defaults ([`_CANON.md`](_CANON.md) §5): `UPLOAD_PATH=./data/uploads`,
  `GRADCAM_PATH=./data/gradcam`, `VECTOR_INDEX_PATH=./data/vector_index`, `PDF_PATH=./data/pdfs`,
  `MODEL_PATH=./data/weights/model.pt`. These are mounted as volumes in compose (§4).
- A two-stage variant (builder wheels → slim runtime) can further shrink the image; the
  single-stage form above is kept readable and is production-safe.

---

## 3. Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# ---- frontend/Dockerfile ----
# Stage 1: build the React 19 / Vite / TypeScript bundle
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_BASE_URL is baked at build time (canon §5). Override per environment.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build          # -> /app/dist

# Stage 2: serve static assets via nginx + reverse proxy to backend
FROM nginx:1.27-alpine AS runtime

# Custom config: SPA fallback + /api/v1 reverse proxy (see 28_Deployment §4)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Run nginx as the built-in non-root 'nginx' user on an unprivileged port-safe setup.
# (nginx:alpine master starts as root to bind :80 then drops to 'nginx' for workers.)
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

The `nginx.conf` referenced here is `frontend/nginx.conf` ([`_CANON.md`](_CANON.md) §4); its
reverse-proxy content (SPA fallback, `/api/v1` proxy to `backend:8000`, `client_max_body_size
10m` matching `MAX_UPLOAD_SIZE`) is shown in [28_Deployment](28_Deployment.md) §4.

---

## 4. `docker-compose.yml` (repo root)

Services: **backend**, **frontend**, **mongo**, **redis**, **worker**
([`_CANON.md`](_CANON.md) §4). For local development, `mongo` and `redis` run as containers; in
staging/production Mongo is **Atlas** and Redis is managed ([28_Deployment](28_Deployment.md) §3).

```yaml
# ---- docker-compose.yml ----
name: aimip

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: aimip/backend:local
    env_file: ./backend/.env
    environment:
      # Compose-local overrides so services find each other on the network.
      MONGODB_URI: mongodb://mongo:27017
      DB_NAME: aimip
      REDIS_URL: redis://redis:6379/0
      CACHE_PROVIDER: redis
      TASK_QUEUE: celery
      CORS_ORIGINS: http://localhost:5173,http://localhost
    ports:
      - "8000:8000"
    volumes:
      - uploads:/app/data/uploads          # UPLOAD_PATH
      - gradcam:/app/data/gradcam          # GRADCAM_PATH
      - vector_index:/app/data/vector_index # VECTOR_INDEX_PATH
      - pdfs:/app/data/pdfs                # PDF_PATH
      - weights:/app/data/weights          # MODEL_PATH dir
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8000/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
    networks: [aimip-net]
    restart: unless-stopped

  worker:
    image: aimip/backend:local             # same image as backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file: ./backend/.env
    environment:
      MONGODB_URI: mongodb://mongo:27017
      DB_NAME: aimip
      REDIS_URL: redis://redis:6379/0
      CACHE_PROVIDER: redis
      TASK_QUEUE: celery
    command: ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=INFO"]
    volumes:
      - uploads:/app/data/uploads
      - gradcam:/app/data/gradcam
      - vector_index:/app/data/vector_index
      - pdfs:/app/data/pdfs
      - weights:/app/data/weights
    depends_on:
      redis:
        condition: service_healthy
      mongo:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "celery", "-A", "app.workers.celery_app", "inspect", "ping", "-d", "celery@$HOSTNAME"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks: [aimip-net]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost:8000/api/v1   # canon §5
    image: aimip/frontend:local
    ports:
      - "5173:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks: [aimip-net]
    restart: unless-stopped

  mongo:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: aimip          # DB_NAME
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"                       # dev convenience; omit in prod
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks: [aimip-net]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"                         # dev convenience; omit in prod
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    networks: [aimip-net]
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
  uploads:
  gradcam:
  vector_index:
  pdfs:
  weights:

networks:
  aimip-net:
    driver: bridge
```

### 4.1 Design notes

- **Service DNS:** compose puts all services on `aimip-net`; the backend reaches Mongo/Redis by
  service name (`mongo`, `redis`), and nginx proxies to `backend:8000`
  ([28_Deployment](28_Deployment.md) §4). This is why the compose `environment:` block
  overrides `MONGODB_URI`/`REDIS_URL` from the canon localhost defaults ([`_CANON.md`](_CANON.md) §5).
- **`depends_on: condition: service_healthy`** ensures the API/worker start only after Mongo and
  Redis pass their healthchecks — reinforcing the fail-fast startup contract
  ([28_Deployment](28_Deployment.md) §1, §7).
- **Backend healthcheck** uses `GET /health/ready` (dependencies ready) so a replica is only
  "healthy" when Mongo/Redis/model are reachable; the Dockerfile's own HEALTHCHECK uses the
  lighter `GET /health/live` ([`_CANON.md`](_CANON.md) §7).
- **Volumes** map exactly to the canon ML/storage paths ([`_CANON.md`](_CANON.md) §5) so
  uploads, Grad-CAM overlays, the vector index, PDFs and model weights persist across restarts
  and are shared between the **backend** and **worker** (which does ingest/train/report_regen,
  [`_CANON.md`](_CANON.md) §4).
- **worker** uses the identical image with an overridden `command` (12-factor admin/process
  parity, [28_Deployment](28_Deployment.md) §1).
- **Provider swap** ([`_CANON.md`](_CANON.md) §3) is just ENV: set `LLM_PROVIDER`,
  `EMBEDDING_PROVIDER`, `VECTOR_DB`, etc. in `backend/.env` — no compose change needed.
- **Production posture:** drop the host `ports:` mappings for `mongo`/`redis`, use Atlas +
  managed Redis (remove those services), and keep `backend`/`frontend`/`worker`. See
  [28_Deployment](28_Deployment.md) §3.

---

## 5. `.dockerignore`

To keep images small and reproducible (mirrors `.gitignore`, [`_CANON.md`](_CANON.md) §4):

```gitignore
# backend/.dockerignore
.venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/
data/            # uploads, gradcam, vector_index, pdfs, weights are volumes
.env
tests/
```

```gitignore
# frontend/.dockerignore
node_modules/
dist/
.env
coverage/
```

---

## 6. Commands (run on a Docker-capable machine)

```bash
# Build all images
docker compose build

# Bring up the full stack (backend + worker + frontend + mongo + redis)
docker compose up -d

# Only the datastores (useful for local test runs — see 27_Testing_Strategy §12)
docker compose up -d mongo redis

# Tail logs
docker compose logs -f backend worker

# Check health status
docker compose ps

# Run the backend test suite inside the image (deterministic mock providers)
docker compose run --rm backend pytest --cov=app --cov-fail-under=80

# One-off admin processes (12-factor XII) — canon §4 scripts/
docker compose run --rm backend python scripts/seed_db.py
docker compose run --rm backend python scripts/ingest_docs.py
docker compose run --rm backend python scripts/train.py

# Rebuild just the frontend with a prod API base URL
docker compose build --build-arg VITE_API_BASE_URL=https://app.example.com/api/v1 frontend

# Tear down (keep data volumes)
docker compose down
# Tear down and delete volumes (DESTROYS local Mongo/Redis/uploads)
docker compose down -v
```

---

## 7. Image hardening checklist

- [x] Pinned base tags (`python:3.11-slim`, `node:20-alpine`, `nginx:1.27-alpine`, `mongo:7`, `redis:7-alpine`).
- [x] **Non-root** runtime user in both app images.
- [x] `HEALTHCHECK` in every image / compose service.
- [x] No secrets baked into images — all secrets come from `env_file`/secret manager at run time
      ([28_Deployment](28_Deployment.md) §6).
- [x] `.dockerignore` excludes `.env`, caches, `node_modules`, `data/`.
- [x] Minimal runtime deps (`opencv-python-headless`, only required system libs).
- [x] Multi-stage frontend build → only static assets + nginx ship.
- [x] Image scanning (Trivy) runs in CI before publish ([30_CICD](30_CICD.md)).
