# F13 research and technical decisions

## Context and evidence

This research supports the [F13 plan](plan.md), [specification](spec.md) and
[cross-feature inputs](cross-feature-inputs.md). The
[approved architecture](../../docs/architecture.md),
[owning specifications](cross-feature-inputs.md#owner-matrix) and
[design authorities and approvals](../../docs/design.md) constrain
implementation. Decisions below include the owner's detailed F13 choices.
Provider documentation establishes available mechanisms, not an executed Blockout
qualification. No runtime, production inspection, migration or restoration is
claimed. Exact stable patches, images and tools must be qualified and pinned during
initialisation; a selected generation is not evidence of an installed release.

## R01 — Workspace and runtime boundaries

**Need.** Establish reproducible builds for the complete V2 rebuild while retaining
explicit domain ownership and native development workflows.

**Decision.** Use the selected generations below. Nx orchestrates the native tools;
local backend, ingestion and mobile applications run natively. Compose provides
local infrastructure only. One Spring backend and one Python collector per
environment; no BFF, broker, independent service per domain or empty shared library.

| Boundary            | Selected generation and tools                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Backend             | Java 25 LTS, Spring Boot 4.1, Spring MVC/Security/Data JPA, Maven Wrapper                     |
| Module verification | Spring Modulith 2.1 verification only, no persistent event registry                           |
| Database            | PostgreSQL 18; Liquibase Community 5 XML changelogs                                           |
| Search              | OpenSearch 3.9, rebuildable projection                                                        |
| Ingestion           | Python 3.14, uv, HTTPX, lxml, standard-library CSV, APScheduler 3                             |
| Mobile              | Expo SDK 57, React Native 0.86, React 19.2, Expo Router, TanStack Query, React Hook Form, Zod |
| Workspace           | Nx 23, Node.js 24 LTS, npm                                                                    |
| Contracts           | OpenAPI 3.0.3, OpenAPI Generator, Orval/Zod                                                   |
| Delivery            | GHCR immutable images, Hostinger/Dokploy, EAS Build/Submit; no OTA                            |

**Simpler alternative.** Uncoordinated per-language scripts omit the accepted Nx
orchestration. Containerising every local application adds a second development
path without a current need.

**Consequences.** Commit lockfiles/wrappers and exact image/tool versions; no floating
latest or prerelease substitutions. Supported mobile baseline is iOS 16.4 and
Android 7 as selected in the architecture, subject to actual native qualification.
A required generation change returns for an explicit decision.

**Verification.** Clean installation and full builds/tests on the pinned combination,
module dependency checks, both native builds and source-first generation. Check
[Expo's platform documentation](https://docs.expo.dev/versions/latest/) and
[Spring Modulith verification](https://docs.spring.io/spring-modulith/reference/verification.html)
against the pinned versions rather than claiming the rolling docs prove compatibility.

## R02 — Source-first contracts and boundary validation

**Need.** Keep backend, ingestion and mobile aligned without handwritten transport
mirrors or unvalidated success reaching application state.

**Decision.** Separate public and private acquisition OpenAPI 3.0.3 roots; generate
Java server interfaces/DTOs, Python async HTTPX clients and Orval clients/Zod schemas.
Keep sources/configuration in Git and generated bundles/code outside Git. Requests
are strict; response objects explicitly accept additive unknown properties while
validating consumed fields, required/null semantics and known enum values. Unknown
values never grant access; an invalid consumed enum produces a safe boundary failure.
Domain schemas, expected-version checks and pagination remain with their owners. Redocly bundling must fail on semantic component-name collisions using `--component-renaming-conflicts-severity=error`; owners choose explicit stable names rather than accepting automatic numeric suffixes. Preserve inherited security when aggregating fragments and preserve domain-specific problem extensions. This uses the standard bundler capability rather than a custom renaming layer.

Use RFC 9457 errors with stable codes, understandable safe messages and opaque
non-personal diagnostic references. The exact common schema belongs to this plan's
contracts. Spring ProblemDetail provides the standard implementation; clients do
not branch on human/provider message text. Distinguish HTTP errors from transport
failure and response-contract failure. No universal operation receipt/retry ledger.

**Simpler alternative.** Static types or generated DTOs alone do not validate received
JSON. Handwriting three DTO families duplicates authority. A universal envelope or
custom generator template adds machinery without a current need.

**Consequences.** Qualify supported generator configuration rather than patching
outputs. Spring documents interface-only generation and Boot 4/Jackson 3 options;
Python documents async HTTPX and optional synchronous wrappers. Actual nullability,
unknown fields and decoding still require tests. Orval's fetch-based query client
supports generated Zod validation; a custom mutator bypasses its automatic parse,
so use the documented schema-passing option and parse once before successful query
resolution. Primitive/void/stream exceptions must follow their actual contract;
204 must not be parsed as JSON. Never log raw validation errors or payloads.

**Verification.** Lint/bundle, reproducible generation, Java compile/serialization,
Python import/transport decoding, TypeScript checks and malformed-response tests
before TanStack cache success. Exercise missing fields, wrong types, forbidden nulls,
unknown enums, extra request fields rejected, extra response fields accepted,
cancellation, 204 and non-success/non-JSON handling. Compare contract compatibility
against supported clients; a textual diff alone does not establish semantic safety.

**Sources.** [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html),
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html),
[Spring ProblemDetail](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html),
[Spring generator](https://openapi-generator.tech/docs/generators/spring/),
[Python generator](https://openapi-generator.tech/docs/generators/python/),
[Orval configuration](https://orval.dev/docs/reference/configuration/output/),
[Redocly bundle conflict handling](https://redocly.com/docs/cli/commands/bundle),
[oasdiff CLI](https://www.oasdiff.com/docs/getting-started).
These document candidate configuration capabilities; exact stable release support
must be demonstrated before those configurations are relied upon.

## R03 — Identity and ordinary mobile failure handling

**Need.** Preserve accepted identity continuity, current authorisation and usable
navigation when network or provider work fails.

**Decision.** Retain Auth0 and existing Google/Apple associations. Auth0 owns secure
credentials; Spring checks token validity plus current business status and resource
permissions. No migration to another identity provider is selected. Session-aware
query keys, private-state clearing, cancellation and old-response rejection prevent
cross-account leakage. No persisted server-query cache or offline mutation queue.

Mobile reads have a 10-second timeout per attempt and at most one automatic retry
after one second for transient safe-read failures. Do not retry cancellation,
invalid contracts, authentication/permission refusal or business rejection.
Mutations wait at most 30 seconds; uploads at most 60 seconds, without automatic
mutation replay. A timeout after possible acceptance is uncertain, not rollback;
use domain reread/provider evidence/manual resolution. Domain freshness, push and
retention timers remain unchanged.

**Simpler alternative.** Unlimited SDK/query defaults can multiply attempts or trap
navigation; blind mutation retries can duplicate accepted work. A universal
recovery protocol is unnecessary where rereading current state resolves uncertainty.

**Consequences.** Coordinate generated transport and TanStack retry settings so
layers do not multiply the single retry. Preserve caller cancellation. The second
read attempt is independently bounded; these are technical waits, not API latency
goals or navigation locks. Provider-specific asynchronous purchase/deletion outcomes
remain owned by F05/F09/F10, not forced into a common synchronous success model.

**Verification.** Deterministic transport tests for attempt counts, delays, timeout,
cancellation and non-retryable errors; server tests for visitor, wrong owner,
revoked permission and old session; native logout/login/provider-flow checks.

## R04 — Full CI, environments and promotion

**Need.** Detect cross-application contract and integration regressions and identify
the exact tested artefact before deployment.

**Decision.** Code changes run full CI for backend, ingestion and mobile, including
contracts and all affected shared boundaries; do not rely solely on affected-project
selection. Documentation-only changes use relevant documentation checks. Backend
and collector images are immutable GHCR artefacts. Develop deployment automatically
starts preproduction; the operator stops it manually when unused. Main promotes
the same qualified image digests, without rebuilding them. EAS build and submit are
manual operations from validated main; store releases only, no EAS Update/OTA.

**Simpler alternative.** A narrower affected-only pipeline reduces work but does not
match the owner's selected confidence baseline. Rebuilding production introduces
artefact drift. Automatic mobile publication adds no required capability.

**Consequences.** Preproduction and production share one VPS but have separate
containers, volumes, PostgreSQL/OpenSearch data, secrets and technical identities.
They do not provide host isolation or high availability. Stop the former task-running
instance before activating its replacement. Run Liquibase in a preceding deployment
step; failure blocks rollout. No Hibernate schema mutation or automatic SQL rollback.
A software rollback requires compatibility with current data. No test freeze is
introduced: identify the tested artefact and avoid replacing it during a test.

**Verification.** Exercise full CI and generated consumers, compare digests across
environments, test migration refusal and compatible rollback, verify preproduction
start/manual stop and store build provenance. [EAS Build](https://docs.expo.dev/build/introduction/)
and [EAS Submit](https://docs.expo.dev/submit/introduction/) describe separate services;
a successful command is not proof of store availability.

## R05 — Diagnostics and incident delivery

**Need.** Diagnose important failures and loss of the VPS without exposing personal
content or adding an incident platform to Blockout.

**Decision.** Alloy sends safe backend/ingestion logs and useful metrics to free
Grafana Cloud with 14-day diagnostic retention. Free Sentry handles native crashes
with 30-day event retention; no analytics, replay or profiling. Use Grafana IRM's
native incident history, not a duplicate Blockout archive. Production and
preproduction have separate Discord destinations. Send one logical opening and one
proven recovery; disable deliberate repeats/reminders and escalation repetition.
Exceptional transport duplicates remain possible under F13's accepted limitation.

External probing runs every 60 seconds and alerts after five minutes of sustained
failure. Native backup-job failure notifications are used; no elapsed-success threshold is added. A silently stopped schedule may produce no alert. Missing diagnostics are not
healthy state. Other domain incidents retain their own thresholds and scopes.
Planned manual preproduction shutdown is explicit, without silently muting production.

**Simpler alternative.** VPS-local monitoring cannot report its own disappearance.
A dedicated incident database and custom Discord retry engine duplicate standard
facilities. Raw payload logging would be easier but violates F11/F13.

**Consequences.** Use environment/component/operation/safe scope/reference/time/result
and last success; never credentials, contact data, notification/ticket content,
attachments or raw supplier documents. No synthetic availability accounting,
performance dashboards, compensating retention exports or silent paid upgrades.
Respect free quotas and verify the configured effective retention.

**Verification.** External detection while the VPS is unavailable, isolated scope
failure/recovery, persistent failure without reminder, separate destinations,
monitoring-data loss, native backup failure and the accepted silent-stoppage limitation. Inspect sanitized
telemetry and actual retention/settings. Free capacity and delivery remain provider
constraints, not a human response guarantee.

**Sources.** [Grafana free tier](https://grafana.com/products/cloud/free-tier/),
[Grafana log retention](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/logs/),
[Grafana IRM](https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/),
[Sentry data management](https://docs.sentry.io/product/data-management/).
The selected Sentry 30-day policy and no-repeat IRM configuration require actual
account/configuration verification; documentation is not proof they are active.

## R06 — PostgreSQL protection and expiry

**Need.** Protect user/operator changes and retained source history independently of
VPS survival without building a backup engine.

**Decision.** Dokploy schedules PostgreSQL backups to private AWS S3 every 30 minutes.
Copies expire after 30 days even if no new backup succeeds. Use storage lifecycle
expiry independent of future backup creation; preserve a still-in-retention usable
copy when a new attempt fails. There is no indefinite last-copy retention exception.
A failed attempt never counts as a successful backup; failure and staleness use R05.

**Simpler alternative.** VPS-local dumps fail with the host. Keeping only the newest
copy cannot meet the selected recovery period. A custom continuous database backup
service adds cost and complexity beyond the accepted schedule.

**Consequences.** Thirty minutes is a schedule, not a loss guarantee. An extended
protection failure can leave no retained usable copy after expiry; alert and repair,
do not silently extend retention. Protect bucket access and encryption; account for
any object versions in expiry rules. Search is derived and rebuilt from retained
PostgreSQL truth; source recollection cannot recreate every user change or old source.

**Verification.** Check successful artefact existence, readable scope and date;
force a failed attempt without deleting an unexpired usable copy; verify expiry
without subsequent successful backups. Restore a real selected backup into an
isolated environment and record actual gaps/duration.

**Sources.** [Dokploy databases/backups](https://docs.dokploy.com/docs/core/databases),
[Dokploy backup API](https://docs.dokploy.com/docs/api/backup),
[S3 lifecycle expiry](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html).
Dokploy's platform backup and application PostgreSQL backups are different scopes;
one does not prove the other.

## R07 — Image bytes and private attachments

**Need.** Preserve irreplaceable image bytes consistently with their associations;
URLs and SQL records alone cannot restore a missing file.

**Decision.** Use AWS Backup hourly periodic protection for the retained image buckets,
with 30-day retention. The owner reports the current image estate is below 10 GB;
this is supplied scope information, not a measurement or cost estimate. Keep existing
public AWS logo objects/URLs and protect originals still used by V1. Enable required
S3 versioning and configure the standard AWS Backup permissions/integration. No new
CDN or global relocation. Private assistance remains in GitHub with native attachments;
AWS image protection does not claim to cover those attachments.

**Simpler alternative.** S3 availability or a URL inventory alone does not protect
recoverable historical bytes. A custom file copier/recovery ledger is unnecessary
when standard protection meets the selected window.

**Consequences.** Account for backup, object versions, requests and retention cost
before activation; no zero-cost or zero-loss promise. Current privacy/erasure rules
still govern restored images. F10 must qualify private attachment access, complete
receipt and actual erasure; no silent substitution of S3 for private GitHub storage.

**Verification.** Restore an image deleted/replaced after the selected point, compare
bytes and associations, verify current privacy restrictions before publication,
check failed protection and expiry. Demonstrate club-logo preservation before any
transition destruction. Standard AWS recovery-point behavior must be checked after
material retention changes; do not assume changing retention preserves continuity.

**Sources.** [AWS Backup S3](https://docs.aws.amazon.com/aws-backup/latest/devguide/s3-backups.html),
[periodic S3 backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/s3-backups.html),
[GitHub issue attachments](https://cli.github.com/manual/gh_issue_create).

## R08 — Manual restoration, native accessibility and acceptance

**Need.** Establish operationally usable recovery and mobile behavior rather than
mistaking documentation or successful commands for outcomes.

**Decision.** Restore in a closed isolated environment using standard tools. Apply
current identity, erasure, privacy, paid/manual rights and notification expiry/
consumed-announcement obligations before reopening affected access or sends.
Provider checks and authorised manual correction are acceptable. Keep uncertain
resources unavailable. Rebuild derived search without replacing usable results
with an incomplete index. After V2 opens there is no functional return to V1.

Preserve accepted French journeys and states. Native verification covers screen
readers, text enlargement, reduced motion, focus, 44-logical-point targets, both
themes and understandable errors without colour-only meaning. R02-approved Figma
remains the visual authority; no new product screen is introduced by F13.

**Simpler alternative.** Reopening immediately after loading a dump can revive
expired/deleted data. An exhaustive failure framework, full mobile automation
estate, dedicated emergency console or automatic replay engine is unnecessary.

**Consequences.** Produce concise operator instructions and retain safe results
with the tested artefact. Do not promise a restoration duration, on-call duty,
monthly availability or provider response time. Run relevant restoration checks
after a material change; no performance/capacity qualification or deferred work item.

**Verification.** Actual database/file recovery, current restrictions and notification
facts, derived rebuild, compatible rollback and both-platform accessibility/provider
journeys. JUnit/Spring/Testcontainers, pytest and Jest Expo/React Native Testing
Library cover ordinary behavior; native evidence covers boundaries mocks cannot.

## Remaining qualification, not unresolved product choices

The decisions above fix the intended approach. Implementation must pin compatible
stable releases, prove the actual generator decoding paths and no-repeat alert
configuration, verify account quotas/retention and exercise a real isolated restore.
Failure requires correction within the selected approach; inability to satisfy an
accepted requirement returns for a decision instead of a silent tool/provider or
product substitution. No qualification result is asserted here.

## R09 — Proportionate backup signaling and release candidates

**Need.** Keep recoverable copies and understandable operational evidence without a second scheduling supervisor.

**Decision.** PostgreSQL native Dokploy jobs every 30 minutes; hourly periodic AWS Backup for images; 30-day retention. Native problem notifications and existing history replace absence-of-success thresholds and continuous-protection configuration monitoring. Every new application delivery qualifies its own source-matching candidate; production promotes the same digests. Documentation alone does not deliver applications.

**Simpler alternative.** Retain native job history/notifications and manual resolution rather than bespoke counters, configuration watchers or documentary candidate reuse. This is the selected baseline.

**Consequences.** A silent schedule stop may go unalerted; actual restore losses/duration are measured, not guaranteed. Automatic recovery requires positive scoped evidence; otherwise the operator resolves through existing tools.

**Validation.** Native completed dump/upload and periodic-image job signals, failed jobs, silent stoppage limitation, isolated restore and source/digest correspondence. Runtime/provider evidence is **NOT EXECUTED**; inability to establish completed backups, safe restoration or matching images blocks qualification without an implicit custom mechanism.
