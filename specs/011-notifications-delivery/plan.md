# Implementation Plan: Notifications, inbox and push

**Branch**: `tech/53-f07-notifications` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [#53](https://github.com/blockoutproject/blockout/issues/53), the owning specification and the owner-approved preparatory plan. This delivery formalizes design and contracts, not application code or provider configuration.

## Summary

Keep sporting announcement facts and personal inbox entries in the existing backend database, committed with the accepted business event. Derive current sporting presentation on reads. Send push through Expo's official HTTP API after commit, with ordinary in-memory processing and receipt checks, without a durable retry system. Use native mobile permissions, banners and response events; refresh the private inbox on ordinary user/lifecycle occasions.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1; TypeScript / Expo SDK 57 / React Native 0.86 / React 19.2.3, under [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Spring Data JPA/Hibernate, Spring scheduling/transaction events/RestClient, TanStack Query and F13 generated HTTP interfaces. Add the SDK-compatible `expo-notifications` package during authorized application implementation; no community Java SDK or separate sending service.

**Storage**: PostgreSQL 18.6; personal mobile cache and pending push/receipt work in memory. Installation UUID and connection-association identity are small device metadata, not a persisted inbox or cleanup credential.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL; Jest Expo/React Native Testing Library and physical-device qualification. Current repository checks cover documents and OpenAPI only.

**Target Platform**: Existing Linux backend; native iOS/Android builds and Expo Push with APNs/FCM.

**Project Type**: Mobile application with a modular backend.

**Performance Goals**: No speculative throughput/capacity programme or monthly availability commitment. Preserve domain timing and retention; respect documented provider request limits.

**Constraints**: Single durable inbox, current rights and visibility, no historical subscription snapshot, push replay, durable outbox, receipt journal, mobile polling or additional service. A provider acceptance is not receipt evidence.

**Scale/Scope**: Four sporting announcement families, account-owned inbox/counts and installation associations. No campaigns, moderation alerts, new notification preferences or silent synchronization.

## Constitution Check

The initial design baseline and the scoped prototype and Figma approvals below satisfy the design prerequisite. This post-design check preserves the implementation and provider qualification limits.

| Principle         | Application                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification | Accepted changes are integrated into the current F07 requirements, including actual trigger-time audience, ordinary refresh and a common 29-day consultation cutoff.                                         |
| II — Ownership    | Sporting facts remain F02/F03/F08, follows F06, accounts F05, access F12 and privacy/transition F11/F14. F07 owns announcements, inbox and destinations.                                                     |
| III — Design      | Prototype `18f3834` and its scoped Figma reconciliation were explicitly approved in this conversation on 2026-10-15. Unchanged scope keeps its existing approvals; native push behavior remains unqualified. |
| IV — Contracts    | Extend the canonical mobile root; keep the F13 dialect and generation chain. Application generation/compilation remain future qualifications.                                                                |
| V — Simplicity    | Native Spring scheduling, transactions and HTTP; native Expo presentation and receipts. No delivery ledger, broker, retry engine or mobile polling.                                                          |
| Prerequisites     | Native blockers #51, #52 and #46 are closed. No tasks, product implementation, provider configuration, automatic merge or issue closure.                                                                     |

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

### Source code (planned, not initialized)

```text
apps/backend/   # notifications application boundary, persistence and Expo adapter
apps/mobile/    # inbox queries, native notification lifecycle and match navigation
contracts/http/mobile/notifications/
├── paths.yaml
├── parameters.yaml
└── schemas.yaml
```

Use feature-owned application services and persistence ports inside the existing applications. Generated DTOs stay at HTTP boundaries. No new deployable, collector endpoint or generated output is introduced by this planning delivery.

## Announcement processing

The [data model](data-model.md) owns consumed categories, stable personal entries and connection associations. F02 supplies accepted result transitions and its trusted import/reconstruction context. F08 supplies only accepted public-link transitions. F06 supplies the confirmed union of followers of both teams and the pool, with relation identities and no season preference.

Acquire the necessary sporting roots in [F02 order](../002-sporting-data/plan.md#acceptance-and-concurrency), then affected account rows in sorted UUID order. Relookup current account/follow eligibility after locking; never acquire an earlier sporting root after an account. F02 result acceptance and F08 publication share the match lock. A required internal failure rolls back this match's acceptance and inbox effects, not independently committed matches. No provider request runs in that transaction.

At the first eligible final result, fix result composition from the currently public F08 link: enriched result consumes result and post-result-link categories together; otherwise a later accepted publication may consume the latter separately. A live announcement does not consume the post-result category. Mark processed facts even with zero recipients. Initial finished discoveries, historical reconstruction and unchanged repeats do not generate notices. Corrections, reactivation, replacement, expiry and purge never replenish consumed facts.

For a public link before H, one ordinary Spring scheduled pass each minute finds due candidates with a reliable instant and unconsumed live fact. Process each match independently, rereading its current hour, result, link and visibility under the same protections. Select followers at actual processing, without reconstructing an exact-H audience or persisting a timer per match. Link publications after H and final results invoke the same application rules directly. Failure leaves the candidate for a later normal pass; no separate retry workflow. A correction before processing changes eligibility; after processing it does not reset the category.

## Inbox, retention and mobile state

Read current sporting data through owner-controlled projections, rather than copying score/name/link text into every personal row. The family, editorial variant, original time and read state stay stable. A withdrawn result or missing link changes wording, not notification identity; the link opens only through the ordinary match page. Page and projection reads use one short read-only repeatable-read transaction when several queries are needed, avoiding internally mixed representations without a cross-request snapshot.

Use Spring Data keyset scrolling with current authorization/visibility criteria, sorting by non-null `createdAt DESC, id DESC`, twenty rows per page. Encode only those continuation keys in an opaque URL-safe cursor; reject malformed values as BadRequest. No persisted cursor, signing service or lookup of a deleted anchor is required. The supplying account and current access predicates always apply. Refresh restarts from newest entries; no historical snapshot or full-inbox download.

All controlled reads/counts/sends exclude entries aged at least 29 elapsed days. The daily purge deletes such rows across all accounts/families/read/visibility states, normally before 30 days. Failure is observable under F13 and the next daily pass tries again; persistent failures use manual intervention. Account erasure removes inbox and destinations immediately in F05's local transaction. Non-personal match facts survive personal purge. F11/F13 obligations apply before reopening restored data.

Compute the whole-inbox unread count and earliest expiry among those counted entries in one query/consistent read. Do not derive the count from loaded pages. `nextExpiryAt` is absent exactly at zero. At that instant, invalidate the locally known total; if offline and not provably complete, remove the exact badge rather than manufacture a partial total. Exclude expired loaded entries before rendering and during active use, using the original creation time. No persistent expiration registry is needed.

TanStack Query owns confirmed data, with account/session/page keys and F13's disabled retry/reconnect defaults. On opening, foreground return, a confirmed action, explicit refresh or foreground push, request ordinary refresh. Use the existing first-page infinite-query refresh pattern; replace traversal only after a successful refresh. Failed next pages retain their boundary. Cancel older reads around a confirmed read mutation and keep its monotone true value in the current session's query data; delayed list responses must not overwrite it. Session changes cancel/remove private queries and reject old callbacks. No optimistic unread count or cross-device polling.

The native notification handler decides banner/sound presentation promptly without awaiting network reads. A separate receive listener requests inbox/summary refresh, whose failure remains discreet. System badges remain subject to platform support and permissions; no silent push keeps other phones instantly synchronized.

A push contains notification, owner-account and match identities plus safe sporting text. It is not authorization. Use Expo's ordinary initial-response and tap APIs to route once through the existing match navigator, clearing the handled native response through the SDK. Attempt owner read independently when the current account matches; purged entries are not recreated. Under another account or guest access, open only the match with current rights, without an old-inbox request. Navigation/read failures remain ordinary and independent. F11's existing navigation counting applies; add no notification-specific ad trigger.

## Expo handoff and association lifecycle

After commit, ordinary Spring asynchronous processing uses immutable send context containing notification identity, selected follow relation identities and targeted associations. Reassess maintenance, owner existence, entry age/visibility, at least one original still-eligible follow, destination and content before external handoff. Removing/recreating a follow is not continuity. Current maintenance skips every new push, including operator recipients. The check does not promise an atomic stop or recall across an external network call.

The Expo adapter uses Spring RestClient with bounded waits. Follow native limits: at most 100 messages per request in one project, 600 messages/second/project and 4 KiB per payload. Dispatch through a bounded ordinary executor/paced batches; an overloaded or stopped process can drop unsent work with a safe diagnostic. Do not add a durable queue or automatic resend after refusal, timeout or uncertain response. These limits are provider constraints, not a Blockout capacity target.

Retain returned ticket IDs and their exact association/revision only in memory. An ordinary scheduled callback checks receipts once around fifteen minutes later, grouping up to 1,000 IDs per request. Missing/failed checks or a restart lose the evidence without resending. Process per-ticket errors and only invalidate the still-matching association/revision for `DeviceNotRegistered`. A late receipt cannot remove a newer registration. No SQL transaction spans either provider call.

Use one random UUID per installation, not the OS version or Expo address. Create a fresh subscription UUID per sign-in, including A → guest → A. Keep it for token rotation; authenticated PUT completely replaces its address and installation association. Uniqueness permits only one current association per installation/address. Serialize competing affected-account updates in existing account-lock order and enforce uniqueness in PostgreSQL. An ordinary concurrent uniqueness failure rolls back and returns Conflict; reconcile on the next normal registration occasion. Last accepted registration wins; this is not a new server session registry or a promise of global client-time ordering. DELETE targets only the exact owner/subscription UUID. Native JPA versioning guards delayed provider invalidation; explicitly increment the version on a successful re-registration even when its address is unchanged.

Use native token-change events and ordinary sign-in/foreground occasions to register the current destination. Logout attempts one bounded DELETE before discarding credentials, then clears private memory regardless of outcome. On sign-out, account change or confirmed account erasure, use Expo’s native `dismissAllNotificationsAsync()`, `setBadgeCountAsync(0)` and `clearLastNotificationResponse()` to clear this app’s presented notifications, local badge and handled tap state. Cleanup failure never prevents local sign-out and adds no retry system. Clearing presented notifications does not mark inbox entries read or recall messages still in transit. Other installations remain. Previously handed-off or unsuccessfully detached pushes may still arrive under the accepted F05 limitation. Account erasure removes all destination rows transactionally.

Future configuration enables Expo's server access-token protection and native iOS/Android credentials/channels. No token, address, ticket payload or notification content enters logs; ordinary safe error categories/counts support F13 diagnostics and configuration alerts. Keep provider default delivery lifetime, which may reach four weeks; a delayed message never claims a stream is currently active. No native image extension, interactive push action or background synchronization task.

## Interfaces and compatibility

The [contract guide](contracts/README.md) identifies canonical resources, owner boundaries and generated consumers. Use named shared Problem Details, private `no-store`, strict request properties and additive response properties. Read intent accepts only true. Registration returns 201 with Location for creation, 200 for replacement; removal returns 204 without content, including an already absent association. No asynchronous job resource or 202.

F02/F08 share transaction semantics; F06 supplies relation identity without a history table; F05 supplies original account identity and local erasure; F12 owns admission/maintenance; F11 owns privacy and existing ads; F14 owns the reset without notification import or replay. Their targeted cross-references point here instead of duplicating delivery design. The API is additive and keeps F13's admitted-client compatibility, generators and response validation. It does not claim full hypermedia REST conformance or introduce a hypermedia framework.

## Design and qualification

The owner explicitly approved prototype [18f3834](https://github.com/blockoutproject/product-prototype/commit/18f3834), then the scoped Figma report, in this conversation on 2026-10-15. The prototype corrects old-push routing, the deleted-account scenario and the 29-day active-use cutoff. [Figma’s guest return](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=5326-10826) replaces the obsolete deletion-progress screen; [the journey](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1062-9319) records current navigation and retention. Existing inbox cards and match screens are reused. No new screen or native notification-center mock is required. Native cleanup and delivery remain device qualifications, not visual evidence.

The [quickstart](quickstart.md) owns future qualification scenarios. Documentation/OpenAPI checks do not establish generated application compilation, actual push delivery, device behavior or design approval. No constitutional exception or additional complexity mechanism is requested.
