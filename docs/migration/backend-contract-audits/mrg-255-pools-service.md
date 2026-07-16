# MRG-255 — pools-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `bc57b8c7ccffb17ab0333736b9b8fa115de44e98`
- Scope roots: `apps/backend/pools-service`, pool-facing slices of `mobile-gateway`, `users-service`,
  `competition-service`, `notification-service`, `search-worker`, `search-service`, the competition scraper, and Expo
  mobile
- Audited deployable or workflow: pools-service and its proven Blockout producers and consumers
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no production traffic, database, broker messages,
  Elasticsearch documents, Auth0 grants, deployed schemas, or cache metrics was observed

## Scope

This audit covers every pool REST operation, entity/DTO/enum/event field, query filter, persistence rule, follower delta,
RabbitMQ route, scraper call, search projection, BFF aggregation, notification lookup, and Expo consumer. Competition
association/ranking algorithms, match ownership, user persistence, notification delivery, and search internals remain
assigned to MRG-256 through MRG-266; this file records the pool-boundary evidence required by those audits.

Evidence statuses and classifications follow `backend-contract-data-audit-template.md`. Current behavior is evidence,
not target authority. Canonical target Blockout wire names are camelCase; Python identifiers may remain snake_case
behind explicit adapters. Architecture remains provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary            | Owner / entry                   | Producers                                              | Consumers / effects                               | Auth                                                           | Evidence                 | Status   |
| ------------------- | ------------------------------- | ------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------ | -------- |
| pool REST           | pools-service, seven operations | competition scraper, BFF, users, worker, notifications | PostgreSQL, Rabbit                                | authenticated globally; create/update/delete/follow add scopes | controller/security      | `PROVEN` |
| pool persistence    | pools-service JPA/Flyway        | REST and deactivation listener                         | direct entity responses and events                | internal                                                       | entity/repository/V1–V3  | `PROVEN` |
| upsert events       | pools-service                   | create/update                                          | search-worker                                     | broker credentials                                             | publisher/worker         | `PROVEN` |
| deactivation events | competition-service             | scraper bulk cleanup and association cascades          | pools-service and search-worker                   | M2M/broker                                                     | service/listeners        | `PROVEN` |
| follow counter      | users-service HTTP              | favorite create/delete                                 | pool `followersCount`                             | `follow:pools` M2M permission                                  | user/pool clients        | `PROVEN` |
| follow notification | users-service Rabbit            | favorite create/delete                                 | notification projection; unconsumed pools queue   | broker credentials                                             | configs/listeners        | `PROVEN` |
| scraper transport   | competition scraper             | national/regional/departmental/pro discovery           | pool list/create/update and competition cleanup   | Auth0 M2M                                                      | Python API/model/service | `PROVEN` |
| BFF facade          | mobile-gateway                  | Expo and other BFF workflows                           | details, summaries, rankings, matches, moderation | public/secure BFF split                                        | controllers/services     | `PROVEN` |
| search projection   | worker → Elasticsearch → search | hourly REST rebuild and lifecycle events               | search-service, BFF, Expo                         | M2M/broker                                                     | worker/search chain      | `PROVEN` |

## 2. REST Operation Inventory

Controller methods have descriptive Springdoc annotations but no explicit source-contract `operationId`.

| Method and path                      | Controller           | Auth               | Request                                           | Success                | Proven callers                  | Status   |
| ------------------------------------ | -------------------- | ------------------ | ------------------------------------------------- | ---------------------- | ------------------------------- | -------- |
| GET `/api/v1/pools`                  | `listPools`          | authenticated only | `league_code`, `season`, `active`, repeated `ids` | 200 direct entity list | scraper, worker, BFF batch API  | `PROVEN` |
| GET `/api/v1/pools/{id}`             | `getPoolById`        | authenticated only | Long ID                                           | 200 entity; 404 map    | BFF, notification-service       | `PROVEN` |
| POST `/api/v1/pools`                 | `createPool`         | `create:pools`     | direct JSON entity                                | 201 entity + Location  | competition scraper             | `PROVEN` |
| PUT `/api/v1/pools/{id}`             | `updatePool`         | `update:pools`     | JSON `PoolUpdateDTO`                              | 200 entity; 404 map    | scraper, BFF/Expo               | `PROVEN` |
| DELETE `/api/v1/pools/{id}`          | `deactivatePool`     | `delete:pools`     | Long ID                                           | 204                    | no direct monorepo caller found | `PROVEN` |
| POST `/{poolId}/followers/increment` | `incrementFollowers` | `follow:pools`     | `user_id` query                                   | 200 entity             | users-service                   | `PROVEN` |
| POST `/{poolId}/followers/decrement` | `decrementFollowers` | `follow:pools`     | `user_id` query                                   | 200 entity             | users-service                   | `PROVEN` |

### Proven Semantics

- `listPools` has no pagination. Empty/null IDs disable ID filtering; results order by `season DESC, name ASC`.
  `league_code` and `season` use exact equality, and `active` is optional.
- Create binds the mutable JPA entity. Callers may supply `id`, `followersCount`, `active`, timestamps, and fields that
  the database treats as optional; there is no request mapper or application command boundary.
- Update is a null-skipping patch for eleven fields. It cannot change follower count or timestamps, but extra fields in
  the scraper's full entity-shaped JSON are silently ignored by normal Jackson defaults.
- Direct DELETE and the pool-deactivation listener set `active=false` but do not publish an upsert or deactivation
  event. Competition-service is the effective deactivation event owner.
- Increment/decrement use `userId` only for logs. There is no per-user idempotency, row lock, optimistic version,
  atomic SQL delta, maximum, event, or reconciliation. Decrement clamps at zero.
- The users-service client asks for `Void`, while both follower endpoints return the full entity. The payload is
  discarded transport cost and an accidental response contract.
- All entity responses currently use global snake_case. Missing pools have a stable 404 mapping; invalid enums, JSON,
  constraints, and broker failures generally collapse to generic 500 responses.
- `getActivePoolsByLeagueCode` and its repository method are dead internal code: no controller or monorepo caller uses
  them.

## 3. Events, Scheduled Work, and Cascades

| Entry                   | Producer                    | Consumer                             | Route / schedule                            | Payload / behavior                     | Failure / coupling                                      | Status   |
| ----------------------- | --------------------------- | ------------------------------------ | ------------------------------------------- | -------------------------------------- | ------------------------------------------------------- | -------- |
| pool upsert             | pools-service create/update | search-worker                        | `entity.lifecycle.exchange` / `pool.upsert` | nine-field search projection           | Rabbit error escapes DB transaction; no outbox          | `PROVEN` |
| pool deactivate         | competition-service         | pools-service and search-worker      | exchange / `pool.deactivation`              | `poolId`; soft-delete and index delete | conditional on association cascade                      | `PROVEN` |
| scraper bulk deactivate | competition scraper         | competition-service                  | `PUT /pools/bulk-deactivate`                | missing pool ID list                   | empty association result returns before event cascade   | `PROVEN` |
| pool follow HTTP        | users-service               | pools-service                        | two POSTs                                   | counter delta; user ID only logged     | distributed transaction gap                             | `PROVEN` |
| pool follow event       | users-service               | notification-service and pools queue | `user.follow.exchange` / `pool.follow`      | user/entity/event tuple                | pools queue has no listener                             | `PROVEN` |
| worker full rebuild     | search-worker               | pools REST and Elasticsearch         | every hour                                  | delete all, fetch active, batch index  | failure after delete can leave partial/empty index      | `PROVEN` |
| config cache refresh    | search-worker               | config REST                          | every 10 minutes                            | division enrichment cache              | pool docs refresh only on upsert or hourly full rebuild | `PROVEN` |

`CompetitionAssociationService.bulkDeactivatePools` returns immediately when it finds no active associations. It
therefore never calls `cascadeDeactivation` for a missing pool with zero active associations, so pools-service and the
search index can remain active indefinitely. When associations do exist, the service deactivates them and publishes a
pool event only after confirming no active association remains.

Exact Rabbit wire casing remains `UNKNOWN` until a safe message is captured: converters are constructed independently
from the HTTP `ObjectMapper`. No version, envelope, ordering key, idempotency key, or transactional outbox exists.

The pools-service declares durable `pool.follow.queue.pools` plus local `UserFollowEvent`, `EntityType`, and
`EventType`, but defines no follow listener. Notification-service has the proven consumer and DLQ; the pools queue can
accumulate unused messages.

## 4. Type, Duplicate, and Enum Inventory

| ID / concept        | Current copies or shape                                                                   | Current role                              | Divergence / risk                                                     | Status   |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | -------- |
| `POOL-E`            | pools-service mutable `Pool`                                                              | JPA entity, create request, REST response | persistence and transport share one mutable shape                     | `PROVEN` |
| `POOL-U`            | service DTO, BFF DTO, Python full dataclass, Expo partial payload                         | patch transport                           | null patch semantics and full-entity echo differ                      | `PROVEN` |
| pool base transport | entity; BFF, worker, notification DTOs; Python dataclass; Expo interface                  | downstream copies                         | dates differ (`LocalDateTime`, string); requiredness drifts           | `PROVEN` |
| pool views          | BFF enriched/summary/match/ranking shapes and Expo mirrors                                | user-visible projections                  | builders populate different subsets without explicit view contracts   | `PROVEN` |
| pool search         | worker doc, search DTO, BFF DTO, Expo type                                                | search projection                         | `divisionId` is indexed but dropped; `divisionMainColor` never exists | `PROVEN` |
| lifecycle events    | service/worker upsert and competition/pools/worker deactivation copies                    | Rabbit payloads                           | no generated or versioned schema                                      | `PROVEN` |
| format enum         | pools/BFF/worker/notification services, Expo enum, Python strings, DB constraint          | `SIX`, `FOUR`, `TWO`                      | nullable in DB/entity but assumed non-null by worker and Expo         | `PROVEN` |
| gender enum         | pools/BFF/worker/notification services, Expo enum, Python strings, DB constraint          | `M`, `F`, `O`                             | nullable in DB/entity but assumed non-null by worker and Expo         | `PROVEN` |
| follow vocabulary   | users, notifications, and dead pools-service copies of entity/event enums and event class | favorite/notification projection          | only users and notifications have proven runtime ownership            | `PROVEN` |

## 5. Field-Lineage Matrix

### Service Entity and Update Input

| Type     | Field          | Current wire      | Target wire      | Producer                     | Consumers / storage                         | Null/default/validation        | Class              | Status   |
| -------- | -------------- | ----------------- | ---------------- | ---------------------------- | ------------------------------------------- | ------------------------------ | ------------------ | -------- |
| `POOL-E` | id             | `id`              | `id`             | DB identity or create caller | all joins, routes, events                   | generated; caller may supply   | `REQUIRED`         | `PROVEN` |
| `POOL-E` | poolCode       | `pool_code`       | `poolCode`       | scraper/create/update        | unique key, FFVB requests                   | DB non-null                    | `REQUIRED`         | `PROVEN` |
| `POOL-E` | leagueCode     | `league_code`     | `leagueCode`     | scraper/create/update        | unique key, filter, regional display/search | DB non-null                    | `REQUIRED`         | `PROVEN` |
| `POOL-E` | season         | `season`          | `season`         | scraper/create/update        | unique key, filter, UI/search               | DB non-null                    | `REQUIRED`         | `PROVEN` |
| `POOL-E` | leagueName     | `league_name`     | `leagueName`     | scraper/create/update        | regional display/search                     | nullable DB/JPA                | `REQUIRED`         | `PROVEN` |
| `POOL-E` | rawName        | `raw_name`        | `rawName`        | scraper/create/update        | admin context and scraper change detection  | DB non-null; JPA not annotated | `REQUIRED`         | `PROVEN` |
| `POOL-E` | name           | `name`            | `name`           | scraper/admin                | primary UI/search/notifications             | nullable DB/JPA                | `REQUIRED`         | `PROVEN` |
| `POOL-E` | shortName      | `short_name`      | `shortName`      | scraper/admin                | cards/rankings/search                       | DB non-null; JPA not annotated | `REQUIRED`         | `PROVEN` |
| `POOL-E` | divisionId     | `division_id`     | `divisionId`     | mapping/scraper/update       | BFF and worker division enrichment          | DB non-null; no FK             | `REQUIRED`         | `PROVEN` |
| `POOL-E` | format         | `format`          | `format`         | mapping/scraper/update       | teams, matches, search, UI                  | nullable DB enum               | `REQUIRED`         | `PROVEN` |
| `POOL-E` | gender         | `gender`          | `gender`         | mapping/scraper/update       | teams, display, search                      | nullable DB enum               | `REQUIRED`         | `PROVEN` |
| `POOL-E` | followersCount | `followers_count` | `followersCount` | create caller/users deltas   | BFF/Expo display                            | DB/entity default 0            | `REQUIRED`         | `PROVEN` |
| `POOL-E` | active         | `active`          | `active`         | create/update/deactivation   | filters, scraper cleanup/reactivation       | DB/entity default true         | `REQUIRED`         | `PROVEN` |
| `POOL-E` | createdAt      | `created_at`      | `createdAt`      | JPA callback/create caller   | copied BFF/Python only                      | nullable timestamp             | `PERSISTENCE_ONLY` | `PROVEN` |
| `POOL-E` | lastUpdate     | `last_update`     | `lastUpdate`     | JPA callback/create caller   | copied BFF/worker/Python only               | nullable timestamp             | `PERSISTENCE_ONLY` | `PROVEN` |

`POOL-U` repeats all mutable fields except followers and timestamps. Seven `@JsonProperty` annotations are copied in
both the service and BFF DTO solely to reinforce global SNAKE_CASE. The entity create/response casing is entirely
global. Target update semantics must distinguish omitted fields from explicit values without field annotations.

### Events, Search, BFF, Python, and Expo

| Shape / fields                                  | Current wire                | Target wire       | Producer → consumer                    | Field role / loss                                              | Class                | Status    |
| ----------------------------------------------- | --------------------------- | ----------------- | -------------------------------------- | -------------------------------------------------------------- | -------------------- | --------- |
| upsert id/name/shortName                        | capture required            | camelCase         | pools-service → worker                 | search identity/display                                        | `EVENT_ONLY`         | `UNKNOWN` |
| upsert divisionId/leagueCode/leagueName/season  | capture required            | camelCase         | pools-service → worker                 | enrichment and search facets                                   | `EVENT_ONLY`         | `UNKNOWN` |
| upsert format/gender                            | capture required            | camelCase         | pools-service → worker                 | search facets; worker calls `.name()`                          | `EVENT_ONLY`         | `UNKNOWN` |
| absent upsert poolCode/rawName/followers/active | not emitted                 | decision required | entity → event                         | worker cannot reconstruct full entity                          | `EVENT_ONLY`         | `PROVEN`  |
| deactivation poolId                             | capture required            | `poolId`          | competition → pools/worker             | soft delete and search deletion                                | `EVENT_ONLY`         | `UNKNOWN` |
| follow userId/entityType/entityId/eventType     | capture required            | camelCase         | users → notifications/dead pools queue | notification follower projection                               | `EVENT_ONLY`         | `UNKNOWN` |
| worker pool REST copy                           | snake_case                  | generated client  | pools-service → worker                 | copies entity except `createdAt`; lastUpdate is string         | `COMPATIBILITY_ONLY` | `PROVEN`  |
| worker document division fields                 | internal camelCase          | same              | config cache → Elasticsearch           | missing division becomes null ID, unknown name, null logo      | `DERIVED`            | `PROVEN`  |
| search-service/BFF search DTO                   | snake_case HTTP             | camelCase         | Elasticsearch → search → BFF           | both DTOs omit indexed `divisionId`; unknown fields ignored    | `COMPATIBILITY_ONLY` | `PROVEN`  |
| Expo search divisionId/divisionMainColor        | absent at runtime           | explicit contract | BFF → Expo                             | required handwritten fields have no transport producer         | `DERIVED`            | `PROVEN`  |
| BFF base pool                                   | snake_case                  | generated client  | pools-service → BFF                    | copies every entity field                                      | `COMPATIBILITY_ONLY` | `PROVEN`  |
| BFF enriched pool                               | snake_case                  | camelCase         | BFF joins → Expo/match/team views      | division and ranking derived; builder subsets differ           | `DERIVED`            | `PROVEN`  |
| BFF summary                                     | snake_case                  | camelCase         | pool + division → followed pools       | active pools only; missing records omitted                     | `DERIVED`            | `PROVEN`  |
| Python full dataclass                           | snake_case                  | adapter camelCase | scraper ↔ pools-service               | server fields echoed on update; identifier remains local snake | `COMPATIBILITY_ONLY` | `PROVEN`  |
| Expo base/enriched/summary interfaces           | camelCase after interceptor | same              | BFF → mobile                           | handwritten requiredness exceeds DB and projection guarantees  | `REQUIRED`           | `PROVEN`  |
| Expo update name/shortName                      | interceptor snake_case      | camelCase         | form → BFF → service                   | only user-editable fields                                      | `REQUIRED`           | `PROVEN`  |

## 6. Construction and Conversion Inventory

| ID      | Source → target             | Mechanism                           | Loss / mixed behavior                                      | Provisional owner                     | Status   |
| ------- | --------------------------- | ----------------------------------- | ---------------------------------------------------------- | ------------------------------------- | -------- |
| `P-C01` | JSON → `POOL-E` create      | direct Jackson entity binding       | caller controls persistence/server fields                  | generated create DTO + command mapper | `PROVEN` |
| `P-C02` | `POOL-E` → REST             | no mapper                           | persistence fields exposed                                 | response mapper                       | `PROVEN` |
| `P-C03` | JSON → `POOL-U`             | copied handwritten DTO              | null-skipping patch; annotations duplicate global policy   | generated update DTO                  | `PROVEN` |
| `P-C04` | `POOL-U` → entity           | eleven manual null checks           | identity/display/reactivation concerns mixed               | application command mapper            | `PROVEN` |
| `P-C05` | entity → upsert event       | manual builder                      | nine-field search-only projection                          | event mapper                          | `PROVEN` |
| `P-C06` | service → BFF/notification  | copied DTOs and global casing       | multiple date/requiredness variants                        | generated internal clients            | `PROVEN` |
| `P-C07` | BFF base → enriched/summary | manual builders and iterative calls | context-specific field omissions and fan-out               | BFF application view mappers          | `PROVEN` |
| `P-C08` | worker event → search doc   | manual mapper                       | division fallback loses original ID; nullable enum crash   | worker projection mapper              | `PROVEN` |
| `P-C09` | search doc → search/BFF DTO | two copied DTOs                     | indexed division ID discarded                              | generated search client/view          | `PROVEN` |
| `P-C10` | Python ↔ pools-service     | dataclass reflection/asdict         | full server-field echo and implicit reactivation semantics | explicit scraper transport adapter    | `PROVEN` |
| `P-C11` | BFF ↔ Expo                 | global deep case interceptors       | implicit whole-app conversion and handwritten DTOs         | Orval mobile-local client             | `PROVEN` |

## 7. Persistence, Followers, and Scraper Semantics

| Boundary       | Current invariant                            | Gap                                                                   | Status   |
| -------------- | -------------------------------------------- | --------------------------------------------------------------------- | -------- |
| unique pool    | poolCode + leagueCode + season               | V2 tries to drop copied name `uix_team`; existing `uix_pool` survives | `PROVEN` |
| required names | rawName/shortName DB non-null; name nullable | JPA annotations and Expo requirements do not match DB                 | `PROVEN` |
| division       | non-null numeric ID                          | no cross-service FK or existence validation                           | `PROVEN` |
| format/gender  | constrained when present                     | nullable persistence conflicts with worker/Expo non-null assumptions  | `PROVEN` |
| follower count | non-null Long, default 0, decrement floor 0  | no DB nonnegative check, version, atomic delta, or reconciliation     | `PROVEN` |
| timestamps     | local `LocalDateTime` callbacks              | caller may supply on create; no timezone                              | `PROVEN` |

V2 adds `raw_name` and `short_name`, backfills them from `name`, and makes both non-null. It attempts to drop
`uix_team`, not the actual pool constraint `uix_pool`; the original unique key consequently remains. This is currently
compatible behavior but a proven copy/paste migration smell that must be represented in schema parity tests.

The scraper identifies existing pools by `(pool_code, league_code, season)` but detects updates only for `raw_name`,
`division_id`, `league_name`, `format`, and `gender`. Isolated `name` or `short_name` changes are never propagated.
Identity-key changes normally appear as a different pool rather than an update.

`allow_reactivation=False` is intended to postpone reactivation until valid matches are found. However, the newly
constructed dataclass defaults `active=True`; if any tracked metadata field changes, the full update payload still
reactivates the pool. If no tracked field changes, the inactive object is returned and a later explicit update occurs
only after match detection. This makes reactivation depend on unrelated metadata drift.

Pool favorite state is owned by users-service, the displayed counter by pools-service, and the notification projection
by notification-service. A users transaction performs the remote delta and then publishes Rabbit. A later failure can
roll back the favorite while leaving the counter changed; retries/direct calls can double count.

## 8. BFF Call Graph and Projection Justification

| BFF workflow            | Downstream sequence                                              | Fan-out                    | Cache / omission                                                | User-visible output                 | Status   |
| ----------------------- | ---------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------- | ----------------------------------- | -------- |
| enriched pool by ID     | pool; division; associations; each team; each distinct club      | O(teams + clubs) + 3       | process-local 4h pool/team/club and 1d division caches          | profile, ranking, map, follow count | `PROVEN` |
| pools by IDs            | each unique pool; each unique division                           | O(pools + divisions)       | HashSet loses input order; missing/inactive omitted             | followed pool cards                 | `PROVEN` |
| enriched team profile   | rankings plus each pool during team aggregation                  | O(pools) pool calls        | pool view omits season/rawName in this builder                  | team's pool rankings                | `PROVEN` |
| match list/details      | each pool; divisions; associations/teams/clubs depending on view | O(pools + teams + clubs)   | inactive pool is not consistently checked; builder subsets vary | feeds, match details, moderation    | `PROVEN` |
| secure update           | one pool PUT                                                     | 1                          | refreshes only the local `poolById` entry                       | name/short-name edit                | `PROVEN` |
| notification resolution | notification-service directly fetches pool by ID                 | 1 per notification context | copied DTO; failure falls back to generic copy                  | push title/division logo            | `PROVEN` |

`PoolClientService.getPoolsByIds` already exposes the service batch filter but the public BFF summaries do not use it;
they loop over cached single-ID calls. Pool upserts, deactivations, follower deltas, and scraper changes do not
invalidate BFF caches, so current data can remain stale for four hours per replica. Direct pool-by-ID fetches do not
filter `active`, and several match/team aggregation builders omit different fields from the same `EnrichedPoolDTO`.

## 9. Search Projection Findings

- Hourly reindex deletes the entire pool index before fetching/mapping active pools; an intermediate failure can leave
  an empty or partial index until the next run or event.
- `PoolIndexService.map` calls `format.name()` and `gender.name()` although both columns and entity fields are nullable.
  One legacy/null pool can fail an event batch or the full rebuild.
- When a division is absent from the config cache, the mapper writes `divisionId=null` instead of retaining the pool's
  known `divisionId`, plus `Division inconnue` and no logo. Division filtering then cannot match that document.
- The worker indexes `divisionId`; search-service explicitly requests it from Elasticsearch. Search-service and BFF
  `PoolSearchDocDTO` both omit it, so Jackson discards it before Expo.
- Expo declares both `divisionId` and `divisionMainColor` required. The first is dropped by Java DTOs and the second has
  no producer anywhere in the audited search chain.

## 10. Validation, Errors, Compatibility, and Tests

| Area                             | Current evidence           | Missing parity evidence                                                 | Status    |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------- | --------- |
| required fields/unique key       | DB and Jackson only        | create/update/controller/repository matrix                              | `PROVEN`  |
| nullable enums                   | source/DDL conflict        | legacy null and worker mapping tests                                    | `PROVEN`  |
| follower concurrency/idempotency | source has none            | concurrent/retry/reconcile tests                                        | `PROVEN`  |
| event casing/timing              | source only                | captured message, batch, and transaction-failure tests                  | `UNKNOWN` |
| empty-association deactivation   | source proves early return | zero/some/multiple association cascade matrix                           | `PROVEN`  |
| scraper transport/reactivation   | no focused tests found     | camel adapter, full echo, change detection, deferred-reactivation cases | `PROVEN`  |
| BFF aggregation/cache            | no focused tests found     | fan-out, order, inactive/missing state, projection and invalidation     | `PROVEN`  |
| search projection                | no focused tests found     | null enum, missing division, DTO lineage, full-rebuild failure          | `PROVEN`  |
| Expo form/follow                 | no focused tests found     | optimistic rollback, invalidation, generated client parity              | `PROVEN`  |
| service test                     | one context smoke test     | proves no endpoint behavior                                             | `PROVEN`  |

## 11. Findings and Provisional Target Roles

| ID         | Finding / risk                                                                                     | Follow-up                                    | Status   |
| ---------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- |
| `POOL-F01` | create binds and returns the JPA entity, exposing server-owned fields                              | split DTO/application/entity at MRG-268      | `PROVEN` |
| `POOL-F02` | update and response copies rely on global snake casing plus repeated annotations/interceptors      | MRG-303/304 camelCase cutover                | `PROVEN` |
| `POOL-F03` | zero-association bulk cleanup never emits pool deactivation                                        | MRG-256 cascade correction plan              | `PROVEN` |
| `POOL-F04` | direct deactivation publishes no downstream event                                                  | approve lifecycle ownership at MRG-268       | `PROVEN` |
| `POOL-F05` | follower counter is a non-idempotent distributed projection with no reconciliation                 | source-of-truth and atomic/retry design      | `PROVEN` |
| `POOL-F06` | durable pools follow queue has no listener and local follow types are dead                         | queue/type disposition after topology audit  | `PROVEN` |
| `POOL-F07` | nullable format/gender can crash worker event batches and full reindex                             | schema decision and defensive mapper tests   | `PROVEN` |
| `POOL-F08` | search loses `divisionId`; Expo additionally invents `divisionMainColor`                           | MRG-262/263 projection contract              | `PROVEN` |
| `POOL-F09` | full reindex deletes before successful replacement                                                 | atomic alias/rebuild strategy                | `PROVEN` |
| `POOL-F10` | BFF performs repeated per-ID fan-out despite an existing batch method and loses requested ordering | MRG-265/266 aggregation plan                 | `PROVEN` |
| `POOL-F11` | four-hour BFF cache has no lifecycle/follower/scraper invalidation                                 | cache ownership/invalidation redesign        | `PROVEN` |
| `POOL-F12` | scraper misses isolated display-name changes                                                       | parity cases before generated adapter        | `PROVEN` |
| `POOL-F13` | deferred reactivation is bypassed whenever unrelated tracked metadata changes                      | explicit reactivation command                | `PROVEN` |
| `POOL-F14` | requiredness drifts across DB, JPA, events, worker, BFF, Python, and Expo                          | canonical schema and migration compatibility | `PROVEN` |
| `POOL-F15` | pool view builders populate inconsistent subsets of one oversized enriched DTO                     | explicit context-specific BFF view contracts | `PROVEN` |

| Current family         | Provisional target role                                                | Preconditions / decision owner              |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| entity create/response | generated create/response DTOs + application command/view + JPA entity | ownership/validation approved by MRG-268    |
| JSON update            | generated patch/update DTO + explicit reactivation command             | omitted/null/active semantics approved      |
| follower count         | explicit cross-service projection or derived count                     | source of truth/reconciliation approved     |
| lifecycle events       | versioned generated event payloads                                     | owner, casing, outbox/deactivation approved |
| BFF copies/views       | generated downstream client + focused BFF projections                  | MRG-263/265/266 evidence complete           |
| worker/search copies   | generated REST/event clients + resilient search projection             | MRG-262/263 complete                        |
| Expo                   | Orval client/DTOs with mobile-local TanStack queries                   | BFF contracts and parity cases available    |
| Python                 | snake_case local model plus explicit camelCase transport adapter       | coexistence/reactivation/rollback tests     |

## 12. Unknowns

| Unknown                                    | Required evidence                | Blocking                       |
| ------------------------------------------ | -------------------------------- | ------------------------------ |
| deployed direct/external callers           | deployment inventory/access logs | field removal and cutover      |
| Rabbit casing, headers, redelivery order   | safe capture/integration test    | event generation/camel cutover |
| live pools with null format/gender/name    | safe DB inventory                | validation/schema decision     |
| follower counter drift/concurrency         | DB comparison/metrics            | follower ownership change      |
| unused pools follow queue depth            | broker topology/metrics          | queue removal                  |
| zero-association missing-pool incidence    | safe DB/log analysis             | cascade remediation priority   |
| BFF replicas/cache staleness               | deployment topology/metrics      | cache migration                |
| search index partial rebuild history       | worker/index metrics             | rebuild strategy               |
| clients relying on inconsistent pool views | telemetry/version support matrix | projection split/removal       |

## 13. Completion and Handoff

- [x] All seven REST operations, filters, entity/update fields, persistence constraints, followers, events, listeners,
      and schedules are inventoried.
- [x] Service, scraper, competition, worker, search, BFF, notification, users, and Expo lineage is recorded.
- [x] Direct entity binding/exposure and missing generated DTO/client/mapper boundaries are explicit.
- [x] Current snake_case, target camelCase, repeated annotations, Expo transforms, and Python adapter needs are explicit.
- [x] Empty-association deactivation, reactivation drift, nullable-enum worker failure, and search field loss are parity
      blockers.
- [x] BFF aggregation fan-out and context-specific user-visible projections remain documented as current behavior.
- [x] Tests, unknowns, failure modes, and downstream task owners are explicit.
- [x] No runtime, contract, generated artifact, schema, migration, test, or deployment file changed.

MRG-256 must deepen competition association and cascade ownership. MRG-262/263 must resolve worker/search projection
and rebuild behavior. MRG-265/266 must approve BFF fan-out and view boundaries. MRG-267/268 must merge duplicate pool
types and approve DTO/application/entity, follower, validation, event, and mapper roles. MRG-301/303/304 must capture
all operations and stage camelCase across service, BFF, notifications, search, Expo, Python, and Rabbit. Production
deployment did not occur.
