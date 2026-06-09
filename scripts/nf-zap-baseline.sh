#!/usr/bin/env bash
# NF-02 — OWASP ZAP baseline (requer Docker e URL HTTPS pública).
# Uso: TARGET_URL=https://app.seudominio.com ./scripts/nf-zap-baseline.sh
set -euo pipefail

TARGET="${TARGET_URL:?Defina TARGET_URL (frontend HTTPS)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ZAP_OUT_DIR:-$ROOT/docs/evidencias/NF-02-zap}"
mkdir -p "$OUT"

docker run --rm -v "$OUT:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$TARGET" -r zap-baseline-report.html -J zap-baseline-report.json || true

echo "Relatórios em: $OUT"
