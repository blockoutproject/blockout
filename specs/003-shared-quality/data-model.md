# Data model: common responsibility and lifecycle

**Authority**: [F13 spec](spec.md), [plan](plan.md); meanings remain with the owning specifications linked there. These are logical responsibilities, not an invented physical schema or a request for generic tables.

## Authoritative business records

| Concept / owner                                            | Relevant logical fields and relationships                                                                                                                       | Validation and lifecycle                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sporting identity and accepted truth — F02, sourced by F01 | Owner-defined stable identifier, source identity, accepted observation/version, visibility and corrections; relations to sporting participants and club images. | Backend alone commits; preserve current accepted state against old work. No identity by name-only matching. Supplier unavailability/unreadable material is not absence. Concrete tables/concurrency fields belong to F02.                                                                         |
| Account and application permissions — F05/F12              | Existing Auth0 subject mapped to the owning account identity; current application rights and separate administration/bypass permissions.                        | No email-based merge. Every protected use case checks current ownership/rights, within F05's accepted token-validity limits. JWT claims do not replace owner checks. [F05](../005-accounts-identity/plan.md#identity-and-account-establishment) owns the configured identity/test boundary.       |
| Pro entitlement — F09                                      | RevenueCat identity association and SDK-provided entitlement state/evidence, with F05/F14 continuity.                                                           | Provider SDK remains authority with its accepted cache/refresh rules; no second PostgreSQL entitlement projection or new tolerance.                                                                                                                                                               |
| Accepted image — owning feature; F14 club-logo continuity  | Image bytes, validated media type, byte length, owner association and access/erasure context. Stored with the authoritative relation in PostgreSQL.             | PNG/JPEG, at most 5 MiB under accepted upload rules. Owner validates permission and association; bytes and relationship commit together. Deletion/restore respect current privacy obligations. An old URL is not retained bytes.                                                                  |
| Private support case and attachments — F10                 | Private GitHub case, native attachment/reference and authorized report association.                                                                             | F10's provider/privacy lifecycle remains authoritative; never copied into this public repository or falsely covered by a PostgreSQL dump. No parallel attachment store or independent support backup is introduced; recovery of cases and attachments depends on GitHub under F10.                |
| Legal document — F11                                       | Versioned authored content, public document identity and active valid release.                                                                                  | Repository/backend delivery is source and publication boundary. Failed delivery preserves valid content, but backend loss can prevent reading. Public privacy/deletion URLs remain applicable despite hidden blocked in-app navigation.                                                           |
| Derived search/feed/notification state — F04/F06/F07       | Owner references, accepted input state, available output and owner-defined expiry/processing facts.                                                             | Previous usable results survive incomplete rebuilds, but current restrictions always apply. Purge/expiry also removes in-memory visibility; restoration must not resurrect expired or erased data. F07 announcement facts and exceptional restoration duplicates retain their exact owner limits. |

PostgreSQL constraints enforce structural references/uniqueness and use-case transactions commit related changes. Domain owners select required optimistic concurrency or other ordinary SQL controls with their concrete operations. F13 neither creates a universal version column nor promises global ordering across independent use cases. External calls do not hold database transactions open.

## Quality objective

Logical fields: owning requirement, affected user/operation, expected observable result and applicable evidence. This is specification/test intent, not persisted business data. Domain scheduling/expiry is meaningful; the withdrawn load, percentile-latency and monthly-availability objectives create no records or metrics programme.

## Operational observation and incident

Logical fields: useful nonpersonal scope, stage, observed time, outcome, latest useful success, affected count/partial success when available, safe reason and allowed recovery action. Supplier observation, acquisition, accepted integration and projection are distinct stages; a stage success cannot advance another stage's meaning.

The relevant owner's ordinary state and structured logs/metrics supply these facts. Never-run, awaiting eligibility and paused are not successful executions. A start becomes completed, partially successful or failed only with evidence; a lost process can leave an unknown outcome. Missing telemetry does not infer health. Do not synthesize false completion from an HTTP call or a cleared technical error.

Application failures use owner state and structured diagnostics, not a new incident table. Business recovery requires useful results for the affected scope. Only [F05 original-target references](../005-accounts-identity/plan.md#erasure-and-manual-resolution) needed for manual cleanup may enter private logs under F11; metric labels and public output contain no personal references. Raw provider files and secrets remain excluded. This exception creates no deletion entity or exhaustive incident ledger.

## Reuse of retained data

Retained application values include their owner identity, current visibility, permissions, erasure and domain expiry conditions. Older values do not establish current rights. Reconstructed derivatives remain unusable where current obligations cannot be established; F07 expiry and consumed-announcement rules still apply. No backup record, infrastructure restoration model or hosted retention policy is defined here.

## Club-logo transition set — F14

Retained inputs include V1 club reference, logo association, recoverable bytes and evidence of independent retention. Later states distinguish certain reassociation, awaiting a certain match, and missing file. Missing/ambiguous cases must remain honest and cannot be converted to inferred name matches. Missing bytes do not authorize reset. This manual scope concerns club logos only; F14 decides concrete transition records and procedures, with F02 identity rules.

## Transient mobile session and cache

Logical fields: current validated subject and business account, the subject's mounted private QueryClient, original-principal request association and validated cached business values. Sign-out or subject change unmounts that lifetime and clears private data; late callbacks remain attached to the discarded client even when cancellation loses a race. Returning to the same subject mounts fresh state. There is no application session UUID or generation counter. Auth0 credentials use the native secure store; RevenueCat's serialized native association and SDK state have their distinct authority. No persistent business cache or queued write.

Admission state is transient under [F12](../013-administration-app-configuration/spec.md): no persisted fallback survives cold start. Domain expiry still applies to retained data without connectivity.

## Schema lifecycle

Schema authoring and migration execution follow the [plan](plan.md#runtime-data-and-consistency). This logical model introduces no additional persistence or migration mechanism.

## Single-image presentation lifetime

A mounted photo/logo field retains only its current OS-menu visit and callbacks under the existing component lifetime. It supplies current authorization/preparation and rejects returned choices after withdrawal or retirement. The menu is not a global request, route payload, persisted entity, upload, form, cache or command ledger. Known image presence, a usable preview URI and permission to remove/reset remain distinct; actual keep/remove/replace state and file ownership stay with F05/F02. Multi-image F10 attachments retain their existing lifetime.
