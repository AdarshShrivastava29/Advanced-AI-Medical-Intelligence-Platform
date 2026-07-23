# 27 — Testing Strategy

> Part of the **Advanced AI Medical Intelligence Platform (AIMIP)** documentation set.
> Canonical names, ENV vars, ports and services are defined in [`_CANON.md`](_CANON.md).
> Related: [28_Deployment](28_Deployment.md) · [29_Docker](29_Docker.md) ·
> [30_CICD](30_CICD.md) · [31_Environment_Configuration](31_Environment_Configuration.md) ·
> [02_Software_Requirements_Specification](02_Software_Requirements_Specification.md) ·
> [18_API_Design](18_API_Design.md) · [20_Authorization_RBAC](20_Authorization_RBAC.md).

**Disclaimer:** AIMIP is clinical **decision-support**, not a medical device; outputs are
informational, not a diagnosis, and a licensed clinician must review all results. Tests in
this document verify software behavior — they do **not** constitute clinical validation.

---

## 1. Objectives & quality gates

The testing strategy exists to make the non-functional targets in
[02_Software_Requirements_Specification](02_Software_Requirements_Specification.md) §11
verifiable and enforced automatically in CI ([30_CICD](30_CICD.md)):

| Target | How it is tested / gated |
|--------|--------------------------|
| Backend coverage ≥ **80%** | `pytest --cov` with `--cov-fail-under=80` (hard gate in CI) |
| Hexagonal purity (business logic depends only on **ports**) | Contract tests + import-linter/architectural unit tests |
| Provider swap works from `.env` only | Automated provider-swap test (§6) |
| API p95 < 300 ms (excl. model/LLM), prediction e2e < 6 s p95 | Smoke/perf assertions in e2e + separate load test job |
| OOD guard rejects non-chest-X-ray uploads | ML OOD test (§7) |
| RAG refuses when score < `RAG_MIN_SCORE` | RAG grounding-refusal test (§8) |
| Deterministic tests (no network, no real vendor SDK) | `mock` adapters + `memory`/`inprocess` providers forced in test env |

**Golden rule:** business logic never calls a vendor SDK directly (see [`_CANON.md`](_CANON.md) §3).
Therefore every test runs against **ports**, and the default test configuration selects the
deterministic adapters: `LLM_PROVIDER=mock`, `EMBEDDING_PROVIDER=sentence_transformer` (or a
stub), `VECTOR_DB=faiss`, `CACHE_PROVIDER=memory`, `TASK_QUEUE=inprocess`,
`STORAGE_PROVIDER=mongodb` (against a disposable test DB). No test may reach the public
internet.

---

## 2. The test pyramid

```
                    ╱╲
                   ╱e2e╲            few, slow, high-confidence
                  ╱──────╲          (API round-trips via httpx AsyncClient
                 ╱contract ╲         against a real ASGI app + test Mongo/Redis)
                ╱────────────╲
               ╱ integration  ╲     services + real repositories, real vector
              ╱────────────────╲     store, real ML inference on tiny tensors
             ╱      unit         ╲   many, fast, isolated — domain/value objects,
            ╱────────────────────╲   services with fake ports, pure functions
```

| Layer | Scope | Dependencies | Speed | Location |
|-------|-------|--------------|-------|----------|
| **Unit** | One class/function in isolation | Fakes/mocks for all ports | ms | `backend/tests/unit/` |
| **Integration** | A service + its real adapters | Test Mongo, faiss, real ML on 224×224 tensor | 10s–100s ms | `backend/tests/integration/` |
| **Contract** | Every adapter of a port passes one shared suite | Real adapter under test | varies | `backend/tests/contract/` |
| **E2E (API)** | HTTP request → response through the whole app | ASGI transport, test Mongo/Redis | 100s ms–s | `backend/tests/integration/` (API subfolder) or `tests/e2e/` |
| **Frontend unit/component** | React components, hooks, stores | Vitest + RTL + MSW | ms | `frontend/src/**/*.test.tsx` |

Folder layout per [`_CANON.md`](_CANON.md) §4: `backend/tests/{unit,integration,contract}/`.

---

## 3. Backend tooling

- **Runner:** `pytest`
- **Async:** `pytest-asyncio` (mode `auto`)
- **HTTP client:** `httpx.AsyncClient` with `ASGITransport` (in-process, no real socket)
- **Coverage:** `pytest-cov` (`coverage` under the hood)
- **Lint/format:** `ruff` · **Types:** `mypy` (see [30_CICD](30_CICD.md))
- **Fakes:** hand-written in-memory fakes for ports + `mock` provider adapters shipped in the app

### 3.1 `pyproject.toml` test configuration

```toml
[tool.pytest.ini_options]
minversion = "8.0"
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-ra -q --strict-markers --cov=app --cov-report=term-missing --cov-report=xml"
markers = [
    "unit: fast isolated tests (no I/O)",
    "integration: touches Mongo/Redis/faiss/torch",
    "contract: shared suite run against every adapter of a port",
    "e2e: full HTTP round-trip via httpx AsyncClient",
    "slow: excluded from the fast pre-commit run",
]

[tool.coverage.run]
source = ["app"]
branch = true
omit = ["app/main.py", "*/__init__.py", "app/workers/celery_app.py"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = ["pragma: no cover", "raise NotImplementedError", "if TYPE_CHECKING:"]
```

### 3.2 Session settings for tests

Tests load a `Settings` instance ([`_CANON.md`](_CANON.md) §5, documented in
[31_Environment_Configuration](31_Environment_Configuration.md)) with deterministic values,
supplied via a `.env.test` and/or monkeypatched environment:

```
ENV=development
LLM_PROVIDER=mock
EMBEDDING_PROVIDER=sentence_transformer
VECTOR_DB=faiss
CACHE_PROVIDER=memory
TASK_QUEUE=inprocess
STORAGE_PROVIDER=mongodb
MONGODB_URI=mongodb://localhost:27017
DB_NAME=aimip_test
JWT_SECRET=test-secret-not-for-prod
RAG_MIN_SCORE=0.2
MODEL_ARCH=densenet121
```

---

## 4. Fixtures & factories

Central `conftest.py` provides the shared graph. All fixtures use absolute imports from `app`.

```python
# backend/tests/conftest.py
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import Settings
from app.core.container import Container
from app.main import create_app


@pytest.fixture(scope="session")
def settings() -> Settings:
    # Deterministic: mock/memory/inprocess adapters, isolated test DB.
    return Settings(
        ENV="development",
        LLM_PROVIDER="mock",
        EMBEDDING_PROVIDER="sentence_transformer",
        VECTOR_DB="faiss",
        CACHE_PROVIDER="memory",
        TASK_QUEUE="inprocess",
        DB_NAME="aimip_test",
        JWT_SECRET="test-secret-not-for-prod",
    )


@pytest_asyncio.fixture
async def mongo(settings):
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    yield db
    await client.drop_database(settings.DB_NAME)   # clean slate each test
    client.close()


@pytest_asyncio.fixture
async def container(settings, mongo) -> Container:
    # Composition root wires ports -> adapters from settings (Factory pattern).
    c = Container(settings=settings, db=mongo)
    await c.init_resources()          # indexes, vector index load, etc.
    yield c
    await c.shutdown()


@pytest_asyncio.fixture
async def app(container):
    return create_app(container=container)


@pytest_asyncio.fixture
async def client(app) -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client) -> dict:
    # Register + login a 'user' role account, return bearer header.
    await client.post("/api/v1/auth/register", json=UserFactory.build())
    r = await client.post("/api/v1/auth/login",
                          json={"email": "u@test.io", "password": "Passw0rd!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
```

### 4.1 Factories (test data builders)

Plain builders (no external `factory_boy` dependency required, though it may be used):

```python
# backend/tests/factories.py
import io
from PIL import Image

class UserFactory:
    @staticmethod
    def build(**over):
        return {"email": "u@test.io", "password": "Passw0rd!",
                "full_name": "Test User", "role": "user", **over}

class PredictionFactory:
    @staticmethod
    def build(**over):
        return {"user_id": "u1", "model_arch": "densenet121",
                "predicted_class": "PNEUMONIA", "confidence": 0.93,
                "probabilities": {"NORMAL": 0.07, "PNEUMONIA": 0.93},
                "ood_flag": False, "status": "completed", **over}

def fake_xray_png(size=(224, 224)) -> bytes:
    # A deterministic grayscale image standing in for a chest X-ray.
    img = Image.new("L", size, color=127)
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return buf.getvalue()
```

### 4.2 Test data policy

- **No PHI, ever.** All images are synthetic (`fake_xray_png`) or public-sample derivatives.
  This aligns with the [`_CANON.md`](_CANON.md) §0 disclaimer (no PHI without consent).
- Real dataset (Kaggle "Chest X-Ray Images (Pneumonia)", [`_CANON.md`](_CANON.md) §9) is
  **not** required for the unit/contract suite; a tiny fixture tensor is used instead.
- RAG PDFs in tests are 1–2 page synthetic documents with known sentences so grounding and
  citation assertions are deterministic.
- Mongo test DB is `aimip_test` and is dropped after each test — never point tests at a real
  Atlas cluster (see [28_Deployment](28_Deployment.md)).

---

## 5. Unit tests

Target the **domain** (entities, value objects), **application services** (with fake ports),
and pure helpers (chunking math, softmax, RFC 7807 error mapping).

```python
# backend/tests/unit/test_confidence_value_object.py
import pytest
from app.domain.value_objects import Confidence, RiskLevel

@pytest.mark.unit
def test_confidence_rejects_out_of_range():
    with pytest.raises(ValueError):
        Confidence(1.2)

@pytest.mark.unit
@pytest.mark.parametrize("p,expected", [(0.95, RiskLevel.HIGH),
                                        (0.55, RiskLevel.MODERATE),
                                        (0.10, RiskLevel.LOW)])
def test_risk_bands(p, expected):
    assert RiskLevel.from_pneumonia_prob(p) is expected
```

```python
# backend/tests/unit/test_prediction_service.py
import pytest
from app.application.services import PredictionService

class FakeClassifier:            # implements the Classifier port
    target_layer = "features"
    def build(self): return self
    def predict(self, tensor):   # returns logits for [NORMAL, PNEUMONIA]
        return [[-1.0, 2.0]]

class FakeRepo:                  # implements PredictionRepository port
    def __init__(self): self.saved = []
    async def save(self, p): self.saved.append(p); return p

@pytest.mark.unit
@pytest.mark.asyncio
async def test_predict_uses_ports_only(tmp_path):
    svc = PredictionService(classifier=FakeClassifier(), repo=FakeRepo(),
                            gradcam=FakeGradcam(), ood=FakeOOD(passes=True))
    result = await svc.predict(user_id="u1", image_bytes=fake_xray_png())
    assert result.predicted_class == "PNEUMONIA"
    assert 0.0 <= result.confidence <= 1.0
    assert result.probabilities.keys() == {"NORMAL", "PNEUMONIA"}
```

**Architectural unit test** — enforce hexagonal dependency direction
(`domain ← application ← infrastructure ← interface`, [`_CANON.md`](_CANON.md) §2):

```python
# backend/tests/unit/test_architecture.py
import pytest, importlib, pkgutil, app.application as appmod

@pytest.mark.unit
def test_application_never_imports_vendor_sdks():
    banned = ("openai", "google.generativeai", "faiss", "chromadb",
              "motor", "torch")   # vendor SDKs forbidden in business logic
    for _, name, _ in pkgutil.walk_packages(appmod.__path__, "app.application."):
        mod = importlib.import_module(name)
        for b in banned:
            assert b not in getattr(mod, "__dict__", {}), \
                f"{name} must depend on a port, not {b}"
```

---

## 6. Contract tests (one shared suite per port)

The heart of the strategy. For **every** port in [`_CANON.md`](_CANON.md) §3, a single
parametrized suite runs against **all** adapters. Adding a new adapter = registering it in the
parametrization; it must pass the same suite. Live in `backend/tests/contract/`.

### 6.1 `AIProvider` contract

```python
# backend/tests/contract/test_ai_provider_contract.py
import pytest
from app.infrastructure.providers.llm.factory import get_ai_provider

# Every adapter of the AIProvider port. 'mock' always runs; vendor adapters
# run only when the matching API key is present (skipped otherwise in CI).
ADAPTERS = ["mock"]
if _has_key("OPENAI_API_KEY"): ADAPTERS.append("openai")
if _has_key("GEMINI_API_KEY"): ADAPTERS.append("gemini")

@pytest.fixture(params=ADAPTERS)
def provider(request, settings):
    return get_ai_provider(settings.copy(update={"LLM_PROVIDER": request.param}))

@pytest.mark.contract
@pytest.mark.asyncio
async def test_generate_returns_nonempty_str(provider):
    out = await provider.generate("Summarize: pneumonia on CXR.", system="You are terse.")
    assert isinstance(out, str) and out.strip()

@pytest.mark.contract
@pytest.mark.asyncio
async def test_stream_yields_chunks_that_concatenate(provider):
    chunks = [c async for c in provider.stream("Say hi.")]
    assert chunks and all(isinstance(c, str) for c in chunks)

@pytest.mark.contract
@pytest.mark.asyncio
async def test_respects_system_prompt_shape(provider):
    # Contract = signature/shape guarantee, not exact text.
    out = await provider.generate("x", system=None, temperature=0.0)
    assert isinstance(out, str)
```

### 6.2 `EmbeddingProvider` contract

```python
# backend/tests/contract/test_embedding_provider_contract.py
@pytest.mark.contract
def test_embed_shape_and_dimension(embedding_provider):
    vecs = embedding_provider.embed(["hello", "world"])
    assert len(vecs) == 2
    assert all(len(v) == embedding_provider.dimension for v in vecs)
    assert all(isinstance(x, float) for x in vecs[0])
```

### 6.3 `VectorStore` contract (`faiss` · `chroma` · `pinecone`)

```python
# backend/tests/contract/test_vector_store_contract.py
@pytest.mark.contract
def test_add_search_persist_load_roundtrip(vector_store, tmp_path):
    dim = 8
    vs = vector_store
    vs.add(ids=["a", "b"], vectors=[[1.0]*dim, [0.0]*dim],
           metadatas=[{"doc": "1"}, {"doc": "2"}])
    hits = vs.search([1.0]*dim, k=1)
    assert hits[0].id == "a"
    vs.persist(); vs.load()                 # survives round-trip
    assert vs.search([1.0]*dim, k=1)[0].id == "a"

@pytest.mark.contract
def test_search_filter_applied(vector_store):
    vs = vector_store
    vs.add(["a","b"], [[1.0]*8,[1.0]*8], [{"doc":"1"},{"doc":"2"}])
    hits = vs.search([1.0]*8, k=5, filter={"doc": "2"})
    assert {h.id for h in hits} == {"b"}
```

### 6.4 Other ports

The same pattern covers `Classifier` (`densenet121`·`efficientnet_b0`), `AuthProvider`
(`jwt`), `CacheProvider` (`memory`·`redis`), `TaskQueue` (`inprocess`·`celery`),
`StorageProvider` (`mongodb`). Each asserts only the **port contract** methods
([`_CANON.md`](_CANON.md) §3), never adapter internals. Example for `CacheProvider`:

```python
@pytest.mark.contract
@pytest.mark.asyncio
async def test_cache_set_get_delete_and_ttl(cache_provider):
    await cache_provider.set("k", "v", ttl=60)
    assert await cache_provider.get("k") == "v"
    await cache_provider.delete("k")
    assert await cache_provider.get("k") is None
```

### 6.5 Automated provider-swap test

Per [`_CANON.md`](_CANON.md) §3 (“the provider swap is itself an automated test”): flipping
only the ENV selector must change the wired adapter with **no code change** and the app must
still boot and serve.

```python
# backend/tests/contract/test_provider_swap.py
import pytest
from app.core.config import Settings
from app.core.container import Container

@pytest.mark.contract
@pytest.mark.parametrize("env_var,value,port_attr,expected_type", [
    ("LLM_PROVIDER", "mock",   "ai_provider",        "MockAIProvider"),
    ("LLM_PROVIDER", "openai", "ai_provider",        "OpenAIAdapter"),
    ("CACHE_PROVIDER","memory","cache_provider",     "MemoryCache"),
    ("CACHE_PROVIDER","redis", "cache_provider",     "RedisCache"),
    ("VECTOR_DB",    "faiss",  "vector_store",       "FaissVectorStore"),
    ("VECTOR_DB",    "chroma", "vector_store",       "ChromaVectorStore"),
    ("TASK_QUEUE",   "inprocess","task_queue",       "InProcessQueue"),
    ("TASK_QUEUE",   "celery", "task_queue",         "CeleryQueue"),
])
def test_env_change_only_swaps_adapter(base_env, env_var, value, port_attr, expected_type):
    settings = Settings(**{**base_env, env_var: value})
    container = Container(settings=settings)
    adapter = getattr(container, port_attr)
    assert type(adapter).__name__ == expected_type

@pytest.mark.contract
@pytest.mark.asyncio
async def test_app_boots_under_swapped_providers(base_env):
    settings = Settings(**{**base_env, "LLM_PROVIDER": "mock",
                           "CACHE_PROVIDER": "memory", "VECTOR_DB": "faiss"})
    app = create_app(container=Container(settings=settings))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        assert (await c.get("/health/ready")).status_code == 200
```

---

## 7. ML tests

Cover the AI/ML specifics in [`_CANON.md`](_CANON.md) §9. Use a tiny random tensor — no
dataset, no GPU required (pretrained-inference fallback).

```python
# backend/tests/integration/test_ml_inference.py
import torch, pytest
from app.infrastructure.providers... import get_classifier   # via factory + MODEL_ARCH

@pytest.mark.integration
@pytest.mark.parametrize("arch", ["densenet121", "efficientnet_b0"])
def test_inference_output_shape(settings, arch):
    clf = get_classifier(settings.copy(update={"MODEL_ARCH": arch})).build()
    x = torch.randn(1, 3, 224, 224)          # canon input: 224x224, 3-ch
    logits = clf.predict(x)
    assert tuple(logits.shape) == (1, 2)     # [NORMAL, PNEUMONIA]

@pytest.mark.integration
def test_softmax_probabilities_sum_to_one(classifier):
    import torch.nn.functional as F
    probs = F.softmax(classifier.predict(torch.randn(1,3,224,224)), dim=1)
    assert torch.isclose(probs.sum(), torch.tensor(1.0), atol=1e-5)
```

### 7.1 Grad-CAM output test

```python
# backend/tests/integration/test_gradcam.py
@pytest.mark.integration
def test_gradcam_produces_three_pngs(classifier, tmp_path, settings):
    from app.infrastructure.ml.gradcam import GradCAM
    cam = GradCAM(classifier, target_layer=classifier.target_layer,
                  out_dir=tmp_path)
    art = cam.run(fake_xray_tensor())        # returns paths
    for key in ("original", "heatmap", "overlay"):
        assert art[key].endswith(".png")
        assert (tmp_path / art[key].split("/")[-1]).exists()
    # heatmap must have same H,W as the input (224x224)
    from PIL import Image
    assert Image.open(art["heatmap"]).size == (224, 224)
```

### 7.2 OOD (out-of-distribution) guard test

```python
# backend/tests/integration/test_ood_guard.py
@pytest.mark.integration
def test_ood_flags_non_xray(ood_detector):
    # A saturated-color natural image is not a chest X-ray -> ood_flag True.
    assert ood_detector.is_ood(color_photo_tensor()) is True

@pytest.mark.integration
def test_ood_passes_grayscale_cxr_like(ood_detector):
    assert ood_detector.is_ood(fake_xray_tensor()) is False
```

The prediction service must set `ood_flag` in the persisted `predictions` document
([`_CANON.md`](_CANON.md) §6) and short-circuit report generation when OOD.

---

## 8. RAG tests

Cover the RAG pipeline in [`_CANON.md`](_CANON.md) §9: load → clean → chunk → embed → store →
retrieve → rerank → grounded answer with citations; refuse below `RAG_MIN_SCORE`.

```python
# backend/tests/integration/test_rag_chunking.py
@pytest.mark.integration
def test_chunker_respects_size_and_overlap(settings):
    from app.infrastructure.rag.chunker import chunk_text
    text = "word " * 1000
    chunks = chunk_text(text, size=settings.RAG_CHUNK_SIZE,      # 800
                        overlap=settings.RAG_CHUNK_OVERLAP)      # 120
    assert all(len(c) <= settings.RAG_CHUNK_SIZE + 1 for c in chunks)
    # consecutive chunks share ~overlap characters
    assert chunks[0][-settings.RAG_CHUNK_OVERLAP:] in (chunks[1][: 2*settings.RAG_CHUNK_OVERLAP])
```

```python
# backend/tests/integration/test_rag_grounding.py
@pytest.mark.integration
@pytest.mark.asyncio
async def test_answer_is_grounded_with_citations(rag_pipeline):
    await rag_pipeline.ingest(pdf=synthetic_pdf("Pneumonia is an infection of the alveoli."))
    res = await rag_pipeline.answer("What does pneumonia affect?")
    assert res.citations                        # at least one citation
    assert all(0.0 <= c.score <= 1.0 for c in res.citations)
    assert "alveoli" in res.answer.lower()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_refuses_below_min_score(rag_pipeline, settings):
    # Ask something unrelated to the ingested corpus -> low retrieval score.
    res = await rag_pipeline.answer("What is the capital of France?")
    assert res.refused is True
    assert "insufficient context" in res.answer.lower()
    assert res.citations == []
```

---

## 9. E2E / API tests (httpx AsyncClient)

Full HTTP round-trips through the ASGI app, asserting the RFC 7807 error envelope and the list
envelope from [`_CANON.md`](_CANON.md) §7 and [18_API_Design](18_API_Design.md), plus RBAC from
[20_Authorization_RBAC](20_Authorization_RBAC.md).

```python
# backend/tests/integration/api/test_predict_flow.py
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_predict_returns_prediction_gradcam_and_report(client, auth_headers):
    files = {"file": ("cxr.png", fake_xray_png(), "image/png")}
    r = await client.post("/api/v1/predict", files=files,
                          headers={**auth_headers, "Idempotency-Key": "k-123"})
    assert r.status_code == 201
    body = r.json()
    assert body["predicted_class"] in ("NORMAL", "PNEUMONIA")
    assert set(body["gradcam"]) == {"original", "heatmap", "overlay"}
    assert body["report"]["sections"]["disclaimer"]     # canon report sections

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_predict_is_idempotent(client, auth_headers):
    files = {"file": ("cxr.png", fake_xray_png(), "image/png")}
    h = {**auth_headers, "Idempotency-Key": "same-key"}
    r1 = await client.post("/api/v1/predict", files=files, headers=h)
    r2 = await client.post("/api/v1/predict", files=files, headers=h)
    assert r1.json()["id"] == r2.json()["id"]           # no duplicate prediction

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_rejects_oversize_upload(client, auth_headers):
    big = b"\x00" * (10 * 1024 * 1024 + 1)               # > MAX_UPLOAD_SIZE
    files = {"file": ("big.png", big, "image/png")}
    r = await client.post("/api/v1/predict", files=files, headers=auth_headers)
    assert r.status_code == 413
    assert r.json()["type"]                              # RFC 7807 envelope

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_disallowed_mime_rejected(client, auth_headers):
    files = {"file": ("x.gif", b"GIF89a", "image/gif")}  # not in ALLOWED_IMAGE_TYPES
    r = await client.post("/api/v1/predict", files=files, headers=auth_headers)
    assert r.status_code == 415
```

### 9.1 Auth & RBAC round-trips

```python
# backend/tests/integration/api/test_auth_rbac.py
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_refresh_rotation_revokes_old_token(client):
    tokens = await register_and_login(client)
    r = await client.post("/api/v1/auth/refresh",
                          json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    # old refresh token now revoked (rotation)
    again = await client.post("/api/v1/auth/refresh",
                              json={"refresh_token": tokens["refresh_token"]})
    assert again.status_code == 401

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_user_cannot_list_users(client, auth_headers):     # role=user
    r = await client.get("/api/v1/users", headers=auth_headers)
    assert r.status_code == 403                                  # admin-only

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_account_lockout_after_max_attempts(client):
    for _ in range(5):                                           # MAX_LOGIN_ATTEMPTS
        await client.post("/api/v1/auth/login",
                          json={"email": "u@test.io", "password": "wrong"})
    r = await client.post("/api/v1/auth/login",
                          json={"email": "u@test.io", "password": "Passw0rd!"})
    assert r.status_code == 423                                  # locked
```

### 9.2 Health & ops

```python
@pytest.mark.e2e
@pytest.mark.asyncio
async def test_health_endpoints(client):
    assert (await client.get("/health/live")).status_code == 200
    assert (await client.get("/health/ready")).status_code == 200
```

---

## 10. Frontend testing (Vitest + React Testing Library)

Stack: React 19, Vite, TypeScript, Vitest, RTL, `@testing-library/user-event`, MSW (Mock
Service Worker) to stub the Axios API client ([`_CANON.md`](_CANON.md) §1, §10).

### 10.1 `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
      exclude: ["**/*.d.ts", "src/main.tsx", "src/test/**"],
    },
  },
});
```

### 10.2 Setup + MSW

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { server } from "./msw/server";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 10.3 Component test

```tsx
// src/features/prediction/PredictionResult.test.tsx
import { render, screen } from "@testing-library/react";
import { PredictionResult } from "./PredictionResult";

test("renders class, confidence and the clinical disclaimer", () => {
  render(<PredictionResult data={{
    predicted_class: "PNEUMONIA", confidence: 0.93,
    gradcam: { overlay: "/gradcam/o.png" }, ood_flag: false,
  }} />);
  expect(screen.getByText(/PNEUMONIA/)).toBeInTheDocument();
  expect(screen.getByText(/93%/)).toBeInTheDocument();
  // Canon disclaimer must be visible on report/prediction UI.
  expect(screen.getByText(/not a diagnosis/i)).toBeInTheDocument();
});
```

### 10.4 Hook / query test

```tsx
// src/features/history/useHistory.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHistory } from "./useHistory";

test("useHistory returns paginated items", async () => {
  const qc = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useHistory({ page: 1, size: 20 }), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data.items).toHaveLength(2);   // from MSW handler
  expect(result.current.data).toHaveProperty("total");  // list envelope
});
```

### 10.5 Zod schema / form validation test

```tsx
test("login form shows error on invalid email", async () => {
  render(<LoginForm />);
  await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
});
```

---

## 11. Coverage gate & reporting

- **Backend:** `--cov-fail-under=80` (per [`_CANON.md`](_CANON.md) §11). CI uploads `coverage.xml`.
- **Frontend:** Vitest v8 thresholds (statements/lines/functions ≥ 80%, branches ≥ 70%).
- Coverage reports are CI artifacts ([30_CICD](30_CICD.md)); the merge gate fails if either
  threshold is not met.
- Excluded from coverage: app entrypoints (`main.py`, `main.tsx`), `__init__.py`, generated
  code — declared explicitly in config, never via blanket ignores.

---

## 12. Running tests

### 12.1 Locally — backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start test infra (Mongo + Redis). If Docker is available:
docker compose up -d mongo redis                      # see 29_Docker.md
# (Docker is NOT installed on the current dev machine — use a local/Atlas
#  test instance and set MONGODB_URI / REDIS_URL accordingly. See 28_Deployment.md.)

# Fast unit-only loop (pre-commit):
pytest -m unit

# Full suite with coverage gate:
pytest --cov=app --cov-fail-under=80

# One layer:
pytest -m contract
pytest -m "integration and not slow"
pytest tests/integration/api/test_predict_flow.py -k idempotent
```

### 12.2 Locally — frontend

```bash
cd frontend
npm ci
npm run test           # vitest run
npm run test:watch     # vitest watch
npm run test:coverage  # vitest run --coverage
```

### 12.3 In CI

GitHub Actions runs, in order (full detail in [30_CICD](30_CICD.md)):
`ruff` + `eslint` → `mypy` + `tsc` → `pytest --cov-fail-under=80` (with Mongo/Redis service
containers) → `vitest run --coverage` → build. The `mock`/`memory`/`inprocess`/`faiss`
adapters are forced via the CI environment, so **no vendor API keys are needed** and the suite
is fully deterministic and offline.

---

## 13. Traceability

| Requirement / canon ref | Verifying tests |
|-------------------------|-----------------|
| §3 Ports & adapters, provider swap | §6 contract suite + §6.5 swap test |
| §9 Inference shape / probabilities | §7 ML tests |
| §9 Grad-CAM three artifacts | §7.1 |
| §9 OOD guard | §7.2 |
| §9 RAG chunking + refusal | §8 |
| §7 API envelopes, idempotency, upload limits | §9 e2e |
| §8 RBAC, §5 lockout ENV | §9.1 |
| §11 ≥80% backend coverage | §11 gate |
| §2 hexagonal dependency direction | §5 architectural test |
