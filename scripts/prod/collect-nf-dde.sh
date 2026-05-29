#!/usr/bin/env bash
# Orquestra coleta de evidências NF para a defesa DDE.
# Local: sobe frontend prod + usa API docker-compose.prod.
# Homolog: export API_BASE_URL e FRONTEND_BASE_URL (HTTPS) antes de executar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API="${API_BASE_URL:-http://127.0.0.1:3000}"
FRONT="${FRONTEND_BASE_URL:-http://127.0.0.1:3001}"
EVID="$ROOT/docs/evidencias"
START_FRONTEND="${START_FRONTEND:-1}"

mkdir -p "$EVID/NF-02-zap" "$EVID/NF-06-k6" "$EVID/NF-07-uptime"

echo "=== ManuCMMS — coleta NF DDE ==="
echo "API:      $API"
echo "Frontend: $FRONT"
echo

if [[ "$START_FRONTEND" == "1" && "$FRONT" == http://127.0.0.1:* ]]; then
  if ! curl -sf "$FRONT/workspace/acesso" >/dev/null 2>&1; then
    echo "[frontend] Build + start em $FRONT..."
    (cd frontend && npm run build && npx next start -p "${FRONT##*:}" &)
    for i in $(seq 1 30); do
      curl -sf "$FRONT/workspace/acesso" >/dev/null 2>&1 && break
      sleep 2
    done
  fi
fi

echo "[1/4] Evidências locais (NF-01 performance, 04, 05, 10)..."
chmod +x scripts/collect-nf-evidence.sh
API_BASE_URL="$API" FRONTEND_BASE_URL="$FRONT" ./scripts/collect-nf-evidence.sh

echo "[2/4] Screenshots públicos NF-03..."
if [[ -x scripts/capture-nf03-screenshots.sh ]]; then
  FRONTEND_BASE_URL="$FRONT" ./scripts/capture-nf03-screenshots.sh || true
fi

if [[ "$API" == https://* && "$FRONT" == https://* ]]; then
  echo "[3/4] ZAP baseline NF-02 (HTTPS)..."
  TARGET_URL="$FRONT" ./scripts/nf-zap-baseline.sh || true

  if command -v k6 >/dev/null 2>&1; then
    echo "[4/4] k6 carga NF-06..."
    k6 run -e "API_BASE_URL=$API" \
      --out "json=$EVID/NF-06-k6/resultado-$(date +%F).json" \
      scripts/nf-k6-load.js || true
  else
    echo "[4/4] k6 não instalado — pule ou: k6 run -e API_BASE_URL=$API scripts/nf-k6-load.js"
  fi
else
  echo "[3/4] NF-02 ZAP — requer FRONTEND_BASE_URL HTTPS (após deploy Vercel)"
  echo "[4/4] NF-06 k6 — recomendado contra API HTTPS de homolog"
fi

cat > "$EVID/ultima-coleta.json" <<EOF
{
  "data": "$(date -Iseconds)",
  "api": "$API",
  "frontend": "$FRONT",
  "https": $([[ "$API" == https://* ]] && echo true || echo false)
}
EOF

echo
echo "Coleta finalizada. Artefatos em: docs/evidencias/"
echo "Pendências manuais:"
echo "  - NF-11: axe DevTools — docs/evidencias/NF-11-a11y/README.md"
echo "  - NF-03: screenshots autenticados (DevTools) — docs/evidencias/NF-03-responsividade.md"
echo "  - NF-07: cadastrar monitor em $API/health (UptimeRobot)"
echo "  - NF-08: screenshot UI circuit breaker — docs/evidencias/NF-08-circuit-breaker/PROCEDIMENTO-UI.md"
echo "  - Homolog: preencher docs/HOMOLOG-URL.md após deploy"
