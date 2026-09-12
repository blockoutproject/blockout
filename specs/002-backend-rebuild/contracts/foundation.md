# Foundation Interfaces

## Java

The `jobs.application` contracts expose no JDBC, servlet or provider types. `JobPublisher.publish(type, version, key, payload)` requires the owner's active transaction on the job datasource and returns `PublicationResult`: `Accepted(id)` for new or identical canonical content, `Conflict` for a reused type/key with changed content, or `Rejected(code)` for invalid identity/size. The owner decides whether a rejection invalidates its own write and requires rollback. Payloads are bounded to 64 KiB of UTF-8; canonicalization sorts object keys, normalizes number scale and preserves array order. Serialization/database failures propagate; they are not expected rejection branches.

`JobHandler` declares a fixed type and payload version and handles a claimed `Job`. It returns `JobResult.Completed` after idempotent external effects, `JobResult.SqlEffect(callback)` to defer SQL effects to acknowledgement, or `JobResult.Rejected(code)` for permanent owner validation failure. External effects are at-least-once and use the durable job ID for idempotency. The worker owns acknowledgement and completion metrics; handlers never acknowledge directly.

`JobRepository.completeWithEffect(job, callback)` fences the current lease, executes SQL effects on the same datasource and marks success in one transaction. An expired/replaced token prevents callback execution. Callback failure or expiry before commit rolls back effects and acknowledgement. PostgreSQL adapters implement the publication and queue ports under `jobs.infrastructure.persistence`; Spring wiring lives in `jobs.config`.

Worker defaults: concurrency 2, poll 1s, lease 60s, renew 20s, deadline 120s, shutdown grace 30s; all durations/budgets must be positive and renewal shorter than lease. A cancelled handler is not allowed to acknowledge through an expired lease. Network adapters must use bounded cancellable calls; interruption alone cannot undo a remote side effect.

## HTTP

API product port 8080 reserves /api/v2 and denies unregistered routes. No product operations are delivered. JWTs require an expiration claim and validate not-before when present. Authentication errors use application/problem+json with status/title/code and safe text. Bearer 401 preserves WWW-Authenticate; authenticated denials are 403.

Both processes expose private management port 9090: /actuator/health/liveness, /actuator/health/readiness, /actuator/prometheus. Health bodies do not expose dependency details. Worker product port is unbound externally and denies all routes.

## Operational

Liquibase command update applies the packaged master; nonzero exit prevents runtime startup. reset-local affects only the fixed isolated Compose project and its database volume and requires an explicit command. No automatic checksum clearing, force-unlock or reset.

Dead replay uses a parameterized operator SQL operation scoped to one UUID in dead state, preserves attempts and grants five more; investigate cause first. Runtime credentials cannot run migrations.

Runtime stdout uses ECS JSON with UTC instants regardless of the host timezone. Stable worker events describe lifecycle, polling outage/recovery, rejection, unsupported work, lease loss, deadline and unexpected execution failure. Repeated polling outages emit one transition until recovery. Metrics use bounded states/outcomes/reasons; no identity labels. Successful jobs increment metrics without per-record logs. Failure diagnostics preserve bounded exception types, stack frames, causes and suppressed failures while omitting exception messages, payloads, deduplication keys and lease tokens.
