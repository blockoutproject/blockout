# Implementation Plan: F02 sporting data, integration and lifecycle

**Publication branch**: `develop` (planning-only initialization policy) | **Date**: 2026-10-06 | **Spec**: [accepted F02 specification](spec.md) | **Issue**: [#19](https://github.com/blockoutproject/blockout/issues/19)

## Summary

Derive F02's accepted identities, source authority, partial integration, corrections and visibility into the Spring `sport` module. Python submits one normalized calendar observation per private request; Spring commits each identifiable match independently. Only a qualified, complete, successfully integrated authoritative calendar can reconcile absences. Retain stable identities, independent restrictions and manual presentation through corrections and reappearances.

This dossier is documentary. It does not initialize applications, install dependencies, run migrations, change providers or execute future tasks. Issue #18 must be closed before execution of this planning issue. Dossier acceptance belongs to the owner; global planning acceptance remains [#9](https://github.com/blockoutproject/blockout/issues/9). Future implementation requires that gate and its own authorization.

## Technical context

| Concern           | Selected boundary                                                                                                                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language/version  | Java 25 / Spring Boot 4.1; Python 3.14; Expo 57 / React Native 0.86 / React 19.2 / TypeScript, from the approved architecture. F13 qualifies and locks stable compatible patches; none is installed here.                                                                                                               |
| Dependencies      | Spring MVC/Security/Data JPA, Modulith verification only; HTTPX, lxml, standard CSV, APScheduler 3; generated OpenAPI clients; TanStack Query and F13 session-safe mobile transport.                                                                                                                                    |
| Storage           | PostgreSQL 18, `sport` schema; Liquibase 5 XML. Existing public S3 logo storage. OpenSearch 3.9 is F04's derivative, never sporting truth.                                                                                                                                                                              |
| Contracts         | OpenAPI 3.0.3; Java interfaces/DTOs, Python HTTPX client and TypeScript Orval/Zod consumers. Source snapshots in this dossier; future production roots follow F13. Generated outputs stay outside Git.                                                                                                                  |
| Testing           | JUnit/Spring plus PostgreSQL Testcontainers; real OpenSearch at the F04 seam; pytest pure parsers and controlled HTTP; Expo Jest/RNTL and actual iOS/Android for affected native paths.                                                                                                                                 |
| Platform          | One modular Spring server, one Python collector per environment, iOS and Android. Nx/npm orchestrates Maven and uv. F13 owns setup/deployment and native baseline qualification.                                                                                                                                        |
| Performance goals | None. No load, benchmark, capacity or monthly availability program. Exploratory response measurements are bounded evidence only.                                                                                                                                                                                        |
| Functional timing | F01: ordinary calendars 30 minutes; 5 minutes from one hour before to four hours after a reliable kickoff; club sheets every 24 hours; first eligible changed-locality attempt within one hour. Each LNV detail uses its own reliable H−1/H+4 five-minute window and otherwise thirty minutes, including final results. |
| Scope             | Six F02 stories, FR-001–FR-053 and SC-001–SC-007. Three LNV championships and their published phases; covered FFVB contexts. Counts observed during research are not coverage caps.                                                                                                                                     |

**Design gate:** the targeted KISS review is owner-approved for its recorded scope in [design authorities and approvals](../../docs/design.md#review-references). The additional [F01 visual supplement](../001-source-acquisition/visual-supplement.md) records owner acceptance on 2026-10-09 for its exact prototype revision and canonical Figma targets. This satisfies the targeted planning gate for the affected journeys; native qualification remains future, and materially changed journeys require renewed review under constitution III.

## Constitution check

The pre-research and post-design review apply the same gates; no exception is proposed.

| Principle                   | Design constraint and review criterion                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification authority | [Spec](spec.md) and consumed owning specifications define behavior; the approved architecture constrains technical choices; provider samples and V1 references are evidence only. No new sporting statistics or UI capability. |
| II — Domain integrity       | `sport` owns complete sporting resources. Transport, domain, JPA and provider representations are distinct; cross-module work uses explicit coordinating application methods and local transactions.                           |
| III — Design readiness      | Reuse the accepted Sport and Administration handoff below. No material UI redesign. Any new observable behavior returns to its feature/design owner before finalization.                                                       |
| IV — Contracts              | Authored OpenAPI precedes consumers; strict requests, additive validated responses, safe problems and reproducible generation. Future execution evidence remains a gate, not a documentary claim.                              |
| V — Simplicity              | [Research decisions](research.md) state need, solution, simpler alternative, consequences and proof. No broker, generic scraper, replay ledger, raw-response archive or field-level collaborative conflict engine.             |
| Governance                  | Official Spec Kit, constitution and accepted specifications remain intact. GitHub owns acceptance/status/evidence. Only future implementation tasks appear in `tasks.md`.                                                      |

## Project structure

### Documentation delivered by this feature

```text
specs/002-sporting-data/
  spec.md                         # revised specification authority
  plan.md
  research.md
  provider-evidence.md
  data-model.md
  contracts/
    integration.md
    administration.md
    consumers.md
    internal.openapi.yaml
    admin.openapi.yaml
    sport-problem.schema.yaml
  quickstart.md
  checklists/sporting-design.md
  tasks.md
```

### Future occupied implementation locations

```text
apps/backend/src/main/java/com/blockout/
  sport/{api,application,domain,infrastructure}/
  acquisition/                    # F01 owner, explicit cycle/configuration interface
  coordination/                   # only actual cross-module use cases
apps/backend/src/main/resources/db/changelog/sport/
apps/backend/src/test/java/com/blockout/{sport,coordination}/
apps/ingestion/src/blockout_ingestion/
  providers/{ffvb,lnv,communes}/
  application/
  backend/sport_observations.py    # F01-owned mapper; F02 verifies contract conformance
apps/ingestion/tests/{providers,integration}/
apps/mobile/src/features/sport/    # owned editing/presentation adapters only
apps/mobile/src/features/administration/  # F12 owns journeys
contracts/{internal,public}/sport/
contracts/shared/schemas/problem.yaml     # F13 owns one technical definition
```

Do not create empty packages. One Maven project contains modules, not one service per resource. Persistence ports belong to the use-case owner; JPA stays in infrastructure. These paths select future work, not existing executable commands.

## Acquisition and integration design

FFVB initially uses one full CSV export per qualified pool, with explicit coverage of its rounds. Distinct reused tour groups are separate contextual pools; one proven full CSV can feed separate observations. Ordinary matchdays do not create pools. Reuse its schedule, result, set, venue and referee fields; use HTML for necessary complementary data such as rankings. Do not assume a pool code identifies the same participants in every round. No initial division-wide or multi-pool aggregation.

LNV uses grouped phase calendars and per-match details for missing sets at five minutes only inside each match’s own reliable H−1/H+4 window, otherwise thirty minutes including after final results. Cover all three championships and discovered published phases; a primary match page can serve without a FFVB counterpart. LNV pages alone own professional matches and standings. Do not supplement them with XML or FFVB. Qualify phase/season membership and stable page references; labels, dates and opponents alone do not prove identity. Unproven coverage stays explicitly unqualified.

Shared HTTPX connections and downloads, bounded in-flight and queued work and provider-specific rates avoid uncontrolled acquisition. F01 owns scheduling, timeout/retry settings, skip-missed-tick behavior and provider-limit qualification. Enable compression/validators only for qualified representations. No generic download checkpoint/resumption system. Pure adapters parse controlled reduced fixtures without network.

The [integration contract](contracts/integration.md) owns request identity, cycle ordering, completeness, partial responses, designated source and single qualified empty observation. An admission step rejects globally invalid context before sporting writes. Match-scoped transactions retain valid independent updates; a separate guarded finalization reconciles absence only after every required item succeeded. Replay is idempotent through stable keys, current source revisions and effect comparisons, without an every-observation archive.

F01 terminal closure is enforced through backend-issued cycle eligibility: no new collection after closure, and only a cycle already running at acceptance may finish once. Initial historical reconstruction uses the same integration before closure, while PREPARING; empty/unavailable archives preserve retained data and initial imports stay silent under F07. No post-closure recollection or reopening is part of this plan.

## Corrections and effective data

The [data model](data-model.md) defines immutable IDs, contextual references, accepted versus acquisition classification, four-state observations, official scores/sets, independent visibility and field modes. A classification correction locks and validates its full affected scope in one transaction; collisions, splits, merges and out-of-scope shared participation reject everything.

Administrative requests use a simple expected resource/configuration revision. A stale request receives a safe conflict and a current-state reread; a lost response is not automatically retried. No per-field collaboration or merge interface. Source ordering is independent of operator revisions.

Logo bytes pass through the backend, which checks permission, PNG/JPEG content and the 5,242,880-byte limit. Upload a fresh object outside SQL, then conditionally attach it inside SQL after permission/version rechecks. Failure keeps the old association; never overwrite/delete an object still used by V1. F14 provides preserved bytes and certain correspondences.

Club effective commune/postal context controls geocoding. The current context revision must match at publication; stale replies cannot republish an invalidated point. Street-only changes and source changes hidden behind manual locality do not create a new need. Privacy restrictions dominate automatic/manual/intentional-absence modes.

## Feature ownership and accepted journeys

| Owner                                                                        | Consumed or provided seam                                                                                                                                                 | Explicit limit                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| F01 — `001-source-acquisition`                                               | Backend-issued cycles/order, qualified references, catalogs, normalized observations, eligibility, failure outcomes; F02 returns integration summaries and locality needs | F01 owns schedulers, incidents and retries. Its accepted spec is sufficient input; F02 planning does not wait for a later F01 plan. |
| F03 — `007-sporting-consultation`                                            | Current facts, source freshness, date-only/instant, result finality, public visibility and official ranking rows                                                          | F03 owns queries, pagination, calendar grouping and consultation UI; no new public CRUD API here.                                   |
| F04 — `008-search-discovery`                                                 | Effective fields, verified aliases, current restriction predicate and transactionally marked resource revisions                                                           | F04 owns index mapping/rebuild and actual OpenSearch worker. A stale hit cannot disclose a hidden resource.                         |
| F05/F12 — `005-accounts-identity`, `013-administration-app-configuration`    | Current identity/session and explicit per-action scoped permissions                                                                                                       | F02 enforces each mutation, not role assignment or new admin journeys.                                                              |
| F06/F08 — `009-following-personal-feed`, `010-live-contributions-moderation` | Stable team/pool/match IDs and current visibility/reliable kickoff                                                                                                        | No transferred follows, new links or inferred live-match state.                                                                     |
| F07 — `011-notifications-delivery`                                           | Meaningful before/after sporting transition and import origin within the committing coordinator                                                                           | F07 owns eligibility, consumed announcement facts and delivery; no historical-import announcements or effects for unchanged replay. |
| F11 — `004-advertising-privacy-legal`                                        | Current restrictions, erasure and allowed purpose for contacts/referees                                                                                                   | No personal contact history or raw/personal diagnostics; recollection/restoration cannot republish restricted data.                 |
| F13 — `003-shared-quality`                                                   | Locked runtime/toolchain, common transport/session/errors, migrations, operations and full CI                                                                             | Consume foundation implementation; do not duplicate scaffolding or add monitoring machinery.                                        |
| F14 — `014-v1-v2-transition`                                                 | Protected logo manifest/bytes, certain legacy correspondence and import revision                                                                                          | F02 only defines import acceptance; no snapshot export, reset or production migration here.                                         |

Approved visual authorities are [UI Library](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library) and [Product Design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design), specifically Sport `976:283` and Administration `1170:3654`. Reuse sporting detail/ranking/map/unavailable states and existing presentation/classification/division journeys; removed exclusion controls are covered by the accepted KISS review; newly contextualized pool presentation follows the additional F01 visual gate. The [design authorities and approvals](../../docs/design.md#review-references) pins prototype behavior `25875456e021424df3d682dbd414caf8ecdcdfdf` and specification snapshot `7880bfd7d7f6bf223805cef56428ab8a63768c2f`. Links do not authorize reading the legacy repository. Contact corrections can use the authorized administrative API without adding a mobile form. Native rendering, uploads and session behavior need fresh implementation evidence.

## Sequence and validation gates

1. Consume F13's authorized foundation and contract/security tooling; verify the planning bypass is already removed before any executable work.
2. Establish source/context identity and schema constraints, then classification and match-scoped integration.
3. Add authority/results/rankings and visibility; integrate source parsers at the selected boundaries.
4. Add presentation/contact/locality and logo behavior, then connect owned mobile/admin consumers and cross-feature coordinators.
5. Qualify generation and actual consumers, real PostgreSQL and affected OpenSearch/native seams, source coverage and authorized file preservation.

The initial Liquibase baseline is mutable only while **every** involved database is reconstructible. Freeze at the first preproduction deployment, or earlier when any retained data matters. Thereafter append immutable migrations; no checksum clearing, V1 reset or automatic SQL rollback.

[Quickstart](quickstart.md) defines independent evidence and blocking conditions. Every future runtime/provider/native qualification is **NOT EXECUTED** by this dossier. The implementation cannot claim source coverage or safe destructive transition from a sample or a URL. The official checklist and read-only cross-artifact analysis precede delivery; owner acceptance remains separate.

## Complexity tracking

No constitutional exception. Necessary targeted SQL transactions/revisions and domain-owned pending state address current invariants; they are not an event platform or universal operation ledger. No additional sporting feature, professional statistics, supervision mechanism or deferred performance program.
