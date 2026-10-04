# Implementation Plan: F03 sporting consultation and calendars

**Planning branch**: `develop` (single-root planning exception) | **Date**: 2026-10-09 | **Spec**: [F03](spec.md)

## Summary

Expose free, correctly attributed club, seasonal-team, pool and match consultation through eleven focused public operations. PostgreSQL remains the sporting authority. Keep loaded calendar rows and groups stable until explicit refresh; refresh only the active tab and replace a calendar with its first page on success. Match details retain focus/foreground rereads. Open official PDFs through native platform facilities, with a narrowly scoped FFVB information-sheet relay where the supplier requires POST.

This dossier delivers documentation, not applications or deployed endpoints. Bounded dossier acceptance belongs to [#23](https://github.com/blockoutproject/blockout/issues/23); global technical acceptance remains #9/#32. It derives all six P1 journeys, 36 requirements, 34 scenarios and eight success criteria, including the owner's explicit lifecycle amendments in the specification.

## Technical Context

| Boundary   | Selected approach                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime    | Architecture-selected Java 25 / Spring Boot 4.1, PostgreSQL 18, Liquibase 5 XML; Python 3.14 ingestion; Expo 57 / React Native 0.86 / React 19.2 / TypeScript. Exact compatible patches and installed commands belong to F13. |
| Backend    | Existing `sport` application views and JPA/HQL projections. Root coordination composes module APIs. No new service, sports database, universal query framework or repository access across modules.                           |
| Mobile     | Expo Router, TanStack Query, FlatList/SectionList, StyleSheet and expo-image. Feature-owned query/selection state; no persisted query cache or fine scroll-restoration engine.                                                |
| Maps       | react-native-maps, Apple Maps on iOS and Google Maps on Android; no phone-location permission.                                                                                                                                |
| Documents  | Bounded binary transport, expo-file-system temporary cache, small local Expo iOS Quick Look bridge and Android ACTION_VIEW through expo-intent-launcher. No custom PDF renderer or server archive.                            |
| Contracts  | OpenAPI 3.0.3, F13 Java/TypeScript generation; F01/F02 internal additions also qualify the Python consumer.                                                                                                                   |
| Tests      | JUnit/Spring/PostgreSQL Testcontainers, pytest provider/transport fixtures, Jest Expo/RNTL, real iOS/Android and exact approved Figma comparisons.                                                                            |
| Scope      | Eleven F03 operations, seven nonempty whole days per calendar page, unlimited progression; no match quota per day.                                                                                                            |
| Exclusions | No polling, durable calendar snapshots, push stream, automatic list repair, load/capacity qualification, monthly availability accounting or video monitoring.                                                                 |

## Constitution Check

The following constraints apply before research and after model/contract design; no exception is requested.

| Principle                   | Application                                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification           | [Clarifications](spec.md#clarifications) replace the old coordinated foreground/timezone regrouping promise. [Coverage](quickstart.md#coverage) accounts for every FR/A/SC.                                                        |
| II — Domain integrity       | F02 owns sport, F01 qualified supplier references, F06 follow state, F08 contributions, F12 admission. No private follow state in public sporting responses.                                                                       |
| III — Design readiness      | [Mobile/design contract](contracts/mobile-and-design.md#design-authority) binds exact existing Sport states, records lifecycle reconciliation and distinguishes native work from Figma evidence. No visual redesign is authorized. |
| IV — Source-first contracts | [OpenAPI](contracts/consultation.openapi.yaml) and F02/F01 owning fragments precede generation; generated output remains ignored. Binary PDF handling is explicit.                                                                 |
| V — Traceable simplicity    | [Research](research.md) records alternatives, cost and proof. [Tasks](tasks.md) name concrete boundaries and dependency owners. Ordinary failures retain usable data and allow manual retry.                                       |

Pre-design feasibility established the owner choices and supplier POST requirement. Post-design review must preserve the same constraints across the generated dossier; documentary validation does not claim native delivery. Any newly discovered material design mismatch returns to the design owner before implementation.

## Project Structure

Dossier: `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`, `contracts/` and reviewer-owned checklists. Intended runtime destinations, created only after implementation authorization:

```text
apps/backend/src/main/java/com/blockout/sport/{api/consultation,application/consultation,infrastructure/persistence,infrastructure/documents}/
apps/backend/src/main/java/com/blockout/coordination/
apps/backend/src/test/java/com/blockout/sport/consultation/
apps/backend/src/main/resources/db/changelog/sport/
apps/ingestion/src/blockout_ingestion/{providers,backend}/
apps/ingestion/tests/{providers,integration}/
apps/mobile/src/features/sport/{api,model,ui,platform,__tests__}/
apps/mobile/src/app/{clubs,teams,pools,matches}/
apps/mobile/modules/document-preview/           # occupied iOS Quick Look module
contracts/public/sport/consultation.openapi.yaml
contracts/tooling/tests/consultation/
```

Extend occupied F02/F13 boundaries, never scaffold parallel infrastructure. Quick Look is a platform adapter, not a new product reader. React Native lifecycle and component implementation follow the owning skills when runtime work begins.

## Phase 0 — Research

[Research](research.md) settles endpoint granularity, whole-day progression, live-read consistency, stable calendar lifecycle, timezone exceptions, season ordering, provider references, map ownership and document transport. Seven successful sequential public FFVB reads establish the sampled PDF mechanisms; no external/archived repository was consulted. Provider coverage and actual native opening remain qualification obligations.

## Phase 1 — Model and contracts

[Model](data-model.md) defines read projections, cursor context, stable keys, chronological season data and document lifecycles. [HTTP](contracts/consultation.openapi.yaml) defines eleven operations. [Read semantics](contracts/read-semantics.md) supplies exact ordering, conditional payload rules and read/error behavior. [Mobile/design](contracts/mobile-and-design.md) defines state, cache and approved journeys. [Consumers](contracts/consumers.md) defines cross-owner interfaces and generation adoption.

Only new reads use the current sporting state/evaluation instant. Retained calendars are not remotely consistent snapshots: a result/date change can move an item across an already traversed boundary; manual refresh reconstructs it. Known restrictions still remove affected cache content immediately. Device timezone changes may temporarily leave a newly formatted hour beneath an old loading-day group, by explicit owner decision.

## Phase 2 — Validation and tasks

[Quickstart](quickstart.md) separates executable documentary checks from future runtime scenarios. [Tasks](tasks.md) preserve six independently verifiable journeys after actual F13/F02/F01 prerequisites. US1 establishes public navigation; US2/US3 deliver time and calendars; US4 rankings/maps and US5 documents can then progress separately; US6 qualifies failure, restrictions and integrated journeys. F06/F08/F10 integrations remain incomplete until their owners exist; doubles prove only an interface.

## Complexity Tracking

No constitutional exception. The information-sheet relay is justified by observed POST-only PDF access; the local iOS bridge only exposes the system preview for a downloaded temporary file. Both avoid a new document platform. Stateless cursors and ordinary query state replace snapshot persistence, page repair and precise scroll restoration.
