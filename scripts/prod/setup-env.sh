#!/usr/bin/env bash
# Copia arquivos de exemplo de produção se ainda não existirem.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

copy_if_missing() {
  local src="$1" dst="$2"
  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
    echo "Criado: $dst (edite credenciais Supabase antes do go-live)"
  else
    echo "Já existe: $dst"
  fi
}

copy_if_missing ".env.prod.example" ".env.prod"
copy_if_missing "backend/.env.production.example" "backend/.env.production"

echo
echo "Próximo passo:"
echo "  1. Edite backend/.env.production (SUPABASE_*, FRONTEND_PUBLIC_BASE_URL, CORS_*)"
echo "  2. ./scripts/prod/up.sh"
