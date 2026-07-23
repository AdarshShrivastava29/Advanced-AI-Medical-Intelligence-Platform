"""Integration tests for the auth flow and RBAC via the HTTP API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.application.services.auth_service import AuthService
from app.domain.value_objects.role import Role

pytestmark = pytest.mark.asyncio


async def _register_and_login(client: AsyncClient) -> dict[str, str]:
    """Register a user and return their token pair."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "full_name": "User One", "password": "password123"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()


async def test_register_returns_201_and_safe_projection(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "full_name": "New User", "password": "password123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "user"
    assert "password" not in body and "password_hash" not in body


async def test_register_duplicate_returns_409(client: AsyncClient) -> None:
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.headers["content-type"].startswith("application/problem+json")


async def test_login_and_access_me(client: AsyncClient) -> None:
    tokens = await _register_and_login(client)
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"


async def test_me_without_token_returns_401(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_refresh_rotates_tokens(client: AsyncClient) -> None:
    tokens = await _register_and_login(client)
    response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert response.status_code == 200
    assert response.json()["refresh_token"] != tokens["refresh_token"]


async def test_invalid_login_returns_401_problem(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@example.com", "password": "whatever1"},
    )
    assert response.status_code == 401
    assert response.json()["status"] == 401


async def test_rbac_user_forbidden_from_admin_route(client: AsyncClient) -> None:
    tokens = await _register_and_login(client)
    response = await client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert response.status_code == 403


async def test_rbac_admin_allowed(
    client: AsyncClient, auth_service: AuthService
) -> None:
    # Promote a registered account to admin directly via the service's repository.
    await auth_service.register(
        email="admin@example.com", full_name="Admin", password="password123", role=Role.ADMIN
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    access = login.json()["access_token"]
    response = await client.get(
        "/api/v1/users", headers={"Authorization": f"Bearer {access}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert "items" in body and "pages" in body


async def test_validation_error_returns_422(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "full_name": "", "password": "x"},
    )
    assert response.status_code == 422
    assert response.json()["title"] == "Validation Error"
