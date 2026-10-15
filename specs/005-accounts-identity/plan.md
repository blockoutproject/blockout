# Implementation Plan: Accounts, sessions and erasure

**Branch**: `tech/44-f05-technical-plan` | **Date**: 2026-10-13 | **Spec**: [F05](spec.md)

**Input**: [#44](https://github.com/blockoutproject/blockout/issues/44); approved [F13 foundation](../003-shared-quality/plan.md). This dossier defines future implementation; it creates no runtime or provider configuration.

**Design scope**: The revised deletion prototype and Figma translation are approved; unchanged in-app approvals remain applicable. Hosted authentication and native crop interfaces remain outside reproduction scope.

## Summary

Keep public access independent of authentication. Resolve each validated Auth0 principal to one PostgreSQL business account, with a neutral username, optional square photo and current server-side permissions. Native Auth0 credentials and a transient mobile session generation isolate private state; RevenueCat's SDK remains the entitlement authority.

Delete the original account and its local personal data synchronously, then attempt bounded provider cleanup. Private failure diagnostics support manual repair; no pending account, recovery worker, polling or replay is introduced. The app returns directly to guest home after the request.

## Technical Context

**Language/Version**: Java/Spring Boot backend and TypeScript/Expo mobile; versions follow the [F13 technical context](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Spring Security resource server, JPA/Hibernate and ordinary PostgreSQL transactions; native `react-native-auth0`, Expo ImagePicker/ImageManipulator and TanStack Query. RevenueCat integration follows F09; contract tooling follows [F13](../003-shared-quality/contracts/README.md). Inspected SDK evidence is in [research](research.md#native-authentication-and-environment-boundary).

**Storage**: F13 PostgreSQL for accounts and photo bytes; no pending-erasure row. Native Auth0 secure credential storage; business cache and session generation in memory only. RevenueCat's standard cache remains separate.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL; Jest Expo/React Native Testing Library; controlled native iOS/Android provider scenarios. Browser prototype tests establish only simulated behavior.

**Target Platform**: Existing Linux backend deployment and native iOS/Android variants; iOS 16.4 minimum under F13. No Expo Go qualification.

**Project Type**: Feature in the shared modular backend and mobile app; no new service or collector responsibility.

**Performance Goals**: No speculative throughput, latency, load or monthly availability programme. Bound provider requests and image inputs; avoid external calls inside SQL transactions.

**Constraints**: One existing Auth0 tenant; no email-based identity resolution or new linking. Production Google/Apple; preproduction dedicated email/password connection with native signup. Prepared photo at most 1024 × 1024 and 5 MiB. No automatic ordinary request retry, offline write queue, persistent business cache or automated erasure recovery.

**Scale/Scope**: Guest/sign-in/profile/session/age/erasure boundaries and their existing consumers. Valid gifts and historical erasure references remain continuity obligations.

## Constitution Check

| Principle                    | Evaluation                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification-led intent | Owner-agreed changes are integrated into F05 and affected F01/F07/F08/F09/F10/F11/F13/F14 sources. No product implementation is authorized.                                                                                                |
| II — Domain integrity        | F05 owns account identity, profile and erasure. F12 owns permissions/admission; F09 entitlements; F14 transition; F07 destinations; F08 attribution; F10/F11 private requests. Their responsibilities are not copied into F05 services.    |
| III — Approved design        | The revised deletion sheet and direct guest return have separate prototype and Figma approvals. Unchanged image/sign-in approvals and the exclusion of hosted/native UI remain applicable. See [design evidence](spec.md#design-evidence). |
| IV — Contract first          | Extend the one canonical mobile root, reuse common errors/headers, and generate actual consumers together. No copy in the feature folder or production-generated files.                                                                    |
| V — Simplicity               | Ordinary SDK, SQL and manual provider operations meet the agreed scope. No per-device business sessions, entitlement mirror, workflow engine or full historical-user migration. See [research](research.md).                               |

Both scoped design approvals satisfy the post-design check. Runtime qualifications in [quickstart](quickstart.md) remain future implementation evidence, not approvals claimed by this dossier.

## Project Structure

### Documentation (this feature)

```text
specs/005-accounts-identity/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/README.md
```

The HTTP source remains `contracts/http/mobile/openapi.yaml`, with account definitions referenced from its `accounts/` directory and common technical primitives under `contracts/http/common/`. No tasks are generated here.

### Source Code (repository root)

Planned locations within F13's workspace, not created by this task:

```text
apps/backend/     # account use cases, persistence, provider adapters and HTTP boundary
apps/mobile/      # account feature, native SDK integration, profile form and session cache isolation
contracts/http/   # authored mobile and ingestion roots, shared primitives
```

Use the existing modular application, feature-local responsibilities and ordinary library integrations. F05 adds no module/deployment for each lifecycle step; transport DTOs remain separate from JPA entities.

## Identity and account establishment

Validate JWT signature, issuer, environment audience, expiry, allowed client and required scopes with Spring Security. Use the validated `(issuer, sub)` as the unique principal mapping; never trust a body-supplied subject or resolve by email. PostgreSQL uniqueness settles simultaneous bootstrap attempts. Generate an available neutral username using the same rules as manual edits; email is not unique.

After an explicit successful login, `POST /accounts` establishes the account or synchronizes its necessary provider email and age evidence. Read Auth0 by exact principal ID outside the SQL transaction, then recheck the original account state when committing. A synchronization started for an existing UUID cannot become creation or update of a replacement UUID. An ordinary startup/profile read uses `GET /accounts/me` and never contacts Auth0 or creates an account. Its response includes the [F12 permission projection](../013-administration-app-configuration/data-model.md#permission-projection). This narrow read remains available during maintenance for operator identification, without enabling profile navigation, photo access or account establishment. A 404 never triggers automatic establishment. Missing necessary age evidence can be retrieved through an explicit targeted retry using bootstrap, without requiring another login while authentication is valid.

First creation without a usable provider email fails without a partial account. Existing known email/age survive a provider outage; username and photo are never provider-synchronized. Account age uses the actual Auth0 principal's `created_at`, including existing linked methods. A principal surviving failed cleanup retains its age after new business registration; successful identity deletion normally yields a new principal date. Unknown age remains unknown and only age-dependent actions are suspended.

Use separate native app registrations, clients and API audiences in the existing tenant. Enable the dedicated database connection only for preproduction, with native signup; enable Google/Apple only for production. No credentials or Management API secret in the mobile. Before any preproduction destructive provider operation, establish that the principal belongs exclusively to the dedicated connection, without linked foreign identities. Shared tenant administrative powers remain a real isolation limit. These are future configuration/qualification instructions, not actions performed here.

## Profile, photo and concurrent changes

The mobile prepares a square crop through native ImagePicker (`allowsEditing`, square aspect on Android; native square editing on iOS), then uses ImageManipulator once to resize without enlargement to at most 1024 pixels and encode PNG. Check the prepared upload against 5 MiB; a large original is not rejected solely for exceeding the upload bound. The original library asset remains untouched. Cancellation and preparation failure preserve the draft. The shared image field handles selection, preview, replacement and explicit removal, as required by F13; native selection/crop UI is not reproduced in the web prototype or Figma. The profile-specific square and size rules do not apply automatically to other image owners.

The single save sends an atomic multipart `PATCH /accounts/{accountId}` with JSON metadata and an image only for replacement. Submit username, photoAction, or both. Absence preserves current state; photo removal is explicit. Supplying the current username remains valid and needs no extra change-detection mechanism. Validate actual PNG/JPEG, byte size, square dimensions and successful decoding before the short SQL transaction; re-encode accepted pixels without unrelated original metadata using standard Java ImageIO. Replace/remove bytes and their association in that transaction. Do not persist a temporary upload or introduce a storage synchronization process.

Trim outer username whitespace and validate 3–32 ASCII letters/digits/`.`/`_`/`-`; PostgreSQL case-insensitive uniqueness handles races. A refused field rejects the whole save. Lock the current account row while applying changes: the last accepted change to a supplied field wins, and omitted concurrent fields survive. No revision-token conflict journey is added. After an uncertain response, reread the original account before explicit retry; a credential renewal does not replay the write.

## Mobile session and shared consumers

Use native Auth0 credential management and renewal. On first V2 use, finish the [F14 local initialization](../014-v1-v2-transition/plan.md#installation-initialization) before mounting Auth0Provider; subsequent launches use ordinary restoration. On sign-out, invoke normal browser-session closure without global federated logout, and independently clear local credentials even if that call fails or is cancelled. Rotate an in-memory session UUID on every account lifecycle boundary, cancel/clear private queries and discard callbacks from the previous UUID, including A → guest → A. A failed cancellation alone is not sufficient protection.

Attempt old destination disassociation once before discarding its credentials, with bounded waiting; failure never prevents local sign-out. No persisted cleanup secret or retry is added. [F07](../011-notifications-delivery/plan.md#expo-handoff-and-association-lifecycle) guards the old association so a delayed removal cannot remove B or a later sign-in of A. Failure or an old registration already in transit may leave old-account system pushes deliverable until normal reassociation, provider invalidation or manual intervention; opening them cannot expose A's private state under guest/B. Erasure removes all associated destinations server-side. The same F07 boundary resets the app-controlled badge on local sign-out/account change or confirmed erasure. Presented system notifications follow platform behavior and may remain; no dismissal or cleanup retry is added.

Configure RevenueCat for the usable business UUID and use SDK-provided entitlement state only. Reject old-session callbacks and do not reconfigure an erased account on startup/re-entry. Guests have no previous-account rights; an absent SDK state is not a free-account decision. Existing SDK instances on another device are not remotely revoked by customer deletion: qualify that lifecycle under F09/F14, without inventing an independent session service.

All protected business use cases verify current account usability and their own current ownership/permission before committing. They coordinate their short mutation transaction with account erasure using the account row lock; manual F12 grant changes use the same lock before reading/changing grants. Where domain root locks are also needed, acquire those in their owner order before account locks (sorted UUIDs for several accounts), and acquire no domain root lock afterward. Account erasure changes private associations/attribution without acquiring sporting root locks; erasure cannot race a new follow, destination or attribution into the deleted lifecycle. F06’s [association lifecycle](../009-following-personal-feed/data-model.md#persisted-associations) participates in the same local erasure transaction and account lock, including hidden follows; it adds no provider cleanup or pending-erasure state. Collector tokens are not account credentials. F12 determines baseline capabilities and distinct administration grants; this plan does not create its grant catalogue or API.

## Erasure and manual resolution

1. Present the shared bottom sheet from the profile with concise consequences, the confirmation checkbox and plain store-billing guidance; no subscription-management action. Validate the owner and explicit confirmation; capture the original business UUID and known Auth0/RevenueCat targets, including justified historical references. Do not block local deletion on a live provider lookup. Missing external target/scope evidence is logged for manual handling; no destructive provider call proceeds without the applicable environment and identity-scope checks.
2. In one short PostgreSQL transaction, lock and remove the original account, photo and personal associations; detach retained contribution/decision attribution and remove reporter associations and free-text reasons under F08, preserving counted report facts and moderation decisions. A definite transaction failure starts no external cleanup and preserves the usable account/session. Other personal writers use the same account lock.
3. After commit, attempt each known original Auth0 and RevenueCat cleanup once with ordinary bounded calls. Continue to the other targets on failure; never roll back local deletion. Trust documented acknowledgments: Auth0 204 confirms user removal; RevenueCat v2 200 queues asynchronous customer deletion. That successful acknowledgment alone needs neither polling nor manual intervention. Global Google/Apple accounts and store billing remain separate.
4. Emit a private failure/uncertainty diagnostic for missing target evidence or failed external cleanup. Use native Grafana log alerting and a generic Discord notification. The operator uses existing database/provider/support tools to inspect and repair original targets, verifying current use before destructive action. Never guess a replacement or match by email. No pending record, outbox, worker, retry ledger or new administration screen.
5. Return HTTP 204 after local deletion and bounded attempts, including logged provider failure. Independently clear mobile credentials and private session state despite browser/provider logout failure, then navigate to guest home without a receipt, progress view or success toast. If the response is lost, read the original account before explicit retry; unavailable read uses an ordinary error and permits local sign-out without claiming confirmed deletion. Repeated DELETE of an absent original UUID returns 404 without new provider calls.

Private diagnostics may retain only the original account ID, relevant provider references and minimal original-target verification evidence, with operation, environment, provider, time and a safe outcome/reason. Exclude email, profile content, images, tokens, secrets and raw provider payloads. Keep these references out of metric labels and Discord messages. Logs retain F13's 14 days; an unresolved case beyond that period uses existing private support handling for still-needed evidence, removed when its purpose ends. [F11](../004-advertising-privacy-legal/spec.md) governs purpose and recipients.

A process interruption after commit but before logging can leave external cleanup unreported. No durable mechanism closes that accepted gap, and an alert's native closure does not establish repair. Manual handling has no guaranteed response time.

Explicit sign-in may create a new business UUID immediately, without a cleanup gate or polling. Its profile, follows, grants, gifts and attribution start empty; age uses the actual Auth0 principal. No special coordination handles simultaneous return and an in-flight provider delete: ordinary errors and manual assistance apply. Standard Auth0 token validity is retained; an earlier still-valid same-subject token can authorize the new account under its current rights. No custom session registry, lifecycle claim or re-registration delay is added. An old UUID-targeted request still cannot act on the replacement UUID.

## Continuity, operations and limits

F14 preserves existing Auth0 principals, linking and age while establishing new V2 business UUIDs. Recover paid entitlements through explicit native restoration and verified manual assistance for exceptions; preserve valid gifts separately. Keep necessary historical RevenueCat references discoverable for continuity and erasure, including old records left after purchase transfer. This is not a full profile export or mandatory mapping registry for the whole user population.

F10/F11 own external privacy requests and any data within retained content. The existing public privacy page provides the external deletion request direction and contact, without a new portal; its store registration is qualified by F14. Restoring a backup requires manual reconciliation of current erasures/rights/expiry before reopening affected access or sends.

Private provider credentials stay server-side. The narrowly scoped private cleanup-reference exception follows F05/F11; all other diagnostics retain F13’s personal-data exclusions. Use existing F13 operations; no erasure dashboard or automated repair service. F13's evolving Liquibase baseline and later freeze policy apply without additional schema history during disposable development.

## Complexity Tracking

No constitutional complexity exception is requested.
