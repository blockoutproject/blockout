#!/usr/bin/env bash

# Starts optional local monitoring and verifies real collection, provisioning and alert-rule scenarios.
# Requires built foundation images and Python 3; leaves the stack running and sends no notifications.
set -euo pipefail
cd "$(dirname "$0")/../.."
scripts/backend-foundation/local.sh observe
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml --profile observability)
"${compose[@]}" exec -T prometheus promtool check config /etc/prometheus/prometheus.yml
"${compose[@]}" exec -T prometheus promtool test rules /etc/prometheus/alerts.test.yml

python3 - <<'PY'
import json
import time
from urllib.parse import urlencode
from urllib.request import urlopen


def get(url):
    """Read local monitoring JSON with a bounded timeout; propagate HTTP and decoding failures."""
    with urlopen(url, timeout=5) as response:
        return json.load(response)


# Wait for the first real scrape, rather than treating container health as collection evidence.
query = urlencode({"query": 'up{job=~"core-service|core-worker"}'})
for attempt in range(30):
    result = get("http://127.0.0.1:13090/api/v1/query?" + query)["data"]["result"]
    if len(result) == 2 and all(row["value"][1] == "1" for row in result):
        break
    time.sleep(2)
else:
    raise SystemExit("Prometheus did not collect both backend processes")

proxy = "http://127.0.0.1:13000/api/datasources/proxy/uid/backend-prometheus/api/v1/query?"
proxied = get(proxy + query)["data"]["result"]
assert len(proxied) == 2 and all(row["value"][1] == "1" for row in proxied)
schemas = get(proxy + urlencode({"query": "blockout_schema_ready"}))["data"]["result"]
assert len(schemas) == 4 and all(row["value"][1] == "1" for row in schemas)
dashboard = get("http://127.0.0.1:13000/api/dashboards/uid/backend-foundation")["dashboard"]
assert dashboard["panels"] and all(panel["datasource"]["uid"] == "backend-prometheus" for panel in dashboard["panels"])
rules = get("http://127.0.0.1:13090/api/v1/rules")["data"]["groups"]
assert len(rules) == 1 and len(rules[0]["rules"]) == 5
assert all(rule["health"] == "ok" for rule in rules[0]["rules"])
print("Prometheus scrapes, Grafana datasource/dashboard and five alert rules verified")
PY
