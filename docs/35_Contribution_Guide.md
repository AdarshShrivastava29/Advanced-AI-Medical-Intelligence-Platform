# 35 — Contribution Guide

This is the detailed contribution reference for the **Advanced AI Medical
Intelligence Platform (AIMIP)**. It defines the branching model, commit
conventions, pull-request process, code-review checklist, coding standards, the
Definition of Done, and the issue-template summary. The root
[`CONTRIBUTING.md`](../CONTRIBUTING.md) is a short pointer to this document.

Before contributing, set up your environment with the
[Developer Guide](34_Developer_Guide.md) and align on the contracts in the
[CANON](_CANON.md): every change uses the canonical names, ENV variables,
endpoints, and collections defined there.

> **Governance.** Any change to names, endpoints, ENV variables, MongoDB
> collections, or ports updates the [CANON](_CANON.md) **first**; documentation
> and code follow. The CANON is the single source of truth.

---

## 1. Branching model

AIMIP uses a trunk-based **GitHub Flow** with short-lived branches off `main`.

| Branch | Purpose | Lifetime |
|--------|---------|----------|
| `main` | Always releasable; protected; merges via reviewed PR only | permanent |
| `feat/<scope>-<short-desc>` | New feature or endpoint | short-lived |
| `fix/<scope>-<short-desc>` | Bug fix | short-lived |
| `docs/<short-desc>` | Documentation-only change | short-lived |
| `refactor/<scope>-<short-desc>` | Internal change, no behavior shift | short-lived |
| `test/<scope>-<short-desc>` | Test-only additions | short-lived |
| `chore/<short-desc>` | Tooling, deps, CI, config | short-lived |

Rules:

- Branch **from** the latest `main`; keep branches rebased on `main`.
- One logical change per branch; keep PRs small and reviewable.
- Never commit directly to `main`. `main` is protected and requires green CI plus
  at least one approving review.
- Delete the branch after merge.

`<scope>` mirrors a subsystem: `auth`, `predict`, `report`, `rag`, `documents`,
`analytics`, `users`, `settings`, `ml`, `gradcam`, `providers`, `infra`, `api`,
`frontend`, `workers`, `docs`.

Example: `feat/predict-idempotency-key`, `fix/rag-min-score-refusal`,
`docs/34-developer-guide`.

---

## 2. Conventional commits

All commits follow the [Conventional Commits](https://www.conventionalcommits.org)
specification. CI and the changelog depend on it.

```
<type>(<scope>): <short imperative summary>

<optional body — what & why, not how>

<optional footer — BREAKING CHANGE:, Refs #123, Co-authored-by:>
```

**Types**

| Type | Use for | Changelog section |
|------|---------|-------------------|
| `feat` | New user-facing capability | Added |
| `fix` | Bug fix | Fixed |
| `docs` | Documentation only | — |
| `refactor` | Code change, no behavior change | Changed |
| `perf` | Performance improvement | Changed |
| `test` | Adding/adjusting tests | — |
| `build` | Build system, dependencies | — |
| `ci` | CI configuration | — |
| `chore` | Housekeeping (no src/test change) | — |
| `style` | Formatting only (no logic) | — |

**Rules**

- Summary in the **imperative**, lower-case, no trailing period, ≤ 72 chars.
- Scope from the same list as §1 (`auth`, `predict`, `rag`, `providers`, …).
- Breaking changes: add `!` after the type/scope **and** a `BREAKING CHANGE:`
  footer, e.g. `feat(api)!: version predict response envelope`.
- Reference issues in the footer: `Refs #42`, `Closes #42`.

**Examples**

```
feat(rag): refuse answers below RAG_MIN_SCORE with "insufficient context"
fix(auth): rotate refresh token jti on POST /auth/refresh
docs(31): document CACHE_PROVIDER and TASK_QUEUE selectors
refactor(providers): move gemini SDK call behind AIProvider adapter
test(contract): assert VectorStore.search honors k and filter
```

---

## 3. Pull-request process

1. **Sync & branch.** Rebase your branch on the latest `main`.
2. **Self-check.** Run the full local gate before pushing:
   - Backend: `ruff check .`, `mypy app`, `pytest --cov=app` (coverage ≥ 80%).
   - Frontend: `npm run lint`, `npm run test`.
3. **Open the PR** against `main` using the PR template (§6). Fill in summary,
   linked issues, testing evidence, and screenshots for UI changes.
4. **CI.** `.github/workflows/ci.yml` must pass: `ruff`, `mypy`, backend `pytest`
   with coverage gate and the provider-swap contract test; frontend `eslint`,
   `prettier`, `vitest`. See [CI/CD Pipeline](27_CI_CD_Pipeline.md).
5. **Review.** At least **one** approving review (two for security-, auth-, or
   ML-safety-touching changes). Address every comment; re-request review.
6. **Merge.** **Squash-merge** into `main` with a Conventional-Commit title. The
   squash title feeds `CHANGELOG.md`.
7. **Cleanup.** Delete the branch. If the change is user-facing, ensure the
   `## [Unreleased]` section of [`CHANGELOG.md`](../CHANGELOG.md) is updated.

PRs should be focused: if a review reveals unrelated work, split it out.

---

## 4. Code-review checklist

Reviewers verify the following before approving.

**Architecture & correctness**

- [ ] Dependency direction respected: `domain ← application ← infrastructure ←
      interface`. Business logic depends only on **ports** (ABCs), never a vendor
      SDK. See [Ports & Adapters](10_Ports_And_Adapters.md).
- [ ] New provider behavior is an **adapter** selected by an ENV factory
      (`get_<x>_provider`), not a branch in a service.
- [ ] New/changed port behavior has a shared **contract test** in
      `tests/contract/` that all adapters pass.
- [ ] Names, ENV, endpoints, collections match the [CANON](_CANON.md).

**API & data**

- [ ] Endpoints live under `/api/v1`; errors use the RFC 7807 envelope
      `{type, title, status, detail, instance, errors?}`; lists use
      `{items, page, size, total, pages}`. See [API Design](18_API_Design.md).
- [ ] MongoDB writes match the schemas and indexes in
      [Database Design](17_Database_Design.md).
- [ ] RBAC enforced via `require_role(...)`; a `user` cannot read another user's
      data. See [Authorization & RBAC](20_Authorization_RBAC.md).

**Security & safety**

- [ ] No secrets committed; config read via `Settings` (pydantic-settings).
- [ ] Uploads validated against `MAX_UPLOAD_SIZE` and `ALLOWED_IMAGE_TYPES`.
- [ ] PHI-access actions written to append-only `audit_logs`; no PHI in logs.
- [ ] Clinical disclaimer preserved wherever reports/results surface.
- [ ] OOD guard and `ood_flag` respected for non-X-ray inputs; RAG refuses below
      `RAG_MIN_SCORE`.

**Quality**

- [ ] Inference runs off the event loop (threadpool); no blocking calls in async
      paths.
- [ ] Tests cover the change; coverage stays ≥ 80% backend.
- [ ] `ruff`, `mypy`, `eslint`, `prettier` clean.
- [ ] Docs/CHANGELOG updated when behavior or contracts change.

---

## 5. Coding standards & Definition of Done

### 5.1 Coding standards

- **Backend (Python 3.11+):** typed throughout (`mypy` clean), `ruff` for
  lint+format, Pydantic v2 models at boundaries, async I/O with Motor/httpx,
  structured logging via `structlog`. Follow SOLID and the patterns in
  [Design Patterns](09_Design_Patterns.md) (Repository, Service layer, Factory,
  Strategy/Provider, DI, Builder).
- **Frontend (React 19 + TypeScript):** ESLint + Prettier clean, server state via
  TanStack Query, UI state via Zustand, forms via React Hook Form + Zod, charts
  via Recharts. Accessibility to WCAG 2.1 AA. See
  [Frontend Design System](32_Frontend_Design_System.md).
- Match existing style in the touched module; do not introduce a new pattern
  without an [ADR](04_Architecture_Decision_Records.md).

### 5.2 Definition of Done

A change is **Done** only when all of the following hold:

1. Acceptance criteria of the issue are met and demonstrated.
2. Code follows the standards above and the Clean/Hexagonal layering.
3. Unit/integration/contract tests added or updated; suite green; backend
   coverage ≥ 80%.
4. `ruff`, `mypy`, `eslint`, `prettier`, `vitest` all pass in CI.
5. API/DB/ENV changes reflected in the [CANON](_CANON.md) and the relevant
   numbered docs.
6. User-facing changes recorded under `## [Unreleased]` in
   [`CHANGELOG.md`](../CHANGELOG.md).
7. Security, RBAC, audit-logging, and clinical-disclaimer obligations satisfied.
8. At least one approving review (two for security/auth/ML-safety changes);
   branch squash-merged and deleted.

---

## 6. Issue templates (summary)

Issues are opened with one of the standard templates in
`.github/ISSUE_TEMPLATE/`:

| Template | Purpose | Key fields |
|----------|---------|-----------|
| **Bug report** | Something behaves incorrectly | Summary, steps to reproduce, expected vs actual, environment (OS, Python 3.11.x, Node, provider ENV), logs, severity |
| **Feature request** | Propose new capability | Problem, proposed solution, affected ports/endpoints/collections, RBAC impact, alternatives |
| **Documentation** | Doc gap or error | Affected doc (00–37), section, correction, CANON impact |
| **Security report** | Vulnerability or PHI/privacy concern | *Report privately per [Security Design](21_Security_Design.md); do not file publicly.* Impact, affected surface, reproduction |
| **Task / chore** | Tooling, deps, refactor | Scope, motivation, acceptance criteria |

Guidance:

- Label with the subsystem scope (`auth`, `predict`, `rag`, `providers`, …) and a
  type (`bug`, `feature`, `docs`, `security`, `chore`).
- Security-sensitive reports must **not** disclose PHI and should follow the
  responsible-disclosure path in [Security Design](21_Security_Design.md).
- Link the issue in your PR footer (`Closes #<n>`).

---

## 7. Related documents

[Developer Guide](34_Developer_Guide.md) ·
[Troubleshooting](36_Troubleshooting.md) ·
[Design Patterns](09_Design_Patterns.md) ·
[Ports & Adapters](10_Ports_And_Adapters.md) ·
[Testing Strategy](26_Testing_Strategy.md) ·
[CI/CD Pipeline](27_CI_CD_Pipeline.md) ·
[API Design](18_API_Design.md) ·
[Database Design](17_Database_Design.md) ·
[Security Design](21_Security_Design.md) ·
[CANON](_CANON.md)
