---
description: "Implementation tasks for F06 following and the personal feed"
---

# Tasks: F06 following and the personal feed

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning artifacts, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). The workspace and T001–T005 contract/context foundation are implemented; later tasks retain their own qualification boundaries. This foundation creates no following table, business endpoint, provider configuration or production data. See the scoped [contract/access evidence](quickstart.md#contracts-and-access).

**Tests**: A01–A28 and SC-001–006 explicitly require qualification. Write automated cases first and observe meaningful failure before their associated implementation. Prepare native/manual cases before executing them with actual prerequisites. Synthetic database evidence, real generated consumers and native journeys prove different boundaries; a documentary check proves none of them.

**Organization**: Setup and the bounded foundation precede five P1 user stories in specification order. F06 owns relations and personal selection; F02 owns sporting identity/visibility, F03 calendar semantics, F05 account identity/erasure and F07 notification eligibility/delivery. No materialized feed, synchronized counter or new service is introduced.

## Format: `[ID] [P?] [Story] Description`

- **[P]** identifies distinct-file work that may run together after its prerequisites.
- **[USn]** retains the specification's story number.
- Paths identify implementation or the existing qualification source. Checked boxes record only the completed native task scope.

## Path Conventions

- Backend follows live in `apps/backend/src/main/java/com/blockout/backend/following/`, with mirrored `src/test/java/` paths. Application ports return immutable values; infrastructure may compose current sporting/follow projections without exposing managed entities or copying F02 rules.
- Mobile follows and personal space live in `apps/mobile/src/features/following/`. Focused tests are co-located in `__tests__/`; the Home route in `apps/mobile/src/app/(ordinary)/(tabs)/index.tsx` stays thin. Expose only the actual follow-control boundary needed by F03; F13 owns shared UI/transport/Query and F14 owns installation/onboarding composition.
- Canonical definitions remain `contracts/http/mobile/following/` and the existing mobile root. F13 generates Java interfaces/DTOs and mobile functions/types/validators into ignored outputs; reuse F03 summaries/calendar parameters and F02 sporting values.
- Schema changes use `apps/backend/src/main/resources/db/changelog/` and the existing master include/baseline posture. No schema auto-update at application startup, new migration tool or reset is authorized.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Reuse the actual workspace, original-account access and sporting owners.

- [x] T001 Verify F13 T001–T017 through `apps/backend/pom.xml`, `apps/mobile/orval.config.ts` and `README.md`: Java 25/Spring Boot 4.1.1, PostgreSQL 18.6, Expo 58/React Native 0.88/React 19.3.0, generated consumers and ordinary JUnit/Testcontainers/Jest tooling. Use the pinned Query version; research's inspected 5.104.2 is no implicit upgrade. Wait only for the bounded foundation and actual F02/F03/F05 inputs needed by each task.
- [x] T002 Inspect the existing Liquibase include/baseline state in `apps/backend/src/main/resources/db/changelog/db.changelog-master.xml` and actual database posture through `README.md`; extend the mutable XML baseline only while all environments are disposable and no retained version has run, otherwise append immutable changes. Reuse application/migration role separation and actual test commands; no reset or speculative release migration.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish canonical owner/target/context boundaries shared by the feature.

- [x] T003 [P] Write failing generated-binding cases in `apps/backend/src/test/java/com/blockout/backend/following/api/FollowingContractWebMvcTest.java` and `apps/mobile/src/features/following/__tests__/following-contract.test.ts`, using test-scoped adapters where behavior is not yet implemented. Cover required boolean state, strict query/body shapes, additive responses, absent season/default/continuations, reused F03 summaries/calendar, safe errors and one-time JSON validation. Include page/nextPage maximum 107374182, twenty-item pages and count maximum 9007199254740991 without lossy coercion; actual endpoint cases remain with their stories.
- [x] T004 [P] Write failing original-owner/session cases in `apps/backend/src/test/java/com/blockout/backend/following/api/FollowAccessWebMvcTest.java` and `apps/mobile/src/features/following/__tests__/following-context.test.ts`. Cover usable original UUID only, other/erased/replacement accounts, guest and unavailable-profile handling, no Pro requirement, F12 admission/bypass, and A → guest/B → A late responses; neither administrator nor collector credentials grant another owner's access.
- [x] T005 Define cohesive owner/target values in `apps/backend/src/main/java/com/blockout/backend/following/application/FollowContext.java` and native query/mutation key construction in `apps/mobile/src/features/following/api/following-keys.ts`, making the shared test-scoped boundary cases pass with F05/F12. Preserve “Keys distinguish session/account/target and, for lists/calendar, season/category/time zone.” Public count keys remain account-independent except applicable bypass context; private state never enters public sporting DTOs. Reuse generated functions/keys through F13 transport, with no second session owner, generic client wrapper or mirrored store.

**Checkpoint**: Contract/context boundaries are testable. Each story may use controlled owner inputs while developing; its full proof waits for the named real owner integration, not every other feature's completion.

---

## Phase 3: User Story 1 — Manage my follows with a reliable outcome (Priority: P1) 🎯 MVP

**Goal**: Add/remove one original-account relation with shared provisional UI and a confirmed outcome.

**Scope**: A01–A06; FR-001–007, FR-023 and the relation-identity boundary of FR-027; SC-001.

**Independent Test**: Follow/unfollow a viewable team or pool, repeat true/false and race writes with erasure. Observe one busy action across tabs, another target remaining usable, no guest replay and stable identity through correction/hiding. Later stories integrate actual lists/calendars and lost-response recovery.

### Tests for User Story 1

- [x] T006 [P] [US1] Write failing MVC state tests in `apps/backend/src/test/java/com/blockout/backend/following/api/FollowStateWebMvcTest.java` for team/pool member GET/PUT: confirmed 200 true/false, required complete boolean, unknown body/query properties, 415, no-store and safe 400/401/403/404/503. Exercise original usable ownership, explicit maintenance bypass, hidden/missing targets and definite refusal without mutation effects; no toggle, DELETE, creation response or other-account administration route.
- [x] T007 [P] [US1] Write failing real PostgreSQL relation/race cases in `apps/backend/src/test/java/com/blockout/backend/following/infrastructure/FollowRelationsIntegrationTest.java`. Verify account/target foreign keys, uniqueness, repeated true retaining UUID, false deleting only the relation, re-follow creating a different UUID, separate team/pool/season identities, retained hidden relations and no transfer after correction. Race two devices and controlled original-account row deletion/writes under the owner lock; assert last server-recorded state, rollback integrity, no orphan/replacement-account relation and no provider/notification call in SQL. T016 owns the actual F05 orchestrator/participant erasure race after T011; these construction fixtures do not qualify that orchestration.
- [x] T008 [P] [US1] Write failing real-Query/component cases in `apps/mobile/src/features/following/__tests__/follow-action.test.tsx` for same-target controls across tabs, shared provisional requested value/busy state, one pending mutation with no queued tap and independent other targets. Cover guest invitation without post-login replay, unavailable profile with public viewing intact, authoritative success after unmount, preserved confirmation after dependent-read failure and old-session callback rejection. Seed controlled affected queries to test reset semantics before list/calendar screens exist.

### Implementation and qualification for User Story 1

- [x] T009 [US1] Add the occupied relation schema, JPA mappings and focused persistence port in `apps/backend/src/main/resources/db/changelog/following.xml`, `apps/backend/src/main/java/com/blockout/backend/following/infrastructure/TeamFollowEntity.java`, `PoolFollowEntity.java` and `application/FollowStore.java`, registering the XML through the existing master. Preserve TeamFollow “Non-null foreign keys and unique(accountId, teamId). One confirmed relationship; no implicit pool or club follow.” and PoolFollow “Non-null foreign keys and unique(accountId, poolId). Following one pool does not follow another phase/tour or its teams individually.” Use UUID relation IDs, account/target indexes for uniqueness/owner reads and target-first indexes for counts/recipient reads; no copied names, seasons, counters, timestamps or notification state.
- [x] T010 [US1] Implement read/replace use cases in `apps/backend/src/main/java/com/blockout/backend/following/application/FollowState.java` and `infrastructure/JpaFollowStore.java`, making T007 pass. Preserve “True from absence creates a UUID; repeated true retains it. False removes the row; repeated false has no effect. Re-follow creates another UUID, so consumers can distinguish a new relationship without retaining deleted rows.” Follow state is “Boolean existence for the original account and a viewable target; false does not require a stored row. Unknown/hidden targets are not exposed.” Validate current F02 eligibility and F05 usable original account under its short account-row lock; take any necessary owner-ordered sporting roots before sorted account locks, never afterward. Retain last server-recorded state, without gesture versions, tombstones, idempotency ledger or external calls in the transaction.
- [ ] T011 [US1] Provide F06's narrow transactional erasure participant in `apps/backend/src/main/java/com/blockout/backend/following/application/EraseAccountFollows.java` and wire it into F05's `apps/backend/src/main/java/com/blockout/backend/accounts/application/EraseAccount.java`. Preserve “Account deletion removes both associations in the same local transaction under F05's account lock. Never cascade a follow removal into a sporting target.” Remove hidden and visible relations under the original account lock without acquiring sporting roots; make the F06 portions of T007/F05 T025 pass. F05 retains erasure orchestration/provider cleanup and full multi-owner proof.
- [x] T012 [US1] Expose current account/target/relation identity reads through `apps/backend/src/main/java/com/blockout/backend/following/application/ReadFollowEligibility.java`, backed by the existing relations. Add bounded read cases to `apps/backend/src/test/java/com/blockout/backend/following/application/ReadFollowEligibilityTest.java` before this boundary's implementation: union without duplicate recipients, original relation still present versus removed/recreated and no display-season preference. Return immutable values for F07's actual in-process consumer; no follow event broker, historical audience snapshot, notification state or implementation of F07 cancellation/delivery.
- [x] T013 [US1] Implement canonical member GET/PUT in `apps/backend/src/main/java/com/blockout/backend/following/api/FollowingController.java`, mapping the confirmed boolean locally and calling T010 through generated interfaces and current F05/F12 access. Make T006 pass with no-store/shared errors, actual confirmed boolean and no generated-type leakage into persistence. Public sporting reads remain independent of private follow-state retrieval.
- [x] T014 [US1] Implement generated state queries and shared mutation lifecycle in `apps/mobile/src/features/following/api/follow-queries.ts`, `use-follow-state-query.ts` and `follow-mutations.ts`, making T008 pass. Use one QueryClient, account/session/target keys, native `useMutationState` provisional variables and a synchronous mutation-cache guard for one pending action per target; do not queue taps. Cancel obsolete reads, apply only the current-session confirmed response, then native `resetQueries` for affected personal lists/calendars without former initialData/placeholderData; invalidate options and the affected public count. Shared lifecycle callbacks survive initiating-screen unmount; dependent read/reset failures never turn a confirmed write into mutation failure. No optimistic full-list/count rewrite or replay; US5 adds the bounded uncertain-response path.
- [x] T015 [US1] Implement the reusable feature-owned `apps/mobile/src/features/following/components/follow-button.tsx` and expose its narrow interface to F03's `apps/mobile/src/features/sporting/components/sporting-actions.tsx`. Consume F13 T067–T069/T071 and F05's existing sign-in invitation: immediate selected/provisional busy presentation, no double tap, no Pro restriction, no automatic follow after authentication and public consultation retained when profile access fails. Confirm the target's season without changing the personal filter; same seasonal team/pool identities remain distinct from new seasons or other pool phases.
- [ ] T016 [US1] Execute A01–A06 and original-owner race cases from `specs/009-following-personal-feed/quickstart.md#relationships-and-calendar` and `#mobile-journeys` using actual generated consumers, F02 current targets, F05 T010/T029's account lock/erasure and the F03 follow entry. Verify UUID lifecycle and real F06 erasure participation; controlled F07 reads do not establish notification delivery. Reuse this evidence in F05 T035 when its other participants exist; full list/calendar outcomes complete with US3/US4.

---

## Phase 4: User Story 2 — Choose a shared season for my personal space (Priority: P1)

**Goal**: Share one valid season across Upcoming, Completed and Following, independently of other journeys.

**Scope**: A07–A12; FR-008–012, FR-015, FR-022; SC-002.

**Independent Test**: Default to newest viewable followed season, otherwise newest catalog season, otherwise All seasons. Change/reset a shared selection and reconcile established disappearance without silently changing valid choices or looping after a failed read.

### Tests for User Story 2

- [x] T017 [P] [US2] Write failing PostgreSQL/options MVC cases in `apps/backend/src/test/java/com/blockout/backend/following/application/FollowOptionsIntegrationTest.java` and `apps/backend/src/test/java/com/blockout/backend/following/api/FollowOptionsWebMvcTest.java`. Cover distinct current catalog/follow seasons, hidden-only exclusion, newest followed versus newer catalog default, empty options without fabricated default, ordering by start year then UUID, original-owner privacy and safe failures; no text-search options or fixed-year catalogue.
- [x] T018 [P] [US2] Write failing shared-season cases in `apps/mobile/src/features/following/__tests__/personal-season.test.tsx`: all three tabs and both lists share one choice, F03 club/F04 search remain independent, All seasons omits seasonId, valid choice survives navigation/newer seasons/another-season follow and reset recalculates default. A seasonal list/calendar NotFound triggers only one bounded options reread; switch only after successful omission, otherwise retain selection with ordinary error/retry. An explicit later retry may recheck, without recursive retry.

### Implementation and qualification for User Story 2

- [x] T019 [US2] Implement immutable options and current reads in `apps/backend/src/main/java/com/blockout/backend/following/application/ReadFollowOptions.java` and `infrastructure/JpaFollowReadStore.java`, then expose the canonical options GET through `api/FollowingController.java`. Preserve “Distinct eligible catalog/follow seasons and the ordinary default; absence of default means All seasons.” Use F02 current visibility with the original account's relations; make T017 pass without exposing hidden-only seasons or treating failure as no choices.
- [x] T020 [US2] Compose one ordinary personal-space season owner in `apps/mobile/src/features/following/screens/personal-screen.tsx` and its `components/personal-season-selector.tsx`, with the thin Home route in `apps/mobile/src/app/(ordinary)/(tabs)/index.tsx`. Use generated options, local scoped state and F13 controls; preserve “One in-memory season choice belongs to the personal space, not to search or notifications.” Implement T018's shared/default/reset behavior without persisting a second cache or tying selection to the local calendar year; US3/US4 populate the corresponding personal views.
- [x] T021 [US2] Implement the bounded seasonal-NotFound reconciliation in `apps/mobile/src/features/following/api/personal-queries.ts`, reused by the real list/calendar requests. On 404 reread options once with F13 bounded transport; successful omission changes to its default or All seasons and loads that context. A still-offered season or failed options read preserves the old selection and normal retry; no recursive read loop, repair screen or unavailable option. Make the recovery portion of T018 pass and reject late obsolete-account/season responses.
- [ ] T022 [US2] Qualify A07–A12 through `specs/009-following-personal-feed/quickstart.md#mobile-journeys` with generated options and synthetic current sporting/follow data. Recheck all three actual tabs with US3/US4 when built, including NotFound from their real endpoints, empty/failed options and adding another-season follow without changing the chosen season. This integrated proof does not block construction of those later views.

---

## Phase 5: User Story 3 — Find my follows without exposing a hidden resource (Priority: P1)

**Goal**: Browse complete current alphabetical lists while retaining hidden relations privately.

**Scope**: A13–A17; FR-006, FR-009, FR-013–017, FR-020, FR-022; SC-003.

**Independent Test**: Browse more than twenty follows, equal and accented names, historical seasons and hidden/restored targets. Validate native French ordering/page bounds and show only current eligible resources; distinguish no available follows from failed retrieval.

### Tests for User Story 3

- [ ] T023 [P] [US3] Write failing PostgreSQL/MVC list cases in `apps/backend/src/test/java/com/blockout/backend/following/application/FollowListsIntegrationTest.java` and `apps/backend/src/test/java/com/blockout/backend/following/api/FollowListsWebMvcTest.java`. Cover at least 21 entries, homonyms/accents, native `fr-x-icu` through Hibernate `collate`, twenty-item Slice continuation, stable UUID ties, All seasons/current filter and hidden/reappearing identities. Reject page values outside 0–107374182 before offset conversion and an unrepresentable nextPage with BadRequest, never overflow or false exhaustion; exercise bounds without manufacturing billions of rows. Failed reads are not empty lists.
- [ ] T024 [P] [US3] Write failing semantic list/query cases in `apps/mobile/src/features/following/__tests__/followed-lists.test.tsx`: separate Teams/Pools views sharing the season, all loaded identities accessible once, distinguishing current summaries, append retry, no loaded count as total, hidden targets absent without placeholders/removal controls and valid detail-return context. Verify inactive visible-state gating, retained populated return with no new request and reset-while-hidden fetching only the first page on display.

### Implementation and qualification for User Story 3

- [ ] T025 [US3] Implement list read values/use case in `apps/backend/src/main/java/com/blockout/backend/following/application/ReadFollowLists.java` and extend `infrastructure/JpaFollowReadStore.java`. Preserve “Viewable targets joined to their current F03 summaries, optionally restricted by sporting season; stable effective-name/UUID order.” Use Spring Data Slice of twenty, native deterministic `fr-x-icu` collation through supported Hibernate `collate`, current F02 visibility and bounded mapped projections without N+1. Reject unsupported page/continuation arithmetic explicitly; no normalized-name copy, total count, cursor service or snapshot guarantee. Make T023's database cases pass; concurrent rename/hiding may move offset pages until refresh.
- [ ] T026 [US3] Add canonical team/pool collection GETs to `apps/backend/src/main/java/com/blockout/backend/following/api/FollowingController.java`, mapping T025 into reused F03 summaries with optional nextPage and no total. Make T023's MVC cases pass with current original-owner/F12 admission, unknown/unavailable selected season NotFound and known hidden targets omitted, preserving no-store and safe errors rather than zero-on-failure fallbacks.
- [ ] T027 [US3] Bind generated paged list reads in `apps/mobile/src/features/following/api/personal-queries.ts` through the existing QueryClient and T021's bounded options reconciliation. Key by original account/generation/type/season, advance native pageParam from nextPage, deduplicate displayed UUIDs after concurrent changes and retain earlier pages on append failure. Set `enabled` from the visible personal tab and `staleTime: Infinity`, with F03 disabled mount/focus/reconnect refetch; never supply old initialData/placeholderData. Make T024's retention/reset cases pass through T014's existing mutation callback, with no extra navigation cache.
- [ ] T028 [US3] Implement `apps/mobile/src/features/following/components/followed-lists.tsx` inside `screens/personal-screen.tsx`, reusing F03 public identity presentation and T015's follow button. Show current name/season/classification only, ordinary empty/loading/error/retry states and a search entry when no follows are available; no hidden-follow section or fake zero. Open exact F03 UUID destinations through F11's existing sporting transition; filters, refresh and return add no ad trigger. Preserve still-valid tab/selection/position without promising an exact position after recomposition.
- [ ] T029 [US3] Run A13–A17's list/visibility cases through `specs/009-following-personal-feed/quickstart.md#relationships-and-calendar` and `#mobile-journeys` with the actual selected PostgreSQL image/Hibernate expression and generated consumers. Verify accents/homonyms, all page identities, bounds, retained hidden relations and unchanged count truth; complete the no-matches-versus-no-follows calendar distinction with US4 rather than treating list emptiness as equivalent proof.

---

## Phase 6: User Story 4 — See each relevant match once (Priority: P1)

**Goal**: Compose the current personal calendar from eligible relations and F03 semantics without duplicating matches.

**Scope**: A17–A21; FR-004, FR-016–019, FR-021–023; SC-004.

**Independent Test**: Follow both participants and their pool, remove selecting follows successively, then traverse F03's complete days in Paris/New York. Restrictions, withdrawal and changed contexts take precedence over retained matches; flag and calendar agree in one response.

### Tests for User Story 4

- [ ] T030 [P] [US4] Write failing real PostgreSQL calendar cases in `apps/backend/src/test/java/com/blockout/backend/following/application/PersonalCalendarIntegrationTest.java`: existence-union deduplication, last selecting follow removal, compatible multi-pool team participation, no implicit phase/season transfer, withdrawn match with retained result, qualified single current empty calendar, false/partial/failed observations and authorized reappearance. Reuse F03 categories/dates/postponements/unknown date and seven complete nonempty days/exclusive nextDay; interleave a follow/visibility change between flag/day/row reads to prove one repeatable-read response, including category-independent hasAvailableFollows.
- [ ] T031 [P] [US4] Write failing calendar MVC cases in `apps/backend/src/test/java/com/blockout/backend/following/api/PersonalCalendarWebMvcTest.java` for canonical account matches: owner isolation, optional season, F03 category/IANA zone/exclusive nextDay, generated enclosing hasAvailableFollows/calendar, no-store and shared failures. Unknown/unavailable seasonal choice is NotFound; no general-calendar fallback or private match-origin fields.
- [ ] T032 [P] [US4] Write failing real-Query/calendar interaction cases in `apps/mobile/src/features/following/__tests__/personal-calendar.test.tsx`: overlapping origins once, multiple complete-day pages, confirmed follow change resetting to first page without old rows, visible/enabled versus hidden mounted tabs, season/category retained, late prior batches ignored and unavailable follows distinguished from no applicable matches. Contrast failed unchanged-context first-page refresh retaining authorized content with failed changed-follow reload showing ordinary loading/error/retry; append failure never becomes an end.

### Implementation and qualification for User Story 4

- [ ] T033 [US4] Implement the personal selection use case in `apps/backend/src/main/java/com/blockout/backend/following/application/ReadPersonalCalendar.java` and its current projection in `infrastructure/JpaFollowReadStore.java`, reusing F03's actual category/day-query/calendar boundary exposed by its T028/T031. Preserve “F03 match projection selected by an eligible followed participant or pool. Existence predicates avoid duplicate matches from overlapping origins.” and “The calendar response couples hasAvailableFollows for the selected season with the F03 calendar under one consistent transaction.” Use database existence predicates and one short read-only repeatable-read transaction for flag/day/row evaluation, current F02 eligibility, seven complete nonempty days and exclusive continuation. Make T030 pass without fetching all matches/follows into mobile memory, a personal feed table or copied sporting/category rules.
- [ ] T034 [US4] Add canonical personal matches GET to `apps/backend/src/main/java/com/blockout/backend/following/api/FollowingController.java` and mapping in `FollowingApiMapper.java`. Make T031 pass with the reused MatchCalendarResponse enclosed alongside hasAvailableFollows; false denotes no viewable follows for the season, while true with empty days denotes no eligible matches in this portion/category. Never infer erasure, substitute a public calendar or present a failure as empty success.
- [ ] T035 [US4] Complete personal infinite-calendar queries in `apps/mobile/src/features/following/api/personal-queries.ts` using F03's supported first-page recipe and F13 transport. Key by original account/generation/season/category/time zone, pass exclusive nextDay as pageParam, apply visibility-based `enabled`, `staleTime: Infinity` and disabled implicit replay. Ordinary explicit refresh cancels pagination and fetches with `staleTime: 0`, `pages: 1`, replacing only on success; T014's confirmed-change reset removes obsolete traversal without old initialData/placeholderData. Make T032's actual query cases pass, reusing the same callback owner rather than per-match selection metadata or another result store.
- [ ] T036 [US4] Compose Upcoming/Completed in `apps/mobile/src/features/following/screens/personal-screen.tsx` using F03's actual `apps/mobile/src/features/sporting/components/sporting-calendar.tsx` through its narrow feature interface. Preserve shared season, local-day/pool grouping, missing/provisional result meaning and exact match navigation/F11 counting. Make T032's display cases pass with separate no-available-follows/search and no-applicable-matches states, identifiable partial errors and no hidden-match placeholder; F14 retains guest/onboarding shell behavior.
- [ ] T037 [US4] Execute A17–A21 through `specs/009-following-personal-feed/quickstart.md#relationships-and-calendar` and `#mobile-journeys` with actual F02/F03/F06 database/consumer paths. Verify last-origin removal versus sporting deletion, current complete-empty withdrawal versus false absence, reappearance with independent restrictions, complete-day boundaries in both zones and real reset/refresh distinction. Finish T022/T029's deferred cross-view cases without requiring F07 push implementation.

---

## Phase 7: User Story 5 — Understand counters and recover after an error (Priority: P1)

**Goal**: Expose honest public counts and reconcile uncertain writes without undoing confirmed success or replaying a mutation.

**Scope**: A22–A28; FR-001, FR-020, FR-022–028; SC-005–006.

**Independent Test**: Repeat/hide/restore a relation, lose a write response, refuse another write and fail dependent reads after confirmed success. Check original-session isolation, one bounded reread and F07 relation identity without promising delivery.

### Tests and qualification cases for User Story 5

- [ ] T038 [P] [US5] Write failing PostgreSQL/public-count MVC cases in `apps/backend/src/test/java/com/blockout/backend/following/application/FollowerCountIntegrationTest.java` and `apps/backend/src/test/java/com/blockout/backend/following/api/FollowerCountWebMvcTest.java`. Count actual relations once after repeat/remove/re-follow, independent of personal season/display filters; hide/restore the target without changing the underlying count. Public reads require no private account/Pro resolution, hidden/missing targets return NotFound, explicit bypass is validated and failed reads never return zero or follower identities.
- [ ] T039 [P] [US5] Write failing mutation-recovery/count presentation cases in `apps/mobile/src/features/following/__tests__/follow-recovery.test.tsx` and `__tests__/follower-count.test.tsx`. Distinguish definite refusal, uncertain transport response with one current-state reread, failure of that reread, delayed original request and accepted mutation followed by profile/list/count reload failure. Preserve established success, no fabricated count, no write replay, bounded busy/error feedback and late A → guest/B → A rejection; a reread is not proof a delayed request cannot still complete.
- [ ] T040 [US5] Prepare A22–A28 native/accessibility/reporting cases in `specs/009-following-personal-feed/quickstart.md#mobile-journeys`, referencing the approved Home/Sport designs in `plan.md` and actual F13/F05/F07/F09/F10/F11/F12 owners. Include both themes/live system changes, VoiceOver/TalkBack, enlarged text, shared busy/selection without color alone, public access during private failure, advertising transitions and contextual support without extra collection. Keep F07/provider/device prerequisites explicit before execution.

### Implementation and qualification for User Story 5

- [ ] T041 [US5] Implement direct count reads in `apps/backend/src/main/java/com/blockout/backend/following/application/ReadFollowerCount.java` and the existing `infrastructure/JpaFollowReadStore.java`, then expose team/pool follower-count GETs through `api/FollowingController.java`. Preserve “Number of existing relations for the target, independent of personal display filters; no follower identities or estimated zero.” Make T038 pass with ordinary indexed relational counts, current target visibility and canonical safe-integer response bounds; no denormalized counter, counter event or private account fetch on public reads.
- [ ] T042 [US5] Implement generated public count queries and `apps/mobile/src/features/following/components/follower-count.tsx`, composing them with T015's follow control in the actual F03 sporting action boundary. Keep public count independently readable, unknown/error distinct from zero and invalidation scoped to the affected count after confirmed writes. Make T039's count cases pass without optimistic arithmetic, follower disclosure, complete-detail rereads or interpreting personal list length as the count.
- [ ] T043 [US5] Complete bounded reconciliation in `apps/mobile/src/features/following/api/follow-mutations.ts` through the existing shared lifecycle callbacks. Make T039's mutation cases pass: definite refusal preserves confirmed state; lost response triggers exactly one bounded generated member GET for the captured account/session/target, no mutation replay. Use its observed state without claiming delayed cancellation; failed reconciliation yields ordinary action error/explicit retry. Separate confirmed write success from subsequent profile/options/list/calendar/count refresh errors, apply current known restrictions and reject retired session callbacks even after returning to the same UUID. Use F13 `networkMode: 'always'`/no automatic retries or paused offline writes; no custom uncertainty journey, action queue or synchronization service.
- [ ] T044 [US5] Qualify T012's real F07 consumption through `specs/009-following-personal-feed/quickstart.md#relationships-and-calendar` and the existing F07 trigger/send tests once its owner exists. Confirm one recipient from overlapping follows, retained original relation eligibility, removed/recreated relation refusing continuity for a pending send and display season having no delivery effect. F07 owns send-time rechecks, consumed facts, inbox/push lifecycle and cancellation; following proves neither native permission nor successful delivery. This proof does not block earlier relation construction or tests.
- [ ] T045 [US5] Execute A22–A28 and T040 cases on actual iOS/Android builds with F13/F05/F09/F11/F12 and the existing contextual F10 entry using `specs/009-following-personal-feed/quickstart.md#mobile-journeys`. Exercise bounded losses/failures, unmounts, account changes, inactive tabs, native accessibility and exact approved design; confirm no interstitial on filtering/refresh/return and ordinary F11 handling on sporting opening. Keep private relation/diagnostic data outside public evidence; no added analytics, provider operation or mock-only completion claim.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete owner integration without widening the feature or its evidence claims.

- [ ] T046 Run the actual F13 canonical lint/bundle/generate/compile/typecheck/test chain for `contracts/http/mobile/openapi.yaml`, `apps/backend/pom.xml` and `apps/mobile/orval.config.ts`; execute T003 against real consumers, verify no-store/errors, page bounds, boolean state, optional values and reused calendar/summary serialization. Regenerate twice at the same revision and verify deterministic ignored outputs; no duplicate model, enum or editable contract copy.
- [ ] T047 Review touched handwritten following/consumer files under `apps/backend/src/main/java/com/blockout/backend/following/` and `apps/mobile/src/features/following/` with applicable Java, Liquibase, React/native, documentation, logging and simplicity skills. Confirm original-account locks, current visibility, bounded projection reads/no N+1 and safe owner-level diagnostics without private relationship payloads. Keep ordinary JPA/Query mechanisms; update only the commands/paths actually created in `README.md` and remove only demonstrated duplication or unsafe ownership.
- [ ] T048 Execute the complete applicable `specs/009-following-personal-feed/quickstart.md` and reconcile A01–A28/SC-001–006 with actual database, generated-consumer, race and native evidence at the delivered revision. Reuse F03/F05/F07 owner results; report passed, failed and unavailable boundaries in normal delivery evidence, leaving unavailable tasks unchecked. Documentation checks establish neither applied schema/ICU support, Query/native behavior, account erasure nor notification eligibility in the runtime.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup T001–T002 consumes F13's bounded foundation. Foundation T003–T005 precedes story implementation; it creates no business table or new app beyond the active owners.
- US1 supplies the actual relation lifecycle, shared follow mutation/cache boundary and narrow F05/F07 integration. US2 supplies options/shared season. US3 adds complete current lists; US4 adds the calendar. US5 owns public count and final recovery/cross-owner qualification.
- Automated cases are written and fail meaningfully before their corresponding implementation; values/schema precede services, services precede endpoints, and actual integration follows the required owners. T012's boundary cases precede its implementation within that task.
- Shared-file edits are serialized, especially FollowingController, JpaFollowReadStore, personal-queries and personal-screen. T014 owns confirmed-change resets once; US3/US4 integrate their actual visible/enabled query consumers. US5 extends that same mutation lifecycle with uncertain-response handling.
- T016/T022/T029 may retain explicitly later integration evidence without blocking US3/US4 construction. Final polish follows all implemented stories and records outstanding external qualification honestly.

### Actual Owner and Qualification Dependencies

| Work                         | Immediate inputs                                                                                                         | Later qualification                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relation writes/erasure      | F02 original targets/current visibility and applicable root ordering; F05 T010's original-UUID account lock.             | T011/T016 use F05 T029's actual local erasure; F05 T035 owns proof with all other participants. No Auth0/RevenueCat operation is added by F06.                                             |
| Mobile private state/actions | F05 T004 session generation, F13 T040 transport/Query binding, F13 T067–T069/T071 UI and F12 admission.                  | Real session integration requires F14's early installation initialization, not final cutover. F03 T017 consumes the actual follow/count boundary; T042 completes the public count portion. |
| Options/lists                | Current F02 catalog and F06 relations; F03 summaries, selected PostgreSQL image with native ICU and Hibernate support.   | T022/T029/T037 exercise actual generated tab/list/calendar consumers. Database bounds are tested directly, not with an invented load programme.                                            |
| Personal calendar            | F03 T028/T031's reusable category/day-query behavior and T030 native calendar, current F02 visibility and F06 relations. | T037 uses real withdrawal/reappearance acceptance; F01 provider acquisition is not needed to create synthetic qualified inputs. F11 owns navigation/ad counting.                           |
| F07 eligibility              | T012's original account/target/relation values; no notification history inside F06.                                      | T044 waits for F07 trigger/send implementation. F07 readiness does not block relation authoring or local implementation.                                                                   |
| Final native/shared behavior | Implemented feature, F13 UI/transport and F05/F09/F11/F12 actual boundaries.                                             | T045 needs iOS/Android builds and F10's existing reporting entry; provider/native evidence is not inferred from mocks.                                                                     |

```text
F13 bounded foundation → T001–T002 → T003–T005
                                      └→ US1 tests → relations/use cases → shared follow action
US1 relation inputs → US2 options/shared season
US1 + US2 + current F02/F03 summaries → US3 lists
US1 + US2 + F03 calendar owner → US4 calendar
US1 + actual list/calendar queries → US5 bounded recovery/count integration
T012 + F07 actual trigger/send → T044
All implemented stories + explicit owner/native evidence → T046–T048
```

Public count work in US5 can develop after the relation owner without waiting for personal calendar implementation. The integrated changed-follow reload cases need actual list/calendar queries; this does not impose a dependency from relation construction back to those consumers. The same distinction applies to F05 erasure and F07 notification qualification.

### Parallel Opportunities and Examples

- **Foundation**: T003 generated-binding and T004 context cases are independent after setup.
- **US1**: T006 MVC, T007 database/races and T008 Query/action cases touch distinct files. T009/T010 establish persistence/use cases before endpoint integration; serialize changes to the shared relation owner. The targeted F07 boundary T012 has its own test-first step without starting notification implementation.
- **US2**: T017 database/API options and T018 mobile season cases can progress together. Backend T019 and native selector preparation use different owners, then join at T021/T022; serialize personal-screen edits with later stories.
- **US3**: T023 database/API lists and T024 mobile list/query cases can progress together. Controller/read-adapter and shared query/screen changes are integrated in order; T029 executes only with real prerequisites.
- **US4**: T030 database selection, T031 MVC and T032 mobile calendar cases are distinct files. T033/T034 and prepared native composition may advance separately once their tests exist; T037 waits for actual integration.
- **US5**: T038 count/database/API and T039 mobile recovery/count cases are independent. T040 edits the shared quickstart and is serialized with other qualification edits. Count reads/UI and mutation reconciliation touch different implementation files after their prerequisites; T044 and T045 wait only for their actual external owners.

## Implementation Strategy

### MVP First (User Story 1)

Complete setup/foundation and the relation/action slice, including real uniqueness/erasure ordering and shared provisional state. Validate original ownership, no automatic guest replay and stable relation identity. Local controlled queries can prove reset behavior before personal lists exist; they do not establish those later integrations or notification delivery.

### Incremental Delivery

Add options/shared season, current alphabetical lists and the F03-based personal calendar. Then complete direct public counts, bounded uncertain-response reconciliation and actual cross-owner/native evidence. Keep mutation success distinct from every subsequent read, unchanged-context refresh distinct from changed-follow reset, and hidden relationships distinct from erased ones. Preserve ordinary manual renewal, native JPA/Query behavior and accepted delayed-request limits; do not turn implementation qualifications into new infrastructure or product guarantees.
