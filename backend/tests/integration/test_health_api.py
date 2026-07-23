"""Integration tests for health probes and API metadata."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_liveness_returns_200(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]


async def test_readiness_reports_components(client: AsyncClient) -> None:
    response = await client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["checks"] == {"database": True, "cache": True, "task_queue": True}


async def test_root_metadata(client: AsyncClient) -> None:
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "AIMIP API"


async def test_correlation_id_header_present(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert "X-Request-ID" in response.headers


async def test_openapi_schema_available(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "AIMIP API"
