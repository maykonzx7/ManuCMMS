#!/usr/bin/env bash
# NF-07 — sonda de disponibilidade (simula monitor externo).
# Uso: API_BASE_URL=https://manucmms.onrender.com PROBES=20 ./scripts/nf-uptime-probe.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/evidencias/NF-07-uptime"
API="${API_BASE_URL:?Defina API_BASE_URL}"
PROBES="${PROBES:-20}"
INTERVAL="${INTERVAL_SEC:-5}"
DATE="$(date -Iseconds)"

mkdir -p "$OUT"

ok=0
fail=0
results=()

echo "NF-07 — sondando $API/health ($PROBES probes, intervalo ${INTERVAL}s)..."

for i in $(seq 1 "$PROBES"); do
  started=$(date -Iseconds)
  code=$(curl -s -o /tmp/nf07-health.json -w "%{http_code}" --max-time 15 "$API/health" || echo "000")
  if [[ "$code" == "200" ]] && rg -q '"status":"ok"' /tmp/nf07-health.json 2>/dev/null; then
    ok=$((ok + 1))
    status="up"
  else
    fail=$((fail + 1))
    status="down"
  fi
  results+=("{\"probe\":$i,\"ts\":\"$started\",\"http_code\":$code,\"status\":\"$status\"}")
  echo "  probe $i/$PROBES → HTTP $code ($status)"
  sleep "$INTERVAL"
done

pct=$(python3 - <<PY
ok=$ok
total=$PROBES
print(round(100 * ok / total, 2))
PY
)

REPORT="$OUT/resumo-$(date +%F).json"
cat > "$REPORT" <<EOF
{
  "data": "$DATE",
  "alvo": "$API/health",
  "probes": $PROBES,
  "intervalo_seg": $INTERVAL,
  "sucesso": $ok,
  "falha": $fail,
  "uptime_pct": $pct,
  "aceite_dde": "NF-07 > 99%",
  "monitor_externo": "Cadastre UptimeRobot — ver docs/evidencias/NF-07-uptime/MONITOR-EXTERNO.md",
  "detalhes": [$(IFS=,; echo "${results[*]}")]
}
EOF

# Atualiza índice para defesa
cat > "$OUT/indice-uptime.json" <<EOF
{
  "ultima_sonda": "$REPORT",
  "uptime_pct": $pct,
  "probes": $PROBES,
  "alvo": "$API/health",
  "atualizado_em": "$DATE"
}
EOF

echo "Uptime na sonda: ${pct}% (${ok}/${PROBES})"
echo "Artefato: $REPORT"
