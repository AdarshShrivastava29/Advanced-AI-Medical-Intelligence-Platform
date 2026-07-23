# 32 — Coding Standards

> Part of the **Advanced AI Medical Intelligence Platform (AIMIP)** documentation set.
> Authoritative names, paths, ENV vars, endpoints, and structure are defined in
> [_CANON.md](_CANON.md). This document defines **how we write code** across the monorepo so
> the architecture in [07_Backend_Architecture.md](07_Backend_Architecture.md) and
> [08_Frontend_Architecture.md](08_Frontend_Architecture.md) stays clean over time.

**Related docs:** [Backend Architecture](07_Backend_Architecture.md) ·
[Frontend Architecture](08_Frontend_Architecture.md) · [API Design](18_API_Design.md) ·
[Environment Configuration](31_Environment_Configuration.md)

---

## 1. Principles first

1. **The dependency rule is law:** `domain ← application ← infrastructure ← interface`
   ([_CANON.md §2](_CANON.md)). Business logic depends on **ports**, never on vendor SDKs.
2. **Configuration over branching:** provider choice is an ENV selector resolved by a factory,
   not an `if openai:` scattered through services.
3. **Explicit over implicit:** typed everywhere (mypy strict, TS strict), no silent `Any`,
   no untyped dicts crossing a layer boundary.
4. **Small, single-purpose units:** a function does one thing; a service method is one use case.
5. **Fail fast, fail loud:** validate config and inputs at the boundary; raise typed errors.

---

## 2. SOLID applied to AIMIP

| Principle | How it shows up here |
|-----------|----------------------|
| **S**ingle Responsibility | Routers translate HTTP only; services own one use case each (`PredictionService.predict`); repositories only persist; adapters only wrap one vendor. |
| **O**pen/Closed | Add a provider (e.g. a new `AIProvider`) by writing an adapter + registering it in the factory `match` — no service is edited. |
| **L**iskov Substitution | Every adapter is fully substitutable for its port; the **shared contract test** in `tests/contract/` guarantees `openai`, `gemini`, `mock` behave identically for `AIProvider`. |
| **I**nterface Segregation | Ports are narrow: `CacheProvider` is `get/set/delete`; `VectorStore` is `add/search/persist/load`. No god-interface. |
| **D**ependency Inversion | High-level services depend on abstractions (ports); concrete adapters are injected by the composition-root container ([07 §6](07_Backend_Architecture.md)). |

---

## 3. Design-patterns catalog (what we use and where)

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Repository** | `infrastructure/db/` over Motor, behind `*Repository` ports | Isolate persistence; collections per [_CANON.md §6](_CANON.md) |
| **Service layer** | `application/services/` | One class per capability: `AuthService`, `PredictionService`, `ReportService`, `RagService`, `DocumentService`, `AnalyticsService`, `UserService` |
| **Factory** | `infrastructure/providers/<x>/factory.py`, `get_<x>_provider(settings)` | Map ENV selector → concrete adapter in one place |
| **Strategy / Provider** | the port + its interchangeable adapters | Swap behaviour (LLM, embeddings, vector store, classifier, cache, queue) via `.env` |
| **Dependency Injection** | `core/container.py` composition root + FastAPI `Depends` in `interface/dependencies.py` | Wire the object graph once; inject into routers |
| **Builder** | `ReportService` report assembly | Compose report sections `summary, findings, possible_condition, medical_explanation, recommendations, risk_level, disclaimer` |
| **Configuration-driven design** | `core/config.py` `Settings` | 12-factor config, fail-fast |

Frontend mirrors these ideas: feature-hooks are the "service layer", the Axios client is the
single "repository/adapter" to the API, TanStack Query is the cache, Zustand holds UI state
(see [08_Frontend_Architecture.md](08_Frontend_Architecture.md)).

---

## 4. Python standards (backend)

Target **Python 3.11+** (dev machine 3.11.8 — **not** 3.12), per [_CANON.md §1](_CANON.md).

### 4.1 Formatting, linting, typing

- **PEP 8** is the baseline; **ruff** is the linter *and* formatter (line length 100).
- **mypy** runs in strict mode. No implicit `Any`; every public function is fully annotated.
- Use modern typing: `list[str]`, `dict[str, float]`, `X | None` (not `Optional[X]`),
  `collections.abc` for `Iterable`/`AsyncIterator`.
- Prefer `@dataclass(frozen=True)` for value objects / DTOs; Pydantic v2 models for anything
  crossing the HTTP boundary (`interface/schemas/`).

`pyproject.toml` (canonical config lives with the backend):

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "ASYNC", "S", "PL"]  # style, imports, naming, bugbear, async, security
ignore = ["S101"]                                             # asserts allowed in tests

[tool.mypy]
python_version = "3.11"
strict = true
warn_unused_ignores = true
disallow_untyped_defs = true
plugins = ["pydantic.mypy"]
```

### 4.2 Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Module / package | `snake_case` | `prediction_service.py`, `vector_db/` |
| Class / port / entity | `PascalCase` | `PredictionService`, `AIProvider`, `Prediction` |
| Function / method / var | `snake_case` | `run_inference`, `get_by_idempotency_key` |
| Constant | `UPPER_SNAKE` | `MAX_UPLOAD_SIZE`, `RAG_MIN_SCORE` |
| Port ABC | noun of the capability | `EmbeddingProvider`, `VectorStore`, `TaskQueue` |
| Adapter | `<Vendor><Port>` | `OpenAIProvider`, `MongoPredictionRepository`, `CeleryTaskQueue` |
| Factory | `get_<x>_provider` | `get_ai_provider`, `get_vector_store` |

### 4.3 Docstrings

- **Google-style** docstrings on every public module, class, and function.
- A port method's docstring is the **contract** all adapters must honour (it is also what the
  contract test asserts).

```python
async def search(
    self, vector: list[float], k: int, filter: dict | None = None
) -> list[SearchHit]:
    """Return the k nearest neighbours to `vector`.

    Args:
        vector: Query embedding; length MUST equal `self.dimension`.
        k: Maximum number of hits to return, ordered by descending score.
        filter: Optional metadata equality filter (e.g. {"document_id": "..."}).

    Returns:
        Up to `k` SearchHit(score, id, metadata), highest score first.

    Raises:
        ValueError: If len(vector) != self.dimension.
    """
```

### 4.4 Errors & logging

- Raise the typed exceptions from `core/exceptions.py` (`ValidationError`, `NotFoundError`,
  `ConflictError`, `UnauthorizedError`, `ForbiddenError`); the middleware maps them to
  **RFC 7807** ([07 §11](07_Backend_Architecture.md)). Never `raise HTTPException` from a
  service.
- **structlog** for structured JSON logs; bind `request_id`. Never log secrets, tokens, or
  PHI; audit access to PHI to the `audit_logs` collection ([_CANON.md §6](_CANON.md)).
- Never swallow exceptions (`except: pass`). Catch narrowly, add context, re-raise or map.

### 4.5 Async

- Route handlers and services are `async`. **Never** run blocking work on the event loop:
  PyTorch inference, PyMuPDF parsing, and CPU-heavy embedding go through a threadpool
  (`anyio.to_thread.run_sync`) or the Celery queue ([07 §10, §12](07_Backend_Architecture.md)).
- Use `httpx.AsyncClient` for outbound HTTP; Motor for Mongo. No synchronous `requests`,
  no `pymongo`.

---

## 5. TypeScript / React standards (frontend)

Target **React 19 + Vite + TypeScript** (strict), per [_CANON.md §1](_CANON.md).

### 5.1 Formatting, linting, typing

- **Prettier** owns formatting (2-space indent, semicolons, double quotes, trailing commas).
- **ESLint** with `@typescript-eslint`, `eslint-plugin-react`,
  `eslint-plugin-react-hooks`, `jsx-a11y`, and `import/no-restricted-paths` to enforce the
  layering `pages → features → components/ui + lib + hooks + store`.
- `tsconfig` is `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`.
  No `any`; use `unknown` + narrowing. Server payload types live in `src/types/` and mirror
  the API schemas in [18_API_Design.md](18_API_Design.md).

### 5.2 Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Component file & component | `PascalCase.tsx` | `LoginForm.tsx` → `LoginForm` |
| Hook | `useX.ts` / `useX` | `useHistory`, `usePredict` |
| Store | `xStore.ts` | `authStore`, `uiStore` |
| Non-component module | `camelCase.ts` | `apiClient.ts`, `formatDate.ts` |
| Type / interface | `PascalCase` | `Prediction`, `Paginated<T>` |
| Constant | `UPPER_SNAKE` | `MAX_UPLOAD_SIZE` |
| Zod schema | `xSchema` + inferred type | `loginSchema` → `LoginValues` |

### 5.3 Rules of hooks & components

- Follow the **Rules of Hooks** — call hooks unconditionally at the top level; complete,
  honest dependency arrays (`react-hooks/exhaustive-deps` is an **error**, not a warning).
- **Function components only**; no class components except the two error boundaries
  ([08 §9](08_Frontend_Architecture.md)).
- Components are **presentational**; data access lives in feature hooks that wrap TanStack
  Query — components never import `apiClient` directly.
- Keep server state in **TanStack Query**, UI state in **Zustand**; never cache API data in
  component state or Zustand ([08 §4](08_Frontend_Architecture.md)).
- Every input is labelled and keyboard-accessible; meet **WCAG 2.1 AA**
  ([08 §10](08_Frontend_Architecture.md)).

```ts
// Good: typed hook, single responsibility, query-keyed cache
export function usePrediction(id: string) {
  return useQuery({
    queryKey: ["prediction", id],
    queryFn: async () => (await api.get<Prediction>(`/predict/${id}`)).data,
    enabled: Boolean(id),
  });
}
```

---

## 6. Commit & PR conventions

- **Conventional Commits**: `type(scope): summary` in the imperative mood, ≤ 72-char subject.
  Types: `feat, fix, refactor, docs, test, chore, perf, build, ci`.
  Scopes match modules: `backend`, `frontend`, `predict`, `rag`, `auth`, `docs`, `ci`, …
  - `feat(predict): add Idempotency-Key replay to PredictionService`
  - `fix(auth): rotate refresh token on 401 single-flight`
- **Branches**: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`; short-lived, off `main`.
- **PRs**: one logical change; description states *what* and *why*, links the issue, and lists
  test evidence. CI (`.github/workflows/ci.yml`) must be green: ruff, mypy, pytest (backend);
  ESLint, `tsc --noEmit`, Vitest (frontend). Coverage gate ≥ 80% backend
  ([_CANON.md §11](_CANON.md)). At least one review approval; no self-merge to `main`.
- **Do not** commit secrets, `.env`, weights, uploads, or vector indexes (`data/` is
  gitignored per [_CANON.md §4](_CANON.md)).

---

## 7. Folder-placement rules

Put new code where its **layer** belongs (backend tree in [_CANON.md §4](_CANON.md); frontend
in [08 §2](08_Frontend_Architecture.md)):

- **A new business rule** → `application/services/` (or a domain entity/value object). It may
  import ports only.
- **A new vendor integration** → a new adapter under
  `infrastructure/providers/<x>/` + a `match` arm in that family's `factory.py` + a domain
  **port** if none exists. No vendor import leaks outside `infrastructure/`.
- **A new endpoint** → a router in `interface/api/v1/`, request/response models in
  `interface/schemas/`, wired through `interface/dependencies.py`. Keep handlers thin.
- **A new persisted collection** → an entity in `domain/entities/`, a `*Repository` port, a
  Mongo adapter in `infrastructure/db/`, and an index in `ensure_indexes`
  ([_CANON.md §6](_CANON.md)).
- **Frontend: a new capability** → a slice under `features/<name>/` (hooks + components +
  types); a route + page in `pages/` and `app/router.tsx`; shared atoms go to
  `components/ui/`. Imports never flow upward from `components/ui` into `features` or `pages`.

Enforcement:

- Python: ruff import rules + a CI check rejecting `from app.infrastructure` inside
  `app/application/**` and `app/domain/**`.
- TS: ESLint `import/no-restricted-paths` zones matching the layering.

---

## 8. Testing expectations

Backend tests live in `backend/tests/{unit,integration,contract}/`; frontend uses **Vitest +
React Testing Library**. Target ≥ **80%** backend coverage ([_CANON.md §11](_CANON.md)).

- **Unit (backend):** services against fake ports; deterministic, no network, no DB.
- **Integration (backend):** routers + test Mongo + middleware via `httpx.AsyncClient`;
  assert RFC 7807 envelopes and status codes.
- **Contract (backend):** every port ships one **shared contract test** in `tests/contract/`
  that all adapters must pass; the **provider-swap** (`.env` selector change → factory
  re-resolves) is an automated test ([_CANON.md §3](_CANON.md)).
- **Frontend:** hooks tested under a `QueryClientProvider` with a mocked Axios; components
  tested by user-visible behaviour (roles, labels, `role="alert"`), not internals; assert
  accessibility affordances.
- Name tests `test_<unit>_<behaviour>` (py) / `describe/it` behaviour phrasing (ts). Use
  `pytest.mark.asyncio` for async tests.

---

## 9. Anti-patterns to avoid

**Backend**

- ❌ Importing a vendor SDK (`openai`, `torch`, `motor`, `celery`) anywhere in
  `domain/` or `application/`. ✅ Wrap it in an adapter behind a port.
- ❌ `if settings.LLM_PROVIDER == "openai": ...` inside a service. ✅ Resolve via
  `get_ai_provider(settings)` in the factory/container.
- ❌ Blocking calls (PyTorch, PyMuPDF, `time.sleep`) on the event loop. ✅ Threadpool or
  Celery.
- ❌ `raise HTTPException` from a service; ❌ returning raw dicts across layers. ✅ Typed
  exceptions + entities/DTOs.
- ❌ Reading `os.environ` outside `core/config.py`. ✅ Inject `Settings`.
- ❌ Business logic in routers ("fat controllers"). ✅ Thin handler → service call.
- ❌ Logging tokens/PHI. ✅ Structured logs + `audit_logs`.
- ❌ God services / god ports. ✅ One responsibility each (ISP).

**Frontend**

- ❌ Calling `apiClient` directly from a component. ✅ A typed feature hook.
- ❌ Caching server data in Zustand or `useState`. ✅ TanStack Query is the cache.
- ❌ `any`, non-null `!` chains, or untyped API responses. ✅ `unknown` + `src/types`.
- ❌ Missing/inaccurate hook dependency arrays. ✅ Honest deps; `exhaustive-deps` errors.
- ❌ Color-only status indication. ✅ Color + text + icon for `risk_level`.
- ❌ Storing the refresh token in `localStorage`. ✅ In-memory access token + server-side
  rotation via `POST /auth/refresh` ([08 §5](08_Frontend_Architecture.md)).

---

## 10. Cross-references

- Backend layering, DI, middleware, workers → [07_Backend_Architecture.md](07_Backend_Architecture.md)
- Frontend structure, state, forms, a11y → [08_Frontend_Architecture.md](08_Frontend_Architecture.md)
- Endpoints & error envelope (RFC 7807) → [18_API_Design.md](18_API_Design.md)
- ENV variables & fail-fast config → [31_Environment_Configuration.md](31_Environment_Configuration.md)
- Canonical names/paths/collections → [_CANON.md](_CANON.md)
