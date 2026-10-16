# Implementation Plan: Sporting identity, integration and lifecycle

**Branch**: `tech/43-f02-technical-plan` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: F02 specification and owner-approved preparatory plan for [#43](https://github.com/blockoutproject/blockout/issues/43).

**Status**: Accepted technical decisions and scoped design; runtime qualification remains pending.

## Summary

Keep one authoritative sporting model in the modular backend. The separate collector submits contextual observations; the backend accepts matches independently, preserves useful partial success and reconciles absence only after a complete successful current calendar. Professional teams use LNV identities without requiring a club. Standard PostgreSQL transactions, JPA locks, unique constraints and scoped revisions protect corrections and ordering without a recovery platform.

## Technical Context

**Language/Version**: Java/Spring Boot backend and TypeScript/Expo mobile; versions follow the [F13 technical context](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Spring Data JPA/Hibernate managed by Boot and MapStruct for mechanical mappings; dialect and generators follow the [F13 contract toolchain](../003-shared-quality/plan.md#http-generation-errors-and-compatibility).

**Storage**: F13 PostgreSQL for relational facts, image bytes and associations. F13 evolving Liquibase baseline until first preproduction/production version.

**Testing**: JUnit, Spring MVC, Testcontainers PostgreSQL and generated Java/TypeScript contract checks; existing prototype browser checks and future native mobile qualification.

**Target Platform**: Existing Linux backend/collector and native iOS/Android app.

**Project Type**: Domain capability inside the backend, collector-facing HTTP integration and existing mobile administration/consultation consumers.

**Performance Goals**: None added. Preserve F01 domain cadences and locality-attempt deadlines; no load, capacity or monthly availability programme.

**Constraints**: Backend is the only business writer; no supplier call inside a SQL transaction; no raw-document archive, durable ingestion queue, automatic pipeline replay or speculative abstraction.

**Scale/Scope**: Covered FFVB competitions and three professional LNV championships; current season and initial three completed seasons under F14. Ingestion JSON transport bound: 8 MiB, with an additional 1,000-entry calendar limit and explicit refusal instead of truncation.

## Constitution Check

| Principle         | Assessment                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | Owner decisions amend F02 first; consumer corrections remain in their owning specifications. No runtime implementation.                                                                                                                                          |
| II — Ownership    | F01 acquires; F02 accepts sporting truth; F03/F04/F06/F07/F08/F11/F12/F14 keep their concepts. No feature-per-service mapping.                                                                                                                                   |
| III — Design      | Existing accepted journeys remain inputs. The owner explicitly approved prototype `236e6a2`, then the corresponding Figma reconciliation on 2026-10-13. Both scoped design gates are satisfied; native accessibility and production behavior remain unqualified. |
| IV — Contracts    | F13 canonical HTTP roots own authored schemas; native contracts reference them without editable duplicates. Integrated generation/serialization remains future qualification.                                                                                    |
| V — Simplicity    | Per-match transactions, existing row locks and next ordinary collection replace whole-calendar atomicity, recovery journals and retries. No additional scheduler for logos.                                                                                      |
| Prerequisites     | Native blocker #42 is closed. Scoped design approvals are recorded below; runtime qualifications remain prerequisites for implementation adoption.                                                                                                               |

No constitutional exception is required. The [research](research.md) states the evidence limits and required runtime qualifications.

## Project Structure

Native artifacts: `plan.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md`.

The authored `contracts/http/ingestion/openapi.yaml` and `contracts/http/mobile/openapi.yaml` reference shared Problem Details and F02-owned classification enums under `contracts/http/common/`. These are canonical planning sources, not executable application scaffolding or generated output. The native [contract overview](contracts/README.md) identifies operations, owners and consumer coordination.

Future executable structure follows F13: `apps/backend` contains a `sporting` capability with `api`, `application`, useful `domain` values and `infrastructure`; `apps/collector` owns supplier adapters and generated-client integration; `apps/mobile` retains existing feature boundaries. Persistence ports express use cases rather than mirroring repositories. Generated code stays under ignored build output.

## Identity and retained data

[Data model](data-model.md) defines stable Blockout UUIDs, contextual provider references, team participation, classification and presentation. PostgreSQL constraints prevent duplicate references and broken relationships; application use cases decide authorization and valid continuity. Names, dates and participant pairs never become substitute match identities.

The [owning identity rules](data-model.md#corrections-and-provider-references) distinguish FFVB club-based identities from contextual LNV identities. A professional club association is a controlled manual database edit, without an association API or dedicated workflow.

Derive visibility from the [current independent reasons and relationships](data-model.md#current-facts-ordering-and-visibility), rather than storing a universal copied flag. Season closure and privacy remain owner constraints on retained data.

## Acceptance and concurrency

The [ingestion contract](contracts/README.md#ingestion) carries a qualified cycle context and normalized observations. A globally invalid context fails before writes. Identical source-reference repetitions collapse; contradictory duplicates isolate that match. Recognized byes/qualifiers remain distinct from failures and cannot create fictitious teams. A source-parsing failure is an explicit local outcome, never a silently omitted row presented as complete.

A nontransactional application loop calls a separately proxied transactional match use case. Each successful match commits independently. The final absence transaction runs only for complete, current, correctly contextualized and fully successful calendar processing. A single failed, unassociated or stale match blocks that finalization. A qualified current empty calendar may hide all its matches/participations; historical empty input cannot.

Use a monotonically increasing backend cycle order plus a collector read ordinal allocated before each supplier request. The cycle order dominates; it is a conservative logical ordering, not a supplier publication timestamp or a measurement of parallel request completion. F01 owns cycle registration, starting configuration and reconstruction mode. Per-match accepted order prevents old whole observations from applying, including late fields previously missing. No per-field salvage or observation history. Preserve actual observation times separately for freshness.

The pool's current calendar order advances when a globally qualified calendar is admitted. Check it before each match transaction and before finalization; a superseded request cannot create late identities, restore participation or reconcile absence. Keep the last completed order to recognize already finalized repeats without undoing newer work. Details only enrich already known matches and never restore calendar presence. Standing, club, logo and catalog observations use the same order discipline at their own replacement scope. Catalog presence and qualified absence commit in one transaction for the source-season binding; validate the full submitted scope and duplicate identities before changing it. An unusable catalog preserves its prior references. This does not make calendar match processing atomic.

Serialize short sporting identity/participation/classification writes with `PESSIMISTIC_WRITE` on the existing season row, released after each match. Match writes and F08 publication share the match lock; club changes use the club row. For collection writes, first take the F01 shared runtime fence, then season and current control/cycle as needed, before the remaining sporting roots (division when required, match, club; sorted IDs within a kind). Keep the runtime lock through each domain commit; a startup replacement waits for those writes before invalidating the old incarnation. Manual sporting commands need no collector-runtime lock and retain the season-first order. Operations acquiring a later kind do not then acquire an earlier one. When the same transaction needs account locks for current grants, erasure coordination or personal inbox insertion, acquire them after sporting root locks and in sorted account UUID order; no sporting root lock follows an account lock. Manual permission changes lock the account before changing grants, under [F12](../013-administration-app-configuration/data-model.md#permissions-and-locking). Division state checks for new classifications are protected in the command transaction. Clubs shared across seasons retain unique provider-reference constraints; a concurrent creation conflict rolls back that item and is reported for a later collection, without speculative SQL upsert or distributed locking.

Current manual classification changes cannot be overwritten by the cycle's starting snapshot. Reject incompatible stale classification proposals; removing acquisition settings retains accepted published classification. Division deactivation and source withdrawal remain independent visibility restrictions even when already-running work records otherwise valid facts.

## Results and dependent transitions

[F02 FR-024](spec.md) and [research](research.md#score-sets-and-notifications) define collection-order precedence and its supplier-publication limit.

The [data model](data-model.md#results-and-temporal-precision) defines result/set compatibility, independent freshness and unresolved dates. Apply these rules before accepting a match transition. Its [current provenance and standings state](data-model.md#retained-relational-concepts) also preserve supplied publication timestamps and qualified non-publication through the existing ingestion operations; F01 supplies those observations and F03 consumes the accepted distinction, without changing logical ordering or recalculating standings.

Qualified match documents use the same per-match acceptance/order rules. The [F03 plan](../007-sporting-consultation/plan.md#maps-and-documents) introduces only the document-reference exception to professional acquisition and the public read boundary; no PDF bytes, competing sporting authority or additional collection process are retained.

The score, F07 required internal inbox creation and minimal processed-announcement facts share one database transaction. [F07](../011-notifications-delivery/plan.md#announcement-processing) derives existing entry presentation from current sporting facts; a correction does not require copying scores or text into each entry. F07 failure rolls back that match; it cannot roll back other matches. Under the same match lock, F07 reads the current F08 public link to fix result/replay composition. [F08 contribution mutations](../010-live-contributions-moderation/plan.md#backend-behavior-and-ownership) use this same root/account ordering; their report hold and version changes never alter the sporting result. F08 reactivation creates a new version but renews no F07 announcement allowance. Initial imports suppress announcements, and corrections do not recreate consumed or purged announcements. Push happens after commit with ordinary best-effort delivery; no durable outbox or retry queue.

## Presentation, administration and locality

Acquire LNV images once per distinct team during ordinary calendar passages; image failure is independent from match acceptance. Store validated PNG/JPEG bytes (at most 5 MiB) and associations atomically in PostgreSQL. The [data model](data-model.md#presentation-and-privacy) owns effective logo precedence; binary submissions stay separate from calendar JSON. The backend does not fetch arbitrary image URLs.

Manual names, logos and contact modes remain independent from source values. Enforce the [field restrictions and revision rules](data-model.md#presentation-and-privacy) owned here for F11 confidentiality, using existing club transactions. Administration submits desired resource state with its current revision. Increment the editing revision for relevant accepted state changes, not merely a collection timestamp refresh. Repeated requests cannot silently overwrite newer edits. After an uncertain response, read current state before explicit retry; matching state establishes the current outcome, not proof that a specific historical request executed.

Club, team and division editors reuse F13's shared image selection/preview/replacement/removal control, retaining the effective-logo restoration rules and their own image limits. They use one atomic multipart `PATCH` request for JSON metadata and an optional image; validate all parts before committing names/colors and logo changes together. Pool editing changes names only through JSON. Division activity remains a separate command. [Canonical contracts](contracts/README.md#mobile-administration) define each resource’s supported fields and actions.

Classification corrections validate all affected participations and target uniqueness under the season lock, then apply all or none. Division presentation never toggles activity. Permissions are checked per action/scope through F12; collector credentials cannot invoke mobile administration.

F01 owns geocoding and its cadence/relaunch policy. F02 validates results against the [current effective locality revision](data-model.md#presentation-and-privacy); no new geocoder or retry mechanism is introduced.

Sporting editors consume the [F13 UI foundation](../003-shared-quality/plan.md#native-ui-and-approved-design) before composing their domain forms. F02 supplies effective primary/gradient inputs and the approved context-color derivation; Figma's representative division modes are fixtures, not a stored palette per division. Shared controls receive those presentation values without importing sporting state; F03 retains the sporting display patterns/screens.

## Consumer and design reconciliation

F01 accepts the order/context/result interface and optional professional club identity. F03 omits unavailable club navigation and map points while preserving useful sections; F04 searches only available fields. Its [projection lifecycle](../008-search-discovery/plan.md#projection-lifecycle) consumes an F02 application API for current public inputs, identity hydration, viewability and dependent-resource reads, without importing JPA entities. Relevant commits submit affected identities/scopes after commit; name/alias/city/classification/relationship/visibility changes include dependent teams and pools, while score-only changes do not. Alias and division-term ownership remains in the [F02 data model](data-model.md#corrections-and-provider-references). F06 preserves existing follow identities. F07/F08 coordinate accepted transitions in-process; F11 restrictions remain authoritative; F12 retains existing editors and permission assignment; F14 preserves club/logo bytes and unresolved associations without guessed joins.

The approved [prototype 236e6a2](https://github.com/blockoutproject/product-prototype/commit/236e6a274567b9a96e3db7a8c9ab74690974fee0) uses existing cards, maps and editor. Professional reset copy is “Rétablir le logo automatique”; existing nonprofessional copy remains. Product Design reuses linked components and published context colors. Accepted references are the professional team [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1015-13477) and [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1019-3987) screens, [partial map](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=4525-32633), logo editor [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1852-22214) and [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1852-22388), and [320-point, 200% text action](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=4847-42504). The owner explicitly approved this reconciliation in the planning conversation on 2026-10-13, after the prototype approval. Visual inspection and these scoped approvals are not native accessibility qualification.

## Verification

[Quickstart](quickstart.md) identifies the future contract/database/native scenarios; [research](research.md) distinguishes observed supplier structures and supported library features from unexecuted integration proof. Check specification coverage, actual canonical contract ownership, links/anchors, formatting and README documentation CI on the final tree.
