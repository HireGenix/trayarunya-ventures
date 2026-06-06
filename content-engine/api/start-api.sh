#!/bin/sh
# API container entrypoint: apply DB migrations (with retry while Postgres warms
# up), then start the API server. Worker containers override this command.
set -e

# The baseline migration (0001) builds the COMPLETE current schema via
# Base.metadata.create_all, so on a fresh database we apply only the baseline
# and then stamp the chain head (later migrations are already covered by
# create_all and would otherwise raise DuplicateTable errors). On an existing
# database we simply upgrade to head so future incremental migrations apply.
run_migrations() {
  current=$(alembic current 2>/dev/null | grep -oE '[0-9]{4}_[a-z_]+' | head -1 || true)
  if [ -z "$current" ]; then
    echo "[start-api] fresh database — applying baseline then stamping head..."
    alembic upgrade 0001_baseline
    alembic stamp head
  else
    echo "[start-api] existing database at '$current' — upgrading to head..."
    # Best-effort: a database stamped at an old revision can hit DuplicateTable
    # because the baseline already built those tables via create_all. The
    # auto-heal step below reconciles any remaining drift, so don't abort here.
    alembic upgrade head || echo "[start-api] upgrade head hit drift; auto-heal will reconcile."
  fi

  # Idempotent, additive reconciliation: guarantees every ORM table/column the
  # app expects actually exists, fixing drifted databases that migrations alone
  # cannot repair. Then align Alembic bookkeeping with the now-current schema.
  echo "[start-api] reconciling schema drift (auto-heal)..."
  python -m app.db_heal
  alembic stamp head
}

echo "[start-api] applying database migrations..."
n=0
until run_migrations; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "[start-api] migrations failed after $n attempts — aborting." >&2
    exit 1
  fi
  echo "[start-api] migration attempt $n failed; retrying in 5s..."
  sleep 5
done
echo "[start-api] migrations applied."

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
