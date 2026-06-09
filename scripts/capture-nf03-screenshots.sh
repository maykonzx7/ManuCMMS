#!/usr/bin/env bash
# NF-03 — capturas com Chromium headless (públicas + viewports da matriz DDE).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/evidencias/NF-03-screenshots"
FRONT="${FRONTEND_BASE_URL:-https://manucmms.vercel.app}"

CHROME="${CHROME_PATH:-}"
if [[ -z "$CHROME" || ! -x "$CHROME" ]]; then
  for c in /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome; do
    if [[ -x "$c" ]]; then CHROME="$c"; break; fi
  done
fi
if [[ -z "$CHROME" ]]; then
  echo "Chromium não encontrado. Defina CHROME_PATH ou instale chromium." >&2
  exit 1
fi

mkdir -p "$OUT"

capture() {
  local name="$1" url="$2" w="$3" h="$4"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="${w},${h}" \
    --screenshot="$OUT/${name}.png" "$url" 2>/dev/null
  echo "OK $OUT/${name}.png (${w}x${h})"
}

echo "NF-03 — capturas em $FRONT"

# Mobile 360×800
capture "acesso-360" "$FRONT/workspace/acesso" 360 800
capture "convite-360" "$FRONT/workspace/convite" 360 800
capture "workspace-360" "$FRONT/workspace" 360 800
capture "ordens-360" "$FRONT/workspace/ordens" 360 800

# Tablet 768×1024
capture "acesso-768" "$FRONT/workspace/acesso" 768 1024
capture "workspace-768" "$FRONT/workspace" 768 1024
capture "ordens-768" "$FRONT/workspace/ordens" 768 1024

# Desktop 1280×800
capture "acesso-1280" "$FRONT/workspace/acesso" 1280 800
capture "workspace-1280" "$FRONT/workspace" 1280 800
capture "ordens-1280" "$FRONT/workspace/ordens" 1280 800
capture "integracoes-1280" "$FRONT/workspace/integracoes" 1280 800

python3 - <<PY
import json, datetime, os
out = "$OUT"
files = sorted(f for f in os.listdir(out) if f.endswith(".png"))
meta = {
    "data": datetime.datetime.now().isoformat(),
    "frontend": "$FRONT",
    "viewports": ["360x800", "768x1024", "1280x800"],
    "capturas": files,
    "nota": "Rotas autenticadas redirecionam para login — evidência de layout público e shell responsivo."
}
with open(os.path.join(out, f"manifest-{datetime.date.today().isoformat()}.json"), "w") as f:
    json.dump(meta, f, indent=2)
print(f"Manifesto: {len(files)} capturas")
PY

echo "Páginas autenticadas (detalhe OS, assinatura): capturar após login se necessário."
