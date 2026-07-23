# Contributing to AIMIP

Thanks for helping build the **Advanced AI Medical Intelligence Platform
(AIMIP)**. This is the short pointer; the full process — branching model, code
review checklist, coding standards, Definition of Done, and issue templates —
lives in [`docs/35_Contribution_Guide.md`](docs/35_Contribution_Guide.md).

Before you start, set up your environment with the
[Developer Guide](docs/34_Developer_Guide.md), and remember the single source of
truth is [`docs/_CANON.md`](docs/_CANON.md): any change to names, endpoints, ENV
variables, MongoDB collections, or ports updates the CANON **first**.

## Workflow

1. Branch off the latest `main` using a typed prefix:
   `feat/<scope>-<desc>`, `fix/<scope>-<desc>`, `docs/<desc>`,
   `refactor/<scope>-<desc>`, `test/<scope>-<desc>`, or `chore/<desc>`.
2. Make one focused, reviewable change. Follow the Clean/Hexagonal layering —
   business logic depends only on ports, never a vendor SDK; new provider behavior
   is an ENV-selected adapter with a shared contract test.
3. Open a PR against `main`, fill in the template, and link the issue
   (`Closes #<n>`). Squash-merge with a Conventional-Commit title; delete the
   branch after merge. Never commit directly to `main`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org):
`<type>(<scope>): <imperative summary>`, e.g.
`feat(predict): honor Idempotency-Key on POST /predict`. Types: `feat`, `fix`,
`docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`. Mark breaking
changes with `!` and a `BREAKING CHANGE:` footer.

## Tests & checks (run before pushing)

```bash
# Backend (from backend/, venv active)
ruff check .
mypy app
pytest --cov=app        # unit + integration + contract; coverage >= 80%

# Frontend (from frontend/)
npm run lint
npm run test
```

CI (`.github/workflows/ci.yml`) enforces the same gates plus the provider-swap
contract test. A change is **Done** only when acceptance criteria are met, the
suite is green, docs/CHANGELOG reflect any contract change, and at least one
review approves (two for security/auth/ML-safety changes). Record user-facing
changes under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).

By contributing you agree your work is licensed under the project's
[MIT License](LICENSE).
