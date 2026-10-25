# Quickstart: Qualify notifications, inbox and push

Follow the [local development setup](../../README.md#local-development) and run the [repository verification commands](../../README.md#verification). The scenarios below require the notification implementation and native provider setup; shared checks alone do not qualify inbox or push behavior.

## Prerequisites

Use the [generated HTTP boundary](../003-shared-quality/contracts/README.md) and actual PostgreSQL schema, fixtures for usable/deleted accounts and overlapping follows, accepted sporting transitions, and controlled Expo send/receipt doubles. Native checks require development/release builds on physical iOS and Android devices, separate nonproduction credentials and destinations, and known test accounts. Do not use real user payloads or Expo Go as delivery evidence.

The [model](data-model.md), [contracts](contracts/README.md) and owning specification define exact states. Use JUnit/Spring MVC/Testcontainers for server boundaries and Jest Expo/React Native Testing Library for mobile behavior. No additional E2E framework or load programme is required.

## Foundation evidence (#237)

T001 reuses the [shared stack](../003-shared-quality/plan.md) and SDK-compatible `expo-notifications`
(`~58.1.6` in the [manifest](../../apps/mobile/package.json)). Package compatibility does not qualify
provider configuration. T002 retains the XML master and [disposable baseline/freeze policy](../../README.md#local-development);
no external retained-data posture is qualified.

The [Java contract cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/api/NotificationContractTest.java) exercise generated request binding and producer serialization through a test-only adapter. The [mobile contract cases](../../apps/mobile/src/features/notifications/__tests__/notification-contract.test.ts) exercise actual Orval consumers and one-time F13 response validation before cache admission. Request schema checks use Zod's native `.strict()`; generated Java does not enforce the boolean enum, so F07 explicitly requires true. Orval's multiple-success-status registration function needs the generated `PushSubscriptionResponse` supplied through the existing F13 `schema` request option, as for F05 establishment. Java server responses are serialization evidence, not a generated Java response-decoder qualification.

The [owner cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/NotificationAccessWebMvcTest.java) use real F05 resolution, native security and an isolated signed-JWT/JWKS boundary; account storage and the F12 admission decision are controlled. The [mobile context cases](../../apps/mobile/src/features/notifications/__tests__/notification-context.test.ts) use the existing session owner, transport and one QueryClient, including native infinite-query `pageParam`, A → guest/B → A and late completion without cancellation. These checks qualify the foundation only. Backend inbox endpoints and SQL are qualified [below](#current-inbox-construction-evidence-250); account-erasure orchestration, native permissions/lifecycle, physical devices and provider delivery remain with their owning tasks.

Run the README verification for current application, generator and Expo Doctor results;
revision-specific execution results belong to the delivery PR.

## Announcement construction evidence (#245)

T006–T012 implement the mandatory transactional F07 participant, nonpersonal consumed match facts,
unread personal allocations, current F06 recipient unions under sorted F05 account locks, and three
French variants for each of the four immutable families. Run the focused construction suites with
`./mvnw -B -ntp -pl apps/backend verify -Dtest='ResultAnnouncementTest,NotificationMessageTest' -Dit.test=AnnouncementTransactionIntegrationTest`.

The PostgreSQL suite explicitly migrates this worktree's disposable PostgreSQL 18.6 through the actual Liquibase master, then validates the JPA mappings. It exercises real F07 storage, F06 relations and F05 account locks with controlled producer transitions/current-link availability. It checks both concurrent composition orders, overlap deduplication and exact original relation IDs, account-lock UUID order, removal while waiting, controlled account-row deletion before/after creation, empty-audience facts without later backfill, silent final discovery/reconstruction preserving an unused post-result allowance even with an existing link, uniqueness, rejection of an existing notification UUID without resetting its read state, immutable origin/read state and non-reallocation after personal purge. A required F07 uniqueness failure rolls back the controlled sporting update and all F07 effects for that match while an independent match remains committed. A test-scoped Spring after-commit failure preserves already committed effects.

The [persistence rationale](research.md#transactional-inbox-and-approximate-start-time-announcements)
explains insert-only allocation and retained read-state protection. The database-free health HTTP
context replaces `NotificationStore`, consistently with its other controlled business persistence ports.

These controlled inputs do not qualify the actual F02/F08 producer binding or publication eligibility (T013–T014 / #252), the F05 erasure orchestrator or actual asynchronous sender (T040 / #291), inbox HTTP/mobile, scheduled purge, native devices, provider delivery or restoration. No production optional/no-op hook or transport call was added.

## Atomic producer and link qualification — #252

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
continuity remains F06 T044/#263 and F07 T040/#291.

The [timing policy suite](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/LinkAnnouncementTest.java)
includes unknown time/availability, before/at/after H, Paris/New York instants across differing
DST weeks and consumed categories. Controlled personal-row deletion, hiding/hold and source-linked
quota-exempt reactivation fixtures prove that allowances survive those state changes; they do not
qualify actual moderation commands, report reset or scheduled purge (T046/#277 and T052/#267).
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

## Current inbox construction evidence (#250)

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
scheduled purge or F05 erasure qualification. T052/#267 owns those races; T051/#360 owns restoration,
and #253 owns native inbox behavior. No device, push/provider or production evidence is claimed.
Revision-specific commands and outcomes remain in the delivery PR.

## Retention construction and isolated restore cases — #255

T047/T049 use the existing 29-elapsed-day cutoff, independent of physical deletion.
The dedicated [PostgreSQL cases](../../apps/backend/src/test/java/com/blockout/backend/notifications/application/PurgeNotificationsIntegrationTest.java)
exercise all four families, read/hidden states, the microsecond before age 29, exact age 29,
overdue age 31, Paris/New York spring/autumn transitions, read/create overlap and interruption
after a committed batch. The next ordinary daily invocation must remove remaining due rows
without changing surviving creation dates or nonpersonal consumed match facts.
Revision-specific commands and results belong in the delivery PR; these cases establish no
actual F05 erasure, mobile expiry, sender/provider or operational restoration evidence.

The [#255 delivery evidence](https://github.com/blockoutproject/blockout/pull/497) records
seven passing unit/scheduling cases and twelve passing migrated PostgreSQL 18.6 purge cases
from isolated local checks and ordinary repository CI. They use actual Spring/JPA transactions
and current inbox reads, with a controlled clock and test-only SQL interruption. No sender/ephemeral-work
or installation-subscription persistence exists at this base; their lifecycle remains with its
owning construction, and these results do not qualify sending after failed deletion.

T048 prepares the following cases for [F13's initial isolated restore](../003-shared-quality/quickstart.md#initial-restore-and-activation-condition)
and the existing [pre-reopen reconciliation](../../infra/operations/README.md#reconcile-before-access-or-sends).
T051/#360 executes them only with its separately authorized source/destination, qualified backup
and masking prerequisites. Preparation does not block ordinary local purge construction.

| Restored case                                                                                 | Required observation before affected access/sends reopen                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbox just below/exactly 29 days and beyond 30 days, including read/hidden entries            | Keep original UTC creation instants. Remove every due personal row; younger rows keep only their remaining lifetime. A failed/partial purge keeps reopening pending.                                                                                                                            |
| Account erased since the backup, including its original installation associations             | Reconcile current F05/F11 erasure against private current evidence; remove old inbox/destinations through the authorized owner procedure. A replacement UUID inherits nothing. Actual erase/purge races remain T052/#267 after #280.                                                            |
| Privacy restriction or current right unknown since backup                                     | Apply current F11/F09 restrictions and F12 admission. Unknown obligations keep affected access and sends closed; a usable SQL restore or old maintenance setting is insufficient.                                                                                                               |
| Match facts preserved versus genuinely lost in the restored copy                              | Preserve available category/composition facts independently of inbox purge. Inspect no permanent recipient history. Lost facts may exceptionally repeat a sporting announcement, but permit no expired/erased personal data or renewed creation date.                                           |
| Partial active/offline inbox, seven unread but two loaded, earliest expiry on an unloaded row | Execute T018/T023 with the actual native inbox: at age 29 remove loaded expired content before display/resume and while active, invalidate an unprovable whole count/badge, then reconcile through ordinary refresh. Fixtures/server-only checks do not qualify this mobile boundary.           |
| Evidence and cleanup                                                                          | Keep source backup time, original timestamps, isolated target, current-obligation decisions, per-case outcomes and remaining gaps in the existing private F13 operational evidence. No private attachments/diagnostics enter this public repository; restoration never renews backup retention. |

## Essential scenarios

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
