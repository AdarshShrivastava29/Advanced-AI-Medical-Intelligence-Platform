"""Integration tests for the analytics endpoints (live aggregation from predictions)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import make_png

pytestmark = pytest.mark.asyncio


async def _auth_and_predict(client: AsyncClient) -> dict[str, str]:
    """Register+login, make one prediction, and return the auth header."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "an@example.com", "full_name": "Analyst", "password": "password123"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": "an@example.com", "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    await client.post(
        "/api/v1/predict",
        files={"file": ("cxr.png", make_png(), "image/png")},
        headers=headers,
    )
    return headers


async def test_overview_reflects_prediction(client: AsyncClient) -> None:
    headers = await _auth_and_predict(client)
    response = await client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_predictions"] == 1
    assert body["pneumonia_count"] + body["normal_count"] == 1
    assert 0.0 <= body["average_confidence"] <= 1.0


async def test_summary_shapes(client: AsyncClient) -> None:
    headers = await _auth_and_predict(client)
    response = await client.get("/api/v1/analytics/summary?days=7", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["trends"]) == 7
    assert {b["label"] for b in body["disease_distribution"]} == {"NORMAL", "PNEUMONIA"}
    assert len(body["confidence_distribution"]) == 4


async def test_recent_activity(client: AsyncClient) -> None:
    headers = await _auth_and_predict(client)
    response = await client.get("/api/v1/analytics/recent-activity?limit=5", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_analytics_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/analytics/overview")
    assert response.status_code == 401
