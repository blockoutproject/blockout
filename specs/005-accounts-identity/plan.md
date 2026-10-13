# Implementation Plan: Accounts, sessions and erasure

**Branch**: `tech/44-f05-technical-plan` | **Date**: 2026-10-13 | **Spec**: [F05](spec.md)

**Input**: [#44](https://github.com/blockoutproject/blockout/issues/44); approved [F13 foundation](../003-shared-quality/plan.md). This dossier defines future implementation; it creates no runtime or provider configuration.

**Status**: Draft. Scoped prototype and Figma approvals are pending. Final constitutional review and publication follow those approvals.

## Summary

Keep public access independent of authentication. Resolve each validated Auth0 principal to one PostgreSQL business account, with a neutral username, optional square photo and current server-side permissions. Native Auth0 credentials and a transient mobile session generation isolate private state; RevenueCat's SDK remains the entitlement authority.

Account erasure durably blocks the original account and removes its local personal data before provider cleanup. Keep only the original references needed to finish an incomplete request manually. No recovery worker, reconnection cleanup, operation ledger or new administration screen is introduced.

## Technical Context

**Language/Version**: Java 25 LTS, Spring Boot 4.1.1; TypeScript with Expo SDK 57, React Native 0.86 and React 19.2.3, inherited from F13.

**Primary Dependencies**: Spring Security resource server, JPA/Hibernate and ordinary PostgreSQL transactions; native `react-native-auth0` (5.11.1 inspected), Expo ImagePicker/ImageManipulator, TanStack Query. RevenueCat integration follows F09. Use F13's OpenAPI 3.0.4, Redocly, OpenAPI Generator and Orval chain without another generator or SDK abstraction.

**Storage**: PostgreSQL 18.6 for accounts, photo bytes and minimal pending erasure references. Native Auth0 secure credential storage; business cache and session generation in memory only. RevenueCat's standard cache remains separate.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL; Jest Expo/React Native Testing Library; controlled native iOS/Android provider scenarios. Browser prototype tests establish only simulated behavior.

**Target Platform**: Existing Linux backend deployment and native iOS/Android variants; iOS 16.4 minimum under F13. No Expo Go qualification.

**Project Type**: Feature in the shared modular backend and mobile app; no new service or collector responsibility.

**Performance Goals**: No speculative throughput, latency, load or monthly availability programme. Bound provider requests and image inputs; avoid external calls inside SQL transactions.

**Constraints**: One existing Auth0 tenant; no email-based identity resolution or new linking. Production Google/Apple; preproduction dedicated email/password connection with native signup. Prepared photo at most 1024 × 1024 and 5 MiB. No automatic ordinary request retry, offline write queue, persistent business cache or automated erasure recovery.

**Scale/Scope**: Guest/sign-in/profile/session/age/erasure boundaries and their existing consumers. Approximately 10,000 V1 accounts and 18 paying subscribers were reported by the owner; these figures justify no population migration engine and are not an audited inventory. Valid gifts and historical erasure references remain continuity obligations.

## Constitution Check

| Principle                    | Evaluation                                                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Owner-agreed changes are integrated into F05 and affected F07/F09/F13/F14 sources. No product implementation is authorized.                                                                                                                         |
| II — Domain integrity        | F05 owns account identity, profile and erasure. F12 owns permissions/admission; F09 entitlements; F14 transition; F07 destinations; F08 attribution; F10/F11 private requests. Their responsibilities are not copied into F05 services.             |
| III — Approved design        | **Pending:** prototype `e1a7915` is reviewable; owner approval and subsequent Figma reconciliation/approval are required for hosted signup and square cropping. Unchanged journeys retain their approvals. This draft does not pass the final gate. |
| IV — Contract first          | Extend the one canonical mobile root, reuse common errors/headers, and generate actual consumers together. No copy in the feature folder or production-generated files.                                                                             |
| V — Simplicity               | Ordinary SDK, SQL and manual provider operations meet the agreed scope. No per-device business sessions, entitlement mirror, workflow engine or full historical-user migration. See [research](research.md).                                        |

Finalization remains blocked only by the stated design approvals and subsequent consistency/validation review. Runtime qualifications in [quickstart](quickstart.md) remain future implementation evidence, not approvals claimed by this dossier.

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

After an explicit successful login, `POST /accounts` establishes the account or synchronizes its necessary provider email and age evidence. Read Auth0 by exact principal ID outside the SQL transaction, then recheck current account/deletion state when committing. A synchronization started for an existing UUID cannot become creation or update of a replacement UUID. An ordinary startup/profile read uses `GET /accounts/me` and never contacts Auth0 or creates an account. Missing necessary age evidence can be retrieved through an explicit targeted retry using bootstrap, without requiring another login while authentication is valid.

First creation without a usable provider email fails without a partial account. Existing known email/age survive a provider outage; username and photo are never provider-synchronized. Account age uses the retained Auth0 principal's `created_at`, including existing linked methods; unknown age remains unknown and only age-dependent actions are suspended.

Use separate native app registrations, clients and API audiences in the existing tenant. Enable the dedicated database connection only for preproduction, with native signup; enable Google/Apple only for production. No credentials or Management API secret in the mobile. Before any preproduction destructive provider operation, establish that the principal belongs exclusively to the dedicated connection, without linked foreign identities. Shared tenant administrative powers remain a real isolation limit. These are future configuration/qualification instructions, not actions performed here.

## Profile, photo and concurrent changes

The mobile prepares a square crop through native ImagePicker (`allowsEditing`, square aspect on Android; native square editing on iOS), then uses ImageManipulator once to resize without enlargement to at most 1024 pixels and encode PNG. Check the prepared upload against 5 MiB; a large original is not rejected solely for exceeding the upload bound. The original library asset remains untouched. Cancellation and preparation failure preserve the draft. The prototype's web crop is illustrative, not a custom editor selected for native production.

The single save sends an atomic multipart `PATCH /accounts/{accountId}` with JSON metadata and an image only for replacement. Only changed fields are submitted. Absence preserves current state; photo removal is explicit. Validate actual PNG/JPEG, byte size, square dimensions and successful decoding before the short SQL transaction; re-encode accepted pixels without unrelated original metadata using standard Java ImageIO. Replace/remove bytes and their association in that transaction. Do not persist a temporary upload or introduce a storage synchronization process.

Trim outer username whitespace and validate 3–32 ASCII letters/digits/`.`/`_`/`-`; PostgreSQL case-insensitive uniqueness handles races. A refused field rejects the whole save. Lock the current account row while applying changes: the last accepted change to a supplied field wins, and omitted concurrent fields survive. No revision-token conflict journey is added. After an uncertain response, reread the original account before explicit retry; a credential renewal does not replay the write.

## Mobile session and shared consumers

Use native Auth0 credential management and renewal. On sign-out, invoke normal browser-session closure without global federated logout, and independently clear local credentials even if that call fails or is cancelled. Rotate an in-memory session UUID on every account lifecycle boundary, cancel/clear private queries and discard callbacks from the previous UUID, including A → guest → A. A failed cancellation alone is not sufficient protection.

Attempt old destination disassociation once before discarding its credentials, with bounded waiting; failure never prevents local sign-out. No persisted cleanup secret or retry is added. F07 guards the old association so a delayed removal cannot remove B. Failure may leave old-account system pushes deliverable until normal reassociation, provider invalidation or manual intervention; opening them cannot expose A's private state under guest/B. Erasure removes all associated destinations server-side.

Configure RevenueCat for the usable business UUID and use SDK-provided entitlement state only. Reject old-session callbacks and do not reconfigure an erased account on startup/re-entry. Guests have no previous-account rights; an absent SDK state is not a free-account decision. Existing SDK instances on another device are not remotely revoked by customer deletion: qualify that lifecycle under F09/F14, without inventing an independent session service.

All protected business use cases verify current account usability and their own current ownership/permission before committing. They coordinate their short mutation transaction with account erasure using the account row lock; erasure cannot race a new follow, destination or attribution into the deleted lifecycle. Collector tokens are not account credentials. F12 determines baseline capabilities and distinct administration grants; this plan does not create its grant catalogue or API.

## Erasure and manual resolution

1. Validate the original account owner and explicit confirmation. Before acceptance, obtain or retain the minimal original provider targets needed for safe cleanup, including existing linked identities. Missing essential identity scope refuses acceptance without external effects; known references need no redundant lookup. No arbitrary recent-login threshold is introduced.
2. In one short transaction, lock the original account, retain that same minimal account/identity row in pending state with its acceptance time, erase its personal profile fields and associations and detach retained useful contribution/report attribution under F08. All devices lose business usability at this point. Retained hidden content stays hidden. Do not retain the complete account as a tombstone.
3. After commit, attempt ordinary cleanup of the exact Auth0 and RevenueCat targets once. The pending request survives process loss or any provider failure. Auth0 deletion includes its supported linked-profile/revocation behavior; Google/Apple global accounts and store billing are not deleted.
4. Keep unresolved requests discoverable through private database/provider tools and F13's existing diagnostic/incident route. An operator inspects remaining targets, performs necessary authorized cleanup and establishes completion. No per-step ledger, periodic retry, special resume command or automatic check at later login. Public support/privacy obligations retain their owners.
5. Before resolving the block, establish that no original destructive work can affect a later account. Compare a reused Auth0 subject with the original principal/creation evidence before any manual delete; email is never the target. RevenueCat v2 deletion acceptance may be asynchronous. Use non-creating inspection and available provider guarantees; do not pretend that HTTP 200 proves physical deletion or require evidence the supplier cannot supply. Ambiguity keeps the request pending for private resolution.
6. Resolution releases the principal/linked-identity block and removes references no longer justified. A later explicit registration creates a fresh business UUID, age and baseline permissions, with no old profile, follows, gifts or contribution ownership. Separate legitimate F11 retention does not alone block recreation indefinitely.

While pending, bootstrap checks the stored original principal and linked-identity references before creating anything, including a formerly linked secondary identity returning as a separate principal. It does not poll providers. A valid original owner can read the minimal pending result for the original UUID despite the ordinary business block. A lost deletion response is resolved by that read; invalid authentication leads to guest/support, not silent recreation. A 202 is acceptance; absence of the API resource is not independent proof of every supplier's physical purge.

Standard Auth0 token validity remains accepted: after completed deletion and same-subject registration, an earlier still-valid token can authorize the new account under its current permissions until expiration. No custom token lifecycle claim, session registry or artificial registration delay is added. This exception does not authorize a stale UUID-targeted mutation or old cleanup to affect the new lifecycle.

## Continuity, operations and limits

F14 preserves existing Auth0 principals, linking and age while establishing new V2 business UUIDs. Recover paid entitlements through explicit native restoration and verified manual assistance for exceptions; preserve valid gifts separately. Keep necessary historical RevenueCat references discoverable for continuity and erasure, including old records left after purchase transfer. This is not a full profile export or mandatory mapping registry for the whole user population.

F10/F11 own external privacy requests and any data within retained content. The existing public privacy page provides the external deletion request direction and contact, without a new portal; its store registration is qualified by F14. Restoring a backup requires manual reconciliation of current erasures/rights/expiry before reopening affected access or sends.

Private provider credentials stay server-side. Diagnostics identify stages/outcomes and incomplete obligations without logging subjects, email, photos, tokens or raw provider payloads. Use existing F13 operations; no erasure dashboard or automated repair service. F13's evolving Liquibase baseline and later freeze policy apply without additional schema history during disposable development.

## Complexity Tracking

No constitutional complexity exception is requested. The pending design gate is a prerequisite to satisfy, not a justified waiver.
