# Implementation Plan: administration and application access

**Branch**: `tech/46-administration-access-plan` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Current F12 specification and accepted decisions for [#46](https://github.com/blockoutproject/blockout/issues/46). Delivery produces planning artifacts and coordinated specifications/contracts, not application implementation or tasks.

## Summary

Keep current action grants in PostgreSQL, assigned manually by the product owner. Provide one public access-configuration read and reuse the current-account read for permissions. Two independently versioned settings aggregates protect maintenance and platform minimums. Standard Auth0 renewal, Expo Router guards, Spring authorization and JPA transactions support the accepted journeys without a new identity, recovery or configuration service.

## Technical Context

**Language/Version**: Java 25 LTS and TypeScript; Expo SDK 57 / React Native 0.86 / React 19.2.3 under the accepted [F13 foundation](../003-shared-quality/plan.md).

**Primary Dependencies**: Spring Boot 4.1.1 and its managed Spring Security/JPA/Hibernate; native Auth0 SDK; Expo Router, expo-application and Linking; TanStack Query. Reuse F13's Redocly 2.62.1, OpenAPI Generator 7.26.0 and Orval 8.41.0 chain. Platform-compatible unpinned patches are resolved during executable work; no dependency installation or upgrade is performed here.

**Storage**: PostgreSQL 18.6; two singleton settings rows and account–permission associations. Mobile access state, bypass intent and business cache remain in memory. Auth0 alone retains secure credentials.

**Testing**: JUnit/Spring MVC/Testcontainers PostgreSQL; Jest Expo/React Native Testing Library; physical iOS/Android qualifications. No additional test framework.

**Target Platform**: Native iOS and Android and the existing modular backend. F13/F14 own device and delivery qualification.

**Project Type**: Feature of the shared backend/mobile workspace, not a separate service or deployment.

**Performance Goals**: No new performance, load, capacity or monthly availability programme.

**Constraints**: Current rights before effects; no silent old-state overwrite; no mobile access polling, persisted access fallback, automatic business retry, generic operator console or privileged bootstrap endpoint. Maintenance does not cancel accepted work or pause collection.

**Scale/Scope**: F12 administration/admission; targeted F05/F02/F13/F14 reconciliation. Other owners retain their commands and lifecycle rules.

## Constitution Check

The [constitution](../../.specify/memory/constitution.md) passes before research and after design for this documentary scope. Runtime qualifications remain open obligations, not claimed results.

| Principle          | Evidence and boundary                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Product intent | Accepted choices are integrated into the owning specifications; account/session and transition consumers are reconciled.                                                                                                             |
| II — Ownership     | F12 owns admission and grants; F05 owns account lifecycle; domain commands and provider duties stay with their owners.                                                                                                               |
| III — Design       | Existing [F12 scoped approvals](spec.md#clarifications) remain applicable. No new screen, interactive sign-in entry, or illustration is introduced. Silent renewal and technical account reading do not change the approved layouts. |
| IV — Contracts     | One canonical mobile API, generated provider/mobile consumers, shared errors. No plan-local editable copy or generated source is committed.                                                                                          |
| V — Simplicity     | Ordinary framework mechanisms, two settings aggregates and manual assignment; alternatives and limits are in [research](research.md).                                                                                                |
| Prerequisites      | #44 is closed; accepted F13/F05/F02/F11 decisions and scoped design evidence were checked. No withdrawn dossier selects this architecture.                                                                                           |

## Project Structure

### Documentation

```text
specs/013-administration-app-configuration/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
├── quickstart.md
└── checklists/requirements.md
```

Canonical HTTP changes live under `contracts/http/mobile/access/`, referenced by the existing mobile root and account schema. No tasks are generated.

### Future source structure

F12 occupies feature-owned application/domain/persistence/HTTP packages in `apps/backend` and an access/administration feature in `apps/mobile`. Thin Expo Router layouts consume its state. Account reads call F12 permission projection in-process. Collector ingestion and background domain work do not call the mobile admission endpoint. No runtime directories are created by this delivery.

## Responsibilities and authorization

Use [account associations and explicit action grants](data-model.md#permissions-and-locking), not roles or a second Auth0 permission authority. Spring validates token issuer, audience, client, expiration and required scopes; business services load current grants from PostgreSQL. HTTP and service checks cover every protected operation; a visible button never authorizes a call.

The owner alone uses an authorized database connection to grant/revoke rights. Delegated mobile operators receive neither SQL credentials nor a grant-management operation. Permission changes and protected mutations coordinate through the existing F05 account-row lock. Transactions needing domain roots acquire those first in their owner's order, then account locks; [F02](../002-sporting-data/plan.md) records the same order. Check current grants after obtaining the account lock. An admitted short mutation may finish before withdrawal; one ordered after withdrawal is refused.

F08 adds the global `stream-links.moderate` grant and `moderateStreamLinks` projection for the complete video-moderation scope, including publication and withdrawal. It supplies no unrelated administrative right; video moderation remains ordinary business access during maintenance unless separately granted explicit bypass.

Grant projections control presentation only. The three F12 capabilities are separate; domain grants remain global per action while resource ownership and domain invariants still apply. Account erasure removes grants, and recreation never restores them. No business permission follows from a generic administrator identity or Pro entitlement.

## Configuration and server admission

Persist maintenance and versions as two versioned aggregates. Validate complete resulting state before an atomic write. Content edits preserve activation; activation PUT sets a desired boolean, never toggles blindly. JPA optimistic checks reject racing commits even after the explicit submitted-revision comparison. No-effect updates preserve revision. Failed/uncertain saves preserve the draft; reread before explicit resubmission, with no automatic merge or replay.

Read the complete public configuration through one SQL statement projection over both settings rows. Missing/invalid required settings are unavailable, not permissive defaults. Use current PostgreSQL state before admitting ordinary API work; do not add an application/distributed cache. An admission check establishes the ordering boundary with activation, and already admitted short work can finish.

Allow only the explicit exceptions: public access read, authenticated `GET /accounts/me` for identification, individually authorized operational commands, existing public legal documents and health. Ingestion/internal work has its own authorization and does not inherit the mobile gate. Profile editing/photo reads, account establishment and other ordinary operations remain blocked without valid personal bypass. Routes are matched by actual method/resource, not a blanket `/administration/**` privilege.

A maintenance refusal is 503 with a specific Problem Details type and current maintenance representation. It introduces a restriction; it never grants ordinary access or proves an update requirement. A generic dependency 503 remains a different problem. No Retry-After/end-time promise is invented. Future ordinary HTTP operations adopt this shared admission response in their owning contracts.

[F07](../011-notifications-delivery/plan.md#expo-handoff-and-association-lifecycle) evaluates maintenance at each sporting-push admission immediately before provider handoff, including operator recipients; skip without replay when active. Inbox creation/purge and collection continue. An already admitted handoff can finish; this is not a cross-system atomic stop or recall guarantee. Existing purchases, erasure and fully received assistance retain their outcomes.

## Mobile state and native behavior

At cold start, initiate the public complete check independently of Auth0 restoration. Use the native Auth0 provider and Credentials Manager, not Expo's mock storage example. Load the existing account when credentials are usable; `GET /accounts/me` returns its current permission projection, without a provider lookup or automatic account creation. Failure to identify a privileged account never grants operator entry. A transient identity failure neither erases credentials nor transforms the session into another account.

Use separate Expo Router protected groups and existing loading/gate presentations. Ordinary access requires a complete successful configuration, a satisfied platform minimum and either inactive maintenance or current authorized explicit bypass. Operational access requires a usable signed-in account, the relevant action permission and a satisfied platform minimum; it does not require personal maintenance bypass or grant ordinary access. Maintenance is visually first when both blocks apply, but the administration link cannot admit an outdated client. Public legal URLs remain independent of blocked in-app navigation.

Full configuration checks run only at cold start and explicit retry. The existing retry action also retries identification for an established session: obtain credentials through the native Auth0 SDK and, when usable, refetch the existing current-account query with TanStack Query. Keep this independent of the public check; an identity failure cannot block its result or grant operator access. Retry neither opens interactive sign-in nor establishes an account. A sign-in return refreshes the account without rerunning the full check. Successful partial administration saves update observed revisions but cannot open ordinary access; return through the existing full retry when needed. No retry loop or foreground/refocus/reconnect refetch is added.

Reuse F05's session generation and TanStack cancellation. Retain, for this process, the highest observed revision and known restriction for each settings group. Reject a complete response older than either observation; never assemble separate partial reads into a complete admission. A late maintenance refusal older than the already observed maintenance revision cannot replace that newer state. Failed checks cannot lift a known restriction. Only a successful complete response at least as current as both observations can establish admission.

Keep bypass intent in current-session memory and transmit the [dedicated header](contracts/README.md#bypass-and-errors). Current server authorization is mandatory even for public business reads using bypass. Clear intent on cold start, account boundary, observed grant loss or a successful complete check showing maintenance inactive. No episode registry or persistent bypass token is needed. Standard Auth0 silent renewal remains allowed; interactive sign-in is unavailable at gates.

Validate the published native version as three numeric components and compare them numerically. Build numbers and suffixes do not participate. Without a threshold, no comparison is needed; unreadable metadata with a threshold uses unavailable access. Use the native store-opening mechanism, with ordinary error and explicit retry, never inferred installation success. The operator verifies actual store availability before raising a threshold.

The optional maintenance image uses the existing image component and controlled HTTPS URL. No backend fetch or upload API; invalid URL input is rejected, display failure leaves text/actions available. Preserve the accepted placeholders, Lucide icon, tokens, reduced-motion behavior and accessibility.

## Production preparation

A fresh baseline creates inactive maintenance with a usable message, no image, and absent platform thresholds/links/update message. These are initial database values, never a fallback after a read failure. Later deployments preserve state and follow F13's baseline-freeze/migration policy.

Before public V2 publication, the owner signs in normally through a production test-channel binary, grants the new business account its required permissions manually, verifies administration, and activates maintenance if opening is deferred. Retain the pre-public exposure boundary; test-channel distribution does not itself secure the backend. F14 owns the wider transition and actual store availability. No seeded administrator, hidden sign-in or startup grant is added.

For a wrong setting that prevents mobile correction, use ordinary authorized SQL operations, preserving invariants and incrementing the affected version. Reread the committed state and verify with an admitted current binary. Do not add a recovery endpoint/console, reset data or weaken minimum-version checks.

## Consumer coherence and verification

F05 owns AccountResponse and now references F12 capabilities; no account schema copy. F02 retains its business resources and contracts, with global action grants and explicit shared lock order. F13 links first-preparation mechanics; F14 distinguishes preparation from public publication. F01/F07 consume maintenance policy in-process under their own plans, without a service/API split.

[Contracts](contracts/README.md) define source ownership, compatibility and consumers; [quickstart](quickstart.md) defines focused future qualifications. No SQL/runtime, native or integrated generation check has run. Documentation and schema checks validate only the published dossier. No complexity-tracking exception is needed and no constitution gate is waived.
