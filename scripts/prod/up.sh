#!/usr/bin/env bash
# Sobe stack de produção local (docker-compose.prod.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE ausente. Execute: ./scripts/prod/setup-env.sh" >&2
  exit 1
fi

if [[ ! -f backend/.env.production ]]; then
  echo "backend/.env.production ausente. Execute: ./scripts/prod/setup-env.sh" >&2
  exit 1
fi

echo "[prod] Build e subida dos containers..."
"${COMPOSE[@]}" up -d --build

echo "[prod] Se mongo/postgres ficarem unhealthy por credenciais antigas no volume:"
echo "  ${COMPOSE[*]} down -v && ./scripts/prod/up.sh"

echo "[prod] Aguardando healthcheck da API..."
API_PORT="$(rg -m1 '^API_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
API_PORT="${API_PORT:-3000}"
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    echo "[prod] API saudável em http://127.0.0.1:${API_PORT}/health"
    exit 0
  fi
  sleep 2
done

echo "[prod] API não respondeu a tempo — verifique: ${COMPOSE[*]} logs api" >&2
echo "[prod] Dica: se porta 3000 estiver em uso, defina API_PORT=3002 em .env.prod" >&2
exit 1
