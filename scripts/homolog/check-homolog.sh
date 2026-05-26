#!/usr/bin/env bash
# Valida endpoints de homologação HTTPS (NF-04, deploy).
# Uso: API_BASE_URL=https://api.exemplo.com FRONTEND_BASE_URL=https://app.exemplo.com ./scripts/homolog/check-homolog.sh
set -euo pipefail

API="${API_BASE_URL:?Defina API_BASE_URL (ex: https://api.seudominio.com)}"
FRONT="${FRONTEND_BASE_URL:?Defina FRONTEND_BASE_URL}"

echo "API: $API"
echo "Frontend: $FRONT"

code_health=$(curl -s -o /tmp/health.json -w "%{http_code}" "$API/health")
echo "[NF-04] GET /health → HTTP $code_health"
cat /tmp/health.json | head -c 500
echo

code_front=$(curl -s -o /dev/null -w "%{http_code}" "$FRONT/workspace/acesso")
echo "[NF-01] GET /workspace/acesso → HTTP $code_front"

if [[ "$API" == https://* ]]; then
  echo "HTTPS API: ok"
else
  echo "AVISO: API não usa HTTPS" >&2
fi
