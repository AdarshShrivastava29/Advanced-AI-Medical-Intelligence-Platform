"""API smoke test — exercises the core endpoints against a running backend.

Usage: ``python scripts/smoke.py [base_url]`` (default http://localhost:8000).
Exits non-zero if any check fails. Intended for post-deploy verification and CI
against an ephemeral instance.
"""

from __future__ import annotations

import sys
import uuid

import httpx


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    client = httpx.Client(base_url=base, timeout=30.0)
    failures: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        status = "OK " if ok else "FAIL"
        print(f"[{status}] {name} {detail}")
        if not ok:
            failures.append(name)

    live = client.get("/health/live")
    check("GET /health/live", live.status_code == 200, str(live.status_code))

    metrics = client.get("/metrics")
    check(
        "GET /metrics",
        metrics.status_code == 200 and "aimip_http_requests_total" in metrics.text,
    )

    headers = client.get("/health/live").headers
    check("security headers", headers.get("X-Content-Type-Options") == "nosniff")

    email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Smoke", "password": "password123"},
    )
    check("POST /api/v1/auth/register", reg.status_code in (201, 503), str(reg.status_code))

    if reg.status_code == 201:
        login = client.post(
            "/api/v1/auth/login", json={"email": email, "password": "password123"}
        )
        check("POST /api/v1/auth/login", login.status_code == 200)
        token = login.json().get("access_token", "")
        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        check("GET /api/v1/auth/me", me.status_code == 200)

    print(f"\nSMOKE_{'PASS' if not failures else 'FAIL'} ({len(failures)} failures)")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
