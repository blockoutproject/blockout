# Implementation Plan: F12 administration and access configuration

**Planning branch**: `develop` (single-root planning exception) | **Date**: 2026-10-09 | **Spec**: [F12](spec.md)

## Summary

Give each account only its current Blockout permissions, let authorized operators edit maintenance and minimum versions independently, and enforce ordinary access without adding mobile polling. Auth0 proves identity; PostgreSQL owns permissions and configuration. The backend admits HTTP requests through maintenance once, then each domain still validates the current account, permission, resource and mutation invariants. The mobile checks complete access configuration at cold start and explicit Retry only.

This dossier derives the five accepted journeys. It delivers documentation, including seven public API operations, not runtime scaffolding, provider changes or deployment. The prior dossier acceptance remains in [#22](https://github.com/blockoutproject/blockout/issues/22); [#37](https://github.com/blockoutproject/blockout/issues/37) owns this approved startup amendment and its delivery; global technical acceptance remains #9/#32. FR-032, FR-033 and A34 stay withdrawn.

## Technical Context

| Boundary   | Selection and constraint                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime    | Architecture-selected Java 25 / Spring Boot 4.1, PostgreSQL 18 and Liquibase 5 XML; Expo 57 / React Native 0.86 / React 19.2 / TypeScript. Compatible patches and installed commands belong to F13 initialization. |
| Backend    | One Maven application; `accounts` owns grants and account resolution, `configuration` owns settings. Root `security` composition consumes both module APIs. No new deployable or module cycle.                     |
| Mobile     | Thin Expo Router routes, feature-owned forms/access state, TanStack Query for server data. Access configuration and observed revisions remain in memory; no access-storage adapter or persisted Query cache.       |
| Contracts  | OpenAPI 3.0.3 under `/api/v1`, Java server and generated TypeScript consumers with F13 response validation. No F12 Python HTTP consumer.                                                                           |
| Tests      | JUnit, Spring, real PostgreSQL Testcontainers; Jest Expo/RNTL, then actual iOS/Android and visual qualification.                                                                                                   |
| Scope      | Two configuration resources, 21 known capability booleans, five journeys, seven operations; no customizable roles or club/team delegation.                                                                         |
| Timing     | Complete verification at every cold start and explicit retry after failure; no session expiry or periodic access refresh. F13 request deadlines and one eligible read retry remain authoritative.                  |
| Exclusions | No performance/load/capacity qualification, monthly availability accounting, emergency console, automated store monitoring, audit system or push recovery queue.                                                   |

## Constitution Check

The same gates apply before research and after design; no exception is requested.

| Principle                       | Design constraint and review gate                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification               | The [coverage map](quickstart.md#coverage) traces all 34 active FRs, 34 retained scenarios and seven SCs; no withdrawn requirement returns through recovery work.                                                                                                                        |
| II — Domain integrity           | `accounts` owns grants; `configuration` owns both resources; root security composes them. Domain services retain action/resource checks; DTOs stay at API boundaries.                                                                                                                    |
| III — Design readiness          | Reuse only the approved journeys linked in [mobile/design contract](contracts/mobile-and-design.md#design-authority), routed by [design authorities and approvals](../../docs/design.md). Native evidence remains an implementation requirement. Material changes require design review. |
| IV — Source-first contracts     | [OpenAPI](contracts/configuration.openapi.yaml) precedes generation. Adopt F13's single shared Problem at implementation; generated outputs remain ignored. Validate actual Java/TypeScript consumers, not a fictitious Python consumer.                                                 |
| V — Simplicity and traceability | [Research](research.md) records need, alternatives, consequences and proof for each material decision. [Tasks](tasks.md) have paths and owner dependencies. No recovery framework is introduced.                                                                                         |

Pre-design review selects these boundaries from accepted specifications and architecture. The complete affected prototype and corresponding Figma revalidation were explicitly approved on 2026-10-09 under #37. Post-design review retains the same ownership and coverage; the removed storage/time fallback introduces no unresolved product choice. Runtime qualification cannot be substituted by documentary checks.

## Project Structure

The dossier contains `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`, `contracts/` and requirements-quality checklists. The following are intended implementation destinations, not existing projects:

```text
apps/backend/src/main/java/com/blockout/accounts/{api,application,domain,infrastructure}/
apps/backend/src/main/java/com/blockout/configuration/{api,application,domain,infrastructure}/
apps/backend/src/main/java/com/blockout/security/
apps/backend/src/main/resources/db/changelog/{accounts,configuration}/
apps/backend/src/test/java/com/blockout/{accounts,configuration,security}/
apps/mobile/src/features/configuration/{api,model,ui,__tests__}/
apps/mobile/src/app/                          # thin approved routes
contracts/public/configuration/
contracts/tooling/tests/
docs/operations/manage-account-permissions.md
```

Create only concrete consumed components after the global implementation gate. Existing F05 accounts/session components are extended rather than recreated.

## Phase 0 — Research and decisions

[Research](research.md) resolves SQL grant authority, minimal permission assignment, optimistic writes, complete cold-start verification without persistence, request admission, native version comparison, store confirmation and push suppression. Official documentation informs framework behavior; accepted Blockout specifications choose product policy. Exact production store identifiers remain F14 qualification inputs, not unresolved permission or access design.

## Phase 1 — Model and contracts

[Data model](data-model.md) defines grants, singleton rows, safe revisions, field validation and state transitions. [HTTP source](contracts/configuration.openapi.yaml) defines seven operations and additive response shapes. [Authorization and operations](contracts/authorization.md) defines the permission catalogue and owner-only SQL procedure. [Mobile/design](contracts/mobile-and-design.md) owns state precedence, response races, form outcomes and approved Figma mapping. [Consumers](contracts/consumers.md) owns dependencies and in-process interfaces.

Maintenance administration remains available with its own permission while maintenance blocks ordinary access. Minimum versions still block all mobile administration. Public configuration failure exposes only targeted permitted administration, after a reliable administrative read; no such read or save proves complete public configuration availability. Retry must establish ordinary access again.

## Phase 2 — Validation and implementation decomposition

[Quickstart](quickstart.md) defines documentary checks and future runtime/native scenarios separately. [Tasks](tasks.md) follows the five user journeys after F13/F05 foundations. The first useful increment is grants and current capabilities, then safe configuration edits, access enforcement, notification integration and minimum-version qualification. This order does not declare the partial increment a deployable release.

F07's real push owner must exist before integration can be completed; a controlled consumer proves only the F12 interface. F14 owns real store identities, old-client compatibility and transition qualification. No deployment or production privilege grant is authorized by this dossier.

## Complexity Tracking

No constitutional violation or additional platform is needed. Standard SQL constraints/transactions, one optimistic revision per resource, a small memory state machine satisfy the scope. Manual intervention covers uncertain saves, privilege assignment and missing configuration; no automatic repair or history ledger is selected.
