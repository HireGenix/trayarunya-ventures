# Content Engine API — common developer/CI commands.
# Usage: make <target>  (run from content-engine/api)

PY := .venv/bin/python
PIP := .venv/bin/pip
ALEMBIC := .venv/bin/alembic

.DEFAULT_GOAL := help

.PHONY: help install test migrate migrate-new stamp run worker build-check lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install runtime + test dependencies into .venv
	$(PIP) install -r requirements.txt

test: ## Run the test suite
	$(PY) -m pytest

migrate: ## Apply all migrations (alembic upgrade head)
	$(ALEMBIC) upgrade head

migrate-new: ## Autogenerate a migration: make migrate-new m="add x table"
	$(ALEMBIC) revision --autogenerate -m "$(m)"

stamp: ## Mark an existing DB as baseline without running DDL
	$(ALEMBIC) stamp 0001_baseline

run: ## Run the API (dev) on :8099
	$(PY) -m uvicorn app.main:app --reload --port 8099

worker: ## Run the background worker
	$(PY) -m app.worker.run_worker

build-check: ## Import-build the app and print route count
	$(PY) -c "from app.main import create_app; print('routes:', len(create_app().routes))"

lint: ## Byte-compile all source (catches syntax errors without extra tools)
	$(PY) -m compileall -q app
