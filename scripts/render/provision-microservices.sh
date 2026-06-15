#!/usr/bin/env bash
# Cria manucmms-iot-ingestion e manucmms-worker-events no Render (RN-01 em produção).
#
# Pré-requisitos:
#   1. ./scripts/render/install-cli.sh
#   2. Autenticação — uma das opções:
#        export RENDER_API_KEY=rnd_...   # Account Settings → API Keys
#        render login                    # interativo (salva token local)
#   3. jq instalado
#
# Uso:
#   cp .env.render.example .env.render   # opcional
#   source .env.render                   # opcional
#   ./scripts/render/provision-microservices.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/render/_render-api.sh
source "$ROOT/scripts/render/_render-api.sh"

export PATH="${PATH:-}:$HOME/.local/bin"

# shellcheck source=scripts/render/ensure-auth.sh
source "$ROOT/scripts/render/ensure-auth.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "Instale jq (ex.: sudo pacman -S jq)." >&2
  exit 1
fi

if ! command -v render >/dev/null 2>&1; then
  echo "Render CLI não encontrado. Execute: ./scripts/render/install-cli.sh" >&2
  exit 1
fi

echo "Validando render.yaml ..."
if ! render blueprints validate render.yaml --confirm 2>/dev/null; then
  echo "AVISO: validação via CLI ignorada (opcional: render login && render workspace set)." >&2
fi

API_CANDIDATES=(ManuCMMS manucmms manucmms-api)
API_ID=""
API_NAME=""
for candidate in "${API_CANDIDATES[@]}"; do
  id="$(render_find_service_id "$candidate" || true)"
  if [[ -n "$id" ]]; then
    API_ID="$id"
    API_NAME="$candidate"
    break
  fi
done

# Fallback: slug manucmms (URL pública)
if [[ -z "$API_ID" ]]; then
  while IFS= read -r row; do
    slug="$(echo "$row" | jq -r '.service.slug // empty')"
    if [[ "$slug" == "manucmms" ]]; then
      API_ID="$(echo "$row" | jq -r '.service.id')"
      API_NAME="$(echo "$row" | jq -r '.service.name')"
      break
    fi
  done < <(render_list_services)
fi

if [[ -z "$API_ID" ]]; then
  echo "Nenhum serviço 'manucmms' ou 'manucmms-api' encontrado no workspace." >&2
  echo "Crie a API no Render ou aplique o Blueprint (render.yaml) no Dashboard." >&2
  exit 1
fi

API_JSON="$(render_get_service "$API_ID")"
API_SLUG="$(echo "$API_JSON" | jq -r '.slug // "manucmms"')"
API_PUBLIC_URL="https://${API_SLUG}.onrender.com"
echo "Serviço API de referência: $API_NAME ($API_ID) → $API_PUBLIC_URL"
OWNER_ID="$(echo "$API_JSON" | jq -r '.ownerId // .service.ownerId')"
REPO="$(echo "$API_JSON" | jq -r '.repo // .service.repo // empty')"
BRANCH="$(echo "$API_JSON" | jq -r '.branch // .service.branch // "main"')"
REGION="$(echo "$API_JSON" | jq -r '.serviceDetails.region // .service.serviceDetails.region // "oregon"')"
PLAN="$(echo "$API_JSON" | jq -r '.serviceDetails.plan // .service.serviceDetails.plan // "free"')"

if [[ -z "$REPO" || "$REPO" == "null" ]]; then
  REPO="${RENDER_REPO:-https://github.com/maykonzx7/ManuCMMS}"
  echo "AVISO: repo não detectado na API; usando $REPO"
fi

SHARED_GROUP_ID="$(render_find_env_group_id manucmms-shared-infra || true)"
EMAIL_GROUP_ID="$(render_find_env_group_id manucmms-email || true)"

IOT_NAME=manucmms-iot-ingestion
WORKER_NAME=manucmms-worker-events
IOT_URL="https://${IOT_NAME}.onrender.com"
IOT_HEALTH="${IOT_URL}/health"

ensure_service() {
  local name=$1 dockerfile=$2
  shift 2
  local -a build_paths=("$@")

  local existing
  existing="$(render_find_service_id "$name" || true)"
  if [[ -n "$existing" ]]; then
    echo "Serviço $name já existe ($existing)." >&2
    echo "$existing"
    return
  fi

  echo "Criando serviço $name ..." >&2
  local new_id
  new_id="$(render_create_docker_service \
    "$name" "$OWNER_ID" "$REPO" "$BRANCH" "$REGION" "$PLAN" \
    "$dockerfile" "." "/health" \
    "${build_paths[@]}")"

  if [[ -z "$new_id" ]]; then
    echo "Falha ao criar $name." >&2
    exit 1
  fi
  echo "Criado: $name ($new_id)" >&2

  if [[ -n "$SHARED_GROUP_ID" ]]; then
    render_link_env_group "$SHARED_GROUP_ID" "$new_id"
    echo "  vinculado ao env group manucmms-shared-infra" >&2
  fi

  echo "$new_id"
}

configure_iot_env() {
  local id=$1
  if [[ -n "$SHARED_GROUP_ID" ]]; then
    render_set_env_var "$id" NODE_ENV production
    return
  fi
  echo "Copiando variáveis para $IOT_NAME ..."
  render_copy_env_vars "$API_ID" "$id" \
    DATABASE_URL RABBITMQ_URL REDIS_URL
  render_set_env_var "$id" NODE_ENV production
}

configure_worker_env() {
  local id=$1
  if [[ -n "$SHARED_GROUP_ID" ]]; then
    render_set_env_var "$id" NODE_ENV production
    if [[ -n "$EMAIL_GROUP_ID" ]]; then
      render_link_env_group "$EMAIL_GROUP_ID" "$id"
      echo "  vinculado ao env group manucmms-email"
    fi
    return
  fi
  echo "Copiando variáveis para $WORKER_NAME ..."
  render_copy_env_vars "$API_ID" "$id" \
    DATABASE_URL RABBITMQ_URL BREVO_API_KEY BREVO_SMTP_FROM_EMAIL BREVO_SMTP_FROM_NAME
  render_set_env_var "$id" NODE_ENV production
}

IOT_ID="$(ensure_service "$IOT_NAME" "./services/iot-ingestion/Dockerfile" \
  "services/iot-ingestion/**" "backend/prisma/**")"
configure_iot_env "$IOT_ID"

WORKER_ID="$(ensure_service "$WORKER_NAME" "./services/worker-events/Dockerfile" \
  "services/worker-events/**" "backend/prisma/**")"
configure_worker_env "$WORKER_ID"

echo "Atualizando IOT_* na API ($API_NAME) ..."
render_set_env_var "$API_ID" IOT_INGESTION_URL "$IOT_URL"
render_set_env_var "$API_ID" IOT_HEALTHCHECK_URL "$IOT_HEALTH"

deploy_and_wait() {
  local id=$1 label=$2
  echo "Deploy: $label ($id) ..."
  if [[ -n "${RENDER_API_KEY:-}" ]]; then
    render_trigger_deploy "$id" >/dev/null || true
  fi
  render deploys create "$id" --wait --confirm -o text || {
    echo "AVISO: deploy de $label ainda em andamento ou falhou — verifique no Dashboard." >&2
  }
}

deploy_and_wait "$IOT_ID" "$IOT_NAME"
deploy_and_wait "$WORKER_ID" "$WORKER_NAME"
deploy_and_wait "$API_ID" "$API_NAME"

echo ""
echo "Provisionamento concluído. Validando stack IoT ..."
API_BASE_URL="$API_PUBLIC_URL" \
  IOT_INGESTION_URL="$IOT_URL" \
  "$ROOT/scripts/render/check-iot-stack.sh"
