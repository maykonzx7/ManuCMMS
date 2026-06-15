#!/usr/bin/env bash
# Instala ou atualiza o Render CLI (https://render.com/docs/cli).
set -euo pipefail

INSTALL_DIR="${RENDER_CLI_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$INSTALL_DIR"

if command -v render >/dev/null 2>&1; then
  echo "Render CLI já instalado: $(render --version 2>&1 | head -1)"
  exit 0
fi

echo "Instalando Render CLI em $INSTALL_DIR ..."
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh

if ! command -v render >/dev/null 2>&1; then
  export PATH="$PATH:$INSTALL_DIR"
fi

if command -v render >/dev/null 2>&1; then
  echo "OK: $(render --version 2>&1 | head -1)"
  echo "Adicione ao PATH se necessário: export PATH=\"\$PATH:$INSTALL_DIR\""
else
  echo "Falha: render não encontrado após instalação." >&2
  exit 1
fi
