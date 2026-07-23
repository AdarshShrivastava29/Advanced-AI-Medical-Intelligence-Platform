"""Integration tests for the prediction pipeline via the HTTP API.

Uses a real (random-init) DenseNet engine, local file storage in a temp dir, the
mock LLM provider and in-memory repositories — exercising the full
``/predict`` -> inference -> Grad-CAM -> report -> persistence flow end to end.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import make_png

pytestmark = pytest.mark.asyncio


async def _auth_header(client: AsyncClient) -> dict[str, str]:
    """Register + login a user and return a bearer auth header."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "rad@example.com", "full_name": "Radiologist", "password": "password123"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "rad@example.com", "password": "password123"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_predict_full_pipeline(client: AsyncClient) -> None:
    headers = await _auth_header(client)
    files = {"file": ("cxr.png", make_png(), "image/png")}
    response = await client.post("/api/v1/predict", files=files, headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["predicted_class"] in {"NORMAL", "PNEUMONIA"}
    assert 0.0 <= body["confidence"] <= 1.0
    assert set(body["probabilities"]) == {"NORMAL", "PNEUMONIA"}
    assert body["model_arch"] == "densenet121"
    assert body["gradcam"]["original"].startswith("/media/gradcam/")
    assert body["gradcam"]["heatmap"].startswith("/media/gradcam/")
    assert body["gradcam"]["overlay"].startswith("/media/gradcam/")
    assert body["image_url"].startswith("/media/uploads/")
    # Report generated through the provider abstraction (mock in tests).
    assert body["report"]["llm_provider"] == "mock"
    assert body["report"]["risk_level"] in {"low", "moderate", "high"}
    assert body["report"]["content_markdown"]


async def test_predict_then_fetch_and_report(client: AsyncClient) -> None:
    headers = await _auth_header(client)
    files = {"file": ("cxr.png", make_png(), "image/png")}
    created = (await client.post("/api/v1/predict", files=files, headers=headers)).json()
    prediction_id = created["id"]

    fetched = await client.get(f"/api/v1/predict/{prediction_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == prediction_id

    report = await client.get(f"/api/v1/reports/{prediction_id}", headers=headers)
    assert report.status_code == 200
    assert report.json()["prediction_id"] == prediction_id

    history = await client.get("/api/v1/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["total"] >= 1


async def test_predict_is_idempotent(client: AsyncClient) -> None:
    headers = {**await _auth_header(client), "Idempotency-Key": "abc-123"}
    files = {"file": ("cxr.png", make_png(), "image/png")}
    first = await client.post("/api/v1/predict", files=files, headers=headers)
    second = await client.post(
        "/api/v1/predict",
        files={"file": ("cxr.png", make_png(), "image/png")},
        headers=headers,
    )
    assert first.status_code == 201
    assert first.json()["id"] == second.json()["id"]


async def test_predict_requires_auth(client: AsyncClient) -> None:
    files = {"file": ("cxr.png", make_png(), "image/png")}
    response = await client.post("/api/v1/predict", files=files)
    assert response.status_code == 401


async def test_predict_rejects_non_image(client: AsyncClient) -> None:
    headers = await _auth_header(client)
    files = {"file": ("evil.png", b"not really an image", "image/png")}
    response = await client.post("/api/v1/predict", files=files, headers=headers)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_regenerate_report(client: AsyncClient) -> None:
    headers = await _auth_header(client)
    files = {"file": ("cxr.png", make_png(), "image/png")}
    created = (await client.post("/api/v1/predict", files=files, headers=headers)).json()
    prediction_id = created["id"]
    response = await client.post(
        f"/api/v1/reports/{prediction_id}/regenerate", headers=headers
    )
    assert response.status_code == 200
    assert response.json()["prediction_id"] == prediction_id
