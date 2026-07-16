# MRG-254 — teams-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `7158241b9fa68ce890363ee9d8e16ecfc3518c9c`
- Scope roots: `apps/backend/teams-service`, team-facing slices of `mobile-gateway`, `users-service`,
  `competition-service`, `search-worker`, `notification-service`, both Python scrapers, and Expo mobile
- Audited deployable or workflow: teams-service and its proven Blockout producers and consumers
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no production traffic, database, broker messages, S3
  objects, Auth0 grants, deployed schemas, cache metrics, or standalone-repository history was observed

## Scope

This audit covers all team REST operations, entity/DTO/enum/event fields, filters, persistence, multipart updates, S3,
follower counters, RabbitMQ, club cascade, Python calls, worker indexing, BFF enrichment and Expo consumers. Deep pool,
competition ranking, match, user, notification, search, and BFF workflow ownership remains assigned to MRG-255 through
MRG-266; this file records only the evidence needed to explain the team boundary.

Evidence statuses and classifications follow `backend-contract-data-audit-template.md`. Current behavior is evidence,
not target authority. Canonical target Blockout wire names are camelCase; Python identifiers may remain snake_case
behind explicit adapters. Architecture remains provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary            | Owner / entry                   | Producers                                       | Consumers / effects                                      | Auth                                                           | Evidence                   | Status   |
| ------------------- | ------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- | -------- |
| team REST           | teams-service, eight operations | competition scraper, BFF, users-service, worker | PostgreSQL, Rabbit, S3                                   | authenticated globally; create/update/delete/follow add scopes | controller/security        | `PROVEN` |
| team persistence    | teams-service JPA/Flyway        | REST, listeners                                 | direct REST entity responses/events                      | internal                                                       | entity/repository/V1–V4    | `PROVEN` |
| logo storage        | teams-service AWS SDK           | multipart update                                | S3 `teams/` objects and public URLs                      | AWS credentials                                                | storage client/service     | `PROVEN` |
| upsert events       | teams-service                   | create/update                                   | search-worker                                            | broker credentials                                             | publisher/worker           | `PROVEN` |
| deactivation events | competition-service             | association cascade                             | teams-service and worker                                 | broker credentials                                             | listeners/publisher        | `PROVEN` |
| follow counter      | users-service HTTP              | favorite create/delete                          | team `followersCount`                                    | `follow:teams` M2M permission                                  | user/team clients/services | `PROVEN` |
| follow notification | users-service Rabbit            | favorite create/delete                          | notification-service; unconsumed teams queue             | broker credentials                                             | configs/listeners          | `PROVEN` |
| scraper transport   | competition scraper             | FFVB pool/match data                            | team create/update/list                                  | Auth0 M2M                                                      | Python API/model/service   | `PROVEN` |
| club scraper lookup | club scraper                    | none                                            | unique club IDs only                                     | Auth0 M2M                                                      | club scraper team API      | `PROVEN` |
| BFF facade          | mobile-gateway                  | Expo                                            | enriched team, summaries, update, cached downstream DTOs | public/secure BFF split                                        | BFF controllers/services   | `PROVEN` |
| search projection   | search-worker                   | REST bootstrap/refresh and Rabbit               | Elasticsearch team index                                 | M2M/broker                                                     | worker client/cache/index  | `PROVEN` |

## 2. REST Operation Inventory

Controller methods have no explicit OpenAPI `operationId`; all IDs are `MISSING`.

| Method and path                      | Controller           | Auth               | Request                                                                                   | Success                | Callers                         | Status   |
| ------------------------------------ | -------------------- | ------------------ | ----------------------------------------------------------------------------------------- | ---------------------- | ------------------------------- | -------- |
| GET `/api/v1/teams`                  | `listTeams`          | authenticated only | optional `division_id`, `format`, `gender`, `season`, `club_id`, repeated `ids`, `active` | 200 direct entity list | scraper, BFF, worker            | `PROVEN` |
| GET `/api/v1/teams/{id}`             | `getTeamById`        | authenticated only | Long ID                                                                                   | 200 entity; 404 map    | BFF                             | `PROVEN` |
| POST `/api/v1/teams`                 | `createTeam`         | `create:teams`     | direct JSON entity                                                                        | 201 entity + Location  | competition scraper             | `PROVEN` |
| PUT `/api/v1/teams/{id}`             | `updateTeam`         | `update:teams`     | multipart string `data`, optional `image`                                                 | 200 entity; 404 map    | scraper, BFF/Expo               | `PROVEN` |
| DELETE `/api/v1/teams/{id}`          | `deactivateTeam`     | `delete:teams`     | Long ID                                                                                   | 204                    | no direct monorepo caller found | `PROVEN` |
| GET `/api/v1/teams/club-ids`         | `getUniqueClubIds`   | authenticated only | none                                                                                      | 200 string list        | club scraper                    | `PROVEN` |
| POST `/{teamId}/followers/increment` | `incrementFollowers` | `follow:teams`     | `user_id` query                                                                           | 200 entity             | users-service                   | `PROVEN` |
| POST `/{teamId}/followers/decrement` | `decrementFollowers` | `follow:teams`     | `user_id` query                                                                           | 200 entity             | users-service                   | `PROVEN` |

### Proven Semantics

- `listTeams` has no pagination and orders by `rawName` only. Empty/null IDs disable ID filtering. Enum query values are
  exact `SIX|FOUR|TWO` and `M|F|O`; invalid values fail before the controller and are not explicitly normalized.
- `raw_name` is accepted by the competition scraper as a query parameter but the controller does not declare it, so
  the value is ignored by Spring and the scraper performs its own in-memory raw-name match.
- `getUniqueClubIds` reads every non-null club ID, including IDs referenced only by inactive teams, and defines no
  ordering. The club scraper therefore receives a nondeterministic superset rather than an active-team projection.
- Create accepts the mutable JPA entity. A caller can supply `id`, `followersCount`, `active`, timestamps, and any
  `logoUrl`; no request mapper or validation separates client-owned from server-owned fields. Database constraints are
  the effective validation.
- Update is a null-skipping patch for ten fields. `logoUrl` is exceptional: without an image, null deletes the existing
  owned logo, while non-null only prevents deletion. The body has no ID or follower count.
- Direct DELETE and club/team deactivation listeners set `active=false` but do not publish team upsert/deactivation.
  Competition-service is the effective deactivation event owner.
- Increment/decrement ignore `userId` except for logging. There is no per-user idempotency, row lock, optimistic
  version, atomic SQL update, or event publication. Decrement clamps at zero; increment has no maximum.
- The users-service client deserializes follower-delta responses as `Void`, although teams-service returns the full
  entity. That response payload is unused transport cost and an accidental contract dependency.
- All successes expose the full entity in current snake_case. Missing teams return a stable 404 message. Invalid JSON,
  image type/size, constraint/unique violations, and S3 failures usually collapse to generic 500; unlike clubs-service,
  teams-service has no explicit 413 handler.

## 3. Events and Background Entries

| Entry             | Producer                    | Consumer                             | Route / schedule                            | Payload / behavior                     | Failure                                             | Status   |
| ----------------- | --------------------------- | ------------------------------------ | ------------------------------------------- | -------------------------------------- | --------------------------------------------------- | -------- |
| team upsert       | teams-service create/update | search-worker                        | `entity.lifecycle.exchange` / `team.upsert` | nine-field search projection           | AMQP error escapes DB transaction; worker batch DLQ | `PROVEN` |
| team deactivate   | competition-service         | teams-service, worker                | exchange / `team.deactivation`              | `teamId`                               | source converter retry policy not explicit          | `PROVEN` |
| club deactivate   | competition-service         | teams-service                        | exchange / `club.deactivation`              | `clubId`; deactivates all active teams | no outgoing team events                             | `PROVEN` |
| team follow HTTP  | users-service               | teams-service                        | two POSTs                                   | counter delta, user ID only logged     | distributed transaction gap                         | `PROVEN` |
| team follow event | users-service               | notification-service and teams queue | `user.follow.exchange` / `team.follow`      | userId/entityType/entityId/eventType   | teams queue has no listener                         | `PROVEN` |
| worker bootstrap  | search-worker               | teams REST                           | startup                                     | active team list → cache events        | failure can abort startup                           | `PROVEN` |
| worker refresh    | search-worker               | teams REST                           | every 10 minutes                            | replaces team cache                    | failure logs/retains old cache                      | `PROVEN` |

Exact Rabbit wire casing remains `UNKNOWN` until a message is captured: converters are constructed without the HTTP
application `ObjectMapper`. No event schema version, envelope, ordering key, idempotency key, or outbox exists.

The teams-service declares and binds durable `team.follow.queue.teams` but has no `@RabbitListener` for it. The local
`UserFollowEvent`, `EntityType`, and `EventType` types are consequently unused. Follow events still serve the separate
notification-service queue.

## 4. Type Inventory

| ID               | Shape                                  | Current role                              | Boundary issue                                     | Status   |
| ---------------- | -------------------------------------- | ----------------------------------------- | -------------------------------------------------- | -------- |
| `TEAM-E`         | teams-service `Team`                   | JPA entity, create request, REST response | one mutable shape crosses all layers               | `PROVEN` |
| `TEAM-U`         | service `TeamUpdateDTO`                | multipart patch input                     | handwritten, annotation-heavy, ambiguous logo null | `PROVEN` |
| `TEAM-UP-EVT`    | service `TeamUpsertEvent`              | search event                              | copied in worker                                   | `PROVEN` |
| `TEAM-DEACT-EVT` | team/club deactivation copies          | command events                            | copied across services                             | `PROVEN` |
| `FOLLOW-EVT`     | four-field follow event                | unused teams consumer type                | durable queue without listener                     | `PROVEN` |
| `BFF-TEAM`       | gateway `TeamDTO`                      | downstream copy/cache                     | adds derived coordinates absent from service       | `PROVEN` |
| `BFF-TEAM-U`     | gateway `TeamUpdateDTO`                | BFF write copy                            | duplicates service DTO                             | `PROVEN` |
| `BFF-TEAM-VIEWS` | summary/enriched/stats DTOs            | public projections                        | large club/division/pool aggregation               | `PROVEN` |
| `WORKER-TEAM`    | worker DTO/event/doc/cache             | search transport/projection               | copied full DTO, minimal event                     | `PROVEN` |
| `PY-TEAM`        | competition scraper dataclass          | transport/local state                     | exact snake wire coupling                          | `PROVEN` |
| `PY-CLUB-TEAM`   | club scraper dataclass                 | unused by current club team API           | missing raw/season/followers/logo                  | `PROVEN` |
| `EXPO-TEAM`      | Team/enriched/summary/stats interfaces | API and UI state                          | handwritten copies and casing conversion           | `PROVEN` |

### Duplicate-Type and Enum Inventory

| Concept                 | Current copies                                                                   | Divergence / risk                                                                       | Target disposition                             | Status                        |
| ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------- | ----------------------------------------- | -------- |
| team transport          | JPA entity, BFF `TeamDTO`, worker `TeamDTO`, Python dataclasses, Expo interfaces | persistence fields and derived coordinates are mixed into transport copies              | generated boundary DTOs plus local projections | `PROVEN`                      |
| team update             | teams-service DTO, BFF DTO, Python full dataclass, Expo form payload             | null means patch omission for most fields but logo deletion; Python omits logo entirely | explicit generated update/logo command         | `PROVEN`                      |
| team summaries/rankings | BFF summary/enriched/stats types and Expo mirrors                                | embedded club is legacy; coordinates are declared but lost in ranking mapping           | explicit BFF view contracts                    | `PROVEN`                      |
| format enum             | teams-service, BFF, worker, Expo string union, Python strings, PostgreSQL check  | six-player value is `SIX`; no generated single source                                   | generated enum with DB compatibility test      | `PROVEN`                      |
| gender enum             | teams-service, BFF, worker, Expo string union, Python strings, PostgreSQL check  | compact `M                                                                              | F                                              | O` values are copied manually | generated enum with DB compatibility test | `PROVEN` |
| lifecycle events        | teams-service, competition-service, search-worker, notification/users copies     | no versioned source schema; Rabbit casing is unverified                                 | generated versioned event contracts            | `PROVEN`                      |
| follow event vocabulary | users, notifications, and dead teams-service copies of entity/event enums        | teams-service binds a queue but consumes nothing                                        | retain only proven owners after topology audit | `PROVEN`                      |

## 5. Field-Lineage Matrix

### Service Entity and Update Input

| Type     | Field          | Current wire      | Target wire          | Producer                           | Consumers / storage                                 | Null/default/validation          | Class                | Status   |
| -------- | -------------- | ----------------- | -------------------- | ---------------------------------- | --------------------------------------------------- | -------------------------------- | -------------------- | -------- |
| `TEAM-E` | id             | `id`              | `id`                 | DB identity or create caller       | all joins/routes/events                             | generated, but create may supply | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | clubId         | `club_id`         | `clubId`             | scraper/create/update              | unique key, BFF club enrichment, search             | DB non-null                      | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | rawName        | `raw_name`        | `rawName`            | scraper/create/update              | unique key, sorting, scraper matching, edit context | DB non-null                      | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | name           | `name`            | `name`               | scraper/admin                      | UI/search                                           | DB non-null; Expo form nonblank  | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | shortName      | `short_name`      | `shortName`          | scraper/admin                      | cards/rankings/UI/search                            | DB non-null; Expo form nonblank  | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | leagueCode     | `league_code`     | `leagueCode`         | scraper                            | scraper grouping; copied BFF/worker                 | DB non-null                      | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | divisionId     | `division_id`     | `divisionId`         | scraper/update                     | unique key, BFF/worker division enrichment          | DB non-null; no FK               | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | season         | `season`          | `season`             | scraper/update                     | unique key, filters/UI/search                       | DB non-null                      | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | format         | `format`          | `format`             | scraper/update                     | unique key/filter/UI/search                         | DB check and enum                | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | gender         | `gender`          | `gender`             | scraper/update                     | unique key/filter/UI/search                         | DB check and enum                | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | followersCount | `followers_count` | `followersCount`     | create caller/users-service deltas | Expo/BFF profile                                    | DB default 0, entity default 0   | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | logoUrl        | `logo_url`        | `logoUrl`            | create caller/S3 update            | BFF fallback, UI, search                            | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | active         | `active`          | `active`             | create/update/deactivation         | filters/scraper reactivation                        | DB/entity default true           | `REQUIRED`           | `PROVEN` |
| `TEAM-E` | createdAt      | `created_at`      | `createdAt`          | JPA callback/create caller         | copied only                                         | nullable DB timestamp            | `PERSISTENCE_ONLY`   | `PROVEN` |
| `TEAM-E` | lastUpdate     | `last_update`     | `lastUpdate`         | JPA callback/create caller         | scraper/worker copies; no decision read             | nullable DB timestamp            | `PERSISTENCE_ONLY`   | `PROVEN` |
| `TEAM-U` | clubId         | `club_id`         | `clubId`             | scraper/BFF                        | null-skipping patch, unique key                     | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | rawName        | `raw_name`        | `rawName`            | scraper/BFF                        | patch, unique key                                   | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | name           | `name`            | `name`               | scraper/Expo                       | patch                                               | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | shortName      | `short_name`      | `shortName`          | scraper/Expo                       | patch                                               | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | leagueCode     | `league_code`     | `leagueCode`         | scraper/BFF                        | patch                                               | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | divisionId     | `division_id`     | `divisionId`         | scraper/BFF                        | patch, unique key                                   | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | logoUrl        | `logo_url`        | explicit logo action | scraper/Expo                       | null deletes; non-null preserves only               | nullable sentinel                | `COMPATIBILITY_ONLY` | `PROVEN` |
| `TEAM-U` | season         | `season`          | `season`             | scraper/BFF                        | patch, unique key                                   | nullable                         | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | format         | `format`          | `format`             | scraper/BFF                        | patch, unique key                                   | nullable enum                    | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | gender         | `gender`          | `gender`             | scraper/BFF                        | patch, unique key                                   | nullable enum                    | `REQUIRED`           | `PROVEN` |
| `TEAM-U` | active         | `active`          | `active`             | scraper/BFF                        | explicit reactivation/deactivation                  | nullable                         | `REQUIRED`           | `PROVEN` |

Six `@JsonProperty` annotations in each service/BFF update DTO repeat the global SNAKE_CASE policy. `TEAM-E` create and
response casing is entirely global.

### Events, Worker, BFF, Python, and Expo

| Shape / fields                                          | Current wire                | Target wire          | Producer → consumer                   | Field role / loss                                 | Class                | Status    |
| ------------------------------------------------------- | --------------------------- | -------------------- | ------------------------------------- | ------------------------------------------------- | -------------------- | --------- |
| `TEAM-UP-EVT.id`                                        | capture required            | `id`                 | service → worker                      | document key                                      | `EVENT_ONLY`         | `UNKNOWN` |
| `.name/.shortName`                                      | capture required            | same camelCase       | service → worker                      | search display                                    | `EVENT_ONLY`         | `UNKNOWN` |
| `.clubId/.divisionId`                                   | capture required            | same camelCase       | service → worker                      | club/division enrichment                          | `EVENT_ONLY`         | `UNKNOWN` |
| `.format/.gender/.season`                               | capture required            | same                 | service → worker                      | search facets/text                                | `EVENT_ONLY`         | `UNKNOWN` |
| `.logoUrl`                                              | capture required            | `logoUrl`            | service → worker                      | team logo or club fallback                        | `EVENT_ONLY`         | `UNKNOWN` |
| deactivation teamId/clubId                              | capture required            | camelCase            | competition → teams/worker            | cascade/index delete                              | `EVENT_ONLY`         | `UNKNOWN` |
| follow userId/entityType/entityId/eventType             | capture required            | camelCase            | users → notification/dead teams queue | notification projection                           | `EVENT_ONLY`         | `UNKNOWN` |
| `BFF-TEAM` service fields                               | snake_case mixed            | camelCase            | service → BFF                         | copied all entity fields                          | `COMPATIBILITY_ONLY` | `PROVEN`  |
| `BFF-TEAM.latitude/longitude`                           | absent from service         | same                 | club enrichment → BFF workflow        | derived club coordinates                          | `DERIVED`            | `PROVEN`  |
| `BFF-TEAM-VIEWS.id/name/shortName/season/format/gender` | snake_case mixed            | camelCase            | BFF → Expo                            | team identity/display                             | `REQUIRED`           | `PROVEN`  |
| `BFF-TEAM-VIEWS.followersCount`                         | `followers_count`           | `followersCount`     | service → enriched BFF → Expo         | follow counter UI                                 | `REQUIRED`           | `PROVEN`  |
| `BFF-TEAM-VIEWS.logoUrl`                                | `logo_url`                  | `logoUrl`            | team or club fallback → Expo          | hero/cards/ranking                                | `DERIVED`            | `PROVEN`  |
| enriched `club`                                         | `club`                      | decision required    | BFF → older clients                   | TODO says remove after 1.1.0; Expo type omits it  | `COMPATIBILITY_ONLY` | `PROVEN`  |
| enriched `division`                                     | `division`                  | `division`           | config call → Expo                    | colors/name/logo UI                               | `DERIVED`            | `PROVEN`  |
| enriched `pools/ranking`                                | snake_case nested           | camelCase            | competition/pool/team calls → Expo    | team profile rankings                             | `DERIVED`            | `PROVEN`  |
| `PY-TEAM` core identity fields                          | snake_case                  | adapter camelCase    | scraper ↔ service                    | create, cache key, update                         | `REQUIRED`           | `PROVEN`  |
| `PY-TEAM.followers_count/timestamps/active`             | snake_case                  | adapter camelCase    | service → scraper → write             | server values echoed by full-dataclass update     | `COMPATIBILITY_ONLY` | `PROVEN`  |
| absent `PY-TEAM.logo_url`                               | omitted from multipart JSON | explicit logo intent | service → scraper → service           | null reaches update DTO and deletes existing logo | `COMPATIBILITY_ONLY` | `PROVEN`  |
| `EXPO-TEAM` base fields                                 | camelCase after interceptor | same                 | BFF → mobile                          | handwritten transport type                        | `REQUIRED`           | `PROVEN`  |
| Expo update name/shortName/logoUrl                      | multipart snake helper      | camelCase contract   | form → BFF → service                  | only editable fields; logo sentinel               | `REQUIRED`           | `PROVEN`  |

The worker bootstrap DTO copies fourteen fields but projects only the nine event fields. The worker document then
derives club name/city/logo and division name, with team logo taking precedence. Its `all` index field is populated by
Elasticsearch mapping rather than Java. Search-worker `TeamCacheService.put` appends every upsert without replacing an
existing team ID, and `TeamIndexService.delete` does not remove a deactivated team from that cache.

The competition scraper dataclass types `division_id` as string although the service expects a Long; JSON numeric
values observed in local construction originate from the pool object, but live formats remain unverified. Its
`get_teams` sends comma-joined IDs while Spring list binding normally expects repeated parameters; no current scraper
call supplies IDs. Its update dataclass has no `logo_url`, so every scraper update reaches the service with
`dto.logoUrl == null`; without an uploaded image, that branch deletes an existing team logo. The change detector only
triggers on `club_id`, `division_id`, `format`, `gender`, `raw_name`, or reactivation, so isolated `name`, `short_name`,
and `league_code` changes are not propagated. The club scraper defines a different incomplete Team dataclass but only
calls `/club-ids`.

## 6. Construction and Conversion Inventory

| ID      | Source → target             | Mechanism                                   | Loss / mixed behavior                            | Provisional owner                         | Status   |
| ------- | --------------------------- | ------------------------------------------- | ------------------------------------------------ | ----------------------------------------- | -------- |
| `T-C01` | JSON → `TEAM-E` create      | direct Jackson entity binding               | client controls persistence/server fields        | generated create DTO + command mapper     | `PROVEN` |
| `T-C02` | `TEAM-E` → REST             | no mapper                                   | persistence fields exposed                       | response mapper                           | `PROVEN` |
| `T-C03` | multipart string → `TEAM-U` | manual ObjectMapper                         | Springdoc-invisible schema                       | generated multipart request               | `PROVEN` |
| `T-C04` | `TEAM-U` → entity           | manual null checks                          | patch/logo/reactivation logic mixed in service   | application command mapper                | `PROVEN` |
| `T-C05` | entity → event              | manual builder                              | nine-field search projection                     | event mapper                              | `PROVEN` |
| `T-C06` | image → S3 URL              | delete then upload                          | no transaction/compensation                      | storage adapter                           | `PROVEN` |
| `T-C07` | service → BFF DTO           | copied class/Jackson annotations            | BFF adds club-derived coordinates                | generated downstream client + view mapper | `PROVEN` |
| `T-C08` | BFF → enriched views        | manual fan-out/builders                     | business joins and fallbacks                     | BFF application views                     | `PROVEN` |
| `T-C09` | Python ↔ service           | dataclass reflection/asdict                 | exact snake coupling; absent logo becomes delete | scraper adapter                           | `PROVEN` |
| `T-C10` | BFF ↔ Expo                 | global deep interceptors + multipart helper | implicit whole-app case conversion               | Orval mobile-local client                 | `PROVEN` |

## 7. Persistence, S3, Followers, and Consistency

| Boundary       | Current invariant                            | Gap                                                               | Status   |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------- | -------- |
| unique team    | club/division/format/gender/rawName/season   | no service-level conflict contract; no cross-service FKs          | `PROVEN` |
| follower count | non-null Long, default 0, decrement floor 0  | no DB nonnegative check, version, atomic delta, or reconciliation | `PROVEN` |
| timestamps     | local `LocalDateTime` callbacks              | caller can supply on create; no timezone                          | `PROVEN` |
| S3             | configured bucket, `teams/<uuid>-<filename>` | delete-before-upload and no DB/event compensation                 | `PROVEN` |
| create logo    | arbitrary caller URL only                    | create cannot upload/validate owned image                         | `PROVEN` |

Follower favorite state is owned by users-service, the displayed count by teams-service, and notification follower
projection by notification-service. One user transaction calls teams-service synchronously and then Rabbit. Any failure
after a successful remote delta can roll back the favorite while leaving the count changed; retries/direct calls can
double count. No reconciliation source or job was found.

S3 has the same partial-failure modes as clubs-service: old object deleted before replacement, new object orphaned when
later DB/event work fails, and non-owned URLs silently ignored by delete. Image validation accepts declared PNG/JPEG up
to 5 MiB but does not inspect content. The scraper omission adds a separate destructive path: a metadata/reactivation
update with no image can delete an application-managed logo even when the scraper never intended to modify it.

## 8. BFF Call Graph and Projection Justification

| BFF operation       | Downstream sequence                                                                           | Fan-out                  | Cache / failure                                               | User-visible output                    | Status   |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------- | -------------------------------------- | -------- |
| enriched team by ID | team; division; pools/rankings; each distinct team; each distinct club; each pool; club again | O(teams + clubs + pools) | process-local 4h team/club caches; missing state often aborts | profile, pools, rankings, follow count | `PROVEN` |
| teams by club       | active team list; each division; club                                                         | O(divisions)+2           | team list/club/division caches                                | club team list                         | `PROVEN` |
| teams by IDs        | each unique team; each division; each club                                                    | O(ids+divisions+clubs)   | HashSet loses request order; missing/inactive omitted         | cards and match/pool consumers         | `PROVEN` |
| secure update       | multipart team PUT                                                                            | 1                        | puts teamById; evicts returned club list only                 | edited name/short name/logo            | `PROVEN` |

The enriched workflow fetches the main club twice unless cache hits. It enriches `TeamDTO` coordinates from clubs, but
`buildRanking` does not copy latitude/longitude into `TeamWithStatsDTO`; those response fields remain null. Team upsert
events and follower changes do not invalidate BFF caches. If an update moves a team to another club, only the returned
new club ID is evicted; the old club's cached team list remains stale. Scraper changes can remain stale for four hours
per replica.

## 9. Validation, Errors, Compatibility, and Tests

| Area                             | Current evidence       | Missing parity evidence                                                  | Status    |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------ | --------- |
| required fields/enums/unique key | DB and Jackson only    | create/update/controller/repository matrix                               | `PROVEN`  |
| multipart/logo                   | source only            | preserve/delete/replace/failure truth table                              | `PROVEN`  |
| follower concurrency/idempotency | source has none        | concurrent/retry/reconcile tests                                         | `PROVEN`  |
| event casing/timing              | source only            | captured message and transaction-failure tests                           | `UNKNOWN` |
| deactivation cascade             | source only            | direct/team/club/search cache parity                                     | `PROVEN`  |
| BFF aggregation                  | no focused tests found | fan-out, order, missing state, fallback, cache tests                     | `PROVEN`  |
| scraper transport                | no focused tests found | camel adapter, numeric IDs, filters, change detection, logo preservation | `PROVEN`  |
| Expo form/follow                 | no focused tests found | optimistic count rollback and multipart/query invalidation               | `PROVEN`  |
| service test                     | one context smoke test | proves no endpoint behavior                                              | `PROVEN`  |

## 10. Findings and Provisional Target Roles

| ID         | Finding / risk                                                                                     | Follow-up                                     | Status   |
| ---------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| `TEAM-F01` | create binds the JPA entity and lets callers set server-owned fields                               | split create/application/entity at MRG-268    | `PROVEN` |
| `TEAM-F02` | update uses ambiguous null/logo semantics and external S3 effects                                  | explicit patch/logo command and compensation  | `PROVEN` |
| `TEAM-F03` | follower count is a non-idempotent distributed projection with no reconciliation                   | ownership and atomic/retry design             | `PROVEN` |
| `TEAM-F04` | durable teams follow queue has no listener; local follow types are dead                            | queue/type disposition after topology audit   | `PROVEN` |
| `TEAM-F05` | direct deactivation and club cascade do not publish downstream team events                         | deactivation ownership/event parity           | `PROVEN` |
| `TEAM-F06` | worker cache accumulates duplicate/stale teams and can reindex a deactivated team                  | MRG-262 worker correction plan                | `PROVEN` |
| `TEAM-F07` | BFF does large iterative enrichment and loses ordering/coordinates in projections                  | MRG-265/266 call-graph decisions              | `PROVEN` |
| `TEAM-F08` | global snake casing plus copied annotations, Expo transforms, and Python reflection multiply drift | MRG-303/304 camel cutover                     | `PROVEN` |
| `TEAM-F09` | enums are duplicated across service, BFF, worker, Expo, DB, and Python strings                     | generated shared enum contracts               | `PROVEN` |
| `TEAM-F10` | current Springdoc/static BFF schemas are partial implementation artifacts                          | source OpenAPI reconstruction                 | `PROVEN` |
| `TEAM-F11` | scraper change detection ignores isolated name, short-name, and league-code changes                | parity cases before generated adapter         | `PROVEN` |
| `TEAM-F12` | scraper updates omit `logoUrl`, which invokes the service's null-means-delete branch               | explicit logo intent and preservation test    | `PROVEN` |
| `TEAM-F13` | BFF cache invalidation misses old-club membership and all event/follower changes                   | cache ownership/invalidation redesign         | `PROVEN` |
| `TEAM-F14` | club-ID discovery includes inactive-only references and has no deterministic order                 | define active/order contract semantics        | `PROVEN` |
| `TEAM-F15` | follower endpoints return a full entity that the users-service intentionally discards              | explicit no-content or minimal delta response | `PROVEN` |

| Current family         | Provisional target role                                                | Preconditions / decision owner             |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| entity create/response | generated create/response DTOs + application command/view + JPA entity | ownership/validation approved by MRG-268   |
| multipart update       | generated update DTO + explicit logo intent                            | null/logo/reactivation approved            |
| follower count         | explicit cross-service projection or derived count                     | source of truth/reconciliation approved    |
| events                 | versioned generated event payloads                                     | owner, casing, outbox/deactivation decided |
| BFF copies/views       | generated downstream client + explicit BFF projections                 | MRG-263/265/266 evidence complete          |
| worker copies          | generated client/event + corrected minimal cache/index models          | MRG-262 complete                           |
| Expo                   | Orval client and DTOs, mobile-local TanStack queries and form views    | BFF contract available                     |
| Python                 | snake_case local model plus explicit camelCase transport adapter       | coexistence and rollback tests             |

## 11. Unknowns

| Unknown                                     | Required evidence                       | Blocking                       |
| ------------------------------------------- | --------------------------------------- | ------------------------------ |
| deployed URLs/direct external callers       | deployment inventory/access logs        | field removal and cutover      |
| Rabbit payload casing/type headers          | captured safe messages/integration test | event generation/camel cutover |
| live follower drift and concurrency rate    | DB comparison/metrics                   | follower ownership change      |
| unconsumed teams queue depth/retention      | broker topology/metrics                 | queue removal                  |
| live unique conflicts and division ID types | safe DB samples/scraper payload capture | constraints/Python generation  |
| deployed BFF replica count/cache staleness  | topology/metrics                        | cache migration                |
| active clients relying on embedded `club`   | telemetry/version support matrix        | BFF projection removal         |
| S3 orphan/broken URL incidence              | safe bucket/DB inventory                | storage cleanup                |

## 12. Completion and Handoff

- [x] All eight REST operations, fields, filters, multipart/S3 paths, follower deltas, events, listeners, and persistence
      behavior are inventoried.
- [x] Service, scraper, worker, BFF, Expo, club/division, competition, user, and notification lineage is recorded.
- [x] Scraper update detection and the destructive missing-logo path are recorded as parity blockers.
- [x] Current snake_case, proposed camelCase, copied annotations, and Python adapter requirements are explicit.
- [x] Direct entity binding/exposure and absent generated DTO/client/mapper boundaries are explicit.
- [x] BFF fan-out and user-visible fields are preserved as evidence; target roles remain provisional.
- [x] Tests, unknowns, failure modes, and downstream task owners are explicit.
- [x] No runtime, contract, generated artifact, schema, migration, test, or deployment file changed.

MRG-267 must merge team/entity/update/event/enum duplicates. MRG-268 must approve DTO/application/entity separation,
follower ownership, logo semantics, deactivation, events, and mapper roles. MRG-301/303/304 must capture all operations
and stage camelCase across service, BFF, worker, Expo, Python, and Rabbit. MRG-262 and MRG-265/266 own the deeper worker
cache and BFF aggregation corrections. Production deployment did not occur.
