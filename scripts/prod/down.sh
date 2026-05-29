#!/usr/bin/env bash
# Para stack de produção local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-.env.prod}"
cd "$ROOT"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml down "$@"
