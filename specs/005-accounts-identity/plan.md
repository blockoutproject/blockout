# Implementation Plan: F05 accounts, identity and sessions

**Publication branch**: `develop` (planning-only initialization policy) | **Date**: 2026-10-06 | **Spec**: [F05](spec.md) | **Issue**: [#20](https://github.com/blockoutproject/blockout/issues/20)

## Summary

Use standard Auth0 authentication with the React Native SDK and Spring resource-server validation. The `accounts` module owns the business account, external correspondence, provider contact email, profile, account-age evidence and minimal accepted-deletion state. Do not build a business session registry or strengthen Auth0 access-token invalidation with custom lifecycle claims or a re-registration delay.

Create an eligible profile only through explicit bootstrap after authentication, with a neutral username and the approved default avatar. Synchronize provider information at explicit sign-in, not every app start or sporting request. Automatically attempt ordinary erasure once after durable acceptance; incomplete work is manually resolved through existing tools. F13 owns diagnostics and incident delivery.

This dossier is documentation, not application initialization or executed provider qualification. The owner-approved decisions amend the owning specification; constitution 5.0.0 governs the dossier and official procedures remain unchanged. Dossier acceptance and the global [#9](https://github.com/blockoutproject/blockout/issues/9) gate precede implementation issues and runtime work.

## Technical context

| Concern           | Selected boundary                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime           | Java 25 / Spring Boot 4.1, PostgreSQL 18, Liquibase 5 XML; Expo 57 / React Native 0.86 / React 19.2 / TypeScript, inherited from architecture/F13; compatible stable patches remain an initialization qualification.  |
| Authentication    | Existing Auth0 tenant and Google/Apple connections; native Auth0 SDK credentials manager; Authorization Code with PKCE in the system authentication browser; Spring Security JWT resource server.                     |
| State             | PostgreSQL `accounts` schema and private S3 profile images; SDK-secured tokens, in-memory TanStack Query private data, small non-secret installation preferences. No business session table or persisted query cache. |
| Contracts         | OpenAPI 3.0.3 under `/api/v1`; Java server and TypeScript mobile consumers; F13 reproducibility checks across its generator toolchains. Python has no F05 runtime consumer.                                           |
| Tests             | JUnit/Spring, real PostgreSQL Testcontainers, controlled provider HTTP; Jest Expo/RNTL and separate actual iOS/Android qualification.                                                                                 |
| Performance goals | None. No load, benchmark, capacity or monthly availability work.                                                                                                                                                      |
| Scope             | Five stories, FR-001–FR-039, A01–A32 and SC-001–SC-008; guest access, profile, session behavior, age and deletion.                                                                                                    |

**KISS design gate:** the [targeted 2026-10-06 approval](../../docs/design.md#review-references) covers the recorded shared-email/Pro and related revised journeys at prototype behavior `18a03849c03a7d46ab6b7f5d717523ab4ade19c5`, evidence `e85333b`. [Dossier #20 acceptance](https://github.com/blockoutproject/blockout/issues/20#issuecomment-6076342664) is separate. Actual native/provider/runtime qualification remains unexecuted; future material UI changes still require renewed approval under constitution III.

## Constitution check

Apply these gates before research and after design; no exception is selected.

| Principle                   | Application                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification authority | Update accepted behavior explicitly for neutral usernames, default avatars, minimal deletion and standard Auth0 token semantics; no silent stronger promise.                                 |
| II — Domain integrity       | One accounts owner; explicit business, provider, transport and persistence boundaries. Paid rights remain F09, destinations F07 and legal obligations F11.                                   |
| III — Design readiness      | Reuse approved Access, Account and System journeys/default-avatar/error states. No added admin screen or web form. A material discrepancy requires targeted approval before finalization.    |
| IV — Contracts              | Authored schemas before consumers; strict requests, additive validated responses and common safe problems. Generated outputs remain outside Git.                                             |
| V — Simplicity              | Standard SDKs, SQL uniqueness, explicit module methods and one deletion state. No custom session/recovery system, per-step ledger, periodic deletion worker or speculative shared framework. |
| Governance                  | Official `speckit-plan`, `speckit-checklist`, `speckit-tasks`, `speckit-analyze`; GitHub owns acceptance and delivery evidence.                                                              |

## Project structure

Dossier: `specs/005-accounts-identity/{plan,research,data-model,quickstart,tasks}.md`, `contracts/` and `checklists/accounts-design.md`.

Future occupied locations:

```text
apps/backend/src/main/java/com/blockout/accounts/{api,application,domain,infrastructure}/
apps/backend/src/main/java/com/blockout/coordination/AccountErasureCoordinator.java
apps/backend/src/main/resources/db/changelog/accounts/
apps/backend/src/test/java/com/blockout/{accounts,coordination}/
apps/mobile/src/features/accounts/
apps/mobile/src/app/                 # thin approved access/account routes only
contracts/public/accounts/
```

These are intended locations, not existing applications. Create packages only for concrete consumers. Consume F13's runtime, schema and transport setup; do not duplicate it. Freeze the Liquibase baseline at first preproduction or earlier retained data, as F13/F02 require.

## Account and mobile design

[Data model](data-model.md) defines the current principal/account mapping, non-unique provider email and profile constraints. Auth0 proves the principal; an email is never a linking or purchase proof. F14 preserves verified identity/customer correspondences before opening bootstrap. Two unlinked principals may share the same email without conflict. Existing associations are retained, not reconstructed by email.

Bootstrap performs necessary provider reads outside SQL, then rechecks current lifecycle and unique constraints in a short local transaction. A known active account remains usable when optional synchronization fails; return retained values without declaring synchronization success. Missing reliable age blocks only the age-dependent action. An unavailable first-creation email cannot be fabricated. Normal profile reads never create or contact providers.

[Account API](contracts/account.openapi.yaml) defines bootstrap, current-profile reads, profile edits, private photo operations and erasure requests. [Behavior contract](contracts/account-behavior.md) defines uncertain responses and native session state. F13 supplies bounded requests, one eligible read retry, no automatic mutation repetition and private-cache isolation.

Keep Auth0's real token validity. Current SQL status and permissions are checked for private operations; no `isConnected` flag, per-device registry, custom token claim or token-expiry re-registration delay. After resolved deletion and same-subject re-registration, an older still-valid access token may authorize the new account under its current permissions. This accepted limit is distinct from prohibited restoration of old business data, late mobile cache writes or stale erasure targeting a new account.

## Erasure and operations

[Erasure contract](contracts/erasure-and-operations.md) selects one durable `DELETION_REQUESTED` account state with original cleanup references, not a persisted step graph. Acceptance blocks business access and locally removes/minimizes owned personal data through explicit module coordination. External cleanup is outside SQL and receives one ordinary post-commit backend execution attempt. Process failure leaves manual work; no automatic restart/retry promise.

Use standard Auth0 deletion. Qualify its associated refresh-token removal and applicable Apple revocation; do not add a separate Apple integration preemptively. RevenueCat deletion is asynchronous: accepting its request is not proof of physical completion. F09 qualifies customer mappings, restoration and return safety; unresolved dangerous external cleanup stays blocked for manual resolution, without an arbitrary waiting period or polling framework.

Use the existing F13 logs/Alloy/Grafana/IRM/Discord route. A confirmed failure opens the normal scoped incident; another account's success is not recovery. A process crash can require the existing operational investigation and inspection of minimal pending account records, not a new supervisor. Manual resolution records evidence privately in the existing incident/support tool.

The existing public privacy page receives a prominent deletion section and direct anchor link plus the F11 contact email. No new portal or web form. External requests require ownership verification and the same acceptance/cleanup outcomes. F11 owns public wording/contact; F14 verifies the store link.

## Feature boundaries and design authority

[Consumers](contracts/consumers.md) defines interfaces for F06/F07 personal associations, F08 age/attribution, F09 rights/provider cleanup, F10/F11 support/privacy, F12 permissions and F14 verified continuity inputs. In-process module APIs are not private HTTP services. No collector access to personal accounts is created.

Use [UI Library](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library) and [Product Design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design), Access `723:2`, Account `1087:6`, System `723:3`, through the [design authorities and approvals](../../docs/design.md#review-references). Reuse unchanged guest/sign-in, unavailable-profile, edit-failure and deletion states; shared-email isolation and SDK-owned entitlement/restore states have the scoped approval above. The default avatar is an existing empty-photo state, not a new visual component. Native behavior and the final rendering remain future evidence; historical links do not authorize reading legacy repositories.

## Implementation sequence and validation

1. Consume F13 foundation; remove the planning bypass before any future executable change.
2. Implement accounts persistence, verified continuity input and explicit bootstrap/read/security boundary.
3. Add neutral profile generation and safe private image changes.
4. Integrate SDK session behavior, provider synchronization and age evidence.
5. Add minimal erasure coordination, manual procedure and existing diagnostics; integrate the owning domain adapters.
6. Execute generated-consumer, real database, provider/native and approved-journey evidence in [quickstart](quickstart.md).

All runtime/provider/native qualifications in this dossier are **NOT EXECUTED**. Documented vendor behavior is not proof of this tenant or installed build. A failed qualification blocks the affected boundary and returns an actual incompatibility to an explicit decision; it does not authorize a custom framework. Documentary finalization requires complete traceability, official read-only analysis without blocking contradictions, formatting/local-link checks and owner acceptance.

## Complexity tracking

No constitutional exception. The chosen standard Auth0 limitation is an explicit product decision, not a claim of stronger revocation. SQL constraints, a private image association and minimal pending deletion state have concrete current uses. No unrelated application infrastructure is added.
