# F13 derived models and ownership

**Input**: [specification](spec.md), [cross-feature inputs](cross-feature-inputs.md), [owning specifications](cross-feature-inputs.md#owner-matrix).
These are derived technical concepts, not a new shared database or public resource API.

## Observation of operations

| Field/concept                   | Meaning and constraints                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Environment/service/problem     | Fixed non-personal categories, separate production/preproduction                                    |
| Scope                           | Stable technical family/context; no email/account identifier, arbitrary URL or raw document         |
| Observation time / last success | Distinct UTC instants; absence of observation is unknown, not healthy                               |
| State                           | Never run, waiting eligibility, paused, running, completed, failed; partial results remain explicit |
| Counts / reason category        | Available accepted/failed/pending counts and allowlisted sanitized reason                           |
| Diagnostic reference            | Opaque per-operation reference, not incident grouping identity                                      |

The domain owns authoritative pending/failed state in its own tables where required. Logs/metrics project that state; F13 does not create an operational ledger. A cycle can download successfully while integration remains failed. Pausing or restarting does not manufacture a completion transition.

## Incident

An incident belongs to Grafana IRM, identified by environment + problem + stable scope. Observations attach to the same incident. Detection, opening notification, human intervention and actual recovery have distinct times.

Allowed logical lifecycle: healthy/unknown observation → confirmed incident → repeated observations of the same incident → positive same-scope recovery or explicit operator resolution in the existing tools. Automatic recovery requires positive evidence. Unknown/missing telemetry never transitions to healthy. A pause retains unresolved work. A new confirmed recurrence after recovery may open a new incident. Transport-level notification duplicates after a lost response do not imply a second logical transition.

F01 owns first-failed-competition-cycle detection and recovery semantics; F13 provides the operational integration. No application incident table, notification bus or exactly-once transport claim.

## Restorable set

A restorable set comprises a dated usable PostgreSQL dump, protected file bytes/references consistent with that dump, required domain/provider checks, and current restrictions to apply before reopening. Provider consoles/artifact metadata and the manual procedure represent it; no central backup catalog database is introduced.

Capture environment, data scope, completion date, backup object/recovery-point identifiers, schema/application compatibility, restored file checks and actual omissions/duration in restricted operational evidence. Never publish actual production inventories, identities or protected file URLs in this public repository.

Lifecycle: job started → completed dump/upload or failed/unknown; completed storage is a candidate, not proof of restorability. An isolated exercise qualifies actual recovery. Copy expiry at 30 days remains independent of a failed new job; no indefinite last-copy extension. Reopening requires present rights/erasure/purge checks, not only historical contents.

Native Dokploy jobs run every 30 minutes for PostgreSQL; periodic AWS Backup jobs run hourly for images, with 30-day retention for both. Their native history and problem notifications provide evidence. No Blockout elapsed-success counter, backup ledger or continuous-protection configuration watcher is introduced. A silently stopped schedule may produce no alert.

## Logo association handoff

F02 owns club identity and authoritative logo association. F14 owns the authorized transition inventory: old stable club/source references, protected file reference and actual bytes, certain target correspondence or unresolved/missing result. A name-only similarity is never a match. Unresolved entries remain available to the authorized operator without creating a public club. A missing file blocks claiming preservation and cannot authorize destructive reset.

F13 owns protection/restore capabilities and acceptance fixtures, not the actual export/reassociation/migration. No new general migration record type or runtime transition service.

## Mobile request/session context

An in-memory request context holds operation kind, abort/deadline state and session generation. Private query data belongs to the current account/session. Logout/replacement increments generation and cancels/clears private work; old-generation results are discarded. No durable retry queue, cross-account cache or operation receipt.

Problem DTO fields and response-validation rules are defined once in [API contract](contracts/api.md), not duplicated as business entities.

## Release artifact identity

Release metadata ties source content/revision to backend and collector image digests, migration compatibility and verification/preproduction outcomes. GitHub/GHCR own these technical artifacts. EAS/store build IDs identify native candidates separately. No application release database. A source SHA label alone does not prove a deployed digest or mobile configuration.

## Persistence boundaries

F13 initializes infrastructure and technical migration wiring, but owns no business schema/table. Module schemas and domain states are created by their feature plans. Auth0 principal, Blockout account and RevenueCat customer remain separate identities with F05/F09-owned verified correspondence. Search indexes are disposable projections; all source history not reconstructible from providers remains protected authoritative data.
