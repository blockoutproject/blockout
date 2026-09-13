#!/usr/bin/env bash

# Starts the local foundation and verifies readiness, migration reruns, DDL denial and worker restart.
# Requires locally built images; leaves the stack running for inspection. Use local.sh down afterward.
set -euo pipefail
cd "$(dirname "$0")/../.."
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml)
scripts/backend-foundation/local.sh up
"${compose[@]}" run --rm migrations update
curl --fail --silent http://127.0.0.1:19090/actuator/health/readiness
curl --fail --silent http://127.0.0.1:19091/actuator/health/readiness
curl --fail --silent http://127.0.0.1:19091/actuator/prometheus | grep -F 'blockout_jobs_count' > /dev/null
for role in blockout_api blockout_worker; do
  "${compose[@]}" exec -T database psql -U "$role" -d blockout -v ON_ERROR_STOP=1 \
    -c 'SELECT generation FROM operations.schema_metadata WHERE id=1'
  for schema in operations identity; do
    if output=$("${compose[@]}" exec -T database psql -U "$role" -d blockout \
        -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -c "CREATE TABLE ${schema}.forbidden(id integer)" 2>&1); then
      echo "Runtime role $role unexpectedly has DDL rights" >&2
      exit 1
    fi
    if ! grep -Fq "42501: permission denied for schema ${schema}" <<< "$output"; then
      echo "DDL check for $role failed for a reason other than insufficient privilege" >&2
      exit 1
    fi
  done
done
"${compose[@]}" restart core-worker
"${compose[@]}" up -d --wait --wait-timeout 180
curl --fail --silent http://127.0.0.1:19091/actuator/health/readiness
