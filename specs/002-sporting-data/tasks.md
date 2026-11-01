---
description: "Implementation tasks for F02 sporting identity, integration and lifecycle"
---

# Tasks: Sporting identity, integration and lifecycle

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts and [constitution](../../.specify/memory/constitution.md). [F13 tasks](../003-shared-quality/tasks.md) own workspace, generation, transport, schema lifecycle and shared controls.

**Tests**: The specification requests A01–A39 and SC-001–SC-007 qualification. Write the included automated tests first and demonstrate meaningful failures before the associated implementation. Prepare manual/native cases before running them with their actual authorized inputs. Test doubles establish only their controlled boundary.

**Organization**: Setup and the bounded foundation precede six specification story phases, US1–US5 at P1 and US6 at P2. F02 owns accepted sporting truth and its editors; acquisition, public consultation, discovery, personal relationships, notifications, moderation, permissions and transition retain their owners.

## Format: `[ID] [P?] [Story] Description`

- **[P]** means distinct-file work that may run together after its stated prerequisites.
- **[USn]** maps to the specification's story number.
- Paths identify implementation or its qualification source. Checked tasks record completed scope; remaining work stays unchecked.

## Path Conventions

- Backend: `apps/backend/src/main/java/com/blockout/backend/sporting/`, with `api`, `application`, useful `domain` values and `infrastructure`; tests mirror those packages under `src/test/java/`.
- Schema: F02's populated changes in `apps/backend/src/main/resources/db/changelog/sporting.xml`, included by F13's master. Follow the mutable-baseline/freeze policy; no separate migration mechanism.
- Mobile: `apps/mobile/src/features/sporting-administration/`; thin routes under `apps/mobile/src/app/administration/`. F12 owns shared administration entry/admission, while F03 owns public sporting screens.
- Canonical schemas/operations remain in `contracts/http/{ingestion,mobile}/sporting/` and `contracts/http/common/`. Generated interfaces, DTOs and clients remain ignored build outputs under F13; no handwritten transport mirrors.

The quoted data-model constraints below remain literal. Concrete Java classes group coherent use cases; do not create empty packages, generic services or one class per endpoint.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Consume the shared executable foundation without recreating it.

- [x] T001 Verify the F13 T001–T017 foundation through `README.md`, `apps/backend/pom.xml`, `apps/collector/pom.xml` and `apps/mobile/orval.config.ts`: generated canonical consumers compile, PostgreSQL tests run, migrations are explicit and generated output stays ignored. Wait only for this bounded foundation, not F13 deployment/restoration completion.
- [x] T002 Configure only the F02-required MapStruct mapping/annotation processing in `apps/backend/pom.xml` under F13's accepted versions and existing Maven conventions; keep application values, transport DTOs and JPA entities distinct, and update actual F02 test commands in `README.md` when executable work first lands.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Qualify the common F02 generated presence/mapping boundary before building sporting stories.

- [x] T003 [P] Write failing generated binding/mapping tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingObservationMapperTest.java` for omitted/null/value, nested strict requests, additive responses, enums and dates using the existing ingestion schemas; preserve required identity/context separately from optional facts and use test-scoped adapters rather than production fixture endpoints.
- [x] T004 [P] Write failing real-consumer serialization cases in `apps/collector/src/test/java/com/blockout/collector/ingestion/SportingContractIntegrationTest.java` and `apps/mobile/src/features/sporting-administration/__tests__/sporting-contract.test.ts` against the canonical generated consumers and a controlled transport; cover undefined versus explicit null, safe errors and malformed known fields before cache admission.
- [x] T005 Implement presence-aware boundary mapping in `apps/backend/src/main/java/com/blockout/backend/sporting/api/SportingObservationMapper.java` using the supported F13 mapper configuration and generated nullable support; make T003–T004 pass without generated-template edits, scalar state wrappers or default values turning omission into a proposal. Keep field decisions in the owning application use cases.

**Checkpoint**: F02's generated shapes and presence mapping are usable. Domain implementation can begin; integrated HTTP operations are qualified in their story, not inferred from these isolated checks.

---

## Phase 3: User Story 1 — Recognize the same sporting resources (Priority: P1) 🎯 MVP

**Goal**: Establish stable contextual identities without guessed clubs, participants or cross-season transfers.

**Independent Test**: Execute A01–A05 and SC-001 with controlled calendars: repeated teams, postponed matches, two seasons, significant label changes, LNV teams without clubs, unavailable club pages and recognized byes. Preserve IDs/relations and isolate unresolved mappings.

### Tests for User Story 1

- [x] T006 [P] [US1] Write failing identity cases in `apps/backend/src/test/java/com/blockout/backend/sporting/domain/TeamNameTest.java` and `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/EstablishMatchIdentityTest.java`; cover A01–A05, contextual aliases, normalization limited to case/spaces/apostrophes, meaningful accents/digits/dots/hyphens, established LNV references through label changes and no team creation from standings or future places.
- [x] T007 [P] [US1] Write failing PostgreSQL identity tests in `apps/backend/src/test/java/com/blockout/backend/sporting/infrastructure/SportingIdentityIntegrationTest.java`; verify unique qualified season start years, compound provider keys, leading-zero club references, compatible multi-pool participation, postponed/repeated encounters and concurrent club-creation conflict rollback without inferred merges.

### Implementation for User Story 1

- [x] T008 [US1] Add the occupied identity schema/entities and use-case persistence port in `apps/backend/src/main/resources/db/changelog/sporting.xml`, `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/` and `apps/backend/src/main/java/com/blockout/backend/sporting/application/port/SportingStore.java`. Include the minimal Division identity/name/active state, division/format/gender classification fields and owner relations needed by team/pool keys and division search terms here; US1 database tests must not wait for US2 command implementation. Preserve the model constraints: Season “Stable UUID, unique qualified start year, canonical label; F01 lifecycle/bindings referenced”; Club “unique provider/reference association” and “Reference strings preserve leading zeros. No name/address merge; no automatic disappearance from page failure.”; Pool “UUID, unique provider/season/competition/tour/group native context”; Team “FFVB key uses club/classification/normalized name in the season. LNV key uses native TeamID within season/championship; club optional. No cross-season transfer.”; Participation “Unique team/pool pair and current presence”; Match “No pair/date identity. Dateless state retained but not public. No fictitious opponent.” Use owner foreign keys and JPA, not a second F01 season model.
- [x] T009 [US1] Implement exact comparison and scoped aliases in `apps/backend/src/main/java/com/blockout/backend/sporting/domain/TeamName.java` and `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/EstablishMatchIdentity.java`; retain source labels independently, bind aliases to known club/team/pool plus provider/season/competition context, and preserve “uniqueness within that context”. Keep division search terms “unique within the division”; no approximate matching, alias UI or historical name store.
- [x] T010 [US1] Implement canonical season and calendar identity establishment in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeCollectionSeasons.java` and `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/EstablishMatchIdentity.java`; reuse a club identified by its exact reference without waiting for its page, require established FFVB club association, allow qualified clubless LNV teams and reject unverified participant replacement locally. A technical professional club attachment changes neither keys nor follows and never propagates between seasons.
- [x] T011 [US1] Expose immutable owner-controlled identity/context reads in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ReadSportingData.java` for F01/F03/F04/F06, making T006–T007 pass; keep provider references, accepted classification and current acquisition settings distinct, and expose no mutable entities, repository or new public route. The later visibility tasks complete public-read eligibility.

**Checkpoint**: Identity establishment passes its independent cases through the application boundary. This is a bounded MVP; HTTP calendar acceptance and public presentation still require their owning increments.

---

## Phase 4: User Story 2 — Correct classifications without losing continuity (Priority: P1)

**Goal**: Apply complete, authorized classification corrections and explicit division lifecycle without replacing identities.

**Independent Test**: A06–A10 / SC-002 retain identities and presentation in conflict-free corrections, refuse whole conflicting requests, distinguish missing acquisition classification from retained published state, and lift division inactivity only explicitly.

### Tests for User Story 2

- [x] T012 [P] [US2] Write failing contract/security cases in `apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingClassificationWebMvcTest.java` and `DivisionAdministrationWebMvcTest.java` for pack/pool GET/PUT, division GET/POST/activity PUT, required complete state, current F12 permissions, no-store, Bearer 401, safe conflicts with scoped IDs, stale revisions, 415 and division 201 Location.
- [x] T013 [P] [US2] Write failing database cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ClassificationIntegrationTest.java` and `DivisionIntegrationTest.java` for A06–A10: all-or-none shared-participation/target-key conflicts, removing/restoring classification, collection races, duplicate division names, inactivity and grant-revocation ordering. No-op writes preserve revision; stale no-ops are refused.
- [x] T014 [P] [US2] Write failing semantic form cases in `apps/mobile/src/features/sporting-administration/__tests__/classification.test.tsx` for complete override/inheritance, conflicts, explicit division lifecycle, unavailable inactive choices, preserved dirty input and read-current-state recovery after uncertain writes; use F05/F12 boundaries and generated clients.

### Implementation for User Story 2

- [x] T015 [US2] Extend the classification/division persistence established in T008 for correction and lifecycle commands in `apps/backend/src/main/resources/db/changelog/sporting.xml` and `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/`; preserve Division “UUID, case-insensitive unique name, colors/logo, explicit active state and editing revision” and “Presentation does not reactivate. Inactive choices cannot be newly assigned.”; Pool “Complete override contains division/format/gender together. Missing acquisition mapping preserves published classification.” Use the canonical `6x6`, `4x4`, `2x2` and `female`, `male`, `mixed` values without inferring beach or age groups.
- [x] T016 [US2] Implement atomic correction in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeSportingClassification.java` and the owning `SportingStore.java` adapter: season-first locks, active-division check in the transaction, all affected participations/target keys validated before changes, stable UUIDs and complete refusal with conflicting scopes. Removing settings preserves published classification/visibility; a refused restoration cannot resume collection. F01 owns subsequent cycle eligibility.
- [x] T017 [US2] Implement division creation/activity in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeDivisionLifecycle.java` and classification/division generated-interface adapters in `apps/backend/src/main/java/com/blockout/backend/sporting/api/`; take domain roots before F05 account locks, recheck current F12 action grants, reject stale revisions, and preserve state/revision on matching no-ops. Use the canonical read-grant alternatives and separate presentation from lifecycle; add no grant-management API.
- [x] T018 [US2] Implement the existing classification and division creation/activity journeys in `apps/mobile/src/features/sporting-administration/screens/classification-screen.tsx`, `screens/divisions-screen.tsx`, `forms/classification-form.tsx` and `api/classification.ts`, with thin routes in `apps/mobile/src/app/(operations)/administration/`; make T012–T014 pass with React Hook Form/Zod, generated Query functions, explicit retry and F12 admission. Division name/color/logo editing shares the US6 presentation implementation, not a second form/save path.

**Checkpoint**: Backend classification/lifecycle and the corresponding mobile interaction pass independently. Integrated current grants require F05/F12; accepted appearance and device behavior are qualified with US6.

---

## Phase 5: User Story 3 — Receive useful updates despite isolated failures (Priority: P1)

**Goal**: Accept useful matches independently and refuse stale/global-invalid work without converting failure into absence.

**Independent Test**: A11–A15 / SC-003 preserve 99 usable matches out of 100, leave the failed match unchanged, reject wrong global context and old whole observations, and reconcile no absence from partial processing.

### Tests for User Story 3

- [x] T019 [P] [US3] Write failing request/outcome tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingIngestionWebMvcTest.java`; cover all canonical ingestion envelope shapes, 8-MiB JSON refusal, the 1,000-entry combined calendar bound, wrong-environment/mobile credentials, current cycle scope and safe per-item outcomes. Verify first-occurrence match-reference ordering followed by input-order acquisition failures, no context-slot result, no 207/job response and no truncation.
- [x] T020 [P] [US3] Write failing transactional calendar/catalog cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/CalendarAcceptanceIntegrationTest.java`; cover 99/100 partial success, identical/contradictory duplicates, atomic source-season catalog replacement with positional results, qualified empty versus incomplete input, superseding calendars between commits, older late fields, current classification and F01 incarnation replacement waiting for domain commits.

### Implementation for User Story 3

- [x] T021 [US3] Persist current order/freshness and catalog references in `apps/backend/src/main/resources/db/changelog/sporting.xml` and `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/`; preserve “A collection token is `(cycleOrder, readOrdinal)`, validated against F01's authorized cycle context.” and “Keep the latest accepted token on each replaced scope.” Include current/completed calendar order, current qualified entry/detail URLs and independent observation times plus optional source publication time per accepted group; retained groups keep their own attribution and newly accepted facts without a publication time remain unknown. Verify a supplied publication timestamp never changes logical precedence; no observation log, stored payload, checkpoint or provider-publication timestamp inference.
- [x] T022 [US3] Implement catalog acceptance in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptCatalog.java`: validate complete source-season scope and compound duplicate identities before one transaction, return positional results even for identical duplicates, and retain earlier qualified references on invalid/stale discovery. Use F01's current-runtime shared fence through commit and canonical season services; never make calendar matches part of this catalog transaction.
- [x] T023 [US3] Implement the nontransactional calendar loop and separately proxied match transaction in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptCalendar.java` and `AcceptMatchObservation.java`; globally validate first, collapse identical references, isolate contradictory/unassociated/failed items, and retain independently committed successes. Before every match commit hold F01 runtime fence → season → needed control/cycle → division/match/club roots in owner order; sorted IDs within a kind, then account locks if needed. Check current pool order and accepted match order; no earlier-kind lock or provider call follows those locks.
- [x] T024 [US3] Implement guarded calendar completion in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptCalendar.java`; only the still-current complete, correctly contextualized, fully successful calendar finalizes absence. Recognize already completed repeats, reject superseded late identity/participation creation and retain useful successes on failed completion. Implement the visibility effects with US5; ordinary later collection is the recovery path, with no automatic aggregate replay.
- [x] T025 [US3] Implement the corresponding canonical catalog/calendar/detail ingestion adapters and focused total-entry/context validation in `apps/backend/src/main/java/com/blockout/backend/sporting/api/SportingIngestionController.java` and `SportingObservationValidator.java`; make T019–T020 pass using generated types, shared safe errors/headers and immutable application outcomes. Keep structural whole-request rejection distinct from local permission/eligibility rejection that preserves earlier matches; extend the same adapter for US4/US6 operations as their services become available.
- [x] T026 [US3] Qualify the F01 collector-to-F02 application boundary through `specs/002-sporting-data/quickstart.md#identities-and-useful-partial-success` and `#ordering-and-transactions`; verify admitted order allocation before reads, trusted initial-import context, no write after incarnation replacement and uncertain-response handling with the real F01 implementation. Log only safe source/season/pool/match scope, time, outcomes and reasons through F13; acquisition success is not complete integration.

**Checkpoint**: Useful partial success and stale-work protection have database evidence. F01 integration and US5 absence effects remain explicit dependencies of the full acceptance, not permission to install permissive production doubles.

---

## Phase 6: User Story 4 — Read official results and standings (Priority: P1)

**Goal**: Preserve authoritative results, time precision, independent freshness and official tables, coordinating real internal announcement effects.

**Independent Test**: A16–A25 / SC-004–SC-005 select only the designated source, preserve usable overall results despite invalid sets, handle withdrawal and unknown time, retain unmatched official rows and never calculate substitute scores/ranks.

### Tests for User Story 4

- [x] T027 [P] [US4] Write failing result/time/document cases in `apps/backend/src/test/java/com/blockout/backend/sporting/domain/MatchFactsTest.java` for LNV-only professional authority, final/provisional/unconfirmed states, `F`, `P`, `3/F`, `3/P`, `F/F`, `2/F`, incompatible/retained sets, result withdrawal and old whole observations. Include date-only/dateless, FFVB 00:00, Europe/Paris DST ambiguity and qualified document-code continuity without sporting cross-provider fallback.
- [x] T028 [P] [US4] Write failing standings/detail cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/MatchDetailsAndStandingsIntegrationTest.java`; verify detail enriches known matches only, scope order and independent group freshness, atomic table replacement, qualified non-publication versus a published empty table, retained table/freshness on failure or non-publication, stale and contradictory absence rejection, supplied/unknown publication timestamps, official order/labels/nonnumeric ratios and unlinked rows without team creation or participation restoration.
- [x] T029 [P] [US4] Write failing cross-owner transaction cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/ResultAnnouncementIntegrationTest.java`; use the real F07 inbox/consumed-fact and F08 publication boundaries in the same delivery increment as F08 T006/T008/T012–T014 and F07 T013/T014/T053–T057. Race final-result acceptance with publication, fail required inbox persistence, fail push after commit, and cover zero-recipient processing, initial finished discovery/reconstruction, correction, withdrawal/restoration and purged entries without renewed announcement allowance.

### Implementation for User Story 4

- [x] T030 [US4] Add actual result/time/standings/document persistence in `apps/backend/src/main/resources/db/changelog/sporting.xml` and `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/`; preserve Match “local date/time/zone, optional resolved instant” and Official standings “One current table per pool, source/freshness, ordered rows with official position/name/stats and optional team association” with “Atomic table replacement; preserve unmatched rows and nonnumeric ratio meanings. No team creation or rank recomputation.” Retain the latest qualified standings publication state separately from any still-usable table, following the owning data-model rules. Retain no PDF bytes or scalar history.
- [x] T031 [US4] Implement owned fact decisions in `apps/backend/src/main/java/com/blockout/backend/sporting/domain/MatchFacts.java` and integrate them into `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptMatchObservation.java`; preserve “Previously accepted compatible sets keep their own observation time; incompatible sets are unavailable.” and “Result withdrawal clears its sets, with the same match UUID.” No universal set threshold, elapsed-time finality or invented numeric special result; omitted/invalid fields and qualified withdrawal stay distinct.
- [x] T032 [US4] Implement existing-match detail and whole-table standings services in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptMatchObservation.java` and `AcceptStandings.java`, then connect their canonical operations in `api/SportingIngestionController.java`, including publication-state/array validation and F03 retained-table/absence semantics; make T027–T028 pass with current per-scope ordering and F01 transaction fencing. Preserve qualified information-sheet code through rescheduling and independent document freshness; F03 owns public eligibility/download and F01 owns auxiliary acquisition.
- [x] T033 [US4] Join the actual F07 synchronous announcement application call to `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptMatchObservation.java` under the same match transaction/lock used by F08 publication; supply previous/current result, trusted reconstruction context and designated-source time. F07 reads the current public link and owns audience/inbox/consumed facts. Hold sorted account locks after sporting roots; internal failure rolls back this match only, and external push occurs after commit without an outbox. Make T029 pass; no no-op production notification adapter is a completed integration.
- [x] T034 [US4] Execute generated backend/collector and F03 read-consumer qualification for result enums, partial facts, unknown timestamps, special notation, document references and official rows using `specs/002-sporting-data/quickstart.md#ordering-and-transactions` and `#contracts-and-fields`; preserve provider-observed versus synthetic evidence labels and the accepted limitation that a later supplier read may contain older publication content. Evidence: [generated facts and public reads](quickstart.md#generated-facts-and-public-reads-t034).

**Checkpoint**: Result and standings decisions pass locally; full result acceptance requires real F07/F08 participation and F03 read qualification. No push receipt or supplier-wide coverage guarantee follows from these tests.

---

## Phase 7: User Story 5 — Understand disappearances and recover retained history (Priority: P1)

**Goal**: Derive current visibility from independent reasons while preserving history, identity and relationships.

**Independent Test**: A26–A32 / SC-006 distinguish catalog absence, one qualified empty current calendar, item absence, inactivity, pause and season closure. Reappearance clears only its own reason; hidden direct links and follows do not bypass restrictions.

### Tests for User Story 5

- [x] T035 [P] [US5] Write failing visibility/history tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingVisibilityIntegrationTest.java`; cover A26–A32, another visible team participation, clubs between seasons, catalog rediscovery after calendar emptiness, wrong-season/partial input, normal versus historical empty input and the single already-running cycle permitted at closure.
- [x] T036 [P] [US5] Write failing owner-consumer cases in `apps/backend/src/test/java/com/blockout/backend/sporting/application/service/ReadSportingDataTest.java` for hidden/dateless targets, current effective values and F04 affected-scope notifications; preserve retained identities/follows and official unlinked standings labels, never hydrate public reads directly from stale projections.

### Implementation for User Story 5

- [x] T037 [US5] Persist independent presence reasons and implement current visibility in `apps/backend/src/main/resources/db/changelog/sporting.xml` and `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ReadSportingData.java`; preserve “Current catalog absence, qualified calendar emptiness, match/participation absence and division inactivity are distinct reasons.” and Participation “Withdrawal retains relation. Other visible participation keeps the team usable.” Derive visibility through relations; do not persist a universal copied flag or hide clubs due to team/division state.
- [x] T038 [US5] Complete catalog/calendar absence and reappearance in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptCatalog.java` and `AcceptCalendar.java`; a qualified current empty calendar hides pool/matches/participations once, nonempty success can withdraw individual missing items, and historical empty reconstruction preserves history. Rediscovery clears catalog absence only; details/standings never restore presence. Make T020/T035 pass with US3's finalization guards.
- [x] T039 [US5] Integrate F01 season lifecycle with `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeCollectionSeasons.java` and acceptance services; preserve “No season inferred from a postponed match date; closed history retained.” F01 owns activation/closure/admission and bindings; refuse new acquisition after closure, allow only its already-running context to finish once, and retain independent hiding reasons/history. No duplicate season endpoint or reopened historical cycle.
- [x] T040 [US5] Complete F02's immutable public-input/current-viewability projections and after-commit affected-scope handoff to F04 in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ReadSportingData.java` and `SportingProjectionChanges.java`; changes to names/aliases/city/classification/relations/visibility reach dependent teams/pools, while score-only changes do not. F04 owns scheduling/rebuild/recovery; publish IDs/scopes, not copied personal values or a durable queue. Make T036 pass.
- [x] T041 [US5] Run current-visibility integration with implemented F03/F04/F06 using `specs/002-sporting-data/quickstart.md#presentation-contacts-and-continuity`: ordinary lists/search/calendars/feed and old links refuse hidden targets before index catch-up, retain follows without transfer, and restore only eligible resources. Keep consumer UI/projection implementations in their owners. Exercise T053 source/manual/restriction/locality/logo changes through actual F04 reindex and F03 effective presentation, including inherited logos and unchanged-context geocoding avoidance. Evidence: [current restrictions and presentation](quickstart.md#t041-current-restrictions-and-presentation).

**Checkpoint**: Current truth and retained history have F02 evidence. Public surfaces are accepted only with their implemented consumers, not from an isolated read-service test.

---

## Phase 8: User Story 6 — Maintain presentation and useful club locations (Priority: P2)

**Goal**: Save independent presentation/contact choices atomically, protect private fields and stale locality, and reuse accepted native editors.

**Independent Test**: A33–A39 / SC-007 preserve customizations, three independent contact modes, logo precedence and current privacy restrictions across refresh/retry/restoration; reject unauthorized changes, invalid images and obsolete coordinates. Qualify preserved V1 logos only with F14's controlled evidence.

### Tests for User Story 6

- [x] T042 [P] [US6] Write failing presentation/contact MVC tests in `apps/backend/src/test/java/com/blockout/backend/sporting/api/SportingPresentationWebMvcTest.java`; cover every canonical GET/PATCH/PUT/POST shape, JSON metadata nulls in multipart PATCH, `keep`/`automatic` refusing an image, `replace` requiring one, PNG/JPEG actual content and 5,242,880-byte limit, all-or-none invalid form saves, pool names-only full PUT, atomic contacts PATCH, stale/no-op revisions, permissions, no-store, 415 and 201 Location.
- [x] T043 [P] [US6] Write failing persistence/privacy/locality tests in `apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java`; cover A33–A38, independent name/contact overrides, restricted values through collection/return-to-source/restore, atomic bytes/association, professional/nonprofessional logo precedence, contact/grant races, effective locality revision, street-only/masked changes and late geocoding response rejection.
- [x] T044 [P] [US6] Write failing native form/transport interaction cases in `apps/mobile/src/features/sporting-administration/__tests__/presentation.test.tsx`; cover one atomic generated multipart save, automatic-logo restoration, names-only pool editing, dirty drafts during refetch, field errors, confirmed/uncertain failure recovery, current-session invalidation and action-specific access. Reuse F13's image control and transport; add no contact-correction form.
- [x] T045 [P] [US6] Prepare the native and protected-logo cases in `specs/002-sporting-data/quickstart.md#presentation-contacts-and-continuity` using the exact approved references in `plan.md#consumers-and-approved-design`; include both themes, enlarged text, narrow viewport, VoiceOver/TalkBack, focus/back/keyboard, professional optional club/map behavior and A39 certain/unresolved/missing-file cases. Keep real recovery evidence private.

### Implementation for User Story 6

- [x] T046 [US6] Add current presentation/contact/image persistence in `apps/backend/src/main/resources/db/changelog/sporting.xml` and `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/`; preserve “Full/short name customizations are independent fields.”, “Contact overrides independently represent source management, manual value or deliberate absence.” and Image “PNG/JPEG bytes, actual media type, byte size and owner association” with “Maximum 5,242,880 bytes; validated replacement and association commit together. No seasonal archive.” Keep current field restriction flags/revisions, not past personal contact values.
- [x] T047 [US6] Implement source club detail and contact correction in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeClubContacts.java`; address/city/postalCode/email/phone/website keep independent canonical `source`/`manual`/`hidden` modes. Preserve unavailable-page state, reject invalid proposals without erasing usable values, apply all supplied corrections or none, and make explicit return-to-source use only the current authorized automatic value. Current F12 permissions and revision checks precede effects.
- [x] T048 [US6] Implement the F02 field-restriction operation in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeClubContacts.java` for the existing authorized manual F11 rights procedure: lock the club, clear source/manual values, set the durable field flag and advance changed-state editing revision. Ingestion ignores restricted values, projections return null and ordinary edits cannot lift the flag. Reconcile changed locality immediately; no new rights console, person-matching engine or contact archive.
- [x] T049 [US6] Implement locality acceptance in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptClubLocality.java`; preserve “Effective municipality/postal context has a revision.” and “Changing it clears the previous point and invalidates older responses; street-only changes or source changes hidden by a manual override do not.” Validate paired bounded coordinates and current context, reject ambiguous/empty points, retain valid current points on technical failure and expose changed needs to F01. F01 alone owns IGN attempts, the one-hour deadline, pause/retry and explicit relaunch.
- [x] T050 [US6] Implement presentation/image use cases in `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/ChangeSportingPresentation.java` and `AcceptSourceImage.java`; validate complete metadata/bytes before one resource transaction, apply current grants after sporting locks, and preserve manual/source names and relevant editing revisions. Use “Professional logo resolution is manual team → accepted LNV → optional club → missing. Other teams retain manual team → club.” Store only the last valid source image; no backend URL fetch, seasonal archive or independent scheduler.
- [x] T051 [US6] Connect presentation/contact and club-detail/locality/source-logo generated operations in `apps/backend/src/main/java/com/blockout/backend/sporting/api/SportingPresentationController.java` and `SportingIngestionController.java`; use presence-aware MapStruct mappings and focused cross-field/image validation, never duplicate generated constraints. Collection writes hold current F01 fencing/order through commit; failed image submission affects no match or valid logo. Make T042–T043 pass, including selected Servlet-container multipart PATCH behavior through real runtime binding.
- [x] T052 [US6] Implement approved club/team/pool/division editors in `apps/mobile/src/features/sporting-administration/screens/presentation-screen.tsx`, `forms/presentation-form.tsx` and `api/presentation.ts`, with thin `apps/mobile/src/app/administration/` routes. Reuse generated clients, F13 image/theme/feedback, native StyleSheet and React Hook Form/Zod; retain canonical atomic forms, professional “Rétablir le logo automatique”, explicit retry after current-state read and F05 session cancellation. Make T044 pass; F12 supplies administration access, not a duplicate editor.
- [x] T053 [US6] Connect relevant source/manual/restriction/locality/logo changes to the existing `apps/backend/src/main/java/com/blockout/backend/sporting/application/SportingProjectionChanges.java` handoff and current read projections; preserve current privacy and effective inherited club logos across seasons without copying them into every team. Verify immutable current read values and the affected-identity scopes supplied to F04/F03; actual consumer reindex/presentation evidence belongs to T034/T041 after those consumers exist; do not trigger geocoding for unchanged effective context.
- [x] T054 [US6] Qualify F01 ordinary source-logo and locality submission through `specs/002-sporting-data/quickstart.md#presentation-contacts-and-continuity`; verify once-per-distinct-team passage acquisition, failed-image independence, admitted current locality revision and real contract binding. No provider operation is required merely to author these tasks; synthetic transport evidence remains labeled separately.
- [ ] T055 [US6] Run T045 on native iOS/Android with the implemented F03/F12 journeys using `specs/002-sporting-data/quickstart.md#presentation-contacts-and-continuity`; verify optional professional club navigation, partial maps, logo restoration and usable editor states against approved design. Record actual device/build evidence; browser, Jest and document checks cannot complete this task. Execute the full qualification afresh from its approved inputs; the exploratory captures retained in the [classification/division-editor qualification](quickstart.md#classification-and-division-editors) are illustrations only and provide no prior validation or partial completion credit.
- [ ] T056 [US6] Qualify F02 image reassociation with F14's separately authorized preservation/reconstruction path using `specs/002-sporting-data/quickstart.md#presentation-contacts-and-continuity`; certain exact club identities receive validated bytes as manual presentation, unresolved associations remain private, and missing files are distinguished from a retained URL. F14 owns freeze/export/reset/cutover; no guessed joins, fictional club or new import framework.

**Checkpoint**: Atomic editing, private-field protection and current locality have their actual backend/mobile evidence. Real provider/device/logo-transition prerequisites remain attached to T054–T056 until executed.

---

- [x] T072 [US6] Implement team-owned presentation revisions in `apps/backend/src/main/java/com/blockout/backend/sporting/infrastructure/`, preserving season/account/grant safeguards, current inheritance and independent classification/locality/club privacy semantics. Team editing does not lock parent artwork. Apply the retained-data drop-column migration under `apps/backend/src/main/resources/db/changelog/` without rewriting applied history or resetting data.
- [x] T073 [US6] Qualify `apps/backend/src/test/java/com/blockout/backend/sporting/application/SportingPresentationIntegrationTest.java` and persistence mappings for parent-only edit success/current fallback, own-team stale protection and precedence. Verify clean creation and retained-chain upgrade without losing artwork; record exact scoped evidence in `specs/002-sporting-data/quickstart.md`.
- [x] T074 [US6] Await Expo's native copy in `apps/mobile/src/features/sporting-administration/images/prepare-sporting-logo.ts` before preparation/handoff completes, preserving borrowed input and owned partial-file cleanup. Verify deferred completion/rejection and relevant native image preparation; record boundary limits in `specs/002-sporting-data/quickstart.md`.

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile actual commands, consumer proofs and remaining evidence without widening the implementation scope.

- [ ] T057 Update `README.md`, affected executable entries in `AGENTS.md` and `specs/002-sporting-data/quickstart.md` to the implemented commands/owner boundaries; verify safe diagnostics for accepted/rejected/partial/stale observations and correction conflicts, with no provider payloads or personal contacts. Document controlled technical alias/club/reconciliation operations in existing `infra/operations/README.md` only as needed to operate implemented use cases.
- [ ] T058 Run the actual owning backend/collector/mobile suites, contract generation/compilation, formatting and diff checks declared in `README.md`; validate all canonical F02 operations through active consumers, deterministic ignored output and each A01–A39/SC-001–SC-007 result in `specs/002-sporting-data/quickstart.md`. Follow applicable code-documentation/language/testing skills in changed handwritten files; no source-spelling tests or invented performance programme.
- [ ] T059 Reconcile incomplete qualifications and delivery state against `specs/002-sporting-data/quickstart.md` and the related owner tasks; keep blocked tests/operations unchecked, retain accepted manual recovery and the later-read/supplier-publication limitation, and present the bounded delivery without implying provider, release or production authorization.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup**: T001 uses F13's actual shared foundation, then T002 configures only active F02 needs.
- **Foundational**: T003 + T004 precede T005. Every story uses this completed boundary.
- **Stories**: US1 supplies identities. US2/US3 build on them; US4/US5 extend the same acceptance paths. US6 can prepare independent form/domain cases early but uses current owner permissions, ordering and projections before integrated acceptance.
- **Polish**: T057–T059 reconcile delivered increments and their actual evidence. They cannot turn a missing native/provider proof into a pass.

### User Story Dependencies

| Story | Immediate implementation inputs                                                                     | Actual integration/qualification prerequisites                                                                                                                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1   | F13 generated/database foundation; accepted F01 context definitions                                 | F01 lifecycle is one owner of the same canonical season; identity cases may use controlled contexts without claiming cycle-admission proof.                                                                                                                                                                                                                                                 |
| US2   | US1 identities; F05 account lock and F12 current grants                                             | F01 eligibility uses accepted classification; F12 supplies entry/admission; F13 T067–T069/T071 precedes native forms, and F05 supplies the session infrastructure. Shared presentation completes in US6.                                                                                                                                                                                    |
| US3   | US1 and current US2 classification; real F01 runtime/cycle application boundary                     | T026 needs F01 admission/fencing and actual collector serialization; full absence effects require US5. No need for all provider adapters before bounded backend tests.                                                                                                                                                                                                                      |
| US4   | US3 per-match order/transactions and established identities                                         | T029/T033 require the relevant F07 inbox/announcement and F08 match-publication boundaries, including F05 account locks/F06 audience under F07. T034 needs F03 read consumers. Do not wait for all push/device or moderation screens.                                                                                                                                                       |
| US5   | US2 independent division state; US3 guarded catalog/calendar completion                             | F01 owns closure/admission; F03/F04/F06 implement public surfaces and personal follows for T041. F04 owns its projection scheduler and repair.                                                                                                                                                                                                                                              |
| US6   | US1 identities; US2 permissions/revisions; US3 scope ordering; US5 current read/projection boundary | [F13 US6](../003-shared-quality/tasks.md#phase-9-user-story-6--use-the-application-with-the-phones-capabilities-priority-p2) T067–T071 supplies tokens/theme, controls, image field and feedback before T052; F05/F12 supplies current session/access; F11 owns rights decisions; F01 owns provider attempts; F03 owns public pages. T056 alone needs F14 controlled preservation evidence. |

All authoring inputs are available. These are implementation dependencies, not blockers on writing other owners' tasks. Read their current native tasks when available; do not invent future task IDs. Keep one owner:

- [F01](../001-source-acquisition/plan.md): acquisition, scheduler, runtime fence, admitted cycles and locality attempts. F02 owns canonical seasons/child identities and sporting acceptance.
- [F03](../007-sporting-consultation/plan.md), [F04](../008-search-discovery/plan.md), [F06](../009-following-personal-feed/plan.md): public views/documents, search and follows. Consume F02 application projections, never its repositories/entities.
- [F05](../005-accounts-identity/plan.md), [F12](../013-administration-app-configuration/plan.md): accounts/session/current grants and shared admission; no second identity/permission mechanism in F02.
- [F07](../011-notifications-delivery/plan.md), [F08](../010-live-contributions-moderation/plan.md): inbox/announcement and publication/moderation. F02 joins their same-match transaction without copying owned persistence or push delivery.
- [F11](../004-advertising-privacy-legal/plan.md), [F14](../014-v1-v2-transition/plan.md): rights handling and transition authorization. F02 applies its field restrictions/image acceptance; it does not run their public/provider operations.

### Dependency Graph

```text
F13 foundation → Setup T001–T002 → Foundation T003–T005 → US1 T006–T011
US1 → US2 T012–T018 (F05/F12 grants; F01 consumes settings)
US1 + US2 + F01 context/fence → US3 T019–T026
US3 → US4 local facts T027–T028, T030–T032
US4 local facts + real F07/F08 boundaries → T029/T033 → F03 consumer proof T034
US2 + US3 → US5 T035–T040 → F03/F04/F06 proof T041
Current F02 boundaries + F13 controls + F05/F12 → US6 T042–T053
US6 + F01 → T054; US6 + native F03/F12 → T055; US6 + F14 preservation → T056
Implemented increments and explicit remaining limits → T057–T059
```

The cross-owner tests are authored before the implementation they protect; when their real dependency is unavailable, leave integrated acceptance pending. Controlled tests are useful earlier but are not substitutes for real transaction or device evidence. Do not make complete F13 operations, all F07 push delivery or final F14 cutover prerequisites for unrelated local work.

### Within Each User Story

Tests first → model/persistence → application decisions → generated-interface adapters → consumer integration. Use meaningful failing cases before implementation, then verify the story independently. Serialize changes to the single sporting changelog, `SportingStore.java`, `ReadSportingData.java`, `SportingIngestionController.java`, acceptance services and shared quickstart; story labels do not make shared files parallel-safe.

### Parallel Opportunities and Examples by User Story

- **Foundation**: T003 + T004 use separate backend/consumer tests after generation is available; T005 follows them.
- **US1**: T006 + T007 prepare separate unit/database cases; schema and identity implementation then proceed in dependency order.
- **US2**: T012 + T013 + T014 prepare separate HTTP/database/mobile cases. Serialize the subsequent schema and shared service edits.
- **US3**: T019 + T020 prepare separate request/transaction cases. T022/T023/T024 retain their shared-state dependencies; no parallel calendar finalization is implied.
- **US4**: T027 + T028 + T029 occupy distinct tests; T029's execution awaits actual F07/F08. Serialize shared match acceptance/ingestion changes.
- **US5**: T035 + T036 prepare persistence/current-read cases. T037–T040 extend shared owners sequentially before T041.
- **US6**: T042 + T043 + T044 + T045 prepare backend/mobile/manual cases in distinct files. T054–T056 may be qualified independently once their different real inputs exist, but serialize edits to the quickstart/evidence record.

## Implementation Strategy

### MVP First (User Story 1)

1. Consume F13's bounded foundation and complete T001–T005.
2. Implement T006–T011 and demonstrate stable contextual identity with controlled calendars.
3. Validate US1 independently; this increment establishes no complete public calendar, notification or release qualification.

### Incremental Delivery

Build classification and partial acceptance next, then authoritative facts and independent visibility. Integrate the specific F07/F08 transaction capabilities when available, preserving their ownership. Deliver presentation and locality through existing native controls and owner interfaces. A lower story priority does not remove launch obligations. Keep future real-device/provider/transition proof pending on its specific task rather than blocking every useful increment.

### Parallel Team Strategy

When parallel implementation is authorized, use only the distinct-file batches above and one writer for shared persistence/API paths. Integrate and test each coherent increment under the repository delivery policy; this task file adds no issue-per-task rule, shared task catalogue or new approval workflow.

## Notes

- [The native task procedure](../../.agents/skills/speckit-tasks/SKILL.md) owns structure/test ordering; [agent guidance](../../AGENTS.md#select-by-task) selects applicable implementation skills.
- No raw provider archive, automatic replay, durable notification outbox, generic merge console, extra logo scheduler or speculative shared package is needed.
- Documentation/schema checks establish only documentary correctness. Generated binding, PostgreSQL races, current grants, native rendering, actual provider observations and protected-logo recovery require their own execution evidence.
- Keep personal contacts, real V1 associations/files, private diagnostics and credentials out of public fixtures and reports. Use synthetic/minimized cases and authorized private evidence destinations.
