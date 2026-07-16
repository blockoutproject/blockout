# MRG-253 — clubs-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `772b21c8c1b01490f80ce6b267f93c83ff4cf298`
- Scope roots: `apps/backend/clubs-service`, club-facing slices of `apps/backend/mobile-gateway` and
  `apps/backend/search-worker`, `apps/scrapers/club-scraper`, club deactivation production in
  `apps/backend/competition-service`, and club-facing Expo modules in `apps/frontend/mobile`
- Audited deployable or workflow: clubs-service and its proven Blockout producers and consumers
- Runtime mutation: none
- Evidence limitations: source and committed configuration only; no deployed OpenAPI capture, production traffic,
  database rows, RabbitMQ messages, S3 objects, Mapbox responses, Auth0 grants, or standalone-repository history was
  observed

## Scope and Evidence Rules

Included: all clubs-service controllers, service methods, entity/DTO/event shapes, repository queries, Flyway
migrations, S3 and Mapbox clients, scheduled geocoding, RabbitMQ producer/listener/configuration, security, errors,
image validation, logs, and tests. The audit also follows club payloads through the club scraper, competition-service
deactivation cascade, search-worker bootstrap/events/index, mobile-gateway public/update and aggregation paths, and
Expo profile, form, map, and case-conversion code.

Excluded: deep team, pool, match, competition-ranking, search, and gateway workflow reconstruction, which belongs to
MRG-254 through MRG-266. Those modules are included only where they prove a clubs-service field or call. Maaatch is a
read-only policy and structure reference, not evidence of current Blockout runtime behavior.

`PROVEN`, `INFERRED`, `UNKNOWN`, and field classifications use
`docs/migration/backend-contract-data-audit-template.md`. Target roles remain provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary                   | Current owner          | Entry mechanism                                   | Callers / producers                          | Consumers                                   | Auth                                                        | Data owner                                   | Evidence                               | Status   |
| -------------------------- | ---------------------- | ------------------------------------------------- | -------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- | -------------------------------------- | -------- |
| Club REST                  | clubs-service          | six `/api/v1/clubs` operations                    | scraper, BFF, worker, unknown direct clients | PostgreSQL, Rabbit, S3                      | JWT plus method scopes, except logo has authentication only | clubs-service                                | `ClubController`, `SecurityConfig`     | `PROVEN` |
| Multipart JSON             | clubs-service          | string `data`, optional `image`                   | scraper create/update; BFF update            | handwritten `ClubUpdateDTO`, service/entity | operation scope                                             | clubs-service                                | controller and callers                 | `PROVEN` |
| Club storage               | clubs-service          | JPA/Flyway                                        | `ClubService`, geocoding job                 | REST entity serialization, events           | internal                                                    | PostgreSQL `clubs`                           | entity, repository, V1–V3              | `PROVEN` |
| Logo objects               | clubs-service          | AWS SDK synchronous calls                         | create/update                                | public URL consumers                        | AWS credentials                                             | configured S3 bucket, `clubs/` key prefix    | `S3StorageClientService`               | `PROVEN` |
| Geocoding                  | Mapbox / clubs-service | scheduled HTTP GET                                | `ClubGeocodingJob`                           | club latitude/longitude                     | Mapbox token                                                | Mapbox response; clubs-service stores result | job/client/config                      | `PROVEN` |
| Upsert event               | clubs-service          | Rabbit `club.upsert`                              | successful create/update path                | search-worker                               | broker credentials                                          | clubs-service payload                        | `EventPublisher`                       | `PROVEN` |
| Deactivation command event | competition-service    | Rabbit `club.deactivation`                        | competition association cascade              | clubs-service, search-worker                | broker credentials                                          | competition-service decision                 | competition publisher/listeners        | `PROVEN` |
| Scraper adapter            | club-scraper           | aiohttp JSON/multipart                            | FFVB HTML scraper                            | clubs/competition services                  | Auth0 M2M token                                             | scraper local dataclasses                    | scraper API/service/model              | `PROVEN` |
| BFF club facade            | mobile-gateway         | public GET, secure multipart PUT                  | Expo                                         | BFF cache and club service                  | BFF security split                                          | BFF projection                               | club controllers/service/client        | `PROVEN` |
| BFF aggregation            | mobile-gateway         | repeated cached GETs                              | team/pool/match workflows                    | Expo enriched team/match/pool views         | propagated service token                                    | BFF workflow                                 | `TeamLogoEnricher`, services           | `PROVEN` |
| Search projection          | search-worker          | REST bootstrap, scheduled refresh, Rabbit batches | clubs-service and competition-service        | Elasticsearch and team reindex              | M2M plus broker                                             | search-worker                                | worker clients/listeners/index/cache   | `PROVEN` |
| Expo club UI               | mobile app             | BFF public GET and secure multipart PUT           | user navigation/edit                         | profile, contact rows, map, team list       | Auth0 for edit                                              | mobile view/form state                       | `ClubApi`, `ClubForm`, club components | `PROVEN` |

All Blockout HTTP services examined here configure Jackson `SNAKE_CASE`; Expo additionally converts ordinary JSON
requests to snake_case, all JSON responses to camelCase, and multipart JSON with `appendJsonSnake`. The Python scraper
uses snake_case dataclass fields that currently match the wire directly. Canonical target Blockout wire names are
camelCase; Python implementation identifiers may remain snake_case behind an explicit adapter.

## 2. REST Operation Inventory

No controller method declares an OpenAPI `operationId`; each operation ID is therefore `MISSING`.

| Operation        | Method and path               | Auth               | Request                                    | Success                          | Filters / multipart                    | Proven callers                  | Evidence                      | Status   |
| ---------------- | ----------------------------- | ------------------ | ------------------------------------------ | -------------------------------- | -------------------------------------- | ------------------------------- | ----------------------------- | -------- |
| `listClubs`      | GET `/api/v1/clubs`           | `read:clubs`       | optional repeated `ids`, optional `active` | 200 `List<Club>` ordered by name | empty/null IDs mean all; no pagination | scraper, worker                 | controller/repository/clients | `PROVEN` |
| `getClubById`    | GET `/api/v1/clubs/{id}`      | `read:clubs`       | string path ID                             | 200 entity; 404 map              | none                                   | BFF, worker method              | controller/service/clients    | `PROVEN` |
| `createClub`     | POST `/api/v1/clubs`          | `create:clubs`     | multipart string `data`; optional `image`  | 201 entity plus `Location`       | JSON parsed manually                   | club scraper                    | controller/scraper            | `PROVEN` |
| `updateClub`     | PUT `/api/v1/clubs/{id}`      | `update:clubs`     | multipart string `data`; optional `image`  | 200 entity; 404 map              | JSON parsed manually                   | scraper, BFF/Expo               | controller/callers            | `PROVEN` |
| `deactivateClub` | DELETE `/api/v1/clubs/{id}`   | `delete:clubs`     | string path ID                             | 204; 404 map                     | soft delete                            | no monorepo caller found        | controller/service/search     | `PROVEN` |
| `getClubLogo`    | GET `/api/v1/clubs/{id}/logo` | authenticated only | string path ID                             | 200 text URL, 204 empty, 404 map | no method scope                        | BFF helper, currently no caller | controller/BFF client         | `PROVEN` |

### Operation Semantics

- Responses are direct mutable JPA `Club` instances. Global snake_case makes `raw_name`, `postal_code`, `phone_number`,
  `logo_url`, `created_at`, and `last_update` current wire names; all other entity fields retain their spelling.
- `listClubs` passes an empty ID list plus its size into JPQL. `active = null` disables the activity filter. There is no
  page, limit, total, or stable secondary sort when names are equal.
- Create and update accept JSON as a raw string rather than a typed multipart part, so Springdoc cannot describe the
  concrete JSON schema reliably. Neither controller uses `@Valid`.
- Create requires `id`, `rawName`, and `name` only through database `NOT NULL` constraints. It forces `active = true`,
  ignores request `logoUrl`, and accidentally omits request `address` from entity construction.
- Update ignores body `id`. Each ordinary nullable field means “leave unchanged,” so current callers cannot clear
  address/contact/name values with `null`. `logoUrl` is different: with no uploaded image, `null` means delete the
  existing S3-owned logo, while a non-null value merely prevents deletion and is not assigned.
- Update always reactivates an inactive club. The `active` field is absent from `ClubUpdateDTO`; scraper reactivation
  relies on this service behavior rather than sending an honored field.
- Direct DELETE marks the club inactive but publishes no deactivation event. The usual scraper path instead asks
  competition-service to deactivate associations; only its cascade can emit `club.deactivation`, which then reaches
  clubs-service and search-worker.
- `getClubLogo` is covered by the global authenticated rule but has no `read:clubs` method annotation. Its plain string
  body is not a JSON club projection.
- Missing clubs produce the stable English message `Club not found with id <id>`. Malformed multipart JSON,
  `IllegalArgumentException` from image validation, S3/runtime failures, database constraint failures, and most other
  exceptions collapse to the generic French 500 body. Oversized multipart requests return 413.

## 3. Event, Scheduled, and Vendor Entry Inventory

| Entry                  | Kind                   | Producer            | Consumer                     | Route / schedule                                 | Payload                                   | Failure / retry                                                                                 | Evidence                   | Status   |
| ---------------------- | ---------------------- | ------------------- | ---------------------------- | ------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- | -------- |
| club upsert            | Rabbit publish         | clubs-service       | search-worker                | `entity.lifecycle.exchange` / `club.upsert`      | id, name, logoUrl, city                   | AMQP exception escapes transaction; worker batch nacks to DLQ, no requeue                       | publishers/listener/config | `PROVEN` |
| club deactivate        | Rabbit publish/consume | competition-service | clubs-service, search-worker | exchange / `club.deactivation`                   | clubId                                    | clubs listener uses default container behavior; search delete listener has no manual retry code | publisher/listeners/config | `PROVEN` |
| geocode clubs          | scheduler              | clubs-service       | PostgreSQL and Mapbox        | initial delay 0, fixed delay 7 days              | active clubs missing either coordinate    | per-club failures logged and skipped; outer failures swallowed                                  | `ClubGeocodingJob`         | `PROVEN` |
| worker cache bootstrap | startup                | search-worker       | clubs-service REST           | `@PostConstruct`                                 | active club list                          | exception can fail startup                                                                      | `CacheInitializerService`  | `PROVEN` |
| worker cache refresh   | scheduler              | search-worker       | clubs-service REST           | fixed rate 10 minutes                            | active club list                          | exception logged; old cache retained                                                            | `ClubCacheJob`             | `PROVEN` |
| Mapbox geocode         | vendor HTTP            | clubs-service       | Mapbox v5 endpoint           | up to five French postcode/place/address results | vendor `features`, `center`, `place_name` | any zero/multiple/invalid result becomes null; exceptions swallowed                             | `MapboxClient`             | `PROVEN` |

The clubs-service Rabbit converter is constructed without the application `ObjectMapper`; source alone does not prove
whether the global HTTP `SNAKE_CASE` strategy applies to broker messages. Producer and consumer event classes both use
camelCase Java names and no `@JsonProperty`, so captured broker payloads are required before casing cutover. Event
ordering, deduplication, idempotency keys, schema version, envelope, and outbox do not exist in source.

The upsert event is emitted after repository `save` but before the surrounding database transaction is known to have
committed. Geocoding changes do not emit an upsert. A create/update event contains only the four fields needed by the
search projection, not a full club snapshot.

## 4. Type Inventory

| Type ID           | Shape                          | Role / owner                        | Mutable    | Serialized / consumed       | Duplicate family       | Evidence              | Status   |
| ----------------- | ------------------------------ | ----------------------------------- | ---------- | --------------------------- | ---------------------- | --------------------- | -------- |
| `CLUB-E`          | clubs `Club`                   | JPA entity and REST response        | yes        | HTTP, service, job          | full club              | entity/controller     | `PROVEN` |
| `CLUB-U`          | service `ClubUpdateDTO`        | create/update multipart input       | yes        | HTTP input                  | club write             | DTO/controller        | `PROVEN` |
| `CLUB-UP-EVT`     | `ClubUpsertEvent`              | search event                        | yes        | Rabbit                      | club search projection | publisher             | `PROVEN` |
| `CLUB-DEACT-EVT`  | `ClubDeactivationEvent`        | incoming command event              | yes        | Rabbit                      | deactivation           | listener              | `PROVEN` |
| `BFF-CLUB`        | gateway `ClubDTO`              | downstream copy and public response | yes        | service HTTP in/out, cache  | full club              | BFF DTO/client        | `PROVEN` |
| `BFF-CLUB-U`      | gateway `ClubUpdateDTO`        | BFF write input/downstream copy     | yes        | Expo and service multipart  | club write             | BFF DTO               | `PROVEN` |
| `WORKER-CLUB`     | worker `ClubDTO`               | bootstrap downstream copy           | yes        | service HTTP                | worker club            | worker client         | `PROVEN` |
| `WORKER-CLUB-EVT` | worker `ClubUpsertEvent`       | event/cache input                   | yes        | Rabbit/internal cache       | search projection      | worker event          | `PROVEN` |
| `WORKER-CLUB-DOC` | worker `ClubDoc`               | Elasticsearch document              | yes        | Elasticsearch               | search projection      | index service         | `PROVEN` |
| `PY-CLUB`         | Python `Club` dataclass        | scraper transport/local state       | yes        | service JSON/multipart      | full club              | scraper model/handler | `PROVEN` |
| `EXPO-CLUB`       | TypeScript `Club`              | BFF response and UI state           | structural | Axios/UI/form               | full club              | Expo type/API         | `PROVEN` |
| `MAPBOX-R`        | Mapbox response/feature/result | vendor adapter and neutral result   | mixed      | vendor JSON/internal record | geocode                | Mapbox client         | `PROVEN` |

There is no service request/response record, application command, application view, entity mapper, or generated DTO.
The same Lombok mutable classes cross controller, application, persistence, and messaging boundaries.

## 5. Field-Lineage Matrix

Canonical target names below are provisional camelCase Blockout wire names. `—` means the shape does not carry the
field. All current HTTP snake names also inherit the service/gateway global naming strategy, even where a redundant
`@JsonProperty` is present.

### Service Entity and Multipart Input

| Type     | Field       | Current wire   | Target wire   | Direction / producer       | Consumers / persistence / behavior                             | Validation / null                         | Conversion                         | Class                | Status   |
| -------- | ----------- | -------------- | ------------- | -------------------------- | -------------------------------------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------- | -------- |
| `CLUB-E` | id          | `id`           | `id`          | DB/service → REST          | path key, scraper/BFF/worker, PK                               | DB non-null/unique; no request validation | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | rawName     | `raw_name`     | `rawName`     | multipart → DB → REST      | scraper source identity/display in edit form                   | DB non-null                               | direct entity/global casing        | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | name        | `name`         | `name`        | multipart → DB/event/REST  | UI title, search, sort                                         | DB non-null; Expo edit requires nonblank  | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | address     | `address`      | `address`     | update/job → DB/REST       | Mapbox query and Expo address UI                               | nullable; create drops it                 | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | city        | `city`         | `city`        | multipart → DB/event/REST  | UI, search, Mapbox                                             | nullable; geocode requires non-null       | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | postalCode  | `postal_code`  | `postalCode`  | multipart → DB/REST        | Mapbox and scraper                                             | nullable; geocode requires non-null       | global casing                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | email       | `email`        | `email`       | multipart → DB/REST        | Expo mail link                                                 | nullable; no format validation            | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | phoneNumber | `phone_number` | `phoneNumber` | multipart → DB/REST        | scraper; BFF deliberately nulls public value                   | nullable; no format validation            | global casing                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | website     | `website`      | `website`     | multipart → DB/REST        | Expo external link                                             | nullable; no URL validation               | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | logoUrl     | `logo_url`     | `logoUrl`     | S3/service → DB/event/REST | Expo images, BFF fallbacks, search                             | nullable; special delete semantics        | S3 URL/global casing               | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | active      | `active`       | `active`      | service/event → DB/REST    | list filter, scraper reactivation, worker bootstrap            | DB non-null/default true                  | direct entity                      | `REQUIRED`           | `PROVEN` |
| `CLUB-E` | latitude    | `latitude`     | `latitude`    | Mapbox job → DB/REST       | Expo map, BFF team enrichment                                  | nullable                                  | vendor result copied directly      | `DERIVED`            | `PROVEN` |
| `CLUB-E` | longitude   | `longitude`    | `longitude`   | Mapbox job → DB/REST       | Expo map, BFF team enrichment                                  | nullable                                  | vendor result copied directly      | `DERIVED`            | `PROVEN` |
| `CLUB-E` | createdAt   | `created_at`   | `createdAt`   | JPA callback → DB/REST     | carried by clients; no UI read found                           | nullable column, set on persist           | global casing                      | `PERSISTENCE_ONLY`   | `PROVEN` |
| `CLUB-E` | lastUpdate  | `last_update`  | `lastUpdate`  | JPA callback → DB/REST     | scraper/worker copies; no decision read found                  | nullable column, set on persist/update    | global casing                      | `PERSISTENCE_ONLY`   | `PROVEN` |
| `CLUB-U` | id          | `id`           | `id`          | caller → create/update     | create assigns; update ignores                                 | nullable in Java                          | manual builder                     | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | rawName     | `raw_name`     | `rawName`     | scraper/BFF → service      | create assigns; update patches                                 | DB requires after create                  | `@JsonProperty` plus global casing | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | name        | `name`         | `name`        | scraper/Expo → service     | create assigns; update patches                                 | DB requires after create                  | manual builder/setter              | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | city        | `city`         | `city`        | scraper → service          | create/update; affects later geocode                           | nullable means unchanged on update        | manual copy                        | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | address     | `address`      | `address`     | scraper → service          | ignored on create, patched on update                           | nullable means unchanged                  | manual copy                        | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | postalCode  | `postal_code`  | `postalCode`  | scraper → service          | create/update; affects geocode                                 | nullable means unchanged                  | annotation/global casing           | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | logoUrl     | `logo_url`     | `logoUrl`     | scraper/BFF → service      | create ignores; update uses only null/not-null deletion signal | null deletes if no image                  | annotation/manual branch           | `COMPATIBILITY_ONLY` | `PROVEN` |
| `CLUB-U` | email       | `email`        | `email`       | scraper → service          | create/update                                                  | nullable means unchanged                  | manual copy                        | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | phoneNumber | `phone_number` | `phoneNumber` | scraper → service          | create/update                                                  | nullable means unchanged                  | annotation/manual copy             | `REQUIRED`           | `PROVEN` |
| `CLUB-U` | website     | `website`      | `website`     | scraper → service          | create/update                                                  | nullable means unchanged                  | manual copy                        | `REQUIRED`           | `PROVEN` |

### Event and Search Shapes

| Type                | Field       | Current wire/store | Target wire   | Producer              | Consumer / behavior                      | Validation                   | Conversion         | Class        | Status    |
| ------------------- | ----------- | ------------------ | ------------- | --------------------- | ---------------------------------------- | ---------------------------- | ------------------ | ------------ | --------- |
| `CLUB-UP-EVT`       | id          | capture required   | `id`          | clubs-service         | worker document/cache key                | none                         | entity → builder   | `EVENT_ONLY` | `UNKNOWN` |
| `CLUB-UP-EVT`       | name        | capture required   | `name`        | clubs-service         | Elasticsearch/search result              | none                         | entity → builder   | `EVENT_ONLY` | `UNKNOWN` |
| `CLUB-UP-EVT`       | logoUrl     | capture required   | `logoUrl`     | clubs-service         | search card and team reindex             | nullable                     | entity → builder   | `EVENT_ONLY` | `UNKNOWN` |
| `CLUB-UP-EVT`       | city        | capture required   | `city`        | clubs-service         | searchable/display city                  | nullable                     | entity → builder   | `EVENT_ONLY` | `UNKNOWN` |
| `CLUB-DEACT-EVT`    | clubId      | capture required   | `clubId`      | competition-service   | club soft delete; worker index delete    | none                         | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| `WORKER-CLUB`       | id          | `id`               | `id`          | club REST             | bootstrap event ID                       | none                         | copied DTO         | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB`       | rawName     | `raw_name`         | `rawName`     | club REST             | no worker read found                     | none                         | `@JsonProperty`    | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | name        | `name`             | `name`        | club REST             | bootstrap event/search                   | none                         | copied DTO         | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB`       | city        | `city`             | `city`        | club REST             | bootstrap event/search                   | nullable                     | copied DTO         | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB`       | postalCode  | `postal_code`      | `postalCode`  | club REST             | no worker read found                     | none                         | `@JsonProperty`    | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | email       | `email`            | `email`       | club REST             | no worker read found                     | none                         | copied DTO         | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | phoneNumber | `phone_number`     | `phoneNumber` | club REST             | no worker read found                     | none                         | `@JsonProperty`    | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | website     | `website`          | `website`     | club REST             | no worker read found                     | none                         | copied DTO         | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | logoUrl     | `logo_url`         | `logoUrl`     | club REST             | bootstrap event/search                   | nullable                     | `@JsonProperty`    | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB`       | lastUpdate  | `last_update`      | `lastUpdate`  | club REST             | no worker read found                     | none                         | `@JsonProperty`    | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB`       | active      | `active`           | `active`      | club REST             | list already filters true; no read found | nullable Boolean             | copied DTO         | `REMOVABLE`  | `PROVEN`  |
| `WORKER-CLUB-EVT`   | id          | capture required   | `id`          | clubs-service Rabbit  | worker document/cache key                | none                         | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| `WORKER-CLUB-EVT`   | name        | capture required   | `name`        | clubs-service Rabbit  | worker document/search                   | none                         | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| `WORKER-CLUB-EVT`   | logoUrl     | capture required   | `logoUrl`     | clubs-service Rabbit  | worker document/cache/team reindex       | nullable                     | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| `WORKER-CLUB-EVT`   | city        | capture required   | `city`        | clubs-service Rabbit  | worker document/search                   | nullable                     | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| worker deactivation | clubId      | capture required   | `clubId`      | competition Rabbit    | worker index/cache delete                | none                         | copied event class | `EVENT_ONLY` | `UNKNOWN` |
| `WORKER-CLUB-DOC`   | id          | `id`               | `id`          | worker event          | Elasticsearch ID                         | none                         | event mapper       | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB-DOC`   | logoUrl     | `logoUrl`          | `logoUrl`     | worker event          | search response                          | nullable                     | event mapper       | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB-DOC`   | name        | `name`             | `name`        | worker event          | search text/display                      | none                         | event mapper       | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB-DOC`   | city        | `city`             | `city`        | worker event          | search text/display                      | nullable                     | event mapper       | `REQUIRED`   | `PROVEN`  |
| `WORKER-CLUB-DOC`   | all         | `all`              | `all`         | Elasticsearch mapping | bool-prefix search query                 | `copy_to` from name and city | index-time mapping | `DERIVED`    | `PROVEN`  |

`WORKER-CLUB-EVT` repeats the four `CLUB-UP-EVT` fields with the same target meanings. Its exact current broker names
remain `UNKNOWN` until a message is captured. The worker deactivation event repeats `clubId`.

### Gateway, Expo, and Scraper Shapes

| Shape / field                | Current wire                | Target wire           | Producer → consumer               | Behavior / loss                                                     | Class                | Status   |
| ---------------------------- | --------------------------- | --------------------- | --------------------------------- | ------------------------------------------------------------------- | -------------------- | -------- |
| `BFF-CLUB.id`                | `id`                        | `id`                  | service → BFF → Expo/aggregations | cache and join key                                                  | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.rawName`           | `raw_name`                  | `rawName`             | service → BFF → Expo form         | displayed read-only in edit form                                    | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.name`              | `name`                      | `name`                | service → BFF → Expo              | profile title/form                                                  | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.city`              | `city`                      | `city`                | service → BFF → Expo              | contact/map/search context                                          | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.postalCode`        | `postal_code`               | `postalCode`          | service → BFF → Expo              | typed but no direct club UI read found                              | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB.email`             | `email`                     | `email`               | service → BFF → Expo              | mail action                                                         | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.phoneNumber`       | `phone_number`              | `phoneNumber`         | service → BFF                     | public service overwrites with null as a privacy projection         | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.website`           | `website`                   | `website`             | service → BFF → Expo              | link action                                                         | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.logoUrl`           | `logo_url`                  | `logoUrl`             | service → BFF/Expo/aggregations   | hero and team logo fallback                                         | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB.latitude`          | `latitude`                  | `latitude`            | service → BFF/Expo/aggregations   | mobile map and team coordinate                                      | `DERIVED`            | `PROVEN` |
| `BFF-CLUB.longitude`         | `longitude`                 | `longitude`           | service → BFF/Expo/aggregations   | mobile map and team coordinate                                      | `DERIVED`            | `PROVEN` |
| `BFF-CLUB.active`            | `active`                    | `active`              | service → BFF/Expo                | typed; no club UI branch found                                      | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB.createdAt`         | `created_at`                | `createdAt`           | service → BFF/Expo                | typed; no club UI read found                                        | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB.lastUpdate`        | `last_update`               | `lastUpdate`          | service → BFF/Expo                | typed; no club UI read found                                        | `COMPATIBILITY_ONLY` | `PROVEN` |
| missing `BFF-CLUB.address`   | service sends `address`     | `address`             | service → discarded by BFF DTO    | Expo declares/uses it, but BFF shape cannot carry it                | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB-U.id`              | `id`                        | `id`                  | Expo/BFF → service                | service update ignores; Expo does not send                          | `REMOVABLE`          | `PROVEN` |
| `BFF-CLUB-U.rawName`         | `raw_name`                  | `rawName`             | BFF → service                     | supported but Expo form does not edit                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.name`            | `name`                      | `name`                | Expo → BFF → service              | only editable text field                                            | `REQUIRED`           | `PROVEN` |
| `BFF-CLUB-U.city`            | `city`                      | `city`                | potential BFF caller → service    | pass-through; current Expo club form does not send                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.postalCode`      | `postal_code`               | `postalCode`          | potential BFF caller → service    | pass-through; current Expo club form does not send                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.logoUrl`         | `logo_url`                  | explicit logo action  | Expo → BFF → service              | existing value preserves; null deletes                              | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.email`           | `email`                     | `email`               | potential BFF caller → service    | pass-through; current Expo club form does not send                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.phoneNumber`     | `phone_number`              | `phoneNumber`         | potential BFF caller → service    | pass-through; current Expo club form does not send                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `BFF-CLUB-U.website`         | `website`                   | `website`             | potential BFF caller → service    | pass-through; current Expo club form does not send                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| missing `BFF-CLUB-U.address` | —                           | `address`             | Expo/BFF → service                | BFF cannot forward service-supported address patch                  | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.id`               | camelCase after interceptor | `id`                  | BFF → UI                          | route and query key                                                 | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.rawName`          | camelCase after interceptor | `rawName`             | BFF → UI                          | displayed in edit form                                              | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.name`             | camelCase after interceptor | `name`                | BFF → UI/form                     | profile title and only editable text field                          | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.city`             | camelCase after interceptor | `city`                | BFF → UI                          | contact/map query                                                   | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.postalCode`       | camelCase after interceptor | `postalCode`          | BFF → type                        | no direct club UI read found                                        | `REMOVABLE`          | `PROVEN` |
| `EXPO-CLUB.address`          | expected camelCase          | `address`             | BFF → UI                          | UI uses `(club as any).address`; BFF drops source field             | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.email`            | camelCase after interceptor | `email`               | BFF → UI                          | mail action                                                         | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.phoneNumber`      | camelCase after interceptor | `phoneNumber`         | BFF → UI                          | phone action, but BFF public projection always nulls it             | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.website`          | camelCase after interceptor | `website`             | BFF → UI                          | external link action                                                | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.logoUrl`          | camelCase after interceptor | `logoUrl`             | BFF → UI/form                     | hero/map marker/image preserve/delete intent                        | `REQUIRED`           | `PROVEN` |
| `EXPO-CLUB.latitude`         | camelCase after interceptor | `latitude`            | BFF → UI                          | map coordinate                                                      | `DERIVED`            | `PROVEN` |
| `EXPO-CLUB.longitude`        | camelCase after interceptor | `longitude`           | BFF → UI                          | map coordinate                                                      | `DERIVED`            | `PROVEN` |
| `EXPO-CLUB.active`           | camelCase after interceptor | `active`              | BFF → type                        | no club UI read found                                               | `REMOVABLE`          | `PROVEN` |
| `EXPO-CLUB.createdAt`        | camelCase after interceptor | `createdAt`           | BFF → type                        | no club UI read found                                               | `REMOVABLE`          | `PROVEN` |
| `EXPO-CLUB.lastUpdate`       | camelCase after interceptor | `lastUpdate`          | BFF → type                        | no club UI read found                                               | `REMOVABLE`          | `PROVEN` |
| `PY-CLUB.id`                 | `id`                        | adapter `id`          | scraper ↔ service                | required scraper/cache/service key                                  | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.raw_name`           | `raw_name`                  | adapter `rawName`     | FFVB → scraper → service          | required and compared                                               | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.name`               | `name`                      | adapter `name`        | FFVB → scraper → service          | built from raw name; comparison omission can suppress isolated edit | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.city`               | `city`                      | adapter `city`        | FFVB → scraper → service          | compared and updated                                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.postal_code`        | `postal_code`               | adapter `postalCode`  | FFVB → scraper → service          | compared and updated                                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.address`            | `address`                   | adapter `address`     | FFVB → scraper → service          | compared; service loses it on create                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.email`              | `email`                     | adapter `email`       | FFVB → scraper → service          | compared and updated                                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.phone_number`       | `phone_number`              | adapter `phoneNumber` | FFVB → scraper → service          | compared and updated                                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.website`            | `website`                   | adapter `website`     | FFVB → scraper → service          | compared and updated                                                | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.logo_url`           | `logo_url`                  | adapter `logoUrl`     | service → scraper → update        | preserves existing logo during no-image update                      | `COMPATIBILITY_ONLY` | `PROVEN` |
| `PY-CLUB.active`             | `active`                    | adapter `active`      | service → scraper local logic     | detects reactivation; server ignores sent value and reactivates     | `REQUIRED`           | `PROVEN` |
| `PY-CLUB.created_at`         | `created_at`                | adapter `createdAt`   | service → scraper → echoed write  | not read for decisions; serialized back unnecessarily               | `REMOVABLE`          | `PROVEN` |
| `PY-CLUB.last_update`        | `last_update`               | adapter `lastUpdate`  | service → scraper → echoed write  | not read for decisions; serialized back unnecessarily               | `REMOVABLE`          | `PROVEN` |

The scraper dataclass has no latitude/longitude, so its response converter deliberately ignores those service fields.
The gateway static OpenAPI `Club` schema is snake_case and omits `address`, `latitude`, and `longitude`; no club paths
were found in that file. It is incomplete implementation evidence, not a usable source contract.

### Mapbox Vendor Fields

| Type           | Field     | Vendor wire                 | Target Blockout wire | Use                                  | Class          | Status   |
| -------------- | --------- | --------------------------- | -------------------- | ------------------------------------ | -------------- | -------- |
| `MAPBOX-R`     | features  | `features`                  | `NOT_APPLICABLE`     | result cardinality and first feature | `VENDOR_OWNED` | `PROVEN` |
| `MAPBOX-R`     | center    | `center`                    | `NOT_APPLICABLE`     | `[longitude, latitude]`              | `VENDOR_OWNED` | `PROVEN` |
| `MAPBOX-R`     | placeName | `place_name`                | `NOT_APPLICABLE`     | declared but unused                  | `VENDOR_OWNED` | `PROVEN` |
| neutral result | latitude  | internal camelCase accessor | `latitude`           | copied into entity                   | `DERIVED`      | `PROVEN` |
| neutral result | longitude | internal camelCase accessor | `longitude`          | copied into entity                   | `DERIVED`      | `PROVEN` |

Vendor spelling must remain contained in the Mapbox adapter; it is not an exception to Blockout-owned camelCase.

## 6. Construction, Mapping, and Conversion Inventory

| ID    | Source → target                      | Mechanism                              | Field loss / defaults / business logic                               | Provisional owner                            | Status   |
| ----- | ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | -------- |
| `C01` | multipart string → `CLUB-U`          | controller `ObjectMapper.readValue`    | untyped OpenAPI part; global and field snake rules                   | generated request adapter                    | `PROVEN` |
| `C02` | `CLUB-U` → new `CLUB-E`              | service builder                        | drops address/logoUrl; forces active; leaves coordinates/timestamps  | application command mapper                   | `PROVEN` |
| `C03` | `CLUB-U` → existing `CLUB-E`         | null-check setters                     | patch, reactivation, and logo delete logic mixed into service        | application command + explicit logo action   | `PROVEN` |
| `C04` | `CLUB-E` → REST                      | no mapper                              | exposes persistence shape and callbacks                              | response mapper                              | `PROVEN` |
| `C05` | `CLUB-E` → upsert event              | manual builder                         | four-field projection                                                | event mapper                                 | `PROVEN` |
| `C06` | image → S3 URL                       | manual upload/key/URL assembly         | UUID plus original filename; external side effect                    | storage adapter                              | `PROVEN` |
| `C07` | Mapbox JSON → coordinates            | RestTemplate public fields then record | rejects ambiguous result; vendor spelling contained                  | vendor adapter                               | `PROVEN` |
| `C08` | service JSON → BFF copy              | Jackson copied DTO with annotations    | address discarded; phone later nulled                                | generated downstream client + BFF projection | `PROVEN` |
| `C09` | BFF update → service multipart       | parse, reserialize with shared builder | duplicate DTO; address absent                                        | generated client request                     | `PROVEN` |
| `C10` | service JSON → worker copy/event/doc | copied DTO and builders                | seven bootstrap fields copied but unused                             | generated client + minimal cache view        | `PROVEN` |
| `C11` | service JSON ↔ Python dataclass     | field-name reflection and `asdict`     | exact snake dependency; read-only fields echoed; coordinates ignored | scraper HTTP adapter                         | `PROVEN` |
| `C12` | BFF JSON ↔ Expo                     | deep Axios casing interceptors         | whole-app implicit conversion                                        | Orval-generated mobile-local client          | `PROVEN` |
| `C13` | Expo update → multipart JSON         | `appendJsonSnake`                      | special conversion outside Axios; image appended even undefined      | generated multipart client                   | `PROVEN` |

`NONE`: there is no mapper between REST DTOs/application objects/JPA entities and no generated client in the audited
club path. Mapping, persistence, S3, patch semantics, reactivation, and event publication are currently interleaved in
`ClubService`.

## 7. Duplicate-Type Analysis

| Family             | Members                                                                              | Differences                                                                             | Proven reason / consumers          | Provisional disposition                                  | Status   |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- | -------- |
| full club          | entity, BFF DTO, worker DTO, Python dataclass, Expo interface, static OpenAPI schema | address/coordinates/timestamps differ; privacy mutation in BFF                          | service, UI, worker, scraper       | generated boundary DTOs plus explicit local projections  | `PROVEN` |
| club update        | service and BFF DTO, Expo `Partial<Club>`, Python full dataclass                     | create/update conflated; address missing in BFF; read-only fields leak from full shapes | scraper and Expo edits             | split create/update/logo actions and local form models   | `PROVEN` |
| upsert event       | service and worker event copies                                                      | same four Java fields; broker spelling unobserved                                       | search indexing/cache/team reindex | versioned generated event or explicit event contract     | `PROVEN` |
| deactivation event | competition, clubs, worker copies                                                    | same clubId field                                                                       | soft delete and index delete       | one versioned event contract after ownership decision    | `PROVEN` |
| search club        | upsert event, cache value, `ClubDoc`, search-service/BFF search DTOs                 | document has `all`; response roles differ                                               | search UX                          | retain intentional projections; generate transport edges | `PROVEN` |

Object similarity does not imply a shared runtime library. Boundary-local BFF, worker, Expo, and scraper models remain
valid roles; handwritten transport duplication and annotations are the migration target.

## 8. Persistence and External Side Effects

| Boundary           | Identity / ownership                     | API exposure         | Constraint or consistency gap                                                                 | Evidence               | Status   |
| ------------------ | ---------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- | ---------------------- | -------- |
| PostgreSQL `clubs` | caller-supplied string PK                | full entity direct   | only id/raw_name/name/active constrained; timestamps nullable; no email/URL/coordinate checks | migrations/entity      | `PROVEN` |
| JPA callbacks      | local server time                        | timestamps exposed   | no timezone type; bulk/native behavior not tested                                             | entity                 | `PROVEN` |
| S3 logo            | bucket config, `clubs/<uuid>-<filename>` | public assembled URL | no DB/S3 transaction or compensation; filename not sanitized in source                        | storage client/service | `PROVEN` |
| Mapbox coordinates | derived from address/city/postal         | entity response      | address updates do not clear coordinates, so job will not re-geocode complete stale pairs     | service/job            | `PROVEN` |
| Elasticsearch club | club string ID                           | search projection    | `all` is populated at index time through `copy_to` from name and city, not stored by Java     | worker doc/index       | `PROVEN` |

Create uploads before database save. If persistence or event publication fails, the object can remain orphaned. Update
deletes the old owned object before uploading the replacement; an upload failure can leave the database pointing at a
deleted URL. If upload succeeds then persistence/event fails, the new object can be orphaned. Logo deletion and Rabbit
publication are external effects inside a database transaction but are not rolled back with it.

`deleteObjectByUrl` only deletes URLs matching the configured bucket/region prefix, which avoids deleting arbitrary
external URLs. It silently does nothing for a non-owned URL. No object version, checksum, size beyond multipart limit,
image content inspection, or cleanup job is present.

## 9. Validation, Error, Casing, and Compatibility Behavior

| Boundary            | Rule                                                       | Current failure / dependency                                             | Required parity evidence                   | Status   |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ | -------- |
| create              | DB implicitly requires id/rawName/name                     | usually generic 500 rather than contract validation                      | controller/integration cases per field     | `PROVEN` |
| update              | null means unchanged except logo null means delete         | accidental deletion for clients omitting logoUrl                         | explicit patch/logo truth table            | `PROVEN` |
| image               | PNG/JPEG content type, ≤5 MiB                              | invalid type becomes generic 500; server size overflow is 413            | multipart error tests                      | `PROVEN` |
| S3                  | synchronous upload/delete                                  | partial external effects on later failure                                | failure-injection integration tests        | `PROVEN` |
| auth                | method scopes on five operations; logo authentication only | scope asymmetry                                                          | security tests and Auth0 grant inventory   | `PROVEN` |
| service HTTP casing | global snake plus four redundant DTO annotations           | copied consumers depend on snake wire                                    | captured schemas and coexistence tests     | `PROVEN` |
| gateway casing      | global snake plus copied annotations                       | service/BFF and BFF/Expo both snake today                                | generated client/BFF contract tests        | `PROVEN` |
| Expo casing         | deep camel/snake interceptors plus multipart helper        | implicit conversion everywhere                                           | generated client parity and removal checks | `PROVEN` |
| Python casing       | dataclass reflection uses exact snake field names          | camel wire would deserialize all renamed fields as null without adapter  | adapter unit tests for both directions     | `PROVEN` |
| deactivation        | competition cascade is effective orchestrator              | direct DELETE does not propagate; empty associations return before event | event/cascade parity tests                 | `PROVEN` |
| geocoding           | active, city/postal present, one coordinate missing        | stale complete coordinates survive address changes                       | job/re-geocode decision tests              | `PROVEN` |

## 10. Test and Parity Evidence

| Behavior                     | Existing evidence                  | Proves                                     | Missing later test                                                   | Status   |
| ---------------------------- | ---------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | -------- |
| application startup          | one `@SpringBootTest contextLoads` | context only when environment is available | all behaviors below                                                  | `PROVEN` |
| REST shapes/status/casing    | no focused test found              | nothing                                    | six operation contract tests                                         | `PROVEN` |
| create/update mapping        | no test found                      | nothing                                    | every field, null, create omission, reactivation                     | `PROVEN` |
| logo lifecycle               | no test found                      | nothing                                    | upload/replace/delete/no-change/failure compensation                 | `PROVEN` |
| event publication            | no test found                      | nothing                                    | payload, casing, timing, failure, deactivation                       | `PROVEN` |
| repository filters/order     | no test found                      | nothing                                    | IDs/active/null/order cases                                          | `PROVEN` |
| geocoding                    | no test found                      | nothing                                    | vendor response cardinality, stale coordinates, scheduling           | `PROVEN` |
| BFF projection/cache/privacy | no focused test found              | nothing                                    | address, phone privacy, cache mutation/invalidation                  | `PROVEN` |
| scraper adapter              | no club tests found                | nothing                                    | camel wire adapter, create/update/deactivation truth tables          | `PROVEN` |
| Expo API/form                | no focused tests found             | nothing                                    | multipart, image undefined, preserve/delete logo, query invalidation | `PROVEN` |

Required migration parity fixtures must freeze both current accidental behavior and approved corrections separately.
Behavior cannot be called “preserved” if address, privacy, logo state, coordinates, deactivation propagation, or search
freshness is not asserted.

## 11. BFF and Aggregation Extension

### Operation Call Graph

| BFF workflow        | Step                    | Downstream call       | Cardinality                                   | Cache                                  | Output / fallback                | Failure                                 | Status   |
| ------------------- | ----------------------- | --------------------- | --------------------------------------------- | -------------------------------------- | -------------------------------- | --------------------------------------- | -------- |
| public club profile | 1                       | GET club by ID        | 1                                             | `clubById`                             | full BFF DTO then phone null     | downstream error propagates             | `PROVEN` |
| secure club update  | 1                       | PUT multipart club    | 1                                             | puts `clubById`, evicts `clubLogoById` | downstream DTO                   | downstream error propagates             | `PROVEN` |
| team profile/list   | after team/config calls | GET club by ID        | 1 or one per distinct club                    | `clubById`                             | club logo fallback; coordinates  | missing/null handling differs by method | `PROVEN` |
| pool aggregation    | after team collection   | GET per distinct club | N distinct clubs                              | `clubById`                             | mutate team logo and coordinates | first downstream failure aborts         | `PROVEN` |
| match aggregations  | after team collection   | GET per distinct club | N distinct clubs, repeated in three workflows | `clubById`                             | mutate team logo and coordinates | first downstream failure aborts         | `PROVEN` |

The cache reduces repeated network calls but does not remove iterative BFF call structure. `clubById` and
`clubLogoById` are process-local Caffeine caches with a four-hour write expiry and maximum size 1,000. The logo cache
has no proven caller; all aggregations fetch the full club DTO. Club upsert events do not invalidate either cache.
Secure updates refresh only the handling process, so scraper or other service updates and other replicas can remain
stale for up to the configured expiry.

### Projection Field Justification

| BFF field                    | Source          | Transformation            | Expo / workflow purpose                      | Class                | Status   |
| ---------------------------- | --------------- | ------------------------- | -------------------------------------------- | -------------------- | -------- |
| id                           | club id         | none                      | route/join/query key                         | `REQUIRED`           | `PROVEN` |
| rawName                      | raw_name        | casing only               | read-only edit context                       | `REQUIRED`           | `PROVEN` |
| name                         | name            | none                      | profile title/edit                           | `REQUIRED`           | `PROVEN` |
| email/website                | same            | none                      | contact actions                              | `REQUIRED`           | `PROVEN` |
| phoneNumber                  | phone_number    | forced null publicly      | privacy behavior; UI row consequently hidden | `REQUIRED`           | `PROVEN` |
| city/address                 | same            | address currently dropped | contact/map query                            | `REQUIRED`           | `PROVEN` |
| logoUrl                      | logo_url        | team fallback             | hero, map marker, team/match/pool visuals    | `REQUIRED`           | `PROVEN` |
| latitude                     | service derived | copied to teams           | club and team maps                           | `DERIVED`            | `PROVEN` |
| longitude                    | service derived | copied to teams           | club and team maps                           | `DERIVED`            | `PROVEN` |
| timestamps/active/postalCode | service         | casing only               | no proven club screen use                    | `COMPATIBILITY_ONLY` | `PROVEN` |

Mutating the cached `ClubDTO` to null the phone number mixes downstream transport and public projection. The approved
architecture must preserve privacy without allowing a public response mutation to change the shared cached object.

## 12. Findings and Provisional Target Roles

| ID         | Observation                                                                          | Behavioral risk                                              | Follow-up                                  | Status   |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------ | -------- |
| `CLUB-F01` | JPA entity is the REST response and service state                                    | schema/persistence coupling and accidental field exposure    | MRG-268, contract/Java slices              | `PROVEN` |
| `CLUB-F02` | create drops `address`; BFF drops it in both directions                              | scraped/user-visible address and geocoding quality are lost  | parity decision before generated contracts | `PROVEN` |
| `CLUB-F03` | logo null/omitted semantics differ from all other fields                             | unintended deletion or inability to express no-change safely | explicit logo command and truth table      | `PROVEN` |
| `CLUB-F04` | S3, DB, and Rabbit effects have no atomic handoff/compensation                       | orphaned objects, broken URLs, event/state divergence        | architecture and reliability slices        | `PROVEN` |
| `CLUB-F05` | direct DELETE emits no event; competition cascade owns effective deactivation        | clubs, teams, associations, and search can diverge           | deactivation ownership decision            | `PROVEN` |
| `CLUB-F06` | complete coordinates are not invalidated after location edits                        | stale maps remain indefinitely                               | geocoding state policy                     | `PROVEN` |
| `CLUB-F07` | gateway public privacy is a mutation of a cached downstream DTO                      | cache state and projection ownership are ambiguous           | explicit BFF response mapper               | `PROVEN` |
| `CLUB-F08` | worker copies eleven club fields but consumes four                                   | annotation and drift debt                                    | generated client plus minimal cache view   | `PROVEN` |
| `CLUB-F09` | Python and Expo depend on separate implicit snake/camel converters                   | camel cutover breaks callers without staged adapters         | MRG-303/MRG-304                            | `PROVEN` |
| `CLUB-F10` | multipart strings and derived Springdoc cannot describe writes authoritatively       | generation would reproduce an incomplete contract            | source OpenAPI multipart schemas           | `PROVEN` |
| `CLUB-F11` | validation/errors are mostly DB/framework/generic 500 behavior                       | generated clients cannot model stable failures               | error contract and parity tests            | `PROVEN` |
| `CLUB-F12` | search and BFF freshness depend on events/caches without cache invalidation contract | stale club/team/search visuals                               | worker/BFF workflow audits                 | `PROVEN` |

Provisional roles, subject to MRG-268:

| Current type / behavior  | Proposed owner                    | Target role                                                      | Disposition                                       | Preconditions                                |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| entity REST exposure     | clubs-service                     | JPA entity plus separate application view                        | split and map                                     | response parity approved                     |
| create/update DTO        | clubs-service                     | generated create/update DTOs plus application commands           | split create, patch, and logo intent              | null/logo/address semantics approved         |
| club responses           | clubs-service                     | generated response DTO                                           | map from application view                         | privacy remains BFF-owned                    |
| S3 lifecycle             | clubs infrastructure              | storage adapter/result                                           | isolate and add approved compensation             | failure policy approved                      |
| geocoding                | clubs application/infrastructure  | vendor adapter plus derived location state                       | retain Mapbox casing in adapter                   | re-geocode policy approved                   |
| upsert/deactivate events | owning service contracts          | versioned generated event payloads                               | map explicitly                                    | event ownership/outbox decision              |
| gateway copies           | BFF downstream and API boundaries | generated service client plus explicit public projection         | retire copied annotations/classes                 | BFF contract defined                         |
| worker copies            | worker infrastructure             | generated service/event clients plus minimal cache view          | project four required fields                      | worker audit completed                       |
| Expo `ClubApi`/type      | mobile-local API/query boundary   | Orval client and DTO plus form view model                        | keep TanStack Query mobile-local                  | BFF contract and generated multipart support |
| Python dataclass         | scraper domain/adapter            | snake_case local model plus explicit camelCase transport adapter | preserve Python identifiers, remove wire coupling | coexistence tests and rollout order          |

## 13. Unknowns and Required Follow-up Evidence

| Unknown                                                     | Checked evidence                         | Required evidence                                          | Blocking later task?                       |
| ----------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| deployed club/BFF base URLs and direct external callers     | committed configs and full source search | deployment inventory, access logs, consumer registry       | yes before removal/cutover                 |
| exact Rabbit JSON field names/type headers                  | converter and event source               | captured safe messages or broker integration test          | yes before event generation/casing cutover |
| deployed gateway replica count and observed cache staleness | Caffeine config and client annotations   | runtime topology and cache metrics                         | yes before cache migration                 |
| live nullability/value formats and orphan S3 objects        | schema/source only                       | production-safe DB/S3 inventory                            | yes before constraints/storage cleanup     |
| whether users intentionally lack phone visibility           | source mutation only                     | product/privacy decision and current app observation       | yes before BFF projection change           |
| expected address behavior on create and mobile profile      | scraper/UI/source contradiction          | product decision plus safe data sample                     | yes before correcting behavior             |
| Mapbox ambiguity and stale-coordinate incidence             | source only                              | logs/metrics or safe sample                                | useful before geocoding redesign           |
| Auth0 grants for logo endpoint and all M2M clients          | security annotations/source              | tenant grant inventory or safe tokens                      | yes before auth contract change            |
| standalone/deployed divergence                              | monorepo only                            | standalone commit comparison and deployed image provenance | MRG-301/304                                |

## 14. Audit Completion Checklist

- [x] All in-scope REST, multipart, persistence, S3, Mapbox, event, scheduled, scraper, worker, BFF, and Expo boundaries
      are inventoried.
- [x] Every in-scope type family and field has a stable type ID or an explicit grouped lineage row.
- [x] Current snake_case and proposed camelCase Blockout wire names are explicit; vendor casing is isolated.
- [x] Producers, consumers, validation, defaults, derivations, persistence, and conversions are cited.
- [x] Direct entity exposure, absent mappers, copied DTOs, and generated-client gaps are explicit.
- [x] Multipart create/update, logo truth table, S3 ownership, geocoding, deactivation, and event timing are traced.
- [x] BFF call graphs and user-visible projection fields are justified without redesigning them.
- [x] Existing tests, missing parity coverage, inferences, and production unknowns are explicit.
- [x] Target roles remain provisional and route to MRG-268.
- [x] No runtime, configuration, contract, generated artifact, migration, test, or deployment file changed.

## Downstream Handoff

- MRG-254 through MRG-266 must reuse the proven club logo/coordinate enrichment, deactivation cascade, and cache call
  graph where team, pool, competition, match, search, worker, or BFF ownership is audited in depth.
- MRG-267 must merge the full-club, update, event, search, Expo, and Python duplicate families into the cross-service
  lineage matrix.
- MRG-268 must decide DTO/application/entity separation, mapper ownership, create/patch/logo semantics, privacy,
  deactivation ownership, geocoding invalidation, event reliability, and S3 compensation before implementation.
- MRG-301 must capture all six operations, real deployed base URLs, method scopes, direct entity schemas, filters,
  multipart parts, statuses, and errors as current evidence—not as target contract authority.
- MRG-303 must inventory the gateway/worker handwritten clients, redundant Jackson annotations, Expo interceptors and
  `appendJsonSnake`, Python reflection/asdict conversion, and Rabbit converter behavior.
- MRG-304 must stage canonical camelCase across service, BFF, worker, Expo, Python adapters, and events with explicit
  coexistence and rollback. Python local identifiers may remain snake_case.
- Generated API DTOs/clients and mobile-local Orval/TanStack integration must preserve approved profile, contact,
  image, map, privacy, soft-delete/reactivation, scraper, aggregation, and search behaviors.
- Production deployment did not occur during this audit.
