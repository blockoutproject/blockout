# Tasks: F01 source acquisition and operations

**Input**: [spec](spec.md), [plan](plan.md), [research](research.md), [model](data-model.md), [contracts](contracts/README.md), [validation](quickstart.md).

**Status**: Future work, all **NOT EXECUTED**. Documentary delivery does not authorize these runtime tasks or create their implementation issues. Tests below are explicitly required by the accepted plan. Paths are future occupied locations under approved V2 architecture, not installed commands. F13 owns initialization and branch protection restoration; F02 owns sports transactions/persistence; F03/F06 own presentation/following; F07 owns notifications; F11/F12 own privacy/permissions; F14 owns cutover. This feature consumes their contracts without replacing their rules.

Task IDs are local to this file; cross-feature references must name the owning feature. `[P]` denotes disjoint test/configuration files that can be prepared together only after their stated prerequisites, not independent permission to launch agents. Write the acceptance tests before their implementation and show they fail for the intended missing behavior.

## Phase 1: Setup and acceptance prerequisites

No implementation is authorized by documentary delivery. Clear global/visual gates and use F13-owned initialized tools.

- [x] T001 Record dossier and targeted design acceptance in `specs/001-source-acquisition/visual-supplement.md`, covering A38–A44 before affected UI plan finalization. [FR-039, FR-050, FR-051, FR-052, FR-053]
- [ ] T002 Verify F13 initialization and restoration of branch protections in `AGENTS.md`; use its locked toolchain rather than creating duplicate workspace infrastructure. [FR-021, FR-038]
- [ ] T003 Adopt documentary operation schemas into `contracts/public/acquisition/` and `contracts/internal/acquisition/`, using the single F13 Problem schema and generated outputs outside Git. [FR-003, FR-021, FR-038, FR-055, FR-050, FR-051, FR-052]

## Phase 2: Foundational boundaries

Acceptance checkpoint: generated consumers, source/family persistence and current-cycle checks exist before feature paths.

- [ ] T004 [P] Write real Java/Python/TypeScript generation and additive/incompatible response cases in `apps/ingestion/tests/integration/test_acquisition_contracts.py` and owning contract consumer tests; validate twice-generated outputs. [FR-021, FR-038; V14]
- [ ] T005 Add acquisition bindings, references, family controls and bounded cycle/outcome schema in `apps/backend/src/main/resources/db/changelog/acquisition/`, with F02 foreign keys/uniqueness and retained-data migration posture. [FR-007, FR-019, FR-021, FR-034, FR-039, FR-050, FR-051, FR-052, FR-053]
- [ ] T006 Implement acquisition domain values and revision transitions in `apps/backend/src/main/java/com/blockout/acquisition/domain/`; keep provider transport and generated DTOs outside pure domain. [FR-003, FR-007, FR-019, FR-034, FR-050, FR-051, FR-052]
- [ ] T007 Implement current-process registration, backend cycle order and stale/replay fences in `apps/backend/src/main/java/com/blockout/acquisition/application/CycleService.java`, exposing F02 consumer checks without direct Python SQL. [FR-021, FR-022, FR-034, FR-035]
- [ ] T008 [P] Implement startup settings, async client ownership and generated backend mappings in `apps/ingestion/src/blockout_ingestion/backend/`, with safe configuration errors and F13 technical authentication. [FR-021, FR-023, FR-034, FR-037]
- [ ] T009 Exercise constraints, stale revisions, replay and unauthorized no-effect behavior on real PostgreSQL in `apps/backend/src/test/java/com/blockout/acquisition/AcquisitionBoundaryIT.java`. [FR-019, FR-021, FR-034, FR-035, FR-038; V08/V12]

## Phase 3: US1 — Eligible official discovery (P1)

Independent acceptance: V01–V03/A01–A07/A38–A40; discovered scope and locked season bindings are explainable without sport downloads.

- [ ] T010 [P] [US1] Write controlled selector/frame/menu, partial/error/catalog-empty and coverage fixtures in `apps/ingestion/tests/providers/test_ffvb_discovery.py`, preserving official codes and distinguishing youth pools from Cups. [FR-001, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010, FR-050; SC-001]
- [ ] T011 [US1] Implement national option/frame and organizer-menu readers in `apps/ingestion/src/blockout_ingestion/providers/ffvb/discovery.py`, without browser execution, guessed seasons or directory completeness assumptions. [FR-001, FR-003, FR-004, FR-006, FR-031, FR-050]
- [ ] T012 [US1] Implement exact-scope discovery acceptance and retained reference eligibility in `apps/backend/src/main/java/com/blockout/acquisition/application/DiscoveryService.java`, preserving older seasonal championships on current-root rollover. [FR-004, FR-005, FR-006, FR-008, FR-009, FR-010, FR-019, FR-051, FR-052]
- [ ] T013 [US1] Implement preparing season/source URL validation, explicit missing-season confirmation, source-qualified launch independent of mapping and permanent ordinary lock in `apps/backend/src/main/java/com/blockout/acquisition/application/SeasonSourceService.java`. [FR-003, FR-007, FR-008, FR-038, FR-050, FR-051, FR-052] Resolve qualified published startYear from the stored candidate into the canonical F02 season and expose it in season projections; unresolved chronology is refused without an invented year.
- [ ] T014 [US1] Expose public season/source and internal discovery/validation operations in `apps/backend/src/main/java/com/blockout/acquisition/api/`, rejecting stale results and unsupported/redirected URL contexts. [FR-003, FR-007, FR-019, FR-038, FR-050, FR-051, FR-052]
- [ ] T015 [US1] Implement approved seasonal source preparation states in `apps/mobile/src/features/acquisition/season-preparation/`, including incomplete source coverage, pending validation, explicit confirmation and locked references, without classification readiness or a mapping shortcut. [FR-007, FR-039, FR-050, FR-051, FR-052; V12]
- [ ] T016 [US1] Prove unmapped pools/packs are discovered without blocking source launch or mutating mappings, calendars/results wait for effective mapping without staging, and source edits cannot override locking, season contradictions or current revisions in `apps/backend/src/test/java/com/blockout/acquisition/SeasonSourceIT.java` and linked mobile journey tests. [FR-003, FR-005, FR-007, FR-008, FR-009, FR-038, FR-050, FR-051, FR-052; SC-001]

## Phase 4: US2 — Reliable observations and handoff (P1)

Independent acceptance: V04–V06/V08; 99 accepted matches survive one failure, with no false withdrawal or guessed identity.

- [ ] T017 [P] [US2] Write complete/false-empty/wrong-season CSV and contextual ranking fixtures in `apps/ingestion/tests/providers/test_ffvb_calendar.py`, covering local/global errors and contradictory duplicate rows. [FR-011, FR-012, FR-013, FR-014, FR-017, FR-018, FR-019, FR-020; SC-002]
- [ ] T018 [P] [US2] Write independent covered pools sharing one team versus ordinary N2 matchdays, shared club numbers and F/P/placeholder/golden-set cases in `apps/ingestion/tests/providers/test_sporting_context.py`; label synthetic versus real evidence. [FR-015, FR-016, FR-017, FR-053, FR-054; SC-002]
- [ ] T019 [US2] Implement full-pool CSV parsing and proven contextual tour partition in `apps/ingestion/src/blockout_ingestion/providers/ffvb/calendar.py`, sharing one download and never inferring every pool from Jo or match prefix. [FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-053, FR-054] Include attributable information-sheet descriptors and actual FDME references as secondary F02 observations, without fetching PDFs.
- [ ] T020 [US2] Implement contextual standings extraction independently of calendar success in `apps/ingestion/src/blockout_ingestion/providers/ffvb/rankings.py`, preserving official positions and unknown statistics. [FR-017, FR-018, FR-053]
- [ ] T021 [US2] Map observations to existing F02 generated calendar/ranking/club/locality requests in `apps/ingestion/src/blockout_ingestion/backend/sport_observations.py`, with exact scope/order/field-state and private diagnostics. [FR-011, FR-014, FR-015, FR-016, FR-019, FR-021, FR-022, FR-023, FR-053, FR-054] Qualify descriptor context, URL destination and UNKNOWN/INVALID/CLEARED preservation without affecting presence coverage.
- [ ] T022 [US2] Run actual F02 match-transaction, lost-response, stale-order, empty-current and protected-history cases in `apps/ingestion/tests/integration/test_sport_handoff.py` against isolated PostgreSQL and owning F02 consumer tests. [FR-011, FR-012, FR-013, FR-018, FR-019, FR-020, FR-021, FR-022, FR-035, FR-053; SC-002]

## Phase 5: US3 — Professional phases (P1)

Independent acceptance: V02/V03/V07; all demonstrated phases use LNV-only authority and per-match detail cadence.

- [ ] T023 [P] [US3] Write entry/iframe/championship/phase and incomplete-history cases in `apps/ingestion/tests/providers/test_lnv_discovery.py`, including a changed ID that does not prove a new season. [FR-002, FR-003, FR-005, FR-018, FR-052; SC-003]
- [ ] T024 [US3] Implement LNV role-entry and published-phase discovery in `apps/ingestion/src/blockout_ingestion/providers/lnv/discovery.py`, preserving stored seasonal bindings and supported manual historical references. [FR-002, FR-003, FR-005, FR-006, FR-007, FR-052]
- [ ] T025 [US3] Implement grouped calendars/rankings and necessary match details in `apps/ingestion/src/blockout_ingestion/providers/lnv/observations.py`, with verified club mappings, source-only professional authority and independent field freshness. [FR-002, FR-015, FR-016, FR-017, FR-018, FR-030, FR-054] Carry professional-media references only when actually published and attributable; no liveCode conversion or LNV TV collector.
- [ ] T026 [US3] Prove own-window five-minute versus ordinary thirty-minute detail reads, final-result rereads and sets-only corrections in `apps/ingestion/tests/providers/test_lnv_detail_cadence.py`. [FR-002, FR-018, FR-030, FR-031; SC-003, SC-004]

## Phase 6: US4 — Clubs and effective locality (P1)

Independent acceptance: V10/A19–A22; no repeated unchanged ambiguous geocoding, no obsolete point restoration.

- [ ] T027 [P] [US4] Write club string-reference/privacy and locality-context outcome fixtures in `apps/ingestion/tests/providers/test_clubs_and_communes.py`, without real contact archives. [FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-054; SC-007]
- [ ] T028 [US4] Implement covered-club first/daily reads in `apps/ingestion/src/blockout_ingestion/providers/ffvb/clubs.py`, sharing FFVB provider limits and preserving manual-field ownership in F02. [FR-014, FR-018, FR-024, FR-025, FR-037, FR-054]
- [ ] T029 [US4] Implement actual-needed commune lookup in `apps/ingestion/src/blockout_ingestion/providers/communes/lookup.py`, using effective locality and no top-score/first-result selection. [FR-026, FR-027, FR-028, FR-029]
- [ ] T030 [US4] Implement daily/one-hour/retry-before-24h eligibility and manual unresolved-only reruns in `apps/ingestion/src/blockout_ingestion/acquisition/enrichment_schedule.py`. [FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-037, FR-042; SC-004, SC-007]
- [ ] T031 [US4] Prove old locality replies, ambiguous unchanged suppression and technical-failure distinction in `apps/ingestion/tests/integration/test_locality_revision.py` with real F02 persistence. [FR-026, FR-027, FR-028, FR-029, FR-042; SC-007]

## Phase 7: US5 — Predictable control and cadence (P1)

Independent acceptance: V09/V12/A23–A28/A37/A43–A45; no catch-up, unauthorized effects or duplicate manual operations.

- [ ] T032 [P] [US5] Write clock-controlled independent season/provider pause, unrelated-scope isolation, drain/overrun/crash/configuration revision cases in `apps/ingestion/tests/acquisition/test_scheduler.py`. [FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036; SC-004, SC-005]
- [ ] T033 [P] [US5] Write provider shared limits/backpressure/transient retries/Retry-After/parsing-no-retry cases in `apps/ingestion/tests/acquisition/test_provider_limits.py`. [FR-018, FR-035, FR-037; SC-005]
- [ ] T034 [US5] Implement APScheduler cadence, five-second control polling and fresh complete revision selection in `apps/ingestion/src/blockout_ingestion/acquisition/scheduler.py`, without catch-up or stale fallback. [FR-030, FR-031, FR-032, FR-033, FR-034, FR-035, FR-036]
- [ ] T035 [US5] Implement bounded active/pending descriptors, shared clients and configured timeouts/retries in `apps/ingestion/src/blockout_ingestion/acquisition/provider_reads.py`, including cancellation and qualified gzip/validator behavior. [FR-018, FR-035, FR-037]
- [ ] T036 [US5] Implement season/provider competition commands and seasonless club commands, manual-operation slot, revision refusal and truthful cycle read-back in `apps/backend/src/main/java/com/blockout/acquisition/application/FamilyControlService.java`. [FR-032, FR-033, FR-034, FR-035, FR-036, FR-038, FR-039]
- [ ] T037 [US5] Implement approved season/provider competition and seasonless club control/status views in `apps/mobile/src/features/acquisition/families/`, using F13 timeouts, no automatic mutation retry and old-session invalidation. [FR-032, FR-033, FR-036, FR-038, FR-039; SC-009]
- [ ] T038 [US5] Exercise lost command replies, current-cycle reuse, revoked/other permissions and old-account responses in `apps/mobile/src/features/acquisition/__tests__/controls.test.tsx` and real backend security tests. [FR-036, FR-038, FR-039; SC-005, SC-009]

## Phase 8: US6 — Incidents and proven recovery (P2)

Independent acceptance: V11/A29–A33; first scoped failure opens once and only positive affected-scope evidence resolves.

- [ ] T039 [P] [US6] Write scope-outcome and first-failure/24h/recovery examples in `apps/backend/src/test/java/com/blockout/acquisition/AcquisitionIncidentTest.java`. [FR-020, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-045; SC-006]
- [ ] T040 [US6] Implement safe latest outcomes and grouped action-needed reports in `apps/backend/src/main/java/com/blockout/acquisition/application/OutcomeService.java`, keeping acquisition versus integration distinct. [FR-021, FR-022, FR-023, FR-039, FR-040, FR-041, FR-042, FR-043, FR-045]
- [ ] T041 [US6] Connect existing F13 Alloy/Grafana/IRM/Discord scope signals in `infra/dokploy/observability/`, without new supervisor, reminders, personal payloads or false recovery. [FR-023, FR-040, FR-041, FR-042, FR-043, FR-044, FR-045; SC-006]
- [ ] T042 [US6] Qualify actual staging openings/repetitions/positive recovery and safe operator diagnostics against `specs/001-source-acquisition/quickstart.md` V11, retaining honest unavailable-provider evidence. [FR-023, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-045; SC-006, SC-008]

## Phase 9: US7 — Bounded history (P2)

Independent acceptance: V13/A34–A36/A44; real obtainable coverage, pre-closure initial reconstruction and terminal typed closure.

- [ ] T043 [P] [US7] Test available/missing/wrong-season initial archives and terminal season rejection in `apps/ingestion/tests/integration/test_initial_reconstruction.py`; verify no unrelated pause changes. [FR-020, FR-046, FR-047, FR-049, FR-055; SC-008]
- [ ] T044 [US7] Implement the protected initial reconstruction request for PREPARING seasons with existing cycle machinery in `apps/backend/src/main/java/com/blockout/acquisition/application/InitialReconstructionService.java`; atomically check permissions, readiness, idle provider slot and lock selected sources. No closed-season command. [FR-038, FR-046, FR-047, FR-049, FR-051, FR-055]
- [ ] T045 [US7] Route INITIAL_RECONSTRUCTION cycles through existing adapters in `apps/ingestion/src/blockout_ingestion/acquisition/initial_reconstruction.py`, preserving actual coverage outcomes and silent F02/F07 initial-import context; reject unissued or closed-season cycles. [FR-020, FR-021, FR-046, FR-047, FR-049, FR-055]
- [ ] T046 [US7] Implement approved exact-label closure confirmation and read-only closed-season navigation in `apps/mobile/src/features/acquisition/seasons/`; square named power action, semantic status colors, pull-to-refresh and uncertain-response protection. Verify blank/wrong confirmation, cancel, stale/forbidden requests and absence of recollection/reopen. [FR-007, FR-038, FR-039, FR-055; SC-008, SC-009]
- [ ] T047 [US7] Qualify current-plus-three initial reconstruction before closure and terminal closure transactions in `apps/backend/src/test/java/com/blockout/acquisition/SeasonClosureIT.java`: exact confirmation, cycle-start race, cancellation of unstarted requests, one-time draining, post-closure refusal, unchanged unrelated controls and F02/F14 identities/files/privacy plus F07 suppression. [FR-007, FR-019, FR-020, FR-032, FR-046, FR-047, FR-049, FR-054, FR-055; SC-008]

- [ ] T052 [US7] Implement terminal typed closure in `apps/backend/src/main/java/com/blockout/acquisition/application/SeasonClosureService.java`, checking permission, exact label and revision atomically with cycle starts, cancelling unstarted requests, preserving already running cycles and refusing all later starts/source edits without affecting other scopes. [FR-007, FR-032, FR-038, FR-051, FR-055; A35/A44]

FR-048 is withdrawn and has no implementation task. FR-055 introduces terminal closure; existing T043–T047 are revised accordingly. T052 precedes the real closure qualification in T047.

## Phase 10: Cross-feature qualification

All acceptance rows must have honest evidence; unsupported supplier capability blocks only its dependent scope, not a hidden workaround.

- [ ] T048 Run actual three-language contract consumers and complete F13 code-change CI using committed targets; record V14 evidence in `specs/001-source-acquisition/quickstart.md` without committing generated output. [FR-021, FR-038; V14]
- [ ] T049 Exercise contextual pool presentation/follows and permitted administration on iOS and Android against `specs/001-source-acquisition/visual-supplement.md`, including access denial, session change and navigation during waits. [FR-038, FR-039, FR-050, FR-051, FR-052, FR-053, FR-054; V12]
- [ ] T050 Record full provider qualification by demonstrated season/context in `specs/001-source-acquisition/provider-evidence.md`; report unresolved mappings/phases instead of asserting exhaustive coverage. [FR-001, FR-002, FR-003, FR-049, FR-053, FR-054; V01–V07/V13]
- [ ] T051 Re-run official Spec Kit consistency analysis and all applicable documentary checks against `specs/001-source-acquisition/plan.md`, spec, tasks and owning cross-feature handoffs before acceptance. [FR-001–054; SC-001–009]

## Dependencies and incremental delivery

Setup → foundation → US1 → US2. US3 and US4 can progress after foundation using approved reference/observation contracts; integrate after US1/US2. US5 supplies real scheduling/control used to qualify US1/US3/US4 end to end. US6 consumes their actual outcomes. US7 requires US1/US2/US5 and F02/F14 historical behavior. Final qualification follows all relevant stories and the explicit design gate. Test doubles support isolated story acceptance but do not replace downstream integration proof.

The first useful increment is US1 discovery/preparation against controlled sources, without claiming sporting publication. Next qualify one complete FFVB path through US2/US5, then the LNV and enrichment paths, incidents and history. Do not ship a partially qualified source as complete coverage.

## Parallel examples by story

- US1: national-menu fixtures and backend source-lifecycle tests can be prepared in different files after foundation; source API and mobile integration follow their stable contract.
- US2: CSV fault fixtures and sporting-context fixtures are independent; final F02 handoff awaits both parsers.
- US3: discovery fixtures and detail cadence fixtures can be prepared separately; actual reads await the LNV adapter.
- US4: club fixtures and pure commune matching cases are independent; locality persistence proof awaits the F02 seam.
- US5: clock/state tests and HTTP backpressure/retry tests are disjoint; scheduler integration follows both implementations.
- US6: incident rule examples can be prepared alongside the diagnostic view using agreed outcome semantics; staging delivery awaits F13.
- US7: archive fixtures and approved mobile mock journey can be prepared separately; initial reconstruction depends on qualified preparation, ordinary provider execution and sporting integration; terminal closure depends on its reviewed confirmation.

## Traceability notes

FR-010 is explicitly withdrawn; its relevant scope-removal/absence-of-exclusion checks remain in US1 without recreating exclusion commands. Functional requirements FR-001–FR-055 and buildable SC-001–SC-009 are mapped above. V01–V14 give independent outcomes and blocking evidence; research D01–D13 explain the selected mechanisms. Custom checklist markers remain reviewer-owned. No load benchmark, generic scraper, event bus, task recovery engine or implementation issue creation is included.
