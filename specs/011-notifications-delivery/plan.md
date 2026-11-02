# Implementation Plan: Notifications, inbox and push

**Branch**: `tech/53-f07-notifications` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [F06 follows](../009-following-personal-feed/plan.md), [F08 contributions](../010-live-contributions-moderation/plan.md) and [F12 admission](../013-administration-app-configuration/plan.md).

## Summary

Keep sporting announcement facts and personal inbox entries in the existing backend database, committed with the accepted business event. Derive current sporting presentation on reads. Send push through the Java SDK listed by Expo after commit, with ordinary in-memory processing and receipt checks, without a durable retry system. Use native mobile permissions and response events, explicitly suppressing foreground presentation through the SDK handler; refresh the private inbox on ordinary user/lifecycle occasions.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1; TypeScript / Expo SDK 58 / React Native 0.88 / React 19.3.0, under [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Spring Data JPA/Hibernate, Spring scheduling/transaction events, Expo-listed Java SDK `io.github.hlspablo:expo-server-sdk-java:3.1.6` and Spring Boot’s native Apache HTTP builder, TanStack Query and F13 generated HTTP interfaces. The SDK-compatible `expo-notifications` package is installed; no copied provider protocol model or separate sending service. The owner selected this SDK on 2026-10-30; see [research](research.md#expo-delivery-through-the-existing-java-backend).

**Storage**: PostgreSQL 18.6; personal mobile cache and pending push/receipt work in memory. Installation UUID and connection-association identity are small device metadata, not a persisted inbox or cleanup credential.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL; Jest Expo/React Native Testing Library and physical-device qualification. Use the actual F13 repository verification targets; controlled transport and SQL tests do not establish physical receipt.

**Target Platform**: Existing Linux backend; native iOS/Android builds and Expo Push with APNs/FCM.

**Project Type**: Mobile application with a modular backend.

**Performance Goals**: No speculative throughput/capacity programme or monthly availability commitment. Preserve domain timing and retention; respect documented provider request limits.

**Constraints**: Single durable inbox, current rights and visibility, no historical subscription snapshot, push replay, durable outbox, receipt journal, mobile polling or additional service. A provider acceptance is not receipt evidence.

**Scale/Scope**: Four sporting announcement families, account-owned inbox/counts and installation associations. No campaigns, moderation alerts, new notification preferences or silent synchronization.

## Constitution Check

The initial design baseline and the scoped prototype and Figma approvals below satisfy the design prerequisite. This post-design check preserves the implementation and provider qualification limits.

| Principle         | Application                                                                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | Accepted changes are integrated into the current F07 requirements, including actual trigger-time audience, ordinary refresh and a common 29-day consultation cutoff.                                                                                                                      |
| II — Ownership    | Sporting facts remain F02/F03/F08, follows F06, accounts F05, access F12 and privacy/transition F11/F14. F07 owns announcements, inbox and destinations.                                                                                                                                  |
| III — Design      | The [approved experience](spec.md) and its scoped Figma reconciliation were explicitly approved in this conversation on 2026-10-15. Unchanged scope keeps its existing approvals; native push behavior remains unqualified.                                                               |
| IV — Contracts    | Extend the canonical mobile root; keep the F13 dialect and generation chain. The quickstart records application generation/compilation and the remaining integration qualifications.                                                                                                      |
| V — Simplicity    | Native Spring scheduling/transactions and the Expo-listed Java SDK; native Expo presentation and receipts. No delivery ledger, broker, retry engine or mobile polling.                                                                                                                    |
| Prerequisites     | The accepted [F06](../009-following-personal-feed/plan.md), [F08](../010-live-contributions-moderation/plan.md) and [F12](../013-administration-app-configuration/plan.md) plans supply follows, contributions and admission boundaries; runtime/provider qualification remains separate. |

## Project Structure

### Documentation (this feature)

```text
specs/011-notifications-delivery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Planned source code

```text
apps/backend/   # notifications application boundary, persistence and Expo adapter
apps/mobile/    # inbox queries, native notification lifecycle and match navigation
contracts/http/mobile/notifications/
├── paths.yaml
├── parameters.yaml
└── schemas.yaml
```

Use feature-owned application services and persistence ports inside the existing applications. Generated DTOs stay at HTTP boundaries and generated output remains outside Git. No new deployable or collector endpoint is needed.

## Announcement processing

The [data model](data-model.md) owns consumed categories, stable personal entries and connection associations. F02 supplies accepted result transitions and its trusted import/reconstruction context. F08 supplies only accepted public-link transitions. F06 supplies the confirmed union of followers of both teams and the pool, with relation identities and no season preference.

Acquire the necessary sporting roots in [F02 order](../002-sporting-data/plan.md#acceptance-and-concurrency), then affected account rows in sorted UUID order. Relookup current account/follow eligibility after locking; never acquire an earlier sporting root after an account. F02 result acceptance and F08 publication share the match lock. A required internal failure rolls back this match's acceptance and inbox effects, not independently committed matches. No provider request runs in that transaction.

At the first eligible final result, fix result composition from the currently public F08 link: enriched result consumes result and post-result-link categories together; otherwise a later accepted publication may consume the latter separately. A live announcement does not consume the post-result category. Mark processed facts even with zero recipients. Initial finished discoveries, historical reconstruction and unchanged repeats do not generate notices. Corrections, reactivation, replacement, expiry and purge never replenish consumed facts.

For a public link before H, one ordinary Spring scheduled pass each minute finds due candidates with a reliable instant and unconsumed live fact. Process each match independently, rereading its current hour, result, link and visibility under the same protections. Select followers at actual processing, without reconstructing an exact-H audience or persisting a timer per match. Link publications after H and final results invoke the same application rules directly. Failure leaves the candidate for a later normal pass; no separate retry workflow. A correction before processing changes eligibility; after processing it does not reset the category.

## Inbox, retention and mobile state

Read current sporting data through owner-controlled projections, rather than copying score/name/link text into every personal row. The family, editorial variant, original time and read state stay stable. A withdrawn result or missing link changes wording, not notification identity; the link opens only through the ordinary match page. Page and projection reads use one short read-only repeatable-read transaction when several queries are needed, avoiding internally mixed representations without a cross-request snapshot.

Use Spring Data keyset scrolling with current authorization/visibility criteria, sorting by non-null `createdAt DESC, id DESC`, twenty rows per page. Encode only those continuation keys in an opaque URL-safe cursor; reject malformed values as BadRequest. No persisted cursor, signing service or lookup of a deleted anchor is required. The supplying account and current access predicates always apply. Refresh restarts from newest entries; no historical snapshot or full-inbox download.

All controlled reads/counts/sends exclude entries aged at least 29 elapsed days. The daily purge deletes such rows across all accounts/families/read/visibility states, normally before 30 days. Use one bulk age-cutoff deletion in one explicit transaction. Refuse an ambient transaction at this scheduler-owned boundary, so completion and the affected count are published only after the single transaction actually commits. A definite transaction refusal rolls back the whole pass; a lost commit acknowledgement leaves completion unconfirmed even if the whole pass committed. There is no partial-progress protocol and no deletion count is claimed without confirmation; earlier completed passes remain committed. Failure is observable under F13 and the next daily pass tries again; persistent failures use manual intervention. The larger single lock/WAL/rollback unit is an accepted limit, with no deletion-volume or incremental-progress commitment. Account erasure removes inbox and destinations immediately in F05's local transaction. Non-personal match facts survive personal purge. F11/F13 obligations apply before reopening restored data.

Compute the whole-inbox unread count and earliest expiry among those counted entries in one query/consistent read. Do not derive the count from loaded pages. `nextExpiryAt` is absent exactly at zero. At that instant, invalidate the locally known total; if offline and not provably complete, remove the exact badge rather than manufacture a partial total. Exclude expired loaded entries before rendering and during active use, using the original creation time. No persistent expiration registry is needed.

TanStack Query owns server-confirmed data through generated owner/page keys in F05's current private client. The focused inbox and current summary have enabled native observers, so mutation-option invalidation can refetch them; inactive views use ordinary next-focus recovery. Opening, foreground return, explicit refresh and foreground push supply ordinary refresh occasions. A read command sends only true, then invalidates inbox/summary without a read-true overlay or a lost-response member-read protocol. A temporary stale read flag/count and multi-page native refetch cost are accepted; persisted server read state still changes only false → true. Known original-owner refusal and active 29-day exclusion remain separate and cannot be restored by a failed/expired read. Different principals get different private clients; detached callbacks keep their original one. Native end-of-list/explicit retry and loaded-row feedback follow [F13 conventions](../003-shared-quality/plan.md#repeated-interaction-conventions). No optimistic whole count, automatic PATCH replay or cross-device polling.

Register `setNotificationHandler` with `shouldShowBanner`, `shouldShowList`, `shouldPlaySound` and `shouldSetBadge` all false: Expo SDK 58 presents foreground notifications by default, while the accepted product behavior requires silence. Add no replacement banner, sound or local notification. The ordinary receive listener requests inbox/summary refresh, whose failure remains discreet; receipt and presentation are separate SDK capabilities. Set supported system badge values with `setBadgeCountAsync` from the current account’s confirmed summary. Omit `badge` from outgoing Expo messages so delayed pushes cannot apply an old account’s counter. Background badges may remain stale until ordinary synchronization; launcher-managed indicators remain platform-controlled. No silent push or separate badge synchronization is added.

A push contains notification, owner-account and match identities plus safe sporting text. It is not authorization. Use Expo's ordinary initial-response and tap APIs to route once through the existing match navigator, clearing the handled native response through the SDK. Attempt owner read independently when the current account matches; purged entries are not recreated. Under another account or guest access, open only the match with current rights, without an old-inbox request. Navigation/read failures remain ordinary and independent. F11's existing navigation counting applies; add no notification-specific ad trigger.

## Expo handoff and association lifecycle

The producer publishes one immutable event inside its mandatory transaction; the actual push consumer runs through native `@TransactionalEventListener(AFTER_COMMIT)` with highest precedence. Its safe failure boundary preserves the committed outcome without an intermediate event type or republication. Subsequent bounded worker processing uses immutable send context containing notification identity, selected follow relation identities and targeted associations. Reassess maintenance, owner existence, entry age/visibility, at least one original still-eligible follow, destination and content before external handoff. Removing/recreating a follow is not continuity. Current maintenance skips every new push, including operator recipients. The check does not promise an atomic stop or recall across an external network call.

The [bounded sender construction](research.md#bounded-sender-construction) records the implemented executor, pacing and receipt-memory bounds; the environment permits one enabled sender per project. The Expo adapter uses the listed Java SDK with bounded native HTTP waits and automatic retries disabled. Follow native limits: at most 100 messages per request in one project, 600 messages/second/project and 4 KiB per payload. Dispatch through a bounded ordinary executor/paced batches; an overloaded or stopped process can drop unsent work with a safe diagnostic. Do not add a durable queue or automatic resend after refusal, timeout or uncertain response. Expo enforces the payload limit through ordinary SDK/provider outcomes, without local duplicate serialization or a custom HTTP refusal interceptor. Parsed SDK refusal stays rejection; empty/non-JSON error bodies may remain unknown. These limits are provider constraints, not a Blockout capacity target.

Retain returned ticket IDs and their exact association/revision only in memory. An ordinary scheduled callback checks receipts once around fifteen minutes later, grouping up to 1,000 IDs per request. Missing/failed checks or a restart lose the evidence without resending. Process per-ticket errors and only invalidate the still-matching association/revision for `DeviceNotRegistered`. A late receipt cannot remove a newer registration. No SQL transaction spans either provider call.

Use one random UUID per installation, not the OS version or Expo address. Create a fresh subscription UUID per sign-in, including A → guest → A. Keep it for token rotation; authenticated PUT completely replaces its address and installation association. Uniqueness permits only one current association per installation/address. Serialize competing affected-account updates in existing account-lock order and enforce uniqueness in PostgreSQL. An ordinary concurrent uniqueness failure rolls back and returns Conflict; reconcile on the next normal registration occasion. Last accepted registration wins; this is not a new server session registry or a promise of global client-time ordering. DELETE targets only the exact owner/subscription UUID. Native JPA versioning guards delayed provider invalidation; explicitly increment the version on a successful re-registration even when its address is unchanged.

At sign-in/foreground occasions and native token-change events, obtain the Expo destination through `getExpoPushTokenAsync({ projectId })` for the configured environment. The native listener’s APNs/FCM token is not the Expo delivery address and is never posted as `expoPushToken`. Capture the current native principal and established account UUID before asynchronous token acquisition; discard obsolete results before PUT and cancel still-controllable old registration calls. An already transmitted PUT can still arrive last, replace the new association and temporarily prevent its push delivery until the next successful ordinary current-account registration; this is the explicit F05/F07 limit, without a persistent ordering registry or repair loop.

Logout attempts one bounded DELETE before discarding credentials, then clears private memory regardless of outcome. On sign-out, account change or confirmed account erasure, reset the app-controlled badge with `setBadgeCountAsync(0)` without blocking sign-out on failure. Leave already presented system notifications to platform behavior, including after an ordinary app opening; do not enumerate, dismiss or reconcile them with the inbox. They may remain, and no recall or cleanup retry is promised. Clear a handled tap response only as part of ordinary navigation, not as a notification-center cleanup operation. Other installations remain. Previously handed-off or unsuccessfully detached pushes may still arrive under the accepted F05 limitation. Account erasure removes all destination rows transactionally.

Future configuration enables Expo's server access-token protection and native iOS/Android credentials/channels. No token, address, ticket payload or notification content enters logs; ordinary safe error categories/counts support F13 diagnostics and configuration alerts. Keep provider default delivery lifetime, which may reach four weeks; a delayed message never claims a stream is currently active. No native image extension, interactive push action or background synchronization task.

## Interfaces and compatibility

The [contract guide](contracts/README.md) identifies canonical resources, owner boundaries and generated consumers. Use named shared Problem Details, private `no-store`, strict request properties and additive response properties. Read intent accepts only true. Registration returns 201 with Location for creation, 200 for replacement; removal returns 204 without content, including an already absent association. No asynchronous job resource or 202.

F02/F08 share transaction semantics; F06 supplies relation identity without a history table; F05 supplies original account identity and local erasure; F12 owns admission/maintenance; F11 owns privacy and existing ads; F14 owns the reset without notification import or replay. Their targeted cross-references point here instead of duplicating delivery design. The API is additive and keeps F13's admitted-client compatibility, generators and response validation. It does not claim full hypermedia REST conformance or introduce a hypermedia framework.

## Design and qualification

The owner explicitly approved prototype, then the scoped Figma report, in this conversation on 2026-10-15. The prototype corrects old-push routing, the deleted-account scenario and the 29-day active-use cutoff. [Figma’s guest return](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=5326-10826) replaces the obsolete deletion-progress screen; [the journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1062-9319) records current navigation and retention. Existing inbox cards and match screens are reused. No new screen or native notification-center mock is required. Foreground non-presentation and retained system notifications require no additional Blockout screen or component. Native presentation, badge behavior and delivery remain device qualifications, not visual evidence.

The [quickstart](quickstart.md) owns qualification scenarios and their recorded results. Documentation/OpenAPI checks do not establish generated application compilation, actual push delivery, device behavior or design approval. No constitutional exception or additional complexity mechanism is requested.
