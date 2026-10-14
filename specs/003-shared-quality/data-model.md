# Data model: common responsibility and lifecycle

**Authority**: [F13 spec](spec.md), [plan](plan.md); meanings remain with the owning specifications linked there. These are logical responsibilities, not an invented physical schema or a request for generic tables.

## Authoritative business records

| Concept / owner                                            | Relevant logical fields and relationships                                                                                                                       | Validation and lifecycle                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sporting identity and accepted truth — F02, sourced by F01 | Owner-defined stable identifier, source identity, accepted observation/version, visibility and corrections; relations to sporting participants and club images. | Backend alone commits; preserve current accepted state against old work. No identity by name-only matching. Supplier unavailability/unreadable material is not absence. Concrete tables/concurrency fields belong to F02.                                                                         |
| Account and application permissions — F05/F12              | Existing Auth0 subject mapped to the owning account identity; current application rights and separate administration/bypass permissions.                        | No email-based merge. Every protected use case checks current ownership/rights, within F05's accepted token-validity limits. JWT claims do not replace owner checks. [F05](../005-accounts-identity/plan.md#identity-and-account-establishment) owns the preproduction identity boundary.         |
| Pro entitlement — F09                                      | RevenueCat identity association and SDK-provided entitlement state/evidence, with F05/F14 continuity.                                                           | Provider SDK remains authority with its accepted cache/refresh rules; no second PostgreSQL entitlement projection or new tolerance.                                                                                                                                                               |
| Accepted image — owning feature; F14 club-logo continuity  | Image bytes, validated media type, byte length, owner association and access/erasure context. Stored with the authoritative relation in PostgreSQL.             | PNG/JPEG, at most 5 MiB under accepted upload rules. Owner validates permission and association; bytes and relationship commit together. Deletion/restore respect current privacy obligations. An old URL is not retained bytes.                                                                  |
| Private support attachment — F10                           | Private GitHub-native attachment/reference and authorized report association.                                                                                   | F10's provider/privacy lifecycle remains authoritative; never copied into this public repository or falsely covered by a PostgreSQL dump. No parallel attachment store is introduced by F13.                                                                                                      |
| Legal document — F11                                       | Versioned authored content, public document identity and active valid release.                                                                                  | Repository/backend delivery is source and publication boundary. Failed delivery preserves valid content, but backend loss can prevent reading. Public privacy/deletion URLs remain applicable despite hidden blocked in-app navigation.                                                           |
| Derived search/feed/notification state — F04/F06/F07       | Owner references, accepted input state, available output and owner-defined expiry/processing facts.                                                             | Previous usable results survive incomplete rebuilds, but current restrictions always apply. Purge/expiry also removes in-memory visibility; restoration must not resurrect expired or erased data. F07 announcement facts and exceptional restoration duplicates retain their exact owner limits. |

PostgreSQL constraints enforce structural references/uniqueness and use-case transactions commit related changes. Domain owners select required optimistic concurrency or other ordinary SQL controls with their concrete operations. F13 neither creates a universal version column nor promises global ordering across independent use cases. External calls do not hold database transactions open.

## Operational observation and incident

Domain owners supply their operational state; structured logs/metrics and native Grafana alert state provide diagnostics. F13 defines no separate incident entity. [The operations plan](plan.md#manual-delivery-and-operations) owns stage distinctions, recovery evidence, retention and the limited F05 private-reference exception.

## Restorable set

Dokploy/S3 own backup status and object metadata. The database dump retains authoritative relations and image bytes; domain owners govern rebuilding derived state. Application configuration and external provider state are separate from that dump. [Backup and recovery rules](plan.md#backups-and-recovery) define retention, initial restoration evidence and the conditions for reopening restored data.

## Club-logo transition set — F14

Retained inputs include V1 club reference, logo association, recoverable bytes and evidence of independent retention. Later states distinguish certain reassociation, awaiting a certain match, and missing file. Missing/ambiguous cases must remain honest and cannot be converted to inferred name matches. Missing bytes do not authorize reset. This manual scope concerns club logos only; F14 decides concrete transition records and procedures, with F02 identity rules.

## Transient mobile session and cache

Logical fields: current account/session identity, local session generation, in-flight request association and validated cached business values. Session generation is a small in-memory guard, not a distributed session database. Sign-out/account change invalidates the generation, cancels requests and clears private data; late results from the previous generation are rejected even when cancellation loses a race. Auth0 credentials use the native secure store; RevenueCat's SDK state has its distinct authority. No persistent business cache or queued write.

Admission state is transient under [F12](../013-administration-app-configuration/spec.md): no persisted fallback survives cold start. Domain expiry still applies to retained data without connectivity.

## Schema lifecycle

Schema authoring and migration execution follow the [plan](plan.md#runtime-data-and-consistency). This logical model introduces no additional persistence or migration mechanism.
