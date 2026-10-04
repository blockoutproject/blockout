# F13 operations contract

This document defines intended standard-tool operating interfaces for [F13](../spec.md).
It does not claim deployed configuration, delivered notifications or a completed restore.
Domain plans retain their thresholds, permissions and positive recovery evidence. No custom
backup supervisor, recovery platform, load qualification or monthly availability accounting
is introduced.

## Configuration and access

| Boundary     | Configuration ownership                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environments | Dokploy: separate production/preproduction application, PostgreSQL and OpenSearch containers, volumes, database identities and secrets on the shared VPS.                                                           |
| Deployment   | CI and deployment operator: immutable artifacts, preproduction startup on accepted `develop` deployment, preceding Liquibase step and verification. Stop the previous task-running instance before its replacement. |
| Secrets      | Deployment configuration: database, collector, provider and telemetry credentials. Migration credentials differ from runtime credentials. Commit names/references, never values.                                    |
| Monitoring   | Operator: Grafana Cloud Free, Alloy write credentials, rules, IRM routes and separate Discord webhook secrets for production/preproduction.                                                                         |
| Protection   | Operator: private PostgreSQL backup destination, AWS Backup image vault, limited backup/restore IAM roles and retention. Runtime applications cannot administer retention or delete recovery points.                |

Public HTTPS terminates at Dokploy. Database, search, collector-ingestion and detailed
management/metrics interfaces remain private. Collector calls also require their dedicated
technical credential. Use authenticated standard tools for detailed operator diagnostics.

### Public readiness interface

Expose `GET /health/readiness`: HTTP 200 with `{"status":"UP"}` when ready; otherwise HTTP
503 with `{"status":"DOWN"}`. Include application readiness and PostgreSQL connectivity in
the Spring health group. Disable response caching. Do not expose component details,
versions, database names or exceptions. Detailed health and metrics require private access.

Do not call suppliers, identity or payment providers from readiness. Supplier failure does
not make retained sporting consultation unhealthy. Search/projection and domain-processing
failures have separate scoped signals. Readiness is not proof of every essential journey;
functional tests establish those. A failed external check indicates reachability/readiness
failure without pretending to distinguish DNS, TLS, proxy, backend and host loss.

## Observations and incidents

Use environment, component, problem category, stable affected scope, observation time,
outcome and an existing technical correlation reference. Include last confirmed success,
pending/failed work and partial counts when known. Preserve never-run, awaiting eligibility,
paused, running, completed and failed states. Absence of a result is not success. These
fields do not require a universal persisted observation model or recovery protocol.

Use structured application logs and bounded metric labels. Rotate local Docker JSON logs with
`max-size=10m` and `max-file=3` per container; this size cap is not a second timed archive. Run/correlation identifiers
may be log fields but are not metric labels or incident keys. Exclude tokens, credentials,
contacts, assistance content, attachments and raw supplier documents. Filter vendor logs
before export; never export complete backup commands or environment dumps.

| Incident                 | Opening                                                                                | Recovery evidence                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| External reachability    | Failed external readiness observations persisting five minutes                         | Subsequent positive observation of the same environment/endpoint                                               |
| Local telemetry absent   | Expected Alloy telemetry absent for five minutes while enabled, evaluated every minute | Fresh telemetry from the same target, without resolving other failures                                         |
| Acquisition              | F01-owned threshold and scope                                                          | F01-owned positive acquisition result for that scope                                                           |
| Integration/projection   | Explicit failed or incomplete processing                                               | Confirmed successful integration/reconstruction of that scope                                                  |
| PostgreSQL backup failed | Native confirmed dump/upload failure, with no added pending interval                   | Later complete dump and upload success for the same database/destination                                       |
| Image protection         | Native failed, expired or partial periodic AWS Backup job                              | Verified successful protection of the same scope; operator resolution when native events do not prove recovery |

“Immediate” means no intentional delay after receiving the failure signal, not guaranteed
instant delivery. Five minutes is the observed-failure threshold; sampling, evaluation and
notification transport add delay. Operator response time is not guaranteed.

### Grafana, IRM and Discord

Configure one public Grafana Synthetic Monitoring HTTPS probe per environment, every
60 seconds, accepting only the readiness success status/body. Evaluate every minute with
a five-minute pending period. Do not add latency alerts or availability accounting. Two
checks with one probe running continuously use at most 89,280 executions in a 31-day month;
the currently documented Free allowance is 100,000 API executions/month. Account for all
other stack checks before activation. Cloud probes and evaluation survive VPS/Alloy loss.

Keep expected target identity stable. Missing telemetry and query errors are not healthy.
Test complete absence and one disappearing series: Grafana may otherwise emit a resolved
notification annotated `grafana_state_reason=MissingSeries`. Eviction, rule deletion,
monitoring pause or another scope's success cannot establish recovery.

Group source notifications by environment, component/problem and stable scope. Keep
Grafana Alerting's native `payload.groupKey` in IRM; do not replace it with an independently
computed grouping key. Other integrations use stable equivalent scope templates. Never
group by run ID, time or changing error text. Acquisition and integration remain separate.

Use distinct production/preproduction routes and Discord destinations. IRM outgoing
webhooks notify alert-group creation and proven resolution. No repeated escalation steps,
periodic reminders or timer-based automatic closure. Reject non-recovery source resolution
signals before closing the group. Acknowledgment and silence do not resolve an incident.
For native failure events without a reliable positive counterpart, the
operator verifies the relevant state, records evidence in a resolution note and resolves
manually. The recovery notification identifies manual verification. Repeated observations
join the same open group without deliberately sending another opening.

Discord messages contain technical scope, state, observation/detection time and IRM link;
no full incoming payload. Use JSON-safe templates, `allowed_mentions: {"parse":[]}` and
`?wait=true`. IRM documents a four-second timeout and up to three timeout retries at
one-second intervals, not retries for every HTTP error. Lost responses can duplicate a
message; HTTP 429/5xx can leave delivery failed. Inspect native execution history and use
manual intervention; no exactly-once promise or custom delivery queue.

### Preproduction stop and restart

Before stopping preproduction manually, record already-open incidents and apply a standard
Grafana notification silence matching both `environment=preproduction` and
`maintenance_scope=preproduction-runtime`, with owner, reason
and finite expiry. Apply that maintenance label only to expected stopped-runtime checks: HTTP reachability,
runtime telemetry while preproduction is intentionally stopped. Backup jobs use native problem notifications without a freshness rule; keep their history and intentionally paused schedule explicit. Never label AWS protection, the shared host or production this way.
Keep evaluation and target definitions. Do not delete rules or close
incidents to clean the dashboard. Explicitly extend a silence if needed; expiry may alert
while the environment remains stopped rather than silently suppressing monitoring forever.

An accepted `develop` deployment starts preproduction. Its completion procedure inspects
and removes the maintenance silence after initial checks, whether checks succeed or fail. Obtain a newly confirmed native PostgreSQL backup after
a stopped database resumes before declaring its protection re-established.
Until standard automation for that cleanup is qualified, the deployment operator performs
it in the runbook. Do not claim unattended deployment is fully monitored while an existing
manual silence still applies. Failure must become visible; ending silence is not recovery.
No custom lifecycle controller is needed.

Silence upstream in Grafana. IRM “silence escalations” alone does not demonstrate suppression
of event-triggered outgoing webhooks. Qualify an incident opened before stop, failed
restart, healthy restart and silence expiry through the complete notification path.
Production, shared-host and AWS protection alerts remain active throughout.

## PostgreSQL protection

Use native Dokploy PostgreSQL backups, cron `*/30 * * * *`, separate database/environment
prefixes and private encrypted AWS S3 storage with limited credentials. Configure
30-day age-based S3 expiration. Disable Dokploy count cleanup using the verified setting
for the selected version. `keepLatestCount=1440` does not mean 30 days when jobs fail or
manual copies are added. Expiration continues during outages and may eventually delete
the last remaining copy; indefinite last-copy preservation is not promised. A failed new
backup must not delete an earlier usable copy.

Use native Dokploy backup notifications and job history. A started dump or attempted upload is not completion: qualify a native completed-job signal including S3 upload, plus dump/upload failure notifications. Record actual scope, completion and recoverable copy in the existing tools. Do not add a last-success counter, 75-minute absence alert or supervisor. A silently disabled or never-started schedule may produce no alert; this limitation is accepted.

The exact payload of the deployed Dokploy version remains **NOT EXECUTED** qualification. Exercise completed dump/upload, dump failure, upload failure and later successful backup; inspect previous copies and their age-based expiration. If native tools cannot establish completed protection or reported job failures, block reliance on that protection and return to an explicit decision, without adding a custom collector. Missing scheduled execution alone is not promised to raise an incident.

## AWS Backup image protection

Use an hourly periodic AWS Backup plan with 30-day retention for approved S3 image
buckets, source versioning enabled, private vault and distinct backup/restore permissions.
Keep existing live URLs. AWS Backup supplies independently restorable bytes when source
storage is inaccessible; same-bucket versioning alone does not establish this. No extra
replication bucket, CDN, custom copy engine or per-write backup acknowledgment is required.

Verify regional availability and actual cost before activation. Less than 10 GB of active
images does not include retained versions, changed objects, requests, restores, encryption
or monitoring costs. Expire unneeded noncurrent source versions after 30 days and clean
expired delete markers; do not expire still-used current images because they are old.
F11 governs active deletion, protected copies and restrictions before restored access.
Neither a delete marker nor backup expiry proves immediate erasure of all copies.
The 30-day AWS backup retention is not a promise that every copy disappears 30 days after
active deletion: AWS includes existing noncurrent versions in a new initial backup, so
source-version retention and backup history can compose. Do not reset that clock by
recreating plans or recopying obsolete versions. Qualify actual disappearance and F11's
applicable erasure obligations before adding each file category; where they require earlier
source-version removal, its owner removes those versions using standard S3 APIs. Keep
restored obsolete content inaccessible. No individual-erasure or whole-scope compliance
claim follows from the retention number alone.

Document bucket policies/settings separately: AWS Backup does not preserve bucket names or policies. Use native periodic-job problem notifications and job/recovery-point history, routed through standard SNS/IRM integration where supported. Qualify actual resource/environment filtering and failed/expired/partial outcomes. Do not add continuous-protection dependency monitoring, CloudTrail configuration-change supervision, a two-hour absence alarm or a Blockout success counter.

A silently stopped schedule may not notify; tool history and operator inspection remain the available evidence. An automatic recovery notification requires positive evidence for the same problem and scope. If native signals cannot establish that evidence, the operator verifies recovery and resolves the incident in existing tools. A generic successful job does not prove that an unrelated protection fault has recovered. Qualification is **NOT EXECUTED** until authorized AWS jobs and isolated restoration are exercised.

F02/F14 own club-logo associations and definite club matches. Photos and F12 maintenance
images enter protection only after their owning plans identify actual storage and duties.
F10 attachments retain their approved GitHub ownership and recovery evidence: no silent
S3 substitute.

## Retention and restoration evidence

Use Grafana Free's native 14-day logs/metrics retention and the selected Sentry 30-day error
retention, verifying effective free-plan settings before activation. Respect quotas without
automatic paid upgrades or compensating exports. IRM differs: alert-group/incident history
has no fixed automatic deletion; outgoing webhook response history is 90 days and other
notification records have native limits. Keep payloads minimal and nonpersonal, and document
native deletion/support procedures. Do not claim all records expire at 14 or 30 days.

Before relying on protection, restore selected PostgreSQL data and required image bytes in
an isolated environment using native Dokploy/PostgreSQL and AWS Backup tools. Deny the
exercise identity access to original storage. Verify associations, actual files, constraints,
current identity/rights, erasures/privacy and F07 expiry/purge/announcement duties. Keep
business sends disabled until eligibility is established. Rebuild derivatives without deliberately reissuing business effects. Preserve available match-level announcement facts; F07 accepts an exceptional repeated announcement when restoration lost them, without relaxing personal erasure or expiry obligations.

Record copies/window, actual missing data/files, checks, limits and elapsed restore time.
A URL, completed job or partial sample is not proof of the whole required scope. Missing
identity, privacy or file evidence keeps affected access/sends closed. Repeat affected
checks after material restore changes. Software rollback requires compatibility with the
retained database; replacing binaries neither reverses Liquibase changes nor restores data.
No guaranteed intervention time or functional return to V1 is implied.

## Provider references

- [Grafana Free limits](https://grafana.com/pricing/)
- [HTTP checks](https://grafana.com/docs/grafana-cloud/observe-and-act/testing/synthetic-monitoring/create-checks/checks/http/)
- [Missing data](https://grafana.com/docs/grafana/latest/alerting/guides/missing-data/)
- [Notification mute behavior](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/)
- [IRM grouping](https://grafana.com/docs/grafana-cloud/observe-and-act/respond-to-incidents/escalation-and-routing/alert-grouping/)
- [IRM outgoing webhooks](https://grafana.com/docs/grafana-cloud/observe-and-act/respond-to-incidents/integrations/custom-integrations/outgoing-webhooks/)
- [IRM retention](https://grafana.com/docs/grafana-cloud/observe-and-act/respond-to-incidents/reference/data-retention/)
- [Discord webhooks](https://docs.discord.com/developers/resources/webhook#execute-webhook)
- [Dokploy database backups](https://docs.dokploy.com/docs/core/databases/backups)
- [Dokploy backup API](https://docs.dokploy.com/docs/api/backup)
- [Dokploy webhook notifications](https://docs.dokploy.com/docs/core/webhook)
- [S3 lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html)
- [AWS Backup S3 prerequisites](https://docs.aws.amazon.com/aws-backup/latest/devguide/s3-backups.html)
- [AWS Backup EventBridge events](https://docs.aws.amazon.com/aws-backup/latest/devguide/eventbridge.html)
