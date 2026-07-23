"""Shared helpers for Motor-backed repositories.

Centralises ObjectId <-> str conversion so entity ids stay plain strings in the
domain while MongoDB uses native ``ObjectId`` for ``_id``.
"""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorCollection


def to_object_id(entity_id: str) -> ObjectId | None:
    """Convert a string id to :class:`ObjectId`, or None if it is not valid."""
    try:
        return ObjectId(entity_id)
    except (InvalidId, TypeError):
        return None


class MotorRepository:
    """Base class holding a reference to a single Motor collection.

    Args:
        collection: The Motor collection this repository manages.
    """

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        self._collection = collection
