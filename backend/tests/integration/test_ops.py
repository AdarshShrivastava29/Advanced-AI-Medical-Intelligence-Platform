"""Integration tests for operational endpoints and security headers."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_metrics_endpoint_exposes_prometheus(client: AsyncClient) -> None:
    # Generate at least one request so counters are populated.
    await client.get("/health/live")
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert "aimip_http_requests_total" in response.text


async def test_security_headers_present(client: AsyncClient) -> None:
    response = await client.get("/health/live")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"


async def test_correlation_id_roundtrips(client: AsyncClient) -> None:
    response = await client.get("/health/live", headers={"X-Request-ID": "trace-123"})
    assert response.headers["X-Request-ID"] == "trace-123"
