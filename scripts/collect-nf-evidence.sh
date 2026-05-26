#!/usr/bin/env bash
# Coleta evidências NF reproduzíveis para o DDE ManuCMMS.
# Requisitos: curl, docker, python3, Chrome/Chromium (para Lighthouse).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVID="$ROOT/docs/evidencias"
API="${API_BASE_URL:-http://localhost:3000}"
FRONT="${FRONTEND_BASE_URL:-http://localhost:3001}"
DATE="$(date -Iseconds)"

# Lighthouse (chrome-launcher) exige CHROME_PATH no Linux quando não há Chrome em paths padrão.
resolve_chrome_path() {
  local candidate
  if [[ -n "${CHROME_PATH:-}" && -x "$CHROME_PATH" ]]; then
    echo "$CHROME_PATH"
    return 0
  fi
  for candidate in \
    /usr/bin/chromium \
    /usr/bin/chromium-browser \
    /usr/bin/google-chrome-stable \
    /usr/bin/google-chrome \
    /usr/bin/brave \
    /opt/google/chrome/chrome; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  if command -v chromium >/dev/null 2>&1; then
    command -v chromium
    return 0
  fi
  if command -v google-chrome-stable >/dev/null 2>&1; then
    command -v google-chrome-stable
    return 0
  fi
  return 1
}

mkdir -p "$EVID/NF-01-lighthouse" "$EVID/NF-04-health" "$EVID/NF-05-auditoria" \
  "$EVID/NF-08-circuit-breaker" "$EVID/NF-10-backup" "$EVID/NF-03-screenshots"

echo "[NF-04] Health com todos os serviços..."
curl -s "$API/health" > "$EVID/NF-04-health/health-all-up.json"

if docker ps --format '{{.Names}}' | rg -q '^manucmms-rabbitmq$'; then
  echo "[NF-04] Simulando indisponibilidade do RabbitMQ..."
  docker stop manucmms-rabbitmq >/dev/null
  sleep 3
  curl -s "$API/health" > "$EVID/NF-04-health/health-rabbit-down.json"
  docker start manucmms-rabbitmq >/dev/null
  sleep 8
  curl -s "$API/health" > "$EVID/NF-04-health/health-recovered.json"
fi

echo "[NF-05] Amostra de log de auditoria (MongoDB)..."
docker exec manucmms-mongo mongosh "mongodb://manucmms:manucmms_dev@127.0.0.1:27017/manucmms?authSource=admin" \
  --quiet --eval 'JSON.stringify(db.log_auditoria.find({}, {entidade_afetada:1, id_usuario:1, valor_anterior:1, valor_novo:1, created_at:1}).sort({created_at:-1}).limit(5).toArray(), null, 2)' \
  > "$EVID/NF-05-auditoria/amostra-log-auditoria.json" || true

if command -v lighthouse >/dev/null 2>&1 || npx --yes lighthouse --version >/dev/null 2>&1; then
  if CHROME_BIN="$(resolve_chrome_path)"; then
    export CHROME_PATH="$CHROME_BIN"
    echo "[NF-01/NF-11] Lighthouse (Chrome: $CHROME_PATH)..."
    LH_FAILED=0
    for spec in "acesso|$FRONT/workspace/acesso" "convite|$FRONT/workspace/convite"; do
      name="${spec%%|*}"
      url="${spec#*|}"
      if ! npx --yes lighthouse@12.6.1 "$url" \
        --quiet \
        --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
        --output=json --output=html \
        --output-path="$EVID/NF-01-lighthouse/${name}-desktop" \
        --only-categories=performance,accessibility,best-practices,seo; then
        LH_FAILED=1
        echo "[NF-01] Falha Lighthouse desktop: $name ($url)" >&2
      fi
      if ! npx --yes lighthouse@12.6.1 "$url" \
        --quiet \
        --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
        --form-factor=mobile --screenEmulation.mobile=true \
        --output=json \
        --output-path="$EVID/NF-01-lighthouse/${name}-mobile" \
        --only-categories=performance,accessibility,best-practices,seo; then
        LH_FAILED=1
        echo "[NF-01] Falha Lighthouse mobile: $name ($url)" >&2
      fi
    done
    if [[ "$LH_FAILED" -eq 1 ]]; then
      echo "[NF-01] Alguns relatórios Lighthouse falharam — confira se o frontend responde em $FRONT" >&2
    fi
  else
    echo "[NF-01] Chromium/Chrome não encontrado (Lighthouse não usa Firefox)." >&2
    echo "  Só para esta coleta: sudo pacman -S chromium" >&2
    echo "  Confirme: test -x /usr/bin/chromium && export CHROME_PATH=/usr/bin/chromium" >&2
    echo "  NF-11 no Firefox: extensão axe DevTools — ver docs/evidencias/NF-01-lighthouse/README.md" >&2
    echo "  Reexecute: ./scripts/collect-nf-evidence.sh" >&2
  fi
  python3 - <<PY
import json, glob, os
base = "$EVID/NF-01-lighthouse"
rows = []
for path in glob.glob(base + "/*.report.json"):
    with open(path) as f:
        data = json.load(f)
    cats = data.get("categories", {})
    rows.append({
        "arquivo": os.path.basename(path),
        "url": data.get("finalUrl"),
        "performance": round((cats.get("performance") or {}).get("score", 0) * 100),
        "accessibility": round((cats.get("accessibility") or {}).get("score", 0) * 100),
        "best_practices": round((cats.get("best-practices") or {}).get("score", 0) * 100),
        "seo": round((cats.get("seo") or {}).get("score", 0) * 100),
    })
with open(base + "/resumo-scores.json", "w") as f:
    json.dump(rows, f, indent=2)
PY
else
  echo "[NF-01] Lighthouse não disponível — instale Chromium/Chrome e reexecute."
fi

if docker ps --format '{{.Names}}' | rg -q '^manucmms-postgres$'; then
  echo "[NF-10] Backup Postgres..."
  DUMP="$EVID/NF-10-backup/manucmms-$(date +%F).dump"
  docker exec manucmms-postgres pg_dump -U manucmms -Fc manucmms > "$DUMP" || true
  echo "{\"arquivo\":\"$(basename "$DUMP")\",\"data\":\"$DATE\",\"tipo\":\"pg_dump -Fc\"}" \
    > "$EVID/NF-10-backup/ultimo-backup.json"
fi

if docker ps --format '{{.Names}}' | rg -q '^manucmms-mongo$'; then
  echo "[NF-10] Backup MongoDB auditoria..."
  docker exec manucmms-mongo mongodump \
    --uri="mongodb://manucmms:manucmms_dev@127.0.0.1:27017/manucmms?authSource=admin" \
    --gzip --archive=/tmp/audit.gz 2>/dev/null || true
  docker cp manucmms-mongo:/tmp/audit.gz "$EVID/NF-10-backup/audit-$(date +%F).gz" 2>/dev/null || true
fi

echo "Coleta concluída em $DATE"
echo "Artefatos em: $EVID"
