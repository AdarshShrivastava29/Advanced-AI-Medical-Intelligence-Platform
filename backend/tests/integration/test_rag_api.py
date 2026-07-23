"""Integration tests for the RAG API: upload -> ingest -> grounded chat + refusal."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.helpers import make_pdf

pytestmark = pytest.mark.asyncio

_TEXT = (
    "Pneumonia is a lung infection causing cough, fever and breathlessness. "
    "It is treated with antibiotics, rest and fluids. Chest X-rays aid diagnosis."
)


async def _auth(client: AsyncClient, *, role_admin: bool = False) -> dict[str, str]:
    email = "kb-admin@example.com" if role_admin else "kb@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "KB User", "password": "password123"},
    )
    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "password123"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _upload(
    client: AsyncClient, headers: dict[str, str], *, data: bytes | None = None
) -> str:
    pdf = data if data is not None else make_pdf(_TEXT)
    files = {"file": ("guide.pdf", pdf, "application/pdf")}
    response = await client.post("/api/v1/documents", files=files, headers=headers)
    assert response.status_code == 202
    return response.json()["document"]["id"]


async def test_upload_ingests_and_indexes(client: AsyncClient) -> None:
    headers = await _auth(client)
    await _upload(client, headers)
    listing = await client.get("/api/v1/documents", headers=headers)
    assert listing.status_code == 200
    doc = listing.json()["items"][0]
    assert doc["status"] == "indexed"
    assert doc["chunk_count"] > 0
    assert doc["embedding_provider"] == "fake"


async def test_duplicate_upload_rejected(client: AsyncClient) -> None:
    headers = await _auth(client)
    pdf = make_pdf(_TEXT)
    await _upload(client, headers, data=pdf)
    dup = await client.post(
        "/api/v1/documents",
        files={"file": ("guide.pdf", pdf, "application/pdf")},  # identical bytes
        headers=headers,
    )
    assert dup.status_code == 409


async def test_non_pdf_rejected(client: AsyncClient) -> None:
    headers = await _auth(client)
    response = await client.post(
        "/api/v1/documents",
        files={"file": ("x.pdf", b"not a pdf", "application/pdf")},
        headers=headers,
    )
    assert response.status_code == 422


async def test_chat_is_grounded_with_citations(client: AsyncClient) -> None:
    headers = await _auth(client)
    await _upload(client, headers)
    response = await client.post(
        "/api/v1/chat",
        json={"message": "What are the symptoms and treatment of pneumonia?"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["grounded"] is True
    assert body["citations"]
    assert body["citations"][0]["filename"] == "guide.pdf"


async def test_chat_refuses_without_context(client: AsyncClient) -> None:
    headers = await _auth(client)
    await _upload(client, headers)
    response = await client.post(
        "/api/v1/chat",
        json={"message": "Describe blockchain consensus algorithms in depth."},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["grounded"] is False


async def test_chat_history_and_clear(client: AsyncClient) -> None:
    headers = await _auth(client)
    await _upload(client, headers)
    await client.post("/api/v1/chat", json={"message": "pneumonia treatment?"}, headers=headers)

    history = await client.get("/api/v1/chat/history", headers=headers)
    assert history.status_code == 200
    assert len(history.json()) == 2  # user + assistant

    cleared = await client.delete("/api/v1/chat/history", headers=headers)
    assert cleared.status_code == 204
    assert (await client.get("/api/v1/chat/history", headers=headers)).json() == []


async def test_chat_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/api/v1/chat", json={"message": "hi"})
    assert response.status_code == 401


async def test_delete_document_requires_doctor_role(client: AsyncClient) -> None:
    headers = await _auth(client)
    document_id = await _upload(client, headers)
    # Default role is 'user' -> forbidden.
    response = await client.delete(f"/api/v1/documents/{document_id}", headers=headers)
    assert response.status_code == 403
