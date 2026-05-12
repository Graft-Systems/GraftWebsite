SHELL := /bin/sh

API_DIR := services/api
PNPM ?= corepack pnpm
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8080
BACKEND_ADDR := $(BACKEND_HOST):$(BACKEND_PORT)

.PHONY: help setup setup-api setup-web migrate backend frontend dev run lint type-check test test-api test-web build check schema-check

help:
	@echo "Available targets:"
	@echo "  make setup          Install workspace and API dependencies"
	@echo "  make migrate        Run Django migrations"
	@echo "  make backend        Start Django backend at http://$(BACKEND_ADDR)"
	@echo "  make frontend       Start Next.js frontend (default http://localhost:3000)"
	@echo "  make dev            Start backend and frontend together"
	@echo "  make lint           Run Turbo lint across workspaces"
	@echo "  make type-check     Run Turbo type checks across workspaces"
	@echo "  make test           Run web and API tests"
	@echo "  make build          Run Turbo builds across workspaces"
	@echo "  make check          Run lint, type-check, build, tests, and schema checks"
	@echo "  make run            Alias for make dev"

setup: setup-web setup-api

setup-api:
	@cd $(API_DIR) && \
	if [ ! -x ".venv/bin/python" ]; then \
		python3 -m venv .venv; \
	fi && \
	.venv/bin/pip install -r requirements.txt

setup-web:
	@$(PNPM) install

migrate:
	@cd $(API_DIR) && \
	if [ -x ".venv/bin/python" ]; then \
		PYTHON_BIN=".venv/bin/python"; \
	elif [ -x "../env/bin/python" ]; then \
		PYTHON_BIN="../env/bin/python"; \
	else \
		PYTHON_BIN="python3"; \
	fi; \
	$$PYTHON_BIN manage.py migrate

backend:
	@cd $(API_DIR) && \
	if [ -x ".venv/bin/python" ]; then \
		PYTHON_BIN=".venv/bin/python"; \
	elif [ -x "../env/bin/python" ]; then \
		PYTHON_BIN="../env/bin/python"; \
	else \
		PYTHON_BIN="python3"; \
	fi; \
	$$PYTHON_BIN manage.py runserver $(BACKEND_ADDR)

frontend:
	@$(PNPM) --filter @graft/web dev

lint:
	@$(PNPM) lint

type-check:
	@$(PNPM) type-check

test: test-web test-api

test-web:
	@$(PNPM) --filter @graft/web test

test-api:
	@cd $(API_DIR) && \
	if [ -x ".venv/bin/python" ]; then \
		PYTHON_BIN=".venv/bin/python"; \
	else \
		PYTHON_BIN="python3"; \
	fi; \
	$$PYTHON_BIN -m pytest spray/tests/ -q

build:
	@$(PNPM) build

schema-check:
	@python3 scripts/check_event_schemas.py

check: lint type-check build test schema-check

dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

run: dev
