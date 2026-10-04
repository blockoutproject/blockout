# Implementation plan: F01 source acquisition and operations

**Issue**: [#21](https://github.com/blockoutproject/blockout/issues/21) | **Date**: 2026-10-06 | **Publication branch**: `develop`, under the documentation-only initialization policy.

**Input**: [accepted specification and F01 amendments](spec.md), [architecture](../../docs/architecture.md), [F13](../003-shared-quality/plan.md), [F02](../002-sporting-data/plan.md).

**Status**: Documentary plan accepted by the owner on 2026-10-09, including the targeted prototype/Figma supplement, independent compatible team participations and unchanged F02 name comparison. No application, dependency, migration or provider configuration is delivered. Implementation requires separate authorization and the planned runtime qualification.

## Summary

Use one Python collector to discover supported official references, fetch bounded work and publish normalized observations to the Spring acquisition/sport modules. Spring owns season bindings, operational commands, monotonic cycles and sporting transactions. Reuse F02 rather than building a second ingestion engine. Youth qualification pools use ordinary pools and manual regional/departmental divisions; no progression graph. Clubs persist; teams and pools are seasonal.

## Technical context

| Boundary            | Selected approach                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime             | Python 3.14, uv, HTTPX, lxml, standard CSV, APScheduler 3; Java 25/Spring Boot 4.1, PostgreSQL 18; generations inherited from F13, stable compatible patches locked during its initialization |
| Collector structure | Typed immutable application values, pure parsers, explicit provider/generated-client mappings; startup-owned async clients and bounded workers                                                |
| Storage             | Spring/JPA acquisition tables and F02-owned sports state; no Python SQL, broker, distributed scheduler, raw-response archive or per-download restart ledger                                   |
| Mobile              | Existing Expo 57/React Native 0.86 architecture and F13 network/session policy; targeted administration and participation designs accepted on 2026-10-09                                      |
| Contracts           | OpenAPI 3.0.3, F13 public/internal roots and Problem schema; Java/Python/TypeScript consumers generated outside Git                                                                           |
| Verification        | pytest/Ruff/mypy; Spring MVC/JUnit, real PostgreSQL Testcontainers, F02 OpenSearch consumer integration where affected; Jest Expo/RNTL and affected native journeys                           |
| Timing              | Discovery 30 min; calendars/rankings 30 or 5 min; each LNV detail's own H−1/H+4 window; clubs 24 h; geocoding under FR-026–FR-029                                                             |
| Performance goals   | None. Worker/rate settings bound resource ownership and supplier traffic; they are not load targets or supplier quotas.                                                                       |

## Constitution check

| Principle                   | Pre-research / post-design outcome                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I — Specification authority | Approved changes first encoded in F01/F02 and affected F03/F06/F12/F14 specifications; V1 remains historical evidence.                                                                                                                                             |
| II — Domain integrity       | Acquisition owns observations and operations; sport owns teams, pools, results and visibility. No promotion, seasonal team matching or qualification engine.                                                                                                       |
| III — Design-ready UI       | **PASSED for planning**: owner acceptance on 2026-10-09 covers the [visual supplement](visual-supplement.md), maintained prototype and canonical Figma references, including populated second-pool standings. Native qualification remains an implementation task. |
| IV — Contracts              | Documentary source contracts and cross-language qualification tasks provided; actual generation/consumers **NOT EXECUTED**, blocking executable adoption.                                                                                                          |
| V — Simplicity              | [Research decisions](research.md) compare simpler alternatives and actual needs; no generic scraping, archive, workflow or recovery infrastructure.                                                                                                                |

The documentary plan and targeted design are accepted. Executable contracts, provider behavior and native rendering remain subject to the implementation tasks and qualification evidence; no runtime completion or constitution exception is claimed.

## Project structure

Documentation: `spec.md`, `research.md`, `provider-evidence.md`, `evidence/`, `data-model.md`, `contracts/`, `quickstart.md`, `visual-supplement.md`, `checklists/acquisition-quality.md`, `tasks.md`.

Future occupied source locations, created only by authorized implementation:

```text
apps/ingestion/src/blockout_ingestion/
  acquisition/       # cycles, cadence, application orchestration
  providers/ffvb/    # catalog, CSV, contextual ranking, club parsing
  providers/lnv/     # entry, championship, phase, match parsing
  providers/communes/ # effective-locality lookup
  backend/           # generated internal-client adapter and explicit mappings
apps/ingestion/tests/{providers,acquisition,integration}/
apps/backend/src/main/java/com/blockout/acquisition/{domain,application,infrastructure,api}/
apps/backend/src/main/resources/db/changelog/acquisition/
apps/mobile/src/features/acquisition/
contracts/{public,internal}/acquisition/
```

Nx/npm orchestrates Maven and uv under F13. No empty library or layer is created merely because it appears here. F02 owns `sport/`; F01 does not recreate sports persistence or their APIs.

## Discovery and seasonal lifecycle

National FFVB entry → published seasonal frames → selector option URLs. Regional/departmental entry → organizer menus → groupings/tours/pools. Explicit small parsers cover these shapes without browser execution. Directories are complementary, not guaranteed exhaustive. Ignore professional FFVB and French Cup options outside the accepted authority/scope.

LNV role entry → published iframe championship reference → published phase links. Store discovery candidates separately from accepted season bindings. Supported URLs can be supplied before launch. Python qualifies provider structure through explicit SOURCE_VALIDATION work; Spring checks the resulting current binding revision, allowed host/format, context and required human season confirmation. A human confirmation never overrides known contradiction or unsupported structure. There is no Spring duplicate HTML parser or inbound Python server.

A discovered ID is not a year: propose it, do not auto-assign next season or overwrite a binding. Classification is manual per season in the separate F02 mapping journey. Source activation depends on qualification and covered scope, never on mapping; it enables discovery even when every pool is unmapped. Collection screens contain no classification status or mapping shortcut. Before effective mapping, only pools and native packs are discovered; calendars and results are not acquired or staged. After mapping, ordinary pool-level eligibility under FR-008 enables their acquisition. Launch locks each affected source, while child discovery continues. Old active LNV seasons keep their own bound championship after current-entry rollover. Pause/close never unlock; exceptional repair remains technical.

## Acquisition and integration

One complete CSV per qualified FFVB source pool is the initial strategy. Use all available fields; fetch HTML only for needed complements. A proven multi-tour export may yield separate observations for contextual pools; `Jo` alone never establishes that split. An ordinary matchday leaves the same pool identity. Unproven coverage remains unqualified.

Fetch LNV grouped calendars/rankings on phase cadence and match details on each match's own cadence, including ordinary rereads of final matches. Keep per-field observation dates and discard incompatible retained detail after aggregate change. Use only LNV pages for professional facts. Club numbers are strings; shared numbers do not merge seasonal teams. `TeamID` and `equipe=` are not global club identifiers.

Apply F02 normalized calendar/ranking/club/locality contracts and match-level transactions. Independent successes survive; partial/invalid/unconfirmed integration cannot withdraw absent data. Backend cycle order fences stale observations. Read-back of operation/cycle state resolves lost acknowledgements when possible; unchanged replay has no new sporting effect. No automatic mutation retry or whole-pipeline replay is added.

## Scheduling, bounded execution and failures

One active collector per environment. Poll Spring controls every five seconds. Retrieve a fresh complete configuration before starting each cycle; no remembered fallback. The collector reads pages under one configuration revision, then requests a cycle with that revision; a revision conflict discards the selection and waits for a fresh opportunity. Capture the cycle's selected configuration in memory, with backend cycle revision/order retained. Later operator changes affect next acquisition and current F02 visibility guards remain effective.

Initial configurable provider policy: two active reads and at most eight pending descriptors per provider, at least one second between request starts per provider; FFVB clubs/competitions share that limit. HTTPX connect/pool timeout 10 s, read/write inactivity timeout 30 s and total read-attempt deadline 60 s. Retry only transport errors, 408, 429 and 5xx, at most twice, with 1 s then 2 s minimum delay and any longer valid Retry-After. No retry on parsing, other 4xx or contract invalidity. An announced delay exceeding the cycle's remaining opportunity is recorded for subsequent eligible work rather than generating queued catch-up. These safety defaults are adjustable after provider qualification, not performance promises.

Bound descriptor production with backpressure rather than creating unbounded async tasks. Cancellation closes clients and does not turn an interrupted run into success. Share downloads within the cycle. Enable gzip where observed; conditional requests require verified validators and a usable same-context representation, otherwise ordinary GET. No disk response archive is introduced.

Pause drains the selected cycle; skipped ticks are not queued. On restart the single replacement process registers a new process generation, marking any old running cycle interrupted and fencing late old-process writes; it does not reconstruct download progress. Deployment must stop the former process first under F13. An uncertain cycle is not silently declared failed or successful.

Geocoding uses F02 effective-locality revision and the approved commune API: no top-score/first-result guess. Changed need gets an attempt within one hour when enabled/provider available; technical failures retry before 24 h. Same-context empty/ambiguous success is suppressed until changed context or explicit family rerun; rerun does not recalculate valid points.

## Operations and history

[Contract semantics](contracts/README.md) define stale commands, source checks and cycle modes. Competition control state is keyed by season and provider; clubs and geocoding remain seasonless. Keep one current manual operation slot per provider/family, without a job queue or global pause toggle. A busy provider may refuse work for another season without changing its control state. Explicit validation can run for an unlocked preparing source while its own scope is paused; ordinary rerun cannot bypass that scope’s pause. Shared read limits apply to all work.

Reconstruct current plus three completed seasons with the same adapters/F02 before closing historical seasons. Wholly empty/unavailable/invalid initial historical input preserves retained history; complete nonempty input may reconcile individual facts before closure. First import remains silent under F07; F14 owns cutover/retention/erasure obligations.

Use F13 Alloy/Grafana/IRM/Discord. First failed competition cycle opens a scoped incident; repetitions group. Club/geocode failure rules keep their 24-hour threshold. Recovery needs positive evidence for the affected problem; pause, closure or another scope's success is not recovery. Store bounded diagnostic codes/counts, no raw pages, secrets or contact histories.

## Phases and completion

1. Phase 0 research: [decision record](research.md) and source evidence, with current and three previous seasons and explicit missing coverage.
2. Phase 1 design: models, documentary contracts, validation matrix and concrete visual supplement; review constitutional gates again.
3. Task generation: seven independently testable user-story phases after F13/F02 prerequisites, all future tasks unchecked.
4. Cross-artifact analysis and documentary checks; publish under repository policy. Preserve the recorded October 9 dossier and targeted design acceptance; require scoped revalidation only when a later material change affects that accepted scope.

[Quickstart](quickstart.md) defines success and blocking criteria. No generated consumer, native test, provider-wide qualification or migration is claimed executed here.

## Initial reconstruction and season preparation boundary

The preparation overview exposes known seasons and unbound candidates without mixing revision pages. Season commands affect competitions only. Sources lock at launch or first initial reconstruction; closing a prepared season is allowed but permanently ends its preparation without fabricating a launch. Closing is terminal and requires the exact displayed season label plus expectedRevision. Atomically prevent new cycle starts and cancel unstarted requests; only cycles already RUNNING at acceptance may finish their selected work once, under normal F02 ordering/visibility guards. Preserve data and source locks. No reopen, recollection or source validation is available after closure; reads remain available. Other season/provider and seasonless club controls are unchanged. A lost response requires a read, never an automatic repeat.

Prepare and qualify the three completed sporting seasons while their Blockout state is PREPARING. An authorized F14 technical initial-reconstruction request reserves the existing single provider operation slot, locks selected qualified bindings and uses the ordinary adapters and F02 integration. It neither enables periodic collection nor changes any other season/provider pause state. Refuse a busy provider instead of queuing work; retry an identified failure explicitly before closure. Read its obtained/rejected/unavailable report, then close the season definitively with exact typed confirmation. The current season uses normal launched collection, with F14 initial-import suppression. No closed-season operation, separate engine, global pause procedure or automatic reconstruction workflow remains.
