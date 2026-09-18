# V2 functional specification perimeters

## Purpose and authority

This map defines the owner-approved functional decomposition from [#254](https://github.com/blockoutproject/blockout/issues/254), using the [V1 inventory](v1-functional-inventory.md) and [identity/Pro continuity assessment](identity-and-pro-continuity.md). It allocates requirements and open questions; it does not claim that the specifications have been written or that production continuity has been tested.

The [constitution](../../.specify/memory/constitution.md) governs accepted specifications. These perimeters are documentary responsibilities, not microservices, runtime modules, endpoints or database boundaries. Accepted `spec.md` files will own observable V2 behavior. Existing code, contracts, tests and provider observations remain evidence; architecture and implementation follow acceptance of the complete functional corpus.

F01–F14 and R01–R02 are references local to this map, not Spec Kit task IDs. GitHub owns issue status, assignments, blockers and acceptance evidence. The issue links below identify the work owning each perimeter, without duplicating its status here.

## Accepted framing rules

- Preserve all accepted V1 capabilities and explicit V2 additions. Retain business capabilities found only in APIs by default, without inventing screens. Removal or functional change requires an explicit owner decision. Internal plumbing and test hooks are not additional user capabilities and need not survive as endpoints.
- When V1 behavior appears defective, present the observation, proposed V2 outcome and consequences to the owner. Do not silently fix functional behavior or reproduce it merely because a test describes it. Do not reopen decisions already accepted.
- Place each administrative action with its business domain. F12 owns common administration access/configuration, not a second copy of every domain's rules.
- Separate reliable source acquisition (F01) from sporting decisions made from observations (F02). Incomplete acquisition does not itself authorize deactivation.
- The migration reset may lose old V1 sporting data that sources can no longer supply. V2 reconstructs what remains obtainable, then preserves its acquired identities and useful history according to F02. Conservation is distinct from visibility: confirmed same-season catalog withdrawal or explicit administrative exclusion may hide resources without erasure; outage or seasonal closure alone does not. This exception does not permit discarding Auth0 identities, valid paid access or manually associated club logos, or routinely losing V2 history. Before reset, F14 must preserve and verify club references, logo URLs and corresponding files. Certain identity matches permit reattachment; unresolved associations remain preserved without name-only matching. This manual-presentation migration requirement is limited to club logos.
- Existing sporting corrections include names, logos and classifications; this map does not authorize a new manual score/match editor. Future fantasy, predictions and social ambitions remain context rather than V2 scope.
- Keep the FFVB URL-discovery/CSV acquisition constraint, existing Auth0 identity and paid-access continuity, contract-first intent and Liquibase replacement constraint. Do not derive a technical solution from them during specification drafting.
- Complete every functional specification before architecture or implementation. Perform the single planned global Figma reconciliation after drafting and global functional review, not once per perimeter.

## Perimeter register

Each row names the primary owner of its behavior. A consumer references the owning rule instead of redefining it. Split capability rows below assign distinct parts, not competing authorities.

| Ref / owning issue                                                   | Functional responsibility                                                                                                                                                                                                                                                              | Boundaries and consumers                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 / [#257](https://github.com/blockoutproject/blockout/issues/257) | Source acquisition: FFVB/LNV coverage, retained CSV exports and other existing inputs, observation completeness, invalid/empty/unavailable data, collection cadence, provider failures, source provenance, club/geocoding enrichment inputs and collection controls.                   | Supplies evidence to F02. No sporting identity, disappearance consequence, new provider or implementation choice is inferred. F13 owns common quality expectations.                                                                                              |
| F02 / [#258](https://github.com/blockoutproject/blockout/issues/258) | Sporting data: identity, seasons, classification/mappings, associations, source precedence, official standings, creation/correction, disappearance/reactivation, coordinates and history. Owns existing names/logos/classification administrative actions.                             | Consumes F01 observations. F03/F04/F06/F08 consume sporting meaning. F14 owns the migration exception; no new score editor is implied.                                                                                                                           |
| F03 / [#263](https://github.com/blockoutproject/blockout/issues/263) | Sporting consultation: clubs, teams, pools, rankings, matches, entity calendars, map, media and official documents; navigation, displayed values, day grouping, date labels and partial/error/refresh states.                                                                          | F02 owns sporting truth, F09 Pro eligibility, F08 contributed live rules. F06 reuses calendar presentation while selecting a personal match set.                                                                                                                 |
| F04 / [#264](https://github.com/blockoutproject/blockout/issues/264) | Search/discovery: suggestions, filters, season choices, ordering, pagination/count meaning, no-result versus failure/stale states and navigation.                                                                                                                                      | Uses F02 season/history semantics; no search engine or index design.                                                                                                                                                                                             |
| F05 / [#261](https://github.com/blockoutproject/blockout/issues/261) | [Accounts/identity specification](../../specs/005-accounts-identity/spec.md): guest/onboarding, existing associations only, minimal profile, sessions/isolation, age and durable deletion/return; FR-001–FR-039, A01–A32.                                                              | F11 owns common privacy constraints; F09 paid rights; F08 publication eligibility; F14 migration. Existing associations are preserved; no new linking, business-account merge or sign-in provider is authorized.                                                 |
| F06 / [#265](https://github.com/blockoutproject/blockout/issues/265) | Following/personal feed: follow/unfollow teams/pools, followed lists and counters, personal match selection, seasonal renewal and missing-target handling.                                                                                                                             | Uses F03 calendar rules and F05 account state; supplies relationships to F07. No club following or automatic season carry-over is inferred.                                                                                                                      |
| F07 / [#267](https://github.com/blockoutproject/blockout/issues/267) | Notifications: triggers, recipients, deduplication, inbox and push outcomes, read/opened/unread capabilities, deletion, token/device handling and target navigation.                                                                                                                   | Consumes F02 match transitions, F06 follows and F08 live transitions. No generic campaign UI or guaranteed push receipt is inferred.                                                                                                                             |
| F08 / [#266](https://github.com/blockoutproject/blockout/issues/266) | Live contribution/moderation: URLs, ownership, publication windows/quotas/age, professional-match restrictions, reports, state transitions/history and moderator actions/exceptions.                                                                                                   | Uses F02 sporting context and F05 age evidence. F07 owns resulting notifications; do not duplicate account-age policy or infer stream-provider polling.                                                                                                          |
| F09 / [#262](https://github.com/blockoutproject/blockout/issues/262) | Pro: three retained benefits, paid purchase/restore/transfer, verified assisted recovery, manual grants/permissions, independent rights and active/free/unknown/expired/revoked behavior.                                                                                              | Uses F05 identity; F11 consumes ad eligibility; F14 owns cutover verification. No new paid benefit or assumed restoration guarantee.                                                                                                                             |
| F10 / [#268](https://github.com/blockoutproject/blockout/issues/268) | Reports/suggestions: submission by visitors/users, categories, diagnostics/context, attachments, failure recovery and operator intake/handling.                                                                                                                                        | F08 owns live moderation reports, F09 paid recovery decisions, F11 privacy. No implicit support chat or resolution-tracking UI.                                                                                                                                  |
| F11 / [#260](https://github.com/blockoutproject/blockout/issues/260) | [Advertising/privacy/legal specification](../../specs/004-advertising-privacy-legal/spec.md): common ten-action interstitial frequency, non-personalized advertising for the 13+ audience without age collection, legal reading/editing and shared privacy, FR-001–FR-037 and A01–A27. | Consumes F09 entitlement states. F05 owns the deletion lifecycle; domain owners apply shared privacy rules. Preserves the existing scoped mobile legal editor. No invented acceptance ledger or retention duration; F10 consumes the accepted support agreement. |
| F12 / [#269](https://github.com/blockoutproject/blockout/issues/269) | Common administration/app configuration: access and permission principles, maintenance content/access, minimum versions/store links, authorized bypass and configuration error/recovery.                                                                                               | Domain actions stay in F01/F02/F08/F09/F11. F14 owns retirement; no generic CRUD console or automatic universal moderator role.                                                                                                                                  |
| F13 / [#259](https://github.com/blockoutproject/blockout/issues/259) | [Shared quality/operations specification](../../specs/003-shared-quality/spec.md): measurable workload, performance/freshness/availability, security assurance, accessibility/platform/localization, diagnostics and recovery/protection, FR-001–FR-032 and A01–A22.                   | F11 owns privacy; F05 authentication; each domain owns action permissions and specific refinements. F14 owns migration-only criteria. No vendor/topology or speculative scale design.                                                                            |
| F14 / [#270](https://github.com/blockoutproject/blockout/issues/270) | V1→V2 transition: allowed reset/reconstruction, Auth0/Pro preservation, subscriber reconciliation, preservation and certain reattachment of club-logo associations/files, old clients/sessions, shared-provider dependencies and go/no-go/abort/recovery requirements.                 | Uses F02/F05/F09/F13 rules; does not redefine normal account/Pro/history behavior or perform migration.                                                                                                                                                          |

## Feature specification references

### F01 — Source acquisition

[Source acquisition and observation reliability](../../specs/001-source-acquisition/spec.md) owns FR-001–FR-049 and acceptance scenarios A01–A36. These are requirement/scenario references, not implementation task IDs or delivery status.

| Assigned coverage                                                           | Specification requirements | Acceptance scenarios       |
| --------------------------------------------------------------------------- | -------------------------- | -------------------------- |
| V1-22, G17: sources, discovery, exclusions, seasons and professional phases | FR-001–FR-007              | A01–A05, A16–A18           |
| V1-19: acquisition classification/exclusion gates                           | FR-008–FR-010              | A06–A07                    |
| V1-22: completeness, invalid/empty input and independent observations       | FR-011–FR-020              | A02, A08–A14, A17          |
| V1-22/V1-23/V1-24: evidence and integration boundary                        | FR-021–FR-023              | A10–A11, A15, A17, A33     |
| V1-23: club and coordinate observations                                     | FR-024–FR-029              | A19–A22                    |
| V1-20/V1-22/V1-23: cadence and controls                                     | FR-030–FR-038              | A04, A07, A23–A28          |
| V1-20/V1-24: incidents and recovery                                         | FR-039–FR-045              | A13–A15, A18, A22, A29–A33 |
| V1-24, G01: historical acquisition                                          | FR-046–FR-049              | A14, A34–A36               |

The [F01 dependency table](../../specs/001-source-acquisition/spec.md#cross-perimeter-dependencies) assigns follow-through to F02, F03, F13, F11, F12, F14 and R02. In particular, F02 defines sporting consequences and integration consistency without treating catalog absence, acquisition failure or stopping collection as automatic deletion. Pool classification overrides are an approved eligibility input, while their detailed mapping semantics and shared-model reconciliation remain F02-owned. R01 must reconcile these boundaries across the completed corpus.

### F02 — Sporting data identity and lifecycle

[Sporting data identity and lifecycle](../../specs/002-sporting-data/spec.md) owns FR-001–FR-053 and A01–A38. These references identify requirements and acceptance scenarios, not implementation tasks or delivery status.

| Assigned coverage                                        | Specification requirements | Acceptance scenarios |
| -------------------------------------------------------- | -------------------------- | -------------------- |
| V1-22 / G07: sporting identity and scoped aliases        | FR-001–FR-009, FR-053      | A01–A05              |
| V1-19 / G06: classification inheritance and correction   | FR-010–FR-016              | A06–A10, A31         |
| V1-22 / G04: partial input, integration and replay       | FR-017–FR-022, FR-048      | A04, A11–A15, A27    |
| V1-22 / G05: professional phases and source authority    | FR-023–FR-027              | A16–A18, A22         |
| V1-22 / G08, G16: result and source-time semantics       | FR-028–FR-033              | A19–A23              |
| V1-22 / G02: official standing with optional team links  | FR-034–FR-036              | A24–A25              |
| V1-22/V1-23 / G01, G04: preserved history and visibility | FR-037–FR-044              | A26–A32              |
| V1-18/V1-19 / G03: manual presentation and permissions   | FR-015, FR-045–FR-048      | A09, A15, A33–A35    |
| V1-23 / G13: club details and municipal location         | FR-049–FR-052              | A36–A38              |

The [F02 dependency table](../../specs/002-sporting-data/spec.md#cross-perimeter-dependencies) assigns consumer follow-through without declaring those specifications complete. F03 must include unlinked official-standing rows, provisional/unknown scores, undated matches, partial freshness and unavailable targets. F01/F12 must distinguish retained published classification from settings permitting collection, including refused restoration (FR-012, A06–A08). F04/F06 preserve visibility and identity semantics under authoritative-calendar withdrawals/reappearances (FR-024, FR-038–FR-042, A27–A30). F07 owns notification consequences of actual sporting transitions. F11/F12/F13/F14 own privacy, permission assignment, common operational objectives and transition criteria. R02 reconciles all required journeys/states with Figma in the global pass.

### F05 — Accounts and identity

[Accounts and identity](../../specs/005-accounts-identity/spec.md) owns FR-001–FR-039 and A01–A32. It preserves existing identities and associations, forbids new links or business-account merges, minimizes the business profile and defines durable deletion through return and paid restoration. V1 code remains historical evidence, not proof of these outcomes.

| Assigned coverage                                                                            | Specification requirements   | Acceptance scenarios |
| -------------------------------------------------------------------------------------------- | ---------------------------- | -------------------- |
| V1-01; Q01; S02–S06: guest, onboarding, identity, duplicate refusal and migration recreation | FR-001–FR-010                | A01–A08              |
| V1-02; G11: profile minimization, automatic creation, pseudo/photo editing and access        | FR-011–FR-016                | A09–A12              |
| V1-01/V1-03; S10; Q01: sessions, degraded states, identity isolation and notifications       | FR-017–FR-023, FR-038–FR-039 | A13–A19              |
| G12; Q02; S16 input: principal creation-date evidence and absent proof                       | FR-024–FR-025, FR-035        | A20–A22              |
| V1-03; G11; Q04; S11–S12: deletion, provider/derived cleanup, retries and return             | FR-026–FR-035, FR-038        | A23–A29              |
| S11; F09 interface S07–S09: restoration after deletion and paid transfer                     | FR-035–FR-036                | A30–A31              |
| Q04; F11: outside-app request, ownership proof and privacy                                   | FR-029, FR-037–FR-038        | A32                  |

The [F05 dependency table](../../specs/005-accounts-identity/spec.md#couverture-et-dépendances-entre-périmètres) supplies F06/F07 personal-state removal and destination isolation, F08 age evidence and unattributed contributions with preserved moderation, F09 full delete/recreate/restore qualification, F10/F11 private rights handling, F12 scoped permissions and F14 migration/store-publication evidence. This does not complete those receiving perimeters or authorize technical planning. R02 covers the specified states in the global Figma pass.

### F11 — Advertising, privacy and legal content

[Advertising, privacy and legal content](../../specs/004-advertising-privacy-legal/spec.md) owns FR-001–FR-037 and A01–A27. Requirements define future behavior; source observations and production-evidence limits remain distinct.

| Assigned coverage                                                                                            | Specification requirements | Acceptance scenarios |
| ------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------- |
| V1-17: common sporting-navigation/live-link counter and failure recovery                                     | FR-001–FR-006              | A01–A04              |
| Q05, S10/S13/S14: Pro eligibility, unknown rights, preparation and session isolation                         | FR-007–FR-009              | A05–A08              |
| V1-17: 13+ audience without age collection or personalization, choices and permissions                       | FR-010–FR-014              | A09–A11, A27         |
| V1-21: public legal reading, scoped mobile editing, version/content and information                          | FR-015–FR-020              | A12–A15              |
| Q04, F01/F02/F13: purposes, sporting personal data, restrictions, diagnostics and restoration                | FR-021–FR-027              | A16–A19, A24, A27    |
| V1-15 / F10 agreement: reply email, failed-target/login context, access, GitHub history and partial outcomes | FR-028–FR-034              | A20–A24              |
| Q04, S11/S12: rights requests and information reflecting effective processing                                | FR-035–FR-037              | A25–A27              |

The [F11 dependency table](../../specs/004-advertising-privacy-legal/spec.md#dépendances-entre-périmètres) preserves F05 identity/deletion, F09 entitlement validity, F10 report/suggestion journeys and F13 protection rules. F10 must carry the accepted support agreement into its specification without implying it is already implemented. R02 covers privacy choices, legal reading/editing, support before login and on failed screens, and the rights contact in the single global design review. No technical plan or new per-perimeter Figma pass is authorized.

## V1 capability coverage

The inventory's linked route, embedded-module, source-contract, permission and automatic-work evidence remains part of coverage. Its 130 operations and 18 routes are omission checks, not an instruction to retain transport shapes or proof that every rule has already been identified. Inspect the referenced sources while drafting and extend traceability when discoveries are made.

| Capability | Primary owner or explicit split                                                      | Related rule consumers                                 |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| V1-01      | F05: entry, guest and authentication                                                 | F12 app access; F14 transition                         |
| V1-02      | F05: business profile                                                                | F11 privacy                                            |
| V1-03      | F05: logout/deletion                                                                 | F09 paid restoration; F11 privacy                      |
| V1-04      | F04: discovery/search                                                                | F02 sporting data                                      |
| V1-05      | F03: club consultation                                                               | F02 presentation; F09 club-wide paid lists             |
| V1-06      | F03: team consultation                                                               | F02 identity/associations; F06 following               |
| V1-07      | F03: pool/standings consultation                                                     | F02 ranking meaning; F06 following                     |
| V1-08      | F03: pool map                                                                        | F02 coordinate meaning; F09 eligibility                |
| V1-09      | F03: match/documents/media consultation                                              | F08 contribution; F10 contextual reporting             |
| V1-10      | F03: entity calendars/day rules; F06: personal-feed selection                        | F02 sporting status/history                            |
| V1-11      | F06: following/counters/lists                                                        | F07 recipient selection                                |
| V1-12      | F07: notifications, including API-only business actions                              | F05 sessions; F06 follows; F08 events                  |
| V1-13      | F08: contributed live links                                                          | F05 age evidence; F07 delivery                         |
| V1-14      | F08: reports/moderation                                                              | F12 common access principles                           |
| V1-15      | F10: problem reports                                                                 | F11 privacy; F08/F09 specialized decisions             |
| V1-16      | F09: paid Pro                                                                        | F03 protected content; F11 ads; F14 continuity         |
| V1-17      | F11 FR-001–FR-014, A01–A11: advertising/consent                                      | F09 entitlement state                                  |
| V1-18      | F02: administrative sporting presentation                                            | F03 displays; F12 access                               |
| V1-19      | F02: divisions/source classifications/mappings                                       | F01 discovered observations; F12 access                |
| V1-20      | F12: common app access/configuration; F01: collection enable/disable/status behavior | F13 operational visibility; F14 old clients            |
| V1-21      | F11 FR-015–FR-020, A12–A15: legal content/read/edit capability                       | F12 access                                             |
| V1-22      | F01: competition acquisition; F02: reconciliation and lifecycle decisions            | F13 operational quality                                |
| V1-23      | F01: club/geocoding acquisition; F02: merge/identity/coordinate/lifecycle decisions  | F03 map; F13 operations                                |
| V1-24      | F13: normal operations/derived recovery; F14: migration-only transition              | Domain owners define consequences of replay/correction |

Additional approved capabilities: F09 owns manual Pro grants and verified assisted paid recovery; F10 owns feature suggestions. F05/F09/F14 incorporate the approved identity and continuity changes rather than treating V1 behavior as the complete target.

## Inventory gaps and continuity coverage

### Inventory gaps

| Ref | Decision owner                                                                                   | Required coordination                                                |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| G01 | F02: V2 historical accessibility; F14: reset exception                                           | F03/F04/F06 must respect history/inactivity distinctions.            |
| G02 | F02: official ranking semantics, unknowns and precedence                                         | F03 defines display, not a second ranking authority.                 |
| G03 | F02: source/display fields and durable manual overrides                                          | F03 consumes presentation; F01 must retain relevant source evidence. |
| G04 | F02: authorization for missing-resource consequences                                             | F01 defines complete/partial/failed observations.                    |
| G05 | F02: conflicting/professional source precedence                                                  | F01 characterizes inputs; F13 owns common freshness targets.         |
| G06 | F02: mixed-division classification/mapping                                                       | F01 identifies source packs; no automatic split is preselected.      |
| G07 | F02: sporting identity/collisions/renames                                                        | F01 provides real source identifier evidence.                        |
| G08 | F02: result correction/status/lifecycle                                                          | F03/F06 consumption and F07 repeated/corrected notification effects. |
| G09 | F04: failure, counts and pagination                                                              | F13 quality expectations.                                            |
| G10 | F07: API-only notification capabilities and delivery behavior                                    | No inferred campaign or new screen.                                  |
| G11 | F05: identity/existing associations/deletion                                                     | F09/F11 shared rights/privacy; R02 design.                           |
| G12 | F09: rights/restore/grants; F05: age evidence; F08: publication eligibility                      | F14 preserves migration continuity.                                  |
| G13 | F02: coordinates/refresh/unknown meaning                                                         | F01 geocoding observations; F03 map behavior.                        |
| G14 | R02: global Figma reconciliation                                                                 | All UI-owning specs identify required journeys/states first.         |
| G15 | F13: steady-state production/operational requirements; F14: cutover evidence                     | Provider observations remain distinguished from unperformed tests.   |
| G16 | F02: source-time/season meaning; F03: display/day/calendar rules; F04: selectable search seasons | F06 reuses calendar behavior. Each part has one owner.               |
| G17 | F01: source competition coverage/exclusions                                                      | See F01 coverage: FR-001–FR-003; A01/A16–A18.                        |

### Continuity questions and acceptance scenarios

| Question | Primary owner or explicit split                                                                                     | Consumers / evidence                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Q01      | F05: existing associations, duplicate refusal, session/conflict rules                                               | F09 downstream rights; R02 journeys                              |
| Q02      | F05: age evidence and unavailable-field behavior; F08: publication eligibility outcome                              | Auth0 principal creation time is already the selected age basis. |
| Q03      | F09: verified recovery, evidence, permissions and audit                                                             | F10 generic intake; F11 privacy; F12 common access               |
| Q04      | F11 FR-021–FR-037, A16–A27: shared retention/privacy obligations; F05: deletion/provider/credential/retry lifecycle | F09 paid rights; F13 operational recovery                        |
| Q05      | F09: Pro tolerance/freshness/revocation/billing and access states                                                   | F11 advertising; F13 common quality targets                      |
| Q06      | F09: grant validity and operator workflow                                                                           | F12 common permissions                                           |
| Q07      | F14: reconciliation, mappings, old-client dependencies and transition criteria                                      | F02/F05/F09/F13 supply normal behavior and requirements.         |
| Q08      | R02: global design/specification correction                                                                         | F05/F06/F09 and other UI specs define required behavior first.   |

| Scenario | Lead specification                               | Supporting owners                   |
| -------- | ------------------------------------------------ | ----------------------------------- |
| S01      | F14: subscriber after reset                      | F05/F09                             |
| S02      | F05: existing linked identities                  | F09                                 |
| S03      | F05: refused new link / same-email duplicate     | F09 paid continuity                 |
| S04      | F05: cancelled/failed login or profile bootstrap | F09 if rights are affected          |
| S05      | F05: different emails/private relay              | No new linking                      |
| S06      | F05: populated-account conflict                  | F09 recovery remains separate       |
| S07      | F09: reinstall/device/platform change            | F05                                 |
| S08      | F09: restoration transfer                        | F05/F11                             |
| S09      | F09: other-store/lost-login recovery             | F05/F10                             |
| S10      | F05: logout/switch isolation                     | F09 cached/in-flight customer state |
| S11      | F05: delete/recreate                             | F09 restore; F11 privacy            |
| S12      | F05: partial deletion/stale credentials          | F11/F13                             |
| S13      | F09: billing/expiry/revocation                   | F11 ad eligibility                  |
| S14      | F09: unknown rights/outage tolerance             | F11/F13                             |
| S15      | F09: grant lifecycle                             | F12 common access                   |
| S16      | F08: seven-day publication eligibility           | F05 Auth0 age evidence              |
| S17      | F14: update/old clients/role action              | F05/F12/F13                         |

These references allocate the existing scenarios; they do not replace their full expected outcomes in the continuity assessment. Extend the map with actual `specs/<feature>/spec.md` requirement/scenario references during drafting. Every approved continuity rule in that assessment must also be traced, even if it spans several scenarios.

## Shared responsibilities and semantic evolution

| Concern                                                 | Shared authority                                                                                                 | Domain application                                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Reliability and data correctness                        | F01 observation evidence; F02 sporting decisions                                                                 | F03/F04/F06/F07 consume consistent state.                                                            |
| Performance, load, freshness, availability and recovery | F13 common measurable objectives                                                                                 | Domains own particular thresholds and recovery outcomes; F14 owns cutover-only criteria.             |
| Authentication and authorization                        | F05 identity/session behavior; F12 common administration access; F13 security assurance                          | Each domain defines its permitted actions and resource ownership checks.                             |
| Privacy/security of data                                | F11 purposes/minimization/retention/erasure obligations                                                          | F05 deletion lifecycle; F09 recovery proofs; F10 attachments; F13 diagnostics.                       |
| Accessibility, platform behavior and localization       | F13 common requirements                                                                                          | Each UI spec defines relevant behavior; R02 verifies design evidence.                                |
| Documentation and observability                         | F13 required operator information, diagnostics and documentation outcomes                                        | Domain specs state what decisions/failures must be understandable; GitHub retains delivery evidence. |
| Shared vocabulary                                       | F02 sporting concepts; F05 identity/account; F09 entitlement/grant; F06 following; F07 notification; F10 reports | R01 verifies consistent use and owner-approved semantic-model updates.                               |

The [V1 domain model](../architecture/blockout-domain-model-v1.md) and [V1 architecture](../architecture/mobile-and-identity-architecture-v1.md) must be considered explicitly, not silently copied into a V2 service layout. The planned semantic review includes:

- F02: lifecycle/history and source-versus-display rules, classification, identity and ranking meaning. Do not select technical keys from historical caches.
- F05: linked principal/provider identities and the distinction between migration recreation and voluntary deletion.
- F09: paid entitlement, verified recovery and independent manual-grant concepts not fully modeled in V1.
- F10: approved feature suggestions; F07: retained API-only notification semantics without assuming UI exposure.

Accepted functional decisions may require owner-approved updates to shared semantic documentation while specs are written. Architecture/topology changes wait for the technical phase. No constitution amendment is selected by this map: its specification authority, domain integrity and pre-plan Figma gate remain applicable. A newly discovered conflict must be surfaced and approved, not bypassed by an agent.

## Authoring sequence and completion criteria

Recommended review order is **F01 → F02 → F13 → F11 → F05 → F09 → F03 → F04 → F06 → F08 → F07 → F10 → F12 → F14**. This starts with the data core as requested while retaining existing screen needs as constraints from the outset. Order preference is not permission to claim another issue or a reason to add artificial blockers.

The functional prerequisites are F02 after F01; F03/F04 after F02; F09 after F05; F06 after F03/F05; F08 after F02/F05; F07 after F06/F08; F14 after F02/F05/F09/F13. All children also require accepted framing under #246. GitHub native dependencies are the operational authority.

Use the official installed `speckit-specify` and `speckit-clarify` procedures, their quality reviews and relevant checklists. This document sets acceptance expectations without reproducing or modifying those procedures. Plan mode supports exploration/decisions; Default mode persists approved artifacts. A question limit, a formatted template or a checked quality list does not justify declaring unresolved functional intent complete. Continue the owner's requested exploration until material ambiguity in the perimeter is resolved.

For each specification, establish:

- actors, scope/exclusions, permissions, inputs/outputs in functional terms, rules and state transitions;
- ordinary, alternate, denied, empty/partial, error and recovery scenarios relevant to its behavior;
- measurable success conditions with explicit assumptions and domain/common quality dependencies;
- traceability from assigned evidence, approved changes, gaps and continuity constraints to requirements and scenarios;
- a single owner for every shared rule, referenced consistently by consumers;
- owner decisions for changed V1 behavior and any semantic-model amendment, without repeatedly asking about accepted decisions;
- no material functional choice deferred to implementation. A reference to another owner's rule is not permission to leave a critical cross-scope agreement undefined.

Drafting does not produce technical `plan.md`, `tasks.md`, V2 API schemas, runtime code, architecture choices or implementation issues. Existing Figma supplies journey evidence; identified missing designs go to R02 rather than triggering repeated per-spec design edits. Requirement-quality reviews do not claim that runtime/provider acceptance tests have already passed.

## Global reviews and phase acceptance

| Ref / owning issue                                                   | Prerequisite and deliverable                                                                                                                                                                                                                                 | Boundary                                                                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 / [#271](https://github.com/blockoutproject/blockout/issues/271) | After all 14 drafting issues: inspect/correct whole-corpus coverage, contradictions, shared vocabulary, cross-cutting requirements, dependencies and unresolved decisions. Review the inventory evidence appendices as well as the headline capability rows. | Specification-only review; use official quality reviews/checklists where relevant. Do not use `speckit-analyze` before plans/tasks exist.                                 |
| R02 / [#272](https://github.com/blockoutproject/blockout/issues/272) | After R01: one planned global Figma/specification comparison, completion/correction and verification covering all affected journeys/states. Include missing Pro/followed/identity/recovery/deletion and other approved journeys.                             | Preserve the established design. Owner-approved functional corrections also update their specs and affected consistency checks within this same issue. No implementation. |

R01 and R02 are executable children of #247, both blocked by #246; the epic itself is an acceptance boundary, not an executable assignment. R01 depends on every F01–F14 issue; R02 depends on R01. This schedules one global Figma pass after all specifications, while later material changes still require targeted revalidation of affected evidence under the constitution.

The owner accepts #247 only after every specification, R01 correction and R02 design correction is complete, material functional gaps are resolved and all accepted V1/V2 constraints have traceable requirements and scenarios. #248 remains blocked until that acceptance. Neither completion of this map nor merging its documentation closes #246/#247 automatically or authorizes technical planning.
