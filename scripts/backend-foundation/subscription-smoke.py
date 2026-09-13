"""Assert signed receipt processing and provider reconciliation on the disposable Compose stack."""

import hashlib
import hmac
import json
import subprocess
import time
import uuid
from urllib.request import Request, urlopen

COMPOSE = [
    "docker",
    "compose",
    "--project-name",
    "blockout-foundation",
    "--file",
    "infra/compose/docker-compose.backend.yml",
]
USER = "00000000-0000-0000-0000-000000000237"


def sql(statement):
    """Run fixture-owned SQL only against the fixed disposable foundation database."""
    return subprocess.check_output(
        COMPOSE
        + [
            "exec",
            "-T",
            "database",
            "psql",
            "-U",
            "blockout_bootstrap",
            "-d",
            "blockout",
            "-At",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            statement,
        ],
        text=True,
    ).strip()


def webhook():
    """Send exact signed bytes twice to prove durable event deduplication."""
    event = str(uuid.uuid4())
    body = json.dumps(
        {
            "event": {
                "id": event,
                "type": "RENEWAL",
                "event_timestamp_ms": int(time.time() * 1000),
                "app_user_id": "auth0|smoke-237",
                "environment": "SANDBOX",
            }
        }
    ).encode()
    timestamp = str(int(time.time()))
    signature = hmac.new(
        b"smoke-only", timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    for _ in range(2):
        request = Request(
            "http://127.0.0.1:18080/api/v2/webhooks/revenuecat",
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-RevenueCat-Webhook-Signature": f"t={timestamp},v1={signature}",
            },
        )
        with urlopen(request, timeout=5) as response:
            assert response.status == 200
    assert (
        sql(f"SELECT count(*) FROM identity.webhook_receipts WHERE event_id='{event}'")
        == "1"
    )


def wait_for(positive):
    """Wait within a bounded runtime window for a complete current-revision observation."""
    expected = "t" if positive else "f"
    for _ in range(45):
        result = sql(
            f"SELECT positive FROM identity.subscription_states WHERE user_id='{USER}' AND requested_revision=processed_revision AND job_id IS NULL"
        )
        if result == expected:
            return
        time.sleep(1)
    raise AssertionError("Subscription reconciliation did not finish")


sql(
    f"INSERT INTO identity.users(id,pseudo,pseudo_key,active,created_at,updated_at) VALUES ('{USER}','smoke237','smoke237',true,now(),now()) ON CONFLICT DO NOTHING"
)
sql(
    f"INSERT INTO identity.billing_bindings(user_id,project_id,environment,customer_id,created_at) VALUES ('{USER}','smoke-project','sandbox','auth0|smoke-237',now()) ON CONFLICT DO NOTHING"
)
with urlopen(Request("http://127.0.0.1:13081/active", data=b""), timeout=5):
    pass
webhook()
wait_for(True)
with urlopen(Request("http://127.0.0.1:13081/inactive", data=b""), timeout=5):
    pass
webhook()
wait_for(False)
assert (
    sql(f"SELECT customer_id FROM identity.billing_bindings WHERE user_id='{USER}'")
    == "auth0|smoke-237"
)
print(
    "Signed webhook, duplicate receipt, worker reconciliation and positive-to-negative evidence verified"
)
