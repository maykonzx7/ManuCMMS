#!/bin/sh
set -e

echo "[entrypoint] NODE_ENV=${NODE_ENV:-development}"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] prisma migrate deploy..."
  node scripts/run-prisma.cjs migrate deploy
else
  echo "[entrypoint] DATABASE_URL ausente — pulando migrate deploy" >&2
fi

exec node dist/main
