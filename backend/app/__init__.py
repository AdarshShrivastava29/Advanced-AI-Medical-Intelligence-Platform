"""AIMIP backend application package.

Advanced AI Medical Intelligence Platform (AIMIP) — a clinical *decision-support*
platform (NOT a medical device). The backend follows Clean / Hexagonal
architecture: ``domain`` (entities + ports) <- ``application`` (services) <-
``infrastructure`` (adapters) <- ``interface`` (FastAPI). See
``docs/07_Backend_Architecture.md`` and ``docs/05_Low_Level_Architecture.md``.
"""

__version__ = "0.1.0"
