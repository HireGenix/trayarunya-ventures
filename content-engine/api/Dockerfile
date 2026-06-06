# Trayarunya Content Engine API — APP image.
# Builds FROM the pre-baked base (system deps + Python packages + Chromium), so
# a per-commit build is just "copy source" and completes in seconds. The base
# is rebuilt by CI only when requirements.txt changes.
ARG BASE_IMAGE=trayarunyaacr.azurecr.io/ce-api-base:latest
FROM ${BASE_IMAGE}

WORKDIR /app

COPY . .

RUN chmod +x /app/start-api.sh

EXPOSE 8000

# Default: run migrations then start the API server. Worker overrides the command
# (see docker-compose / Azure) so it never runs migrations.
CMD ["/app/start-api.sh"]
