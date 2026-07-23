"""Model registry — versioned metadata for trained checkpoints.

A small JSON-backed registry records every trained model (version, architecture,
dataset, metrics, checkpoint hash + path, config, approval flag). The inference
engine queries :meth:`ModelRegistry.latest_approved` to automatically load the
newest approved checkpoint for the active ``MODEL_ARCH`` — no code change to
switch models (see ``docs/10_Model_Training.md``, ``docs/09_AI_Architecture.md``).
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


def sha256_file(path: str | Path) -> str:
    """Return the SHA-256 hex digest of a file's contents."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def default_registry_path(model_path: str | Path) -> Path:
    """Return the registry file path co-located with ``MODEL_PATH``."""
    return Path(model_path).parent / "registry.json"


@dataclass
class ModelRegistryEntry:
    """Metadata describing one trained model version."""

    version: int
    arch: str
    dataset: str
    trained_at: str
    metrics: dict[str, Any]
    sha256: str
    checkpoint_path: str
    config: dict[str, Any]
    class_names: list[str]
    approved: bool = True
    num_classes: int = 2

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> ModelRegistryEntry:
        """Build an entry from a stored dict, ignoring unknown keys."""
        fields = set(cls.__dataclass_fields__)
        return cls(**{k: v for k, v in raw.items() if k in fields})


class ModelRegistry:
    """A JSON-backed registry of trained model versions."""

    def __init__(self, registry_path: str | Path) -> None:
        self._path = Path(registry_path)

    def _load(self) -> list[ModelRegistryEntry]:
        if not self._path.exists():
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        return [ModelRegistryEntry.from_dict(item) for item in raw.get("models", [])]

    def _save(self, entries: list[ModelRegistryEntry]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"models": [asdict(entry) for entry in entries]}
        self._path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def list_models(self) -> list[ModelRegistryEntry]:
        """Return all registered entries."""
        return self._load()

    def next_version(self, arch: str) -> int:
        """Return the next version number for an architecture (1-based)."""
        versions = [e.version for e in self._load() if e.arch == arch]
        return max(versions, default=0) + 1

    def register(self, entry: ModelRegistryEntry) -> ModelRegistryEntry:
        """Append an entry to the registry and persist it."""
        entries = self._load()
        entries.append(entry)
        self._save(entries)
        return entry

    def latest_approved(self, arch: str) -> ModelRegistryEntry | None:
        """Return the highest-version approved entry for ``arch``, or None."""
        candidates = [e for e in self._load() if e.arch == arch and e.approved]
        if not candidates:
            return None
        return max(candidates, key=lambda e: e.version)
