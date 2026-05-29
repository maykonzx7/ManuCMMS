#!/usr/bin/env bash
# Coleta evidências NF reproduzíveis para o DDE ManuCMMS.
# Requisitos: curl, docker (NF-04/05/10).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVID="$ROOT/docs/evidencias"
API="${API_BASE_URL:-http://localhost:3000}"
FRONT="${FRONTEND_BASE_URL:-http://localhost:3001}"
DATE="$(date -Iseconds)"

# Detecta containers dev (docker-compose.yml) ou prod (docker-compose.prod.yml).
resolve_container() {
  local base="$1"
  local name
  for name in "$base" "${base}-prod"; do
    if docker ps --format '{{.Names}}' 2>/dev/null | rg -qx "$name"; then
      echo "$name"
      return 0
    fi
  done
  return 1
}

MONGO_USER="${MONGO_USER:-manucmms}"
MONGO_PASS="${MONGO_PASS:-}"
RABBIT_CONTAINER="$(resolve_container manucmms-rabbitmq || true)"
MONGO_CONTAINER="$(resolve_container manucmms-mongo || true)"
POSTGRES_CONTAINER="$(resolve_container manucmms-postgres || true)"
if [[ -z "$MONGO_PASS" ]]; then
  if [[ "$MONGO_CONTAINER" == *-prod ]]; then
    MONGO_PASS=manucmms_prod
  else
    MONGO_PASS=manucmms_dev
  fi
fi

mkdir -p "$EVID/NF-01-performance" "$EVID/NF-04-health" "$EVID/NF-05-auditoria" \
  "$EVID/NF-08-circuit-breaker" "$EVID/NF-10-backup" "$EVID/NF-03-screenshots"

echo "[NF-01] Tempo de resposta HTTP (curl)..."
python3 - <<PY
import json, subprocess, datetime

front = "$FRONT"
pages = [
    ("acesso", f"{front}/workspace/acesso"),
    ("convite", f"{front}/workspace/convite"),
]
rows = []
for name, url in pages:
    proc = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code} %{time_total} %{time_starttransfer}", url],
        capture_output=True,
        text=True,
    )
    parts = (proc.stdout or "").strip().split()
    code = int(parts[0]) if parts else 0
    total = float(parts[1]) if len(parts) > 1 else None
    ttfb = float(parts[2]) if len(parts) > 2 else None
    rows.append({
        "pagina": name,
        "url": url,
        "http_code": code,
        "time_total_s": total,
        "time_ttfb_s": ttfb,
        "aceite_local": code == 200 and (ttfb or 99) < 2.0,
    })

out = {
    "data": "$DATE",
    "metodo": "curl (sem Lighthouse)",
    "criterio": "HTTP 200 e TTFB < 2s nas páginas públicas",
    "paginas": rows,
}
path = "$EVID/NF-01-performance/resumo-tempo-resposta.json"
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print(f"  → {path}")
PY

echo "[NF-04] Health com todos os serviços..."
curl -s "$API/health" > "$EVID/NF-04-health/health-all-up.json"

if [[ -n "$RABBIT_CONTAINER" ]]; then
  echo "[NF-04] Simulando indisponibilidade do RabbitMQ ($RABBIT_CONTAINER)..."
  docker stop "$RABBIT_CONTAINER" >/dev/null
  sleep 3
  curl -s "$API/health" > "$EVID/NF-04-health/health-rabbit-down.json"
  docker start "$RABBIT_CONTAINER" >/dev/null
  sleep 8
  curl -s "$API/health" > "$EVID/NF-04-health/health-recovered.json"
fi

if [[ -n "$MONGO_CONTAINER" ]]; then
  echo "[NF-05] Amostra de log de auditoria (MongoDB — $MONGO_CONTAINER)..."
  docker exec "$MONGO_CONTAINER" mongosh "mongodb://${MONGO_USER}:${MONGO_PASS}@127.0.0.1:27017/manucmms?authSource=admin" \
    --quiet --eval 'JSON.stringify(db.log_auditoria.find({}, {entidade_afetada:1, id_usuario:1, valor_anterior:1, valor_novo:1, created_at:1}).sort({created_at:-1}).limit(5).toArray(), null, 2)' \
    > "$EVID/NF-05-auditoria/amostra-log-auditoria.json" || true
fi

if [[ -n "$POSTGRES_CONTAINER" ]]; then
  echo "[NF-10] Backup Postgres ($POSTGRES_CONTAINER)..."
  DUMP="$EVID/NF-10-backup/manucmms-$(date +%F).dump"
  docker exec "$POSTGRES_CONTAINER" pg_dump -U manucmms -Fc manucmms > "$DUMP" || true
  echo "{\"arquivo\":\"$(basename "$DUMP")\",\"data\":\"$DATE\",\"tipo\":\"pg_dump -Fc\"}" \
    > "$EVID/NF-10-backup/ultimo-backup.json"
fi

if [[ -n "$MONGO_CONTAINER" ]]; then
  echo "[NF-10] Backup MongoDB auditoria ($MONGO_CONTAINER)..."
  docker exec "$MONGO_CONTAINER" mongodump \
    --uri="mongodb://${MONGO_USER}:${MONGO_PASS}@127.0.0.1:27017/manucmms?authSource=admin" \
    --gzip --archive=/tmp/audit.gz 2>/dev/null || true
  docker cp "$MONGO_CONTAINER:/tmp/audit.gz" "$EVID/NF-10-backup/audit-$(date +%F).gz" 2>/dev/null || true
fi

echo "Coleta concluída em $DATE"
echo "Artefatos em: $EVID"
echo "NF-11 (a11y): evidência manual — docs/evidencias/NF-11-a11y/README.md"
