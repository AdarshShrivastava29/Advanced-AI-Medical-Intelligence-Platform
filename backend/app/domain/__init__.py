"""Domain layer: framework-agnostic entities, value objects and ports (interfaces).

This layer has no dependency on FastAPI, MongoDB, or any provider SDK — it only
defines *what* the application needs. Concrete adapters live in
``app.infrastructure`` (see ``docs/05_Low_Level_Architecture.md``).
"""
