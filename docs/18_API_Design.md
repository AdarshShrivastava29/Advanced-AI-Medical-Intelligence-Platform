# 18 — API Design

**Advanced AI Medical Intelligence Platform (AIMIP)** — complete REST contract.

All application endpoints are versioned under **`/api/v1`** (`API_V1_PREFIX`, base URL
`VITE_API_BASE_URL=http://localhost:8000/api/v1`). Operational endpoints (`/health/*`, `/metrics`,
`/docs`) are served **without** the version prefix. Transport is JSON over HTTPS unless noted;
uploads use `multipart/form-data`.

Related docs:
[SRS](02_Software_Requirements_Specification.md) ·
[Database Design](17_Database_Design.md) ·
[Authentication](19_Authentication.md) ·
[Authorization / RBAC](20_Authorization_RBAC.md) ·
[Environment Configuration](31_Environment_Configuration.md)

> **Disclaimer.** Responses (predictions, reports, chat answers) are informational
> decision-support, **not** a diagnosis; a licensed clinician must review all results. The
> platform is not FDA/CE cleared.

---

## 1. Conventions

### 1.1 Versioning

- Version is in the path: `/api/v1/...`. Breaking changes ship under a new prefix (`/api/v2`);
  `/api/v1` remains stable within a major version.
- The prefix is configurable via `API_V1_PREFIX` but defaults to `/api/v1` and is treated as
  canonical throughout the docs.

### 1.2 Authentication & authorization

- Scheme: `Authorization: Bearer <access_token>` (JWT, HS256). See [Authentication](19_Authentication.md).
- Roles: `user`, `doctor`, `admin`, enforced by `require_role(...)`. See [RBAC](20_Authorization_RBAC.md).
- "Auth" column values: **none** (public), **user** (any authenticated principal), **doctor**
  (doctor or admin), **admin** (admin only). Ownership-scoped endpoints additionally restrict a
  plain `user` to their own resources.

### 1.3 Content types

| Situation | Header |
|-----------|--------|
| Standard request/response | `application/json` |
| File uploads (`POST /predict`, `POST /documents`) | `multipart/form-data` (request) |
| Error bodies | `application/problem+json` (RFC 7807) |
| Metrics | `text/plain; version=0.0.4` (Prometheus) |

### 1.4 RFC 7807 error envelope

Every error returns `application/problem+json`:

```json
{
  "type": "https://aimip.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/auth/register",
  "errors": [
    { "field": "email", "message": "value is not a valid email address" },
    { "field": "password", "message": "must be at least 12 characters" }
  ]
}
```

| Member | Meaning |
|--------|---------|
| `type` | URI identifying the problem class (stable, dereferenceable). |
| `title` | Short, human-readable summary (constant per `type`). |
| `status` | HTTP status code, duplicated for convenience. |
| `detail` | Human-readable, request-specific explanation. |
| `instance` | The request path that produced the error. |
| `errors` | Optional array of per-field validation errors (present for `422`). |

### 1.5 List / pagination envelope

Collection endpoints return the canonical envelope:

```json
{ "items": [ /* ... */ ], "page": 1, "size": 20, "total": 137, "pages": 7 }
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | Page of results. |
| `page` | int | 1-based page number requested. |
| `size` | int | Page size requested. |
| `total` | int | Total matching records. |
| `pages` | int | `ceil(total / size)`. |

Common query params: `page` (default `1`, `>= 1`), `size` (default `20`, `1–100`). Date-range
filters use `from` / `to` (RFC 3339). Out-of-range/invalid params return `422`.

### 1.6 Idempotency (`POST /predict`)

- `POST /predict` accepts an **`Idempotency-Key`** header (client-generated UUID).
- The value is stored on the prediction (`idempotency_key`, unique per user).
- Replaying the same key for the same user returns the **original** prediction (`200`) instead of
  creating a duplicate. A different payload under a reused key returns `409 Conflict`.
- Keys are scoped per user and effectively bounded by the prediction's lifetime.

### 1.7 Rate limiting

Enforced by the `rate_limit` middleware. Every response carries:

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Requests allowed in the current window. |
| `X-RateLimit-Remaining` | Requests remaining in the window. |
| `X-RateLimit-Reset` | Unix epoch (seconds) when the window resets. |
| `Retry-After` | Seconds to wait (only on `429`). |

Exceeding the quota returns `429 Too Many Requests` with the RFC-7807 body.

### 1.8 Standard headers & status codes

- `X-Request-ID` — correlation id echoed on every response (from the `request_id` middleware).
- Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP) from the
  `security_headers` middleware; CORS from `CORS_ORIGINS`.

| Code | Used for |
|------|----------|
| `200 OK` | Successful read / idempotent replay. |
| `201 Created` | Resource created (`register`, `predict` first time, `documents`). |
| `202 Accepted` | Async job accepted (document ingest). |
| `204 No Content` | Successful delete / logout with no body. |
| `400 Bad Request` | Malformed request (bad file, bad JSON). |
| `401 Unauthorized` | Missing/invalid/expired token; bad credentials. |
| `403 Forbidden` | Authenticated but role/ownership denies access. |
| `404 Not Found` | Resource does not exist or not visible to caller. |
| `409 Conflict` | Duplicate email; idempotency-key payload mismatch. |
| `413 Payload Too Large` | Upload exceeds `MAX_UPLOAD_SIZE` (10 MB). |
| `415 Unsupported Media Type` | File type not in `ALLOWED_IMAGE_TYPES` / not a PDF. |
| `422 Unprocessable Entity` | Schema/validation failure (Pydantic). |
| `429 Too Many Requests` | Rate limit exceeded. |
| `500 Internal Server Error` | Unexpected failure. |
| `503 Service Unavailable` | Dependency (DB/model/provider) not ready. |

---

## 2. Endpoint summary

| # | Method | Path | Auth | Resource |
|---|--------|------|------|----------|
| 1 | POST | `/api/v1/auth/register` | none | Auth |
| 2 | POST | `/api/v1/auth/login` | none | Auth |
| 3 | POST | `/api/v1/auth/refresh` | none (refresh token) | Auth |
| 4 | POST | `/api/v1/auth/logout` | user | Auth |
| 5 | GET | `/api/v1/auth/me` | user | Auth |
| 6 | POST | `/api/v1/predict` | user | Predict |
| 7 | GET | `/api/v1/predict/{id}` | user (owner / doctor / admin) | Predict |
| 8 | GET | `/api/v1/history` | user | History |
| 9 | GET | `/api/v1/reports/{prediction_id}` | user (owner / doctor / admin) | Reports |
| 10 | POST | `/api/v1/reports/{prediction_id}/regenerate` | user (owner / doctor / admin) | Reports |
| 11 | POST | `/api/v1/chat` | user | Chat/RAG |
| 12 | GET | `/api/v1/chat/sessions` | user | Chat/RAG |
| 13 | GET | `/api/v1/chat/sessions/{id}` | user (owner) | Chat/RAG |
| 14 | POST | `/api/v1/documents` | admin | Documents |
| 15 | GET | `/api/v1/documents` | user | Documents |
| 16 | DELETE | `/api/v1/documents/{id}` | admin | Documents |
| 17 | GET | `/api/v1/analytics/overview` | user | Analytics |
| 18 | GET | `/api/v1/analytics/trends` | user | Analytics |
| 19 | GET | `/api/v1/analytics/disease-distribution` | user | Analytics |
| 20 | GET | `/api/v1/analytics/confidence-distribution` | user | Analytics |
| 21 | GET | `/api/v1/analytics/recent-activity` | user | Analytics |
| 22 | GET | `/api/v1/users` | admin | Users |
| 23 | GET | `/api/v1/users/{id}` | admin | Users |
| 24 | PATCH | `/api/v1/users/{id}` | admin | Users |
| 25 | DELETE | `/api/v1/users/{id}` | admin | Users |
| 26 | GET | `/api/v1/settings` | user | Settings |
| 27 | PATCH | `/api/v1/settings` | admin | Settings |
| 28 | GET | `/health/live` | none | Ops |
| 29 | GET | `/health/ready` | none | Ops |
| 30 | GET | `/metrics` | none (scrape-scoped) | Ops |
| 31 | GET | `/docs` | none | Ops |

> Analytics scope note: a plain `user` sees analytics computed over **their own** data; `doctor`
> and `admin` see platform-wide analytics. Details in [RBAC](20_Authorization_RBAC.md).

---

## 3. Auth

### 3.1 `POST /api/v1/auth/register`

Create a new account. Role is always `user` on self-registration (elevation is admin-only via
`PATCH /users/{id}`).

- **Auth:** none · **Content-Type:** `application/json`

Request body:

```json
{ "email": "jane@clinic.example", "password": "S3cure-P@ssphrase!", "full_name": "Jane Doe" }
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | required, valid email, unique (lowercased). |
| `password` | string | required, meets policy ([Authentication §4](19_Authentication.md#4-password-policy)). |
| `full_name` | string | required, 1–120 chars. |

Success `201 Created`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c10",
  "email": "jane@clinic.example",
  "full_name": "Jane Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2026-07-23T08:00:00Z"
}
```

Errors: `409` (email exists), `422` (validation), `429`.

### 3.2 `POST /api/v1/auth/login`

Exchange credentials for tokens. Applies account-lockout
(`MAX_LOGIN_ATTEMPTS`/`LOCKOUT_MINUTES`).

- **Auth:** none · **Content-Type:** `application/json`

```json
{ "email": "jane@clinic.example", "password": "S3cure-P@ssphrase!" }
```

Success `200 OK`:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

`expires_in` = `ACCESS_TOKEN_EXPIRE_MINUTES × 60`. A refresh-token row is written to
`refresh_tokens` (see [Database Design §3.2](17_Database_Design.md#32-refresh_tokens)).

Errors: `401` (bad credentials or inactive account), `403` (locked — `detail` states unlock time),
`422`, `429`.

### 3.3 `POST /api/v1/auth/refresh`

Rotate tokens. Consumes a valid refresh token, revokes its `jti`, and issues a **new** access +
refresh pair. See [Authentication §5](19_Authentication.md#5-refresh-token-rotation--revocation).

- **Auth:** none (carries the refresh token) · **Content-Type:** `application/json`

```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsIn..." }
```

Success `200 OK`: identical shape to login (new pair).

Errors: `401` (invalid/expired/revoked/reused token — reuse triggers revoke-all-for-user), `422`,
`429`.

### 3.4 `POST /api/v1/auth/logout`

Revoke the caller's current refresh token (and optionally all sessions).

- **Auth:** user · **Content-Type:** `application/json`

```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...", "all_devices": false }
```

Success `204 No Content`. The matching `refresh_tokens.revoked` is set `true` (or all rows for the
user when `all_devices=true`).

Errors: `401`, `422`.

### 3.5 `GET /api/v1/auth/me`

Return the authenticated principal.

- **Auth:** user

Success `200 OK`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c10",
  "email": "jane@clinic.example",
  "full_name": "Jane Doe",
  "role": "user",
  "is_active": true,
  "last_login": "2026-07-23T08:12:44Z",
  "created_at": "2026-07-23T08:00:00Z"
}
```

Errors: `401`.

---

## 4. Predict

### 4.1 `POST /api/v1/predict`

Upload a chest X-ray → classify → Grad-CAM → auto-generate report. Runs inference in a threadpool
(never blocks the event loop) and applies the OOD guard.

- **Auth:** user · **Content-Type:** `multipart/form-data`
- **Headers:** `Idempotency-Key: <uuid>` (recommended; see [§1.6](#16-idempotency-post-predict)).

Multipart parts:

| Part | Type | Rules |
|------|------|-------|
| `file` | binary | required; MIME ∈ `ALLOWED_IMAGE_TYPES` (`image/png`, `image/jpeg`); size ≤ `MAX_UPLOAD_SIZE` (10 MB). |

Success `201 Created` (first submission) — or `200 OK` when replaying an `Idempotency-Key`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c03",
  "status": "completed",
  "predicted_class": "PNEUMONIA",
  "confidence": 0.9412,
  "probabilities": { "NORMAL": 0.0588, "PNEUMONIA": 0.9412 },
  "ood_flag": false,
  "model_arch": "densenet121",
  "model_version": "densenet121-2class-v1.3.0",
  "gradcam": {
    "original": "/api/v1/predict/665f1a2b3c4d5e6f7a8b9c03/gradcam/original.png",
    "heatmap":  "/api/v1/predict/665f1a2b3c4d5e6f7a8b9c03/gradcam/heatmap.png",
    "overlay":  "/api/v1/predict/665f1a2b3c4d5e6f7a8b9c03/gradcam/overlay.png"
  },
  "report": {
    "id": "665f1a2b3c4d5e6f7a8b9c04",
    "risk_level": "high",
    "sections": {
      "summary": "Findings consistent with pneumonia in the right lower lobe.",
      "findings": "Increased opacity and consolidation in the right lower zone.",
      "possible_condition": "Community-acquired pneumonia (informational).",
      "medical_explanation": "Consolidation reflects alveoli filled with inflammatory exudate...",
      "recommendations": "Correlate clinically; consider CBC and follow-up imaging.",
      "risk_level": "high",
      "disclaimer": "This output is informational, not a diagnosis; a licensed clinician must review it."
    }
  },
  "created_at": "2026-07-23T08:15:02Z"
}
```

If the OOD guard rejects the image, the prediction is stored with `ood_flag=true`,
`status="completed"`, no report, and `predicted_class=null`; the API returns `200` with
`ood_flag=true` and a message advising the upload is not a recognizable chest X-ray.

Errors: `400` (corrupt/undecodable image), `401`, `409` (idempotency-key reused with a different
file), `413` (too large), `415` (unsupported type), `422` (missing `file`), `429`,
`503` (model not loaded).

### 4.2 `GET /api/v1/predict/{id}`

Fetch a single prediction (with report and Grad-CAM URLs).

- **Auth:** user (owner) · doctor/admin may read any prediction (writes an `audit_logs`
  `phi.access` row — see [RBAC §5](20_Authorization_RBAC.md#5-audit-logging-of-privileged-access)).

Path params: `id` (ObjectId string).

Success `200 OK`: same object as [§4.1](#41-post-apiv1predict).

Errors: `401`, `403` (not owner and not doctor/admin), `404`.

---

## 5. History

### 5.1 `GET /api/v1/history`

Paginated list of the caller's predictions, newest first.

- **Auth:** user (own predictions only)

Query params:

| Param | Type | Default | Rules |
|-------|------|---------|-------|
| `page` | int | `1` | `>= 1`. |
| `size` | int | `20` | `1–100`. |
| `from` | date-time | — | RFC 3339 lower bound on `created_at`. |
| `to` | date-time | — | RFC 3339 upper bound on `created_at`. |

Success `200 OK` (list envelope):

```json
{
  "items": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c03",
      "predicted_class": "PNEUMONIA",
      "confidence": 0.9412,
      "risk_level": "high",
      "status": "completed",
      "ood_flag": false,
      "created_at": "2026-07-23T08:15:02Z"
    }
  ],
  "page": 1, "size": 20, "total": 42, "pages": 3
}
```

Errors: `401`, `422` (bad paging/date).

---

## 6. Reports

### 6.1 `GET /api/v1/reports/{prediction_id}`

Fetch the report for a prediction (1:1).

- **Auth:** user (owner) · doctor/admin may read any (audited).

Path params: `prediction_id` (ObjectId string).

Success `200 OK`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c04",
  "prediction_id": "665f1a2b3c4d5e6f7a8b9c03",
  "llm_provider": "openai",
  "llm_model": "gpt-4o-mini",
  "risk_level": "high",
  "content_markdown": "## Summary\nThe model indicates findings consistent with pneumonia...",
  "sections": {
    "summary": "…", "findings": "…", "possible_condition": "…",
    "medical_explanation": "…", "recommendations": "…",
    "risk_level": "high", "disclaimer": "…"
  },
  "created_at": "2026-07-23T08:15:07Z"
}
```

Errors: `401`, `403`, `404` (no prediction or no report yet).

### 6.2 `POST /api/v1/reports/{prediction_id}/regenerate`

Re-run the LLM Builder for a completed prediction and overwrite the report in place.

- **Auth:** user (owner) · doctor/admin (audited).
- **Content-Type:** `application/json` (optional body).

Optional body:

```json
{ "tone": "clinical", "audience": "physician" }
```

Both fields optional; when omitted, service defaults apply.

Success `200 OK`: the regenerated report object (same shape as [§6.1](#61-get-apiv1reportsprediction_id)),
with a refreshed `created_at`.

Errors: `401`, `403`, `404`, `409` (prediction not `completed` / `ood_flag=true`), `429`,
`503` (LLM provider unavailable).

---

## 7. Chat / RAG

### 7.1 `POST /api/v1/chat`

Ask the Knowledge Assistant. Retrieves grounded context (dense + BM25 → rerank) and returns a
cited answer, or refuses when the top score < `RAG_MIN_SCORE`.

- **Auth:** user · **Content-Type:** `application/json`

```json
{ "session_id": "665f1a2b3c4d5e6f7a8b9c07", "message": "First-line antibiotic for CAP?" }
```

| Field | Type | Rules |
|-------|------|-------|
| `session_id` | string \| null | Optional; omit to start a new session (server creates one). |
| `message` | string | required, 1–4000 chars. |

Success `200 OK`:

```json
{
  "session_id": "665f1a2b3c4d5e6f7a8b9c07",
  "answer": "According to WHO guidance, first-line therapy for CAP is ...",
  "citations": [
    { "document_id": "665f1a2b3c4d5e6f7a8b9c05",
      "chunk_id": "665f1a2b3c4d5e6f7a8b9c05:0042", "score": 0.83 }
  ]
}
```

Refusal (still `200 OK`): `answer` states "insufficient context", `citations` is `[]`.

Errors: `401`, `403` (session not owned by caller), `404` (unknown `session_id`), `422`, `429`,
`503` (embedding/LLM provider down).

### 7.2 `GET /api/v1/chat/sessions`

List the caller's chat sessions, most-recently-active first.

- **Auth:** user

Query params: `page`, `size` (as [§1.5](#15-list--pagination-envelope)).

Success `200 OK` (list envelope):

```json
{
  "items": [
    { "id": "665f1a2b3c4d5e6f7a8b9c07", "title": "Antibiotic choice for CAP",
      "created_at": "2026-07-23T09:00:00Z", "updated_at": "2026-07-23T09:04:12Z" }
  ],
  "page": 1, "size": 20, "total": 5, "pages": 1
}
```

Errors: `401`.

### 7.3 `GET /api/v1/chat/sessions/{id}`

Fetch a session with its full turn history.

- **Auth:** user (owner only)

Path params: `id` (ObjectId string).

Success `200 OK`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c07",
  "title": "Antibiotic choice for CAP",
  "created_at": "2026-07-23T09:00:00Z",
  "updated_at": "2026-07-23T09:04:12Z",
  "messages": [
    { "role": "user", "message": "First-line antibiotic for CAP?",
      "citations": [], "created_at": "2026-07-23T09:04:05Z" },
    { "role": "assistant", "message": "According to WHO guidance ...",
      "citations": [ { "document_id": "665f...c05",
        "chunk_id": "665f...c05:0042", "score": 0.83 } ],
      "created_at": "2026-07-23T09:04:12Z" }
  ]
}
```

Errors: `401`, `403` (not owner), `404`.

---

## 8. Documents (RAG knowledge base)

### 8.1 `POST /api/v1/documents`

Upload a PDF into the knowledge base; ingestion (load → clean → chunk → embed → index) runs as an
async job (`TaskQueue`).

- **Auth:** admin · **Content-Type:** `multipart/form-data`

Multipart parts:

| Part | Type | Rules |
|------|------|-------|
| `file` | binary | required; `application/pdf`; size ≤ `MAX_UPLOAD_SIZE`. |
| `title` | string | optional; defaults to filename stem. |
| `source` | string | optional; ∈ `WHO`,`NIH`,`research`,`other`; default `other`. |

Success `202 Accepted`:

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c05",
  "filename": "who_pneumonia_guidelines_2024.pdf",
  "title": "WHO Pneumonia Management Guidelines (2024)",
  "source": "WHO",
  "status": "processing",
  "created_at": "2026-06-10T14:03:00Z"
}
```

Poll `GET /documents` for `status` → `indexed`/`failed` and `chunk_count`.

Errors: `401`, `403` (not admin), `413`, `415` (not a PDF), `422`, `429`.

### 8.2 `GET /api/v1/documents`

List knowledge-base documents.

- **Auth:** user (any authenticated principal may browse the catalog)

Query params: `page`, `size`; optional `status`, `source` filters.

Success `200 OK` (list envelope):

```json
{
  "items": [
    { "id": "665f1a2b3c4d5e6f7a8b9c05", "title": "WHO Pneumonia Management Guidelines (2024)",
      "source": "WHO", "pages": 48, "status": "indexed", "chunk_count": 213,
      "created_at": "2026-06-10T14:03:00Z" }
  ],
  "page": 1, "size": 20, "total": 12, "pages": 1
}
```

Errors: `401`, `422`.

### 8.3 `DELETE /api/v1/documents/{id}`

Delete a document; cascades to its `embeddings_metadata` rows and `VectorStore` vectors and the
source PDF.

- **Auth:** admin

Path params: `id` (ObjectId string).

Success `204 No Content`.

Errors: `401`, `403`, `404`, `409` (currently `processing` — retry after ingest settles).

---

## 9. Analytics

All return `200 OK`. A plain `user` receives metrics over their own data; `doctor`/`admin` receive
platform-wide metrics.

### 9.1 `GET /api/v1/analytics/overview`

- **Auth:** user

```json
{
  "total_predictions": 1280,
  "pneumonia_rate": 0.41,
  "normal_rate": 0.59,
  "avg_confidence": 0.902,
  "reports_generated": 1275,
  "ood_rejected": 37,
  "active_users": 58
}
```

### 9.2 `GET /api/v1/analytics/trends`

- **Auth:** user
- Query: `interval` ∈ `day` | `week` (required; default `day`), optional `from`/`to`.

```json
{
  "interval": "day",
  "series": [
    { "bucket": "2026-07-21", "predictions": 44, "pneumonia": 19, "normal": 25 },
    { "bucket": "2026-07-22", "predictions": 51, "pneumonia": 22, "normal": 29 }
  ]
}
```

Errors: `422` (invalid `interval`).

### 9.3 `GET /api/v1/analytics/disease-distribution`

- **Auth:** user

```json
{ "distribution": [
  { "class": "NORMAL", "count": 755, "ratio": 0.59 },
  { "class": "PNEUMONIA", "count": 525, "ratio": 0.41 }
] }
```

### 9.4 `GET /api/v1/analytics/confidence-distribution`

- **Auth:** user

```json
{ "bins": [
  { "range": "0.5-0.6", "count": 12 },
  { "range": "0.6-0.7", "count": 34 },
  { "range": "0.7-0.8", "count": 88 },
  { "range": "0.8-0.9", "count": 240 },
  { "range": "0.9-1.0", "count": 906 }
] }
```

### 9.5 `GET /api/v1/analytics/recent-activity`

- **Auth:** user
- Query: `limit` (default `10`, `1–50`).

```json
{ "items": [
  { "type": "prediction", "id": "665f...c03", "predicted_class": "PNEUMONIA",
    "risk_level": "high", "created_at": "2026-07-23T08:15:02Z" },
  { "type": "report", "id": "665f...c04", "risk_level": "high",
    "created_at": "2026-07-23T08:15:07Z" }
] }
```

Errors (all analytics): `401`, `422` (bad params).

---

## 10. Users (admin)

Administrative user management. All require `admin` and write to `audit_logs`.

### 10.1 `GET /api/v1/users`

- **Auth:** admin
- Query: `page`, `size`, optional `role`, `is_active`, `q` (email/name search).

Success `200 OK` (list envelope):

```json
{
  "items": [
    { "id": "665f...c01", "email": "dr.rao@hospital.example", "full_name": "Dr. Anita Rao",
      "role": "doctor", "is_active": true, "last_login": "2026-07-23T08:12:44Z",
      "created_at": "2026-05-01T10:00:00Z" }
  ],
  "page": 1, "size": 20, "total": 58, "pages": 3
}
```

### 10.2 `GET /api/v1/users/{id}`

- **Auth:** admin

Success `200 OK`: single user object (as above, without `password_hash`).
Errors: `401`, `403`, `404`.

### 10.3 `PATCH /api/v1/users/{id}`

Update mutable user fields (role, active flag, name). This is the only path that elevates a role.

- **Auth:** admin · **Content-Type:** `application/json`

```json
{ "role": "doctor", "is_active": true, "full_name": "Dr. Anita Rao" }
```

| Field | Type | Rules |
|-------|------|-------|
| `role` | string | optional; ∈ `user`,`doctor`,`admin`. |
| `is_active` | bool | optional. |
| `full_name` | string | optional; 1–120 chars. |

Success `200 OK`: updated user object. Change is recorded in `audit_logs` (`action=user.update`,
`metadata` carries `old_role`/`new_role`).

Errors: `401`, `403`, `404`, `409` (would remove the last active admin), `422`.

### 10.4 `DELETE /api/v1/users/{id}`

Delete (or deactivate) a user; hard-delete cascades to their owned data
([Database Design §5](17_Database_Design.md#5-data-lifecycle--retention)).

- **Auth:** admin

Success `204 No Content`.
Errors: `401`, `403`, `404`, `409` (cannot delete the last active admin / self-lockout guard).

---

## 11. Settings

### 11.1 `GET /api/v1/settings`

Read effective, non-secret application settings (safe subset — never returns secret keys).

- **Auth:** user

```json
{
  "llm_provider": "openai",
  "embedding_provider": "openai",
  "vector_db": "faiss",
  "model_arch": "densenet121",
  "rag_top_k": 5,
  "rag_min_score": 0.2,
  "max_upload_size": 10485760,
  "allowed_image_types": ["image/png", "image/jpeg"]
}
```

Errors: `401`.

### 11.2 `PATCH /api/v1/settings`

Update tunable runtime settings (non-secret, hot-tunable subset such as RAG parameters).

- **Auth:** admin · **Content-Type:** `application/json`

```json
{ "rag_top_k": 8, "rag_min_score": 0.25 }
```

Success `200 OK`: the updated settings object (as [§11.1](#111-get-apiv1settings)). Recorded in
`audit_logs` (`action=settings.update`).

Errors: `401`, `403`, `422` (out-of-range value).

---

## 12. Ops (no version prefix)

| Endpoint | Auth | Success | Purpose |
|----------|------|---------|---------|
| `GET /health/live` | none | `200` `{ "status": "alive" }` | Liveness — process is up. |
| `GET /health/ready` | none | `200` `{ "status": "ready", "checks": { "mongo": "ok", "cache": "ok", "model": "loaded" } }` / `503` if any check fails | Readiness — dependencies reachable. |
| `GET /metrics` | none (scrape-scoped) | `200` `text/plain` Prometheus exposition | Metrics for Prometheus. |
| `GET /docs` | none | `200` HTML | Swagger UI (OpenAPI). |

`GET /health/ready` returns `503` with an RFC-7807 body when MongoDB, the cache, or the model
weights are not ready.

---

## 13. OpenAPI & clients

FastAPI auto-generates the OpenAPI 3.1 schema, browsable at `/docs` (Swagger) and served as JSON
at `/openapi.json`. The React frontend (`frontend/src/lib/`) consumes it through an Axios client
with interceptors that attach the `Authorization` header and transparently perform
`POST /auth/refresh` on `401` (see [Authentication](19_Authentication.md)). Request/response
schemas are the Pydantic v2 models in `interface/schemas/`.

See [Database Design](17_Database_Design.md) for persisted shapes,
[Authentication](19_Authentication.md) for token mechanics, and
[Authorization / RBAC](20_Authorization_RBAC.md) for the full permission matrix.
