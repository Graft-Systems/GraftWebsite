SHELL := /bin/sh

BACKEND_DIR := backend
FRONTEND_DIR := frontend
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8080
BACKEND_ADDR := $(BACKEND_HOST):$(BACKEND_PORT)

.PHONY: help setup setup-backend setup-frontend migrate backend frontend dev run

help:
	@echo "Available targets:"
	@echo "  make setup          Install frontend and backend dependencies"
	@echo "  make migrate        Run Django migrations"
	@echo "  make backend        Start Django backend at http://$(BACKEND_ADDR)"
	@echo "  make frontend       Start Next.js frontend (default http://localhost:3000)"
	@echo "  make dev            Start backend and frontend together"
	@echo "  make run            Alias for make dev"

setup: setup-backend setup-frontend

setup-backend:
	@cd $(BACKEND_DIR) && \
	if [ ! -x ".venv/bin/python" ]; then \
		python3 -m venv .venv; \
	fi && \
	.venv/bin/pip install -r requirements.txt

setup-frontend:
	@cd $(FRONTEND_DIR) && npm install

migrate:
	@cd $(BACKEND_DIR) && \
	if [ -x ".venv/bin/python" ]; then \
		PYTHON_BIN=".venv/bin/python"; \
	elif [ -x "../env/bin/python" ]; then \
		PYTHON_BIN="../env/bin/python"; \
	else \
		PYTHON_BIN="python3"; \
	fi; \
	$$PYTHON_BIN manage.py migrate

backend:
	@cd $(BACKEND_DIR) && \
	if [ -x ".venv/bin/python" ]; then \
		PYTHON_BIN=".venv/bin/python"; \
	elif [ -x "../env/bin/python" ]; then \
		PYTHON_BIN="../env/bin/python"; \
	else \
		PYTHON_BIN="python3"; \
	fi; \
	$$PYTHON_BIN manage.py runserver $(BACKEND_ADDR)

frontend:
	@cd $(FRONTEND_DIR) && \
	if [ ! -x "node_modules/.bin/next" ]; then \
		echo "Frontend dependencies missing. Running npm install..."; \
		npm install; \
	fi && \
	npm run dev

dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

run: dev
