# V2 technical planning boundaries

The [architecture](architecture-v2.md), [domain model](blockout-domain-model-v2.md)
and [transition design](v1-v2-transition-architecture.md) constrain the bounded
feature plans under [#248](https://github.com/blockoutproject/blockout-legacy/issues/248).
This is a dependency and interface map, not a task-status ledger, generated
tasks.md, execution authorization or replacement for official Spec Kit procedures.

## Sources and design authority

Accepted specifications remain the functional authority. Use the specification
directories below rather than inferring F-numbers from directory prefixes.
The final [#298 acceptance](https://github.com/blockoutproject/blockout-legacy/issues/298#issuecomment-5969051828)
under [#272](https://github.com/blockoutproject/blockout-legacy/issues/272) identifies the
accepted design/prototype handoff. The accepted prototype behavior revision is
`25875456e021424df3d682dbd414caf8ecdcdfdf`; the specification snapshot identified by
that handoff is `7880bfd7d7f6bf223805cef56428ab8a63768c2f`. This pins evidence, not
permission to read a separate repository or adopt prototype implementation choices.

- [Blockout UI Library](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library)
  owns foundations and components.
- [Blockout Product Design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design)
  owns patterns/screens: Access `723:2`, System `723:3`, Home `888:8`, Discovery
  `916:2825`, Sport `976:283`, Account `1087:6`, Administration `1170:3654`.
- The final accepted corrections include notification local cleanup on open/resume
  from 29 elapsed days and active exclusion by day 30, stale response/count
  protection, minimal consumed facts, 44-point search targets, provider-owned UMP
  interaction and the approved privacy icon, and a single-line retry label.
- Browser/prototype checks establish the reviewed interaction behavior only. Native
  SDKs, purchases, provider settings, backend purge, production load and restoration
  remain qualification obligations. Earlier full-browser assertion failures are
  not transformed into a claim of a completely rerun suite by later targeted checks.

Feature plans must link their exact approved journeys/states and reconcile any
later specification amendments. Product changes return to the owning specification
and design authority. Do not silently alter accepted behavior in a technical plan.

## Planning dependencies and owned outputs

Start with F13's shared runtime/contract envelope, F02's sports identities and F05's
account identities. This establishes interfaces consumed elsewhere, not an
instruction to implement infrastructure before testing product flows. F14 begins
its protected-state inventory design early and converges after the owners of the
imported obligations. F13 qualification converges again once the whole graph exists.

| Scope and source                                                               | Inputs that must be stable                                            | Bounded technical outputs                                                                                                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F13 quality](../../specs/003-shared-quality/spec.md)                          | Architecture and all accepted quality targets                         | Nx/build boundaries, version/contract envelope, error/idempotency semantics, outbox/inbox, durability fence, deployment, monitoring, retention, backup/restore and load protocol. |
| [F02 sport](../../specs/002-sporting-data/spec.md)                             | Shared envelope and domain model                                      | Identity/source correspondence, effective-field/visibility model, local transactions, Liquibase schema, import commands and consultation/index projection interfaces.             |
| [F05 identity](../../specs/005-accounts-identity/spec.md)                      | Shared envelope and continuity constraints                            | Auth0 resolution, account/email ownership, sessions, permissions interfaces, installation lifecycle, generation-scoped erasure and supplier recovery.                             |
| [F01 acquisition](../../specs/001-source-acquisition/spec.md)                  | F02 observation/import boundary and F13 work protocol                 | Provider adapters, catalog/target selection, configuration snapshots, scheduling, rate admission, completeness, per-target results and diagnostics.                               |
| [F12 administration](../../specs/013-administration-app-configuration/spec.md) | F05 permission and F13 runtime contracts                              | Distinct administrative capabilities, optimistic config changes, server maintenance, startup-only mobile gate check, minimum-version controls and owner recovery outside mobile.  |
| [F03 consultation](../../specs/007-sporting-consultation/spec.md)              | F02 identities/read projections; F12 access envelope                  | Screen-composed contracts, complete-day cursors, time semantics, rankings, maps, official documents, deep links and mobile query lifecycle.                                       |
| [F04 search](../../specs/008-search-discovery/spec.md)                         | F02 effective fields/restrictions; F03 navigation contracts           | Analyzer/ranking corpus, strict query/filter construction, PIT/cursor lifecycle, stale-revision handling, rebuild/catch-up and discovery mobile state.                            |
| [F06 following](../../specs/009-following-personal-feed/spec.md)               | F02/F05 identity and F03 calendar contracts                           | Versioned follow intent, deduplicated personal feed, shared personal season selection and transactionally captured notification eligibility.                                      |
| [F08 contributions](../../specs/010-live-contributions-moderation/spec.md)     | F02 finality/visibility, F05 age, F12 permissions                     | Link/period identity, quotas, current-state locking, moderation transactions, URL validation and notifications trigger interfaces.                                                |
| [F09 Pro](../../specs/006-pro-subscriptions/spec.md)                           | F05 account lifecycle and historical correspondences                  | SDK identity coordination, verified supplier projection, purchase/restore states, limited-transfer qualification, maintenance bounds and provider-owned UI.                       |
| [F07 notifications](../../specs/011-notifications-delivery/spec.md)            | F02/F06/F08 triggers, F05 installations, F12 maintenance              | Audience capture, account/match serialization, composition/allowances, inbox/read counts, attempt/receipt ledger, deadlines and active/local/restore purge.                       |
| [F10 assistance](../../specs/012-reports-feature-suggestions/spec.md)          | F05 isolation, F12 availability exceptions and F13 operation protocol | Complete submission/image manifest, private storage/access, GitHub uncertainty reconciliation, pending-result recovery and independent secondary alert.                           |
| [F11 privacy/ads/legal](../../specs/004-advertising-privacy-legal/spec.md)     | F05/F09 states, F10 privacy boundaries and F12 permissions            | UMP/ad coordinator, exactly-once navigation ownership, current legal publication, supplier configuration and purpose-specific erasure/retention obligations.                      |
| [F14 transition](../../specs/014-v1-v2-transition/spec.md)                     | F02/F05/F09 protected identities; F07/F11/F13 restore obligations     | Club/media manifests, mappings/imports, provider continuity matrix, installed-client upgrade, final reconciliation, retirement and V2 recovery procedure.                         |

F13 establishes common mechanics but does not own every business failure rule.
F11 establishes privacy constraints early; its detailed mobile plan can consume
F09 without delaying those constraints. F12 exposes permissions/access interfaces
before administrative screens are independently planned. These interface-first
dependencies avoid circular feature planning without introducing shared ownership.

Use the applicable installed official speckit-plan, speckit-checklist,
speckit-tasks and speckit-analyze procedures for actual feature artifacts. Each
plan carries its research decisions, derived model/contracts and verification
guidance. Cross-plan contradictions must be resolved before deriving bounded
implementation issues with the official tasks-to-issues capability. A referenced
task identifier includes its feature directory, since T001 is not globally unique.

## Intended final code boundaries

These are target locations in the dedicated V2 repository, not existing projects or
a request to copy V1 implementations. The legacy monorepo is not deployed; running
V1 instances originate from independent repositories. Their continuity remains a
transition requirement, separate from this repository foundation.

| Target area                  | Intended location and responsibility                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Java deployable entry points | `apps/api`, `apps/business-worker`, `apps/integration-worker`, `apps/scheduler`; thin composition of owned modules.                                                                                    |
| Java module libraries        | `libs/backend/<owner>`; explicit application API, domain, persistence and provider adapters where populated.                                                                                           |
| Python collection            | `apps/acquisition`; provider packages and shared runtime only where semantics are identical. Family selection is configuration, not four mandatory codebases.                                          |
| Transition executable        | `apps/migration`; legacy readers, manifests, transformation and operator composition. Imports use the Sport owner, not direct arbitrary SQL.                                                           |
| Mobile application/features  | `apps/mobile`, `libs/mobile/<feature>` and narrow shared native/UI libraries. Route tree stays within the application; state belongs to its feature.                                                   |
| Contracts                    | New V2 source-first contracts at `libs/contracts/specs/source`; wire schemas are derived from approved V2 plans. Generated outputs stay out of Git. Historical V1 contracts remain evidence in legacy. |
| Database migrations          | `infra/database`; one Liquibase root with ordered owner-specific changelogs and dedicated migration image/job.                                                                                         |
| Deployment/protection        | `infra`; Dokploy definitions, per-environment configuration templates and restore/recovery procedures, without secrets or production snapshots.                                                        |

Nx owns dependency edges and affected task selection. Maven owns Java compilation,
uv owns Python environments and Expo tooling owns mobile/native builds. Contract
changes deliberately broaden verification to all affected consumers; an inferred
Nx graph alone is insufficient evidence of complete cross-language validation.

## Required cross-plan interface decisions

| Boundary                                 | Decisions to derive without changing the architecture                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection to Sport                      | Versioned normalized observation schema; target/generation/config context; per-item outcome and whole-calendar completion evidence; stale and duplicate handling. |
| Sport to readers/search                  | Effective projection fields, revision/watermark, current restriction check, cursor expiration and atomic generation cutover protocol.                             |
| Following/contributions to Notifications | Exact audience-capture linearization point and lock order; relationship continuity; composition under reversed delivery order; allowance uniqueness.              |
| Identity to suppliers                    | Principal/customer correspondence; account generation and fences; provider mutation state; limits on recreation and restore.                                      |
| Support to GitHub/media                  | Immutable operation/manifest identity; private operator authorization; final-complete proof; uncertain-create reconciliation without duplicate dossiers.          |
| Migration to Sport                       | Qualified identity/media import, optimistic target revision, stable source revision and no-op/rejection behavior for replay/stale runs.                           |
| Commit to external effect                | Outbox durability and acknowledgement boundary; remote WAL flush evidence before protected effects; bounded wait and uncertain commit recovery.                   |

These are detailed protocol tasks within selected boundaries, not deferred choices
between technologies/topologies. If qualification disproves a structural choice,
record the evidence and revise the architecture explicitly before implementation
depends on a different solution.

## Qualification gates and conditioned decisions

| Gate                    | Experiment and pass condition                                                                                                                                                                                                          | Failure arbitration                                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Complete load           | F13 one-hour workload, 1,000 active users, about 100 actions/s; current plus three historical seasons; cold/warm/new data; collectors/projections active; per-family complete correct response accounting with >=95% under two seconds | Profile queries, response fan-out, locks, concurrency and resource sizing; repeat affected protocol. No launch capacity claim until passed.                                          |
| Collection              | FFVB CSV/discovery and LNV fixtures; complete/partial/empty/malformed/contradictory context; rate limiting; stop/resume/overrun; fencing and late results; success separated from integration                                          | Fix provider/coordination behavior and tune measured admission. Do not meet cadence by ignoring supplier limits or redefining absence.                                               |
| Search                  | Accepted relevance corpus; multi-term cross-field matches, direct-before-typo, prefixes/aliases, strict filters, more than 10,000 results, changes during pagination, hidden/stale fields, rebuild while updating                      | Correct analyzers/query/projection protocol. Reopen engine decision only if required semantics cannot be met, not merely because a default setting fails.                            |
| Transactions/work       | Concurrent quota/moderation/classification/follow cases; process death and network loss before/after commit, publish, confirm, ack and supplier response; broker loss                                                                  | Repair protocol until no duplicated business effect or stale overwrite; quarantine uncertainty rather than claim exactly-once transport.                                             |
| Native baseline         | Signed iOS/Android builds, actual Auth0, purchases/restore, UMP, push, Mapbox bridge, files, deep links, lifecycle and accessibility                                                                                                   | Fix adapter/version compatibility; Expo 56 with the same OS minimum is the specified fallback if 57 is blocked. Further structural change requires explicit architecture revision.   |
| Identity/Pro continuity | Every retained historical/anonymous/linked category, full subscriber reconciliation, Apple and Google including erasure/restoration and independent rights/gifts                                                                       | Preserve evidence and block affected destructive steps/transfer path. A normal test purchase is insufficient.                                                                        |
| Club migration          | Complete inventory, file bytes/checksums, certain versus ambiguous mapping, duplicates, changed/deleted associations, replay after partial failure and stale run after V2 edit                                                         | Fix preservation/import; missing bytes block destruction. Keep certain preserved-but-unmatched associations for resolution.                                                          |
| Durability/restore      | Receiver disconnect, local commit visible before remote flush, disk/slot pressure, total primary loss, old backup plus newer erasure/allowance facts, file recovery and derivative rebuild                                             | No silent durability downgrade. Fix bounded waits and effect fence; suspend affected access when obligations cannot be established. Measure recovery duration, do not invent an RTO. |
| Delivery/access         | Interrupted Liquibase/deployment, mixed compatible workers, actual two-store availability, server-side V1 retirement, maintenance/minimum version and owner recovery                                                                   | Correct compatibility/operating procedure before cutover; an image rollback is not data rollback.                                                                                    |

The experiments are future evidence obligations, not completed tests. Exact
patch locks, schemas, retention values and reproducible fixture/load definitions
belong in the owning approved feature plans; no runtime component may ship with
an undefined operational policy merely because this architecture names its owner.

## Constitution check

| Principle                                   | Architecture consequence                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Specification-led intent                    | Every owner/qualification row links accepted scope; no service layout is inferred from V1. Product changes return to specifications. |
| Domain integrity                            | One runtime owner per resource; shared V2 model constrains identities, lifecycle and cross-domain invariants.                        |
| Design-ready UI                             | Accepted Figma/prototype evidence is identified with native/provider limits; feature plans bind exact affected journeys.             |
| Source-first contracts                      | V2 source schemas precede generated consumers; generated projections remain ignored and reproducible.                                |
| Verifiable simplicity                       | Alternatives, failure consequences and experiments are explicit; no assumed throughput, provider compatibility or automatic HA.      |
| Official procedures / operational ownership | This map does not replace Spec Kit procedures or track assignments/completion. Issues/PRs retain execution and acceptance evidence.  |

No constitutional exception is selected. Runtime feature implementation follows
approved detailed plans/tasks and the phase gate; recording this architecture is
not equivalent to deploying the rebuild or qualifying production continuity.
