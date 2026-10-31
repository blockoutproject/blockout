# Quickstart: Qualify notifications, inbox and push

Follow the [local development setup](../../README.md#local-development) and run the [repository verification commands](../../README.md#verification). The scenarios below require the notification implementation and native provider setup; shared checks alone do not qualify inbox or push behavior.

The current [mobile state plan](plan.md#inbox-retention-and-mobile-state) uses native mutation invalidation and active Query observers, with ordinary eventual read-flag/count freshness. Recheck an uncertain PATCH acknowledgement, inactive/focused refetch and a subject change while reads finish. Existing dated qualifications retain the behavior of their named revision; former read-true overlay/member-reconciliation assertions do not certify this replacement. Active original-createdAt expiry and private ownership remain required.

## Prerequisites

Use the [generated HTTP boundary](../003-shared-quality/contracts/README.md) and actual PostgreSQL schema, fixtures for usable/deleted accounts and overlapping follows, accepted sporting transitions, and controlled Expo send/receipt doubles. Native checks require development/release builds on physical iOS and Android devices, separate nonproduction credentials and destinations, and known test accounts. Do not use real user payloads or Expo Go as delivery evidence.

The [model](data-model.md), [contracts](contracts/README.md) and owning specification define exact states. Use JUnit/Spring MVC/Testcontainers for server boundaries and Jest Expo/React Native Testing Library for mobile behavior. No additional E2E framework or load programme is required.

## Foundation evidence

T001 reuses the [shared stack](../003-shared-quality/plan.md) and SDK-compatible `expo-notifications`
(`~58.1.7` in the [manifest](../../apps/mobile/package.json)). Package compatibility does not qualify
provider configuration. T002 retains the XML master and [disposable baseline/freeze policy](../../README.md#local-development);
no external retained-data posture is qualified.

The [Java contract cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractWebMvcTest.java) exercise generated request binding and producer serialization through a test-only adapter. The [mobile contract cases](../../apps/mobile/src/features/notifications/__tests__/notification-contract.test.ts) exercise actual Orval consumers and one-time F13 response validation before cache admission. Request schema checks use Zod's native `.strict()`; generated Java does not enforce the boolean enum, so F07 explicitly requires true. Orval's multiple-success-status registration function needs the generated `PushSubscriptionResponse` supplied through the existing F13 `schema` request option, as for F05 establishment. Java server responses are serialization evidence, not a generated Java response-decoder qualification.

The [owner cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationAccessWebMvcTest.java) use real F05 resolution, native security and an isolated signed-JWT/JWKS boundary; account storage and the F12 admission decision are controlled. The [mobile context cases](../../apps/mobile/src/features/notifications/__tests__/notification-context.test.ts) use the existing session owner, transport and one QueryClient, including native infinite-query `pageParam`, A → guest/B → A and late completion without cancellation. These checks qualify the foundation only. Backend inbox endpoints and SQL are qualified [below](#current-inbox-construction-evidence); account-erasure orchestration, native permissions/lifecycle, physical devices and provider delivery remain with their owning tasks.

Run the README verification for current application, generator and Expo Doctor results;
revision-specific execution results belong to the delivery PR.

## Announcement construction evidence

T006–T012 implement the mandatory transactional F07 participant, nonpersonal consumed match facts,
unread personal allocations, current F06 recipient unions under sorted F05 account locks, and three
French variants for each of the four immutable families. Run the focused construction suites with
`./mvnw -B -ntp -pl apps/backend verify -Dtest='ResultAnnouncementTest,NotificationMessageTest' -Dit.test=AnnouncementTransactionIntegrationTest`.

The PostgreSQL suite explicitly migrates this worktree's disposable PostgreSQL 18.6 through the actual Liquibase master, then validates the JPA mappings. It exercises real F07 storage, F06 relations and F05 account locks with controlled producer transitions/current-link availability. It checks both concurrent composition orders, overlap deduplication and exact original relation IDs, account-lock UUID order, removal while waiting, controlled account-row deletion before/after creation, empty-audience facts without later backfill, silent final discovery/reconstruction preserving an unused post-result allowance even with an existing link, uniqueness, rejection of an existing notification UUID without resetting its read state, immutable origin/read state and non-reallocation after personal purge. A required F07 uniqueness failure rolls back the controlled sporting update and all F07 effects for that match while an independent match remains committed. A test-scoped Spring after-commit failure preserves already committed effects.

The [persistence rationale](research.md#transactional-inbox-and-approximate-start-time-announcements)
explains insert-only allocation and retained read-state protection. The database-free health HTTP
context replaces `NotificationStore`, consistently with its other controlled business persistence ports.

These controlled inputs do not qualify the actual F02/F08 producer binding or publication eligibility ([T013–T014](tasks.md)), the F05 erasure orchestrator or actual asynchronous sender ([T040](tasks.md)), inbox HTTP/mobile, scheduled purge, native devices, provider delivery or restoration. No production optional/no-op hook or transport call was added.

## Atomic producer and link qualification

F02 result acceptance now calls the required F07 participant and reads the real F08 public
contribution under the retained match lock. F08 accepted active publication joins the same
transactional facts/inbox writer; pending, refused and unchanged submissions create no event.
`ProcessLinkAnnouncement` consumes live at reliable H or later, and only a genuinely later
accepted publication can consume an unused post-result allowance. The ordinary native Spring
minute pass visits active-link identities in bounded keyset pages, skips consumed/not-yet-due
matches and invokes separately proxied per-match transactions. It selects F06 follows at actual
processing, rereading current relations after the complete account-lock set. It stores no timer,
exact-H audience, delivery status or retry queue.

[Cross-owner SQL cases](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionAnnouncementsIntegrationTest.java)
and [minute-pass cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementIntegrationTest.java)
exercise both serialized publication/result orders, overlapping/current/late follows, zero
recipients, a first finished discovery, trusted reconstruction, current result withdrawal,
required inbox failure and independent-match continuation. A separate transaction observes
committed notification rows before the controlled external handoff can fail. Handoff failures
are logged safely and dropped after commit, preserving the business response and inbox.
The context retains original relation identities for the later sender; actual association/send-time
continuity remains [F06 T044](../009-following-personal-feed/tasks.md) and [F07 T040](tasks.md).

The [timing policy suite](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementTest.java)
includes unknown time/availability, before/at/after H, Paris/New York instants across differing
DST weeks and consumed categories. Controlled personal-row deletion, hiding/hold and source-linked
quota-exempt reactivation fixtures prove that allowances survive those state changes; they do not
qualify actual moderation commands, report reset or scheduled purge ([T046 and T052](tasks.md)).
No actual push/provider/device result is claimed. Provider handoff remains US4; the immutable
`AfterCommitAnnouncements.Ready` event is its transient committed input.

The selected Spring [disabled cron value](https://docs.spring.io/spring-framework/docs/7.0.x/javadoc-api/org/springframework/scheduling/annotation/Scheduled.html#CRON_DISABLED)
is used only by isolated tests, which invoke the real pass explicitly. Production defaults to one
pass each minute. The shared PostgreSQL test fixture follows Testcontainers' documented
[singleton lifecycle](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/#singleton-containers),
reuses the existing role/migration setup, and is removed by Ryuk at JVM exit. Database ports are dynamic.

[Audience-turnover SQL](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/AnnouncementAudienceIntegrationTest.java)
confirms that an arriving follower cannot be discarded after account-lock waiting. A newly
required account aborts the transaction, preserving all allowances; the next ordinary minute
pass/collection or a new explicit contribution intent selects the complete current audience.
No automatic transaction replay is added. Contribution and detail-ingestion HTTP map this
case to the existing safe 409 conflict. [Division races](../../apps/backend/src/test/java/com/blockout/backend/contributions/application/ContributionSportingLocksIntegrationTest.java)
qualify season → division → match → accounts for submission, due links and result acceptance,
using the actual division lifecycle command. Deactivation cannot pass a producer waiting on
its accounts.

[The origin-snapshot regression](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/RecipientSnapshotIntegrationTest.java)
uses Hibernate's native statement inspector to rotate real committed follows between separate
team/pool reads. The F06 adapter reads both origins with one HQL `UNION ALL`, preserving each
relation's identity and target type in one PostgreSQL statement snapshot, qualified against Hibernate
7.4.5.Final/PostgreSQL 18.6 and the existing F06 SQL suite. The test hook is local
to that scenario; the production interface, transaction isolation and selected versions are unchanged.

## Current inbox construction evidence

T015/T016/T019–T021 implement owner collection/member/summary reads and the independent true-only
read intent. [HTTP cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationsWebMvcTest.java)
exercise the production generated controller, strict JSON/query handling, private cache headers,
canonical errors and shared admission. [Cursor cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationCursorTest.java)
exercise URL-safe keys and exact PostgreSQL microseconds/UUIDs. The existing generated Java/mobile
contract suites continue to cover strict requests and additive response/omission behavior.

[Read SQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/ReadInboxIntegrationTest.java)
use migrated PostgreSQL 18.6 with actual F03/F08 projections, tied original timestamps, removed
anchors, insertions, current restrictions, corrections and an all-page count/minimum expiry,
including an unloaded row just before/exactly 29 elapsed days. Native Hibernate statement
inspection commits a correction/removal between selection and hydration to verify the read-only
repeatable-read snapshot. A twenty-distinct-match case bounds query count to exclude N+1 reads.

[Read-command SQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/MarkNotificationReadIntegrationTest.java)
exercise committed monotone marks, repeated/concurrent intents, overlapping GETs and controlled
original-account/personal-row removal while a command waits. They preserve original age/order,
current authorization and non-personal consumed facts. These controlled deletions are not actual
scheduled purge or F05 erasure qualification. [T052](tasks.md) owns those races; [T051](tasks.md) owns restoration,
and [T017–T024](tasks.md) own native inbox behavior. No device, push/provider or production evidence is claimed.
Revision-specific commands and outcomes remain in the delivery PR.

## Current sporting and link visibility

[Current-owner SQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationVisibilityIntegrationTest.java)
use actual admitted F02 calendar/result transitions, F03 projections, F08 public reads and moderation
reactivation/withdrawal, F06 relations and the real pre-handoff sender on migrated PostgreSQL 18.6.
They cover withdrawal, inactive division, removed date, qualified empty calendar, season closure
alone, corrected result, retained reappearance, expiry and controlled personal-row deletion.
Inbox/member/count/send predicates preserve original identity, family, variant, read state and age;
consumed match facts prevent reallocation. The hold/hiding fixture is a controlled persisted state,
not report-threshold qualification; the clock and external provider are controlled.

[Query cases](../../apps/mobile/src/features/notifications/__tests__/notification-visibility.test.tsx)
exercise actual F03 and generated F07 reads with delayed responses, unavailable versus network
outcomes (including a refusal followed by offline native retries), current link absence,
retained/expired reappearance and pending member cancellation.
An enriched result first mentioning a public link then receives a successful F03 response without
that link: a delayed old page and subsequent offline refresh cannot restore its stale claim,
while its result, original personal fields and count remain usable.
The [Router integration](../../apps/mobile/src/features/notifications/__tests__/inbox-navigation.test.tsx)
mounts the actual private-client subscription and current match destination, including a public
match refusal while private account reads are suspended and a same-client offline return. Existing
[SDK/session cases](../../apps/mobile/src/features/notifications/__tests__/native-notifications.test.tsx)
also cover old taps under current maintenance, original-account read isolation and independent
read/navigation failures. HTTP, credentials and native SDK boundaries remain controlled.
These T042–T045 proofs reuse the existing backend bindings without a contract or stored-text rewrite.
Actual report/hold command scenarios, physical phones, system messages and provider delivery remain
[T046/T041](tasks.md); no simulator, JavaScript export or SDK double supplies that evidence.

## Retention construction and isolated restore cases

T047/T049 use the existing 29-elapsed-day cutoff, independent of physical deletion.
The dedicated [PostgreSQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java)
exercise all four families, read/hidden states, the microsecond before age 29, exact age 29,
overdue age 31, Paris/New York spring/autumn transitions, read/create overlap and interruption
after a committed batch. The next ordinary daily invocation must remove remaining due rows
without changing surviving creation dates or nonpersonal consumed match facts.
Revision-specific commands and results belong in the delivery PR; these cases establish no
actual F05 erasure, mobile expiry, sender/provider or operational restoration evidence.

The [delivery evidence](https://github.com/blockoutproject/blockout/pull/497) for [T047/T049](tasks.md) records exact
commands and local/CI outcomes. Qualification uses actual Spring/JPA transactions and current
inbox reads, with a controlled clock and test-only SQL interruption. No sender/ephemeral-work
is qualified by those purge cases; subscription construction is described below, and those
purge results do not qualify sending after failed deletion.

T048 prepares the following cases for [F13's initial isolated restore](../003-shared-quality/quickstart.md#initial-restore-and-activation-condition)
and the existing [pre-reopen reconciliation](../../infra/operations/README.md#reconcile-before-access-or-sends).
[T051](tasks.md) executes them only with its separately authorized source/destination, qualified backup
and masking prerequisites. Preparation does not block ordinary local purge construction.

| Restored case                                                                                 | Required observation before affected access/sends reopen                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbox just below/exactly 29 days and beyond 30 days, including read/hidden entries            | Keep original UTC creation instants. Remove every due personal row; younger rows keep only their remaining lifetime. A failed/partial purge keeps reopening pending.                                                                                                                                                                                                             |
| Account erased since the backup, including its original installation associations             | Reconcile current F05/F11 erasure against private current evidence; remove old inbox/destinations through the authorized owner procedure. A replacement UUID inherits nothing. Actual erase/purge races remain [T052](tasks.md) after the [F05 erasure implementation](../005-accounts-identity/tasks.md#phase-6-user-story-5--erase-the-account-and-return-safely-priority-p1). |
| Privacy restriction or current right unknown since backup                                     | Apply current F11/F09 restrictions and F12 admission. Unknown obligations keep affected access and sends closed; a usable SQL restore or old maintenance setting is insufficient.                                                                                                                                                                                                |
| Match facts preserved versus genuinely lost in the restored copy                              | Preserve available category/composition facts independently of inbox purge. Inspect no permanent recipient history. Lost facts may exceptionally repeat a sporting announcement, but permit no expired/erased personal data or renewed creation date.                                                                                                                            |
| Partial active/offline inbox, seven unread but two loaded, earliest expiry on an unloaded row | Execute T018/T023 with the actual native inbox: at age 29 remove loaded expired content before display/resume and while active, invalidate an unprovable whole count/badge, then reconcile through ordinary refresh. Fixtures/server-only checks do not qualify this mobile boundary.                                                                                            |
| Evidence and cleanup                                                                          | Keep source backup time, original timestamps, isolated target, current-obligation decisions, per-case outcomes and remaining gaps in the existing private F13 operational evidence. No private attachments/diagnostics enter this public repository; restoration never renews backup retention.                                                                                  |

## Push association and session construction

`ChangePushSubscriptions` groups complete replacement and exact removal under the existing
[F13 command conventions](../003-shared-quality/plan.md#application-use-case-families).
[SQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/PushSubscriptionIntegrationTest.java)
exercise migrated uniqueness, sorted account locks, reassociation/conflict rollback, rotation,
unchanged JPA version advancement, deletion/recreation of the same sign-in ID, the final-selection/write
race and stale DELETE/receipt protection.
[MVC cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/api/PushSubscriptionsWebMvcTest.java)
exercise generated binding, strict complete intent, original ownership and private status/body semantics.
Actual F05 erasure orchestration and participant races remain [T038](tasks.md).

The root connects one push registration owner to F05's existing generation/credential lifecycle,
without moving inbox or RevenueCat authority. [SDK/session cases](../../apps/mobile/src/features/notifications/__tests__/native-notifications.test.tsx),
[registration cases](../../apps/mobile/src/features/notifications/__tests__/push-registration.test.ts) and
[F05 consumer cases](../../apps/mobile/src/features/accounts/__tests__/session-consumers.test.tsx)
retain real session, Query/generated transport, inbox mutation and Pro consumers with controlled
native/network I/O. They cover token/generation races, a three-second bound over exact removal,
foreground silence, one-time tap clearing and independent read/navigation. An already transmitted
old PUT retains the [accepted transport limit](plan.md#expo-handoff-and-association-lifecycle).

Both inbox activation and native response handling now enter the installation's single F11
sporting-transition owner. Reading the original owner's inbox entry starts independently of
advertising and destination navigation. Response deduplication and clearing still precede that
opening; passive receipt and foreground refresh do not enter the counter. The
[entry composition cases](../../apps/mobile/src/features/advertising/__tests__/sporting-ad-entry.test.tsx)
exercise the real consumers with controlled native SDK and HTTP boundaries.

These cases establish no provider receipt, physical badge/credential behavior, after-commit sender,
native ad serving, erasure orchestration or release qualification.
[T030/T038–T041](tasks.md) and
[F05 T020](../005-accounts-identity/tasks.md) retain their owning obligations. Revision-specific
executed checks and unavailable evidence belong in the delivery PR.

## Essential scenarios

T030’s [physical push preparation](#physical-push-preparation) expands the native rows below; execution remains T041.

| Boundary        | Exercise                                                                                                                                                                                                                     | Expected result                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger         | Link before H, corrected/unknown hour, publication after H, definitive/provisional result, initial finished discovery and historical reconstruction.                                                                         | Current eligible events only; before-H link waits for ordinary processing around H; no historical result burst or guessed midnight.                                                                                                                                                                                                                   |
| Composition     | Race result acceptance with publication, then replace/reactivate the link; repeat with zero recipients.                                                                                                                      | Shared match order fixes plain/enriched composition; category facts persist, with no renewed allowance.                                                                                                                                                                                                                                               |
| Audience        | Follow both teams and pool, remove/recreate a selected follow, remove only one overlapping follow, race account erasure.                                                                                                     | One entry per eligible owner; before-send continuity requires an original surviving relation; erasure cannot resurrect personal data.                                                                                                                                                                                                                 |
| Atomicity       | Fail required internal F07 effects for one of several accepted match transactions; fail only the after-commit provider call.                                                                                                 | Only the first match transaction rolls back. Provider failure preserves committed score/facts/inbox.                                                                                                                                                                                                                                                  |
| Inbox           | Page through equal timestamps while inserting/purging entries; purge the cursor anchor; correct score/visibility; repeat read=true or lose its acknowledgement.                                                              | Stable continuation and original identity/order/read; no hidden/expired row, duplicate traversal or read-state regression. Navigation remains independent.                                                                                                                                                                                            |
| Expiry          | Just before/exactly 29 days, missed daily purge, active/offline app with partial pages and a summary expiry on an unloaded row.                                                                                              | Logical exclusion/count expiry at 29 days; normal physical cleanup before 30; no invented exact offline total. Next daily pass retries physical cleanup.                                                                                                                                                                                              |
| Destinations    | Same OS version on two devices; token rotation; A → guest → A; delayed DELETE/receipt, obsolete token callback, and old PUT accepted after B’s registration and successful A disassociation.                                 | Correct Expo token type; old callbacks discarded; DELETE/receipts cannot remove replacements. An already transmitted old PUT may replace B until its next successful ordinary registration, without foreign inbox access or a repair loop.                                                                                                            |
| Push            | Partial tickets, DeviceNotRegistered, timeout, missing receipt, stopped process before send or receipt check, maintenance before handoff.                                                                                    | Safe diagnostics, exact invalidation only; no resend, persistent recovery or maintenance catch-up; inbox retained.                                                                                                                                                                                                                                    |
| Native          | Permission refusal, foreground receipt with the explicit SDK suppression handler, cold-start tap, prolonged offline use, old push under another account/guest, unsupported badges and sign-out with presented notifications. | No foreground banner/sound/replacement alert; discreet inbox refresh. Presented notifications may remain after opening/sign-out; taps use current match access without old-inbox mutation. Current-account summary sets the supported badge, reset at sign-out; no push-carried count or background freshness guarantee. No duplicate route handling. |
| Privacy/restore | Erase account with pending in-memory work; restore expired entries or lost match facts.                                                                                                                                      | Apply current obligations before access/sends. Exceptional repeated announcements after lost facts do not permit expired/erased personal data.                                                                                                                                                                                                        |
| Contracts       | Validate and bundle canonical roots, generate selected Java/TypeScript targets, compile and exercise serialization/validation.                                                                                               | Date/UUID cursor precision, true-only read intent, strict requests, additive responses, enums, no-content removal and shared errors work through actual consumers.                                                                                                                                                                                    |
| Design          | Reviewed inbox/match/guest flows in light/dark, narrow screens, enlarged text and screen readers.                                                                                                                            | Existing shared components remain usable; no deletion-progress or recovery screen is introduced. Native interfaces are separately qualified.                                                                                                                                                                                                          |

Keep failed, unavailable and passed evidence distinct. Repository/prototype checks prove neither native push delivery nor owner design approval. Final planning publication requires both scoped design approvals recorded in the plan.

## Native inbox construction

The mobile inbox uses the generated F07 consumers and F05/F12 request context in the existing
in-memory QueryClient. [Query cases](../../apps/mobile/src/features/notifications/__tests__/inbox.test.tsx)
cover first-page replacement only on success, retained continuation boundaries, cancelled stale
responses, monotone read confirmation, missing entries and one bounded member observation after a
lost acknowledgement. [Clock cases](../../apps/mobile/src/features/notifications/__tests__/inbox-expiry.test.tsx)
exercise the 29-elapsed-day cutoff and an unloaded summary expiry without a partial-page count.
[Screen cases](../../apps/mobile/src/features/notifications/__tests__/inbox-screen.test.tsx) use real
session/admission/Query owners with controlled native/HTTP I/O; [route cases](../../apps/mobile/src/features/notifications/__tests__/inbox-navigation.test.tsx)
exercise Expo Router tabs, the current public search stack and its retained draft, exact match
navigation, guest return and zero badge removal.

The native route group follows the existing ordinary access stack. Home delegates to F06
PersonalScreen after the entry/age/guest guards. Search retains F04
SearchVisitProvider and its index/filter/choice stack under its tab. Page content, feedback,
sporting artwork and contextual palettes remain with their existing owners. Design references are
Product Design [notification journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1062-9319),
[notification item](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=512-6869)
and UI Library [bottom navigation](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library?node-id=223-415).
The prototype remains the interaction source; native scroll, refresh and Router APIs implement
its relevant behavior without copying its demo world or browser scroll machinery.

These controlled cases establish neither physical system badge behavior nor push receipt,
subscription lifecycle or full cross-owner qualification. T025, T030/T041, T052 and T060
retain their independent evidence obligations. Support actions and the shared Pro offer remain
with their existing feature owners. Revision-specific checks, native captures and review outcomes
belong in the delivery PR.

## Four-family presentation construction

T058/T059 reuse the existing inbox and F03 sporting presentation boundary. The
[presentation cases](../../apps/mobile/src/features/notifications/__tests__/notification-presentation.test.tsx)
consume twelve wire-text examples from the actual `NotificationMessage` variants through the
generated response schema. They preserve the supplied French text, distinguish absent and zero
scores, cover special/withdrawn results and unavailable links, and keep complete accessible
names and read states. Blank team names display explicit absence rather than an assumed identity.
The [screen cases](../../apps/mobile/src/features/notifications/__tests__/inbox-screen.test.tsx)
exercise all four families through generated HTTP consumers and the real Query/session/admission
owners, preserving server order and editorial choices through refresh and reopening.

Received instants use the current phone zone and F03's established-instant clock formatter;
Paris/New York cases cover differing DST weeks, spring jumps, autumn repeated hours and local
day changes. Formatting changes neither the original creation instant nor retention/read state.
Cards open the ordinary match destination; they expose no video URL or new action. F03/F08 own
the neutral Stream link presentation on that destination. The
[route cases](../../apps/mobile/src/features/notifications/__tests__/inbox-navigation.test.tsx)
now mount the actual match route and generated current response, then activate its real link.
They verify the exact public URL, absent destination, explicit retry after native handoff failure,
neutral wording before/after the result and return to the refreshed inbox. The opening uses the
same F11 owner as resource navigation; the exact contributed version remains attached to its URL.
This stream-only composition does not complete the document/reporting scope of
[F03 T047/T052](../007-sporting-consultation/tasks.md). The existing notification pattern
and [200% screen](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1072-24724)
remain the visual references. Automated semantic cases do not establish narrow-screen geometry,
native text resizing or VoiceOver/TalkBack behavior; T060 retains those qualifications separately.

## After-commit push construction

T028/T034/T035 use the actual `AfterCommitAnnouncements.Ready` boundary: the mandatory
producer transaction captures current private association row identities/revisions/addresses
alongside original F06 relation incarnations, and rollback emits nothing. The actual `DeliverPush` listener consumes the single immutable event only after commit through
Spring’s native transaction-bound event facility, then submits bounded native worker batches. It reuses the current inbox/F03/F08 projection,
original F05 account and exact F06 relation reads, then checks F12 maintenance immediately before
each provider batch. Current association replacement, owner/entry removal, age 29, sporting hiding,
missing reliable H, before-H or final-result live state suppress remaining work. Result-family
wording can reflect a withdrawn link without exposing its former URL.

[Application cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/PushDeliveryTest.java)
and [PostgreSQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/PushDeliveryIntegrationTest.java)
cover this transport construction with controlled external I/O; [SDK mapping cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/infrastructure/ExpoPushClientTest.java)
exercise real mapping into the SDK’s native request model and partial/refused/uncertain/missing SDK evidence.
[Native transport cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/infrastructure/ExpoPushTransportIntegrationTest.java)
exercise the actual Java SDK and Apache client against a disposable loopback server, proving native serialization/decoding, ordinary unknown evidence for empty error bodies, and one POST for send/receipt 429/503 responses with enhanced-security headers and no underlying automatic retry. A mixed `MismatchSenderId`/`DeviceNotRegistered` receipt response uses the SDK’s native UNKNOWN fallback and preserves the exact invalidation signal.
[Configuration cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/infrastructure/PushDeliveryConfigurationTest.java)
exercise native binding, activation validation and queue rejection. Run
`./mvnw -B -ntp -pl apps/backend verify -Dtest='PushDeliveryTest,ExpoPushClientTest,PushDeliveryConfigurationTest' -Dit.test=PushDeliveryIntegrationTest,ExpoPushTransportIntegrationTest`.

The [operations input guide](../../infra/operations/README.md#sporting-push-inputs-and-failure-limits)
owns exact activation names, one enabled sender per project, credentials/channels, bounds and safe
diagnostics. Tickets live only in memory for one observation around fifteen minutes later. No
receipt callback, overload, restart or maintenance skip creates resend/catch-up work. These tests
establish no physical receipt, APNs/FCM credential validity, production activation, actual F05
erasure orchestration or complete producer-to-provider qualification. T038/T040/T041 and the
cross-owner restriction qualifications retain those obligations.

## Physical push preparation

T030 prepares the A26–A33 cases below; it does **not** execute T041. Before running them, obtain
separate authorization for the exact isolated Expo/Apple/Firebase environments, test accounts,
physical iOS/Android devices and native development/release binaries at the reviewed revision.
Use the matching inputs and private credential procedure in the
[operations guide](../../infra/operations/README.md#sporting-push-inputs-and-failure-limits).
Do not use production destinations, Expo Go or a mock as phone-delivery evidence. The SDK's support
for some simulators/emulators does not replace the accepted physical iOS/Android qualification.
The added config plugin requires a new authorized native binary for these cases; no EAS/store
build or provider/project mutation was performed by construction.

| Physical case                    | Prerequisites and exercise                                                                                                                                                                                                    | Required observation                                                                                                                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Permission/channel               | Isolated credentials, fresh installation or known permission state; Android channel `default` before requesting the Expo address. Refuse permission, then use an ordinary authorized registration occasion after changing it. | Inbox eligibility is unchanged; denial produces no claim of delivery. Record platform/permission/channel state and actual resulting association privately.                                                                           |
| Foreground/background            | Send one safe sporting event with the app foregrounded, then another while backgrounded/locked.                                                                                                                               | Foreground has no banner/list/sound/badge or replacement alert, while ordinary inbox refresh remains independent. Separately record provider ticket, APNs/FCM receipt and observed phone presentation; none substitutes for another. |
| Badges/system notices            | Multi-page inbox with unloaded unread rows; supported and unsupported launcher badge behavior; retain a presented notice across opening and sign-out.                                                                         | Confirmed current-account summary owns the supported badge and sign-out resets it best effort. Background values may be stale and system notices may remain; no push-carried count, enumeration or recall is promised.               |
| Cold and old taps                | Terminate the app, tap one notice twice, then repeat under account B, guest and a newly recreated A account; include a purged/expired entry.                                                                                  | One ordinary match route under current rights, independent owner read only for the matching original account. No former-inbox request, resurrected entry or duplicate route.                                                         |
| Maintenance/current restrictions | Activate isolated F12 maintenance after inbox commit but before a controllable send; include an operator recipient and a link withdrawn/hidden before handoff.                                                                | No new handoff for any recipient, while inbox/facts and purge remain intact. Deactivation causes no catch-up. A message already handed off may still arrive; opening enforces current access.                                        |
| Offline delay                    | Controlled offline physical device, safe wording and unchanged provider default lifetime; restore connectivity after the event's sporting situation changes.                                                                  | Record actual delay and receipt separately; no active-broadcast/free-video claim, live TTL override or promise of eventual delivery. An old tap opens only the current match.                                                        |
| Account/destination races        | A → guest → A/B, token rotation, delayed removal/receipt and an old PUT already transmitted before reassociation; erase the original account through its actual F05 owner.                                                    | New connection/row identities protect replacements. A transmitted old PUT may win until the next ordinary current registration; no repair/replay loop or old private access. No system-notice recall is assumed.                     |
| Provider failure/process loss    | Authorized controlled refusal/timeout/invalid-destination outcome and process shutdown before send/receipt; no private raw diagnostic in public evidence.                                                                     | Inbox remains committed, uncertainty is distinct from rejection, only the exact `DeviceNotRegistered` target is invalidated, receipts are observed once if available, and restart/overload causes no resend.                         |

For each executed case, retain reviewed commit/native build, physical device/OS, isolated environment,
scenario and passed/failed/unavailable result in the owning qualification evidence. Keep private
addresses, credentials, ticket IDs and attachments outside this public repository. A successful
sample does not establish delivery guarantees or complete the other outstanding F07 tasks.

## Original-account erasure construction (T038)

`NotificationErasureIntegrationTest` uses the real F05 orchestrator and F06/F07 persistence, migrations and transactions. It removes hidden inbox rows and multiple destinations while preserving other accounts and consumed match facts, orders reassociation before and after erasure, and resumes captured delivery/receipt work against a newer association. No old provider handoff or invalidation reaches that association. The [F05 construction record](../005-accounts-identity/quickstart.md#server-erasure-construction) owns common rollback, writer-lock and adapter evidence. T038 began with a generated HTTP case failing against the 503 stub. This scoped local construction does not complete T040/T041, physical delivery, provider activation or F05's wider T035 qualification.
