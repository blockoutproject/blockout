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

## Investigate and intervene

1. Identify the environment, affected service/scope and time of detection. Confirm current external health and telemetry freshness. No data means unavailable evidence, not a healthy execution.
2. Inspect safe stage/outcome/count and latest useful success through the owning feature. Distinguish observation, acquisition, accepted integration and completed projection. Never-run, awaiting eligibility and paused are not successful executions; another scope's success does not clear this one.
3. Check the relevant [F01 scenarios](../../specs/001-source-acquisition/quickstart.md#core-scenarios). Preserve partial results and use only the owner's existing rerun/read/restart operations. A response lost after a write remains uncertain; do not replay it blindly.
4. For private account cleanup, follow [F05 erasure and return](../../specs/005-accounts-identity/quickstart.md#erasure-and-return). Verify original targets and current use before any separately authorized destructive provider action. Do not search by email or target a replacement account. An interruption after local commit but before diagnostic emission can remain unreported; no ledger or worker closes that accepted gap. If manual work remains after 14 days, keep only still-needed references in the existing private support process for its justified lifetime.
5. After intervention, inspect the affected useful results and latest-success evidence. Native resolved means the alert condition ended; a pause, another scope's success or a reachable API alone does not prove business recovery.

Keep detection, notification, intervention and observed recovery distinct. Operator availability creates no response-time guarantee. Restore and rollback remain with the owning [F13 operations tasks](../../specs/003-shared-quality/tasks.md#implementation-and-qualification-for-user-story-5); no new recovery mechanism or backup alert is introduced here.

## Collection evidence and native conditions (F01)

These are the concrete F01 rule inputs to configure in the existing authorized Grafana stack. This repository does not provision that stack. [T060 cases](../../specs/001-source-acquisition/quickstart.md#native-alert-qualification-cases-t060) prepare qualification; actual rule evaluation and emitted notifications remain T063/#206.

`operation=collection_evidence` is emitted by the backend after a result commits. It rereads the current result under the existing season/control locks, so delayed callbacks cannot publish an older snapshot after a newer one. Routine successful resources are quiet; failures and new usable evidence following failure are recorded. The instance key is `(environment, service_name, collection_control, scope, stage, phase)`. UUIDs refer only to collection controls and nonpersonal sporting scopes, never accounts, contacts or provider IDs. Keep them in private log bodies and query-time labels; add no indexed Loki labels or business-ID metric tags.

| Current evidence                                                                 | `collection_alert_at` (epoch seconds)   | Interpretation                                                                                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Competition `failed`, `partial` or `unconfirmed`, including manual passages      | Retained first failure                  | Actionable at the first failed observation; no consecutive-cycle counter.                                                                       |
| Recognized structural/context acquisition failure, including a seasonless family | Retained first structural failure       | Immediate, independently of the ordinary family cadence.                                                                                        |
| Technical club-sheet/geocoding acquisition failure                               | Retained first failure + 86,400 seconds | Becomes actionable after 24 elapsed hours, including across cycles or a pause. No failure is inferred for a family never attempted.             |
| Failed or unconfirmed integration                                                | Retained first failure                  | Its own phase remains actionable even after acquisition succeeds.                                                                               |
| New usable observation at the exact affected key                                 | `0`                                     | Recovery evidence for that scope/stage/phase only. Valid empty calendars and qualified no-candidate/ambiguous geocoding are usable acquisition. |

The result keeps its own last success, first failure, actual observation time and logical `(collection_cycle_order, collection_read_ordinal)`. Partial results retain the old useful success and first failure. `collection_first_structural_failure_at` also survives later technical failures until a usable observation at the same key, so an already actionable anomaly cannot return to the 24-hour waiting interval. Missing counts remain unmeasured; logged measured counts are capped at 10,000. Safe `reason` values are fixed categories; raw reason text, URLs, provider documents and contacts are excluded. Pause, closure, completion and empty admitted selections emit no invented result or recovery.

Create a **Grafana-managed** Loki rule named `F01 scoped collection evidence`, evaluated every minute with pending period **0s**. Use this instant metric query as A, replacing the environment selector with the single target environment. Reduce A with **Last** and use a threshold **greater than or equal to 0**. Do not filter failed outcomes or positive deadlines before `last_over_time`: the later usable observation must participate in the same series.

```logql
last_over_time(
  {environment="preproduction", service_name="blockout-backend"}
  | json
  | operation="collection_evidence"
  | label_format collection_due=`{{ if gt (float64 .collection_alert_at) 0.0 }}{{ subf (unixEpoch now) .collection_alert_at }}{{ else }}-1{{ end }}`
  | unwrap collection_due
  | __error__=""
  [14d]
) by (environment, service_name, collection_control, scope, stage, phase)
```

This uses native [unwrapped ranges](https://grafana.com/docs/loki/latest/query/metric_queries/#unwrapped-range-aggregations), [time/math templates](https://grafana.com/docs/loki/latest/query/template_functions/) and [Loki alert queries](https://grafana.com/docs/grafana/latest/datasources/loki/alerting/). The 14-day range matches accepted log retention and evaluates the first-failure deadline without another provider attempt or a recovery scheduler. Configure **No Data = Keep Last State**, **Error = Error**, and route datasource errors separately from domain failures; do not replace missing series with zero. Native stale-series eviction and retention can still resolve an instance. The persisted current result remains the business evidence after logs expire; an expired log, pause, rule edit, disabled rule or native resolved notification never proves repair. An interruption between commit and log emission remains an accepted delivery gap; no outbox or replay closes it.

`operation=collection_operator_report` supplies current aggregate `affected_count` (capped at 10,000, with `collection_count_capped`) and the existing `/administration` destination. `collection_subject=season-preparation` counts accepted unlaunched source proposals; `classification` counts current catalog pools lacking both local and inherited acquisition settings. Published historical classifications do not satisfy an absent acquisition setting; a mapped inactive division is not a classification need. Reports use provider/season/subject, never one alert per pool or new source. Repeated accepted discovery supplies current snapshots, including zero when the observed need has ended; it adds no sent-report ledger or classification readiness to collection screens.

Create a separate informational rule `F01 collection administration needs`, evaluated every minute, pending **0s**, with A below and threshold **greater than 0**:

```logql
last_over_time(
  {environment="preproduction", service_name="blockout-backend"}
  | json
  | operation="collection_operator_report"
  | unwrap affected_count
  | __error__=""
  [14d]
) by (environment, service_name, provider, collection_season, collection_subject)
```

Use the same No Data/Error handling. Snapshot zero is an observed absence of this operator need, not supplier recovery. A failed discovery cannot report invented absence. A successful catalog reports classification needs independently of sporting acquisition eligibility.

Add a separate actionable collector-log rule for unresolved terminal/reporting operations. Evaluate every minute, pending **0s**, A below, threshold **greater than 0**:

```logql
sum by (environment, service_name, operation, cycleId) (
  count_over_time(
    {environment="preproduction", service_name="blockout-collector"}
    | json
    | operation=~"collection_admission|collection_completion|collection_result"
    | outcome="unconfirmed"
    [14d]
  )
)
```

The existing `cycleId` is the originally attempted capability, retained for private current-state inspection. A live process with an unconfirmed terminal write must be covered; external API availability alone cannot detect it. Alert expiry supplies no confirmation. Inspect current state and follow [explicit collection recovery](../operations/README.md#collection-inspection-and-explicit-recovery); no mutation replay, instantaneous crash detector or background repair is introduced. Separately alert on backend `operation=collection_diagnostics, outcome=unavailable` with `count_over_time` over the same window, grouped only by environment/service, so diagnostic failure is not silent business recovery.

Current-entry discovery precedes a season/control and has no `CollectionResult`. Its `source_discovery` batch summaries carry a fixed official-entry `scope` and `collection_entry_usable`: **0** after unavailable, unqualified or partial discovery, **1** after a new usable observation of that same entry. Recognized source structure may remain usable without enough seasonal attribution to propose a year; no year is guessed. Accepted independent FFVB proposals survive an unreadable sibling, but cannot repair the whole entry. Entry scopes are fixed nonpersonal names; no raw URL or provider identifier is a label.

Add the actionable rule `F01 current-entry discovery`, evaluated every minute, pending **0s**, A below and threshold **less than 1**. Keep No Data/Error handling as above and group notifications by environment/service/provider while retaining each entry instance. Only this entry's later usable summary ends its condition; another entry/provider cannot clear it.

```logql
last_over_time(
  {environment="preproduction", service_name="blockout-collector"}
  | json
  | operation="source_discovery"
  | collection_entry_usable!=""
  | unwrap collection_entry_usable
  | __error__=""
  [14d]
) by (environment, service_name, provider, scope)
```

Route the actionable rules and the informational rule to F13's existing private native contact point. Group actionable result instances by alert name/environment/service/control/stage/phase, keeping each scope identifiable inside the group; group operator needs by alert name/environment/provider/season/subject. Use **group interval 5m**, **repeat interval 5d** and native firing/resolved delivery. Put only fixed interpretation and the administration destination in annotations; never interpolate a raw log line, reason text or private target. Notification timing and stale-series closure are Grafana-owned, with no exact delivery or business-transition guarantee. Confirm the actual settings and output under T063 before activation.
