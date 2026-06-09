#!/usr/bin/env bash
# NF-11 — varredura a11y (axe-core + Playwright).
# Uso: FRONTEND_BASE_URL=https://manucmms.vercel.app ./scripts/nf-axe-scan.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONT="${FRONTEND_BASE_URL:?Defina FRONTEND_BASE_URL}"
TOOLS="${NF_TOOLS_DIR:-/tmp/manucmms-nf-tools}"

if [[ ! -d "$TOOLS/node_modules/playwright" ]]; then
  echo "[NF-11] Instalando playwright em $TOOLS..."
  npm install --prefix "$TOOLS" --no-save playwright@1.52.0 >/dev/null
  "$TOOLS/node_modules/.bin/playwright" install chromium >/dev/null
fi

export NODE_PATH="$TOOLS/node_modules"
export FRONTEND_BASE_URL="$FRONT"
node "$ROOT/scripts/nf-axe-playwright.mjs"
