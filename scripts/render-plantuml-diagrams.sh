#!/usr/bin/env bash
# Renderiza .puml → PNG em docs/relatorio-assets/diagramas/
# Prioridade: Docker plantuml/plantuml → Kroki (fallback).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/relatorio-assets/plantuml"
OUT="$ROOT/docs/relatorio-assets/diagramas"
mkdir -p "$OUT"

rename_outputs() {
  for f in "$OUT"/apendice_*.png; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f" .png)"
    hyp="${base//_/-}"
    [[ "$base" == "$hyp" ]] || mv "$f" "$OUT/${hyp}.png"
  done
}

render_docker() {
  # -Sdpi=300 → adequado para impressão e Google Docs
  docker run --rm \
    -v "$SRC:/in:ro" \
    -v "$OUT:/out" \
    plantuml/plantuml:latest \
    -tpng -Sdpi=300 -o /out '/in/apendice-*.puml'
  rename_outputs
}

render_kroki() {
  local ok=0 fail=0
  for puml in "$SRC"/*.puml; do
    [[ -f "$puml" ]] || continue
    base="$(basename "$puml" .puml)"
    dest="$OUT/${base}.png"
    echo "Kroki: $base ..."
    if curl -fsS --max-time 90 -X POST \
      -H "Content-Type: text/plain" \
      --data-binary @"$puml" \
      "https://kroki.io/plantuml/png" \
      -o "$dest"; then
      ok=$((ok + 1))
    else
      fail=$((fail + 1))
    fi
  done
  echo "Kroki: $ok OK, $fail falhas"
}

if command -v docker >/dev/null 2>&1; then
  echo "Renderizando via Docker (plantuml/plantuml) ..."
  if render_docker; then
    echo "PlantUML Docker OK → $OUT"
    ls -1 "$OUT"/*.png 2>/dev/null | wc -l | xargs -I{} echo "{} PNG gerados"
    exit 0
  fi
  echo "AVISO: Docker falhou, tentando Kroki ..." >&2
fi

if command -v curl >/dev/null 2>&1; then
  render_kroki
else
  echo "Instale Docker ou curl para renderizar diagramas." >&2
  exit 1
fi
