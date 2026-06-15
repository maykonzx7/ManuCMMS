#!/usr/bin/env bash
# Smoke test da stack RN-01 em produção (API + IoT ingestion + worker events).
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://manucmms.onrender.com}"
IOT_INGESTION_URL="${IOT_INGESTION_URL:-https://manucmms-iot-ingestion.onrender.com}"
WORKER_EVENTS_URL="${WORKER_EVENTS_URL:-https://manucmms-worker-events.onrender.com}"

check_health() {
  local label=$1 url=$2
  local code body
  body="$(mktemp)"
  code="$(curl -sS -o "$body" -w "%{http_code}" "${url%/}/health" || echo "000")"
  echo "[$label] GET ${url%/}/health → HTTP $code"
  head -c 400 "$body" 2>/dev/null || true
  echo
  rm -f "$body"
  [[ "$code" == "200" ]]
}

failed=0
check_health "API" "$API_BASE_URL" || failed=1
check_health "IoT ingestion" "$IOT_INGESTION_URL" || failed=1
check_health "Worker events" "$WORKER_EVENTS_URL" || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo ""
  echo "Um ou mais serviços não responderam 200 em /health." >&2
  echo "Aguarde o deploy no Render ou execute ./scripts/render/provision-microservices.sh" >&2
  exit 1
fi

echo ""
echo "Stack IoT OK — simule no painel: ${API_BASE_URL%/} (rota /iot após login)."
