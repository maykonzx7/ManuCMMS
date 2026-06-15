#!/usr/bin/env bash
# Coleta automática de assets do relatório PDSOB:
#   1) Renderiza PlantUML → PNG (Kroki)
#   2) Captura screenshots DEI/Manual (Playwright)
#   3) Injeta imagens no .md
#
# Uso:
#   ./scripts/collect-pdsob-assets.sh
#   PDSOB_TEST_EMAIL=... PDSOB_TEST_PASSWORD=... ./scripts/collect-pdsob-assets.sh
#   ./scripts/collect-pdsob-assets.sh --embed-base64   # para colar no Google Docs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EMBED=""
[[ "${1:-}" == "--embed-base64" ]] && EMBED="--embed-base64"

echo "=== [1/5] Renderizar diagramas PlantUML + DER ==="
chmod +x scripts/render-plantuml-diagrams.sh
./scripts/render-plantuml-diagrams.sh || echo "AVISO: PlantUML falhou (rede?). Diagramas .puml em docs/relatorio-assets/plantuml/"
python3 scripts/render-dem-der.py || echo "AVISO: DER PlantUML falhou"

echo ""
echo "=== [2/4] Screenshots NF-03 (fallback) ==="
if [[ -x scripts/capture-nf03-screenshots.sh ]]; then
  FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-https://manucmms.vercel.app}" \
    ./scripts/capture-nf03-screenshots.sh || true
fi

echo ""
echo "=== [3/5] Mockups DEI (4.2) ==="
python3 scripts/generate-sketch-mockups.py || echo "AVISO: mockups sketch falharam"

echo ""
echo "=== [4/5] Screenshots PDSOB (DEI + Manual) ==="
if command -v node >/dev/null 2>&1; then
  # playwright pode estar no backend ou instalado globalmente
  (cd backend 2>/dev/null && npm ls playwright >/dev/null 2>&1) || true
  FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-https://manucmms.vercel.app}" \
    node scripts/nf-pdsob-screenshots.mjs || echo "AVISO: Playwright não disponível — use fallbacks NF-03"
else
  echo "node não encontrado"
fi

echo ""
echo "=== [5/5] Injetar figuras no relatório ==="
python3 scripts/inject-pdsob-figures.py $EMBED

echo ""
echo "Concluído. Assets em docs/relatorio-assets/"
echo "Diagramas PNG: docs/relatorio-assets/diagramas/"
echo "Screenshots:   docs/relatorio-assets/screenshots/"
echo "Manifesto:     docs/relatorio-assets/FIGURAS.json"
echo ""
echo "Para Google Docs: ./scripts/collect-pdsob-assets.sh --embed-base64"
