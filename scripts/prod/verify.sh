#!/usr/bin/env bash
# Valida build e endpoints antes do go-live (local ou homolog HTTPS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API="${API_BASE_URL:-http://127.0.0.1:3000}"
FRONT="${FRONTEND_BASE_URL:-http://127.0.0.1:3001}"
FAIL=0

check() {
  local label="$1" cmd="$2"
  echo "→ $label"
  if eval "$cmd"; then
    echo "  OK"
  else
    echo "  FALHOU" >&2
    FAIL=1
  fi
}

echo "=== Build backend ==="
check "npm run build" "(cd backend && npm run build)"

echo "=== Build frontend ==="
check "npm run build" "(cd frontend && npm run build)"

echo "=== Endpoints ($API) ==="
check "GET /health" "curl -sf '$API/health' | head -c 200"
check "GET /" "curl -sf -o /dev/null -w '%{http_code}' '$API/' | rg -q '200|404'"

if curl -sf "$FRONT/workspace/acesso" >/dev/null 2>&1; then
  check "GET frontend /workspace/acesso" "curl -sf -o /dev/null '$FRONT/workspace/acesso'"
else
  echo "→ Frontend não responde em $FRONT (inicie: cd frontend && npm run start -p 3001)"
fi

if [[ -x scripts/homolog/check-homolog.sh ]] && [[ "$API" == https://* ]]; then
  echo "=== Homolog HTTPS ==="
  API_BASE_URL="$API" FRONTEND_BASE_URL="$FRONT" ./scripts/homolog/check-homolog.sh
fi

exit "$FAIL"
