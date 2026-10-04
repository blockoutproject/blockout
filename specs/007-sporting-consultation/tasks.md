# Tasks: F03 sporting consultation and calendars

**Input**: [Spec](spec.md), [plan](plan.md), [research](research.md), [model](data-model.md), [contracts](contracts/consultation.openapi.yaml), [validation](quickstart.md).

**Scope**: Future runtime implementation after explicit technical acceptance. This dossier executes none of these tasks. Tests are requested by the accepted plan. All six stories retain priority P1; dependencies determine implementation order.

**Format**: `- [ ] T### [P?] [US#?] Description with destination`. `[P]` permits independent work only after the phase prerequisites. Paths below are the intended V2 tree, not claims of installed applications. Create files only when their concrete task needs them; reuse occupied F13/F02 boundaries. No additional deployable service or empty framework layer.

## Phase 1 — Setup and owner prerequisites

Use the real F13 runtime foundation and contract pipeline, F02 sport storage/visibility, F01 source discovery and accepted F05/F12 composition. Read their committed manifests before selecting commands or native versions. Do not recreate these foundations within F03.

- [ ] T001 Adopt the accepted F13/F02/F01 prerequisites and register consultation in the occupied `apps/backend/src/main/java/com/blockout/sport/` and `apps/mobile/src/features/sport/` boundaries; verify build and test targets from their owning manifests and the dependencies in `specs/007-sporting-consultation/contracts/consumers.md`.
- [ ] T002 Adopt `specs/007-sporting-consultation/contracts/consultation.openapi.yaml` at `contracts/public/sport/consultation.openapi.yaml`, with F13/F05/F12 references resolved in the final tree; coordinate the F01/F02 owner contract additions without duplicate models or handwritten generated DTOs.
- [ ] T003 Prepare bounded synthetic source/read fixtures in `apps/backend/src/test/resources/sport/consultation/` and `apps/mobile/src/features/sport/__tests__/fixtures/`, including hidden parents, multiple seasons/participations, missing values, known restrictions and document response variants; document provenance without retaining personal provider payloads.

## Phase 2 — Shared read foundation

**Checkpoint**: Contract consumers and current sport visibility are available before any story.

- [ ] T004 Implement current visibility and effective-value consultation composition in `apps/backend/src/main/java/com/blockout/sport/application/consultation/`, reusing F02 rules and a request-scoped evaluation instant; wire owner interfaces in `apps/backend/src/main/java/com/blockout/coordination/`, never another module's repository. Keep provider calls outside SQL.
- [ ] T005 Generate and compile Java/TypeScript consultation consumers and add strict-input/additive-response/conditional-field fixtures in `contracts/tooling/tests/consultation/`; verify the binary operation bypasses JSON decoding and owner internal additions also generate/compile in Java/Python. Reuse F13 transport and safe diagnostics.

## Phase 3 — US1: Find information and navigate (P1, first increment)

**Goal**: Public resource pages, exact relationships and club season selection with independent sections.

**Independent validation**: V01 / A01–A06 / SC-001 on complete, partial, hidden and unavailable resources as guest and signed-in accounts. Owner action integration is accepted only after T036–T037.

### Tests

- [ ] T006 [P] [US1] Add PostgreSQL/service/HTTP tests for visible club/team/pool/match details, effective contacts, exact links and qualified season order in `apps/backend/src/test/java/com/blockout/sport/consultation/ResourceConsultationTest.java`.
- [ ] T007 [P] [US1] Add independent common/tab reads, season selection/disappearance, retained back navigation and late-context response tests in `apps/mobile/src/features/sport/__tests__/resource-navigation.test.tsx`.

### Implementation

- [ ] T008 [US1] Implement the four detail projections and routes in `apps/backend/src/main/java/com/blockout/sport/{application/consultation,api/consultation}/` and targeted queries in `apps/backend/src/main/java/com/blockout/sport/infrastructure/persistence/`; expose no private following/contribution state and preserve absent versus unavailable fields.
- [ ] T009 [US1] Integrate F01's qualified chronological season startYear and F02's available-season rules, then implement the club teams read with 50-row name/UUID cursor pagination in `apps/backend/src/main/java/com/blockout/sport/application/consultation/`; add only required owner schema changes under `apps/backend/src/main/resources/db/changelog/sport/`, with no match-date or lexical season inference.
- [ ] T010 [US1] Implement routes in `apps/mobile/src/app/{clubs,teams,pools,matches}/` and separate header/tab queries in `apps/mobile/src/features/sport/{api,model,ui}/`; share club season intent between teams/calendar, retain loaded tabs, reject previous contexts and include per-participation pool standings navigation.
- [ ] T011 [US1] Implement permitted contact/location/exact resource links and partial-detail fallback in `apps/mobile/src/features/sport/ui/`; distinguish unknown fields, hidden targets and transport failures without source fallback or identity replacement, using F13 accessibility and localized messages.

## Phase 4 — US2: Understand times (P1)

**Goal**: Preserve source precision while formatting known instants in the device timezone.

**Independent validation**: V02 / A07–A10 / SC-002 with fixed clocks, Paris/New York, DST and retained groups after travel. No provider or native proof is inferred from pure formatting tests.

### Tests

- [ ] T012 [US2] Add instant/date-only/undated and exact classification boundary cases in `apps/backend/src/test/java/com/blockout/sport/consultation/ConsultationTimeTest.java`, including DST elapsed hours, Paris midnight, provisional/definitive priority and withdrawn dates.

### Implementation

- [ ] T013 [US2] Implement schedule and category projections in `apps/backend/src/main/java/com/blockout/sport/application/consultation/`, reusing F02 precision/status and exposing UTC instants or date-only without fabricated midnight, winner or live status.
- [ ] T014 [US2] Implement local formatting and separate loading-zone state in `apps/mobile/src/features/sport/model/`; reformat instants after travel without relocating retained rows or changing their cursor zone, and use current-zone detail formatting.
- [ ] T015 [US2] Add timezone/DST and no-calendar-reclassification tests in `apps/mobile/src/features/sport/__tests__/consultation-time.test.tsx`, then qualify device timezone changes against V02 in `specs/007-sporting-consultation/quickstart.md` using actual native builds.

## Phase 5 — US3: Browse calendars and missing results (P1)

**Goal**: Complete-day pagination and deliberately stable retained lists.

**Independent validation**: V03 / A11–A17, A29 / SC-003–004 across all three calendar endpoints, with multiple pages and concurrent corrections.

### Tests

- [ ] T016 [P] [US3] Add PostgreSQL tests in `apps/backend/src/test/java/com/blockout/sport/consultation/CalendarPaginationTest.java` for seven complete nonempty days, eighth-day lookahead, stable ties, visibility, context-bound cursors, consistent two-statement reads and between-request corrections.
- [ ] T017 [P] [US3] Add retained-list, active-tab-only refresh, success replacement, failure retention, late append and UUID deduplication tests in `apps/mobile/src/features/sport/__tests__/calendar-lifecycle.test.tsx`; assert no focus/foreground/reconnect/invalidation refetch or old-page-chain reload.

### Implementation

- [ ] T018 [US3] Implement bound cursor decoding and targeted day-then-match JPA/HQL reads in `apps/backend/src/main/java/com/blockout/sport/infrastructure/persistence/`, under a short coherent read transaction; never load all history to filter in memory and never cap matches within a selected day.
- [ ] T019 [US3] Implement club/team/pool calendar operations and typed errors in `apps/backend/src/main/java/com/blockout/sport/api/consultation/`, including explicit season/category/timezone validation, current category evaluation, no-store and continuation context without a durable database snapshot.
- [ ] T020 [US3] Implement calendar day/pool/card presentation using ordinary virtualized React Native lists in `apps/mobile/src/features/sport/ui/`, with stable keys, accessible missing-result states and complete-day append, without nonvirtualized list nesting or an added list library.
- [ ] T021 [US3] Implement explicit first-page refresh, old-generation cancellation/ignore and in-memory tab progression in `apps/mobile/src/features/sport/{api,model}/`; preserve old authorized data until successful validation, reset to top on success and retain loading-zone continuation until refresh. Exclude calendar queries from broad automatic invalidation fetches.
- [ ] T022 [US3] Qualify all three calendar screens and moved-match recovery in `apps/mobile/src/features/sport/__tests__/calendar-integration.test.tsx` and the V03 native walkthrough in `specs/007-sporting-consultation/quickstart.md`; include all-deduplicated pages that still advance a cursor and back navigation from a refreshed match detail.

## Phase 6 — US4: Read standings and locate participants (P1)

**Goal**: Official ranking and independent reliable municipality points.

**Independent validation**: V04 / A18–A22 / SC-005 including absent ranking, unmatched rows, partial map and shared points.

### Tests

- [ ] T023 [US4] Add official order/statistic/absence and participation-location fixtures and tests in `apps/backend/src/test/java/com/blockout/sport/consultation/StandingsAndMapTest.java`; add same-point accessible selection cases in `apps/mobile/src/features/sport/__tests__/pool-map.test.tsx`.

### Implementation

- [ ] T024 [P] [US4] Implement pool standings query/projection in `apps/backend/src/main/java/com/blockout/sport/application/consultation/standings/`, retaining official order, missing tokens, unlinked source labels and actual source freshness without recomputation.
- [ ] T025 [P] [US4] Implement visible-participation map query/projection in `apps/backend/src/main/java/com/blockout/sport/application/consultation/map/`, using F02 qualified municipality points, exact grouping and counts independently of standings.
- [ ] T026 [US4] Implement standings and map tabs in `apps/mobile/src/features/sport/ui/`, using react-native-maps with Apple Maps iOS/Google Maps Android and the approved same-point selection panel; distinguish no participants, no points, partial coverage and tile failure without GPS or displaced coordinates.
- [ ] T027 [US4] Qualify map attribution, native controls, selection, errors and accessibility on both platforms using `specs/007-sporting-consultation/quickstart.md` V04 and exact design references; record unavailable native evidence as unavailable rather than passing a mock.

## Phase 7 — US5: Open media and official documents (P1)

**Goal**: Qualified references and real platform PDF opening with explicit failure ownership.

**Independent validation**: V05 / A23–A26 / SC-006 with information sheet before/after result, scoresheet gating and real iOS/Android handoff.

### Tests

- [ ] T028 [US5] Add targeted relay tests in `apps/backend/src/test/java/com/blockout/sport/consultation/InformationSheetTest.java` and binary transport cases in `apps/mobile/src/features/sport/__tests__/documents.test.ts`, covering HTTP200 HTML, invalid/oversized PDF, timeout, redirects, maintenance, hidden target and changed descriptor before release.

### Implementation

- [ ] T029 [US5] Complete the actual F01/F02 reference handoff in `apps/ingestion/src/blockout_ingestion/{providers,backend}/` and `apps/backend/src/main/java/com/blockout/sport/`, reusing their owner tasks and four-state observations; add provider mapping evidence in `apps/ingestion/tests/providers/`. Resolve official calendar from its source owner and never infer video from a code.
- [ ] T030 [US5] Implement matchId-only information-sheet relay in `apps/backend/src/main/java/com/blockout/sport/infrastructure/documents/` and its consultation route, with the fixed qualified FFVB POST, bounded validated PDF response, no SQL during supplier I/O, post-fetch visibility/reference check, safe errors and no persisted document.
- [ ] T031 [US5] Implement binary download, separate external transport and temporary-file lifecycle in `apps/mobile/src/features/sport/platform/`; implement the occupied iOS Quick Look adapter in `apps/mobile/modules/document-preview/` and Android ACTION_VIEW through Expo IntentLauncher/content URI. Enforce credential isolation, read grant, cancellation, reader absence, dismissal and cold-start cleanup without deleting a file still in use.
- [ ] T032 [US5] Implement document/media actions in `apps/mobile/src/features/sport/ui/`, including neutral stream wording, independent information-sheet eligibility, current match-detail check before scoresheet download, controlled failures, return/retry and owner reporting entries. Keep contributed links in F08's boundary.
- [ ] T033 [US5] Qualify genuine PDFs and actual native viewer return/cleanup on iOS/Android against V05 in `specs/007-sporting-consultation/quickstart.md`; include process termination leftovers and explicit limits of observed provider samples, without equating a successful launch to successful reading.

## Phase 8 — US6: Failures, restrictions and integrated journeys (P1)

**Goal**: Honest partial state and real owner integration without stale-data authorization.

**Independent validation**: V06 / A27–A34 / SC-007–008, guest plus successive accounts and all entitlement states. This phase remains incomplete while a required owner integration is absent.

### Tests

- [ ] T034 [US6] Add failure/privacy/identity and access-admission scenarios in `apps/backend/src/test/java/com/blockout/sport/consultation/ConsultationAccessTest.java` and `apps/mobile/src/features/sport/__tests__/consultation-recovery.test.tsx`, including no initial data, independent partial success, retained failure, old links, pending download/account changes and safe diagnostics.

### Implementation

- [ ] T035 [US6] Implement known-restriction removal, context/session isolation and match-only focus/foreground/manual rereads in `apps/mobile/src/features/sport/{api,model}/`; preserve allowed calendar data while removing now-forbidden fields/rows, and prevent personal follow/contribution state from entering public response caches.
- [ ] T036 [US6] Integrate real F06 follow/count, F08 contribution/moderation, F10 assistance and F02 authorized editing entries in `apps/mobile/src/features/sport/ui/` through their public feature boundaries; add their actual integration cases in `apps/mobile/src/features/sport/__tests__/owner-integration.test.tsx`. This task depends on those owners and cannot be completed by temporary substitutes.
- [ ] T037 [US6] Integrate F12 maintenance/session bypass through existing transport/composition in `apps/backend/src/main/java/com/blockout/coordination/` and `apps/mobile/src/features/sport/api/`; use F09's advertising boundary without gating any sporting read on Pro, and prove typed refusals/current-account entitlement isolation in `apps/mobile/src/features/sport/__tests__/owner-integration.test.tsx`.

## Phase 9 — Cross-boundary qualification

- [ ] T038 Re-run final Java/TypeScript and affected Python generation, compilation and conditional/additive/binary contract cases in `contracts/tooling/tests/consultation/`; validate intended-tree references and real module boundaries with the actual committed F13 targets.
- [ ] T039 Reconcile native evidence for all six journeys against `specs/007-sporting-consultation/contracts/mobile-and-design.md`, covering themes, small screens, enlarged text, screen readers, focus, reduced motion and native gestures; resolve material design gaps through the design owner before claiming acceptance.
- [ ] T040 Execute the applicable checks and full coverage walkthrough from `specs/007-sporting-consultation/quickstart.md` using actual runtime manifests; report passed, failed, skipped and unavailable evidence with reasons in the delivery issue, validate documentation formatting/links/diff, and request explicit acceptance without automatic deployment or issue closure.

## Dependencies and execution order

- T001 → T002 → T003 → T004 → T005 establish shared prerequisites. The F01/F02 source additions are implemented by their existing owning tasks, then consumed by T009/T029; these tasks do not authorize independent copies.
- US1 follows the foundation. US2 follows the resource projection foundation; US3 depends on US1's context and US2's classification. US4 and US5 can progress independently after US1/T005 and their owner inputs, with disjoint files; US5 result eligibility also depends on US2.
- US6 failure tests can be prepared after the foundation, but integrated completion depends on the prior stories and real F06/F08/F10/F12/F09/F02 owners. F05 supplies account context. F11 supplies privacy/legal requirements through those owners, not a parallel access service.
- T038–T040 follow all stories and actual owner integrations. No native/provider acceptance can be replaced with isolated mocks; unresolved qualification blocks full runtime acceptance.
- Within each story, write the specified tests before the behavior and establish a relevant failing baseline. Implement projections/queries before adapters and integrated UI. Keep tasks sharing a directory/file sequential unless concrete ownership is split.

## Parallel examples

| Story | Safe opportunity after prerequisites                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1   | T006 backend tests and T007 mobile navigation tests use separate files.                                                                                 |
| US2   | T013 server time projection and T014 mobile formatting can proceed independently against the fixed T005 contract after T012; T015 combines their proof. |
| US3   | T016 PostgreSQL tests and T017 mobile lifecycle tests are independent; implementation sharing query/state files stays ordered.                          |
| US4   | T024 standings and T025 map readers use separate occupied subdirectories after T023.                                                                    |
| US5   | After T028/T029, T030 relay and T031 native adapters can progress against the adopted binary contract; T032/T033 require integration.                   |
| US6   | After T034, owner teams can supply their dependencies separately; T035–T037 remain coordinated because they share mobile state and integration files.   |

These are implementation scheduling options, not authorization to create new chats, services or empty layers.

## Incremental delivery and traceability

The first useful increment is US1 resource navigation with proven visibility, independent data and seasons; it is not complete F03. Add US2/US3 for calendars, then US4 and US5, and finish US6 and cross-boundary qualification. Preserve all six journeys rather than stopping at the first increment. No deployment follows automatically from a checkpoint.

The [coverage matrix](quickstart.md#coverage) links every FR, A and SC to validation and tasks. Counts: setup/foundation 5; US1 6; US2 4; US3 7; US4 5; US5 6; US6 4; final qualification 3; total 40. All remain unchecked until implemented and verified under their actual owner scope.
