#!/usr/bin/env bash
# Carrega RENDER_API_KEY de .env.render, env ou token OAuth do Render CLI (~/.render/cli.yaml).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="${PATH:-}:$HOME/.local/bin"

if [[ -f "$ROOT/.env.render" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.render" && set +a
fi

load_cli_token() {
  local cfg="${RENDER_CLI_CONFIG_PATH:-$HOME/.render/cli.yaml}"
  [[ -f "$cfg" ]] || return 1
  local key
  key="$(python3 - "$cfg" <<'PY' 2>/dev/null || true
import sys
try:
    import yaml
except ImportError:
    sys.exit(1)
path = sys.argv[1]
with open(path) as f:
    data = yaml.safe_load(f) or {}
print((data.get("api") or {}).get("key") or "")
PY
)"
  if [[ -z "$key" ]]; then
    key="$(grep -E '^[[:space:]]+key:' "$cfg" 2>/dev/null | head -1 | sed -E 's/^[[:space:]]+key:[[:space:]]*//')"
    key="${key//\"/}"
    key="${key//\'/}"
  fi
  [[ -n "$key" ]] && echo "$key"
}

load_cli_workspace() {
  local cfg="${RENDER_CLI_CONFIG_PATH:-$HOME/.render/cli.yaml}"
  [[ -f "$cfg" ]] || return 1
  grep -E '^workspace:' "$cfg" 2>/dev/null | head -1 | sed -E 's/^workspace:[[:space:]]*//' | sed 's/["'\'']//g'
}

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  token="$(load_cli_token || true)"
  if [[ -n "$token" ]]; then
    export RENDER_API_KEY="$token"
  fi
fi

ensure_render_cli() {
  if command -v render >/dev/null 2>&1; then
    return 0
  fi
  "$ROOT/scripts/render/install-cli.sh"
}

ensure_workspace() {
  local ws
  ws="$(load_cli_workspace || true)"
  if [[ -n "$ws" ]]; then
    return 0
  fi
  local ws_id
  ws_id="$(render workspaces -o json --confirm 2>/dev/null | jq -r '.[0].workspace.id // .[0].id // empty' | head -1)"
  if [[ -n "$ws_id" ]]; then
    render workspace set "$ws_id" --confirm -o text >/dev/null
    echo "Workspace ativo: $ws_id"
  fi
}

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  ensure_render_cli
  echo "Autenticação Render necessária."
  echo "Abra o link abaixo e autorize o CLI (ou cancele e use RENDER_API_KEY em .env.render):"
  echo ""
  render login -o text
  token="$(load_cli_token || true)"
  if [[ -n "$token" ]]; then
    export RENDER_API_KEY="$token"
  fi
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "Falha: token não obtido após login." >&2
  exit 1
fi

ensure_render_cli
ensure_workspace
