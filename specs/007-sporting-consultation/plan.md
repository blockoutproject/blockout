# Implementation Plan: Sporting consultation and navigation

**Branch**: `tech/49-sporting-consultation-plan` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [F02 sporting data](../002-sporting-data/plan.md) and [F09 entitlements](../006-pro-subscriptions/plan.md).

**Status**: Technical dossier for review. Preparatory decisions and both scoped design revisions are approved; native and integrated runtime qualification remains pending. No product implementation is authorized.

## Summary

Expose public club, team, pool and match reads from the existing modular backend, retaining F02 sporting truth. Serve calendars as seven complete nonempty display days, preserve their mobile state until explicit refresh and use the native map providers. Relay qualified match PDFs for direct temporary reading in the mobile application. Reconcile the narrow professional-document acquisition exception without introducing another sporting authority, scheduler or recovery process.

## Technical Context

**Language/Version**: Java 25/Spring Boot 4.1.1 and TypeScript/Expo SDK 58, React Native 0.88 and React 19.3.0, under the [F13 baseline](../003-shared-quality/plan.md#technical-context).

**Primary Dependencies**: Spring Data JPA/Hibernate, PostgreSQL time-zone operations, Expo Router, TanStack Query and the F13 generated HTTP boundary. `react-native-maps` 1.27.2; `react-native-pdf` 7.0.5 with its native dependency/configuration described in [research.md](research.md). Exact integrated package compatibility remains a native qualification gate, not permission for an implicit upgrade.

**Storage**: Existing F02 PostgreSQL facts and qualified document references; memory-only mobile query state and temporary PDF cache files. No separate consultation store or PDF archive.

**Testing**: Existing documentation verification; future JUnit/Spring MVC/Testcontainers PostgreSQL, generated Java/TypeScript consumer checks, Jest Expo/React Native Testing Library and native device scenarios.

**Target Platform**: Existing Linux backend/collector, native iOS (minimum 16.4) and Android under F13/F14.

**Project Type**: Public read capability within the modular backend and existing mobile application; targeted collector enrichment of document references.

**Performance Goals**: No benchmark, load/capacity or monthly availability programme. Preserve accepted domain boundaries and collection cadences.

**Constraints**: Public consultation is free; only the backend writes business data. No provider call inside a SQL transaction, persistent mobile business cache, automatic replay, generic batch endpoint, map-failure detector or PDF rendering engine.

**Scale/Scope**: Four resource pages, calendars, standings, participant maps, qualified links and three document kinds. F06 following, F08 contributions, F10 reporting and F12 permissions retain ownership; this plan does not design their remaining operations.

## Constitution Check

| Principle         | Assessment                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | Agreed document/map corrections are integrated into F01/F02/F03 rather than a revision journal.                                                                                                                                                                                                                                       |
| II — Ownership    | F01 acquires references, F02 accepts facts/associations, F03 presents them; dependent concepts retain their owners.                                                                                                                                                                                                                   |
| III — Design      | Existing design remains accepted outside the changed scope. Prototype `a53ec86` is approved, with native reader/provider interfaces deliberately excluded from design mockups. The owner also explicitly approved the corresponding Figma translation. Both scoped gates are satisfied; native/provider behavior remains unqualified. |
| IV — Contracts    | Extend the canonical mobile and ingestion roots, not a feature-local copy. Generated compilation and runtime validation remain future evidence.                                                                                                                                                                                       |
| V — Simplicity    | Ordinary queries, library cache configuration, native maps and PDF rendering; no replicated read model, scheduler, custom cursor store or recovery subsystem.                                                                                                                                                                         |
| Prerequisites     | The accepted [F02](../002-sporting-data/plan.md) and [F09](../006-pro-subscriptions/plan.md) plans supply sporting and entitlement boundaries. Scoped prototype and Figma approvals are recorded below.                                                                                                                               |

No constitutional exception is requested. The post-design assessment preserves the same ownership, contract and simplicity constraints; no unresolved design gate remains.

## Project Structure

### Documentation (this feature)

```text
specs/007-sporting-consultation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Source code (planned, not initialized)

```text
contracts/http/mobile/consultation/   # Canonical public resource contracts
contracts/http/ingestion/            # Existing collector/backend boundary
apps/backend/                       # Sporting read cases and HTTP adapters
apps/collector/                     # Existing adapters; document references
apps/mobile/                        # Thin routes, sporting queries/maps/PDF reader
```

**Structure Decision**: Follow the existing F13 applications and F02 domain boundaries. Add cohesive sporting use cases and mobile components in their owning modules, without a service per resource or a generic screen engine. Generated interfaces/DTOs/clients remain build outputs.

## Backend reads and ownership

The backend supplies the mobile API. F02 owns identities, classifications, source/manual effective values, result interpretation, visibility and stored references. F03 owns presentation projections and calendar categories. Return public summaries needed by cards and relationships in their read response; do not expose editing revisions, source contact fallbacks or user follow state in public data.

Use resource reads for club detail, club teams by season, team detail, pool detail, pool standings, pool participants, filtered matches and match detail. Document and logo subresources deliver their binary content. The [contract notes](contracts/README.md) identify canonical sources and consumers; no endpoint is added merely for an individual screen.

An ordinary request is public and must not wait for account/Pro state. The optional explicit maintenance bypass uses the existing F12 header and valid authorized account; invalid bypass credentials do not silently become public admission. Unknown/hidden resources return ordinary NotFound without revealing retained data. Known restrictions apply to reads, relationships, images and PDF delivery. Return `Cache-Control: no-store`; mobile memory retention is explicitly governed by F03/F05 rather than HTTP caching.

## Calendar selection and consistency

Each request selects exactly one club, team or pool; a club includes its selected season. Category and IANA grouping zone are explicit. Select seven complete nonempty display days, then their matches in one short read-only repeatable-read transaction. Use JPA/Hibernate projections with PostgreSQL time-zone functions where needed; no alternate SQL subsystem is selected.

A definitive result enters Completed immediately. Otherwise use kickoff plus six elapsed hours, or the next day at 00:00 Europe/Paris for a date alone. Missing dates are hidden. Known instants group in the requested zone; date-only values retain their sporting date. Upcoming days ascend, Completed days descend; stable pool ordering, known times in the traversal direction, unknown times last, and UUID tie-breaks keep equal values deterministic.

Return the next exclusive day boundary only when further eligible days exist. There is no total count, signed cursor, retained server snapshot or overall cap. Concurrent moves can leave a match outside the traversed portion until refresh; mobile deduplication uses match identity. Refresh reconstructs current groups rather than reconciling every change incrementally.

## Mobile state and navigation

Expo Router routes carry resource UUIDs. TanStack Query owns memory state keyed by resource, selected season/category, grouping zone and applicable account/bypass context. Common page information loads on opening; inactive tabs load lazily. Returning to retained pages preserves selection and progress without promising process-restart persistence or precise scroll restoration.

Apply F13's `networkMode: 'always'` and disabled retries; disable retained-calendar refetch on mount, focus, reconnect or invalidation. Use TanStack Query’s supported `infiniteQuery` first-page fetch (`pages: 1`, explicit stale fetch) for active-calendar refresh, cancel old pagination and replace/reset only after success. Failure preserves still-authorized content. Other tabs and common page information are not reread by this gesture. Match detail retains its own focus, foreground and explicit refresh reads. Confirmed follow changes deliberately reset affected personal calendars under [F06](../009-following-personal-feed/plan.md#mobile-state-and-failure-handling); they are not ordinary same-context refreshes. Time-zone changes may update formatted times while retained groups keep their loading zone until refresh.

F05 session cancellation/context rules prevent old-account results from entering a new context; known restrictions override retained content. Public content never depends on F09 entitlement availability. Reuse existing F06 follow/count, F08 link/contribution, F10 report and F02 editing entries, without adding their private state to public read projections. F08 adds `streamContributionId` alongside a contributed `streamUrl`, identifying the exact version for reports; professional links omit it. The public read never resolves a displayed version silently to a newer one. F11 alone counts eligible resource/stream openings; filtering, back, refresh and document reading add no advertising trigger.

## Maps and documents

Maps use Apple on iOS and Google on Android through the selected native library. Marker data comes from visible participations and reliable club municipality coordinates, independently of standings. A professional team without a club supplies no point. Group identical points for selection without displacement, GPS, dynamic clustering or a persistent geographic cache. Preserve zero/partial coverage and independent information; native provider behavior owns basemap loading without a custom detector.

Information sheets are independent of results. Scoresheets and professional statistics PDFs require the published definitive result and their own qualified reference. An official result is definitive unless contrary source evidence exists; no extra confirmation stage is introduced. The statistics PDF is read as a document, not parsed into a new product feature.

F01 reads the applicable LNV XML index once per eligible pass solely for document codes. Explicit verified team associations, season/championship context and unique exact participants/date qualify the link to the DataProject match. Preserve an established association through rescheduling; never substitute this code for match identity. Missing mappings or unsupported historical coverage mean no reference. Published DataProject PDF links are extracted by ordinary HTTP form navigation; no browser runtime, guessed blob URL or extra scheduler.

For a document read, the backend checks current eligibility and loads its reference in a short transaction, then fetches outside the transaction using bounded HTTP requests, approved source origins and redirects, PDF validation and safe errors. The client supplies only match identity and document kind. No supplier body, URL credential or personal detail enters logs. No archive, durable download job, URL-renewal workflow or automatic retry.

The mobile shared transport owns download cancellation and error handling; successful binary data goes to a temporary Expo cache file and then a local URI in the native PDF reader hosted full screen, never inside a sheet. Cleanup occurs at close/failure and cold start for leftovers. JSON validation remains at the F13 boundary; binary responses intentionally bypass JSON parsing. Reading adds no separate reader-app dependency, offline guarantee or export action.

## Reconciliation and validation

The narrow document exception changes F01/F02 wording and their affected plan/contract inputs while preserving sporting authority, observation ordering and partial-success semantics. New reference acquisition does not claim a fresh result or reset old-field freshness. Public projections suppress forbidden contact values; F11 manual handling of other personal-data requests does not become a generic durable suppression mechanism.

The owner approved [prototype `a53ec86`](https://github.com/blockoutproject/product-prototype/commit/a53ec86), limiting Figma to actual Blockout document actions and annotations rather than PDF contents or native provider interfaces. The corresponding [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5362-41722) and [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=5362-42954) views reuse the existing information pattern; native maps are documented in [the map pattern](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=1035-9522). The owner explicitly approved this limited Figma report on 2026-10-15 after prototype approval. Prototype/Figma show only the Blockout action and fictitious text marking the full-screen reader handoff. No PDF-body mockup, native-reader screen or native-provider rendering is claimed as design evidence. Existing approvals remain valid for unchanged journeys. Current prototype checks prove only fictional web behavior; native/source/contract integration remains subject to [quickstart.md](quickstart.md).

Run the README documentation and contract checks on the final tree and verify local links and owner/consumer consistency. These checks establish no product runtime or native qualification; publication follows [repository delivery policy](../../AGENTS.md#git-delivery).
