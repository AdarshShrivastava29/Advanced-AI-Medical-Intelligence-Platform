# Changelog

All notable changes to the **Advanced AI Medical Intelligence Platform (AIMIP)**
are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Phase 1 MVP vertical slice (planned): JWT auth + RBAC, `densenet121`
  classifier with OOD guard, Grad-CAM explainability, LLM report builder, and the
  Prediction/History frontend slice.

### Changed
- Nothing yet.

### Deprecated
- Nothing yet.

### Removed
- Nothing yet.

### Fixed
- Nothing yet.

### Security
- Nothing yet.

## [0.1.0] - 2026-07-23

Initial release covering the **Phase 0 — Foundations & documentation** milestone:
the architecture, contracts, and complete documentation set are settled before
feature code begins.

### Added
- **Canonical source of truth** (`docs/_CANON.md`) fixing product scope, tech
  stack, Clean/Hexagonal architecture, provider ports and ENV selectors, folder
  structure, ENV variables, MongoDB collections, REST API contract, RBAC model,
  AI/ML specifics, frontend pages, and non-functional targets.
- **Complete documentation set** — all 38 numbered documents (`00`–`37`) authored
  against the CANON, including the [Project Roadmap](docs/00_Project_Roadmap.md),
  [Project Vision](docs/01_Project_Vision.md),
  [Software Requirements Specification](docs/02_Software_Requirements_Specification.md),
  [System Architecture](docs/03_System_Architecture.md),
  [Database Design](docs/17_Database_Design.md),
  [API Design](docs/18_API_Design.md),
  [Authorization & RBAC](docs/20_Authorization_RBAC.md),
  [Environment Configuration](docs/31_Environment_Configuration.md),
  [Developer Guide](docs/34_Developer_Guide.md),
  [Contribution Guide](docs/35_Contribution_Guide.md),
  [Troubleshooting](docs/36_Troubleshooting.md), and the
  [Future Roadmap](docs/37_Future_Roadmap.md).
- **Architecture baseline** — Clean/Hexagonal layout
  `backend/app/{core,domain,application,infrastructure,interface,workers}` with the
  dependency direction `domain ← application ← infrastructure ← interface`.
- **Ports & factories** — the eight port ABCs (`AIProvider`,
  `EmbeddingProvider`, `VectorStore`, `Classifier`, `AuthProvider`,
  `StorageProvider`, `CacheProvider`, `TaskQueue`) with a `get_<x>_provider(settings)`
  factory per port and a shared contract-test scaffold in `tests/contract/`.
- **ENV contract** — canonical `.env.example` for backend and frontend, with
  fail-fast validation (e.g. `LLM_PROVIDER=openai` with an empty `OPENAI_API_KEY`
  raises at startup).
- **Composition root** — `core/config.py` (`Settings`, pydantic-settings),
  `core/container.py`, `core/logging.py`, `core/security.py`, `core/exceptions.py`.
- **Health surface** — `GET /health/live`, `GET /health/ready`, `GET /metrics`,
  `GET /docs`.
- **CI skeleton** — `.github/workflows/ci.yml` running `ruff`, `mypy`, `pytest`
  (backend) and `eslint`, `prettier`, `vitest` (frontend).
- **Project root files** — `README.md`, this `CHANGELOG.md`, `CONTRIBUTING.md`,
  and the MIT `LICENSE` (Copyright (c) 2026 DTable Analytics).

### Notes
- AIMIP is clinical **decision-support**, not a medical device; outputs are
  informational and not a diagnosis, and the platform is not FDA/CE cleared.
- Docker is authored but not installed on the current dev machine; container
  artifacts are validated in CI and run in the target environment.

[Unreleased]: https://example.com/aimip/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/aimip/releases/tag/v0.1.0
