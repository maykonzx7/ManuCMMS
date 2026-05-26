#!/usr/bin/env bash
# NF-03 — capturas públicas com Chromium headless (opcional).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/evidencias/NF-03-screenshots"
FRONT="${FRONTEND_BASE_URL:-http://localhost:3001}"

CHROME="${CHROME_PATH:-}"
if [[ -z "$CHROME" || ! -x "$CHROME" ]]; then
  for c in /usr/bin/chromium /usr/bin/chromium-browser; do
    if [[ -x "$c" ]]; then CHROME="$c"; break; fi
  done
fi
if [[ -z "$CHROME" ]]; then
  echo "Chromium não encontrado. Use Firefox DevTools — ver $OUT/README.md" >&2
  exit 1
fi

mkdir -p "$OUT"

capture() {
  local name="$1" url="$2" w="$3" h="$4"
  "$CHROME" --headless=new --disable-gpu --window-size="${w},${h}" \
    --screenshot="$OUT/${name}.png" "$url"
  echo "OK $OUT/${name}.png"
}

capture "acesso-360" "$FRONT/workspace/acesso" 360 800
capture "convite-360" "$FRONT/workspace/convite" 360 800

echo "Páginas autenticadas: capturar manualmente (login) — ver README.md"
