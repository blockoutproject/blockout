# Foundation Interfaces

## Java

JobPublisher.publish(type, version, key, payload) returns the durable job UUID; an existing caller transaction is mandatory. Duplicate identical content returns the original UUID, changed content throws a safe conflict.

JobHandler declares a fixed type and payload version and handles a claimed Job. External effects are at-least-once and must provide idempotency. JobRepository.completeWithEffect(job, callback) fences the current lease, executes SQL effects and marks success in one transaction. Completion with an expired/replaced token fails without executing the callback.

Worker defaults: concurrency 2, poll 1s, lease 60s, renew 20s, deadline 120s, shutdown grace 30s; all durations/budgets must be positive and renewal shorter than lease. A cancelled handler is not allowed to acknowledge through an expired lease. Network adapters must use bounded cancellable calls; interruption alone cannot undo a remote side effect.

## HTTP

API product port 8080 reserves /api/v2 and denies unregistered routes. No product operations are delivered. Authentication errors use application/problem+json with status/title/code and safe text. Bearer 401 preserves WWW-Authenticate; authenticated denials are 403.

Both processes expose private management port 9090: /actuator/health/liveness, /actuator/health/readiness, /actuator/prometheus. Health bodies do not expose dependency details. Worker product port is unbound externally and denies all routes.

## Operational

Liquibase command update applies the packaged master; nonzero exit prevents runtime startup. reset-local affects only the fixed isolated Compose project and its database volume and requires an explicit command. No automatic checksum clearing, force-unlock or reset.

Dead replay uses a parameterized operator SQL operation scoped to one UUID in dead state, preserves attempts and grants five more; investigate cause first. Runtime credentials cannot run migrations.
