---
description: "Implementation tasks for F07 notifications, inbox and push"
---

# Tasks: F07 notifications, inbox and push

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/README.md](contracts/README.md) and [quickstart.md](quickstart.md).

**Prerequisites**: Accepted owning sources, [constitution](../../.specify/memory/constitution.md) and [agent guidance](../../AGENTS.md). This artifact prepares implementation, not application initialization, provider configuration or production operations. Documentation checks establish no runtime, SQL, generated-consumer or device result.

**Tests**: A01–A52 and SC-001–008 explicitly require qualification. Write automated tests first and observe meaningful failure before their associated implementation. Prepare manual/native cases before executing them with actual prerequisites. Early stories implement the invariants they need: result composition, stable variants, logical expiry and original-account isolation cannot wait for later presentation or physical-purge stories.

**Organization**: Bounded setup/foundation, then P1 US1/US3/US4/US5/US7 followed by P2 US2/US6 in specification priority order. All remain required V2 scope. F07 owns announcements, inbox and destinations; F02/F03/F05/F06/F08/F12 retain their concepts.

## Format: `[ID] [P?] [Story] Description`

- `[P]` marks separate files with no unfinished dependency between those tasks, after stated prerequisites.
- `[USn]` maps to the specification's story, not phase number; setup/foundation/polish have no story label.
- All checkboxes describe future implementation. Cross-feature task references name their owner explicitly.

## Path Conventions

- Backend lives in `apps/backend/src/main/java/com/blockout/backend/notifications/` with mirrored tests under `src/test/java/`. Expose immutable application values/ports; do not import another feature's repositories or expose JPA entities/generated DTOs across domain boundaries.
- Mobile lives in `apps/mobile/src/features/notifications/` with co-located `__tests__/` and thin Expo Router entries. Reuse F13 transport/Query/UI and F05 session generation.
- Canonical definitions remain `contracts/http/mobile/notifications/{paths,parameters,schemas}.yaml` and the mobile root. F13 generates Java interfaces/DTOs and Orval functions/types/Zod into ignored outputs.
- Schema uses the existing Liquibase master and `apps/backend/src/main/resources/db/changelog/notifications.xml`. Expo provider vocabulary belongs only in its adapter, never another mobile contract or deployment.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Reuse the selected applications/tooling and add only the accepted native package.

- [x] T001 Verify F13 T001–T017 through `apps/backend/pom.xml`, `apps/mobile/package.json` and `apps/mobile/orval.config.ts`: Java 25/Spring Boot 4.1.1, PostgreSQL 18.6, Expo 58/React Native 0.88/React 19.3.0, pinned Query and existing JUnit/Testcontainers/Jest tools. Add the SDK-compatible expo-notifications patch through ordinary Expo installation during implementation; no shared-stack upgrade, Java community SDK or sender service. Use actual workspace commands from `README.md`.
- [x] T002 Inspect `apps/backend/src/main/resources/db/changelog/db.changelog-master.xml` and actual environment posture through `README.md`. Extend the mutable XML baseline only while all environments are disposable and no retained version has run; otherwise append immutable changes. Preserve application/migration role separation with no reset or speculative release migration.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish canonical generated boundaries and current original-account access.

- [x] T003 [P] Write failing generated-binding cases in `apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractWebMvcTest.java` and `apps/mobile/src/features/notifications/__tests__/notification-contract.test.ts`, with test-scoped adapters before endpoints exist. Cover the four finite families, strict request/null rejection, read=true only, additive responses, absent nextCursor/end and nextExpiryAt/zero, twenty-entry arrays, authored int64 count, timestamp/UUID precision, reused F03 match/division semantics, 204 without JSON and one-time F13 validation. No opened state, public destination echo or manual notification DELETE.
- [x] T004 [P] Write failing original-owner/session cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationAccessWebMvcTest.java` and `apps/mobile/src/features/notifications/__tests__/notification-context.test.ts`. Cover usable authenticated UUID, guest/unavailable/other/erased/recreated accounts, wrong-environment/collector credentials, independent F12 admission/explicit bypass, no Pro/moderator foreign access, and A → guest/B → A callbacks even if cancellation fails.
- [x] T005 Define immutable owner context in `apps/backend/src/main/java/com/blockout/backend/notifications/application/NotificationContext.java` and generated key composition in `apps/mobile/src/features/notifications/api/notification-keys.ts`. Make T004 pass with F05/F12, one QueryClient and account/session keys; continuation is the native infinite-query page parameter. No second session owner, persistent inbox cache, generic client wrapper or device identity used as authorization.

**Checkpoint**: Contract/context tests are ready. Controlled inputs permit isolated development; actual owner/device proofs below remain necessary.

---

## Phase 3: User Story 1 — Learn a relevant result without repetition (Priority: P1) 🎯 MVP

**Goal**: Commit one eligible result announcement and its recipient entries with the sporting acceptance, fixing composition once.

**Scope**: A01–A08; FR-002–004, FR-007, FR-009, FR-011–016, FR-024, FR-038–039, FR-043; SC-001 and shared composition/editorial integrity.

**Independent Test**: Accept first final results for known matches, distinguish initial finished discovery/history/provisional states, overlap follows and race publication. Verify composition/recipient facts even with zero recipients and rollback only the affected match.

### Tests for User Story 1

- [x] T006 [P] [US1] Write failing announcement policy cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/ResultAnnouncementTest.java`. Cover F02 previous/current finality and trusted import/reconstruction, professional matches, no H+4/H+6 limit, current public F08 link fixing plain/enriched composition, enriched consuming both result/post-result categories and earlier live remaining independent. Zero-recipient processing, corrections, hiding/restoration, purge and unchanged repeats never reset facts; imported link availability is no later publication.
- [x] T007 [P] [US1] Write failing PostgreSQL producer/recipient races in `apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementTransactionIntegrationTest.java`. Cover same-match concurrent acceptance/publication, one entry for union of both teams/pool, uncertain/unfollowed relation exclusion, controlled current-account row removal and sorted locks; T040 later qualifies the actual F05 erasure orchestrator. Required internal failure rolls back that match's sporting state/facts/inbox, not other committed matches; after-commit failure cannot roll it back. Use controlled producer/current-link inputs initially and actual F02/F08/F06 at T014; no production no-op participant is completed integration.
- [x] T008 [P] [US1] Write failing stable-editorial cases in `apps/backend/src/test/java/com/blockout/backend/notifications/domain/NotificationMessageTest.java` before initial entry rendering. Require at least three French variants for each of four families, stable chosen variant across devices/retries, reliable facts and fallback for missing names/scores/special results, removed false fragments on correction, no invented winner/urgency or verified/free/active video claim. Later US6 qualifies actual native presentation, not a delayed backend safety rule.

### Implementation and qualification for User Story 1

- [x] T009 [US1] Add `apps/backend/src/main/resources/db/changelog/notifications.xml` and `apps/backend/src/main/java/com/blockout/backend/notifications/infrastructure/MatchAnnouncementEntity.java` / `NotificationEntity.java` with focused `application/NotificationStore.java`. Preserve “One F07-owned record keyed by the F02 match UUID holds processed live, result and post-result-link categories, plus composition fixed at result acceptance.” and “These facts contain no account reference, message, score, editorial variant, read state or delivery payload.” Quote personal constraints: “UUID, immutable personal entry identity.”; “Existing owner identities; account erasure deletes the entry.”; “Plain result, enriched result, live link or post-result link; fixed at creation.”; “Stable selection among the family's French editorial variants. Unknown sporting values use appropriate fallback wording without changing family or inventing facts.”; “Non-null UTC instant of original creation, never reset by reading, correction, visibility or delivery.”; “Non-null false initially; only transition is false → true. Repeated true is a no-op.” Preserve “Unique `(accountId, matchId, family)` supplements consumed match facts.” Add owner/date/UUID, owner/read and age indexes, register the XML and retain match facts independently of personal erasure/purge; no synchronized counter or event journal.
- [x] T010 [US1] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/ProcessResultAnnouncement.java` and `infrastructure/JpaNotificationStore.java`, making T006/T007's isolated cases pass. Join the producer transaction under F02's match/root locks; use previous/current result and trusted discovery context, read current public F08 link and fix composition before personal creation. Record processed facts even with no audience; first finished discovery/history suppress notices without allowing unchanged later observations to masquerade as new events. Preserve available allowance for a genuinely later F08 publication as specified. No after-commit inbox creation or per-person composition.
- [x] T011 [US1] Implement focused recipient selection in `apps/backend/src/main/java/com/blockout/backend/notifications/application/AnnouncementRecipients.java` using F06's `ReadFollowEligibility` boundary and F05 account locks. Collect concerned account IDs before sorted account locking after all necessary F02 roots; relookup current usability/follow eligibility under locks, without earlier-root/account acquisition afterward. Deduplicate both-team/pool overlaps and retain original relation IDs for ephemeral send context. Display season is no preference; new/recreated follows receive no backfill or old-send continuity.
- [x] T012 [US1] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/domain/NotificationMessage.java` and `NotificationVariant.java`, making T008 pass. Choose/store one finite family variant at creation and derive French text from current owner projections without copied sporting text. Adapt missing/withdrawn facts within that choice, keeping family/variant/identity/time/read stable; cover all four families before any push renders them. No localization service, editorial experiment engine or new announcement from wording.
- [x] T013 [US1] Bind F02's `apps/backend/src/main/java/com/blockout/backend/sporting/application/service/AcceptMatchObservation.java` to T010/T011 and F08's `apps/backend/src/main/java/com/blockout/backend/contributions/application/ReadPublicContribution.java` under the shared match transaction. Coordinate the full affected account set before locks, propagate required persistence failure and expose an immutable newly-created send context for later after-commit handling. F02 owns sporting acceptance; F08 owns public link state. No optional/no-op production hook, transport call in SQL or copied owner logic.
- [x] T014 [US1] Execute A01–A08 and actual composition/rollback through `specs/011-notifications-delivery/quickstart.md#essential-scenarios` and T007 with F02 T029/T033, F08 T013/T054 and F06 T012. Assert zero-recipient facts, current overlap union, one-match rollback and preserved independent matches. Backend result MVP does not claim inbox UI, push receipt or all link timing complete.

---

## Phase 4: User Story 3 — Manage the inbox and unread entries (Priority: P1)

**Goal**: Page current personal entries, mark read on tap and present the confirmed whole-inbox count.

**Scope**: A18–A25; FR-001, FR-017–023, FR-031, FR-034, FR-036–038, FR-041, FR-044; SC-003.

**Independent Test**: Traverse equal-timestamp entries while rows appear/disappear, read across devices and lose acknowledgements; preserve monotone read state and current all-page totals, including local expiry offline.

### Tests for User Story 3

- [x] T015 [P] [US3] Write failing MVC collection/member/summary/PATCH cases in `apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationsWebMvcTest.java`. Cover original owner/admission, malformed cursor 400, hidden/expired/missing member 404, true-only atomic application/json input, repeated read 200, Accept-Patch/no-store and canonical errors. No list total, opened mutation, manual DELETE or recreation after purge.
- [x] T016 [P] [US3] Write failing real PostgreSQL cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java` and `MarkNotificationReadIntegrationTest.java`. Cover current F02/F03 visibility before paging/counting, twenty-row keyset order createdAt DESC/id DESC with tied timestamps, deleted cursor anchor, inserts/controlled row deletion/corrections, malformed keys/precision, coherent multi-query projections and no N+1. Test all-page count/minimum expiry including unloaded entries, just before/exactly 29 elapsed days, concurrent reads/marks and controlled account-row deletion, and monotone true without age/order reset. T052 owns actual purge/F05 erasure races after both implementations exist; T051 owns operational restoration.
- [x] T017 [P] [US3] Write failing real-Query/interaction cases in `apps/mobile/src/features/notifications/__tests__/inbox.test.tsx`: loading/empty/initial/next-page failure, failed continuation retaining boundary, first-page refresh replacing traversal only on success, separate navigation/read outcomes, lost read response with discreet current read or explicit safe repetition, no automatic mutation retry and no color-only read distinction. Cancel old reads around confirmation; delayed responses must not overwrite true, known removal or newer summary.
- [x] T018 [P] [US3] Write failing controlled-clock expiry/badge cases in `apps/mobile/src/features/notifications/__tests__/inbox-expiry.test.tsx`. Cover seven unread/two loaded, summary expiry on an unloaded row, exactly 29 elapsed days before render/resume and while active/offline, DST-independent age, stale responses and zero badge. At nextExpiryAt invalidate an unprovable exact total instead of subtracting loaded rows; distinguish supported system badge from launcher behavior and clear app-controlled badge on session change.

### Implementation and qualification for User Story 3

- [x] T019 [US3] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/ReadInbox.java`, `infrastructure/JpaInboxReadStore.java` and focused `api/NotificationCursor.java`. Make T016 pass using supported Spring Data specification/fluent keyset scrolling, not string-based @Query scrolling; projection includes non-null sort values. Encode only original date/UUID in opaque URL-safe cursor, validate syntax/precision and apply current owner/visibility/age predicates on every page without anchor lookup/signing/registry. Derive current F03 match/division and T012 text; use short read-only repeatable-read for related multi-query responses. Summary computes count and minimum expiry together, absent expiry exactly at zero; no page-derived count or copied sporting content.
- [x] T020 [US3] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/MarkNotificationRead.java` with `infrastructure/JpaNotificationStore.java`, making T016 pass. Verify usable original account and retained/currently viewable exact entry; acquire any necessary owner-ordered sporting roots before account locks, never afterward. Only false → true; repeated true is no-op and missing/hidden/expired returns 404 without insert. Return current representation without changing original time/family/variant or coupling success to navigation.
- [x] T021 [US3] Implement generated owner collection/member/summary/PATCH in `apps/backend/src/main/java/com/blockout/backend/notifications/api/NotificationsController.java` and `NotificationApiMapper.java`, making T003/T015 pass. Keep canonical no-store/errors/Accept-Patch, reused F03 semantics and exact omission behavior. No direct old video URL, private moderation information, delivery-status endpoint or manual inbox deletion.
- [x] T022 [US3] Implement `apps/mobile/src/features/notifications/api/inbox-queries.ts` and `inbox-mutations.ts` with generated functions/F13 Query. Make T017 pass using account/session keys and native first-page refresh with staleTime zero/pages one, swapping traversal only after success. Refresh on opening, foreground, confirmed action and manual request; US4 adds receive events. Cancel older queries around read confirmation and preserve monotone true in current-session cached entries; protect refreshed summary/removal from stale callbacks without a read journal. A lost acknowledgement permits one bounded current member read or later explicit safe true repetition with ordinary feedback; no dedicated verification screen or automatic write replay.
- [x] T023 [US3] Implement `apps/mobile/src/features/notifications/state/inbox-expiry.ts` and `native/notification-badge.ts`, making T018 pass. Apply original-createdAt 29-day filtering before display/resume and to incoming responses; use ordinary in-memory timeouts for the next loaded/summary expiry while active, not network polling or a persisted registry. At nextExpiryAt invalidate the total and remove an unprovable exact badge offline; never infer total from partial pages. Use setBadgeCountAsync only from current confirmed summary, reset to zero on account/session change without blocking it, and tolerate unsupported badges. Known expired/restricted content cannot return from older data.
- [x] T024 [US3] Build `apps/mobile/src/features/notifications/screens/notifications-screen.tsx`, `components/notification-item.tsx` and thin `apps/mobile/src/app/(ordinary)/(tabs)/notifications.tsx`, composing the tab badge through `apps/mobile/src/app/(ordinary)/(tabs)/_layout.tsx`. Use F13 controls/current F05 admission, French read/unread accessibility, normal empty/errors/pagination and no delete/archive/restore UI. On tap request exact owner read and F03 match navigation independently; list display alone never marks read and navigation failure never undoes confirmed read. Push taps integrate the same boundary in US4.
- [ ] T025 [US3] Execute A18–A25 via `specs/011-notifications-delivery/quickstart.md#essential-scenarios` with actual generated consumers, PostgreSQL and F03 target navigation. Verify all-page counts, removed cursor anchors, offline age, read/refresh races and correct account scope. Actual system badge/device behavior is T041; full purge/restore proof is US7, without deferring T019/T023's logical cutoff.

---

## Phase 5: User Story 4 — Receive best-effort push on devices (Priority: P1)

**Goal**: Attempt ordinary after-commit push through exact current associations, preserving inbox and privacy across failure/session changes.

**Scope**: A26–A33; FR-023–030, FR-035, FR-037–038; SC-004.

**Independent Test**: Register/rotate multiple installations, race old removal/receipts/registration, deny permission and fail partial sends/receipts; preserve inbox with no resend or foreign-account effect.

### Tests for User Story 4

- [ ] T026 [P] [US4] Write failing PostgreSQL association cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/PushSubscriptionIntegrationTest.java` before T032. Cover same OS/different installation, unique installation/address, full reassociation under sorted affected-account locks, conflict rollback, token rotation retaining ID, fresh sign-in ID, revision increment even with unchanged address and exact old DELETE/receipt not removing replacement. Actual account-erasure races and participant deletion are tested and completed with T038, after the F05 erasure orchestrator exists; they do not gate association construction.
- [ ] T027 [P] [US4] Write failing subscription MVC cases in `apps/backend/src/test/java/com/blockout/backend/notifications/api/PushSubscriptionsWebMvcTest.java`: strict complete PUT, original owner/admission, 201 with resource Location versus replacement 200, address not echoed, 409 uniqueness conflict and exact DELETE 204 including absent association. Bodyless removal bypasses JSON parsing; no job or 202.
- [ ] T028 [P] [US4] Write failing controlled-provider/send cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/PushDeliveryTest.java` and `infrastructure/ExpoPushClientTest.java`. Cover original surviving F06 relation versus remove/recreate, owner/entry/age/visibility/current content, premature or post-result live send, maintenance including operators and stale associations. Assert after-commit only, no send on rollback, limits 100 messages/project batch, 600 messages/second/project, 4 KiB payload and 1,000 receipt IDs. Test partial tickets, refusal/timeout/uncertainty, DeviceNotRegistered matching ID/revision/address only, one receipt check around fifteen minutes, lost work on restart/overload and no resend/catch-up.
- [ ] T029 [P] [US4] Write failing native-SDK/session cases in `apps/mobile/src/features/notifications/__tests__/native-notifications.test.tsx`. Cover permission refusal, explicit SDK handler suppressing foreground presentation and badge effects, discreet receive refresh, Expo-token acquisition after native token changes, session capture before async work, stale callbacks, rotation, fresh A → guest → A connection and already-transmitted old PUT limit. Test one bounded exact logout DELETE before credential discard, badge reset despite failure, cold-start/tap handled once/response cleared, same-owner read independent of navigation, wrong-account/guest tap with no old-inbox request and presented notifications left untouched.
- [ ] T030 [P] [US4] Prepare physical-device cases in `specs/011-notifications-delivery/quickstart.md#essential-scenarios` for isolated native iOS/Android builds and nonproduction destinations: permission/channel setup, foreground no presentation, background receipt, stale badges/system notifications, cold taps, maintenance, prolonged offline delivery, account changes and provider failure. Record prerequisites and acceptance-versus-phone-receipt evidence; Expo Go/mocks are not delivery proof.

### Implementation and qualification for User Story 4

- [ ] T031 [US4] Extend `apps/backend/src/main/resources/db/changelog/notifications.xml` and add `apps/backend/src/main/java/com/blockout/backend/notifications/infrastructure/PushSubscriptionEntity.java` / `application/PushSubscriptionStore.java`. Quote ID “UUID created for one sign-in association; new after every new sign-in, including the same account.”; installation “Random installation UUID, independent of account/OS version. Not an authentication secret.”; account “Usable original business account UUID, verified from the authenticated request.”; destination “Private replaceable destination, scoped to the configured project/environment; never logged.”; revision “Native JPA version used internally to guard stale receipt invalidation. Not a public session identifier.” Preserve “Unique installation and destination constraints prevent equivalent active bindings.” No per-device success ledger or cleanup credential.
- [ ] T032 [US4] Implement the cohesive replace/remove command family in `apps/backend/src/main/java/com/blockout/backend/notifications/application/ChangePushSubscriptions.java` and `infrastructure/JpaPushSubscriptionStore.java`, making T026 pass. Lock affected current accounts in sorted order, recheck original owner and atomically remove conflicts/replace the complete association; unresolved concurrent uniqueness failure rolls back as Conflict until the next normal registration occasion. Native JPA optimistic force increment advances revision on every successful registration, including unchanged address. DELETE targets exact owner/ID; conditional invalidation targets captured ID/revision/address. No provider call in SQL, client-time ordering, upsert engine or revocation registry.
- [ ] T033 [US4] Implement generated PUT/DELETE in `apps/backend/src/main/java/com/blockout/backend/notifications/api/PushSubscriptionsController.java` with `NotificationApiMapper.java`, making T027 pass using current F05/F12 authorization. Return only canonical ID/installation, correct Location/status and no-store/errors; no destination echo or delivery authority from an installation UUID.
- [ ] T034 [US4] Implement the focused `apps/backend/src/main/java/com/blockout/backend/notifications/infrastructure/ExpoPushClient.java` using Spring RestClient, server access-token configuration and bounded waits. Make adapter T028 pass: same-project batches/rate/payload limits, default provider lifetime, safe current title/body and only ownerAccountId/notificationId/matchId routing data. Omit badge and old video/profile fields. Parse per-ticket/receipt outcomes, without automatic resend, community SDK or provider-schema copy in mobile OpenAPI.
- [ ] T035 [US4] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/DeliverPush.java` and `infrastructure/PushDeliveryConfiguration.java` with ordinary Spring after-commit event handling, bounded async executor/paced batches and a scheduled in-memory receipt callback. Preserve “Ticket IDs retained for the single delayed receipt check live only in process memory.” Recheck maintenance, current owner/entry/age/visibility/content, original surviving relation and exact association before handoff; zero recipients/invalid eligibility means no send. Process each ticket and check receipts once around fifteen minutes, at most 1,000 IDs/request; invalidate only still-matching targets. No transaction spans provider calls; failure/restart/overload loses ephemeral work with safe diagnostics, never inbox or a replay deadline. The last check promises no atomic stop/recall across the network. Use the completed [F12 T032/T033](../013-administration-app-configuration/tasks.md#phase-6-user-story-4--retain-notifications-without-sending-during-maintenance-priority-p1) policy with its actual current-maintenance read; F12 T034 consumes this sender for integration proof.
- [ ] T036 [US4] Implement `apps/mobile/src/features/notifications/native/push-registration.ts` and `installation-identity.ts` using ordinary non-sensitive device metadata for random installation/current connection UUIDs, F05 generation and the native SDK. Fresh sign-in gets a new subscription UUID including same-account return; rotation retains it. On sign-in/foreground/native token-change, capture session before getExpoPushTokenAsync({ projectId }), discard obsolete results and cancel still-controllable requests before generated PUT. Never send the listener's APNs/FCM token as expoPushToken. An already-transmitted old PUT may arrive last; recover only at the next ordinary registration, with no persistent ordering/retry loop.
- [ ] T037 [US4] Compose `apps/mobile/src/features/notifications/native/notification-lifecycle.tsx` through the current root/session owner and F05's `apps/mobile/src/features/accounts/session/account-session-provider.tsx`. Make T029 pass: register setNotificationHandler with shouldShowBanner/shouldShowList/shouldPlaySound/shouldSetBadge false, receive listener requests discreet inbox/summary refresh without banner/sound/local alert, use SDK initial-response/tap APIs once then clear handled response. Same-owner taps attempt retained-entry read independently; guest/other-owner taps use only F03 current match navigation, never old inbox or video. One bounded exact-association DELETE precedes credential discard; clear private memory/badge regardless. Do not enumerate/dismiss presented notifications or retain cleanup credentials; F11 existing navigation counting remains. Complete this same increment with [F05 T017/T019](../005-accounts-identity/tasks.md#phase-4-user-story-3--keep-one-coherent-session-priority-p1), the actual T023/T024 inbox/badge and F11 sporting-opening boundary; do not defer the session wiring to a later consumer.
- [ ] T038 [US4] First write failing `apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationErasureIntegrationTest.java` cases for account erasure racing reassociation and in-flight work: remove every original owned entry/destination while preserving nonpersonal match facts and other accounts/installations. Then implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/EraseAccountNotifications.java` and wire it into F05's `apps/backend/src/main/java/com/blockout/backend/accounts/application/EraseAccount.java`. Make those erasure cases pass in the same original-account transaction/lock without acquiring sporting roots; delete all owned inbox/subscription rows immediately, including hidden entries. Preserve nonpersonal match facts and other accounts; pending sends recheck owner/entry/association. F05 retains orchestration/provider cleanup and full participant proof.
- [ ] T039 [US4] Configure accepted provider inputs in `apps/backend/src/main/resources/application.yaml`, `apps/backend/.env.example`, `apps/mobile/app.config.ts` and `infra/operations/README.md`: server Expo access-token protection, environment project ID, native APNs/FCM credentials/channels and SDK config plugin. Keep secrets/private destinations out of Git and activate only in an authorized isolated environment for T041. Document default provider lifetime (possibly four weeks), no live-specific TTL override, image extension, interactive push action or background sync. Add safe categories/counts/configuration alerts through F13, never notification content/tokens/tickets.
- [ ] T040 [US4] Execute A26–A33 and actual producer-to-after-commit integration through `specs/011-notifications-delivery/quickstart.md#essential-scenarios` with T028 controlled provider outcomes and real F02/F08/F06/F05/F12. Verify commits survive push failures, maintenance prevents every new send without suppressing inbox/purge, original relation continuity (reuse F06 T044), exact invalidation, erasure and last-accepted old-registration limit. Reuse F05 T017/T019/T020/T035 evidence; controlled transport is not receipt proof.
- [ ] T041 [US4] Execute T030 on physical iOS/Android devices via `specs/011-notifications-delivery/quickstart.md#essential-scenarios` after actual isolated credentials/native builds exist. Distinguish provider acceptance from observed phone receipt; cover permission denial, foreground no banner/sound/alert, stale/unsupported badges, retained system notices, old wrong-account/guest taps, expiration, maintenance and late registration. Preserve bounded logout/in-flight/recall limits; no guarantee from a successful sample delivery.

---

## Phase 6: User Story 5 — View information that remains authorized (Priority: P1)

**Goal**: Apply current sporting/moderation restrictions across real projections, caches, navigation and remaining sends.

**Scope**: A34–A37; FR-031–036, FR-038, FR-043–044; SC-005.

**Independent Test**: Hide/reappear a match or remove its link while reads/sends are delayed; retained entries keep original identity/read/age, known restrictions win and old pushes use current match access only.

### Tests for User Story 5

- [ ] T042 [P] [US5] Write failing actual-owner projection tests in `apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationVisibilityIntegrationTest.java` before completing the real bindings in T044. Exercise F02 withdrawal/inactive division/dateless/qualified empty-calendar, season closure alone, F08 hold/link withdrawal/reactivation and result correction. Assert current inbox/count/send predicates, no old address, retained original family/read/time and no purged-entry recreation or consumed-fact reset; early predicate tests already precede T019.
- [ ] T043 [P] [US5] Write failing integrated cache/navigation cases in `apps/mobile/src/features/notifications/__tests__/notification-visibility.test.tsx`. Cover a current F03 unavailable result overtaking a delayed inbox response, known restriction during offline error, link disappearance without hiding a still-valid result, reappearance of retained versus expired entries and old push under current access/maintenance. Distinguish unavailable target from network failure; no recall promise.

### Implementation and qualification for User Story 5

- [ ] T044 [US5] Complete actual current-owner bindings in `apps/backend/src/main/java/com/blockout/backend/notifications/application/ReadInbox.java` and `application/DeliverPush.java`, with bounded current selection in `infrastructure/JpaInboxReadStore.java`, through F02/F03 current projections and F08 `ReadPublicContribution`. Make T042 pass without copying entity repositories or synchronizing rendered text. Public viewability filters precede paging/counting; corrections derive current wording, never rewrite entry identity/family/variant/read/time. Hidden/reappearing/expired distinctions remain separate; no old video destination or professional-code-to-video inference.
- [ ] T045 [US5] Integrate F03's actual current-access outcomes into `apps/mobile/src/features/notifications/api/inbox-queries.ts` and `native/notification-lifecycle.tsx`, making T043 pass with existing F13 cancellation/F05 generation. Remove known-unavailable data from controlled cache/rendering and invalidate counts; stale responses cannot undo known restrictions. Preserve still-authorized data on ordinary outage, keep current match navigation and read outcomes independent, and permit retained reappearance only from a fresh authorized response. No restriction registry, silent push or stronger offline freshness promise.
- [ ] T046 [US5] Execute A34–A37 through `specs/011-notifications-delivery/quickstart.md#essential-scenarios` with actual F02/F03/F08/F12 and physical cases from T041. Check old access through inbox/count/cache/follows/push, current unavailable wording and retained read/order on reappearance. Exercise actual F08 hold/reactivation/report-reset commands and verify T054/T057's preserved consumed allowance; their earlier controlled state changes do not qualify those later command integrations. Already handed-off system messages may remain; this does not authorize new controlled exposure.

---

## Phase 7: User Story 7 — Keep a recent inbox without manual cleanup (Priority: P1)

**Goal**: Physically purge due personal data daily and preserve age/privacy/facts through failures and restoration.

**Scope**: A44–A52; FR-019, FR-037–038, FR-042–046; SC-007/008.

**Independent Test**: Exercise every family/read/visibility state at 29/30 elapsed days, interrupted daily cleanup, offline active use and restored data with lost facts/current erasure obligations.

### Tests for User Story 7

- [x] T047 [P] [US7] Write failing PostgreSQL purge cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java`. Cover just below/exactly 29 and beyond 30 elapsed days, every family/read/hidden state, DST/time zones, concurrent read/create, interrupted partial completion and next ordinary daily pass. Remove personal rows/associated ephemeral references without resetting facts/ages; original installation associations stay independently necessary. Assert no eligible read/count/send despite failed physical deletion, no archive/recreation and safe observable failure. T052 executes the actual concurrent F05 erasure case after its orchestrator and participant exist.
- [x] T048 [P] [US7] Prepare restoration/retention cases in `specs/011-notifications-delivery/quickstart.md#essential-scenarios` linked to F13's isolated restore: expired rows, since-erased account, privacy/right uncertainty, preserved versus lost match facts, original timestamps and private evidence. Include active/offline partial inbox and expiry on an unloaded row using T018; do not invent a restoration framework or claim fixtures prove operational reopening.

### Implementation and qualification for User Story 7

- [x] T049 [US7] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/PurgeNotifications.java` and ordinary daily scheduling in `infrastructure/NotificationRetentionConfiguration.java` with `JpaNotificationStore.java`. Make T047 pass: delete entries aged at least 29 elapsed days across all states, normally before 30, independent of maintenance. Preserve completed removals if later work fails, safely report incomplete cleanup and leave failed removal to the next daily pass/manual intervention. No dedicated retry schedule, user purge endpoint, tombstone ledger or renewed lifetime. T019/T023/T035 enforce cutoff regardless of physical cleanup success.
- [x] T050 [US7] Extend `infra/observability/README.md` and `infra/operations/README.md` with F07-owned safe purge outcome/configuration diagnostics and manual response through F13's existing stack. Persistent failure is a retention failure, not success or permission to retain longer; no personal payload, duplicate incident stream or guaranteed intervention time. Add the pre-reopen requirement to existing F13 restore instructions: remove due inbox, reconcile erasure/privacy/rights and retain available match facts; unknown obligations keep affected access/sends closed.
- [ ] T051 [US7] Execute T048 in the authorized isolated restoration environment through `specs/011-notifications-delivery/quickstart.md#essential-scenarios` with F13 T048/T056/T057 and actual current F05/F11/F12 obligations. Verify expired/erased data cannot reopen, original ages remain and lost match facts may exceptionally duplicate sporting announcements only within the accepted limit. Missing masking/restore/provider prerequisites block this proof, not ordinary local F07 development.
- [ ] T052 [US7] Execute A44–A52 through `specs/011-notifications-delivery/quickstart.md#essential-scenarios` with actual purge, generated reads/counts and T018/T023 mobile handling. Race actual F05 erasure with pages/reads/refresh/purge and stale responses, cross age 29 while active/offline, exclude unloaded-summary expiry, remove zero badges and show ordinary empty state without deletion controls. Reuse the completed actual US2 later-publication tests to prove an unused replay category can create a new entry after result purge without reviving consumed categories; this does not block US2 construction.

---

## Phase 8: User Story 2 — Hear about a link at the right time (Priority: P2)

**Goal**: Create live and later-link events from actual accepted publications/current eligibility without repeated categories.

**Scope**: A09–A17; FR-003, FR-005–013, FR-026, FR-032, FR-038, FR-042–043; SC-002.

**Independent Test**: Publish before/after H and result, correct unknown/reliable time and race accepted transitions; event-time audience and fixed result composition determine one permitted category without artificial grouping or backfill.

### Tests for User Story 2

- [x] T053 [P] [US2] Write failing time/publication policy cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementTest.java`. Cover before H/at H, unknown time, Paris/New York/DST, date correction before/after processing, pending/refused/unchanged F08 actions, accepted approval/reactivation and consumed categories. Public link at result acceptance uses US1's enriched composition; genuinely later publication can use only a still-unused replay category, including after initial finished discovery or personal purge.
- [x] T054 [P] [US2] Write failing due-pass/actual-producer cases in `apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java`. Race one-minute processing/publication/result, add follows between advance publication/H/actual processing, withdraw/hide before processing, and fail one match while another commits. Assert audience at actual processing with original relation IDs, no exact-H history, no duplicate zero-recipient processing, shared root/account order and rollback of required inbox/facts.

### Implementation and qualification for User Story 2

- [x] T055 [US2] Implement `apps/backend/src/main/java/com/blockout/backend/notifications/application/ProcessLinkAnnouncement.java` and bind F08's `apps/backend/src/main/java/com/blockout/backend/contributions/application/AnnounceContribution.java` to the same transaction/recipient/persistence boundaries as US1. Make T053/T054 pass: actual accepted availability only, live at reliable H before final result, later post-result category only if unused, no re-enrichment, and no allowance reset on replacement/reactivation/purge. Pending/refusal/no-op does not create an event; content corrections remain derived reads.
- [x] T056 [US2] Add `apps/backend/src/main/java/com/blockout/backend/notifications/application/ProcessDueLinkAnnouncements.java` and ordinary Spring scheduling in `infrastructure/LinkAnnouncementSchedule.java`: one eligibility pass each minute selects due public-link candidates with reliable instant/unconsumed live fact, then invokes independently proxied per-match transactions. Re-read current time/result/link/visibility, gather then lock affected accounts in owner order and select current follows at processing. Failure leaves eligibility for the next normal pass; no persisted timer, exact-H audience, new retry workflow or notification polling on mobile.
- [x] T057 [US2] Execute A09–A17 and T054 with actual F08 T013/T054, F02 T029/T033 and F06 T012 via `specs/011-notifications-delivery/quickstart.md#essential-scenarios`. Validate both publication/result orders, zero recipients, first finished discovery versus a later new publication, live plus enriched result, controlled result-row purge plus unused later-link allowance, and no reset from controlled hiding/reactivation state changes or delivery failure. T046 repeats the state-change cases through actual F08 moderation commands; T052 supplies the actual scheduled-purge sequence. Provider delivery remains T041's bounded evidence. Send-time relation continuity remains with [F06 T044](../009-following-personal-feed/tasks.md) and T040 after the push handoff exists; it is not a prerequisite for this producer/announcement qualification.

---

## Phase 9: User Story 6 — Understand accurate messages and local presentation (Priority: P2)

**Goal**: Present four stable French families and local times accurately through the actual inbox/native journey.

**Scope**: A38–A43; FR-015–016, FR-036, FR-039–042; SC-006.

**Independent Test**: Show all family variants with missing/special/corrected facts, local time zones and delayed push; no fabricated score, active stream or expanded professional-media scope.

### Tests for User Story 6

- [ ] T058 [P] [US6] Write failing actual presentation cases in `apps/mobile/src/features/notifications/__tests__/notification-presentation.test.tsx` with generated responses from T012 and US2's real families. Cover all three-or-more variants/family, score/name absence, special/withdrawn results, unavailable links, stable choice across refresh/device, Paris/New York instants and neutral F03 Stream link destination. Include narrow/large-text/read-unread accessibility and no manual cleanup/settings/campaign affordances.

### Implementation and qualification for User Story 6

- [ ] T059 [US6] Complete `apps/mobile/src/features/notifications/components/notification-item.tsx` and `screens/notifications-screen.tsx` using F03 local-time formatting/F13 UI and actual four-family responses, making T058 pass. Retain backend variant/facts, accessible French content and original creation order; display changes cannot trigger announcements. Reuse [approved inbox/match/guest design](plan.md#design-and-qualification), with no new foreground alert, deletion-progress screen, LNV TV collector or code-to-video inference.
- [ ] T060 [US6] Execute A38–A43 via `specs/011-notifications-delivery/quickstart.md#essential-scenarios` on actual iOS/Android builds with light/dark/system appearance, enlarged text and VoiceOver/TalkBack. Verify same instants/elapsed age across DST/time zones, accurate delayed wording and guest/changed-account return. Keep Figma/prototype approval distinct from native presentation, transport and accessibility evidence.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Complete generated integration, source quality and bounded implementation evidence.

- [ ] T061 Re-run deterministic generation/actual consumer compilation from `contracts/http/mobile/openapi.yaml` through `apps/backend/pom.xml` and `apps/mobile/orval.config.ts`. Execute T003 and real endpoint/client serialization for cursor precision, true-only intent, absent fields, finite enums, no-content removal, strict requests and additive responses; keep generated outputs ignored.
- [ ] T062 Apply karpathy-guidelines, code-documentation and relevant Java/Spring/testing, OpenAPI, Liquibase, React/Expo/testing and logging guidance across touched handwritten files in `apps/backend/src/main/java/com/blockout/backend/notifications/` and `apps/mobile/src/features/notifications/` plus producer/session integrations. Preserve explicit mappings, native Spring/Query/Expo mechanisms, private logs and one owner per boundary; remove speculative abstractions or empty scaffolding without widening scope.
- [ ] T063 Complete A01–A52 and SC-001–008 evidence in `specs/011-notifications-delivery/quickstart.md` using actual workspace targets and existing owner proofs. Record passed/failed/unavailable SQL, generated-consumer, device/provider and restore evidence separately, preserving accepted best-effort/offline/late-registration limits. Run `README.md#verification` documentation/OpenAPI checks without claiming runtime or production approval.

---

## Dependencies & Execution Order

### Phase Dependencies

Setup and foundation block every story. Tests precede associated behavior; shared models/transactions precede services/endpoints and real integration follows its inputs. P1 order is US1 → US3 → US4 → US5 → US7; P2 US2/US6 remain required. Smaller independently ready boundaries may proceed as below without waiting for whole features.

| Phase      | Immediate order                                                                   | Integration and evidence limit                                                                                         |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Foundation | T001 → T002 → T003/T004 → T005.                                                   | F13 generated/JWT/Query boundaries, F05 usable account and F12 admission.                                              |
| US1        | T006–T008 → T009–T013 → T014.                                                     | F02 accepted facts, F08 current public link, F06 relation identities and F05 locks; no full push/UI prerequisite.      |
| US3        | US1 entries/editorial → T015–T018 → T019–T024 → T025.                             | Logical 29-day exclusion and current visibility exist now; system-device proof waits for T041, physical purge for US7. |
| US4        | US1 ephemeral context + US3 inbox/read/badge → T026–T030 → T031–T039.             | T040 real owners/controlled provider; T041 actual isolated credentials and physical builds.                            |
| US5        | US3 read/cache and US4 send/navigation boundaries → T042/T043 → T044/T045 → T046. | Real F02/F03/F08/F12 restrictions, not only controlled projections.                                                    |
| US7        | US1 facts + US3 expiry → T047/T048 → T049/T050 → T051/T052.                       | Restore needs F13/current obligations; later unused-link proof needs US2 without blocking its implementation.          |
| US2        | US1 result/facts/recipients and F08 transition → T053/T054 → T055/T056 → T057.    | May develop once these bounded inputs exist; requires no complete push/native/restore programme.                       |
| US6        | T012 safe variants + actual families/US3 UI → T058 → T059 → T060.                 | Native visual/accessibility proof uses actual builds; backend message safety was implemented in US1.                   |
| Polish     | Required stories/proofs → T061–T063.                                              | Documentary success does not fill unavailable device/provider/restore evidence.                                        |

### Shared Owner Dependencies

- [F13 tasks](../003-shared-quality/tasks.md): T001–T017 foundation, generated HTTP/JWT, T040 session/Query, T067–T069/T071 shared UI and existing observability/restore. [F14](../014-v1-v2-transition/plan.md) initializes before [F05 T004](../005-accounts-identity/tasks.md), which precedes F13 T040. No late-cutover or full operations prerequisite for local F07.
- [F02 tasks](../002-sporting-data/tasks.md) T027–T033 supply authoritative result transitions, trusted discovery/reconstruction and producer transaction. [F08 tasks](../010-live-contributions-moderation/tasks.md) T012/T013/T054 supply the shared match order, current public link and accepted transitions. F07 owns facts/recipients/inbox; external push alone is after commit. Aggregate affected accounts before sorted locking after all needed sporting roots.
- [F06 tasks](../009-following-personal-feed/tasks.md) T009–T012 own persisted relation identity and current reads; T044 consumes F07 continuity proof. Removed/recreated relations are distinct; no historical audience table, notification preference or new F06 endpoint.
- [F05 tasks](../005-accounts-identity/tasks.md) T009/T010 own account identity/locks, T004 session, T019 bounded logout composition and T029/T035 erasure. F07 implements only its own persistence/native participant. [F12 tasks](../013-administration-app-configuration/tasks.md) T025/T028/T029 own ordinary admission/explicit bypass and current maintenance; operator status never exempts push suppression.
- [F03 tasks](../007-sporting-consultation/tasks.md) T005/T012 current projections, T009/T010 presentation classification and ordinary match navigation/opening remain owner boundaries. F07 uses authoritative F02 finality, never F03's six-hour classification. [F11](../004-advertising-privacy-legal/plan.md) owns existing ad/privacy rules, [F09](../006-pro-subscriptions/plan.md) entitlements; neither changes inbox eligibility.
- F14 imports neither old inbox nor pending V1 sends. F13 T048/T056/T057 owns restore orchestration and prerequisites; T050/T051 supply F07 expiry/fact/current-rights obligations without another restore catalogue.

### User Story Dependency Graph

```text
F13 + bounded F02/F05/F06/F08/F12 inputs → setup/foundation
foundation → US1 result composition + facts + entries + safe variants
US1 → US3 current inbox/read/count + logical expiry
US1 + US3 → US4 associations + after-commit push/native lifecycle
US3 + US4 + actual owners → US5 restriction integration
US1 + US3 → US7 physical purge → F13 isolated restore proof
US1 + F08 accepted transitions → US2 live/later-link processing
all actual families + US3 presentation → US6 native editorial qualification
required stories/proofs → polish
```

US1 T013/T014 needs only F08's public-link/transaction boundary, not complete moderation. US2 can use that boundary independently of full US4 device delivery. F05/F06 erasure/continuity proofs consume F07 once its participants exist; their bounded account/relation capabilities precede those proofs. No circular whole-feature blocker.

### Parallel Opportunities

Marked tests occupy separate files after prerequisites. Serialize shared `notifications.xml`, `JpaNotificationStore.java`, `JpaInboxReadStore.java`, `NotificationApiMapper.java`, native query/lifecycle/screen files, F02/F08 producer wiring, F05 root/session composition, operation runbooks and quickstart.

## Parallel Examples by User Story

- **US1**: T006 policy + T007 transactions + T008 messages; persistence/services then consume them.
- **US3**: T015 HTTP + T016 PostgreSQL + T017 Query/UI + T018 clock/badge cases before implementation.
- **US4**: T026 persistence + T027 HTTP + T028 provider + T029 SDK + T030 native preparation; actual native execution remains T041.
- **US5**: T042 real-owner backend + T043 mobile restrictions; serialize shared adapters/cache edits.
- **US7**: T047 purge tests + T048 restore preparation; T051 waits for the actual authorized restore environment.
- **US2**: T053 timing policy + T054 producer/due-pass integration; both precede T055/T056.
- **US6**: T058 is independent presentation-test preparation after real family inputs; no second backend editorial engine.

## Implementation Strategy

1. **MVP first**: Complete setup/foundation and US1, including real transactional rollback/composition and recipient identity. This proves a result-inbox backend increment, not push delivery or public launch readiness.
2. **Incremental P1 work**: Add current inbox/read/count/expiry, associations and best-effort push, restriction integration and daily purge; validate each story independently. Keep provider/device/restore evidence pending until its actual prerequisites exist.
3. **Complete V2 scope**: Add ordinary due/live/later-link processing and native editorial qualification. These P2 stories are not optional launch omissions; early shared integrity already protects their consumers.
4. **Finish evidence**: Run generated consumers, concurrency/native/restore cases and final quickstart. Preserve ordinary daily/minute passes, manual intervention and accepted delivery/offline limits without replay, a persistent queue or stronger guarantees.
