# 36 — Troubleshooting

A symptom-driven runbook for the **Advanced AI Medical Intelligence Platform
(AIMIP)**. Find your symptom, confirm the likely cause, apply the fix. All names,
ENV variables, endpoints, and paths follow the [CANON](_CANON.md); pair this with
the [Developer Guide](34_Developer_Guide.md) and
[Environment Configuration](31_Environment_Configuration.md).

> **Golden rule.** AIMIP config **fails fast** on purpose. Most startup errors are
> the app telling you the `.env` is inconsistent — fix the environment rather than
> patching around the validation.

---

## 1. Runbook — symptom → likely cause → fix

### 1.1 Configuration & environment

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| App exits at startup with a config/validation error | `Settings` (pydantic-settings) rejected the `.env`; a required value is missing or malformed | Read the raised field name; set it in `.env`. Recreate from template: `cp .env.example .env`. Restart `uvicorn app.main:app --reload`. |
| `LLM_PROVIDER=openai` but boot raises "missing OPENAI_API_KEY" | Fail-fast guard: provider selected without its key | Set `OPENAI_API_KEY` (or `GEMINI_API_KEY` for `gemini`), or switch to `LLM_PROVIDER=mock` for offline dev. |
| `EMBEDDING_PROVIDER=openai`/`gemini` fails at startup | Embedding provider selected without a key | Provide the matching key, or use `EMBEDDING_PROVIDER=sentence_transformer` (local, no key). |
| Changes to `.env` have no effect | Process not restarted; env cached | Restart the backend (and the Celery worker if running). `--reload` restarts on code, not `.env`. |
| Wrong DB / empty data | `DB_NAME` not `aimip`, or `MONGODB_URI` points elsewhere | Set `MONGODB_URI=mongodb://localhost:27017` and `DB_NAME=aimip`; re-run `python scripts/seed_db.py`. |

### 1.2 Datastore connections

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `/health/ready` returns non-200; Mongo connection timeout | `mongod` not running or wrong `MONGODB_URI` | Start MongoDB; verify `mongosh --eval "db.runCommand({ping:1})"`. For Atlas, whitelist your IP and use the SRV string. |
| Motor "ServerSelectionTimeoutError" | Network/firewall to Mongo, or Atlas IP not allowlisted | Confirm host/port reachable; add your IP in Atlas Network Access; check credentials in the URI. |
| Redis `ConnectionError` / Celery cannot reach broker | `CACHE_PROVIDER=redis` or `TASK_QUEUE=celery` selected but Redis is down | Start `redis-server`; verify `redis-cli ping` → `PONG`; confirm `REDIS_URL=redis://localhost:6379/0`. Or switch back to `CACHE_PROVIDER=memory` / `TASK_QUEUE=inprocess`. |
| App runs but caching seems ignored | Running with `CACHE_PROVIDER=memory` (per-process, non-shared) by design | Expected in dev. Use `redis` for shared/persistent cache. |
| Async document ingest never completes | `TASK_QUEUE=celery` but no worker running | Start the worker: `celery -A app.workers.celery_app worker --loglevel=INFO` (add `--pool=solo` on Windows). Or set `TASK_QUEUE=inprocess`. |

### 1.3 Model, ML & compute

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Log warns "no checkpoint at MODEL_PATH", predictions look random | No trained weights; **pretrained-inference fallback** active | Expected without training. Run `python scripts/train.py` to produce `./data/weights/model.pt`, or accept the ImageNet-pretrained fallback for smoke tests. |
| `FileNotFoundError` for `model.pt` | `MODEL_PATH` wrong, or `data/weights/` missing | Ensure `MODEL_PATH=./data/weights/model.pt` and the directory exists (`mkdir -p data/weights`). |
| CUDA out-of-memory or "CUDA error" during training/inference | GPU present but VRAM insufficient or driver mismatch | Reduce batch size; or force CPU (unset `CUDA_VISIBLE_DEVICES` / set `CUDA_VISIBLE_DEVICES=` empty). Confirm `torch.cuda.is_available()`. |
| Very slow inference / training on CPU | CPU-only PyTorch (default) | Expected. For speed, install a CUDA build of torch/torchvision and use a GPU; otherwise keep batches small. |
| `torch`/`torchvision` install fails | No matching wheel for the platform | Install from the official PyTorch index first, then re-run `pip install -r requirements.txt`. |
| Every upload flagged `ood_flag=true` | OOD guard rejecting non-chest-X-ray images (as designed) | Upload an actual chest X-ray. The UI surfaces the flag and suppresses a confident label — this is a safety feature, not a bug. |
| `MODEL_ARCH` change ignored | Backend not restarted after `.env` edit | Restart uvicorn. Valid values: `densenet121` (default) or `efficientnet_b0`. |

### 1.4 Providers & keys

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 401/invalid-key errors from the LLM at report generation | Bad/expired `OPENAI_API_KEY` or `GEMINI_API_KEY` | Rotate the key; confirm it matches `LLM_PROVIDER`. Test offline with `LLM_PROVIDER=mock`. |
| LLM model-not-found error | `LLM_MODEL` unsupported by the selected provider | Use a valid id (default `gpt-4o-mini` for openai); set `EMBEDDING_MODEL` (default `text-embedding-3-small`) accordingly. |
| Embedding dimension mismatch after provider swap | Vector index built with a different `EMBEDDING_PROVIDER`/dimension | Re-ingest to rebuild the index: `python scripts/ingest_docs.py`. Do not mix embedding providers in one index. |
| Rate-limit / 429 from provider | Too many LLM/embedding calls | Rely on the cache; lower `RAG_TOP_K`; back off and retry (httpx retries). Consider `sentence_transformer` embeddings locally. |
| `VECTOR_DB` swap breaks retrieval | Index persisted under a different store | Set `VECTOR_DB` (`faiss`/`chroma`), delete/rebuild `VECTOR_INDEX_PATH`, re-ingest. |

### 1.5 API, auth & CORS

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Browser console: CORS policy blocked | Frontend origin not in `CORS_ORIGINS` | Add the origin (default `http://localhost:5173`) to `CORS_ORIGINS`; restart backend. If you changed the Vite port, update both `CORS_ORIGINS` and `VITE_API_BASE_URL`. |
| Frontend calls 404 / go to the wrong host | `VITE_API_BASE_URL` wrong | Set `VITE_API_BASE_URL=http://localhost:8000/api/v1`; restart `npm run dev`. All feature routes are under `/api/v1`. |
| `401 Unauthorized` after ~30 min of use | Access token expired (`ACCESS_TOKEN_EXPIRE_MINUTES=30`) | Client should call `POST /auth/refresh` to rotate; ensure the Axios interceptor refreshes on 401. Re-login if the refresh token is gone. |
| `401` immediately after refresh | Refresh token revoked/rotated or expired (`REFRESH_TOKEN_EXPIRE_DAYS=7`); reused old refresh | Log in again. Refresh rotation revokes the prior `jti`; never reuse an old refresh token. |
| Locked out of login | Exceeded `MAX_LOGIN_ATTEMPTS=5`; `locked_until` set | Wait `LOCKOUT_MINUTES=15`, or an admin clears `failed_login_attempts`/`locked_until` on the user. |
| `403 Forbidden` on an endpoint | RBAC: role lacks permission (`require_role`) | Use an account with the right role (`user`/`doctor`/`admin`) per [Authorization & RBAC](20_Authorization_RBAC.md). |
| Error responses look unfamiliar | RFC 7807 envelope `{type,title,status,detail,instance,errors?}` | This is the standard error contract; parse it accordingly. See [API Design](18_API_Design.md). |

### 1.6 Uploads & prediction

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Upload rejected: "file too large" | Exceeds `MAX_UPLOAD_SIZE=10485760` (10 MB) | Downscale/compress the image, or raise `MAX_UPLOAD_SIZE` deliberately. |
| Upload rejected: "unsupported type" | MIME not in `ALLOWED_IMAGE_TYPES=image/png,image/jpeg` | Convert to PNG or JPEG. Only those two are accepted. |
| `POST /predict` returns 400 for missing file | Not sent as multipart `file`, or missing `Idempotency-Key` header | Send multipart with field name `file` and an `Idempotency-Key` header. |
| Duplicate prediction created on retry | Missing/changing `Idempotency-Key` | Send a stable `Idempotency-Key` per logical request; the same key returns the existing prediction. |
| Grad-CAM images 404 | `GRADCAM_PATH` not writable, or files not generated | Ensure `./data/gradcam` exists and is writable; check logs for hook errors on `Classifier.target_layer`. |

### 1.7 RAG & Knowledge Assistant

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Chat replies "insufficient context" | Retrieval scored below `RAG_MIN_SCORE=0.2` — refusal gate (by design) | Ingest relevant PDFs (`python scripts/ingest_docs.py`); ask an in-scope question; if genuinely too strict, tune `RAG_MIN_SCORE`. |
| Chat returns no citations | Knowledge base empty or not indexed | Confirm documents reached `indexed` with non-zero `chunk_count` (`GET /documents`); re-ingest if `failed`. |
| Irrelevant retrievals | Chunking/embedding mismatch or stale index | Rebuild: adjust `RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP` if needed, delete `VECTOR_INDEX_PATH`, re-ingest. |
| Too few/many results | `RAG_TOP_K` misconfigured | Tune `RAG_TOP_K` (default 5). |
| Ingest stuck in `processing` | Async worker not running under `TASK_QUEUE=celery` | Start the Celery worker, or use `TASK_QUEUE=inprocess` / the `scripts/ingest_docs.py` CLI. |

### 1.8 Ports, processes & startup

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[Errno 10048]/EADDRINUSE` on `:8000` | Backend port already in use | Kill the stale process or run `uvicorn app.main:app --reload --port 8001` (update `VITE_API_BASE_URL`). |
| Vite can't bind `:5173` | Frontend port in use | `npm run dev -- --port 5174` and add the new origin to `CORS_ORIGINS`. |
| `ModuleNotFoundError` on boot | venv not activated or deps not installed | Activate `.venv`; `pip install -r requirements.txt` (and `pip install -e .`). |
| `/metrics` or `/docs` 404 | Wrong path — these are unprefixed ops routes | Use `/metrics`, `/docs`, `/health/live`, `/health/ready` **without** `/api/v1`. |

---

## 2. Windows-specific notes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `python3: command not found` | Windows uses `python`, not `python3` | Use `python`, or pin the version with the launcher: `py -3.11 ...`. |
| Wrong Python picked up | Multiple interpreters installed | Create the venv explicitly: `py -3.11 -m venv .venv`. Target **3.11.8** / 3.11+, **not** 3.12. |
| `Activate.ps1 cannot be loaded` | PowerShell execution policy blocks scripts | Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then `.\.venv\Scripts\Activate.ps1`. |
| `cp: command not found` | Bash-ism in PowerShell | Use `Copy-Item .env.example .env`. |
| Celery worker crashes on start | Default prefork pool unsupported on Windows | Start with `--pool=solo`. |
| Path/encoding issues writing under `data/` | Backslash or non-UTF-8 assumptions | Keep the relative ENV paths (`./data/...`) as-is; do not hardcode `\`. |

---

## 3. Diagnostic checklist

When something is wrong, work top-down:

1. **Config first.** Read the exact field in the startup error; reconcile `.env`
   against [Environment Configuration](31_Environment_Configuration.md).
2. **Health.** `GET /health/live` (process) then `GET /health/ready` (Mongo). If
   ready fails, it is almost always Mongo.
3. **Logs.** Structured `structlog` output names the failing subsystem and the
   `request_id`.
4. **Datastores.** `mongosh` ping; `redis-cli ping` if using redis/celery.
5. **Providers.** If report/RAG fails, confirm keys match the selected provider,
   or fall back to `mock` / `sentence_transformer` to isolate.
6. **Metrics.** `GET /metrics` for latency/error/saturation signals; see
   [Observability](23_Observability.md).
7. **Restart** the backend after any `.env` change (and the Celery worker).

---

## 4. Related documents

[Developer Guide](34_Developer_Guide.md) ·
[Environment Configuration](31_Environment_Configuration.md) ·
[API Design](18_API_Design.md) ·
[Database Design](17_Database_Design.md) ·
[Authentication (JWT)](19_Authentication_JWT.md) ·
[Authorization & RBAC](20_Authorization_RBAC.md) ·
[Machine Learning Pipeline](12_Machine_Learning_Pipeline.md) ·
[RAG Knowledge Assistant](15_RAG_Knowledge_Assistant.md) ·
[Observability](23_Observability.md) ·
[CANON](_CANON.md)
