---
description: "Implementation tasks for F08 live contributions and moderation"
---

# Tasks: F08 live contributions and moderation

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning sources, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). This artifact prepares implementation; it creates no runtime, migration, provider operation or deployment. Documentation checks do not establish SQL, generated-consumer or native qualification.

**Tests**: A01–A40 and SC-001–007 explicitly require qualification. Write automated cases first and observe meaningful failure before associated implementation. Prepare manual/native scenarios before executing them with actual prerequisites. Shared quota/concurrency cases precede the first submission implementation; later stories exercise integrated journeys without delaying those protections.

**Organization**: Setup and a bounded foundation precede six P1 stories in specification order. F08 owns versions, reports and moderation; related owners retain sporting truth, identity, permissions, notifications, entitlements and shared quality.

## Format: `[ID] [P?] [Story] Description`

- `[P]` identifies independent files with no unfinished dependency between marked tasks; wait for the phase prerequisites.
- `[USn]` identifies the specification story. Setup, foundation and polish have no story label.
- All checkboxes are future work. Cross-feature task references explicitly name their owner.

## Path Conventions

- Backend code lives in `apps/backend/src/main/java/com/blockout/backend/contributions/`, with mirrored tests under `src/test/java/`. Use cohesive application/domain/infrastructure/API boundaries, immutable owner projections and generated DTOs only at HTTP edges.
- Mobile code lives in `apps/mobile/src/features/contributions/`, with tests in `__tests__/` and thin Expo Router entries. F13 owns controls/transport/Query; F05 owns session generation.
- Canonical definitions remain `contracts/http/mobile/contributions/{paths,parameters,schemas}.yaml` and the mobile root. F13 generates Java interfaces/DTOs and Orval functions/types/Zod schemas into ignored outputs.
- Persistence extends `apps/backend/src/main/resources/db/changelog/` through the existing master XML. No new schema tool, service, video SDK or search engine.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Reuse the selected applications, contract tooling and database posture.

- [ ] T001 Verify F13 T001–T017's foundation in `apps/backend/pom.xml`, `apps/mobile/package.json`, `apps/mobile/orval.config.ts` and `README.md`: Java 25/Spring Boot 4.1.1, PostgreSQL 18.6, Expo 58/React Native 0.88/React 19.3.0, pinned TanStack Query and existing JUnit/Testcontainers/Jest tooling. Reuse Java URI/time, JPA and native forms; no dependency upgrade or video-provider client. Resolve only the bounded owner inputs below.
- [ ] T002 Inspect `apps/backend/src/main/resources/db/changelog/db.changelog-master.xml` and actual environment posture through `README.md`; extend the mutable XML baseline only while every environment is disposable and no retained version has run, otherwise append immutable changes. Preserve F13 application/migration role separation; no reset or speculative release migration.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish canonical transport and current original-account context for all stories.

- [ ] T003 [P] Write failing generated-binding cases in `apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionContractTest.java` and `apps/mobile/src/features/contributions/__tests__/contribution-contract.test.ts` using test-scoped adapters. Cover finite enums, strict requests/null rejection, additive responses, required/absent/nullable fields, twenty-item pages with maximum 107374182, counts through 9007199254740991, opaque nonempty revisions and F13 one-time JSON validation. Include null erased reasons, omitted erased owner/actor names, optional private schedule/result and public contribution ID only with a contributed URL.
- [ ] T004 [P] Write failing current-access/session cases in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAccessTest.java` and `apps/mobile/src/features/contributions/__tests__/contribution-context.test.ts`. Cover original usable UUID, another/erased/recreated account, invalid/wrong-environment/collector credentials, F12 admission/explicit bypass, absent capability, complete stream-only moderation grant and no Pro privilege. Reject old callbacks through A → guest/B → A even when cancellation fails.
- [ ] T005 Define focused context values in `apps/backend/src/main/java/com/blockout/backend/contributions/application/ContributionContext.java` and query/mutation keys in `apps/mobile/src/features/contributions/api/contribution-keys.ts`, making T004 pass with F05/F12. Reuse `stream-links.moderate` / `moderateStreamLinks` for every video action without another publication/withdrawal grant, unrelated power or implicit maintenance bypass. Keys distinguish account/session, match/version and filters; page is the native infinite-query parameter. Public F03 state stays outside private keys; no second session owner or persistent DTO store.

**Checkpoint**: Contract/context boundaries are testable. Controlled inputs allow isolated work; actual-owner qualifications remain mandatory for integrated readiness.

---

## Phase 3: User Story 1 — Propose a link at the authorized time (Priority: P1) 🎯 MVP

**Goal**: Record a permitted ordinary proposal or direct moderator publication with current eligibility and atomic protections.

**Scope**: A01–A09; FR-001–010, FR-017–020, FR-027, FR-033, FR-035, FR-040–041; SC-001 and shared integrity in SC-003/005/007.

**Independent Test**: Exercise exact seven-day/H−1 boundaries, unknown evidence/time, definitive versus provisional results, hidden/professional contexts and moderator exceptions. Verify active/pending outcomes, unchanged repetitions, quotas and rollback without video-provider requests.

### Tests for User Story 1

- [ ] T006 [P] [US1] Write failing MVC submission/read cases in `apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionSubmissionWebMvcTest.java`. Cover own collection/member GET and POST plus direct administrative POST, original owner/actor, current permission/visibility, 201 with exact member Location, current repetition 200, stale revision 409 before no-op, no-store and shared 400/401/403/404/415/422/503 errors. Unknown/non-owned members are 404; no 202, historical receipt or administrative admission exception.
- [ ] T007 [P] [US1] Write failing local-address/eligibility tests in `apps/backend/src/test/java/com/blockout/backend/contributions/domain/StreamAddressTest.java` and `ContributionEligibilityTest.java`. Cover absolute HTTP(S), exact/dot-delimited hosts, short domains, host case, spoofing/credentials/malformed input, preserved path/query/fragment and literal equality. Test seven elapsed days, reliable/unknown F05 evidence, H−1, date-only/absent date, Paris/New York equivalence, professional teams without clubs, definitive result versus F03 classification, corrections and moderator exceptions retaining restrictions.
- [ ] T008 [P] [US1] Write failing real PostgreSQL cases in `apps/backend/src/test/java/com/blockout/backend/contributions/infrastructure/ContributionSubmissionIntegrationTest.java`. Cover conditional uniqueness, same-match lineage, third/fourth versions/distinct Paris-day matches, 23/25-hour days, yesterday's match counting today, same-day continuation, unchanged submission at quota, immutable quota flags after later grants/states and refusals preserving active/pending state. Race same/different-match submissions, controlled actor-row removal and result acceptance/publication; inject required F07 failure with controlled participants. Assert ordered root/account locks, full rollback and no provider call in SQL; lifecycle fixtures ensure later stories do not defer quota protection. T046/T055 retain actual F05 erasure/rollback races after the participant exists.
- [ ] T009 [P] [US1] Write failing component/real-Query cases in `apps/mobile/src/features/contributions/__tests__/submit-contribution.test.tsx`: guest invitation, unavailable profile, missing right, age/time/visibility restrictions, moderator exceptions and no Pro condition. Retain draft on refusal, prevent duplicate in-flight actions/post-sign-in replay, use neutral stream wording/French accessible states and distinguish confirmed success from failed dependent reads.

### Implementation and qualification for User Story 1

- [ ] T010 [US1] Add state/version schema and mappings in `apps/backend/src/main/resources/db/changelog/contributions.xml`, `apps/backend/src/main/java/com/blockout/backend/contributions/infrastructure/MatchContributionStateEntity.java`, `ContributionVersionEntity.java` and `application/ContributionStore.java`. Preserve match-state “Match UUID, editing revision, nullable reference to the version causing the unresolved report hold” and “One per match with contribution activity; absence reads as initial revision/no hold. Create while holding the existing match lock.” Preserve version “UUID, match UUID, address, platform, nullable owner account, state, creation instant, quota-participation flag, optional source/replacement version, useful decision kind/time/nullable actor” and “Backend-only writer. Address/creation/quota participation are immutable. Decision changes state, not the submitted address.” Preserve “Source/replacement references and the unresolved hold reference must belong to the same match.” and “Partial unique constraints enforce one active version per match, one pending version per non-null owner/match, and one report per non-null reporter/version.” Implement the state/version constraints here and the report constraint in T029; ownerless pending versions may coexist. Register the occupied XML through the master; no command journal.
- [ ] T011 [US1] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/domain/StreamAddress.java`, `ContributionEligibility.java` and `ContributionQuota.java`, making T007/policy cases pass. Use Java URI only: absolute HTTP(S), nonempty host, no user info, exact/dot-delimited youtube.com/twitch.tv/facebook.com plus youtu.be/fb.watch; preserve the address literally. Consume current F02 context and reliable F05 age evidence. Ordinary publication needs seven elapsed days and confirmed H−1 unless definitive result; definitive result or report hold requires ordinary approval, preserving other conditions. Derive ordinary usage from flagged versions and successive Paris midnights, with no counter/reset job. Check same-owner current active/pending equality after authorization/revision and before quota refusal.
- [ ] T012 [US1] Implement ordinary submission/direct moderator publication in `apps/backend/src/main/java/com/blockout/backend/contributions/application/SubmitContribution.java` and `infrastructure/JpaContributionStore.java`. Acquire necessary F02 roots in season-first owner order including match, then all concerned accounts sorted by UUID; re-read actor/grants/ownership before effects and flush nothing before account locks. Coordinate the full affected account set with F07 before locking accounts; acquire no earlier root/account afterward. Preserve “The revision advances once for an accepted contribution mutation, including a new report, and remains unchanged for a no-op.” and “Its wire representation is an opaque nonempty string.” Compare revision under match lock before duplicates. Update/flush old rows before replacements where uniqueness requires it. Ordinary submission replaces only own active link, supersedes own pending proposal and otherwise preserves active while pending. Moderator selection owns its new version, supersedes every alternative and clears hold. Flags stay true for ordinary creation/false for moderator creation; recognized conflicts are safe 409, unexpected faults remain failure.
- [ ] T013 [US1] Expose immutable accepted-transition/current-public-link values in `apps/backend/src/main/java/com/blockout/backend/contributions/application/ContributionTransitions.java` and `ReadPublicContribution.java`, writing focused `apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionTransitionsTest.java` cases before implementation. Wire required F07 participation into T012's transaction; controlled participants are test-only; deliver T006/T008/T012–T014 together with T054, F02 T029/T033 and F07 T013/T014/T053–T057 so no production endpoint precedes its required handler. Refusals/no-ops emit no accepted transition. F02 result composition reads the permitted link under the same match lock; inbox/fact effects commit or roll back with the command and push follows commit. Link changes alter no sporting truth or consumed allowance; no broker, outbox or F08 notification policy.
- [ ] T014 [US1] Implement owner projections/reads in `apps/backend/src/main/java/com/blockout/backend/contributions/application/ReadOwnContributions.java`, `infrastructure/JpaContributionReadAdapter.java`, `api/ContributionsController.java` and `ContributionApiMapper.java`, including T012 endpoints through generated interfaces. Write `apps/backend/src/test/java/com/blockout/backend/contributions/application/ReadOwnContributionsIntegrationTest.java` first: caller-only versions, current eligibility/usage, twenty-item Slice pages, creation DESC/UUID ASC and coherent context/count/page repeatable-read when multiple queries are needed. Preserve safe offset/continuation bounds and no cross-page snapshot; expose no other person's history. Make T003/T006 pass; failed reads are not empty data.
- [ ] T015 [US1] Implement generated owner queries/submissions in `apps/mobile/src/features/contributions/api/own-contributions.ts` and `components/contribution-form.tsx` within `screens/contribution-screen.tsx` and its ordinary native stack route, making T009 pass with F13 T067–T069/T071 and React Hook Form/Zod. Consume F05 session/sign-in and F12 capabilities, retain local drafts, use one QueryClient and explicit queries without polling/reconnect/write retry. Guard in-flight actions; confirmed current-session success survives a failed refresh. US5 adds the full administrative surface; US6 completes uncertain-response recovery.
- [ ] T016 [US1] Integrate public projection through F03's `apps/backend/src/main/java/com/blockout/backend/sporting/api/ConsultationApiMapper.java` and entry through `apps/mobile/src/features/sporting/components/sporting-actions.tsx`, supplying exact `streamContributionId` with contributed `streamUrl`. Write `apps/mobile/src/features/contributions/__tests__/contribution-entry.test.tsx` before wiring: no private fields or professional-media contribution ID, neutral wording, no post-auth publication, and F10 support distinct. Reuse F03 actual response tests; F03 retains opening/visibility/F11 advertising.
- [ ] T017 [US1] Execute A01–A09 and early quota/race cases via `specs/010-live-contributions-moderation/quickstart.md#contracts-and-access` and `#versions-quotas-and-concurrency` with generated consumers, F02/F05/F12 and PostgreSQL. Controlled F07 evidence is limited; actual atomic composition is T054. MVP publication is not release readiness without that handler or remaining stories.

---

## Phase 4: User Story 2 — Manage my link without losing one that remains useful (Priority: P1)

**Goal**: Replace, inspect, cancel or withdraw only the authorized exact version while retaining independently useful links.

**Scope**: A10–A16; FR-009–016, FR-019, FR-029–030, FR-034, FR-036; SC-002.

**Independent Test**: Exercise immediate/pending replacement, superseding after sporting correction and exact-version cancel/withdraw. Refusal/rejection cannot restore/remove another link or reclaim ownerless ownership.

### Tests for User Story 2

- [ ] T018 [P] [US2] Write failing PostgreSQL/HTTP cases in `apps/backend/src/test/java/com/blockout/backend/contributions/application/OwnContributionLifecycleIntegrationTest.java` and `api/OwnContributionLifecycleWebMvcTest.java`. Cover coexistence, refused changes preserving both versions, rescheduling/result withdrawal then eligible/refused third submission, superseding, forbidden ownerless/other-owner replacement, cancel only pending, withdraw only active without age/window/quota requirements, stale revision before no-op and exact-target terminal repetition. Hold/proposals/usage remain independent; actual moderator decisions integrate in US5.
- [ ] T019 [P] [US2] Write failing personal action/history cases in `apps/mobile/src/features/contributions/__tests__/own-contribution-lifecycle.test.tsx`. Distinguish active/pending/rejected/cancelled/superseded/ownerless states, confirmations, exact cancel/withdraw and French accessible reasons without moderation-history access. Test more than twenty own versions using moderator-created historical fixtures without ordinary quota bypass.

### Implementation and qualification for User Story 2

- [ ] T020 [US2] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/application/ChangeOwnContribution.java` and extend `infrastructure/JpaContributionStore.java` using T012 locks/T013 transitions. Preserve “No-op decisions only return existing state when the exact target is already in the requested terminal state; an incompatible state is a conflict.” Cancel only own pending; withdraw only own active with current withdrawal permission. Neither refunds quota, promotes/cancels another version nor clears independent hold. Make T018 pass.
- [ ] T021 [US2] Implement own member PATCH in `apps/backend/src/main/java/com/blockout/backend/contributions/api/ContributionsController.java` and `ContributionApiMapper.java`: generated cancel/withdraw, required revision, atomic application/json, 200 current state, Accept-Patch/no-store and canonical conflicts. Reuse owner reads for refresh; no historical-result endpoint or other-account exposure.
- [ ] T022 [US2] Compose `apps/mobile/src/features/contributions/screens/own-contributions-screen.tsx` and its ordinary route with `contribution-form.tsx` and `api/own-contributions.ts`. Make T019 pass with separate active/proposal actions, native page parameters, retained filters, explicit first-page refresh and guarded exact commands. Explain superseding without others' details; cancellation never restores quota and refresh failure never reverses confirmed success.
- [ ] T023 [US2] Qualify A10–A16 via `specs/010-live-contributions-moderation/quickstart.md#versions-quotas-and-concurrency` and `#reads-and-mobile`, initially with decision fixtures then actual US5 decisions/US6 erasure. Check active → pending → correction → third submission, retained/resolved hold, refusal preserving both and repeated withdrawal not targeting replacement. Later proofs do not block their prerequisites.

---

## Phase 5: User Story 3 — Understand contribution limits (Priority: P1)

**Goal**: Explain ordinary usage/deadlines without incorrect consumption or refunds.

**Scope**: A17–A21; FR-017–020, FR-027; SC-003.

**Independent Test**: Observe third/fourth boundaries, same-day continuation, 23/25-hour days, unchanged submissions at quota and moderation exemption; show one retry instant in Paris/New York.

### Tests for User Story 3

- [ ] T024 [P] [US3] Write failing quota presentation cases in `apps/mobile/src/features/contributions/__tests__/contribution-quota.test.tsx` using generated versionsUsed/dailyMatchesUsed/matchCountedToday/dayEndsAt and eligibility. Cover reached limits, same address, yesterday's match, Paris DST/local display, refused attempts and cancelled/rejected versions retaining usage. Moderator exemption grants no ordinary free/Pro privilege. Backend quota tests already precede implementation in T008.

### Implementation and qualification for User Story 3

- [ ] T025 [US3] Add `apps/mobile/src/features/contributions/components/contribution-quota.tsx` and compose it in `own-contributions-screen.tsx`/`contribution-form.tsx`, making T024 pass. Display authoritative usage/local retry deadlines through F03 formatting; no phone-time eligibility, local midnight reset, countdown polling or mirrored quota.
- [ ] T026 [US3] Execute A17–A21 through `specs/010-live-contributions-moderation/quickstart.md#versions-quotas-and-concurrency` using T008 races plus actual US2/US5 lifecycle/grant changes when available. Verify immutable flagged use, equality before quota refusal and no refunds; approval/reactivation charge neither author quota. Delayed-response proof depends on T051, not a replay or receipt guarantee.

---

## Phase 6: User Story 4 — Report a link without circumventing moderation (Priority: P1)

**Goal**: Count a report once on its viewed version and retain the approval hold until explicit moderator selection.

**Scope**: A22–A28; FR-021–026, FR-033, FR-036; SC-004.

**Independent Test**: Reach thresholds three/ten, repeat after hiding without changing the first reason, correct a result without retroactive hiding and submit under the retained hold. Reactivated versions are independently reportable.

### Tests for User Story 4

- [ ] T027 [P] [US4] Write failing PostgreSQL/MVC cases in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ReportContributionIntegrationTest.java` and `api/ContributionReportsWebMvcTest.java`. Cover trimmed nonempty reason, self-report refusal, ownerless link, current reporting right without publication age/quotas, exact version, first reason retained, duplicate 200 after hiding without recount/threshold evaluation, inactive unreported conflict and own-report GET visibility. Test thresholds 3/10 from F02, result correction alone doing nothing, next new report evaluating current total, distinct/countable anonymous rows and hold across authors/addresses. Race reports/replacement with no retargeting or duplicate non-null reporter/version.
- [ ] T028 [P] [US4] Write failing report cases in `apps/mobile/src/features/contributions/__tests__/report-contribution.test.tsx`. Use F03's exact contributed ID, guest invitation without replay, validation/draft retention, duplicate busy state and explicit stale-target refresh. Distinguish F10 support; own-report reads reveal only reported state, never reasons/other identities.

### Implementation and qualification for User Story 4

- [ ] T029 [US4] Extend `apps/backend/src/main/resources/db/changelog/contributions.xml` and add `apps/backend/src/main/java/com/blockout/backend/contributions/infrastructure/ContributionReportEntity.java` under T002's posture. Preserve report “UUID, version UUID, nullable reporter, nullable free-text reason, original time” and “Original reason immutable except erasure; report remains counted after attribution removal.” Preserve “Anonymous reports use distinct rows: never apply NULLS NOT DISTINCT or count only non-null reporter IDs.” Implement T010’s quoted partial-uniqueness rule for “one report per non-null reporter/version” and exact-version foreign keys; nullable attribution alone does not clear reasons, which T050 integrates with F05.
- [ ] T030 [US4] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/application/ReportContribution.java` and `ReadOwnReport.java` with `infrastructure/JpaContributionStore.java`/`JpaContributionReadAdapter.java`, making T027 pass. Use root/account locks/current authorization; new reports count all retained rows, advance revision once and hide/set the exact hold only at the current F02 threshold. Preserve “A duplicate report retains the original reason and does not evaluate the threshold again.” Existing reports remain readable after hiding while the match is viewable; no replacement is targeted and sporting correction alone neither recalculates hiding nor restores state.
- [ ] T031 [US4] Implement own-report GET/POST in `apps/backend/src/main/java/com/blockout/backend/contributions/api/ContributionReportsController.java` and `ContributionApiMapper.java`: 201 with account/version report Location for creation, 200 unchanged and no-store. Bind canonical reason-only input, without an invented revision field; new-report conflicts do not transfer intent. Reuse T013 for actual hiding transitions; no private moderation notification.
- [ ] T032 [US4] Implement `apps/mobile/src/features/contributions/screens/report-contribution-screen.tsx` and `api/contribution-reports.ts` with an ordinary native stack route, connecting F03's exact-version entry and making T028 pass. Retain reason draft on refusal, guard the explicit mutation and present safe French success/conflict/error. Invalidate affected public/private views after confirmation; T051 adds the bounded own-report reread. No reason payload in diagnostics or persistent storage.
- [ ] T033 [US4] Execute A22–A28 via `specs/010-live-contributions-moderation/quickstart.md#versions-quotas-and-concurrency` with actual reports and US5 decisions when available. Rejection/cancellation preserve hold; moderator selection clears it without waiving post-result approval. Source reports stay historical and a former reporter may report the new version once. Repeat anonymous-count assertions with actual T050, since fixtures do not prove erasure integration.

---

## Phase 7: User Story 5 — Moderate with an understanding of versions and decisions (Priority: P1)

**Goal**: Privately search situations and make explicit version decisions with the complete stream-only grant.

**Scope**: A29–A34; FR-010, FR-026–035, FR-039–041; SC-005/007.

**Independent Test**: Search/filter visible and hidden matches, read full counts/history and approve/reject/withdraw/reactivate exact versions; race decisions without stale overwrite, attribution restoration or unintended publication.

### Tests for User Story 5

- [ ] T034 [P] [US5] Write failing decisions/races in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ModerateContributionIntegrationTest.java`. Cover every action with only stream-links.moderate, original actor/revision, concurrent decisions, approval retaining owner, all alternatives superseded, rejection/withdrawal preserving independent hold and reactivation only from rejected/withdrawn/hidden/replaced/superseded. New versions copy source address/platform and still-present owner or none, with zero reports/false quota flag; cancelled proposals cannot reactivate. Simulate erasure using F05's real account lock to prove post-lock ownership reread before copy; failures roll back versions and required F07 effects.
- [ ] T035 [P] [US5] Write failing real PostgreSQL private reads in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ModerationReadIntegrationTest.java`. Cover literal case-insensitive team/address fragments with escaped LIKE metacharacters, season/platform/state criteria on the same matching version, blank query/unknown season, distinct matches, hidden/dateless context and no N+1. Use more than twenty matches/versions/reports and tied times; verify SQL counts beyond pages, current active/hold reports versus historical reports/rejected totals, to-review without dismissal, offset bounds and coherent multi-query repeatable-read.
- [ ] T036 [P] [US5] Write failing MVC cases in `apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionModerationWebMvcTest.java` for queue, version collection/member, PATCH decisions, POST reactivation and report list. Verify original actor, current complete grant, admission, no-store/Accept-Patch, 201 new-member Location, 200 terminal no-op only after current revision and 409 stale/incompatible action. Hidden private reads cannot authorize publication; null erased reasons/omitted names expose no reporter identity.
- [ ] T037 [P] [US5] Write failing screen/real-Query cases in `apps/mobile/src/features/contributions/__tests__/moderation.test.tsx`: current-grant entry, retained filters, first-page refresh, failed versus empty queue, hidden/dateless context, independent active link, paged history, superseded alternatives and complete actions/confirmations. Verify erased reasons, historical reports after reactivation, French accessible states, entry/after-action reads and no polling.

### Implementation and qualification for User Story 5

- [ ] T038 [US5] Implement lifecycle decisions in `apps/backend/src/main/java/com/blockout/backend/contributions/domain/ContributionDecision.java` with T010's fields/references. Preserve “Approval and any later removal/replacement retain their relevant decision timestamps and nullable actors without a general command journal.” Approval selects the existing pending version; reactivation creates a source-linked version; moderator selection supersedes alternatives and clears hold. Preserve source/report history and distinguish superseding from rejection; no state-machine framework.
- [ ] T039 [US5] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/application/ModerateContribution.java` and extend `infrastructure/JpaContributionStore.java`, making T034 pass with T012 ordering. Re-read actor/grants/historical owner after all relevant account locks; never copy stale attribution. Keep original owner on approval, zero inherited reports/quota on reactivation, exact-target terminal no-ops and stale rejection before no-op. T012 retains direct publication; publication/reactivation respects professional/current visibility/privacy restrictions while private handling re-exposes no match. Use T013 only for accepted effects.
- [ ] T040 [US5] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/application/ReadModeration.java` and extend `infrastructure/JpaContributionReadAdapter.java`, making T035 pass with parameterized ILIKE/native Slice pages of twenty. Preserve “Version/report ordering is time descending then UUID ascending; match queue ordering uses the maximum creation, useful decision or report time, then match UUID.” and “No stored activity counter or scheduling task.” SQL badges distinguish active/pending/unresolved-hidden and historical rejected totals; resolving hold removes old reports from badges, not history. Reuse F03 primitives without its public dated wrapper. Unsupported offsets/continuations are 400, never false exhaustion; related multi-query reads use short repeatable-read without cross-request snapshot.
- [ ] T041 [US5] Implement generated moderation operations in `apps/backend/src/main/java/com/blockout/backend/contributions/api/ContributionModerationController.java` and `ContributionApiMapper.java`, making T003/T036 pass. Keep current active link outside filtered pages, lineage, chronological decisions, safe counts and exact null/omission semantics. Preserve “Do not expose report authors through moderation DTOs.” Absent capabilities/unrelated grants permit nothing; no bulk, audit-feed or dismissal endpoint.
- [ ] T042 [US5] Implement generated administrative queries/mutations in `apps/mobile/src/features/contributions/api/moderation.ts` with private keys, the single QueryClient and F13 transport. Read at entry/after-action/manual refresh, retain filters with native page parameters and disable implicit reconnect/retry/polling. Confirmed mutations reset affected queue/version traversal to page zero and refresh F03 when link availability changes, without converting refresh failure to mutation failure. Make T037's query cases pass; no copied sporting-text store or cache registry.
- [ ] T043 [US5] Build `apps/mobile/src/features/contributions/screens/moderation-screen.tsx` and `components/moderation-filters.tsx` with thin `apps/mobile/src/app/(ordinary)/administration/stream-links/index.tsx` route and F12 entry under existing admission. Compose literal search, filters, attention badges and loading/empty/error through F13 controls; reported active links remain to-review until their situation changes. Require literal true current capability, never a blanket role or maintenance bypass.
- [ ] T044 [US5] Build `apps/mobile/src/features/contributions/screens/moderation-match-screen.tsx`, `components/contribution-history.tsx` and thin `apps/mobile/src/app/(ordinary)/administration/stream-links/[matchId].tsx` route, making T037 pass. Show private hidden context, active link, paged versions/reports and applicable publication/replacement/withdrawal/approval/rejection/reactivation. Capture exact target/revision/actor with explicit confirmation, retain drafts, distinguish erased reason from invented text and source history from new reports. Follow [approved Figma references](plan.md#design-reconciliation-and-evidence) using F13 controls; no new primitive or recovery screen.
- [ ] T045 [US5] Qualify A29–A34 through `specs/010-live-contributions-moderation/quickstart.md#contracts-and-access`, `#versions-quotas-and-concurrency` and `#reads-and-mobile` with PostgreSQL, generated consumers and F12. Verify simultaneous decisions, full grant/no unrelated power, literal combined filters, totals beyond one page and no hidden-match publication. Repeat erased-owner race with T050; controlled erasure alone is insufficient.

---

## Phase 8: User Story 6 — Recover a reliable state after an interruption (Priority: P1)

**Goal**: Preserve exact intent, confirmed success and privacy across response loss, subsequent reads and erasure.

**Scope**: A35–A40; FR-015, FR-020, FR-022, FR-026, FR-034–041; SC-006/007.

**Independent Test**: Lose/delay mutation responses, fail bounded reads, change session/erase accounts, then verify no replay, reclaimed ownership, transferred report or reversal of confirmed success. F07 required internal effects are atomic with the command.

### Tests for User Story 6

- [ ] T046 [P] [US6] Write failing erasure-participant cases in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionErasureIntegrationTest.java`. Exercise F05 erasure across version owners, publication/approval/later decision actors and several reporters/reasons, including hidden/ownerless pending versions. Preserve counts/holds/decisions, distinct anonymous rows, lineage and unrelated quotas; no new activity, ownership recovery or sporting-root acquisition after F05's account lock. Combine actual reactivation/report/submission races with failed-erasure rollback.
- [ ] T047 [P] [US6] Write failing interruption/session cases in `apps/mobile/src/features/contributions/__tests__/contribution-recovery.test.tsx` using actual generated calls/QueryClient and controlled delays. Cover submission/cancel/withdraw/report/every moderator action: one bounded authorized current read after uncertainty, failed read retaining ordinary error/draft, delayed completion after read, newer state without historical-success claims and no replay. Confirmed success survives read failure; old callbacks are rejected after session change, A → guest → A and initiating-view unmount.
- [ ] T048 [P] [US6] Write failing safe-diagnostic cases in `apps/backend/src/test/java/com/blockout/backend/contributions/api/ContributionFailureLoggingTest.java` and `apps/mobile/src/features/contributions/__tests__/contribution-diagnostics.test.ts`. Distinguish policy refusal/conflict, uncertain mutation and unexpected SQL/read failure with accountable boundary/correlation. Exclude URLs/query strings, reasons, identities, tokens and provider payloads; F05/F11's original-target cleanup exception does not extend to contribution content.
- [ ] T049 [P] [US6] Prepare native cases in `specs/010-live-contributions-moderation/quickstart.md#reads-and-mobile` for narrow/light/dark/system appearance, enlarged text, VoiceOver/TalkBack, focus/actions, active/pending coexistence, quotas, erased reasons and interrupted recovery. State required iOS/Android builds, actual owners and controlled network/time fixtures; no web-prototype or provider-availability evidence substitutes for native proof.

### Implementation and qualification for User Story 6

- [ ] T050 [US6] Implement `apps/backend/src/main/java/com/blockout/backend/contributions/application/EraseContributionAttribution.java` and wire it into F05's `apps/backend/src/main/java/com/blockout/backend/accounts/application/EraseAccount.java`. Preserve “Account deletion clears author/decision references and report reasons, preserves counted facts, holds and historical versions, and cannot restore ownership on re-registration.” Clear every original-account attribution/reason in F05's transaction/account lock without sporting locks or changing versions/holds/quota flags/activity. Make T046/actual-owner T034 pass. F05 retains orchestration/provider cleanup; F11 handles personal content inside addresses through its existing rights procedure.
- [ ] T051 [US6] Implement bounded uncertainty/conflict recovery in `apps/mobile/src/features/contributions/api/own-contributions.ts`, `contribution-reports.ts` and `moderation.ts`. Read owner context/member for submit/withdraw/cancel, own-report state for reporting and administrative context/member for moderation exactly once through bounded F13 transport. A conflict needs fresh state before another explicit command. Failed reads retain ordinary retry/draft; later explicit retry may read again. Current state cannot prove historical execution or exclude later delayed completion. Make T047 pass without retrying writes, inferring reactivation success or persisting operations.
- [ ] T052 [US6] Complete session/freshness behavior across `apps/mobile/src/features/contributions/api/own-contributions.ts`, `contribution-reports.ts` and `moderation.ts` using F05 generation/F13 Query. Cancel/remove private queries at session change, reject old callbacks even if cancellation fails, and preserve confirmed success when dependent reads fail. Confirmed changes reset affected private traversal to page zero; preserve still-authorized data on ordinary read failure, refresh F03 link data and retain its accepted foreground/navigation behavior. Restrictions revoke access; outages do not invent absence. No polling/offline queue or replacement cache.
- [ ] T053 [US6] Integrate safe errors/diagnostics at `apps/backend/src/main/java/com/blockout/backend/contributions/api/ContributionExceptionHandler.java` and `apps/mobile/src/features/contributions/api/contribution-errors.ts` through F13, making T048 pass. Keep expected refusal/conflict distinct from unexpected failure, safe user reasons/correlation and one accountable failure boundary. Private moderation/addresses/reasons appear in no public diagnostic; no raw payload trace or F08-specific monitoring stack.
- [ ] T054 [US6] Qualify actual F02/F07 atomicity in `apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java` after T013 and F07's announcement/inbox handler exist. Establish failing real-boundary cases before binding that production handler, then exercise its genuine mappings/transactions: result/publication order under match lock, complete sorted affected-account locking, rollback of required internal failure, no-op/refusal distinction, current link composition and no renewed allowance after controlled reactivation/report-reset/row-purge fixtures. Actual moderation-command sequences are qualified by [F07 T046](../011-notifications-delivery/tasks.md#phase-6-user-story-5--view-information-that-remains-authorized-priority-p1), and actual scheduled purge by F07 T052, after those implementations exist. Push is after commit; F07 owns recipients, deduplication, maintenance and best-effort delivery. No full provider push qualification is needed for this SQL proof.
- [ ] T055 [US6] Execute A35–A40 through `specs/010-live-contributions-moderation/quickstart.md#versions-quotas-and-concurrency` and `#reads-and-mobile` with actual F05 erasure, F03 public projection and F12 grants/admission. Feed this evidence into F05 T035 rather than duplicating orchestration. Verify anonymized reasons/counts, ownerless usefulness, no ownership on registration, old actor refusal and actual generated response-loss/delayed-completion behavior; private fixtures/results remain private.
- [ ] T056 [US6] Execute T049 with real iOS/Android builds via `specs/010-live-contributions-moderation/quickstart.md#reads-and-mobile` and the exact approved Figma references. Cover every story, current-state recovery, retained drafts/confirmed success, session isolation, shared appearance and assistive technologies. Preserve F03/F11 opening/ad behavior and F09's absent contribution privilege. Record passed/failed/unavailable native evidence separately from prototype/Figma approval and T054 SQL proof.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Finish actual generated-consumer, source-quality and qualification evidence.

- [ ] T057 Re-run canonical mobile generation/consumer compilation through `contracts/http/mobile/openapi.yaml`, `apps/backend/pom.xml` and `apps/mobile/orval.config.ts`. Execute T003 and actual endpoint/mobile response tests for enums, absent/null values, URI handling, strict requests, additive responses, page/count limits and deterministic regeneration; generated output remains ignored.
- [ ] T058 Apply karpathy-guidelines, code-documentation and relevant Java/Spring/testing, OpenAPI, Liquibase, React/Expo/testing and logging guidance throughout touched handwritten files under `apps/backend/src/main/java/com/blockout/backend/contributions/` and `apps/mobile/src/features/contributions/` plus actual F03/F05 integrations. Keep domain values independent of generated transport, boundary mapping explicit, forms/Query/native mechanisms ordinary and logs safe. Remove speculative abstractions, empty scaffolding or duplicate owner logic without widening scope.
- [ ] T059 Run the implemented workspace's relevant tests and complete `specs/010-live-contributions-moderation/quickstart.md` evidence for A01–A40/SC-001–007. Use real targets, preserve precise F07/SQL/native/provider evidence limits and list unavailable qualifications without claiming success. Run `README.md#verification` documentation/OpenAPI checks; no performance programme, production action or unrelated runtime.

---

## Dependencies & Execution Order

### Phase Dependencies

Setup → foundation blocks all stories. Within each story, tests precede associated implementation, models precede services, services precede endpoints and integration follows its actual inputs. Prepare native cases before execution. Polish follows all selected stories; no story is complete solely from documentation.

| Phase      | Immediate order                                                       | Actual integration / evidence boundary                                                                                                   |
| ---------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation | T001 → T002 → T003/T004 → T005.                                       | F13 generation, F05 usable original-account context and F12 action definitions.                                                          |
| US1        | T006–T009 → T010–T016 → T017. Quotas exist from T011/T012.            | Current F02/F05/F12, F03 entry; T006/T008/T012–T014 and T054 share the F02/F07 atomic delivery before production submission is complete. |
| US2        | US1 state/reads → T018/T019 → T020–T022.                              | T023 closes decision/erasure sequences with US5/T050; no prerequisite cycle.                                                             |
| US3        | US1 quota reads and US2 personal screen → T024 → T025.                | T026 reuses early backend tests with actual lifecycle decisions/T051.                                                                    |
| US4        | US1 revision/hold/submission boundary → T027/T028 → T029–T032.        | T033 needs actual US5 selection/reactivation and T050 for full report-history proof.                                                     |
| US5        | US1 direct publication/locks and US4 reports → T034–T037 → T038–T044. | T045 requires real grants/current sporting reads; erased-owner race completes with T050.                                                 |
| US6        | Relevant commands/queries/schema → T046–T049 → T050–T053.             | T054 actual F02/F07; T055 actual owner integrations; T056 native builds.                                                                 |
| Polish     | All stories and required proofs → T057–T059.                          | No runtime/provider qualification inferred from documentation or controlled participants.                                                |

### Shared Owner Dependencies

- [F13 tasks](../003-shared-quality/tasks.md): bounded T001–T017 foundation, existing JWT/generated transport, T040 Query binding and T067–T069/T071 UI. [F14 initialization](../014-v1-v2-transition/plan.md) precedes [F05 T004](../005-accounts-identity/tasks.md); F13 T040 follows that session owner. No wait for all F13 operations or late cutover.
- [F02](../002-sporting-data/plan.md#acceptance-and-concurrency): current sporting identities/result/time/professional/visibility projections, owner-ordered locks and result acceptance. [F02 tasks](../002-sporting-data/tasks.md) T011/T030–T032/T037/T040 provide corresponding reads/writes; no JPA entity sharing or F08 sporting classifier.
- [F05](../005-accounts-identity/tasks.md): T009/T010 account identity/lock, T013 current account, T021/T022 principal-age evidence, T029 erasure and T035 full participant proof. [F12](../013-administration-app-configuration/tasks.md) T007–T009 owns grants/checks/projection and T025/T028/T029 admission/bypass. F08 cannot establish accounts from ordinary reads, perform provider age lookup inside SQL or duplicate permission assignment.
- [F03](../007-sporting-consultation/tasks.md) T017/T047/T052 owns contextual entry/neutral exact-version stream opening. F08 supplies current public link and private forms; F03 owns viewability/display time and F11 navigation counting.
- [F07](../011-notifications-delivery/plan.md#announcement-processing) owns announcement/inbox processing and after-commit push. T013/T054 are specific transaction dependencies, not a full-feature authoring prerequisite. Aggregate concerned accounts before sorted locking and re-read eligibility under locks; no required effect can move to a best-effort job.
- [F09](../006-pro-subscriptions/plan.md) owns entitlements; [F11](../004-advertising-privacy-legal/plan.md) owns privacy/ads; [F10](../012-reports-feature-suggestions/plan.md) owns general support. None creates an F08 subscription gate, support workflow or private diagnostic exception.

### User Story Dependency Graph

```text
F13 bounded foundation + F02/F05/F12 inputs → setup/foundation
foundation → US1 submission/quota/transition boundary
US1 → US2 personal lifecycle → US3 quota presentation
US1 → US4 exact-version reports/hold
US1 + US4 → US5 complete moderation
actual commands + F05 → US6 erasure/recovery
F02 + F08 + F07 transactional handler → T054 atomic integration
all stories + actual native builds → final qualification/polish
```

US4 may begin after its US1 inputs without US2/US3 screens. Their final cross-story proofs wait for actual decisions/erasure without blocking those implementations. The first MVP is protected submission, not permission to omit quotas, required F07 effects or remaining P1 journeys.

### Parallel Opportunities

Marked tests use different files after shared inputs. Serialize changes to `contributions.xml`, `JpaContributionStore.java`, `JpaContributionReadAdapter.java`, `ContributionApiMapper.java`, native query modules/forms, F03/F05 integration files and quickstart. A different story label does not make a shared-file edit parallel.

## Parallel Examples by User Story

- **US1**: T006 HTTP + T007 policy + T008 PostgreSQL + T009 mobile cases. T010–T016 follow required inputs; F07 real binding remains T054.
- **US2**: T018 backend + T019 mobile cases; lifecycle commands/APIs/UI then follow.
- **US3**: T024 is self-contained mobile test preparation after quota inputs; no independent backend implementation is needed because protection already lives in US1.
- **US4**: T027 backend/report cases + T028 mobile cases before T029–T032.
- **US5**: T034 decisions + T035 reads + T036 HTTP + T037 UI. Serialize shared store/mapper/query edits.
- **US6**: T046 erasure + T047 recovery + T048 diagnostics + T049 native preparation. Real-owner/device proofs follow implementation; no concurrent quickstart edits.

## Implementation Strategy

1. **MVP first**: Complete setup/foundation and US1; prove protected ordinary/moderator submission, current permissions, age/time/quotas and conditional uniqueness. Controlled F07 tests are not an integrated release gate pass.
2. **Incremental delivery**: Add personal lifecycle and quota presentation, exact reports/hold and complete moderation; validate each independent story before claiming completion. Related outcomes remain explicit later proofs.
3. **Real boundaries**: Integrate F05 erasure, session/current-state recovery and actual F02/F07 atomicity. Qualify native devices/design/accessibility with current grants/visibility and no replay.
4. **Completion**: Execute generated consumers and final quickstart. Retain manual/error limits, report unavailable evidence and keep provider configuration, production operations and deployment separately authorized.
