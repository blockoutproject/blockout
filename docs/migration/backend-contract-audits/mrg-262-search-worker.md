# MRG-262 — search-worker contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `7fe6cf4e475cdabfaf282ffa3964e2af6a0b42dc`
- Scope roots: `apps/backend/search-worker`; producer event slices in `apps/backend/clubs-service`,
  `apps/backend/teams-service`, `apps/backend/pools-service`, and `apps/backend/competition-service`; downstream list
  operations in those services and `apps/backend/config-service`; worker-owned Elasticsearch mappings consumed by
  `apps/backend/search-service`
- Audited deployable or workflow: club, team, and pool search-index bootstrap, refresh, event ingestion, cache
  enrichment, and Elasticsearch writes
- Runtime mutation: none
- Evidence limitations: committed source and configuration only; no deployed environment variables, Auth0 token claims,
  RabbitMQ messages or headers, queue policies, DLQ contents, Elasticsearch mappings/documents/bulk responses, source
  API payload captures, scheduler telemetry, restart traces, or production search availability was observed

## Scope

This audit covers all 54 production Java files, the context-load test, worker configuration, four outbound HTTP clients,
four copied downstream DTOs, seven event/cache shapes, six RabbitMQ listeners, four in-memory cache/bootstrap classes,
four scheduled jobs, three Elasticsearch document/repository/index-writer families, and three JSON index definitions.
Producer event classes and downstream controllers are read only to prove the worker boundary. Search query behavior and
mobile/BFF consumers remain owned by MRG-261 and MRG-263 through MRG-266.

`search-worker` exposes no application REST controller. Its web starter and `GlobalExceptionHandler` do not establish a
current public API. Current Spring-generated schemas, mutable Lombok classes, global Jackson `SNAKE_CASE`, copied DTOs,
and handwritten builders are implementation evidence, not target contract authority. Blockout-owned REST and event
fields target camelCase. Database names and Python identifiers remain outside that wire rule. TanStack Query and Orval
remain local to the sole Expo application; this worker must consume generated internal clients or adapter-owned event
models without creating a shared TanStack package.

Maaatch is used only as a structural reference: its notification event slice separates a Rabbit inbound adapter from an
application ingestion boundary. Blockout keeps RabbitMQ, Elasticsearch, Flyway, Expo, and its existing product behavior;
no Maaatch product, web, Next.js, or Logto decision is copied.

## 1. Runtime Boundary Summary

| Boundary                | Current owner / entry                                  | Producer                              | Consumer / effect                           | Auth / data owner                                      | Evidence                   | Status   |
| ----------------------- | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | -------------------------- | -------- |
| service bootstrap       | `CacheInitializerService.@PostConstruct`               | club/team/config REST APIs            | replaces three memory caches                | Auth0 M2M; source services own data                    | initializer and clients    | `PROVEN` |
| club refresh            | `ClubCacheJob`, fixed rate 10 min                      | clubs REST list                       | replaces club cache                         | Auth0 M2M; clubs-service owns clubs                    | job/client/cache           | `PROVEN` |
| team refresh            | `TeamCacheJob`, fixed rate 10 min                      | teams REST list                       | replaces team-by-club cache                 | Auth0 M2M; teams-service owns teams                    | job/client/cache           | `PROVEN` |
| division refresh        | `ConfigCacheJob`, fixed rate 10 min                    | config REST list                      | replaces division cache                     | Auth0 M2M; config-service owns divisions               | job/client/cache           | `PROVEN` |
| full reindex            | `IndexerJob`, fixed rate 1 h                           | club/team/pool REST lists plus caches | deletes and repopulates three indices       | Auth0 M2M + ES basic auth                              | job/index services         | `PROVEN` |
| event ingestion         | six Rabbit queues on `entity.lifecycle.exchange`       | four domain services                  | upsert/delete documents and mutate caches   | broker credentials; producers own source facts         | producer configs/listeners | `PROVEN` |
| Elasticsearch bootstrap | three `IndexInitializerService.@PostConstruct` methods | bundled JSON mappings                 | deletes/recreates `clubs`, `teams`, `pools` | ES basic auth; worker owns writes/mappings             | initializer/mappings       | `PROVEN` |
| search read store       | `clubs`, `teams`, `pools` indices                      | worker repositories                   | search-service queries                      | shared ES cluster; worker writes, search-service reads | MRG-261 + repositories     | `PROVEN` |

The worker is a projection builder, not the source of truth. It combines authoritative service snapshots and lifecycle
events into denormalized search documents. Club and division caches supply enrichment; the team cache also supports
club-change reindexing. No durable checkpoint, event inbox, version, source timestamp, or reconciliation cursor exists.

## 2. Outbound REST Operation Inventory

The worker defines no OpenAPI operation and no generated client. All operation IDs below are `MISSING` because the
handwritten clients call downstream controller routes directly.

| Client entry                          | Expected method and path                      | Request            | Response used by worker                    | Empty / failure                               | Proven callers                 | Status   |
| ------------------------------------- | --------------------------------------------- | ------------------ | ------------------------------------------ | --------------------------------------------- | ------------------------------ | -------- |
| `ClubClientService.listActiveClubs`   | GET configured club URL                       | `active=true`      | raw `ClubDTO[]`; four fields retained      | null body becomes `[]`; HTTP error propagates | bootstrap, club cache, indexer | `PROVEN` |
| `ClubClientService.getClubById`       | GET configured club URL + `/{id}`             | Java `Long` ID     | one `ClubDTO`                              | body may be null; error propagates            | none                           | `PROVEN` |
| `TeamClientService.listActiveTeams`   | GET configured team URL                       | `active=true`      | raw `TeamDTO[]`; nine fields retained      | null body becomes `[]`; error propagates      | bootstrap, team cache, indexer | `PROVEN` |
| `TeamClientService.listTeamsByClubId` | GET configured team URL                       | `club_id={clubId}` | raw `TeamDTO[]`                            | null body becomes `[]`; error propagates      | none                           | `PROVEN` |
| `PoolClientService.listActivePools`   | GET configured pool URL                       | `active=true`      | raw `PoolDTO[]`; nine fields retained      | null body becomes `[]`; error propagates      | indexer only                   | `PROVEN` |
| `ConfigClientService.listDivisions`   | GET configured config URL + `/divisions`      | none               | raw `DivisionDTO[]`; three fields retained | null body becomes `[]`; error propagates      | bootstrap, division cache      | `PROVEN` |
| `ConfigClientService.getDivisionById` | GET configured config URL + `/divisions/{id}` | path ID            | one `DivisionDTO`                          | body may be null; error propagates            | none                           | `PROVEN` |
| `ApiClientService.post`               | caller-supplied POST                          | JSON body          | caller-supplied type                       | error propagates/wrapped                      | none                           | `PROVEN` |

The service controllers prove the resource paths as `/api/v1/clubs`, `/api/v1/teams`, `/api/v1/pools`, and
`/api/v1/config/divisions`. The worker examples instead use bare hosts such as `http://localhost:8086`; those values
would call the host root for club/team/pool and `/divisions` for config. Actual deployed values are `UNKNOWN`. A generated
client must own paths, query names, deserialization, error types, and auth integration so environment variables contain
service origins rather than undocumented route fragments.

The RestTemplate interceptor adds a bearer token only when the cached value is nonblank. The token refresh catches and
suppresses its own failures, so bootstrap can continue with no token. Refresh is fixed at 48 hours by default rather
than derived from token expiry, and the handwritten RestTemplate declares no explicit connect/read timeout. These are
runtime policies to preserve or deliberately replace through MRG-268/MRG-304, not accidental generator defaults.

## 3. Event, Bootstrap, and Scheduled Entry Inventory

| Entry ID      | Kind        | Producer                                                          | Consumer                   | Exchange / routing key / schedule           | Payload                         | Retry or failure behavior                                                                  | Status   |
| ------------- | ----------- | ----------------------------------------------------------------- | -------------------------- | ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| `SW-E-CLUB-U` | batch event | clubs-service                                                     | `ClubUpsertListener`       | `entity.lifecycle.exchange` / `club.upsert` | `ClubUpsertEvent`               | manual ack after bulk write; any caught error nacks the whole batch without requeue to DLQ | `PROVEN` |
| `SW-E-TEAM-U` | batch event | teams-service                                                     | `TeamUpsertListener`       | same / `team.upsert`                        | `TeamUpsertEvent`               | same, batch size/prefetch 500                                                              | `PROVEN` |
| `SW-E-POOL-U` | batch event | pools-service                                                     | `PoolUpsertListener`       | same / `pool.upsert`                        | `PoolUpsertEvent`               | same, batch size/prefetch 500                                                              | `PROVEN` |
| `SW-E-CLUB-D` | event       | competition-service; duplicated type also exists in clubs-service | `ClubDeactivationListener` | same / `club.deactivation`                  | `ClubDeactivationEvent`         | default container ack/requeue behavior; exception propagates                               | `PROVEN` |
| `SW-E-TEAM-D` | event       | competition-service                                               | `TeamDeactivationListener` | same / `team.deactivation`                  | `TeamDeactivationEvent`         | default container ack/requeue behavior; exception propagates                               | `PROVEN` |
| `SW-E-POOL-D` | event       | competition-service                                               | `PoolDeactivationListener` | same / `pool.deactivation`                  | `PoolDeactivationEvent`         | default container ack/requeue behavior; exception propagates                               | `PROVEN` |
| `SW-B-CACHE`  | bootstrap   | three REST snapshots                                              | `CacheInitializerService`  | `@PostConstruct`                            | copied DTO arrays               | uncaught failure prevents this bean from initializing                                      | `PROVEN` |
| `SW-B-INDEX`  | bootstrap   | three JSON resources                                              | `IndexInitializerService`  | three `@PostConstruct` methods              | ES settings/mappings            | uncaught failure prevents startup; existing index is deleted first                         | `PROVEN` |
| `SW-J-CLUB`   | scheduler   | clubs REST snapshot                                               | `ClubCacheJob`             | fixed rate 600,000 ms                       | `ClubDTO[]` -> cache events     | catches/logs; prior cache survives fetch failure                                           | `PROVEN` |
| `SW-J-TEAM`   | scheduler   | teams REST snapshot                                               | `TeamCacheJob`             | fixed rate 600,000 ms                       | `TeamDTO[]` -> cache events     | catches/logs; prior cache survives fetch failure                                           | `PROVEN` |
| `SW-J-DIV`    | scheduler   | config REST snapshot                                              | `ConfigCacheJob`           | fixed rate 600,000 ms                       | `DivisionDTO[]` -> cache events | catches/logs; prior cache survives fetch failure                                           | `PROVEN` |
| `SW-J-ALL`    | scheduler   | three REST snapshots                                              | `IndexerJob`               | fixed rate 3,600,000 ms                     | copied DTOs -> events -> docs   | no local catch; sequential delete-before-fetch/write aborts at first exception             | `PROVEN` |

All six queues are durable and declare a worker-owned dead-letter exchange/routing key. Upsert listeners use one batch
container with manual acknowledgement, receive timeout 2 seconds, and `basicAck(lastTag, true)` or
`basicNack(lastTag, true, false)`. No retry/backoff/concurrency/idempotency configuration is explicit. Deactivation
listeners use the default factory, so exact retry/requeue behavior depends on unobserved Boot/broker configuration and is
`UNKNOWN`. The converters are independently constructed default `Jackson2JsonMessageConverter` instances; there is no
versioned envelope, event ID, occurrence time, aggregate version, correlation ID, or authoritative schema artifact.

Producer and consumer Java event fields match and default Jackson spelling is camelCase, but no captured serialized
fixture proves deployed payloads or headers. MRG-302 must capture the current messages before MRG-315 selects an event
contract format. Async contracts must not be modeled as fake OpenAPI endpoints.

## 4. Type Inventory

| Type ID       | Class / shape           | Role                         | Owner                       | Mutable   | Constructed by       | Consumed by / serialized     | Duplicate family         | Status   |
| ------------- | ----------------------- | ---------------------------- | --------------------------- | --------- | -------------------- | ---------------------------- | ------------------------ | -------- |
| `SW-H-CLUB`   | `ClubDTO`               | copied HTTP response         | worker                      | yes       | RestTemplate/Jackson | snapshot builders; REST read | club service entity copy | `PROVEN` |
| `SW-H-TEAM`   | `TeamDTO`               | copied HTTP response         | worker                      | yes       | RestTemplate/Jackson | snapshot builders; REST read | team service entity copy | `PROVEN` |
| `SW-H-POOL`   | `PoolDTO`               | copied HTTP response         | worker                      | yes       | RestTemplate/Jackson | indexer; REST read           | pool service entity copy | `PROVEN` |
| `SW-H-DIV`    | `DivisionDTO`           | copied HTTP response         | worker                      | yes       | RestTemplate/Jackson | cache builders; REST read    | config entity copy       | `PROVEN` |
| `SW-E-CLUB-U` | `ClubUpsertEvent`       | Rabbit payload + cache model | producer copies + worker    | yes       | producer/builder     | listener, club cache/index   | duplicated event         | `PROVEN` |
| `SW-E-TEAM-U` | `TeamUpsertEvent`       | Rabbit payload + cache model | producer copies + worker    | yes       | producer/builder     | listener, team cache/index   | duplicated event         | `PROVEN` |
| `SW-E-POOL-U` | `PoolUpsertEvent`       | Rabbit payload               | producer copy + worker      | yes       | producer/builder     | listener/pool index          | duplicated event         | `PROVEN` |
| `SW-E-CLUB-D` | `ClubDeactivationEvent` | Rabbit payload               | multiple copies             | yes       | competition-service  | delete listener              | duplicated event         | `PROVEN` |
| `SW-E-TEAM-D` | `TeamDeactivationEvent` | Rabbit payload               | multiple copies             | yes       | competition-service  | delete listener              | duplicated event         | `PROVEN` |
| `SW-E-POOL-D` | `PoolDeactivationEvent` | Rabbit payload               | multiple copies             | yes       | competition-service  | delete listener              | duplicated event         | `PROVEN` |
| `SW-C-DIV`    | `DivisionUpsertEvent`   | internal cache projection    | worker                      | yes       | snapshot builder     | team/pool mapping            | misleading event name    | `PROVEN` |
| `SW-ES-CLUB`  | `ClubDoc` + mapping     | ES write projection          | worker                      | yes       | `ClubIndexService`   | ES/search-service            | search club result       | `PROVEN` |
| `SW-ES-TEAM`  | `TeamDoc` + mapping     | ES write projection          | worker                      | yes       | `TeamIndexService`   | ES/search-service            | search team result       | `PROVEN` |
| `SW-ES-POOL`  | `PoolDoc` + mapping     | ES write projection          | worker                      | yes       | `PoolIndexService`   | ES/search-service            | search pool result       | `PROVEN` |
| `SW-ENUM-F`   | `Format`                | copied enum                  | service/event/worker copies | immutable | Jackson/producers    | events/docs                  | `SIX/FOUR/TWO`           | `PROVEN` |
| `SW-ENUM-G`   | `Gender`                | copied enum                  | service/event/worker copies | immutable | Jackson/producers    | events/docs                  | `M/F/O`                  | `PROVEN` |

There is no JPA entity, application command/view, generated API model, event envelope, durable cache entity, explicit
mapper component, or worker domain model. Lombok event classes cross Rabbit, cache, mapping, and scheduling roles.

## 5. Field-Lineage Matrix

### 5.1 Copied downstream HTTP DTOs

| Type        | Field                 | Current wire            | Target wire           | Producer -> worker use                                | Validation / null behavior                          | Conversion                    | Classification | Status   |
| ----------- | --------------------- | ----------------------- | --------------------- | ----------------------------------------------------- | --------------------------------------------------- | ----------------------------- | -------------- | -------- |
| `SW-H-CLUB` | `id`                  | `id`                    | `id`                  | clubs entity -> cache/event/doc ID                    | none; null breaks concurrent-map put or ES identity | direct builder copy           | `REQUIRED`     | `PROVEN` |
| `SW-H-CLUB` | `rawName`             | `raw_name`              | `rawName`             | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `name`                | `name`                  | `name`                | cache/event -> searchable name                        | none; nullable                                      | direct builder copy           | `REQUIRED`     | `PROVEN` |
| `SW-H-CLUB` | `city`                | `city`                  | `city`                | cache/event -> club/team search enrichment            | none; nullable                                      | direct builder copy           | `REQUIRED`     | `PROVEN` |
| `SW-H-CLUB` | `postalCode`          | `postal_code`           | `postalCode`          | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `email`               | `email`                 | `email`               | deserialized, never read                              | none                                                | none                          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `phoneNumber`         | `phone_number`          | `phoneNumber`         | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `website`             | `website`               | `website`             | deserialized, never read                              | none                                                | none                          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `logoUrl`             | `logo_url`              | `logoUrl`             | cache/event -> club/team logo                         | none; nullable                                      | `@JsonProperty`, builder copy | `REQUIRED`     | `PROVEN` |
| `SW-H-CLUB` | `lastUpdate`          | `last_update`           | `lastUpdate`          | deserialized, never read                              | typed `String`; no format validation                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-CLUB` | `active`              | `active`                | `active`              | response value ignored; request filters active        | none                                                | query is separate             | `REMOVABLE`    | `PROVEN` |
| `SW-H-TEAM` | `id`                  | `id`                    | `id`                  | teams entity -> event/doc ID                          | none; null invalid ES identity                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `clubId`              | `club_id`               | `clubId`              | cache key and club enrichment                         | none; null breaks concurrent map                    | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `rawName`             | `raw_name`              | `rawName`             | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-TEAM` | `name`                | `name`                  | `name`                | searchable name                                       | none; nullable                                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `shortName`           | `short_name`            | `shortName`           | searchable short name                                 | none; nullable                                      | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `season`              | `season`                | `season`              | exact search filter                                   | none; nullable                                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `lastUpdate`          | `last_update`           | `lastUpdate`          | deserialized, never read                              | typed `String`; no format validation                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-TEAM` | `leagueCode`          | `league_code`           | `leagueCode`          | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-TEAM` | `divisionId`          | `division_id`           | `divisionId`          | division lookup and stored filter                     | missing lookup stores null ID                       | `@JsonProperty`, enrichment   | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `format`              | `format`                | `format`              | enum -> stored keyword                                | null causes `format.name()` failure                 | copied local enum             | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `gender`              | `gender`                | `gender`              | enum -> stored keyword                                | null causes `gender.name()` failure                 | copied local enum             | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `followersCount`      | `followers_count`       | `followersCount`      | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-TEAM` | `logoUrl`             | `logo_url`              | `logoUrl`             | preferred team logo, club fallback                    | blank selects club logo                             | `@JsonProperty`, mapping rule | `REQUIRED`     | `PROVEN` |
| `SW-H-TEAM` | `active`              | `active`                | `active`              | response value ignored; request filters active        | none                                                | query is separate             | `REMOVABLE`    | `PROVEN` |
| `SW-H-POOL` | `id`                  | `id`                    | `id`                  | pool entity -> event/doc ID                           | none; null invalid ES identity                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `poolCode`            | `pool_code`             | `poolCode`            | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-POOL` | `leagueCode`          | `league_code`           | `leagueCode`          | stored exact keyword                                  | none; nullable                                      | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `season`              | `season`                | `season`              | stored exact keyword                                  | none; nullable                                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `leagueName`          | `league_name`           | `leagueName`          | searchable league name                                | none; nullable                                      | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `rawName`             | `raw_name`              | `rawName`             | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-POOL` | `name`                | `name`                  | `name`                | searchable name                                       | none; nullable                                      | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `shortName`           | `short_name`            | `shortName`           | searchable short name                                 | none; nullable                                      | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `divisionId`          | `division_id`           | `divisionId`          | division lookup                                       | missing lookup stores null ID                       | `@JsonProperty`, enrichment   | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `format`              | `format`                | `format`              | enum -> stored keyword                                | null causes `format.name()` failure                 | copied local enum             | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `gender`              | `gender`                | `gender`              | enum -> stored keyword                                | null causes `gender.name()` failure                 | copied local enum             | `REQUIRED`     | `PROVEN` |
| `SW-H-POOL` | `followersCount`      | `followers_count`       | `followersCount`      | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-POOL` | `active`              | `active`                | `active`              | response value ignored; request filters active        | none                                                | query is separate             | `REMOVABLE`    | `PROVEN` |
| `SW-H-POOL` | `lastUpdate`          | `last_update`           | `lastUpdate`          | deserialized, never read                              | typed `String`; no format validation                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `id`                  | `id`                    | `id`                  | division entity -> cache key/doc enrichment           | none; null breaks concurrent map                    | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-DIV`  | `name`                | `name`                  | `name`                | stored team/pool division name                        | missing division becomes `Division inconnue`        | direct copy                   | `REQUIRED`     | `PROVEN` |
| `SW-H-DIV`  | `mainColor`           | `main_color`            | `mainColor`           | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `firstGradientColor`  | `first_gradient_color`  | `firstGradientColor`  | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `secondGradientColor` | `second_gradient_color` | `secondGradientColor` | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `thirdGradientColor`  | `third_gradient_color`  | `thirdGradientColor`  | deserialized, never read                              | none                                                | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `logoUrl`             | `logo_url`              | `logoUrl`             | stored as pool logo                                   | nullable                                            | `@JsonProperty`, direct copy  | `REQUIRED`     | `PROVEN` |
| `SW-H-DIV`  | `active`              | `active`                | `active`              | deserialized and ignored; list includes inactive rows | none                                                | none                          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `createdAt`           | `created_at`            | `createdAt`           | deserialized, never read                              | `LocalDateTime` parser only                         | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |
| `SW-H-DIV`  | `lastUpdate`          | `last_update`           | `lastUpdate`          | deserialized, never read                              | `LocalDateTime` parser only                         | `@JsonProperty` only          | `REMOVABLE`    | `PROVEN` |

`REMOVABLE` means removable from the future worker client projection after consumer parity, not from the owning service
contract. The four copied classes currently accept far more data than the worker needs and encode legacy snake_case with
28 `@JsonProperty` annotations. MRG-303 must assign these calls to generated internal clients; MRG-352 may remove the
annotations only after the per-service camelCase cutover.

### 5.2 Event and internal cache fields

| Type          | Field(s)             | Current / target wire  | Producer -> consumer / derivation                     | Validation / default                    | Classification | Status   |
| ------------- | -------------------- | ---------------------- | ----------------------------------------------------- | --------------------------------------- | -------------- | -------- |
| `SW-E-CLUB-U` | `id`                 | `id`                   | club ID -> ES/cache key                               | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-CLUB-U` | `name`               | `name`                 | club name -> club/team docs                           | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-CLUB-U` | `logoUrl`            | `logoUrl`              | club logo -> club doc/team fallback                   | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-CLUB-U` | `city`               | `city`                 | city -> club doc/team enrichment                      | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `id`                 | `id`                   | team ID -> doc ID                                     | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `name`               | `name`                 | team name -> doc                                      | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `shortName`          | `shortName`            | short name -> doc                                     | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `clubId`             | `clubId`               | cache key and club lookup -> doc                      | null breaks cache update                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `divisionId`         | `divisionId`           | division lookup -> derived ID/name                    | missing lookup stores null/unknown      | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `format`             | `format`               | enum -> keyword                                       | null fails batch mapping                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `gender`             | `gender`               | enum -> keyword                                       | null fails batch mapping                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `season`             | `season`               | season -> keyword                                     | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-U` | `logoUrl`            | `logoUrl`              | team logo or club-logo fallback                       | blank triggers fallback                 | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `id`                 | `id`                   | pool ID -> doc ID                                     | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `name`               | `name`                 | pool name -> doc                                      | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `shortName`          | `shortName`            | short name -> doc                                     | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `divisionId`         | `divisionId`           | division lookup -> ID/name/logo                       | missing lookup stores null/unknown/null | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `leagueCode`         | `leagueCode`           | league code -> keyword                                | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `leagueName`         | `leagueName`           | league name -> searchable text                        | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `season`             | `season`               | season -> keyword                                     | nullable                                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `format`             | `format`               | enum -> keyword                                       | null fails batch mapping                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-U` | `gender`             | `gender`               | enum -> keyword                                       | null fails batch mapping                | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-CLUB-D` | `clubId`             | `clubId`               | competition deactivation -> club delete/cache removal | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-TEAM-D` | `teamId`             | `teamId`               | competition deactivation -> team delete               | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-E-POOL-D` | `poolId`             | `poolId`               | competition deactivation -> pool delete               | no validation                           | `EVENT_ONLY`   | `PROVEN` |
| `SW-C-DIV`    | `id`                 | not serialized         | division snapshot -> cache key/doc field              | no validation                           | `DERIVED`      | `PROVEN` |
| `SW-C-DIV`    | `name`               | not serialized         | division snapshot -> team/pool doc                    | nullable                                | `DERIVED`      | `PROVEN` |
| `SW-C-DIV`    | `logoUrl`            | not serialized         | division snapshot -> pool logo                        | nullable                                | `DERIVED`      | `PROVEN` |
| `SW-ENUM-F`   | `SIX`, `FOUR`, `TWO` | same uppercase strings | REST/event enum -> ES keyword/search filter           | unknown value fails deserialization     | `REQUIRED`     | `PROVEN` |
| `SW-ENUM-G`   | `M`, `F`, `O`        | same uppercase strings | REST/event enum -> ES keyword/search filter           | unknown value fails deserialization     | `REQUIRED`     | `PROVEN` |

The upsert payload classes are exact handwritten copies in each producer and the worker. Deactivation types are copied
across competition-service, owning services, other consumers, and the worker. `DivisionUpsertEvent` is not an event; it
is an internal snapshot projection. Target event envelope/version/compatibility ownership remains a decision for
MRG-315 and MRG-350.

### 5.3 Elasticsearch document fields

Every current store field is already camelCase. These are persistence projections, not REST or event DTOs.

| Type         | Field          | Store mapping / derivation               | Search consumer       | Null / write behavior               | Classification     | Status   |
| ------------ | -------------- | ---------------------------------------- | --------------------- | ----------------------------------- | ------------------ | -------- |
| `SW-ES-CLUB` | `id`           | keyword; source club ID                  | result ID             | repository identity required        | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-CLUB` | `logoUrl`      | keyword; club event                      | result image          | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-CLUB` | `name`         | search-as-you-type; club event           | boosted query/result  | nullable source                     | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-CLUB` | `city`         | search-as-you-type; club event           | query/result          | nullable source                     | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-CLUB` | `all`          | text populated through mapping `copy_to` | aggregate query field | Java field left null                | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `id`           | long; team event                         | result ID             | repository identity required        | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `name`         | search-as-you-type; team event           | boosted query/result  | nullable source                     | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `shortName`    | search-as-you-type; team event           | boosted query/result  | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `clubId`       | keyword; team event                      | result/navigation     | retained even if club cache misses  | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `clubName`     | search-as-you-type; club cache           | query/result          | null on cache miss                  | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `clubCity`     | search-as-you-type; club cache           | query/result          | null on cache miss                  | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `logoUrl`      | keyword; team then club fallback         | result image          | nullable                            | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `divisionId`   | long; resolved division cache ID         | exact filter/result   | null on cache miss despite event ID | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `divisionName` | search-as-you-type; division cache       | query/result          | `Division inconnue` fallback        | `DERIVED`          | `PROVEN` |
| `SW-ES-TEAM` | `format`       | keyword; `Format.name()`                 | exact filter/result   | null event fails mapping            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `gender`       | keyword; `Gender.name()`                 | exact filter/result   | null event fails mapping            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `season`       | keyword; team event                      | exact filter/result   | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-TEAM` | `all`          | text populated by `copy_to`              | aggregate query       | Java field left null                | `DERIVED`          | `PROVEN` |
| `SW-ES-POOL` | `id`           | long; pool event                         | result ID             | repository identity required        | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `name`         | search-as-you-type; pool event           | boosted query/result  | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `shortName`    | search-as-you-type; pool event           | boosted query/result  | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `divisionId`   | long; resolved division cache ID         | exact filter/result   | null on cache miss despite event ID | `DERIVED`          | `PROVEN` |
| `SW-ES-POOL` | `divisionName` | search-as-you-type; division cache       | query/result          | `Division inconnue` fallback        | `DERIVED`          | `PROVEN` |
| `SW-ES-POOL` | `leagueCode`   | keyword; pool event                      | result                | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `leagueName`   | search-as-you-type; pool event           | query/result          | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `season`       | keyword; pool event                      | exact filter/result   | nullable                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `logoUrl`      | keyword; division cache                  | result image          | null on cache miss                  | `DERIVED`          | `PROVEN` |
| `SW-ES-POOL` | `format`       | keyword; `Format.name()`                 | exact filter/result   | null event fails mapping            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `gender`       | keyword; `Gender.name()`                 | exact filter/result   | null event fails mapping            | `PERSISTENCE_ONLY` | `PROVEN` |
| `SW-ES-POOL` | `all`          | text populated by `copy_to`              | aggregate query       | Java field left null                | `DERIVED`          | `PROVEN` |

Each mapping additionally declares `name_suggest` as a completion field, but no Java document, writer, or search query
populates or consumes it. It is `REMOVABLE` pending a production mapping/query check. The shared analyzer lowercases,
ASCII-folds, and applies French elision; changing it can alter user-visible ordering and requires MRG-261 parity tests.

## 6. Construction, Mapping, and Conversion Inventory

| Conversion ID | Source                      | Target                | Mechanism / location                                  | Field loss, defaults, or mixed logic                      | Provisional owner                          | Status   |
| ------------- | --------------------------- | --------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ | -------- |
| `SW-C01`      | REST JSON                   | four copied DTOs      | RestTemplate/Jackson + 28 `@JsonProperty` annotations | accepts 49 fields; only 25 retained across families       | generated service client adapter           | `PROVEN` |
| `SW-C02`      | `ClubDTO`                   | `ClubUpsertEvent`     | duplicate builders in bootstrap/job/indexer           | retains id/name/logo/city                                 | worker snapshot mapper                     | `PROVEN` |
| `SW-C03`      | `TeamDTO`                   | `TeamUpsertEvent`     | duplicate builders in bootstrap/job/indexer           | retains nine fields                                       | worker snapshot mapper                     | `PROVEN` |
| `SW-C04`      | `PoolDTO`                   | `PoolUpsertEvent`     | builder in indexer                                    | retains nine fields                                       | worker snapshot mapper                     | `PROVEN` |
| `SW-C05`      | `DivisionDTO`               | `DivisionUpsertEvent` | duplicate builders in bootstrap/job                   | retains id/name/logo; type is misnamed                    | worker snapshot mapper                     | `PROVEN` |
| `SW-C06`      | producer entity             | upsert event          | handwritten builder in each producer                  | event-specific projection                                 | event outbound adapter                     | `PROVEN` |
| `SW-C07`      | club event                  | `ClubDoc`             | private `ClubIndexService.map`                        | direct projection                                         | ES adapter mapper                          | `PROVEN` |
| `SW-C08`      | team event + caches         | `TeamDoc`             | private `TeamIndexService.map`                        | club/division enrichment, logo fallback, enum conversion  | projection application service + ES mapper | `PROVEN` |
| `SW-C09`      | pool event + division cache | `PoolDoc`             | private `PoolIndexService.map`                        | division enrichment and enum conversion                   | projection application service + ES mapper | `PROVEN` |
| `SW-C10`      | Java event                  | Rabbit JSON           | independent default Jackson converters                | no envelope/schema/version; camelCase names               | generated/approved event adapter           | `PROVEN` |
| `SW-C11`      | document properties         | `all` index field     | Elasticsearch `copy_to`                               | storage-only derived text                                 | ES mapping                                 | `PROVEN` |
| `SW-C12`      | global service JSON         | snake_case            | Spring Jackson naming strategy                        | does not configure independently created Rabbit converter | temporary compatibility boundary           | `PROVEN` |

No explicit mapper component exists. Mapping logic is repeated across lifecycle methods and mixed with indexing/cache
side effects. MRG-268 must approve role boundaries before choosing MapStruct or manual mapping. Generated transport DTOs
must remain at adapters and must not become cache models or Elasticsearch documents.

## 7. Duplicate-Type Analysis

| Family                | Members                                                               | Differences / reason                                                      | Proven consumers                 | Provisional disposition                                 | Status   |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------- | -------- |
| club service snapshot | clubs entity, worker `ClubDTO`, club event, club cache, `ClubDoc`     | worker copy has seven unused fields; event/cache/doc progressively narrow | bootstrap, listener, search      | generated HTTP type -> worker snapshot -> ES projection | `PROVEN` |
| team service snapshot | team entity, worker `TeamDTO`, team event/cache, `TeamDoc`            | five copied fields unused; doc adds club/division enrichment              | bootstrap, events, search        | keep distinct roles with explicit maps                  | `PROVEN` |
| pool service snapshot | pool entity, worker `PoolDTO`, pool event, `PoolDoc`                  | five copied fields unused; doc adds division data                         | indexer, events, search          | keep distinct roles with explicit maps                  | `PROVEN` |
| division snapshot     | division entity, worker `DivisionDTO`, internal `DivisionUpsertEvent` | seven copied fields unused; internal class is not an event                | cache enrichment                 | generated HTTP type -> renamed cache projection         | `PROVEN` |
| upsert events         | producer and worker class copies                                      | field sets currently match; no shared source or version                   | Rabbit producers/listeners       | generate/map from approved event source                 | `PROVEN` |
| deactivation events   | competition, owning-service, and consumer copies                      | same one-field shapes, mixed `Serializable` use                           | multiple Rabbit consumers        | generate/map from approved event source                 | `PROVEN` |
| enums                 | service-local and worker `Format`/`Gender`                            | codes match; independently maintained                                     | REST, Rabbit, ES, search filters | shared contract schema only if MRG-268 approves         | `PROVEN` |

Similar shapes do not justify sharing mutable Java classes. HTTP, event, cache, and persistence roles have different
owners and evolution rules. Shared source definitions or enums may generate multiple boundary-local types.

## 8. Cache and Elasticsearch Write Ownership

| Projection / state | Store                                          | Identifier / grouping | Writers                                                 | Readers         | Consistency behavior                                                 | Status   |
| ------------------ | ---------------------------------------------- | --------------------- | ------------------------------------------------------- | --------------- | -------------------------------------------------------------------- | -------- |
| club cache         | `ConcurrentHashMap<String, ClubUpsertEvent>`   | club ID               | bootstrap/job/events/delete                             | team/club index | `clear` then per-item put; readers can see partial replacement       | `PROVEN` |
| team cache         | concurrent map of mutable `ArrayList`s         | club ID, not team ID  | bootstrap/job/team upserts/club deletes                 | club/team index | list mutation is not thread-safe; repeated upserts append duplicates | `PROVEN` |
| division cache     | `ConcurrentHashMap<Long, DivisionUpsertEvent>` | division ID           | bootstrap/job                                           | team/pool index | `clear` then per-item put; includes inactive divisions               | `PROVEN` |
| clubs index        | Elasticsearch `clubs`                          | string club ID        | bootstrap recreation, hourly snapshot, club events      | search-service  | delete-before-rebuild; no alias/version                              | `PROVEN` |
| teams index        | Elasticsearch `teams`                          | long team ID          | bootstrap recreation, hourly snapshot, team/club events | search-service  | denormalized cache enrichment; no atomic rebuild                     | `PROVEN` |
| pools index        | Elasticsearch `pools`                          | long pool ID          | bootstrap recreation, hourly snapshot, pool events      | search-service  | denormalized division enrichment; no atomic rebuild                  | `PROVEN` |

Critical interaction evidence:

- Every restart deletes all three indices before recreating them. There is no versioned index, alias switch, migration,
  health gate, or rollback target.
- The hourly job deletes each live index before fetching and writing its source snapshot. A club-fetch failure leaves
  clubs empty and aborts team/pool work; a later failure can leave a mixed-generation store.
- Reindexing clubs calls `reindexTeamsForClub` once per club, then `IndexerJob` immediately deletes all teams and rebuilds
  them. This is redundant write amplification and exposes intermediate generations.
- A team upsert appends to the club list instead of replacing by team ID. Team deactivation deletes Elasticsearch only;
  the stale cache entry remains and a later club upsert can recreate the deactivated document.
- Club deactivation removes the club cache and the entire team-cache bucket but deletes only the club document. Whether
  separate team deactivation events always remove every affected team document is `UNKNOWN`.
- Club/division cache refreshes do not reindex dependent documents. Team club fields, team division fields, and pool
  division fields can remain stale until an event or hourly full reindex.
- Division snapshots include active and inactive rows because the downstream list operation returns all divisions and
  the worker ignores `active`.
- `clear()` followed by repeated `put()` is not an atomic snapshot swap. Concurrent event and scheduled writes can be
  lost or interleaved; mutable team lists add a second race beyond the concurrent outer map.
- Repository `saveAll` acknowledgement proves only that the call returned. Exact partial bulk-failure semantics and
  refresh visibility require Elasticsearch integration evidence and remain `UNKNOWN`.

## 9. Validation, Error, and Compatibility Behavior

| Boundary             | Current rule / failure                                                 | Caller-visible effect                             | Compatibility dependency                          | Status    |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | --------- |
| REST snapshots       | no DTO Bean Validation; enum/date deserialization only                 | bootstrap failure or scheduler failure            | snake_case `@JsonProperty`; global service naming | `PROVEN`  |
| Auth0 bootstrap      | refresh failure swallowed; blank token allowed                         | downstream calls may be unauthenticated           | M2M credentials and token schedule                | `PROVEN`  |
| REST transport       | no explicit timeouts; URL and full exception logged                    | jobs may block/fail; URLs may expose query values | handwritten generic client                        | `PROVEN`  |
| upsert events        | no field validation or envelope/version                                | one invalid item sends whole batch to DLQ         | duplicated Java payloads                          | `PROVEN`  |
| deactivation events  | no null validation; default listener policy                            | repeated delivery/requeue/DLQ behavior unknown    | Boot/broker defaults                              | `UNKNOWN` |
| ES enrichment        | missing club -> nulls; missing division -> null ID and French fallback | incomplete/stale search result                    | current user-visible fallback                     | `PROVEN`  |
| ES enum mapping      | direct `.name()`                                                       | null rejects batch/job                            | current enum codes                                | `PROVEN`  |
| full rebuild         | destructive delete before source read                                  | temporary or persistent empty index on failure    | hourly reconciliation behavior                    | `PROVEN`  |
| legacy error handler | web `@RestControllerAdvice`, no controllers                            | no proven worker caller                           | dead web starter/utility candidates               | `PROVEN`  |

`DiffUtils`, `TextNormalizer`, `ApiClientService.post`, three singular client reads, and `GlobalExceptionHandler` have no
production caller in this deployable. Removal remains deferred until MRG-267/MRG-412 confirms there is no reflective or
standalone use. The wrong logger owner in `CacheInitializerService` (`PoolClientService.class`) is an observability defect
without direct behavior change.

## 10. Test and Parity Evidence

| Behavior              | Existing evidence                  | What it proves                                                  | Missing parity evidence                                                                                        | Status     |
| --------------------- | ---------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| Spring context        | one unisolated `contextLoads` test | current local run fails on unresolved Auth0/Elasticsearch hosts | isolated context or explicit integration fixtures for APIs, Rabbit, Auth0, ES, schedules, mappings, and writes | `PROVEN`   |
| HTTP clients/casing   | none                               | nothing                                                         | generated-client fixture tests for paths, camelCase fields, auth, errors, null body                            | `MISSING`  |
| event serialization   | none                               | nothing                                                         | producer/consumer golden JSON and header fixtures, old/new compatibility                                       | `MISSING`  |
| batch acknowledgement | none                               | nothing                                                         | success, map failure, partial ES bulk failure, nack/DLQ tests                                                  | `MISSING`  |
| deactivation          | none                               | nothing                                                         | retry/DLQ, cache eviction, no resurrection tests                                                               | `MISSING`  |
| cache concurrency     | none                               | nothing                                                         | atomic replacement, concurrent event/refresh, duplicate-ID tests                                               | `MISSING`  |
| index bootstrap       | none                               | nothing                                                         | restart availability, mapping migration, failed creation/rollback tests                                        | `MISSING`  |
| full reindex          | none                               | nothing                                                         | per-stage failure, alias switch, generation consistency tests                                                  | `MISSING`  |
| enrichment parity     | MRG-261 source inspection          | current fallback and fields                                     | club/division changes, missing cache, ordering/result fixtures                                                 | `INFERRED` |
| analyzer/mapping      | JSON source only                   | intended mapping                                                | real-index mapping and query/result parity                                                                     | `INFERRED` |

Later implementation must preserve observable search fields, fallbacks, enum codes, filtering, analyzer behavior, and
eventual reconciliation until a separately approved behavior change exists. It must not preserve destructive/racy
mechanics merely because they are current implementation details.

## 11. Findings and Provisional Target Roles

| Finding  | Observation / behavioral risk                                                                    | Follow-up                              | Status               |
| -------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- | -------------------- |
| `SW-F01` | four handwritten clients copy 49 fields, retain only 25, and depend on 28 snake_case annotations | MRG-303, MRG-326, MRG-331–343, MRG-352 | `PROVEN`             |
| `SW-F02` | committed URL examples do not contain the controller resource paths; deployed values are unknown | MRG-301, MRG-304                       | `PROVEN` / `UNKNOWN` |
| `SW-F03` | event classes are copied per service with no schema, envelope, version, event ID, or time        | MRG-302, MRG-315, MRG-350              | `PROVEN`             |
| `SW-F04` | one invalid upsert can dead-letter a 500-message batch                                           | MRG-302, MRG-350, MRG-412              | `PROVEN`             |
| `SW-F05` | deactivation retry/requeue behavior is implicit and untested                                     | MRG-302, MRG-350                       | `UNKNOWN`            |
| `SW-F06` | indices are destructively recreated on every worker restart                                      | MRG-304, MRG-412                       | `PROVEN`             |
| `SW-F07` | hourly delete-before-fetch rebuild can leave empty or mixed-generation indices                   | MRG-304, MRG-412                       | `PROVEN`             |
| `SW-F08` | team cache appends duplicate IDs, is internally non-thread-safe, and retains deactivated teams   | MRG-412                                | `PROVEN`             |
| `SW-F09` | club/division refresh does not reproject dependent documents                                     | MRG-412                                | `PROVEN`             |
| `SW-F10` | non-atomic cache replacement races with Rabbit listeners and schedulers                          | MRG-412                                | `PROVEN`             |
| `SW-F11` | club reindex writes teams per club immediately before deleting/rebuilding all teams              | MRG-412                                | `PROVEN`             |
| `SW-F12` | source and event data have no version, so snapshot/event ordering cannot reject stale writes     | MRG-268, MRG-302, MRG-350, MRG-412     | `PROVEN`             |
| `SW-F13` | missing enrichment silently changes IDs/names/logos and user-visible search data                 | MRG-261 parity, MRG-304, MRG-412       | `PROVEN`             |
| `SW-F14` | `name_suggest` is mapping-only and unused in committed writer/reader code                        | MRG-267, MRG-412                       | `PROVEN`             |
| `SW-F15` | Auth0 refresh can leave a blank/stale token and clients have no explicit timeouts                | MRG-268, MRG-304, MRG-412              | `PROVEN`             |
| `SW-F16` | transport, cache, event, enrichment, and ES mapping responsibilities are mixed                   | MRG-268, MRG-412                       | `PROVEN`             |

| Current type / behavior         | Proposed owner                           | Provisional target role                                | Disposition                           | Preconditions                      | Decision owner  | Status        |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------ | ------------------------------------- | ---------------------------------- | --------------- | ------------- |
| copied REST DTOs                | owning service contract + worker adapter | generated internal client response                     | map immediately; retire copies        | MRG-301/303/304 and service bundle | MRG-268         | `PROVISIONAL` |
| upsert/deactivation payloads    | owning event contract                    | generated or validated event payload                   | separate from cache/domain/doc        | MRG-302/315                        | MRG-268         | `PROVISIONAL` |
| club/team/division cache shapes | worker                                   | immutable snapshot records                             | split from Rabbit payloads            | concurrency and parity tests       | MRG-268         | `PROVISIONAL` |
| index enrichment                | worker application boundary              | projection command/service                             | split orchestration from ES mapper    | field/fallback parity              | MRG-268         | `PROVISIONAL` |
| `ClubDoc`/`TeamDoc`/`PoolDoc`   | worker ES adapter                        | persistence projections                                | keep boundary-local; explicit mapper  | mapping/query parity               | MRG-268         | `PROVISIONAL` |
| `Format`/`Gender`               | shared source contract if approved       | generated enums per boundary                           | eliminate manual drift                | REST/event compatibility           | MRG-268         | `PROVISIONAL` |
| destructive index lifecycle     | worker operations                        | versioned index generation + alias policy candidate    | replace only with rollout proof       | production topology and rollback   | MRG-268/MRG-304 | `PROVISIONAL` |
| Expo TanStack/Orval             | Expo app                                 | mobile-local generated BFF transport/query integration | do not create shared TanStack library | MRG-313/328                        | MRG-268         | `PROVISIONAL` |

## 12. Required Contract-First and Architecture Handoff

The audit makes the following later work explicit without executing it early:

1. MRG-301 records the exact deployed worker source URLs and current service REST payloads.
2. MRG-302 captures all six event bodies, headers, queue policies, retry paths, DLQs, and producer/consumer copies.
3. MRG-303 assigns the four list calls and any retained singular call to generated internal clients, and inventories all
   28 annotations plus the global naming strategy.
4. MRG-304 defines dual-read/dual-publish or coordinated rollout, service/worker deployment order, index rollback, and
   the precise removal gate for snake_case and legacy event payloads.
5. MRG-313/328 keep Orval, generated DTOs/Zod schemas, auth/error mutators, and TanStack Query integration inside the Expo
   application because Blockout has no second React consumer.
6. MRG-315 chooses the Rabbit contract source/generator separately from OpenAPI and defines envelope/version policy.
7. MRG-317–326 define owner-specific REST bundles; MRG-326 does not invent a REST API for the worker.
8. MRG-331–343 migrate producers and worker HTTP adapters slice by slice, mapping generated DTOs immediately to
   worker-owned immutable inputs.
9. MRG-350 migrates each routing key independently with golden fixtures, old/new compatibility, acknowledgement,
   retry/DLQ, ordering, and rollback evidence.
10. MRG-351/352 remove global snake_case and `@JsonProperty` only after every worker source client is generated and
    deployed on camelCase.
11. MRG-354 guards Blockout-owned REST and event wire names as camelCase while excluding database columns, internal
    Python names, and vendor payloads.
12. MRG-412 restructures bootstrap, caches, schedules, event adapters, projection application logic, and Elasticsearch
    adapters; it must cover atomic cache snapshots, ID-based replacement/eviction, dependent reprojection, index
    generation/alias strategy, failure isolation, reconciliation, and stale-event policy.

## 13. Unknowns and Required Follow-up Evidence

| Unknown                                                       | Evidence checked                               | Required evidence / owner                           | Blocking later task?          |
| ------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| deployed API base URL values and route ownership              | all committed env/config files and controllers | deployment exports without secrets                  | yes, MRG-301/304              |
| exact Rabbit JSON and headers                                 | converters and Java payloads                   | broker capture or producer golden fixtures          | yes, MRG-302/315              |
| deactivation retry/requeue/DLQ policy                         | listener/config source                         | effective Boot properties and broker policies       | yes, MRG-302/350              |
| producer ordering and delivery guarantees                     | publisher/listener source                      | broker topology, publisher confirms, runtime traces | yes, MRG-302/304              |
| partial Elasticsearch bulk semantics                          | repositories and callers                       | integration test against deployed-compatible ES     | yes, MRG-304/412              |
| production index topology and aliases                         | committed worker source                        | ES cluster metadata/read-only operations evidence   | yes, MRG-304/412              |
| restart and full-reindex availability impact                  | lifecycle/scheduler source                     | runtime trace and search telemetry                  | yes, MRG-304/412              |
| whether club deactivation always emits all team deactivations | publisher call sites partially inspected       | end-to-end competition deactivation trace/tests     | yes, MRG-302/412              |
| standalone worker consumers or reflective utility use         | monorepo references                            | standalone repository/owner confirmation            | no, route through MRG-267/412 |
| intended use of `name_suggest`                                | writer/reader/mapping source                   | product/search owner or production query evidence   | no, MRG-267/412               |
| token lifetime and M2M scopes                                 | Auth0 config only                              | Auth0 client/grant evidence without secrets         | yes, MRG-304/412              |

## 14. Audit Completion Checklist

- [x] Every in-scope HTTP, Rabbit, bootstrap, scheduler, cache, and Elasticsearch boundary is inventoried.
- [x] Every copied DTO, event/cache shape, enum, and document has a stable Type ID.
- [x] Every in-scope field has a lineage row and one primary classification.
- [x] Current snake_case annotations and target camelCase names are explicit.
- [x] Producers, consumers, defaults, fallbacks, derivations, storage, and conversions are cited.
- [x] Missing mapper/application/domain boundaries and duplicated shapes are explicit.
- [x] Existing tests and missing parity evidence are recorded.
- [x] Unknowns name the evidence and later task required to resolve them.
- [x] Target roles remain provisional and route to MRG-268.
- [x] TanStack/Orval ownership remains mobile-local.
- [x] No runtime, generated artifact, contract, index, queue, secret, or production environment changed.
