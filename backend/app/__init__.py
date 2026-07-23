"""AIMIP backend application package.

Advanced AI Medical Intelligence Platform (AIMIP) — a clinical *decision-support*
platform (NOT a medical device). The backend follows Clean / Hexagonal
architecture: ``domain`` (entities + ports) <- ``application`` (services) <-
``infrastructure`` (adapters) <- ``interface`` (FastAPI). See
``docs/07_Backend_Architecture.md`` and ``docs/05_Low_Level_Architecture.md``.
"""

import os

# torch/MKL and faiss both ship an OpenMP runtime; on Windows loading both in one
# process triggers "OMP: Error #15" and aborts. Allowing the duplicate runtime is
# the documented mitigation and is a no-op on Linux/containers. Set before any
# torch/faiss import (this package is imported first).
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

__version__ = "0.1.0"
