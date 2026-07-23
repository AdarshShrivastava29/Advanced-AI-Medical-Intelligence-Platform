"""Shared response schemas: problem+json errors, pagination envelope, health."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ProblemDetail(BaseModel):
    """RFC 7807 ``application/problem+json`` error body."""

    type: str = Field(default="about:blank", description="Error type slug / URI.")
    title: str = Field(description="Short, human-readable summary of the problem.")
    status: int = Field(description="HTTP status code.")
    detail: str = Field(description="Human-readable explanation of this occurrence.")
    instance: str | None = Field(default=None, description="Request path that failed.")
    errors: list[dict] = Field(default_factory=list, description="Per-field details.")
    request_id: str | None = Field(default=None, description="Correlation id.")


class Page(BaseModel, Generic[T]):
    """A paginated list envelope."""

    items: list[T] = Field(description="The page of items.")
    page: int = Field(description="1-based page number.")
    size: int = Field(description="Requested page size.")
    total: int = Field(description="Total number of items across all pages.")
    pages: int = Field(description="Total number of pages.")


class HealthResponse(BaseModel):
    """Liveness/readiness probe response."""

    status: str = Field(description="'ok' or 'degraded'.")
    version: str = Field(description="Application version.")
    checks: dict[str, bool] = Field(
        default_factory=dict, description="Per-dependency health for readiness."
    )
