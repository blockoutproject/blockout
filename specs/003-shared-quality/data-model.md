# Data model: common responsibility and lifecycle

**Authority**: [F13 spec](spec.md), [plan](plan.md); meanings remain with the owning specifications linked there. These are logical responsibilities, not an invented physical schema or a request for generic tables.

## Authoritative business records

| Concept / owner                                            | Relevant logical fields and relationships                                                                                                                       | Validation and lifecycle                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sporting identity and accepted truth — F02, sourced by F01 | Owner-defined stable identifier, source identity, accepted observation/version, visibility and corrections; relations to sporting participants and club images. | Backend alone commits; preserve current accepted state against old work. No identity by name-only matching. Supplier unavailability/unreadable material is not absence. Concrete tables/concurrency fields belong to F02.                                                                                                       |
| Account and application permissions — F05/F12              | Existing Auth0 subject mapped to the owning account identity; current application rights and separate administration/bypass permissions.                        | No email-based merge. Every protected use case checks current ownership/rights, within F05's accepted token-validity limits. JWT claims do not replace owner checks. Preproduction native signup uses its dedicated database connection in the shared tenant; destructive tests exclude social and cross-connection principals. |
| Pro entitlement — F09                                      | RevenueCat identity association and SDK-provided entitlement state/evidence, with F05/F14 continuity.                                                           | Provider SDK remains authority with its accepted cache/refresh rules; no second PostgreSQL entitlement projection or new tolerance.                                                                                                                                                                                             |
| Accepted image — owning feature; F14 club-logo continuity  | Image bytes, validated media type, byte length, owner association and access/erasure context. Stored with the authoritative relation in PostgreSQL.             | PNG/JPEG, at most 5 MiB under accepted upload rules. Owner validates permission and association; bytes and relationship commit together. Deletion/restore respect current privacy obligations. An old URL is not retained bytes.                                                                                                |
| Private support attachment — F10                           | Private GitHub-native attachment/reference and authorized report association.                                                                                   | F10's provider/privacy lifecycle remains authoritative; never copied into this public repository or falsely covered by a PostgreSQL dump. No parallel attachment store is introduced by F13.                                                                                                                                    |
| Legal document — F11                                       | Versioned authored content, public document identity and active valid release.                                                                                  | Repository/backend delivery is source and publication boundary. Failed delivery preserves valid content, but backend loss can prevent reading. Public privacy/deletion URLs remain applicable despite hidden blocked in-app navigation.                                                                                         |
| Derived search/feed/notification state — F04/F06/F07       | Owner references, accepted input state, available output and owner-defined expiry/processing facts.                                                             | Previous usable results survive incomplete rebuilds, but current restrictions always apply. Purge/expiry also removes in-memory visibility; restoration must not resurrect expired or erased data. F07 announcement facts and exceptional restoration duplicates retain their exact owner limits.                               |

PostgreSQL constraints enforce structural references/uniqueness and use-case transactions commit related changes. Domain owners select required optimistic concurrency or other ordinary SQL controls with their concrete operations. F13 neither creates a universal version column nor promises global ordering across independent use cases. External calls do not hold database transactions open.

## Quality objective

Logical fields: owning requirement, affected user/operation, expected observable result and applicable evidence. This is specification/test intent, not persisted business data. Domain scheduling/expiry is meaningful; the withdrawn load, percentile-latency and monthly-availability objectives create no records or metrics programme.

## Operational observation and incident

Logical fields: useful nonpersonal scope, stage, observed time, outcome, latest useful success, affected count/partial success when available, safe reason and allowed recovery action. Supplier observation, acquisition, accepted integration and projection are distinct stages; a stage success cannot advance another stage's meaning.

The relevant owner's ordinary state and structured logs/metrics supply these facts. Never-run, awaiting eligibility and paused are not successful executions. A start becomes completed, partially successful or failed only with evidence; a lost process can leave an unknown outcome. Missing telemetry does not infer health. Do not synthesize false completion from an HTTP call or native alert closure.

An incident is the operational condition plus native Grafana alert state, not a new PostgreSQL incident table. Native firing/resolved and repeat grouping are provider states; business recovery requires useful results for the affected scope. Keep detection, alert, manual intervention and observed recovery times distinct where available without an intervention guarantee. Logs retain 14 days; no personal identifiers, raw provider files or secrets enter logs/labels/alerts.

## Restorable set

Logical fields: environment, native backup timestamp/status, private S3 object reference and bytes, retained lifetime, actual restoration outcome if performed. These are native Dokploy/S3 records, not a duplicate registry. The database dump contains authoritative relational/image values; derived state can be rebuilt according to its owner. Identities/grants, application configuration and provider state are not magically captured by a database dump.

A scheduled run may fail, produce a copy or remain without a confirmed outcome. Presence does not mean validated restoration. S3 expires copies using the 30-day rule; no exact deletion-at-720-hours guarantee. One initial isolated restoration validates expected data/bytes/associations and limitations. A real restored copy remains closed to affected access/sends until current erasure, permissions, F07 expiry and F14 continuity obligations are applied. No recurring restore job or persistent backup-verification model.

## Club-logo transition set — F14

Retained inputs include V1 club reference, logo association, recoverable bytes and evidence of independent retention. Later states distinguish certain reassociation, awaiting a certain match, and missing file. Missing/ambiguous cases must remain honest and cannot be converted to inferred name matches. Missing bytes do not authorize reset. This manual scope concerns club logos only; F14 decides concrete transition records and procedures, with F02 identity rules.

## Transient mobile session and cache

Logical fields: current account/session identity, local session generation, in-flight request association and validated cached business values. Session generation is a small in-memory guard, not a distributed session database. Sign-out/account change invalidates the generation, cancels requests and clears private data; late results from the previous generation are rejected even when cancellation loses a race. Auth0 credentials use the native secure store; RevenueCat's SDK state has its distinct authority. No persistent business cache or queued write.

Admission state is transient under [F12](../013-administration-app-configuration/spec.md): no persisted fallback survives cold start. Domain expiry still applies to retained data without connectivity.

## Schema lifecycle

Schema authoring and migration execution follow the [plan](plan.md#runtime-data-and-consistency). This logical model introduces no additional persistence or migration mechanism.
