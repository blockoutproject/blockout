#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml)
scripts/backend-foundation/local.sh up
"${compose[@]}" run --rm migrations update
curl --fail --silent http://127.0.0.1:19090/actuator/health/readiness
curl --fail --silent http://127.0.0.1:19091/actuator/health/readiness
curl --fail --silent http://127.0.0.1:19091/actuator/prometheus | rg 'blockout_jobs_count' > /dev/null
if "${compose[@]}" exec -T database psql -U blockout_api -d blockout -v ON_ERROR_STOP=1 -c 'CREATE TABLE operations.forbidden(id integer)'; then
  echo 'Runtime credentials unexpectedly have DDL rights' >&2; exit 1
fi
"${compose[@]}" restart worker
"${compose[@]}" up -d --wait --wait-timeout 180
curl --fail --silent http://127.0.0.1:19091/actuator/health/readiness
