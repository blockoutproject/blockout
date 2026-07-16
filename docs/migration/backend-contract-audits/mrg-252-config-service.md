# MRG-252 — Config Service Contract and Data-Boundary Audit

- Audit date: 2026-07-16
- Commit: `a19225d1e06cf71112ebc472261766fecd4ea54b`
- Scope roots: `apps/backend/config-service`, config consumers in `apps/backend/mobile-gateway`,
  `apps/backend/search-worker`, `apps/frontend/mobile`, and `apps/scrapers`
- Audited deployable: `com.blockout:config-service`
- Runtime mutation: none
- Evidence limitations: no production environment values, live database, S3 bucket, Auth0 tenant, deployed Springdoc
  document, traffic telemetry, or external consumer registry were available. The imported monorepo source and example
  environment files are the evidence baseline.

## Scope

Included:

- all config-service controllers, services, repositories, entities, DTOs, enums, security, Jackson configuration,
  Flyway migrations, S3 adapter, exception handling, and tests;
- every config-service call found in mobile-gateway and search-worker;
- every Expo config API method, transport type, query hook, admin/edit flow, maintenance/update flow, and proven
  division field consumer;
- both Python scraper status checks and every competition-scraper raw-division mapping path;
- current request/response casing, multipart JSON, persistence, conversion, validation, cache, and error behavior.

Excluded:

- deep fan-out analysis of match, pool, team, notification, and search BFF workflows, which belongs to MRG-264 through
  MRG-266; this audit still identifies their config fields and call sites;
- target OpenAPI fragments, generated artifacts, runtime refactors, and removal decisions;
- production-only callers and environment values that are not present in the checkout.

## Executive Evidence

- Config service exposes 16 REST operations across five controllers. Four resource families return JPA entities
  directly; raw-division creation also accepts a JPA entity as its request body.
- The service owns five JPA entities, four update DTOs, one response DTO, three local enums, no mapper package, and one
  private manual entity-to-DTO method for app status.
- `spring.jackson.property-naming-strategy: SNAKE_CASE` controls config-service, mobile-gateway, and search-worker JSON.
  Eight copied gateway/search-worker DTO classes carry 39 redundant `@JsonProperty` annotations for the same
  snake_case names.
- Expo globally converts JSON bodies and query parameters to snake_case and responses to camelCase; multipart division
  JSON uses a separate `appendJsonSnake` conversion. Gateway then parses and reserializes that JSON before config
  service parses it again.
- Competition scraper deliberately uses snake_case dataclass fields for raw mappings. Both scraper status dataclasses
  instead declare `lastUpdate`, so the current snake_case `last_update` response becomes `None`; only `enabled` is read.
- Config service publishes no events and runs no scheduled jobs. The AMQP dependency has no config-service producer or
  consumer in source.
- The only config-service test is an environment-dependent Spring context smoke test. No operation, mapper, repository,
  contract, mobile, or scraper parity test was found.

## 1. Runtime Boundary Summary

| Boundary                | Current owner                 | Entry mechanism                 | Callers / producers                 | Consumers                                                       | Auth                                                                   | Data owner                        | Evidence                                                                               | Status   |
| ----------------------- | ----------------------------- | ------------------------------- | ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| App status              | config-service                | REST                            | mobile-gateway                      | Expo session, maintenance, update-required, admin               | Config GET authenticated; PUT `update:maintenance`; BFF GET public     | PostgreSQL `app_status`           | `AppStatusController.java:16-40`; `SessionProvider.tsx:102-114`; `appVersion.ts:36-57` | `PROVEN` |
| Divisions               | config-service                | REST + multipart + S3           | mobile-gateway, search-worker       | Expo admin and enriched team/pool/match/search views            | Config read/create/update/delete scopes; BFF GET public                | PostgreSQL `division`; S3 logo    | `DivisionController.java:26-103`; `ConfigClientService.java:62-125`                    | `PROVEN` |
| Legal documents         | config-service                | REST                            | mobile-gateway                      | Expo profile/legal reader and editor                            | Config GET public; PUT `update:legal`; BFF GET public                  | PostgreSQL `legal_documents`      | `LegalDocumentController.java:17-45`; `LegalDocumentScreen.tsx:20-87`                  | `PROVEN` |
| Raw division mappings   | config-service                | REST                            | competition scraper, mobile-gateway | scraper pool creation; Expo mapping administration              | Config create/read/update scopes; BFF authenticated                    | PostgreSQL `raw_division_mapping` | `RawDivisionMappingController.java:20-78`; scraper `api/config_api.py:12-45`           | `PROVEN` |
| Scraper switches        | config-service                | REST                            | two scrapers, mobile-gateway        | scraper schedulers; Expo admin                                  | Config status GET authenticated; update/list scoped; BFF authenticated | PostgreSQL `scraper_status`       | `ScraperStatusController.java:21-57`; both scraper `main.py` files                     | `PROVEN` |
| Division search cache   | search-worker                 | REST bootstrap + 10-minute poll | config-service division list        | search cache/index projections                                  | M2M client                                                             | In-memory worker cache            | `CacheInitializerService.java:80-94`; `ConfigCacheJob.java:23-45`                      | `PROVEN` |
| Division BFF enrichment | mobile-gateway                | REST lookup + Spring cache      | config-service division get/list    | team, pool, match, notification, search-related BFF projections | forwarded user JWT or M2M                                              | BFF projection only               | gateway `TeamService`, `PoolService`, `MatchService`, `NotificationService` call sites | `PROVEN` |
| S3 logo object          | config-service infrastructure | AWS SDK                         | division create/update              | division response consumers                                     | static AWS credentials                                                 | configured S3 bucket              | `S3StorageClientService.java:28-60`                                                    | `PROVEN` |

The actual production value of `CONFIG_API_URL` is `UNKNOWN`. Every checked-in `.env.example` uses
`http://localhost:8090`, while all clients append only `/divisions`, `/raw-divisions`, or `/scrapers/...` and the
controllers are rooted at `/api/v1/config/**`. A production value containing the path prefix would work; the examples
as committed would call unmapped root paths.

## 2. REST Operation Inventory

Springdoc annotations provide summaries but no explicit operation IDs or authoritative schemas. Request and response
names below describe implementation classes, not approved contract names.

| Entry ID    | Method and path                              | Auth at config service        | Request                                        | Success response                             | Current exceptional behavior                                                             | Callers                        | Status   |
| ----------- | -------------------------------------------- | ----------------------------- | ---------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ | -------- |
| CFG-REST-01 | `GET /api/v1/config/app-status`              | authenticated                 | none                                           | `200 AppStatusDTO`                           | `404` if seed row absent                                                                 | BFF public facade              | `PROVEN` |
| CFG-REST-02 | `PUT /api/v1/config/app-status`              | `update:maintenance`          | partial `AppStatusUpdateDTO`                   | `200 AppStatusDTO`                           | `404`; malformed body becomes generic `500`                                              | BFF secure facade / Expo admin | `PROVEN` |
| CFG-REST-03 | `GET /api/v1/config/divisions`               | `read:divisions`              | none                                           | `200 List<Division entity>`                  | repository/runtime failure becomes `500`                                                 | BFF, search-worker             | `PROVEN` |
| CFG-REST-04 | `GET /api/v1/config/divisions/{id}`          | `read:divisions`              | `id`                                           | `200 Division entity`                        | `404` when absent                                                                        | BFF enrichment, search-worker  | `PROVEN` |
| CFG-REST-05 | `POST /api/v1/config/divisions`              | `create:divisions`            | multipart string part `data`; optional `image` | `201 Division entity` + `Location`           | duplicate name `400`; oversized request `413`; invalid JSON/image/upload generally `500` | BFF / Expo admin               | `PROVEN` |
| CFG-REST-06 | `PUT /api/v1/config/divisions/{id}`          | `update:divisions`            | same multipart shape                           | `200 Division entity`                        | absent `404`; invalid JSON/image/upload generally `500`                                  | BFF / Expo admin               | `PROVEN` |
| CFG-REST-07 | `DELETE /api/v1/config/divisions/{id}`       | `delete:divisions`            | `id`                                           | `204`                                        | absent `404`                                                                             | BFF / Expo admin               | `PROVEN` |
| CFG-REST-08 | `GET /api/v1/config/legal/{type}`            | public                        | raw string `type`                              | `200 LegalDocument entity`                   | missing document is caught by generic handler as `500`, despite Springdoc claiming `404` | BFF public / Expo profile      | `PROVEN` |
| CFG-REST-09 | `PUT /api/v1/config/legal/{type}`            | `update:legal`                | partial `LegalDocumentUpdateDTO`               | `200 LegalDocument entity`                   | missing document becomes `500`                                                           | BFF / Expo editor              | `PROVEN` |
| CFG-REST-10 | `POST /api/v1/config/raw-divisions`          | `create:raw_division_mapping` | complete `RawDivisionMapping entity`           | `201 RawDivisionMapping entity` + `Location` | DB/enum/deserialization failures become `500`                                            | scraper, BFF                   | `PROVEN` |
| CFG-REST-11 | `GET /api/v1/config/raw-divisions`           | `read:raw_division_mapping`   | optional `league_code`, `season`               | `200 List<RawDivisionMapping entity>`        | no explicit error translation                                                            | scraper, BFF / Expo admin      | `PROVEN` |
| CFG-REST-12 | `GET /api/v1/config/raw-divisions/{id}`      | `read:raw_division_mapping`   | `id`                                           | `200 RawDivisionMapping entity`              | absent `404`                                                                             | BFF / Expo admin               | `PROVEN` |
| CFG-REST-13 | `PUT /api/v1/config/raw-divisions/{id}`      | `update:raw_division_mapping` | `RawDivisionMappingUpdateDTO`                  | `200 RawDivisionMapping entity`              | absent `404`; invalid enum/body `500`                                                    | BFF / Expo admin               | `PROVEN` |
| CFG-REST-14 | `GET /api/v1/config/scrapers/{name}/status`  | authenticated                 | `ScraperName` path enum                        | `200 ScraperStatus entity`                   | absent `404`; invalid enum generally `500`                                               | both scrapers                  | `PROVEN` |
| CFG-REST-15 | `PUT /api/v1/config/scrapers/{name}/enabled` | `update:scrapers`             | `enabled` query boolean                        | `200 ScraperStatus entity`                   | missing row is created; invalid enum/query binding generally `500` or framework response | BFF / Expo admin               | `PROVEN` |
| CFG-REST-16 | `GET /api/v1/config/scrapers/status`         | `read:scrapers`               | none                                           | `200 List<ScraperStatus entity>`             | unordered repository result                                                              | BFF / Expo admin               | `PROVEN` |

List operations use unwrapped arrays and repository order. There is no pagination. `DivisionService.findAll()` explicitly
returns active and inactive rows. `RawDivisionMappingRepository` applies exact optional league/season equality filters.

## 3. Event and Scheduled Entry Inventory

| Entry ID   | Kind      | Producer            | Consumer               | Payload         | Behavior                                                                               | Evidence                                      | Status   |
| ---------- | --------- | ------------------- | ---------------------- | --------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- | -------- |
| CFG-EVT-01 | RabbitMQ  | none found          | none found             | none            | AMQP dependency exists but no config-service event code exists                         | config-service `pom.xml:28-31`; source search | `PROVEN` |
| CFG-JOB-01 | Scheduled | search-worker       | config-service REST    | division array  | refreshes division cache every 600,000 ms; logs and retains current cache on exception | `ConfigCacheJob.java:23-45`                   | `PROVEN` |
| CFG-JOB-02 | Scheduled | competition scraper | status GET then scrape | `ScraperStatus` | skips the run on disabled status or any status-fetch exception                         | competition scraper `main.py:55-109`          | `PROVEN` |
| CFG-JOB-03 | Scheduled | club scraper        | status GET then scrape | `ScraperStatus` | returns false and skips on disabled status or any exception                            | club scraper `main.py:28-50`                  | `PROVEN` |

## 4. Type Inventory

| Type ID      | Class or shape                               | Current role                                | Owner               | Constructed by            | Consumed by                     | Serialized                                    | Duplicate family       | Status   |
| ------------ | -------------------------------------------- | ------------------------------------------- | ------------------- | ------------------------- | ------------------------------- | --------------------------------------------- | ---------------------- | -------- |
| CFG-AS-E     | `AppStatus`                                  | JPA entity                                  | config-service      | Flyway/JPA                | `AppStatusService`              | no direct controller exposure                 | app status             | `PROVEN` |
| CFG-AS-R     | `AppStatusDTO`                               | handwritten response DTO                    | config-service      | private `toDto`           | controller/BFF                  | snake_case                                    | app status             | `PROVEN` |
| CFG-AS-U     | `AppStatusUpdateDTO`                         | handwritten partial request                 | config-service      | Jackson                   | service                         | snake_case annotations + global policy        | app status update      | `PROVEN` |
| CFG-DIV-E    | `Division`                                   | JPA entity and REST response                | config-service      | service/JPA               | controllers, BFF, worker        | snake_case                                    | division               | `PROVEN` |
| CFG-DIV-U    | `DivisionUpdateDTO`                          | multipart JSON request                      | config-service      | controller `ObjectMapper` | service                         | snake_case                                    | division update        | `PROVEN` |
| CFG-LEG-E    | `LegalDocument`                              | JPA entity and REST response                | config-service      | Flyway/JPA                | controller/BFF                  | snake_case                                    | legal document         | `PROVEN` |
| CFG-LEG-U    | `LegalDocumentUpdateDTO`                     | partial request                             | config-service      | Jackson                   | service                         | snake_case global policy                      | legal update           | `PROVEN` |
| CFG-RAW-E    | `RawDivisionMapping`                         | JPA entity, REST request, REST response     | config-service      | scraper/BFF/Jackson/JPA   | service, scraper, BFF           | snake_case                                    | raw mapping            | `PROVEN` |
| CFG-RAW-U    | `RawDivisionMappingUpdateDTO`                | update request                              | config-service      | Jackson                   | service                         | snake_case global policy                      | raw mapping update     | `PROVEN` |
| CFG-SCR-E    | `ScraperStatus`                              | JPA entity and REST response                | config-service      | Flyway/service/JPA        | scrapers/BFF                    | snake_case                                    | scraper status         | `PROVEN` |
| CFG-ENUM-\*  | `Format`, `Gender`, `ScraperName`            | local boundary + persistence enums          | config-service      | source/Jackson/JPA        | raw mapping/scraper paths       | enum strings                                  | shared enum candidates | `PROVEN` |
| BFF-AS-\*    | gateway `AppStatusDTO`, `AppStatusUpdateDTO` | copied downstream and BFF DTOs              | mobile-gateway      | Jackson/Expo              | config client/controller        | snake_case                                    | app status             | `PROVEN` |
| BFF-DIV-\*   | gateway `DivisionDTO`, `DivisionUpdateDTO`   | copied downstream, BFF, embedded projection | mobile-gateway      | Jackson/Expo              | config client and BFF workflows | snake_case                                    | division               | `PROVEN` |
| BFF-LEG-\*   | gateway legal DTOs                           | copied downstream and BFF DTOs              | mobile-gateway      | Jackson/Expo              | config client/controller        | snake_case                                    | legal document         | `PROVEN` |
| BFF-RAW-\*   | gateway raw mapping DTOs                     | copied downstream and BFF DTOs              | mobile-gateway      | Jackson/Expo              | config client/controller        | snake_case                                    | raw mapping            | `PROVEN` |
| BFF-SCR-R    | gateway `ScraperStatusDTO`                   | copied downstream and BFF DTO               | mobile-gateway      | Jackson                   | Expo admin                      | snake_case                                    | scraper status         | `PROVEN` |
| SW-DIV-R     | worker `DivisionDTO`                         | copied downstream DTO                       | search-worker       | Jackson                   | cache bootstrap/job             | snake_case                                    | division               | `PROVEN` |
| MOB-AS-\*    | Expo `AppStatusDTO`, `AppStatusUpdateDTO`    | transport types                             | mobile              | HTTP conversion           | session/admin/update flows      | camelCase in app; snake_case wire             | app status             | `PROVEN` |
| MOB-DIV-R    | Expo `Division`                              | transport + UI model                        | mobile              | HTTP conversion           | admin and product UI            | camelCase in app                              | division               | `PROVEN` |
| MOB-LEG-R    | Expo `LegalDocument`                         | transport + UI/edit model                   | mobile              | HTTP conversion           | profile/legal UI                | camelCase in app                              | legal document         | `PROVEN` |
| MOB-RAW-R    | Expo `RawDivisionMapping`                    | transport + admin model                     | mobile              | HTTP conversion           | mapping UI                      | camelCase in app                              | raw mapping            | `PROVEN` |
| MOB-SCR-R    | Expo `ScraperStatus`                         | transport + admin model                     | mobile              | HTTP conversion           | scraper controls                | camelCase in app                              | scraper status         | `PROVEN` |
| PY-RAW-R     | Python `RawDivisionMapping`                  | transport + scraper application model       | competition scraper | dataclass converter       | four scraper families           | snake_case                                    | raw mapping            | `PROVEN` |
| PY-SCR-R1/R2 | Python `ScraperStatus` copies                | transport model                             | both scrapers       | dataclass converter       | run gates                       | mixed: three snake-safe fields + `lastUpdate` | scraper status         | `PROVEN` |

No stable immutable application command/view records, explicit domain model, generated DTO, or dedicated API mapper
exists in config-service.

## 5. Field-Lineage Matrix

The rows below cover every field in each duplicate family. `Shapes` lists all types that carry the same field; a noted
exception means a field is absent from that member.

### App Status

| Field                | Shapes                                            | Current wire           | Target wire          | Producer / validation / default             | Proven consumers                        | Persistence / conversion                      | Classification     | Status   |
| -------------------- | ------------------------------------------------- | ---------------------- | -------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------------------- | ------------------ | -------- |
| `id`                 | CFG-AS-E only                                     | not exposed            | not applicable       | identity                                    | repository selection/logging            | `app_status.id`                               | `PERSISTENCE_ONLY` | `PROVEN` |
| `maintenance`        | all AS response/update/entity shapes              | `maintenance`          | `maintenance`        | DB/default false; update only when non-null | session route gate, maintenance admin   | boolean column; copied through BFF            | `REQUIRED`         | `PROVEN` |
| `message`            | all AS shapes                                     | `message`              | `message`            | nullable; update ignores null               | maintenance screen/admin                | varchar(1024)                                 | `REQUIRED`         | `PROVEN` |
| `imageUrl`           | all AS shapes                                     | `image_url`            | `imageUrl`           | nullable; update ignores null               | maintenance image/admin                 | `image_url`; annotations and case converters  | `REQUIRED`         | `PROVEN` |
| `minVersionIos`      | all AS shapes                                     | `min_version_ios`      | `minVersionIos`      | nullable; update ignores null               | iOS forced-update calculation/admin     | `min_version_ios`; annotations/converters     | `REQUIRED`         | `PROVEN` |
| `minVersionAndroid`  | all AS shapes                                     | `min_version_android`  | `minVersionAndroid`  | nullable; update ignores null               | Android forced-update calculation/admin | `min_version_android`                         | `REQUIRED`         | `PROVEN` |
| `storeUrlIos`        | all AS shapes                                     | `store_url_ios`        | `storeUrlIos`        | nullable; update ignores null               | iOS store link/admin                    | `store_url_ios`                               | `REQUIRED`         | `PROVEN` |
| `storeUrlAndroid`    | all AS shapes                                     | `store_url_android`    | `storeUrlAndroid`    | nullable; update ignores null               | Android store link/admin                | `store_url_android`                           | `REQUIRED`         | `PROVEN` |
| `forceUpdateMessage` | all AS shapes                                     | `force_update_message` | `forceUpdateMessage` | nullable; update ignores null               | update-required copy/admin              | `force_update_message`                        | `REQUIRED`         | `PROVEN` |
| `lastUpdate`         | response/entity shapes; absent from update shapes | `last_update`          | `lastUpdate`         | JPA `@PrePersist/@PreUpdate`                | both admin cards display it             | `TIMESTAMPTZ`; manual `toDto` then converters | `REQUIRED`         | `PROVEN` |

Expo sends explicit nulls when clearing minimum versions, store URLs, and forced-update copy, but
`AppStatusService.updateStatus` treats null as “do not change.” The UI therefore cannot clear these stored values using
the current operation. Maintenance disable intentionally sends `undefined` for message/image and preserves them.

### Division

| Field                 | Shapes                                                            | Current wire            | Target wire           | Producer / validation / default                                 | Proven consumers                                 | Persistence / conversion                 | Classification     | Status   |
| --------------------- | ----------------------------------------------------------------- | ----------------------- | --------------------- | --------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------ | -------- |
| `id`                  | CFG-DIV-E, BFF-DIV-R, SW-DIV-R, MOB-DIV-R                         | `id`                    | `id`                  | identity                                                        | admin actions/order, BFF joins, worker cache     | `division.id`                            | `REQUIRED`         | `PROVEN` |
| `name`                | all division response/update shapes                               | `name`                  | `name`                | DB non-null/unique; Expo Yup required; no server DTO validation | admin, labels, search cache, enriched UI         | `division.name`                          | `REQUIRED`         | `PROVEN` |
| `mainColor`           | response/update except worker still carries response              | `main_color`            | `mainColor`           | DB non-null; Expo Yup required                                  | badges, borders, maps, admin                     | `main_color`; multipart snake conversion | `REQUIRED`         | `PROVEN` |
| `firstGradientColor`  | same                                                              | `first_gradient_color`  | `firstGradientColor`  | DB non-null; Expo Yup required                                  | match/pool/team gradients and admin              | `first_gradient_color`                   | `REQUIRED`         | `PROVEN` |
| `secondGradientColor` | same                                                              | `second_gradient_color` | `secondGradientColor` | DB non-null; Expo Yup required                                  | same gradient consumers                          | `second_gradient_color`                  | `REQUIRED`         | `PROVEN` |
| `thirdGradientColor`  | same                                                              | `third_gradient_color`  | `thirdGradientColor`  | DB non-null; Expo Yup required                                  | same gradient consumers                          | `third_gradient_color`                   | `REQUIRED`         | `PROVEN` |
| `logoUrl`             | response shapes; absent from update DTO, supplied by `image` part | `logo_url`              | `logoUrl`             | optional S3 upload; cannot explicitly clear without replacement | admin, ranking/pool UI, worker search cache      | `logo_url`; S3 URL                       | `REQUIRED`         | `PROVEN` |
| `active`              | response shapes; service-owned on mutation                        | `active`                | `active`              | DB/default true; delete sets false; update reactivates          | admin filter/status; mapping form limits choices | `division.active`                        | `REQUIRED`         | `PROVEN` |
| `createdAt`           | response/entity shapes                                            | `created_at`            | `createdAt`           | JPA timestamp                                                   | no concrete mobile, BFF, or worker read found    | `division.created_at`                    | `PERSISTENCE_ONLY` | `PROVEN` |
| `lastUpdate`          | response/entity shapes                                            | `last_update`           | `lastUpdate`          | JPA timestamp                                                   | no concrete mobile, BFF, or worker read found    | `division.last_update`                   | `PERSISTENCE_ONLY` | `PROVEN` |

Search-worker copies all nine response fields but projects only `id`, `name`, and `logoUrl` into its division cache.
Gateway embeds the complete copied DTO into pool/team projections even though deep aggregation justification is deferred
to MRG-264 through MRG-266.

### Legal Document

| Field        | Shapes                 | Current wire  | Target wire              | Producer / validation / default                          | Proven consumers                             | Persistence / conversion      | Classification     | Status   |
| ------------ | ---------------------- | ------------- | ------------------------ | -------------------------------------------------------- | -------------------------------------------- | ----------------------------- | ------------------ | -------- |
| `id`         | entity/response shapes | `id`          | `id` if retained         | identity                                                 | no concrete Expo consumer found              | `legal_documents.id`          | `PERSISTENCE_ONLY` | `PROVEN` |
| `type`       | entity/response shapes | `type`        | `type`                   | seeded strings; path controls lookup; no enum validation | selects update path; three profile documents | unique varchar(50)            | `REQUIRED`         | `PROVEN` |
| `title`      | all legal shapes       | `title`       | `title`                  | DB non-null; Expo Yup required; service ignores null     | editor; screen receives separate route title | varchar(255)                  | `REQUIRED`         | `PROVEN` |
| `version`    | all legal shapes       | `version`     | `version`                | DB non-null; Expo Yup required                           | displayed as last-update label and edited    | varchar(20)                   | `REQUIRED`         | `PROVEN` |
| `content`    | all legal shapes       | `content`     | `content`                | DB non-null; Expo Yup required                           | Markdown display/editor                      | text                          | `REQUIRED`         | `PROVEN` |
| `createdAt`  | entity/response shapes | `created_at`  | `createdAt` if retained  | JPA timestamp                                            | no concrete consumer found                   | `legal_documents.created_at`  | `PERSISTENCE_ONLY` | `PROVEN` |
| `lastUpdate` | entity/response shapes | `last_update` | `lastUpdate` if retained | JPA timestamp                                            | no concrete consumer found                   | `legal_documents.last_update` | `PERSISTENCE_ONLY` | `PROVEN` |

GET uses the path string exactly, while PUT normalizes it with `toLowerCase().trim()`. The allowed `terms`, `privacy`,
and `imprint` values exist only in documentation, seed data, and the Expo union; the server path is untyped.

### Raw Division Mapping

| Field             | Shapes                                                     | Current wire        | Target wire              | Producer / validation / default                                             | Proven consumers                                   | Persistence / conversion                | Classification     | Status   |
| ----------------- | ---------------------------------------------------------- | ------------------- | ------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- | ------------------ | -------- |
| `id`              | response/entity/mobile/Python; create entity may accept it | `id`                | `id`                     | identity normally, but direct entity request accepts client value           | Expo edit/order; scraper stores created response   | `raw_division_mapping.id`               | `REQUIRED`         | `PROVEN` |
| `rawDivisionName` | response/entity/mobile/Python; absent update DTO           | `raw_division_name` | `rawDivisionName`        | scraper HTML producer; DB non-null/unique tuple                             | mapping lookup/search/display                      | `raw_division_name`; Python snake field | `REQUIRED`         | `PROVEN` |
| `divisionId`      | all raw shapes                                             | `division_id`       | `divisionId`             | nullable; update always assigns request value                               | mapped-state check; pool/team creation; admin edit | scalar column, no FK                    | `REQUIRED`         | `PROVEN` |
| `format`          | all raw shapes                                             | `format`            | `format`                 | nullable enum; DB check                                                     | mapped-state check; downstream pool/team creation  | string enum                             | `REQUIRED`         | `PROVEN` |
| `gender`          | all raw shapes                                             | `gender`            | `gender`                 | nullable enum; DB check                                                     | mapped-state check; downstream pool/team creation  | string enum                             | `REQUIRED`         | `PROVEN` |
| `leagueCode`      | response/entity/mobile/Python; absent update DTO           | `league_code`       | `leagueCode`             | scraper producer; DB non-null/unique tuple; exact query filter              | scraper partition, UI filter/display               | `league_code`; Python snake field       | `REQUIRED`         | `PROVEN` |
| `season`          | response/entity/mobile/Python; absent update DTO           | `season`            | `season`                 | scraper producer; DB non-null/unique tuple; exact query filter              | scraper partition, UI filter/display               | varchar                                 | `REQUIRED`         | `PROVEN` |
| `createdAt`       | response/entity/mobile/Python                              | `created_at`        | `createdAt` if retained  | JPA timestamp; direct entity request can supply it before persist semantics | no concrete caller read found                      | `created_at`                            | `PERSISTENCE_ONLY` | `PROVEN` |
| `lastUpdate`      | response/entity/mobile/Python                              | `last_update`       | `lastUpdate` if retained | JPA timestamp; direct entity request can supply it                          | no concrete caller read found                      | `last_update`                           | `PERSISTENCE_ONLY` | `PROVEN` |

The Python dataclass types `division_id` as `Optional[str]`, while Java, BFF, and Expo use numeric identifiers. Python
passes the value into pool/team dataclasses that also type division IDs as strings. Runtime JSON numbers are not coerced
by the generic dataclass converter, so the annotation does not describe the observed value reliably.

### Scraper Status

| Field        | Shapes                        | Current wire  | Target wire      | Producer / validation / default           | Proven consumers                  | Persistence / conversion                                  | Classification     | Status   |
| ------------ | ----------------------------- | ------------- | ---------------- | ----------------------------------------- | --------------------------------- | --------------------------------------------------------- | ------------------ | -------- |
| `id`         | all response/entity shapes    | `id`          | `id` if retained | identity                                  | no Expo or scraper logic reads it | `scraper_status.id`                                       | `PERSISTENCE_ONLY` | `PROVEN` |
| `name`       | all shapes                    | `name`        | `name`           | `ScraperName`; DB unique/check            | Expo key/label/update path        | enum string                                               | `REQUIRED`         | `PROVEN` |
| `enabled`    | all shapes                    | `enabled`     | `enabled`        | DB default true, seed false; update value | both run gates and Expo toggle    | boolean column                                            | `REQUIRED`         | `PROVEN` |
| `lastUpdate` | Java/BFF/mobile/Python shapes | `last_update` | `lastUpdate`     | JPA timestamp                             | no current behavior reads it      | `last_update`; Python field-name mismatch produces `None` | `PERSISTENCE_ONLY` | `PROVEN` |

### Enums

| Enum        | Values                     | Current copies                                   | Consumers                              | Classification | Status   |
| ----------- | -------------------------- | ------------------------------------------------ | -------------------------------------- | -------------- | -------- |
| Format      | `SIX`, `FOUR`, `TWO`       | config-service, gateway, Expo; Python strings    | raw mapping and pool/team construction | `REQUIRED`     | `PROVEN` |
| Gender      | `M`, `F`, `O`              | config-service, gateway, Expo; Python strings    | raw mapping and pool/team construction | `REQUIRED`     | `PROVEN` |
| ScraperName | `SCRAPER`, `SCRAPER_CLUBS` | config-service, Expo; gateway/Python use strings | status paths and admin                 | `REQUIRED`     | `PROVEN` |

These are provisional shared-contract enum candidates. MRG-268 must approve ownership before generation.

## 6. Construction, Mapping, and Conversion Inventory

| ID         | Source                    | Target                              | Mechanism                                                                      | Field behavior                                                   | Proposed boundary owner                  | Status   |
| ---------- | ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------- | -------- |
| CFG-MAP-01 | `AppStatus` entity        | config response                     | private manual builder                                                         | excludes `id`; copies nine fields                                | config API mapper after target approval  | `PROVEN` |
| CFG-MAP-02 | app update DTO            | existing entity                     | eight guarded setters                                                          | null means “unchanged,” so values cannot be cleared              | application command mapper/use case      | `PROVEN` |
| CFG-MAP-03 | division multipart `data` | update DTO                          | controller `ObjectMapper.readValue`                                            | global snake policy + redundant field annotations                | generated API request then API mapper    | `PROVEN` |
| CFG-MAP-04 | division update DTO       | entity                              | builder on create; guarded setters on update                                   | image separately owns `logoUrl`; update reactivates inactive row | application command + persistence mapper | `PROVEN` |
| CFG-MAP-05 | division entity           | REST/BFF                            | direct Jackson serialization/deserialization                                   | every persistence field leaks to transport                       | explicit response mapper                 | `PROVEN` |
| CFG-MAP-06 | legal entity              | REST/BFF                            | direct Jackson                                                                 | audit fields leak; missing exception translation                 | explicit response mapper                 | `PROVEN` |
| CFG-MAP-07 | raw entity                | REST request/response               | direct Jackson + repository `save`                                             | client may send persistence/audit fields on create               | create request mapper                    | `PROVEN` |
| CFG-MAP-08 | raw update DTO            | entity                              | three unconditional setters                                                    | explicit null unmaps a row                                       | application command mapper/use case      | `PROVEN` |
| CFG-MAP-09 | scraper entity            | REST/BFF                            | direct Jackson                                                                 | persistence fields leak                                          | explicit response mapper                 | `PROVEN` |
| BFF-MAP-01 | downstream config JSON    | copied gateway DTO                  | Jackson                                                                        | same class is downstream transport and BFF response              | downstream adapter + BFF API mapper      | `PROVEN` |
| BFF-MAP-02 | Expo division form        | BFF multipart JSON                  | `appendJsonSnake`, gateway parse, gateway `MultipartBodyBuilder`, config parse | three serializations; permanent snake conversion                 | generated Expo/BFF contract boundary     | `PROVEN` |
| BFF-MAP-03 | gateway DTO               | embedded team/pool/match projection | direct object reuse                                                            | complete division DTO enters larger BFF projections              | workflow projection mapper               | `PROVEN` |
| SW-MAP-01  | downstream division JSON  | worker copied DTO                   | Jackson annotations + global snake policy                                      | only id/name/logo are projected to cache event                   | worker config adapter                    | `PROVEN` |
| MOB-MAP-01 | Expo JSON objects/params  | BFF wire                            | global `snakecaseKeys`                                                         | transforms all JSON bodies and params                            | remove after camelCase cutover           | `PROVEN` |
| MOB-MAP-02 | BFF JSON                  | Expo types                          | global `camelcaseKeys`                                                         | hides current snake_case transport                               | remove after camelCase cutover           | `PROVEN` |
| PY-MAP-01  | raw mapping JSON          | Python dataclass                    | exact field-name lookup                                                        | depends on snake_case names; no aliasing                         | Python config adapter                    | `PROVEN` |
| PY-MAP-02  | Python raw dataclass      | config request                      | `asdict`-based `to_dict`                                                       | emits snake_case, includes null and audit fields                 | Python config adapter/request model      | `PROVEN` |
| PY-MAP-03  | scraper status JSON       | Python dataclass                    | exact field-name lookup                                                        | `last_update` is discarded because class declares `lastUpdate`   | Python config adapter                    | `PROVEN` |

Mapper inventory result: no MapStruct or dedicated mapper package exists in config-service, mobile-gateway config, or
search-worker config. The manual app-status builder is the only explicit entity/DTO mapping in the service.

## 7. Duplicate-Type Analysis

| Family                    | Members                                                           | Material differences                                                                        | Current reason                            | Provisional disposition                                                     | Status   |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | -------- |
| App status response       | config DTO, gateway DTO, Expo interface                           | gateway adds annotations; Expo optionality differs for store/message fields                 | handwritten transport copies              | separate internal response and BFF response, generated; mobile consumes BFF | `PROVEN` |
| App status update         | config DTO, gateway DTO, Expo interface                           | same fields; null semantics undocumented                                                    | pass-through update                       | separate generated request shapes only if internal/BFF semantics differ     | `PROVEN` |
| Division response         | config entity, gateway DTO, worker DTO, Expo interface            | entity is persistence; worker consumes only 3/9; Expo uses 7/9 directly                     | direct entity exposure and copied clients | internal response, worker adapter view, BFF projections                     | `PROVEN` |
| Division update           | config DTO, gateway DTO, Expo `Partial<Division>`                 | Expo request wrongly permits response-only fields at type level                             | multipart pass-through                    | explicit create/update request types                                        | `PROVEN` |
| Legal response/update     | entity, gateway DTOs, Expo response plus `Partial<LegalDocument>` | Expo update type permits id/type/audit fields, though form sends only title/version/content | pass-through                              | explicit response and update request                                        | `PROVEN` |
| Raw mapping               | entity, gateway DTO, Expo interface, Python dataclass             | Java numeric vs Python string annotation; entity accepted as request                        | scraper/admin share persistence shape     | create/update/response types plus Python adapter model                      | `PROVEN` |
| Scraper status            | entity, gateway DTO, Expo and two Python copies                   | Python timestamp casing mismatch; gateway uses string name                                  | run gate/admin                            | generated response plus Python adapter model                                | `PROVEN` |
| Format/Gender/ScraperName | Java, gateway, Expo, Python strings                               | naming wrappers and type strength differ                                                    | handwritten copies                        | shared contract enum candidates                                             | `PROVEN` |

No object family should be moved to a generic shared-model module. The target internal service and BFF schemas may
share enums while retaining boundary-specific object DTOs.

## 8. Persistence Boundary

| Entity               | Store                  | Identifier / constraints                             | Current API exposure        | Application separation              | Notable behavior                                                                         | Status   |
| -------------------- | ---------------------- | ---------------------------------------------------- | --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| `AppStatus`          | `app_status`           | identity; maintenance non-null                       | mapped to response DTO      | service manipulates entity directly | first row by ascending ID is global singleton; migration inserts one but DB permits many | `PROVEN` |
| `Division`           | `division`             | identity; unique name; colors/name non-null          | direct response             | service builds/mutates entity       | soft delete; any update reactivates; logo object outside DB transaction                  | `PROVEN` |
| `LegalDocument`      | `legal_documents`      | identity; unique type; text fields non-null          | direct response             | service mutates entity              | GET and PUT normalize type differently                                                   | `PROVEN` |
| `RawDivisionMapping` | `raw_division_mapping` | identity; unique raw name/league/season; enum checks | direct request and response | none                                | `division_id` has no FK; `isMapped` derived in entity                                    | `PROVEN` |
| `ScraperStatus`      | `scraper_status`       | identity; unique checked enum name; enabled non-null | direct response             | service mutates/creates entity      | two rows seeded disabled; update can create an absent enum row                           | `PROVEN` |

`createdAt`, `lastUpdate`, identity values, and persistence annotations currently influence wire schemas through entity
exposure. They are persistence concerns unless a later contract decision proves a client need.

## 9. Validation, Error, Cache, and Compatibility Behavior

| ID           | Boundary                 | Current rule / behavior                                                   | Caller expectation or risk                                                                                  | Evidence                                                       | Status   |
| ------------ | ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| CFG-VAL-01   | app update               | all fields optional; null ignored                                         | Expo sends null to clear version/store/message fields, but stored values remain                             | `AppStatusService.java:37-60`; `AdminScreen.tsx:209-217`       | `PROVEN` |
| CFG-VAL-02   | division fields          | Expo Yup requires name/colors; server has no Bean Validation              | non-Expo callers can reach DB errors/500                                                                    | `DivisionForm.tsx:79-85`; DTO has no constraints               | `PROVEN` |
| CFG-VAL-03   | division image           | PNG/JPEG and <=5 MiB checked in service; servlet request also max 5 MB    | `IllegalArgumentException` is not specially handled and becomes 500; request overhead may hit servlet limit | `ImageUtils.java:9-20`; `application.yaml:8-11`                | `PROVEN` |
| CFG-VAL-04   | division duplicate       | service checks case-insensitively; DB uniqueness is case-sensitive        | application and DB uniqueness rules differ                                                                  | `DivisionService.java:57-60`; V2 migration                     | `PROVEN` |
| CFG-VAL-05   | division S3 replace      | old object deleted before new upload completes                            | upload failure can leave DB URL pointing to deleted object                                                  | `DivisionService.java:115-127`                                 | `PROVEN` |
| CFG-VAL-06   | raw create               | JPA entity is request; no input constraints                               | client can provide ID/audit fields and null DB-required fields                                              | controller/service direct save                                 | `PROVEN` |
| CFG-VAL-07   | raw update               | division/format/gender always assigned, including null                    | Expo intentionally supports unmapping; behavior must remain explicit                                        | service setters; `RawDivisionMappingForm.tsx:70-74`            | `PROVEN` |
| CFG-VAL-08   | legal lookup             | GET exact type; PUT lowercases/trims                                      | same visible type can behave differently by method                                                          | `LegalDocumentService.java:26-38`                              | `PROVEN` |
| CFG-ERR-01   | legal missing            | no dedicated exception handler                                            | documented 404 is emitted as generic 500                                                                    | handler list omits `LegalDocumentNotFoundException`            | `PROVEN` |
| CFG-ERR-02   | parse/validation         | generic handler catches JSON, enum, image, persistence, and S3 exceptions | one French five-field map hides stable machine error codes                                                  | `GlobalExceptionHandler.java:92-122`                           | `PROVEN` |
| CFG-CACHE-01 | gateway division list    | list/get cached; update/deactivate evict                                  | create does not evict list, so a prior cached list can omit a newly created division                        | `ConfigClientService.java:62-125`                              | `PROVEN` |
| CFG-CACHE-02 | gateway public app/legal | no cache                                                                  | every request calls downstream; behavior is pass-through                                                    | client methods                                                 | `PROVEN` |
| CFG-CASE-01  | Blockout JSON            | permanent global snake strategies plus annotations and Expo transforms    | canonical camelCase cutover must coordinate all boundaries                                                  | three application YAML files; `HttpClient.ts:40-97`            | `PROVEN` |
| CFG-CASE-02  | multipart                | Expo converts manually, gateway parses and reserializes, config parses    | same fields cross two JSON strings and two ObjectMappers                                                    | `ConfigApi.ts:30-64`; both controllers; `MultipartBodyBuilder` | `PROVEN` |
| CFG-URL-01   | checked-in examples      | base URL omits `/api/v1/config`                                           | local example clients appear to call unmapped paths                                                         | all four `.env.example` files and controller roots             | `PROVEN` |
| CFG-AUTH-01  | BFF secure routes        | gateway requires authentication but not scopes; user JWT is forwarded     | config service enforces operation scopes downstream                                                         | gateway security and `ApiClientService.pickRt`                 | `PROVEN` |
| CFG-AUTH-02  | BFF public routes        | gateway uses M2M because no user JWT                                      | config app/division GET still require authenticated downstream call                                         | gateway public chain and M2M RestTemplate selection            | `PROVEN` |

## 10. Test and Parity Evidence

| Behavior                 | Existing evidence                                 | What it proves                                                        | Missing later parity coverage                                                    | Status   |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| Spring wiring            | `ConfigApplicationTests.contextLoads`             | only context startup when all required environment/dependencies exist | dedicated test profile and deterministic dependencies                            | `PROVEN` |
| REST shapes/casing       | controller, Jackson, DTO/entity source            | implementation-derived current shape                                  | contract snapshot for every operation and error                                  | `PROVEN` |
| App status patch/null    | service source                                    | guarded-setter behavior                                               | tests for omit vs null vs value and UI clearing                                  | `PROVEN` |
| Division multipart       | two controller parsers and two conversion helpers | current multi-hop design                                              | request-part casing, missing/invalid part, image, S3 failure, cache invalidation | `PROVEN` |
| Raw mapping scraper flow | Python source and Java controller                 | producer/consumer fields                                              | numeric ID typing, camelCase adapter, create/update parity                       | `PROVEN` |
| Scraper run gate         | both `main.py` files                              | fail-closed skip behavior                                             | enabled/disabled/not-found/network/error contract tests                          | `PROVEN` |
| Legal flow               | Expo UI + service source                          | content/version display and partial edit                              | 404 mapping, type normalization, validation                                      | `PROVEN` |
| Division consumers       | BFF/worker/mobile source search                   | current field reads                                                   | generated-client adapter and enriched projection parity                          | `PROVEN` |

No matching Java unit/integration tests, frontend tests, or Python tests were found for these boundaries. A source audit
does not prove live S3, Auth0, database, or deployed caller behavior.

## 11. Consumer and Aggregation Extension

| Consumer operation/workflow  | Downstream call                                             | Cardinality/cache                                                 | Fields used or propagated                           | Failure/fallback                                         | Status   |
| ---------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- | -------- |
| BFF config public app status | one GET                                                     | no cache                                                          | all app fields                                      | downstream exception propagates through gateway handling | `PROVEN` |
| BFF config public divisions  | one list GET                                                | `divisions` cache                                                 | complete division DTO                               | null body becomes empty list                             | `PROVEN` |
| BFF config public division   | one GET                                                     | `divisionById` cache                                              | complete division DTO                               | null body can propagate                                  | `PROVEN` |
| BFF config public legal      | one GET                                                     | no cache                                                          | complete legal DTO                                  | downstream exception propagates                          | `PROVEN` |
| BFF secure mutations         | one downstream call each                                    | update/deactivate evict selected division caches; create does not | pass-through DTOs                                   | downstream exception propagates                          | `PROVEN` |
| Team BFF enrichment          | one division lookup for detail; distinct-ID loops for lists | per-ID Spring cache                                               | complete division embedded                          | no explicit fallback at cited call sites                 | `PROVEN` |
| Pool BFF enrichment          | one lookup for detail; distinct-ID loops for lists          | per-ID Spring cache                                               | complete division embedded                          | no explicit fallback at cited call sites                 | `PROVEN` |
| Match BFF enrichment         | distinct division-ID loops                                  | per-ID Spring cache                                               | complete division embedded in pools                 | no explicit fallback at cited call sites                 | `PROVEN` |
| Notification BFF enrichment  | division lookup when notification contains division ID      | per-ID Spring cache                                               | division used in enrichment                         | workflow-specific details deferred to MRG-264            | `PROVEN` |
| Search-worker cache          | list at startup and every ten minutes                       | replaces whole cache                                              | projects id/name/logo only                          | scheduled refresh logs and keeps old cache on exception  | `PROVEN` |
| Competition scraper mappings | list once per league/season; create on missing raw name     | in-memory dict by raw name                                        | all mapping/business fields except audit timestamps | API error aborts relevant scraper path                   | `PROVEN` |
| Both scraper gates           | one status GET per run                                      | none                                                              | enabled only                                        | any error skips run                                      | `PROVEN` |

## 12. Findings and Provisional Target Roles

| Finding | Observation                                                                                                                   | Behavioral risk                                                                  | Follow-up                                        | Status   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| CFG-F01 | Division, legal, raw mapping, and scraper controllers expose entities; raw create accepts an entity                           | persistence changes can silently alter API; client-controlled persistence fields | MRG-268, MRG-301, MRG-401/402                    | `PROVEN` |
| CFG-F02 | Global snake_case, redundant annotations, Expo transforms, and Python exact-name models form one coupled compatibility system | partial casing cutover breaks consumers                                          | MRG-303/304, config contract and consumer slices | `PROVEN` |
| CFG-F03 | App status null means “unchanged,” while admin sends null to clear six fields                                                 | user-visible admin action does not clear stored values                           | preserve then explicitly decide patch semantics  | `PROVEN` |
| CFG-F04 | Legal missing, invalid image/JSON/enum, and many validation failures collapse to generic 500                                  | unstable/error-prone client behavior                                             | target error contract and parity tests           | `PROVEN` |
| CFG-F05 | Checked-in client base URLs do not include the controller prefix                                                              | local examples are internally inconsistent; production value unknown             | deployment inventory MRG-301/304                 | `PROVEN` |
| CFG-F06 | Gateway create-division does not invalidate the cached list                                                                   | newly created division may remain absent until cache expiry/restart              | BFF parity/caching task                          | `PROVEN` |
| CFG-F07 | Server request types have no field validation; Expo is the strongest validation layer                                         | scrapers or other callers can cause DB/runtime errors                            | generated constraints + application validation   | `PROVEN` |
| CFG-F08 | Ten gateway/worker DTO classes and seven Expo/Python transport families mirror service persistence shapes                     | drift, redundant annotations, and ambiguous ownership                            | generated clients and boundary mappers           | `PROVEN` |
| CFG-F09 | Python scraper status timestamp casing does not match current JSON                                                            | `lastUpdate` is always null, currently masked because unused                     | Python adapter/casing migration                  | `PROVEN` |
| CFG-F10 | Springdoc is derived from controllers/entities without explicit operation IDs or source schemas                               | current document cannot safely become authoritative contract                     | MRG-301/305 onward                               | `PROVEN` |
| CFG-F11 | `AppStatus` singleton is selected by first ID but DB permits multiple rows                                                    | configuration owner is implicit                                                  | architecture approval and persistence invariant  | `PROVEN` |
| CFG-F12 | Search-worker copies nine division fields but uses three; BFF embeds the full copy                                            | oversized coupling and duplicated data                                           | worker/BFF projection audits                     | `PROVEN` |

Provisional roles, subject to MRG-268 approval:

| Current family            | Proposed owner                        | Proposed target role                                        | Disposition                                                    | Preconditions                                     | Decision owner |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | -------------- |
| App status REST           | config-service / mobile-gateway       | generated internal response/update plus BFF response/update | split transport from application state                         | patch/null behavior approved                      | MRG-268        |
| Division REST             | config-service                        | generated create/update/response DTOs                       | map to application command/view and JPA entity                 | S3, active/reactivation, cache behavior preserved | MRG-268        |
| Legal REST                | config-service                        | generated response/update DTOs                              | map to application view/entity                                 | type and error semantics approved                 | MRG-268        |
| Raw mapping REST          | config-service                        | generated create/update/response DTOs                       | remove entity input/output; keep scraper adapter               | numeric typing and casing coexistence approved    | MRG-268        |
| Scraper status REST       | config-service                        | generated response and explicit update operation            | map entity to view                                             | fail-closed scraper behavior preserved            | MRG-268        |
| Format/Gender/ScraperName | shared contracts                      | generated shared enums                                      | retire local copies after consumers migrate                    | all generators support values                     | MRG-268        |
| Gateway config copies     | owning BFF workflows/infrastructure   | generated downstream client DTOs + BFF API projections      | map immediately at adapters                                    | BFF contracts defined                             | MRG-268        |
| Worker division copy      | search-worker infrastructure          | generated client DTO + minimal cache view                   | project id/name/logo                                           | worker audit confirms needs                       | MRG-268        |
| Expo config types         | mobile-local transport/query boundary | Orval-generated BFF client and DTOs                         | keep TanStack mobile-local                                     | BFF contract and Orval slice ready                | MRG-268        |
| Python config models      | scraper infrastructure adapter        | generated or explicit adapter models                        | Python identifiers may stay snake_case; wire becomes camelCase | coexistence matrix approved                       | MRG-268        |

## 13. Unknowns and Required Follow-up Evidence

| Unknown                                                               | Evidence checked                  | Required evidence                                                         | Blocking later task?                              |
| --------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Actual deployed `CONFIG_API_URL` values                               | all committed config and examples | deployment environment/export for gateway, worker, and scrapers           | yes, MRG-301/304                                  |
| External callers bypassing BFF                                        | complete monorepo search          | production access logs, API consumer registry, standalone repo comparison | yes before field removal                          |
| Live app-status row count and values                                  | migration/entity/repository       | production-safe DB observation                                            | yes before singleton invariant change             |
| Live raw mapping field formats and numeric division ID representation | migrations and source             | production-safe sample/schema query                                       | yes before Python type/casing cutover             |
| Deployed Springdoc shapes                                             | annotations/config/source         | captured `/v3/api-docs` from safe environment                             | useful for MRG-301 evidence, not target authority |
| S3 replacement failure behavior in production                         | source only                       | safe integration test or telemetry                                        | yes before storage refactor                       |
| Cache TTL/manager runtime behavior                                    | annotations and cache config      | runtime configuration/metrics                                             | yes before cache behavior change                  |
| Auth0 M2M permissions used by public BFF and scrapers                 | security/client source            | tenant client grants or decoded safe test token                           | yes before auth contract migration                |

## 14. Audit Completion Checklist

- [x] Every in-scope REST, scheduled, persistence, S3, BFF, mobile, scraper, and worker boundary is inventoried.
- [x] Every in-scope type family and field is represented in the type and field-lineage matrices.
- [x] Current snake_case and proposed camelCase Blockout wire names are explicit.
- [x] Producers, consumers, validation, defaults, derivations, persistence, and conversions are cited.
- [x] Direct entity exposure and missing mapper boundaries are explicit.
- [x] Duplicated shapes are grouped without assuming object DTOs should be shared.
- [x] Config-related BFF and worker call patterns are recorded; deep workflow audits remain routed to their roadmap tasks.
- [x] Existing tests and missing behavioral parity evidence are recorded.
- [x] Every field has a primary classification.
- [x] Inferences and unknown production evidence are explicit.
- [x] Target roles remain provisional and route to MRG-268.
- [x] No runtime or generated artifact changed.

## Downstream Handoff

- MRG-267 must merge these division, raw mapping, enum, and scraper-status duplicates into the cross-service matrix.
- MRG-268 must decide patch/null semantics, boundary DTOs, application records/views, mapper ownership, and singleton
  invariants before implementation.
- MRG-301 must record all 16 operations, the real deployed base URLs, current snake_case names, security, multipart,
  list ordering, and errors.
- MRG-303 must include the gateway/search-worker handwritten clients, both Expo case converters, multipart conversion,
  all redundant Jackson annotations, and both Python dataclass converters.
- MRG-304 must sequence gateway, worker, Expo, and both scrapers so canonical camelCase does not break status gates or
  raw mapping creation.
- Contract and Java restructuring tasks must preserve maintenance/update routing, scraper fail-closed behavior,
  division enrichment, legal rendering, S3 ownership, soft delete/reactivation, and raw mapping semantics until an
  approved task changes them deliberately.
