#!/bin/sh
set -e

echo "[entrypoint] NODE_ENV=${NODE_ENV:-development}"

if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    *@localhost:*|*@127.0.0.1:*|*@postgres:*)
      echo "[entrypoint] ERRO: DATABASE_URL aponta para host local/docker." >&2
      echo "[entrypoint] No Render, use a URI do Supabase (Dashboard → Database → Connection string)." >&2
      echo "[entrypoint] Ou remova DATABASE_URL e defina SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD." >&2
      exit 1
      ;;
  esac
  echo "[entrypoint] prisma migrate deploy..."
  node scripts/run-prisma.cjs migrate deploy
else
  echo "[entrypoint] DATABASE_URL ausente — pulando migrate deploy" >&2
fi

exec node dist/main
