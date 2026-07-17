# MRG-338 Matches Core And Day-Page Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `MATCH-01` through `MATCH-06`
- Owner: `matches-service`
- Deferred callers: mobile-gateway and competition scraper
- Production effect: none

## Purpose

MRG-338 introduces generated canonical match-core and match-day boundaries while preserving the deployed match
behavior used by the competition scraper and mobile gateway. Canonical `/api/v2/**` operations implement the generated
`MatchesApi` and `MatchDaysApi`, consume and return generated camelCase transport models, map immediately to role-owned
application records, and use progressive Problem Details. Existing `/api/v1/**` operations remain isolated snake_case
adapters and invoke the same application service.

The source contract and committed bundles were approved before this runtime slice and are unchanged. MRG-338 adds the
service-local OpenAPI generation execution, strict MapStruct mapping, owner projections, compatibility telemetry, and
focused parity evidence. It does not change Blockout's Orval configuration or Python generator decision.

## Boundary Ownership

| Concern                    | Owner and target                                                       |
| -------------------------- | ---------------------------------------------------------------------- |
| Create and update intent   | `CreateMatchCommand` and `UpdateMatchCommand`                          |
| Collection filters         | defensive `MatchQuery` and `MatchDayQuery`                             |
| Owner read model           | immutable `MatchSnapshot` and `MatchPage`                              |
| Enriched detail            | `MatchDetailView`, assembled manually with the newest active live link |
| Meaningful day projection  | `MatchDayPage`, `MatchDayView`, and `MatchDayPoolView`                 |
| Lifecycle command          | set-owned `DeactivateMatchesCommand`                                   |
| Core application behavior  | transactional `MatchApplicationService`                                |
| Persistence mapping        | strict `MatchPersistenceMapper` around the retained JPA `Match` entity |
| Event application port     | `MatchLifecycleEvents` with immutable `MatchFinishedEventInput`        |
| Canonical REST             | generated APIs and models behind the two v2 transport controllers      |
| Generated transport mapper | strict `MatchApiMapper`                                                |
| Legacy REST                | adapter-local records and `LegacyMatchesJson`                          |

Generated request and response objects remain confined to the canonical API controller and mapper. Application
records contain no Spring Web, Jackson, JPA, Lombok, or generated-contract annotations. Neither transport exposes the
JPA entity. The five superseded match-core transport DTO classes were removed; live and moderation DTOs remain until
MRG-361 and MRG-362 migrate their separate boundaries.

## Preserved Match Semantics

| Behavior               | Preserved rule                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| create status          | non-null `set` produces `FINISHED`; null produces `UPCOMING`                                              |
| create lifecycle       | v2 owns identity, active state, and audit timestamps; v1 retains an explicit inactive compatibility value |
| update replacement     | every scraper-owned field is replaced, including nullable score, set, venue, referees, and live code      |
| update activation      | every successful update forces `active=true`                                                              |
| finish transition      | only an existing `UPCOMING` match receiving a non-null set becomes `FINISHED`                             |
| no reverse transition  | clearing the set on a finished match does not restore `UPCOMING`                                          |
| event timing           | the existing unversioned finish event is still published before repository save in the transaction        |
| bulk deactivation      | duplicate match codes collapse to a set; empty or unmatched selections are successful no-ops              |
| detail live enrichment | only the newest active link contributes URL, provider, and owner                                          |
| legacy owner response  | v1 retains active and audit fields required by the current scraper model                                  |

The event-before-save order remains intentionally unchanged even though it can produce a ghost Rabbit event if a
later database operation fails. MRG-370 owns the generated event contract and MRG-372 owns the matches outbox. This
runtime slice does not create a route, queue, listener, envelope, outbox row, or deduplication store.

## Date, Pagination, Ordering, And Null Parity

Day discovery and range assembly retain the audited behavior:

- day identity uses the `Europe/Paris` calendar while match instants remain UTC wire values;
- `UPCOMING` dates include today and move forward; every other status path uses finished dates up to now and moves
  backward;
- date discovery intentionally does not apply the `active` filter;
- callers with neither pool nor team filters still receive no discovered days;
- inactive-only or otherwise filtered dates may still produce an empty `dayMatches` result;
- the existing empty-range oddity remains: `hasNext` is false even when `nextPage` contains the next cursor;
- pool groups sort by `poolId`; match rows retain date direction and now use `id` only as the deterministic tie-breaker
  required by stable pagination;
- missing optional filter lists become empty lists, while nullable filter values remain nullable;
- v1 keeps `page`/`size`, snake_case filter names, the grouped response shape, and unpaged owner-list behavior;
- v2 uses `page`/`pageSize`, the approved bounds, `PageInfo`, exact total items, and camelCase keys.

The PostgreSQL date-cast/session-timezone risk and the scraper's special midnight parsing remain documented defects,
not silently corrected behavior. Their correction requires explicit later scope and parity evidence.

## Coexistence And Deferred Callers

| Concern        | v1 compatibility                            | canonical v2                                |
| -------------- | ------------------------------------------- | ------------------------------------------- |
| owner list     | unpaged JSON array                          | stable `MatchInternalPageResponse`          |
| day pagination | query `size` and grouped compatibility page | query `pageSize` and generated grouped page |
| JSON keys      | adapter-local snake_case                    | generated camelCase                         |
| create/update  | current scraper-shaped body and response    | generated intent request and owner response |
| bulk success   | empty `200`                                 | empty `204`                                 |
| validation     | existing legacy binding/error behavior      | generated constraints and Problem Details   |
| authorization  | existing create/update/delete scopes        | identical method-security decisions         |

No in-scope backend Java client consumes `MATCH-01` through `MATCH-06`. The only Java caller is the mobile gateway's
handwritten `MatchClientService`, whose generated-client and workflow migration remains MRG-368. The competition
scraper remains on its handwritten asynchronous v1 calls until MRG-349 installs and uses the approved fully generated
Python client. Expo remains behind the BFF and is not changed here.

Before either v2 consumer is released, the standalone v1 image remains the rollback target. After a v2 consumer is
active, rollback requires the retained dual-route matches image plus the last known-good caller image. No production
image, deployment, route, broker, standalone repository, or authority changes in MRG-338.

## Temporary Coexistence Scaffolding

The following names are migration scaffolding, not permanent target architecture:

- `controllers/v1`, `LegacyMatchesJson`, and the adapter-local legacy records remain only while supported consumers
  still use v1 and the approved traffic/evidence gates are open;
- `api/v2` packages and controller suffixes such as `MatchesV2Controller` distinguish the canonical transport only
  during coexistence;
- after authorized v1 retirement, the surviving canonical controller becomes unqualified and the version-only package
  and class-name ceremony is removed;
- generated API interfaces, generated transport models at the boundary, role-owned application records, strict
  mappers, application ports, and persistence separation remain;
- Flyway files named `V2__...` are immutable database history and are unrelated to REST coexistence.

The active goal stops before Phase MRG-900, so it neither performs nor authorizes the production retirement. The
approved removal gates remain those in MRG-304.

## Verification Evidence

- Generated-boundary tests prove the two controllers implement only `MatchesApi` and `MatchDaysApi`.
- Mapper tests prove generated requests become role-owned commands immediately.
- Canonical models stay camelCase under the temporary global snake_case workspace mapper.
- Generated validation proves positive identifiers while retaining valid empty bulk-deactivation lists.
- Application tests prove create status and legacy inactive compatibility, exact page metadata, one-way finishing,
  reactivation, event-before-save order,
  duplicate/no-op deactivation, Paris-local grouping, pool ordering, newest-active-link selection, and the empty-range
  cursor oddity.
- Legacy JSON tests prove snake_case reads and writes remain adapter-local.
- Focused matches tests, contract generation tests, OpenAPI source lint, full backend packaging, documentation
  validation, Maaatch comparison, Prettier, and whitespace checks pass.
- No contract source, committed generated artifact, database, event route, queue, listener, BFF, Expo, scraper,
  standalone repository, production resource, Maaatch file, Orval setting, or Python generator setting changes in this
  task.

## Closed Scope

- MRG-361 and MRG-362 own live links, history, moderation, and reports.
- MRG-346 and MRG-368 own Expo and mobile-gateway match workflows.
- MRG-349 owns the official generated Python caller migration.
- MRG-370 and MRG-372 own generated match events and the transactional outbox.
- MRG-407, MRG-423, and MRG-424 own the deeper matches-service restructuring and policy corrections.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement is outside this active goal.
