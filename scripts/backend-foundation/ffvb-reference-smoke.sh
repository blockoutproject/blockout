#!/usr/bin/env bash

# Proves generation-5 startup, role operations, runtime privileges and sports metric collection.
# Uses a fresh isolated project and removes only that project's test volumes on exit.
# Requires locally built images and free foundation HTTP/monitoring ports; never calls providers.
set -euo pipefail
cd "$(dirname "$0")/../.."
project_name="blockout-ffvb-reference-$(date +%s)"
compose=(docker compose --project-name "$project_name" --file infra/compose/docker-compose.backend.yml --profile observability)
trap '"${compose[@]}" down --volumes > /dev/null' EXIT
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" run --rm migrations update
for port in 19090 19091; do
  curl --fail --silent "http://127.0.0.1:$port/actuator/health/readiness" > /dev/null
done
[[ $(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:18080/api/v2/admin/ffvb/configuration) == 401 ]]
for role in blockout_api blockout_worker; do
  for schema in sports identity; do
    if "${compose[@]}" exec -T database psql -U "$role" -d blockout -v ON_ERROR_STOP=1 -c "CREATE TABLE $schema.forbidden(id integer)"; then
      echo 'Runtime DDL permission unexpectedly granted' >&2
      exit 1
    fi
  done
done
"${compose[@]}" exec -T database psql -U blockout_bootstrap -d blockout -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO identity.users(id,pseudo,pseudo_key,active,created_at,updated_at)
VALUES ('62d286df-c07b-4e99-906e-e50b80ee2e7a','smoke','smoke',true,now(),now());
INSERT INTO identity.external_identities(issuer,subject,user_id)
VALUES ('https://fixture.invalid/','auth0|smoke','62d286df-c07b-4e99-906e-e50b80ee2e7a');
SQL
for grant in true false; do
  "${compose[@]}" exec -T database psql -U blockout_bootstrap -d blockout \
    -v issuer=https://fixture.invalid/ -v subject='auth0|smoke' -v grant="$grant" -f /dev/stdin \
    < scripts/backend-foundation/admin-role.sql
  count=$("${compose[@]}" exec -T database psql -U blockout_api -d blockout -Atc "SELECT count(*) FROM identity.user_roles WHERE role='ADMIN'")
  if [[ "$grant" == true ]]; then [[ "$count" == 1 ]]; else [[ "$count" == 0 ]]; fi
done
if "${compose[@]}" exec -T database psql -U blockout_api -d blockout -v ON_ERROR_STOP=1 \
  -c "INSERT INTO identity.user_roles(user_id,role) VALUES ('62d286df-c07b-4e99-906e-e50b80ee2e7a','ADMIN')"; then
  echo 'Runtime can grant its own role' >&2
  exit 1
fi
"${compose[@]}" restart core-service core-worker
"${compose[@]}" up -d --wait --wait-timeout 180
python3 - <<'PY'
import json
import time
from urllib.parse import urlencode
from urllib.request import urlopen

query = urlencode({"query": 'blockout_schema_ready{schema="sports"}'})
url = "http://127.0.0.1:13000/api/datasources/proxy/uid/backend-prometheus/api/v1/query?" + query
for attempt in range(30):
    with urlopen(url, timeout=5) as response:
        values = json.load(response)["data"]["result"]
    if len(values) == 1 and values[0]["value"][1] == "1":
        break
    time.sleep(2)
else:
    raise SystemExit("Sports readiness was not collected through the Grafana datasource")
with urlopen("http://127.0.0.1:13000/api/dashboards/uid/backend-foundation", timeout=5) as response:
    dashboard = json.load(response)["dashboard"]
assert any("blockout_schema_ready" in target.get("expr", "") for panel in dashboard["panels"] for target in panel.get("targets", []))
print("FFVB schema, role command, privileges, restart and Grafana sports readiness verified")
PY
