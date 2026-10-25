# Server telemetry and investigation

This configuration prepares the F13 server telemetry boundary. It does not activate a Grafana stack, Discord contact point or external check. Actual candidate/provider qualification belongs to [T032](../../specs/003-shared-quality/tasks.md), using the [prepared cases](../../specs/003-shared-quality/quickstart.md#delivery-and-operations).

## Collect one environment

Run one Alloy instance per environment. [Compose](compose.yaml) pins the official Alloy 1.20.1 image, publishes no ports and uses a separate network and data volume for each Compose project. The volume preserves native Docker read offsets; it is not an incident store or a delivery guarantee. Applications run on the host for ordinary local development; telemetry export is disabled by default.

From the repository root, copy [.env.example](.env.example) to ignored `infra/observability/.env.local`. Supply the stack's HTTPS Loki push URL, OTLP base URL and their respective user IDs. Use a private access-policy token limited to the required logs/metrics write permissions. Never print the resolved configuration or put the token, webhook or private diagnostics in GitHub.

Validate without starting collection:

```sh
docker compose --env-file infra/observability/.env.local \
  -p blockout-observability-preproduction \
  -f infra/observability/compose.yaml config --quiet
docker run --rm --env-file infra/observability/.env.example \
  -v "$PWD/infra/observability/config.alloy:/etc/alloy/config.alloy:ro" \
  grafana/alloy:v1.20.1 validate /etc/alloy/config.alloy
```

Only after environment authorization, start that same Compose project with `up -d`. Use `BLOCKOUT_ENVIRONMENT=production` and project `blockout-observability-production` for production. Do not share their environment files, data volumes or credentials. The Docker socket gives Alloy Docker-engine access even with a read-only mount; approve this access on the target host before starting it. The configuration discovers only containers labelled `blockout.telemetry=enabled`, with the selected environment and service `blockout-backend` or `blockout-collector`.

The [application release Compose](../dokploy/compose.yaml) supplies these labels on its backend/collector services, using the selected environment:

```yaml
labels:
  blockout.telemetry: enabled
  blockout.environment: preproduction
  blockout.service: blockout-backend
```

It uses `blockout-collector` for the collector. Both Compose projects join the environment's external `blockout-telemetry-preproduction` or `blockout-telemetry-production` network. Before starting either project, the operator provisions that network once with Docker's native `network create` command, or reuses it if already present. Neither project owns its removal; applications can start while Alloy activation remains pending. Application Compose sets the receiver URL and environment attributes below. Metrics export defaults to `false`; after receiver authorization and qualification, set `MANAGEMENT_OTLP_METRICS_EXPORT_ENABLED=true` in the application's private environment configuration. Log discovery begins when the authorized Alloy stack runs, independently of the metrics switch.

```dotenv
MANAGEMENT_OTLP_METRICS_EXPORT_ENABLED=true
MANAGEMENT_OTLP_METRICS_EXPORT_URL=http://alloy:4318/v1/metrics
OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=preproduction
LOGGING_STRUCTURED_ECS_SERVICE_ENVIRONMENT=preproduction
```

Spring Boot derives `service.name` from each application's name. Micrometer sends metrics through native OTLP; collector stays non-web. No management metrics endpoint is exposed publicly. Keep the native export interval unless a concrete operational need changes it. Alloy's receiver must remain on the private environment network.

## Safe diagnostics

Both applications use Boot's ECS console encoder and native JSON member filters. Their owning `application.yaml` files define the permitted fields. Free-form messages, raw exception messages/stack traces, arbitrary MDC, headers and provider payloads are omitted. The tradeoff is less framework prose; retain useful exception types, operation, safe reason/outcome and actual stage/count/success evidence through SLF4J's fluent `addKeyValue` API. Use fixed operational values and nonpersonal scope; an allowed field name does not sanitize an unsafe value.

The backend alone permits the `account_cleanup` original-target fields defined in its configuration, solely for [F05's private manual cleanup](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution). Do not put credentials, email, profile data or raw verification documents in those fields. This scope does not authorize general account logging. Collector has no such exception.

Alloy admits JSON application events only with a native severity; raw output and unrelated JSON are dropped. Log labels are limited to environment, service and severity. Original cleanup targets stay in private log bodies; never extract them into labels or notification annotations. Metrics retain only the configured native technical attribute keys and service/environment resource attributes. Native JVM memory-area IDs are not permission to put business/account IDs into the `id` dimension. Never add a resource identifier, raw URL/query value, credential or personal value as a metric tag.

Logs retain 14 days. Verify the actual Grafana Free retention before activation, using the [current limits and calculation](../../specs/003-shared-quality/research.md#application-observability). The Docker source's local storage must also satisfy the accepted privacy lifetime: size-based rotation alone proves no 14-day age limit. Confirm the target host's existing log-storage/expiry policy before admitting private cleanup references; this configuration changes no shared host logging policy. There is no paid upgrade, backup monitoring or recurring verification job.

## Configure native Grafana checks and alerts

With authorized stack access, create exactly one HTTP check per environment against its approved public origin plus `/health`. Select one European probe, production every minute and preproduction every five minutes. Require HTTP 200; timeout, unreachable origin and non-UP status fail. No credentials or query parameters are needed. Keep the probe outside the monitored host so API/host/Alloy loss can still be detected.

Use ordinary Grafana rules and a private native Discord contact point:

| Setting           | Required behavior                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API availability  | Evaluate the check's native `probe_success`; 0 fails. Missing data and evaluation errors must not become OK.                                                                                                                                 |
| Domain failure    | Use the implemented owner's stage/scope and last-useful-success evidence. Take thresholds from [F01](../../specs/001-source-acquisition/plan.md#initial-reconstruction-and-operations); do not invent them from HTTP success or log silence. |
| F05 cleanup       | Alert on a safe `operation=account_cleanup` and failed/uncertain outcome. Aggregate counts by environment/provider; include no original target or raw log line.                                                                              |
| Grouping          | Group useful bounded context such as alert name, environment and service; add only the owner's approved nonpersonal dimensions.                                                                                                              |
| Reminder          | Native repeat interval `5d`, aligned with the native five-minute group interval. Group changes may notify sooner.                                                                                                                            |
| Discord           | Enable native firing and resolved delivery. Keep the webhook private and inspect actual output for personal references before use; no custom notification service or template is required.                                                   |
| Missing telemetry | Configure No Data/Error handling explicitly. A healthy Alloy component and a resolved condition are not proof of fresh useful observations.                                                                                                  |

Use the provider's native rule/check identifiers and configuration as their source of truth. Record the selected probe, environment and observed settings with the authorized qualification evidence; do not copy credentials or diagnostic payloads into this public repository. No provider setting or Discord delivery is established by local validation. Test actual firing/group changes/resolution and inspect the five-day repeat setting under T032; a recurring five-day test job is unnecessary.

## F07 notification retention

The backend's ordinary daily purge uses `blockout.notifications.retention-cron`
(`BLOCKOUT_NOTIFICATIONS_RETENTION_CRON`), default `0 0 3 * * *` in UTC. Keep one pass per
24-hour day so normal cleanup occurs before age 30 days; an invalid expression fails native
Spring startup validation. Spring's `-` disables the trigger for isolated tests only. Maintenance
does not suspend retention. Read/count access excludes age 29 independently of deletion;
the sender's same cutoff remains its owning F07 qualification.

Use the existing ECS/Loki stream with `operation=notification_retention`. `started` identifies
the ordinary pass. `completed` carries `affected_count` and `last_success_at`; `incomplete`
carries `partial_count` for already committed removals and a safe exception class in `reason`.
The failing transaction contributes no confirmed count. No account/notification/match identity,
content, destination, SQL or raw exception message is emitted. No separate metric, log sink,
incident stream or per-row success event is added.

In the existing authorized Grafana rule/contact-point process, treat `incomplete` as a retention
failure. Check the latest completed pass against the configured daily schedule and service/
telemetry freshness: missing completion, disabled scheduling or a stopped process is unresolved
retention evidence, never successful cleanup. A healthy API or `started` event alone cannot clear
the condition. Activation/delivery of these provider rules is not established by local tests.
Use the [F07 manual response](../operations/README.md#notification-retention-failure)
and [prepared isolated cases](../../specs/011-notifications-delivery/quickstart.md#retention-construction-and-isolated-restore-cases--255).

## Investigate and intervene

1. Identify the environment, affected service/scope and time of detection. Confirm current external health and telemetry freshness. No data means unavailable evidence, not a healthy execution.
2. Inspect safe stage/outcome/count and latest useful success through the owning feature. Distinguish observation, acquisition, accepted integration and completed projection. Never-run, awaiting eligibility and paused are not successful executions; another scope's success does not clear this one.
3. Check the relevant [F01 scenarios](../../specs/001-source-acquisition/quickstart.md#core-scenarios). Preserve partial results and use only the owner's existing rerun/read/restart operations. A response lost after a write remains uncertain; do not replay it blindly.
4. For private account cleanup, follow [F05 erasure and return](../../specs/005-accounts-identity/quickstart.md#erasure-and-return). Verify original targets and current use before any separately authorized destructive provider action. Do not search by email or target a replacement account. An interruption after local commit but before diagnostic emission can remain unreported; no ledger or worker closes that accepted gap. If manual work remains after 14 days, keep only still-needed references in the existing private support process for its justified lifetime.
5. After intervention, inspect the affected useful results and latest-success evidence. Native resolved means the alert condition ended; a pause, another scope's success or a reachable API alone does not prove business recovery.

Keep detection, notification, intervention and observed recovery distinct. Operator availability creates no response-time guarantee. Restore and rollback remain with the owning [F13 operations tasks](../../specs/003-shared-quality/tasks.md#implementation-and-qualification-for-user-story-5); no new recovery mechanism or backup alert is introduced here.
