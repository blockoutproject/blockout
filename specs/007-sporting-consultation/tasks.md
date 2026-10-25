---
description: "Implementation tasks for F03 sporting consultation and navigation"
---

# Tasks: F03 sporting consultation and navigation

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). Native/provider/generated-consumer evidence remains future implementation work; drafting this file initializes no runtime and performs no provider operation.

**Tests**: A01–A34, FR-036 and SC-001–008 explicitly require qualification. Write automated tests first with meaningful failures before associated implementation. Prepare manual/native cases before their setup and execute only with actual prerequisites and authorization. Synthetic fixtures, generated compilation, PostgreSQL execution, native devices and real source evidence establish distinct boundaries.

**Organization**: Setup and the bounded foundation precede six story phases in priority order: US1–US4 and US6 at P1, then US5 at P2. F02 retains sporting truth/visibility, F01 qualified acquisition and the other owners their embedded actions. F03 adds no persistent sporting model, source scheduler or generic screen/recovery engine.

## Format: `[ID] [P?] [Story] Description`

- **[P]** identifies distinct-file work that can run together after its prerequisites.
- **[USn]** retains the specification's story number.
- Paths identify future implementation or the existing qualification source. All boxes start unchecked.

## Path Conventions

- Backend consultation lives with the existing sporting module in `apps/backend/src/main/java/com/blockout/backend/sporting/`, with mirrored `src/test/java/` paths. Application views/ports stay immutable; JPA entities remain inside infrastructure. Reuse the F02-owned current-read boundary rather than a second sporting store.
- Mobile behavior lives in `apps/mobile/src/features/sporting/`, with focused co-located `__tests__/`. Thin resource routes live in `apps/mobile/src/app/`; shared transport, Query/session binding, theme and controls remain F13-owned.
- Canonical definitions remain `contracts/http/mobile/consultation/` and the shared mobile/ingestion roots. F13 generates Java interfaces/DTOs and mobile functions/validators into ignored build output. No handwritten DTO mirror, feature-local OpenAPI copy or universal batch endpoint is introduced.
- Actual native/provider configuration belongs to the existing application configuration and `infra/operations/README.md`; source PDFs, contacts, referees, credentials and private diagnostics stay out of public evidence.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the bounded existing workspace, canonical generation and sporting owners.

- [x] T001 Verify F13 T001–T017 through `apps/backend/pom.xml`, `apps/mobile/orval.config.ts` and `README.md`: selected Java 25/Spring Boot 4.1.1, Expo SDK 58/React Native 0.88/React 19.3.0, generated public/ingestion consumers and ordinary PostgreSQL/Jest tooling. Reuse F02 identity/current-read inputs and existing mapping conventions; introduce no new application, database, migration or alternate SQL framework.
- [x] T002 Declare bounded document-transport/origin configuration in `apps/backend/src/main/resources/application.yaml` and `apps/backend/.env.example`, and Android map environment input names in `apps/mobile/.env.example`. Keep actual credentials and provider activation separate; native map/PDF dependencies and compatibility qualification belong to their story tasks, so unavailable PDF evidence does not block ordinary resource reads.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the canonical response and current-public-context boundaries used by every story.

- [x] T003 [P] Write failing generated-consumer/mapping tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/ConsultationContractIntegrationTest.java` and `apps/mobile/src/features/sporting/__tests__/consultation-contract.test.ts`, using the canonical consultation schemas and actual F13 generation. Cover additive JSON versus invalid known fields/enums, absent versus null/empty, preserved date/date-time, `upcoming`/`completed`, document kinds, standings availability, required nullable three-color gradient, no fabricated numeric defaults and binary PDF/PNG/JPEG bypass of JSON validation. Preserve F08's exact contributed `streamContributionId` only alongside its URL, without exposing moderation/private fields.
- [x] T004 [P] Write failing public-context tests in `apps/backend/src/test/java/com/blockout/backend/access/application/MaintenanceAdmissionTest.java`, `apps/backend/src/test/java/com/blockout/backend/sporting/application/ConsultationRequestTest.java`, `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ReadSportingDataTest.java` and `apps/mobile/src/features/sporting/__tests__/consultation-context.test.ts` using controlled F02/F05/F12 inputs: ordinary reads require no usable account/Pro, explicit bypass needs current authorized credentials, hidden/dateless targets are unavailable, and old resource/season/session/bypass completions cannot replace a new context. Public fields never include private follow state, editing revisions or forbidden source fallbacks.
- [x] T005 Define cohesive immutable consultation views/read requests in `apps/backend/src/main/java/com/blockout/backend/sporting/application/ConsultationViews.java` and the focused `ConsultationStore.java`, reusing F02's `ReadSportingData.java` current identity/effective-value/visibility boundary. Establish the canonical mapping in `apps/backend/src/main/java/com/blockout/backend/sporting/api/ConsultationApiMapper.java` and feature query context in `apps/mobile/src/features/sporting/api/consultation-queries.ts`, making the foundation tests pass. Generated Java DTOs stay at the API boundary; frontend generated types are reused where their semantics match. No repository/entity leaks, duplicated visibility registry or additional HTTP contract is added; story tasks supply the actual projections and endpoints.

**Checkpoint**: Common contracts and context guards are testable. Actual public reads require the relevant F02 facts, visibility and effective-value implementation, not completion of all acquisition/notification/release work.

---

## Phase 3: User Story 1 — Find information and navigate between resources (Priority: P1) 🎯 MVP

**Goal**: Provide four usable public resource pages and exact relationships with honest partial information.

**Scope**: A01–A06; FR-001–008, FR-012–015, FR-018–020, FR-023, FR-029, FR-031–032, FR-035; SC-001, shared SC-003 classification.

**Independent Test**: Read club/team/pool/match fixtures, navigate exact identities and change club seasons with delayed responses. Professional clubless teams remain usable; restrictions and missing secondary values never cause invented relationships or source fallback. Full calendars/maps/documents arrive through their owning story increments.

### Tests for User Story 1

- [x] T006 [P] [US1] Write failing generated-interface MVC tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingResourcesWebMvcTest.java` for club detail, club teams by season, team/pool/match detail and club/team/division logos. Cover ordinary public admission, explicit F12 bypass and invalid credentials, current hidden/dateless/missing targets, unknown season, safe Problem Details, effective PNG/JPEG media and `Cache-Control: no-store`; protect images with the same admission/visibility as their JSON owner.
- [x] T007 [P] [US1] Write failing PostgreSQL projection tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingResourcesIntegrationTest.java` using real F02 facts/effective values/visibility: corrected and deliberately absent contacts/location, restricted source reappearance, professional teams without clubs, multiple participations, newest/future/closed seasons, removed seasons and partial match details. Verify immutable summaries include enough relationship/card data without private state or rank/result inference.
- [x] T008 [P] [US1] Write failing semantic navigation tests in `apps/mobile/src/features/sporting/__tests__/sporting-pages.test.tsx` for all four pages, missing logos/details, exact links, season sharing across club teams/calendars, successful season disappearance versus failed retrieval and stale completions. Cover horizontally scrollable team tabs with one standings tab per visible pool, one team-follow identity and aggregate calendar entries; use controlled owner actions and later-story tab content initially.
- [x] T009 [P] [US1] Write failing classification tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/MatchPresentationTest.java` for definitive-first classification, provisional/unconfirmed and special notations, six elapsed hours including DST, date-only next-midnight Europe/Paris, late/corrected/withdrawn results and postponed matches. Evaluate the same accepted facts at one instant in both zones, keep F02 hiding first and never infer a winner, zero, cancellation or in-progress state from elapsed time.

### Implementation and qualification for User Story 1

- [x] T010 [US1] Implement shared consultation classification in `apps/backend/src/main/java/com/blockout/backend/sporting/application/MatchPresentation.java` for the resource and subsequent calendar projections, making T009 pass. Definitive official result wins immediately; otherwise use kickoff plus six elapsed hours or the following Paris midnight for a date alone. Sample one evaluation instant per request, preserve F02 result finality/visibility and keep this presentation rule separate from acquisition cadence, contributions and notifications.
- [x] T011 [US1] Complete resource projection values in `apps/backend/src/main/java/com/blockout/backend/sporting/application/ConsultationViews.java` with the literal model constraints: club — “Seasons come from viewable teams, newest first. No source fallback for a deliberate absence or restriction.”; team — “Stable identity; a professional team needs no club or assumed municipality.”; pool — “Missing classification is not inferred from another pool.”; match — “A missing usable date or current restriction hides the resource; no invented instant, score or winner.” Preserve independent result/sets/schedule freshness, permitted contacts/referees and exact relationship identities; public documents/stream actions complete in US5 without changing these facts.
- [x] T012 [US1] Implement cohesive resource reads in `apps/backend/src/main/java/com/blockout/backend/sporting/application/ReadSportingResources.java` and `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/JpaConsultationStore.java` through T005's port and F02's current-read ownership. Make T007 pass with JPA/Hibernate projections, no new store and no external calls inside a read transaction. Return all viewable club teams in effective-name/UUID order, available seasons newest first and exact visible participations; effective images/contacts never fall back through a known restriction.
- [x] T013 [US1] Implement canonical resource and logo operations in `apps/backend/src/main/java/com/blockout/backend/sporting/api/ConsultationController.java`, using T012 and `ConsultationApiMapper.java` plus existing F13/F12 admission/error handling. Make T006 pass without a controller per screen or private source URLs, follow state or mutable entities in public representations. Later story tasks extend this same adapter with calendars, standings/participants and documents.
- [x] T014 [US1] Bind generated functions/keys and success validators in `apps/mobile/src/features/sporting/api/consultation-queries.ts`; reuse the F13 mutator and `networkMode: 'always'`, disabled retries and applicable current session/bypass context. Ordinary public reads do not obtain or await credentials/entitlements; JSON validation occurs once before caching and binary images keep their intentional transport path. Keep page information separate from lazy tab queries and add no handwritten client or second cache.
- [x] T015 [US1] Implement `apps/mobile/src/features/sporting/screens/club-screen.tsx`, `team-screen.tsx`, `pool-screen.tsx` and `match-screen.tsx` with thin UUID routes in `apps/mobile/src/app/clubs/[clubId].tsx`, `teams/[teamId].tsx`, `pools/[poolId].tsx` and `matches/[matchId].tsx`. Use F13 T067–T069/T071 UI; make T008 pass for exact links, newest available initial season, shared club selection, preserved still-valid choice, fallback only after successful disappearance and independent partial sections. Team pool tabs preserve phase identity and one follow action; no assumed club, namesake replacement or score editor.
- [x] T016 [US1] Compose common sporting identity/result presentation in `apps/mobile/src/features/sporting/components/sporting-identity.tsx` and `match-summary.tsx` using F13 tokens/controls and F02's accepted colors/three-color gradient, including null-gradient fallback. Preserve legible missing-logo identity, known versus missing values, exact safe phone/email/website/map destinations and venue distinction; no guessed destination or sporting inference. US2 supplies time formatting and US3 supplies calendar category indications.
- [ ] T017 [US1] Connect actual F06 follow/count, F08 contribution/report, F10 support and F02 authorized presentation-edit entries through `apps/mobile/src/features/sporting/components/sporting-actions.tsx` and the four owner screens, extending `__tests__/sporting-pages.test.tsx` with their real boundaries when available. Keep current F05/F12 action conditions and domain mutations with those owners; guest/public consultation remains independent and no state is copied into public resource DTOs. Use controlled actions only for early local tests, never as completed integration.
- [ ] T018 [US1] Run public-resource/season cases from `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes` with actual generated consumers, F02 accepted facts/visibility and the applicable embedded owners. Verify optional professional-club navigation, independent sections and restricted contacts/images; reuse F02 T034/T041/T055 evidence. Calendar, map, document and native visual qualifications remain on their explicit later tasks.

**Checkpoint**: US1 is the resource/navigation MVP; later story tabs and external owner integrations retain their concrete completion prerequisites.

---

## Phase 4: User Story 2 — Understand times in my time zone (Priority: P1)

**Goal**: Display established instants in the current phone zone while preserving sporting dates and retained grouping context.

**Scope**: A07–A10; FR-006, FR-009–011, FR-018, FR-031; SC-002.

**Independent Test**: Compare the September 20, 2026 00:30 Paris instant with September 19 18:30 New York, then DST, date-only, dateless and travel cases. No local formatting invents a source instant or changes season.

### Tests for User Story 2

- [x] T019 [P] [US2] Write failing time-presentation tests in `apps/mobile/src/features/sporting/__tests__/sporting-time.test.ts` for the exact A07 example, date-specific offsets, DST changes, date-only/unknown FFVB 00:00 and genuine confirmed midnight. Cover relative labels, current-zone match detail and retained calendar grouping/continuation after travel without automatic fetch, reorder or scroll reset; use controlled clocks/zones, not fixed Paris–New York offsets.
- [ ] T020 [P] [US2] Write failing PostgreSQL grouping tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/CalendarDayIntegrationTest.java` for requested IANA zones, date-only unchanged sporting dates, invalid zones and absent/withdrawn dates. Use real F02 precision/visibility and Hibernate/PostgreSQL conversion; the complete seven-day query is implemented in US3 T028, so no second query or fabricated instant is introduced just for this test.

### Implementation and qualification for User Story 2

- [x] T021 [US2] Implement native time formatting in `apps/mobile/src/features/sporting/model/sporting-time.ts` and use it in `components/match-summary.tsx` and `screens/match-screen.tsx`. Make T019 pass with the ordinary selected runtime's date/zone facilities, French meaningful unknown-time labels and unchanged date-only values. Keep current display zone distinct from the calendar's captured grouping zone and preserve F02 source precision without a new setting or timezone library by default.
- [ ] T022 [US2] Add the actual zone/date grouping inputs and semantics to `apps/backend/src/main/java/com/blockout/backend/sporting/application/ConsultationViews.java` and `ConsultationStore.java`; complete T020 against T028's single Hibernate/PostgreSQL calendar implementation. Preserve the model rule “Convert an established instant into the requested IANA grouping zone. A date alone keeps its sporting date.” Validate the zone at the canonical boundary and do not duplicate source-time resolution, calendar-year season assignment or hidden-date decisions.
- [ ] T023 [US2] Execute the calendar-time and retained-navigation cases in `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes` after US3's actual calendar exists, on native iOS/Android across Paris/New York, DST and changed device zones. Verify known-time conversion with retained loading-zone groups, date-only labels and dateless old-link refusal; record actual device/runtime evidence separately from T019/T020.

**Checkpoint**: Formatting is independently testable; database grouping and native calendar qualification complete with the actual US3 query, without an additional time authority.

---

## Phase 5: User Story 3 — Find matches and distinguish missing results (Priority: P1)

**Goal**: Supply deterministic complete-day calendars with explicit successful refresh and honest result classification.

**Scope**: A11–A17, A29; FR-007, FR-009–019, FR-029–031; SC-003–004.

**Independent Test**: Compare before/at/after shared time boundaries, rescheduling and result withdrawal, then browse more than seven nonempty days and refresh during delayed pagination. No duplicate cards, split days, false score or destructive failed refresh occurs.

### Tests for User Story 3

- [ ] T024 [P] [US3] Write failing real PostgreSQL calendar tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/ReadMatchCalendarIntegrationTest.java` for all resource selectors, multiple team participations, many matches on a day, more than seven nonempty days separated by gaps, stable equal/unknown times and exclusive continuation. Interleave a change between day selection and row retrieval to prove one short repeatable-read response; interleave changes between pages to demonstrate the accepted moved-row gap until refresh, without a retained snapshot or total cap.
- [ ] T025 [P] [US3] Write failing canonical calendar MVC tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/MatchCalendarWebMvcTest.java`: exactly one club/team/pool selector, season required only for club, strict category, valid IANA zone and exclusive `nextDay`, safe invalid/unknown/hidden outcomes and no-store. Validate `evaluatedAt` versus source observation, complete days and omission of `nextDay` only when exhausted; no invented total or match-count page bound.
- [ ] T026 [P] [US3] Write failing memory-query integration tests in `apps/mobile/src/features/sporting/__tests__/sporting-calendar-query.test.tsx` with the real QueryClient/generated consumers and controlled HTTP: lazy tabs, retained return/focus/foreground/reconnect/invalidation, UUID deduplication, failed append, cancelled old pagination and current-context guards. Exercise supported `infiniteQuery` explicit stale fetch with `pages: 1`: only successful first-page refresh replaces/resets, failure retains authorized prior pages, and neither sibling tabs nor common information reread. Offline attempts must fail ordinarily without a paused request replaying on reconnection.
- [ ] T027 [P] [US3] Write failing calendar/card interaction tests in `apps/mobile/src/features/sporting/__tests__/sporting-calendar.test.tsx` for Upcoming/Completed day direction, stable pool groups, known-time direction then unknown time, missing versus provisional/definitive results and special notation. Result-unavailable meaning is accessible without color alone; retained rows do not locally reclassify on elapsed time or detail reads, and successful refresh alone returns traversal to its beginning.

### Implementation and qualification for User Story 3

- [ ] T028 [US3] Implement `apps/backend/src/main/java/com/blockout/backend/sporting/application/ReadMatchCalendar.java` with T005's port and `infrastructure/JpaConsultationStore.java`, then expose `listMatches` through `api/ConsultationController.java`. Make T020/T024/T025 pass using ordinary JPA/Hibernate projections and PostgreSQL time-zone functions: seven complete nonempty days, then all eligible matches, in one short read-only repeatable-read transaction. Preserve “At most seven nonempty days per response, no total browsing cap. Each match appears once in that response.” Order days/category, pool UUID, known instants in traversal direction, unknown last and match UUID; return an exclusive next day only when more exist. No copied sporting model, signed cursor, snapshot store, per-user feed or alternate SQL subsystem.
- [ ] T029 [US3] Implement retained infinite-calendar queries and explicit refresh in `apps/mobile/src/features/sporting/api/sporting-calendar.ts`, making T026 pass with generated functions/keys and the existing shared QueryClient. Keep selector/season/category/loading zone/applicable session-bypass context in query identity, disable implicit mount/focus/reconnect/invalidation refetch and preserve F13 `networkMode: 'always'`/no retry. Cancel old pagination before supported `pages: 1` stale fetch, replace only on success, deduplicate appended match UUIDs and retain old authorized groups/progression on failure; no backup cache or custom replay/reconciliation loop.
- [ ] T030 [US3] Implement `apps/mobile/src/features/sporting/components/sporting-calendar.tsx` and complete `match-summary.tsx`, integrating the one calendar into club/team/pool screens. Make T027 pass with virtualized complete-day/pool groups, current selected season/category, clear missing/provisional result indications and retained context after back/travel. Preserve F02 compatible overall/set results without guessing zero/winner/number of sets, and do not let match-detail refresh silently reshuffle a retained calendar.
- [ ] T031 [US3] Execute calendar-time/pagination/explicit-refresh cases from `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes` through actual generated backend/mobile consumers and PostgreSQL fixtures. Verify corrected/withdrawn results and source absence against real F02 acceptance/visibility, first-page replacement versus failure, complete days and scope guards; expose only the reusable category/day-query/calendar behavior needed by F06 when that owner integrates, without implementing follows or a personal feed here.

**Checkpoint**: Calendar selection, ordering and retained refresh have actual local/database evidence. Native timezone/accessibility and cross-owner feed evidence remain separately attributable.

---

## Phase 6: User Story 4 — Read standings and locate participants (Priority: P1)

**Goal**: Present official standings and independent municipality-level participants through native maps.

**Scope**: A18–A22; FR-006, FR-008, FR-020–024, FR-032; SC-005.

**Independent Test**: Read unmatched/special/missing official statistics and pools without standings, then zero/partial/identical participant points. Every colocated team remains selectable without assumed identities, coordinates or rank.

### Tests and qualification cases for User Story 4

- [ ] T032 [P] [US4] Write failing PostgreSQL/MVC cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/PoolConsultationIntegrationTest.java` and `api/PoolConsultationWebMvcTest.java` for independent standings/participants, official order/columns/source labels, unavailable versus not-published versus retained available table, original observation time and failed latest acquisition. Cover absent locations, clubless professionals, withdrawn participation with other participation retained, current visibility and ordinary/bypass admission.
- [ ] T033 [P] [US4] Write failing standings UI tests in `apps/mobile/src/features/sporting/__tests__/pool-standings.test.tsx`: official positions/special ratios, omitted values, unmatched unlinked rows, safe team highlighting and independent error/retained freshness. Neither a cache read nor calendar refresh creates a new observation; no inferred rank/winner or fictional zero appears.
- [ ] T034 [P] [US4] Write failing map behavior tests in `apps/mobile/src/features/sporting/__tests__/pool-map.test.tsx` for visible participation independent of standings, zero versus partial coverage, identical coordinates, missing logos and exact team selection. No point comes from an unassociated standings row, absent/invalidated locality or clubless professional; use a controlled native map boundary without asserting provider tile rendering or adding a failure detector.
- [ ] T035 [P] [US4] Prepare native library/configuration and map cases in `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes`: selected `react-native-maps` 1.27.2 on the F13 stack, iOS Apple/Android Google, restricted Android credentials, slow/offline basemap, touch/accessibility and approved marker/selection references. Unavailable evidence stays pending; an incompatible package reopens only that accepted boundary before adoption.

### Implementation and qualification for User Story 4

- [ ] T036 [US4] Extend `apps/backend/src/main/java/com/blockout/backend/sporting/application/ReadSportingResources.java`, `infrastructure/JpaConsultationStore.java` and `api/ConsultationController.java` with canonical standings and participant reads, making T032 pass. Preserve standings — “No local rank or zero calculation; unmatched rows stay unlinked.”; participants — “Independent of standings. Identical points retain every team; absent points remain absent.” Return all viewable participants including those without points, published ordered statistics and honest `availability`/`observedAt`/`lastAttemptFailed`; no table reconstruction from matches or copied participant catalogue.
- [ ] T037 [US4] Implement lazy standings queries and `apps/mobile/src/features/sporting/components/pool-standings.tsx` for pool and per-participation team tabs, making T033 pass through generated types/validators. Preserve known freshness and independent section state, official labels/order and unlinked rows; successful empty arrays, not-published and unavailable are not interchangeable.
- [ ] T038 [US4] Add the selected native map package/configuration in `apps/mobile/package.json`, the existing lockfile and `apps/mobile/app.config.ts`, using Apple on iOS and Google on Android. Declare Android key inputs and required restrictions, leaving actual authorized provider configuration/verification to T040, and document configuration names in `infra/operations/README.md`; request no phone location, enable no Google iOS integration and make no implicit package/platform upgrade.
- [ ] T039 [US4] Implement `apps/mobile/src/features/sporting/components/pool-map.tsx` using the canonical participant read and approved F13 tokens/selection controls, making T034 pass. Group exact coincident points for selection without displacement/dynamic clustering, retain every team/missing-logo label and distinguish zero/partial municipality coverage without suggesting an empty pool or exact gymnasium. Let the native provider own basemap loading; add no GPS, persistent geographic cache, timer or custom tile-error detector.
- [ ] T040 [US4] Execute T035 with Expo Doctor, relevant native builds and physical iOS/Android maps through `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes`. Compare Blockout-owned markers/selection to approved Figma references, verify identical-point selection and native accessibility, and keep independent information usable when basemap tiles cannot load. Record actual package/device compatibility and failed/unavailable checks; a web map or readiness callback does not prove native tile behavior. Before actual Android map use, configure and verify the declared key restrictions under applicable provider authorization; missing authorization keeps this qualification open.

**Checkpoint**: Official table and participant behavior remain independent; native map adoption requires its actual platform evidence, without inventing a universal failure guarantee.

---

## Phase 7: User Story 6 — Consult during an outage without bypassing restrictions (Priority: P1)

**Goal**: Preserve authorized independent data and retained navigation while applying known restrictions and explicit current reads.

**Scope**: A27–A34; FR-001, FR-006–009, FR-012–013, FR-018, FR-028–036; SC-007–008.

**Independent Test**: Fail initial/section/refresh/additional-page reads, change context and apply a known restriction. Only still-authorized data remains, match detail rereads at its own triggers, and public consultation stays independent of entitlement state.

### Tests for User Story 6

- [ ] T041 [P] [US6] Write failing recovery/access tests in `apps/mobile/src/features/sporting/__tests__/sporting-recovery.test.tsx` with real feature queries and controlled transport/session/gates: initial loading/error, actual absence, partial section failure, retained refresh failure and hidden resource. Cover old resource/season/account/bypass responses, deliberate contact removal, restricted image access and unknown Pro state; no successful empty state, automatic replay, permanent spinner or source fallback may conceal failure/restriction. US5 T050/T058 own restricted document access and cleanup once its reader exists; those later proofs do not block this recovery implementation.
- [ ] T042 [P] [US6] Write failing lifecycle tests in `apps/mobile/src/features/sporting/__tests__/match-refresh.test.tsx`: match detail rereads on focus, foreground and explicit refresh, applying corrected result/date/links/visibility; retained calendars neither reread nor reclassify at those events. One active-tab refresh does not reread common information/siblings, and accepted response time never masquerades as supplier observation or guaranteed propagation.

### Implementation and qualification for User Story 6

- [ ] T043 [US6] Complete independent feedback and retry composition in `apps/mobile/src/features/sporting/screens/club-screen.tsx`, `team-screen.tsx`, `pool-screen.tsx`, `match-screen.tsx` and their actual tab components, making T041 pass with F13 shared feedback. Preserve authorized prior sections on ordinary errors, distinguish absence/NotFound/unavailability and keep return/retry usable in French; no generic screen-state framework or optimistic empty fallback.
- [ ] T044 [US6] Bind match focus/foreground/manual reads and current-context cancellation in `apps/mobile/src/features/sporting/api/consultation-queries.ts` and `screens/match-screen.tsx`, making T042 pass. Apply known F02/F05/F11/F12 restrictions to retained representations and cancel inappropriate work without inventing a new push/suppression registry; reject stale results even if cancellation loses a race. Maintain T029's independent retained-calendar policy and ordinary bounded failure without reconnect replay.
- [ ] T045 [US6] Execute real owner-boundary cases in `apps/mobile/src/features/sporting/__tests__/sporting-recovery.test.tsx` and `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes` with implemented F02/F05/F09/F11/F12. Verify guest/free/paid/gifted/unknown/expired maps/full club calendars never wait for Pro, F11 alone controls advertising and current permissions still govern actions. Use actual F06 changed-follow reset integration when available: it is distinct from ordinary same-context refresh and retains its owning semantics, not a duplicate F03 reset mechanism.
- [ ] T046 [US6] Qualify native partial/degraded/navigation states against exact approved owner references and F13 T073 through `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes`. Cover both platforms/system themes, live appearance changes, narrow layout, large French text, VoiceOver/TalkBack, reduced motion, focus/back and result-unavailable meaning without color alone. Reuse T040 map and T058 document evidence as those slices become available; no screenshot/Jest result certifies unexecuted native behavior.

**Checkpoint**: Honest recovery and restriction precedence hold across actual consumers; remaining map/document/provider evidence stays attached to its own task.

---

## Phase 8: User Story 5 — Open a stream or official document (Priority: P2)

**Goal**: Open permitted stream links and three qualified PDF kinds without changing sporting authority or retaining an archive.

**Scope**: A23–A26; FR-005–006, FR-014, FR-019, FR-025–028, FR-031, FR-033–035; SC-006.

**Independent Test**: Cross each reference with current visibility/result finality, then failed supplier reads and cancelled native downloads. Information remains result-independent; scoresheet/statistics require a definitive result. Direct temporary reading works on both platforms without another reader application.

### Tests and qualification cases for User Story 5

- [ ] T047 [P] [US5] Write failing stream/action tests in `apps/mobile/src/features/sporting/__tests__/match-links.test.tsx`: “Stream link” before/after time/result changes, no inferred live/replay status, exact professional versus F08 contributed version, usable official FFVB calendar destination and absent/failed opening. F11 owns eligible stream/resource advertising transitions; document reads, back, refresh and reporting add no placement. Retain return/retry and the applicable exact-version report/F10 journey without resolving a displayed contribution silently to a newer one.
- [ ] T048 [P] [US5] Write failing document eligibility/MVC tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/MatchDocumentsWebMvcTest.java` for `information`, `scoresheet`, `statistics`, professional-only statistics, definitive/provisional/unconfirmed/withdrawn result and hidden/dateless/missing-reference cases. A published official result is definitive unless F02 supplies contrary evidence; special notation or elapsed Completed alone does not qualify. Verify current access/no-store, PDF success, NotFound for ineligible reference versus safe unavailable supplier failure, and refusal of arbitrary client URLs.
- [ ] T049 [P] [US5] Write failing bounded supplier tests in `apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/MatchDocumentClientTest.java` with synthetic HTTP fixtures: FFVB information form POST fields `wss_saison`/`codmatch`/`codent`, qualified amateur scoresheet and actual professional PDF URL, approved redirects, HTML masquerading as PDF, valid PDF served as octet-stream, timeout and oversized body. Confirm HTTP happens outside SQL transactions and logs/errors expose neither provider bodies/URLs nor personal content; no guessing, archive, automatic retry or URL-renewal path.
- [ ] T050 [P] [US5] Write failing temporary-reader tests in `apps/mobile/src/features/sporting/__tests__/match-document-reader.test.tsx` using actual F13 cancellable binary transport with controlled file/native boundaries: PDF bytes bypass JSON, renderer receives only a local URI, partial write/error/close/session restriction cancels and cleans up, obsolete completion cannot reopen, and cold start removes only this feature's leftover temporary PDFs. Cover retry and match-context return, with no automatic reopen, export or promised offline access.
- [ ] T051 [P] [US5] Prepare source/reference and native PDF cases in `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes`, including F01/F02 exact scoped document-code qualification, ambiguous/missing mappings, rescheduling and unsupported historical coverage. Prepare the declared PDF/blob/config-plugin combination against Expo 58/RN 0.88, both native platforms and termination/cold-start cleanup; distinguish fixture evidence, authorized real source reads and native compilation/rendering.

### Implementation and qualification for User Story 5

- [ ] T052 [US5] Implement available link/document actions in `apps/mobile/src/features/sporting/components/match-links.tsx` and connect `screens/match-screen.tsx`, making T047 pass with generated current actions and existing platform/navigation owners. Keep F08's exact contribution identifier beside its displayed link, F11's one accepted-opening boundary and F10's existing report form; no video monitor, live badge inferred from time, new contribution permission or extra advertising trigger.
- [ ] T053 [US5] Implement current document eligibility/reference reads in `apps/backend/src/main/java/com/blockout/backend/sporting/application/ReadMatchDocument.java` and reuse them in `ReadSportingResources.java` action projections. Preserve “Information is result-independent; scoresheet/statistics delivery also requires a definitive result. No PDF body retained.” Read current F02 facts/reference in a short transaction before external fetching, keep provider locators private and expose only backend document subresources. Do not reimplement F01 association or infer missing/withdrawn references from retrieval failures.
- [ ] T054 [US5] Implement `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/MatchDocumentClient.java` and canonical binary delivery through `api/ConsultationController.java`, making T048/T049 pass with configured bounded native HTTP and PDF validation. Use the accepted reference's form context or published URL, validate origins/redirects and decoded-size bounds, and return ordinary safe errors without source payloads. No network call spans SQL, no durable PDF/job/renewal workflow exists and no unqualified URL is relayed.
- [ ] T055 [US5] Implement document download and temporary-file lifecycle in `apps/mobile/src/features/sporting/api/match-document.ts`, using the F13 shared transport's cancellation/binary behavior and compatible Expo FileSystem cache byte writes/deletion. Make T050 pass by removing files on close/failure and feature-owned leftovers at cold start through `apps/mobile/src/app/_layout.tsx`; cancel known-inappropriate work and reject obsolete completion. Keep one active reading context without a persistent catalogue, SDK-owned download, export or offline collection; do not clear unrelated application files.
- [ ] T056 [US5] Add `react-native-pdf` 7.0.5, the examined `react-native-blob-util` 0.25.1 and published compatible config plugins 14.0.2 from the accepted research in `apps/mobile/package.json`, the existing lockfile and `apps/mobile/app.config.ts`. Implement `apps/mobile/src/features/sporting/components/match-document-reader.tsx` around the native renderer with T055's local URI only, direct in-app reading, close/return and ordinary retry/reporting. Never rely on the renderer's remote download/cache cleanup; verify native compilation during construction and complete T058 physical-device compatibility before accepted adoption, with no implicit upgrade, fork or platform-minimum change.
- [ ] T057 [US5] Execute T051's reference cases against actual F01/F02 generated integration using `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes`, reusing F01 T034/T037/T040 and F02 T027/T030/T032/T034. Verify exact season/championship/team/date associations, unique document-only XML code, reschedule retention, explicit named withdrawal, current-only historical limits and independent schedule/result/sets/document freshness/order. F01 retains ordinary form navigation and once-per-eligible-pass acquisition; F02 retains per-match acceptance. Authorized real reads add scoped evidence, not raw public PDFs or another collector implementation.
- [ ] T058 [US5] Execute the native PDF/library and source relay cases from `specs/007-sporting-consultation/quickstart.md#scenarios-and-expected-outcomes` with actual generated binary responses, native builds and physical iOS/Android. Verify all three kinds, POST/redirect/media validation, cancellation, partial files, close/failure, app termination/cold-start cleanup and preserved match context without another reader application. Compare only approved Blockout document actions to Figma; PDF contents/native renderer/provider interfaces are excluded from mockup evidence. Report incompatibility to the affected decision before adoption and leave unexecuted proofs pending.

**Checkpoint**: Stream and document eligibility are explicit; actual relay/native lifecycle evidence qualifies reading without an archive, offline promise or changed source authority.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile actual commands, evidence and owner boundaries without expanding the feature.

- [ ] T059 Review touched code in `apps/backend/src/main/java/com/blockout/backend/sporting/` and `apps/mobile/src/features/sporting/` for applicable Java/React/native/code-documentation/testing guidance and useful safe diagnostic ownership. Keep DTO/entity boundaries, native Query/map/PDF mechanisms, no personal/provider payloads or duplicate error logs, and no speculative recovery, cache, batch dispatcher, performance or availability programme; update actual operational configuration guidance in `infra/operations/README.md`.
- [ ] T060 Run the actual generation/backend/PostgreSQL/mobile/affected-consumer tests, formatting/typecheck and build commands declared in `README.md`, plus Expo Doctor and the relevant native builds for map/PDF configuration. Prove deterministic ignored generation, canonical schema/enum/date/binary handling and actual query isolation; documentation/OpenAPI checks and diff hygiene do not replace these future runtime tests.
- [ ] T061 Reconcile all A01–A34, FR-001–036 and SC-001–008 against `specs/007-sporting-consultation/quickstart.md` and normal delivery evidence, linking actual F01/F02/F06/F08/F10/F11/F12/F13 integrations without copying their task catalogues. Keep unavailable native/source/privacy/consumer evidence unchecked, state scope of fixture/device observations and preserve existing design gates. No provider activation, production change or new permission follows from completing the documentary task breakdown.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup/foundation**: T001 then T002; T003/T004 can run together before T005. F13 generation/transport and F02's bounded owner-read inputs are immediate prerequisites, not full shared operations or complete acquisition deployment.
- **US1**: T006–T009 can run together; T010 implements the shared classification before T011–T013 resource projections/adapters, then T014–T016 bind actual responses. T017/T018 need the relevant implemented owners; controlled early tests do not certify them. Full later-story tabs are not required to establish the resource/navigation MVP.
- **US2**: T019/T020 can run together, followed by T021/T022. T022/T023 complete real grouping through US3 T028 rather than introduce a second query. This does not block writing or implementing US3's calendar increment.
- **US3**: T024–T027 prepare distinct cases. The US1 T010 classification precedes T028; T029 precedes T030 and T031 actual integration. Shared resource projections consume classification without acquiring a second sporting authority.
- **US4**: T032–T035 can run together. T036 supplies actual table/participant reads; T037 and T038 modify different files. T039 needs T036/T038 and shared UI; T040 qualifies the real native map package and configured environment.
- **US6**: T041/T042 can run together after foundation and use the implemented US1–US4 slices. T043/T044 complete their behavior, T045 uses actual relevant owners and T046 qualifies accessible native states incrementally. Document coverage is completed with US5 T058, not falsely passed earlier.
- **US5**: T047–T051 can run together after foundation. T052 consumes actual match/current-link data; T053 precedes T054, and T055 precedes T056's local-URI reader. T057 needs real F01/F02 acceptance, while T058 needs the integrated native library/relay and authorized qualification environment. Source/native limitations block only the affected adoption, not unrelated read work.
- **Polish**: T059–T061 reconcile delivered slices and pending evidence; they cannot convert an unexecuted native/provider test into completion.

### Cross-Feature Ownership

- [F02](../002-sporting-data/tasks.md) owns identities (F02 T008–T011), facts/results/references (F02 T030–T032), current visibility/public inputs (F02 T037–T040) and effective presentation/contact/location (US6). F03 consumes immutable owner inputs and uses cohesive JPA projections inside the sporting module; it creates no new persistence or duplicate visibility rule. Real projection qualification requires the relevant owner slice, not F02's full future notification/native qualification.
- [F01](../001-source-acquisition/tasks.md) owns document acquisition/association, source transport and collection cadence. F03 qualifies reference consumption and on-demand delivery; it does not copy collector tasks or introduce another scheduler/source authority.
- [F13](../003-shared-quality/tasks.md) owns generated APIs, ordinary no-replay transport, shared Query/session binding and tokens/theme/controls. F13 T067–T069/T071 precedes UI adoption; F13 T040 with F05/F14 supplies real session/bypass isolation. Its backup/production operations are not prerequisites for isolated public-query development.
- [F06](../009-following-personal-feed/plan.md) owns follow/count/actions and the personal feed, consuming F03 calendar semantics/components. Confirmed follow changes reset personal traversal under F06; they do not change F03's successful-only ordinary refresh. [F08](../010-live-contributions-moderation/plan.md) owns exact contributed versions/reporting/moderation; F03 publishes only the applicable URL/version and refreshes match detail through its existing policy.
- [F05](../005-accounts-identity/tasks.md) owns current account/session, [F09](../006-pro-subscriptions/tasks.md) entitlements, [F11](../004-advertising-privacy-legal/tasks.md) advertising/privacy, [F12](../013-administration-app-configuration/tasks.md) admission/permissions and [F10](../012-reports-feature-suggestions/plan.md) the private support form. F03 integrates their public boundaries without adding a Pro gate, new mutation privilege or another report process.

### Parallel Examples by Story

- **US1**: T006 MVC, T007 PostgreSQL, T008 native-component and T009 classification tests are separate work. T010 supplies common classification before T011/T012/T013 model → application → API integration.
- **US2**: T019 formatting and T020 database grouping tests can run together. Complete the latter through T028's actual implementation.
- **US3**: T024 PostgreSQL pagination, T025 MVC, T026 Query and T027 UI tests can proceed together; they reuse US1 T009/T010 classification evidence before actual query/rendering integration.
- **US4**: T032 backend, T033 standings, T034 map behavior and T035 native-case preparation are distinct files. T037 standings rendering and T038 native map setup can proceed together once their prerequisites hold.
- **US6**: T041 recovery/context and T042 match lifecycle tests can run together. Serialize their shared screen/query changes before native integration.
- **US5**: T047 links, T048 eligibility, T049 supplier transport, T050 file lifecycle and T051 native/source-case preparation are separate work; they do not authorize parallel provider mutations.

Serialize edits to shared controllers/projections/read adapters, mobile screens/query files/root composition, package/configuration files and quickstart/operations instructions across stories. A story label does not make a shared file safe for parallel edits.

## Implementation Strategy

1. Establish the bounded foundation and US1 public resource/navigation MVP against controlled then actual F02 inputs. Keep later tabs/actions explicitly conditional on their implementations.
2. Add US2 time presentation and US3 one complete calendar query/retained refresh; demonstrate their combined date/time and PostgreSQL cases before broadening consumers.
3. Add US4 native maps/official standings and US6 honest recovery, then US5 qualified stream/PDF delivery. Reuse shared owners and the native mechanisms selected by the plan.
4. Execute real generated-consumer, database, iOS/Android, source and embedded-owner qualifications incrementally, reusing identical evidence. Keep unexecuted prerequisites visible and reopen only demonstrated compatibility/decision failures; no implicit upgrade, fork or recovery system substitutes for an accepted requirement.
