#!/usr/bin/env bash
# Helpers HTTP para a Render API (https://render.com/docs/api).
set -euo pipefail

RENDER_API_BASE="${RENDER_API_BASE:-https://api.render.com/v1}"

render_api() {
  local method=$1
  shift
  curl -sfS -X "$method" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$@"
}

render_list_services() {
  local cursor=""
  while true; do
    local url="${RENDER_API_BASE}/services?limit=100"
    if [[ -n "$cursor" ]]; then
      url="${url}&cursor=${cursor}"
    fi
    local page
    page="$(render_api GET "$url")"
    echo "$page" | jq -c '.[]'
    cursor="$(echo "$page" | jq -r '.[-1].cursor // empty')"
    [[ -z "$cursor" ]] && break
  done
}

render_find_service_id() {
  local name=$1
  render_list_services | jq -r --arg n "$name" 'select(.service.name == $n) | .service.id' | head -1
}

render_get_service() {
  local id=$1
  render_api GET "${RENDER_API_BASE}/services/${id}" | jq '.'
}

render_find_env_group_id() {
  local name=$1
  render_api GET "${RENDER_API_BASE}/env-groups?name=${name}&limit=20" \
    | jq -r --arg n "$name" '.[] | select(.name == $n) | .id' | head -1
}

render_link_env_group() {
  local group_id=$1 service_id=$2
  render_api POST "${RENDER_API_BASE}/env-groups/${group_id}/services/${service_id}" >/dev/null
}

render_list_env_vars() {
  local service_id=$1
  local cursor=""
  while true; do
    local url="${RENDER_API_BASE}/services/${service_id}/env-vars?limit=100"
    if [[ -n "$cursor" ]]; then
      url="${url}&cursor=${cursor}"
    fi
    local page
    page="$(render_api GET "$url")"
    echo "$page" | jq -c '.[]'
    cursor="$(echo "$page" | jq -r '.[-1].cursor // empty')"
    [[ -z "$cursor" ]] && break
  done
}

render_set_env_var() {
  local service_id=$1 key=$2 value=$3
  if [[ -z "$value" ]]; then
    echo "  AVISO: valor vazio para $key — ignorado." >&2
    return 0
  fi
  local encoded_key
  encoded_key="$(jq -nr --arg k "$key" '$k|@uri')"
  render_api PUT "${RENDER_API_BASE}/services/${service_id}/env-vars/${encoded_key}" \
    -d "$(jq -nc --arg v "$value" '{value: $v}')" >/dev/null
}

render_copy_env_vars() {
  local from_id=$1 to_id=$2
  shift 2
  local keys=("$@")
  local env_json
  env_json="$(render_list_env_vars "$from_id" | jq -s '.')"
  local key value
  for key in "${keys[@]}"; do
    value="$(echo "$env_json" | jq -r --arg k "$key" '.[] | select(.envVar.key == $k) | .envVar.value // empty' | head -1)"
    if [[ -n "$value" ]]; then
      render_set_env_var "$to_id" "$key" "$value"
      echo "  env: $key (copiado de serviço de referência)"
    else
      echo "  AVISO: $key ausente no serviço de referência — configure manualmente." >&2
    fi
  done
}

render_create_docker_service() {
  local name=$1 owner_id=$2 repo=$3 branch=$4 region=$5 plan=$6
  local dockerfile=$7 docker_context=$8 health_path=$9
  shift 9
  local -a build_paths=("$@")

  local paths_json
  paths_json="$(printf '%s\n' "${build_paths[@]}" | jq -R . | jq -s .)"

  local body
  body="$(jq -nc \
    --arg type "web_service" \
    --arg name "$name" \
    --arg ownerId "$owner_id" \
    --arg repo "$repo" \
    --arg branch "$branch" \
    --arg region "$region" \
    --arg plan "$plan" \
    --arg health "$health_path" \
    --arg dockerfile "$dockerfile" \
    --arg ctx "$docker_context" \
    --argjson paths "$paths_json" \
    '{
      type: $type,
      name: $name,
      ownerId: $ownerId,
      repo: $repo,
      branch: $branch,
      autoDeploy: "yes",
      buildFilter: { paths: $paths, ignoredPaths: [] },
      serviceDetails: {
        runtime: "docker",
        plan: $plan,
        region: $region,
        healthCheckPath: $health,
        envSpecificDetails: {
          dockerfilePath: $dockerfile,
          dockerContext: $ctx
        }
      }
    }')"

  render_api POST "${RENDER_API_BASE}/services" -d "$body" | jq -r '.id // .service.id // empty'
}

render_trigger_deploy() {
  local service_id=$1
  render_api POST "${RENDER_API_BASE}/services/${service_id}/deploys" -d '{}' | jq -r '.id // empty'
}
