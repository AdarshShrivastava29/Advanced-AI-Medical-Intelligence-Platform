#!/usr/bin/env bash
# Docker stack smoke test: brings the compose stack up, waits for health, and
# verifies the app responds through the nginx reverse proxy, then tears down.
set -euo pipefail

echo "→ Building and starting the stack…"
docker compose up --build -d

echo "→ Waiting for the reverse proxy health…"
for i in $(seq 1 60); do
  if curl -fsS http://localhost/health/ready >/dev/null 2>&1; then
    echo "✓ /health/ready is up"
    break
  fi
  sleep 3
  if [ "$i" -eq 60 ]; then
    echo "✗ Timed out waiting for the stack"
    docker compose logs --tail=50
    docker compose down
    exit 1
  fi
done

echo "→ Checking key routes through nginx…"
curl -fsS http://localhost/ >/dev/null && echo "✓ SPA served"
curl -fsS http://localhost/metrics | grep -q aimip_ && echo "✓ /metrics"
curl -fsS http://localhost/docs >/dev/null && echo "✓ /docs (Swagger)"

echo "→ Tearing down…"
docker compose down
echo "DOCKER_SMOKE_PASS"
