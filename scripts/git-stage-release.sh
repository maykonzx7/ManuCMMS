#!/usr/bin/env bash
# Stage apenas código-fonte (evita node_modules e uploads).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git reset HEAD

git add .gitignore .github/workflows/ scripts/

git add \
  backend/package.json backend/package-lock.json \
  backend/prisma backend/src backend/test

git add \
  frontend/package.json frontend/package-lock.json \
  frontend/app frontend/components frontend/hooks frontend/lib \
  frontend/next-env.d.ts frontend/next.config.mjs frontend/tsconfig.json \
  frontend/postcss.config.mjs frontend/components.json 2>/dev/null || true

git add -f \
  docs/04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md \
  docs/05-CRONOGRAMA-E-FASES.md \
  docs/08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md \
  docs/10-MANUAL-DO-USUARIO-ESQUELETO.md \
  docs/14-DEPLOY-HOMOLOGACAO.md \
  docs/STATUS-MODULOS-OBRIGATORIOS.md \
  docs/IoT-ESCOPO-DDE.md \
  docs/HOMOLOG-URL.md \
  docs/ENSAIO-DEFESA.md \
  docs/evidencias/

if git ls-files --error-unmatch ManuCMMS/.gitignore &>/dev/null; then
  git rm -r -q ManuCMMS
fi

git reset HEAD -- docs/evidencias/NF-10-backup/*.dump docs/evidencias/NF-10-backup/*.gz 2>/dev/null || true

STAGED=$(git diff --cached --name-only | wc -l)
NM=$(git diff --cached --name-only | { rg 'node_modules' || true; } | wc -l)
echo "Arquivos no stage: $STAGED (node_modules: $NM)"
if [[ "$NM" -gt 0 ]]; then
  echo "ERRO: node_modules no stage." >&2
  exit 1
fi
