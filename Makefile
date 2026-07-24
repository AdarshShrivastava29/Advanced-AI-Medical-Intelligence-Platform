# AIMIP — one-command developer & deployment workflows.
.DEFAULT_GOAL := help
.PHONY: help up down logs build ps dev-backend dev-frontend test lint typecheck \
        backend-check frontend-check smoke

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ---- Docker (production stack) ----
up: ## Build + start the full stack (backend, worker, beat, frontend, nginx, mongo, redis)
	docker compose up --build -d
	@echo "AIMIP is starting → http://localhost"

down: ## Stop and remove the stack
	docker compose down

logs: ## Tail logs from all services
	docker compose logs -f

build: ## Build all images
	docker compose build

ps: ## Show service status
	docker compose ps

smoke: ## Curl the health endpoint through the reverse proxy
	curl -fsS http://localhost/health/ready && echo " OK"

# ---- Local development ----
dev-backend: ## Run the backend with autoreload
	cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload

dev-frontend: ## Run the Vite dev server
	cd frontend && npm run dev

# ---- Quality gates (mirror CI) ----
backend-check: ## Backend: ruff + mypy + pytest
	cd backend && ./.venv/Scripts/python.exe -m ruff check . && \
	  ./.venv/Scripts/python.exe -m mypy app tests && \
	  ./.venv/Scripts/python.exe -m pytest -q

frontend-check: ## Frontend: eslint + tsc + build + vitest
	cd frontend && npm run lint && npm run typecheck && npm run build && npm run test:run

test: backend-check frontend-check ## Run all quality gates
