# Implementation Plan: Sporting identity, integration and lifecycle

**Branch**: `tech/43-f02-technical-plan` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: F02 specification and owner-approved preparatory plan for [#43](https://github.com/blockoutproject/blockout/issues/43).

**Status**: Technical decisions, prototype revision `236e6a2` and scoped Figma reconciliation accepted. Native planning dossier prepared for common review; this delivery does not authorize product implementation.

## Summary

Keep one authoritative sporting model in the modular backend. The separate collector submits contextual observations; the backend accepts matches independently, preserves useful partial success and reconciles absence only after a complete successful current calendar. Professional teams use LNV identities without requiring a club. Standard PostgreSQL transactions, JPA locks, unique constraints and scoped revisions protect corrections and ordering without a recovery platform.

## Technical Context

**Language/Version**: Java 25 LTS, Spring Boot 4.1.1; TypeScript and Expo mobile baseline from [F13](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Spring Data JPA/Hibernate managed by Boot, MapStruct for mechanical mappings; OpenAPI 3.0.4, Redocly CLI 2.62.1, OpenAPI Generator 7.26.0 and Orval 8.41.0. No dependency installation or upgrade in this delivery.

**Storage**: PostgreSQL 18.6 for relational facts, image bytes and associations. F13 evolving Liquibase baseline until first preproduction/production version; no schema or reset is executed here.

**Testing**: JUnit, Spring MVC, Testcontainers PostgreSQL and generated Java/TypeScript contract checks; existing prototype browser checks and future native mobile qualification.

**Target Platform**: Existing Linux backend/collector and native iOS/Android app. No new deployment.

**Project Type**: Domain capability inside the backend, collector-facing HTTP integration and existing mobile administration/consultation consumers.

**Performance Goals**: None added. Preserve F01 domain cadences and locality-attempt deadlines; no load, capacity or monthly availability programme.

**Constraints**: Backend is the only business writer; no supplier call inside a SQL transaction; no raw-document archive, durable ingestion queue, automatic pipeline replay or speculative abstraction.

**Scale/Scope**: Covered FFVB competitions and three professional LNV championships; current season and initial three completed seasons under F14. Calendar transport bound: 1,000 entries and 8 MiB excluding images, with explicit refusal instead of truncation.

## Constitution Check

| Principle         | Assessment                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | Owner decisions amend F02 first; consumer corrections remain in their owning specifications. No runtime implementation.                                                                                                                                          |
| II — Ownership    | F01 acquires; F02 accepts sporting truth; F03/F04/F06/F07/F08/F11/F12/F14 keep their concepts. No feature-per-service mapping.                                                                                                                                   |
| III — Design      | Existing accepted journeys remain inputs. The owner explicitly approved prototype `236e6a2`, then the corresponding Figma reconciliation on 2026-10-13. Both scoped design gates are satisfied; native accessibility and production behavior remain unqualified. |
| IV — Contracts    | F13 canonical HTTP roots own authored schemas; native contracts reference them without editable duplicates. Integrated generation/serialization remains future qualification.                                                                                    |
| V — Simplicity    | Per-match transactions, existing row locks and next ordinary collection replace whole-calendar atomicity, recovery journals and retries. No additional scheduler for logos.                                                                                      |
| Prerequisites     | Native blocker #42 is closed. No remaining product arbitration identified; design review and concrete checks remain execution gates.                                                                                                                             |

The installed official setup script resolved this existing feature directory and supplied the template. No before/after-plan extension hooks are registered. Post-design review finds no constitutional exception: both design gates are satisfied, actual schemas use the canonical roots, and remaining runtime qualifications are stated rather than claimed.

## Project Structure

Native artifacts remain in this feature directory: `plan.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md`. No tasks or parallel delivery log.

The authored `contracts/http/ingestion/openapi.yaml` and `contracts/http/mobile/openapi.yaml` reference shared Problem Details and F02-owned classification enums under `contracts/http/common/`. These are canonical planning sources, not executable application scaffolding or generated output. The native [contract overview](contracts/README.md) identifies operations, owners and consumer coordination.

Future executable structure follows F13: `apps/backend` contains an occupied `sporting` capability with `api`, `application`, useful `domain` values and `infrastructure`; `apps/collector` owns supplier adapters and generated-client integration; `apps/mobile` retains existing feature boundaries. Persistence ports express use cases rather than mirroring repositories. Generated code stays under ignored build output. This delivery creates no application scaffolding.

## Identity and retained data

[Data model](data-model.md) defines stable Blockout UUIDs, contextual provider references, team participation, classification and presentation. PostgreSQL constraints prevent duplicate references and broken relationships; application use cases decide authorization and valid continuity. Names, dates and participant pairs never become substitute match identities.

FFVB teams require clubs. Professional teams use season/championship/TeamID and may lack a club. A controlled manual database association to an existing club preserves identities and follows, is never overwritten by ingestion and does not propagate between seasons. No matching engine, association endpoint or new screen.

Visibility is derived from current independent reasons and relationships, not a copied universal flag. A closed season preserves history; already-running F01 work may finish once, but no new cycle starts. Initial historical empty input preserves data. Data retention does not bypass F11 restrictions.

## Acceptance and concurrency

The [ingestion contract](contracts/README.md#ingestion) carries a qualified cycle context and normalized observations. A globally invalid context fails before writes. Identical source-reference repetitions collapse; contradictory duplicates isolate that match. Recognized byes/qualifiers remain distinct from failures and cannot create fictitious teams. A source-parsing failure is an explicit local outcome, never a silently omitted row presented as complete.

A nontransactional application loop calls a separately proxied transactional match use case. Each successful match commits independently. The final absence transaction runs only for complete, current, correctly contextualized and fully successful calendar processing. A single failed, unassociated or stale match blocks that finalization. A qualified current empty calendar may hide all its matches/participations; historical empty input cannot.

Use a monotonically increasing backend cycle order plus a collector read ordinal allocated before each supplier request. The cycle order dominates; it is a conservative logical ordering, not a supplier publication timestamp or a measurement of parallel request completion. F01 owns cycle registration, starting configuration and reconstruction mode. Per-match accepted order prevents old whole observations from applying, including late fields previously missing. No per-field salvage or observation history. Preserve actual observation times separately for freshness.

The pool's current calendar order advances when a globally qualified calendar is admitted. Check it before each match transaction and before finalization; a superseded request cannot create late identities, restore participation or reconcile absence. Keep the last completed order to recognize already finalized repeats without undoing newer work. Details only enrich already known matches and never restore calendar presence. Standing, club, logo and catalog observations use the same order discipline at their own replacement scope.

Serialize short sporting identity/participation/classification writes with `PESSIMISTIC_WRITE` on the existing season row, released after each match. Match writes and F08 publication share the match lock; club changes use the club row. Use one lock order (season, division when required, match, club; sorted IDs within a kind). Operations acquiring a later kind do not then acquire an earlier one. Division state checks for new classifications are protected in the command transaction. Clubs shared across seasons retain unique provider-reference constraints; a concurrent creation conflict rolls back that item and is reported for a later collection, without speculative SQL upsert or distributed locking.

Current manual classification changes cannot be overwritten by the cycle's starting snapshot. Reject incompatible stale classification proposals; removing acquisition settings retains accepted published classification. Division deactivation and source withdrawal remain independent visibility restrictions even when already-running work records otherwise valid facts.

## Results and dependent transitions

LNV calendar and detail pages have no page-specific priority: the latest valid observation in logical collection order supplies accepted facts. The provider may serve an older sporting publication later; this accepted limit is not concealed by a fabricated timestamp.

Absent or invalid new sets preserve only compatible earlier accepted sets with their previous freshness. Changed aggregate scores invalidate incompatible detail; explicit result withdrawal clears result and sets. Unknown values, provisional results, recognized special notation and final published results stay distinct. Dates retain local source meaning; unresolved timezone ambiguity and unconfirmed FFVB midnight do not produce an instant.

The score, F07 required internal inbox updates and minimal processed-announcement facts share one database transaction. F07 failure rolls back that match; it cannot roll back other matches. Under the same match lock, F07 reads the current F08 public link to fix result/replay composition. Initial imports suppress announcements, and corrections do not recreate consumed or purged announcements. Push happens after commit with ordinary best-effort delivery; no durable outbox or retry queue.

## Presentation, administration and locality

Professional artwork resolves team customization → accepted LNV image → optional club logo → ordinary missing artwork. Nonprofessional inheritance remains team customization → club. Collector logo reads join existing calendar passages, once per distinct team per passage; image failure neither erases valid bytes nor blocks matches. Backend validates decodability, actual PNG/JPEG format and 5 MiB. Store bytes and association atomically; identical bytes need no replacement. Do not fetch arbitrary URLs from the backend or put binary images into calendar JSON.

Manual names, logos and contact modes remain independent from source values. Administration submits desired resource state with its current revision. Increment the editing revision for relevant accepted state changes, not merely a collection timestamp refresh. Repeated requests cannot silently overwrite newer edits. After an uncertain response, read current state before explicit retry; matching state establishes the current outcome, not proof that a specific historical request executed.

One presentation-editor save is one ordinary multipart request containing JSON metadata and an optional image. Validate all parts before a single transaction commits names/colors and the selected logo action together. This retains the accepted save behavior without staging uploads, persistent drafts or independent partial saves. Division activity remains a separate explicit command.

Classification corrections validate all affected participations and target uniqueness under the season lock, then apply all or none. Division presentation never toggles activity. Permissions are checked per action/scope through F12; collector credentials cannot invoke mobile administration.

Effective municipality/postal context controls geocoding. Its change invalidates the old point and advances a context revision; street-only or masked source changes do not. Publish a result only against the current revision and unambiguous locality. F01 owns provider selection, one-hour first attempt, suppression of unchanged empty/ambiguous outcomes and authorized family relaunch. No new geocoder or local retry mechanism is selected here.

## Consumer and design reconciliation

F01 accepts the order/context/result interface and optional professional club identity. F03 omits unavailable club navigation and map points while preserving useful sections; F04 searches only available fields. F06 preserves existing follow identities. F07/F08 coordinate accepted transitions in-process; F11 restrictions remain authoritative; F12 retains existing editors and permission assignment; F14 preserves club/logo bytes and unresolved associations without guessed joins.

The approved prototype changes reuse existing cards, maps and editor. Only professional reset copy becomes “Rétablir le logo automatique”; existing nonprofessional copy remains. Product Design reuses linked components and published context colors. Accepted references are the professional team [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1015-13477) and [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1019-3987) screens, [partial map](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=4525-32633), logo editor [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1852-22214) and [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1852-22388), and [320-point, 200% text action](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=4847-42504). The owner explicitly approved this reconciliation in the planning conversation on 2026-10-13, after the prototype approval. Visual inspection and these scoped approvals are not native accessibility qualification.

## Verification and completion

[Quickstart](quickstart.md) identifies the future contract/database/native scenarios; [research](research.md) distinguishes observed supplier structures and supported library features from unexecuted integration proof. Check specification coverage, actual canonical contract ownership, links/anchors, formatting and README documentation CI on the final tree.

Both scoped design gates are satisfied. Publish the checked specifications, canonical contracts and native dossier together in one draft PR to `develop`; no merge, promotion, issue closure, `speckit-tasks`, `speckit-analyze` or product implementation is authorized here.
