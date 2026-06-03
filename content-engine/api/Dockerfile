# Trayarunya Content Engine API
# Multi-stage image. Includes Playwright/Chromium so crawl4ai deep-crawl works in
# both the API (on-demand) and the worker container.
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# System deps for psycopg/asyncpg build + Chromium runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Install Chromium for crawl4ai/Playwright (browser + OS deps)
RUN python -m playwright install --with-deps chromium || \
    python -m playwright install chromium || true

COPY . .

EXPOSE 8000

# Default: API server. Worker overrides the command (see docker-compose / Azure).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
