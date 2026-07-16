# MRG-303 Handwritten Client And Casing Inventory

- Status: current-source discovery baseline
- Inventory date: 2026-07-17
- Runtime effect: none
- Contract authority: none; MRG-301 remains the deployed REST wire inventory and source OpenAPI fragments remain the
  future authority
- Evidence base: committed monorepo source at `e262a3c5b9783dd966ae68124e9e6b6978ce9913`

## Purpose

This inventory freezes every current handwritten Blockout HTTP boundary and casing mechanism that must be replaced,
contained, or deliberately retained during contract-first migration. It covers:

- backend internal-service HTTP transports and typed wrappers;
- backend external HTTP and SDK-backed integrations that must remain vendor adapters;
- the complete Expo API layer, its transport support, and direct external HTTP;
- every Python request builder for Blockout and provider-owned wires;
- every global Jackson naming strategy and every explicit Jackson naming annotation;
- every active or installed Expo case-conversion mechanism.

This document assigns future ownership. It does not generate a client, change a payload, remove a converter, or alter
runtime behavior. MRG-304 still owns coexistence, deployment order, compatibility reads, and rollback.

## 1. Inventory Rules

The classifications in this document are closed:

- `GENERATED INTERNAL` means an OpenAPI-generated client at the consuming service adapter, mapped immediately to a
  local application contract.
- `GENERATED BFF` means Orval output owned by `apps/frontend/mobile`, using the mobile-owned auth/error mutator and
  TanStack Query boundary selected by MRG-313.
- `TYPED SCRAPER` means the generated-client, generated-model, or typed-adapter option selected by MRG-314. Python
  application identifiers remain snake_case while the Blockout wire becomes camelCase.
- `EXTERNAL ADAPTER` means provider-owned casing and SDK/HTTP models remain isolated behind the owning infrastructure
  adapter. No Blockout OpenAPI client is generated for that provider.
- `REMOVE AFTER GATE` means the source has no proven caller or is only a compatibility mechanism. Removal still waits
  for MRG-267 lineage gates and the task named in this inventory.

Generated transport objects never become application views, JPA entities, Elasticsearch documents, caches, mobile
view models, forms, or scraper domain dataclasses.

## 2. Summary

| Surface                                            |             Current inventory | Target disposition                                                                                |
| -------------------------------------------------- | ----------------------------: | ------------------------------------------------------------------------------------------------- |
| Backend internal HTTP client classes               |                            25 | generated internal clients plus adapter-local mapping                                             |
| Backend direct or SDK-backed external integrations |                            14 | explicit vendor adapters; never Blockout-generated clients                                        |
| Backend `RestTemplate` configuration classes       |                             7 | retire with the last owning handwritten transport, except vendor-specific transport configuration |
| Backend internal endpoint property classes         |                             5 | retain typed base URLs only as generated-client adapter configuration                             |
| Expo resource API modules                          |        9 modules / 48 methods | generated BFF operations, generated schemas, and domain-owned hooks                               |
| Expo API facade                                    |            1 composite facade | retire incrementally after MRG-344 through MRG-347                                                |
| Expo core API files                                |  4 core files plus `index.ts` | replace transport plumbing with the MRG-313 mutator; retain only real error/session policy        |
| Expo direct provider request                       |         1 unused debug helper | remove after MRG-501 confirms no product owner                                                    |
| Scraper Blockout request modules                   |     9 modules / 24 operations | typed/generated scraper adapters selected by MRG-314                                              |
| Scraper provider request sites                     |            5 files / 11 calls | provider/federation adapters with native casing                                                   |
| Jackson global `SNAKE_CASE` settings               |                            12 | remove in MRG-351, MRG-373, MRG-374, and MRG-375 waves                                            |
| Explicit `@JsonProperty` sites                     | 327 annotations in 57 classes | generated camelCase contracts or adapter-local vendor mappings                                    |
| Explicit `@JsonAlias` / `@JsonNaming`              |                         0 / 0 | no current sites to preserve                                                                      |
| Expo casing packages                               |                             3 | remove active packages and the unused package in MRG-353                                          |

## 3. Backend Internal HTTP Clients

### 3.1 Shared Handwritten Transports And Configuration

| Consumer               | Generic transport                        | Transport/config support                                                                               | Authentication behavior                                         | Final owner                                                                                      |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `matches-service`      | `services/clients/ApiClientService.java` | `config/RestTemplatesConfig.java`, `config/ApiClientProperties.java`                                   | forwards the current user JWT                                   | generated users-service outbound adapter; MRG-361, then MRG-423                                  |
| `mobile-gateway`       | `services/clients/ApiClientService.java` | `config/RestTemplateConfig.java`, `config/ApiClientProperties.java`, `security/Auth0TokenManager.java` | selects forwarded user JWT or Auth0 M2M token                   | generated downstream adapters per BFF workflow; MRG-332, MRG-343, MRG-367, MRG-368, then MRG-413 |
| `notification-service` | `services/clients/ApiClientService.java` | `config/RestTemplatesConfig.java`, `config/ApiClientProperties.java`, `config/Auth0TokenManager.java`  | forwarded JWT for current-user lookup and M2M for service reads | generated users/team/pool adapters; MRG-341, MRG-365, MRG-366, then MRG-427/428                  |
| `search-worker`        | `services/clients/ApiClientService.java` | `config/RestTemplateConfig.java`, `config/ApiClientProperties.java`, `config/Auth0TokenManager.java`   | Auth0 M2M token                                                 | generated snapshot adapters in MRG-334/335/336/376; deeper restructuring in MRG-412              |
| `users-service`        | `services/clients/ApiClientService.java` | `config/RestTemplatesConfig.java`, `config/ApiClientProperties.java`                                   | forwards the current user JWT                                   | generated team/pool projection adapters; MRG-363, then MRG-425                                   |

The five generic transports own URL strings, HTTP verbs, `ResponseEntity` handling, ad hoc logging, and legacy error
parsing. They are not reusable target infrastructure. Generated clients replace operation construction; each consuming
adapter owns auth selection, timeout, safe error translation, and mapping to local application contracts.

### 3.2 `mobile-gateway`

| Current client class        | Current operation family                                             | Target adapter and migration task                                                |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ClubClientService`         | club read, logo read, multipart update                               | club workflow outbound adapter; MRG-334 and MRG-367                              |
| `CompetitionClientService`  | team/pool association and ranking reads                              | competition/match workflow outbound adapter; MRG-337, MRG-359, and MRG-368       |
| `ConfigClientService`       | app status, divisions, legal documents, raw mappings, scraper status | legal slice in MRG-332; remaining configuration workflow in MRG-343              |
| `MatchClientService`        | match/day reads, live commands/history/moderation                    | match/live workflow outbound adapter; MRG-338, MRG-361, MRG-362, and MRG-368     |
| `NotificationClientService` | inbox page/count and read/open/delete/token mutations                | notification workflow outbound adapter; MRG-341, MRG-365, and MRG-343            |
| `PoolClientService`         | pool read, bulk read, update                                         | pool workflow outbound adapter; MRG-336 and MRG-367                              |
| `ReportClientService`       | multipart report creation                                            | report workflow outbound adapter; MRG-340 and MRG-343                            |
| `SearchClientService`       | club/team/pool search                                                | search workflow outbound adapter; MRG-342 and MRG-343                            |
| `TeamClientService`         | team read, bulk read, club teams, multipart update                   | team workflow outbound adapter; MRG-335 and MRG-367                              |
| `UserClientService`         | profile update/ensure/delete and favorite mutations                  | user/favorites workflow outbound adapter; MRG-339, MRG-363, MRG-364, and MRG-343 |
| `ApiClientService`          | generic GET/POST/PUT/DELETE and multipart transport                  | delete after every workflow above uses generated clients; final owner MRG-413    |

`MatchClientService.listPendingLiveLinks()` calls `/live-links/pending`, but matches-service exposes no such operation
and source search finds no caller of this method. It is not a contract candidate. MRG-368 removes it after the
MRG-267/MRG-417 unused-code gate; no generated operation may be invented for it.

### 3.3 Other Internal Consumers

| Consumer               | Current class         | Current purpose                                 | Target adapter and migration task                             |
| ---------------------- | --------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `matches-service`      | `UsersClientService`  | resolve the current user for live-link policy   | generated users-service identity/profile adapter; MRG-361     |
| `matches-service`      | `ApiClientService`    | generic forwarded GET/POST transport            | retire with `UsersClientService`; MRG-361                     |
| `notification-service` | `PoolClientService`   | resolve pool data for notification content      | generated pool adapter in MRG-336; deeper work in MRG-366/428 |
| `notification-service` | `TeamClientService`   | resolve team data for notification content      | generated team adapter in MRG-335; deeper work in MRG-366/428 |
| `notification-service` | `UsersClientService`  | resolve the current user for inbox ownership    | generated users-service adapter; MRG-341/365                  |
| `notification-service` | `ApiClientService`    | generic forwarded/M2M GET/POST transport        | retire after the three generated adapters; MRG-366            |
| `users-service`        | `PoolClientService`   | increment/decrement derived pool follower count | generated pool adapter in MRG-336; deeper work in MRG-363/425 |
| `users-service`        | `TeamClientService`   | increment/decrement derived team follower count | generated team adapter in MRG-335; deeper work in MRG-363/425 |
| `users-service`        | `ApiClientService`    | generic GET/POST transport                      | retire after favorite projection clients; MRG-363             |
| `search-worker`        | `ClubClientService`   | active-club snapshot and club lookup            | generated adapter in MRG-334; deeper work in MRG-412          |
| `search-worker`        | `ConfigClientService` | division snapshot and lookup                    | generated adapter in MRG-376; deeper work in MRG-412          |
| `search-worker`        | `PoolClientService`   | active-pool snapshot                            | generated adapter in MRG-336; deeper work in MRG-412          |
| `search-worker`        | `TeamClientService`   | active-team and club-team snapshots             | generated adapter in MRG-335; deeper work in MRG-412          |
| `search-worker`        | `ApiClientService`    | generic M2M GET/POST transport                  | retire after MRG-334/335/336/376 migrate all snapshot clients |

## 4. Backend External Integrations

External integrations do not consume Blockout OpenAPI. Provider casing and SDK types stay inside explicit
infrastructure adapters.

| Owner                  | Current boundary                                                           | Transport/provider                  | Target disposition                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `clubs-service`        | `MapboxClient` + `config/RestTemplateConfig`                               | direct Mapbox geocoding GET         | `EXTERNAL ADAPTER`; move under clubs Mapbox infrastructure in MRG-403; retain provider `place_name` only inside the adapter |
| `mobile-gateway`       | `FfvbPublicController` + `externalRestTemplate`                            | direct FFVB/LNV proxy requests      | `EXTERNAL ADAPTER`; move HTTP out of the controller into the signed federation adapter in MRG-416                           |
| `reports-service`      | `DiscordClientService` + `config/RestTemplateConfig`                       | direct Discord webhook POST         | `EXTERNAL ADAPTER`; MRG-409                                                                                                 |
| `reports-service`      | `GitHubClientService` + `GitHubConfig`                                     | Kohsuke GitHub SDK                  | `EXTERNAL ADAPTER`; MRG-409                                                                                                 |
| `notification-service` | `ExpoPushService` + `ExpoClientProperties`                                 | Expo server SDK                     | `EXTERNAL ADAPTER`; MRG-366/427                                                                                             |
| `mobile-gateway`       | `security/Auth0TokenManager`                                               | Auth0 authentication SDK            | `EXTERNAL ADAPTER`; shared outbound-auth concern, retained until generated adapters own M2M auth                            |
| `notification-service` | `config/Auth0TokenManager`                                                 | Auth0 authentication SDK            | `EXTERNAL ADAPTER`; notification outbound-auth infrastructure in MRG-427                                                    |
| `search-worker`        | `config/Auth0TokenManager`                                                 | Auth0 authentication SDK            | `EXTERNAL ADAPTER`; snapshot outbound-auth infrastructure in MRG-412                                                        |
| `users-service`        | `config/Auth0TokenManager` and direct `ManagementAPI` use in `UserService` | Auth0 authentication/management SDK | `EXTERNAL ADAPTER`; identity adapter in MRG-364/408/426                                                                     |
| `clubs-service`        | `S3StorageClientService`                                                   | AWS S3 SDK                          | `EXTERNAL ADAPTER`; club storage adapter in MRG-403                                                                         |
| `config-service`       | `S3StorageClientService`                                                   | AWS S3 SDK                          | `EXTERNAL ADAPTER`; division storage adapter in MRG-402                                                                     |
| `teams-service`        | `S3StorageClientService`                                                   | AWS S3 SDK                          | `EXTERNAL ADAPTER`; team storage adapter in MRG-404                                                                         |
| `users-service`        | `S3StorageClientService`                                                   | AWS S3 SDK                          | `EXTERNAL ADAPTER`; profile storage adapter in MRG-364/408/426                                                              |
| `reports-service`      | `S3StorageClientService`                                                   | AWS S3 SDK                          | `EXTERNAL ADAPTER`; attachment storage adapter in MRG-340/409                                                               |

The S3, GitHub, Auth0, and Expo SDK wrappers are included to prevent a generated Blockout client from absorbing vendor
models. They are SDK-backed rather than handwritten wire encoders. Their application-facing ports still require
role-owned inputs/results in the named MRG-400 tasks.

## 5. Expo API Layer

### 5.1 Resource Modules

| Module               | Current methods | Current transport shapes                                                       | Generated owner                        |
| -------------------- | --------------: | ------------------------------------------------------------------------------ | -------------------------------------- |
| `ClubApi.ts`         |               2 | public read and secure multipart update                                        | MRG-345                                |
| `ConfigApi.ts`       |              14 | legal, app status, divisions, raw mappings, scraper status; JSON and multipart | legal pilot MRG-333, remainder MRG-344 |
| `MatchApi.ts`        |              10 | match list/detail and live/history/moderation                                  | MRG-346                                |
| `NotificationApi.ts` |               6 | inbox page/count and token/read/open/delete mutations                          | MRG-347                                |
| `PoolApi.ts`         |               3 | detail, bulk summaries, update                                                 | MRG-345                                |
| `ReportApi.ts`       |               1 | multipart report creation                                                      | MRG-347                                |
| `SearchApi.ts`       |               3 | public club/team/pool search                                                   | MRG-347                                |
| `TeamApi.ts`         |               4 | detail, club/bulk summaries, multipart update                                  | MRG-345                                |
| `UserApi.ts`         |               5 | ensure/update/delete account and follow/unfollow                               | MRG-347                                |

The 48 methods map only to the mobile-gateway BFF contract. Expo must not generate clients for internal services.
MRG-328 establishes Orval output and the auth/error mutator. MRG-344 through MRG-347 migrate these modules by workflow;
MRG-353 removes the final casing machinery only after all 48 operations are generated or deliberately removed.

Source search finds no caller beyond the declaration for `ConfigApi.getRawDivisionMappingById()`,
`ConfigApi.createRawDivisionMapping()`, `NotificationApi.getUnreadNotificationsCount()`,
`NotificationApi.markNotificationRead()`, or `NotificationApi.markNotificationOpened()`. These are existing BFF
boundaries, so their deployed compatibility remains governed by MRG-301/MRG-304; they have no proven Expo consumer to
migrate. The owning contract and MRG-267/MRG-417 gates decide whether generated operations remain or are later removed.

### 5.2 Facade And Core Support

| File                  | Current role                                                                                               | Target disposition                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `MobileGatewayApi.ts` | composite facade for the nine resource modules and auth propagation                                        | retire incrementally after MRG-344 through MRG-347; generated operations remain mobile-owned by workflow  |
| `core/HttpClient.ts`  | Axios instances, token attachment, global request snake-casing, response camel-casing, error normalization | MRG-313 selects the Orval mutator; keep real auth/error policy, remove generic case transforms in MRG-353 |
| `core/BaseApi.ts`     | creates public and secure clients for every resource module                                                | retire with handwritten modules in MRG-344 through MRG-347                                                |
| `core/ApiError.ts`    | normalized mobile error object                                                                             | evolve to Problem Details-aware error policy in MRG-313/328; do not delete until all consumers migrate    |
| `core/ApiRegistry.ts` | alternative singleton public/auth registry                                                                 | source search finds no import; remove under MRG-353/MRG-501 after the unused-code gate                    |
| `index.ts`            | constructs `MobileGatewayApi` and propagates auth                                                          | replace with generated-client/mutator composition by the last Expo workflow migration                     |

`src/utils/notifications.ts::sendTestPush()` performs a direct POST to the Expo push provider and has no source caller.
It is not a BFF contract. MRG-501 must confirm it has no deliberate debug owner, then remove it or isolate it as a
development-only `EXTERNAL ADAPTER`; it must never be generated from Blockout OpenAPI.

### 5.3 Casing Mechanisms And Dependencies

| Mechanism                         | Current sites                                                                      | Current behavior                                                                                   | Retirement owner                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `snakecase-keys`                  | `core/HttpClient.ts`, `src/utils/utils.ts`, dependency and lockfile                | deep-converts JSON bodies and query params; also converts multipart JSON through `appendJsonSnake` | MRG-353 after every BFF caller is canonical camelCase                               |
| `camelcase-keys`                  | `core/HttpClient.ts`, dependency and lockfile                                      | deep-converts every JSON response object                                                           | MRG-353 after generated DTO/schema validation is active                             |
| `axios-case-converter`            | dependency and lockfile only                                                       | installed but no source import                                                                     | remove in MRG-353; no compatibility role                                            |
| `transformCase` option            | `HttpClient.ts`, `BaseApi.ts`, `ApiRegistry.ts`                                    | defaults to true and gates both request and response transforms                                    | remove with the handwritten transport in MRG-353                                    |
| `appendJsonSnake`                 | utility plus six calls in club, config (two), report, team, and user modules       | serializes multipart `data` as deep snake_case JSON                                                | generated multipart serializer in MRG-333/344/345/347; delete in MRG-353            |
| explicit snake_case query objects | `ConfigApi.ts` uses `league_code`; `UserApi.ts` uses `entity_type` and `entity_id` | bypasses TypeScript camelCase at call sites                                                        | generated camelCase parameter names in MRG-344/347; delete with handwritten methods |

`axios` and `qs` are transport/serialization dependencies, not casing packages. Their final status belongs to the
MRG-313 generator decision. `axios-retry` is installed but unused; it is not a casing dependency and belongs to the
later mobile architecture audit rather than this migration.

## 6. Python Scraper Request Builders

### 6.1 Blockout-Owned Requests

| Scraper     | Module                    | Operations | Current wire construction                                                                        | Target owner                        |
| ----------- | ------------------------- | ---------: | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| club        | `api/clubs_api.py`        |          3 | list plus create/update multipart; dataclass `to_dict()` is dumped directly into the `data` part | MRG-314 choice, migrated in MRG-348 |
| club        | `api/competitions_api.py` |          1 | bulk JSON with `missing_club_ids`                                                                | MRG-314 choice, migrated in MRG-348 |
| club        | `api/config_api.py`       |          1 | scraper-status read                                                                              | MRG-314 choice, migrated in MRG-348 |
| club        | `api/teams_api.py`        |          1 | unique club-ID read                                                                              | MRG-314 choice, migrated in MRG-348 |
| competition | `api/competitions_api.py` |          5 | association reads, snake_case query, bulk JSON, and stats dataclass JSON                         | MRG-314 choice, migrated in MRG-349 |
| competition | `api/config_api.py`       |          3 | raw-mapping query/creation and scraper-status read                                               | MRG-314 choice, migrated in MRG-349 |
| competition | `api/matches_api.py`      |          4 | pool query, create/update dataclass JSON, bulk JSON                                              | MRG-314 choice, migrated in MRG-349 |
| competition | `api/pools_api.py`        |          3 | league/season query and create/update dataclass JSON                                             | MRG-314 choice, migrated in MRG-349 |
| competition | `api/teams_api.py`        |          3 | create JSON, update multipart JSON, filtered read with manually built query dict                 | MRG-314 choice, migrated in MRG-349 |

The 24 Blockout operations currently expose Python dataclass field names directly. `utils/utils.py::to_dict()` in each
scraper iterates `dataclasses.asdict()` without a wire-name map, so application snake_case becomes JSON snake_case.
`utils/handlers/api_handler.py::convert_to_dataclass()` in each scraper reads response dictionaries by exact dataclass
field name, so it likewise requires snake_case responses. Both directions move behind the typed/generated adapter
selected by MRG-314. The dataclasses and scraper application code remain idiomatic snake_case.

The two `api/auth0.py` files use the Auth0 Python SDK to obtain M2M tokens and build Authorization headers. They are
`EXTERNAL ADAPTER` concerns, not Blockout contract clients. MRG-314 defines how their token supplier is injected into
the chosen Blockout transport without moving Auth0 fields into generated Blockout models.

### 6.2 Provider/Federation Requests

| Scraper     | Current site                                    | Calls | Provider-owned construction                                                      | Target disposition                                                         |
| ----------- | ----------------------------------------------- | ----: | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| club        | `models/scraper.py::fetch()`                    |     1 | FFVB form POST supplied by the club scraper                                      | retain behind the federation scraper adapter; MRG-601                      |
| competition | `models/scraper.py::fetch()`                    |     1 | generic provider page GET                                                        | retain behind the federation scraper adapter; MRG-601                      |
| competition | `utils/file_utils.py::download_and_parse_csv()` |     1 | FFVB CSV export form POST with `cal_*` fields                                    | retain provider casing in an FFVB adapter; MRG-601                         |
| competition | `sse2.py`                                       |     4 | standalone SignalR negotiate/start/send/connect script with provider params/data | no imports found; audit/remove or isolate as an LNV adapter in MRG-601/417 |
| competition | `sse3.py`                                       |     4 | standalone SignalR negotiate/connect/start/send script with provider params/data | no imports found; audit/remove or isolate as an LNV adapter in MRG-601/417 |

Provider forms, SignalR parameters, HTML fields, and federation JSON are explicitly outside Blockout camelCase rules.
They must not pass through the Blockout generated/typed adapter and must not be renamed by a repository-wide casing
guard.

## 7. Jackson Naming Inventory

### 7.1 Global Strategies

Every backend module configures `spring.jackson.property-naming-strategy: SNAKE_CASE` in its main
`application.yaml`:

| Cleanup wave | Modules                                                                      | Removal prerequisite                                                                                  |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| MRG-351      | `config-service`, `clubs-service`, `teams-service`, `pools-service`          | the owning generated servers and every backend/BFF/Expo/scraper caller emit canonical camelCase       |
| MRG-373      | `competition-service`, `matches-service`, `users-service`                    | association/ranking/lifecycle, match/live/moderation, and user/favorite/identity slices are canonical |
| MRG-374      | `reports-service`, `notification-service`, `search-service`, `search-worker` | REST clients, provider adapters, and worker snapshot clients are isolated and canonical               |
| MRG-375      | `mobile-gateway`                                                             | every inbound BFF and outbound internal generated boundary uses camelCase                             |

The settings affect Spring MVC, managed `RestTemplate` converters, multipart `ObjectMapper` parsing, and error
payloads. Current Rabbit configurations construct `Jackson2JsonMessageConverter` with its own default mapper; the
MRG-302 byte probe proves those event bodies are already camelCase. Jackson REST cleanup must therefore remain
separate from event-contract migration. Naming-strategy removal is vertical, never a global config deletion before
REST callers migrate.

### 7.2 `@JsonProperty` Registry

Source contains 327 `@JsonProperty` occurrences across 57 classes. The following registry is exhaustive; the number
after each class is its annotation count.

#### `clubs-service` — 4

- `models/dto/ClubUpdateDTO.java` (4) — Blockout DTO; MRG-334 then MRG-351/352.

#### `competition-service` — 5

- `models/dto/PoolWithRankingDTO.java` (1) — Blockout ranking DTO; MRG-359 then MRG-373/352.
- `models/dto/TeamRankingDTO.java` (4) — Blockout ranking DTO; MRG-359 then MRG-373/352.

#### `config-service` — 10

- `models/dto/AppStatusUpdateDTO.java` (6) — Blockout app-status DTO; MRG-317/376 then MRG-351/352.
- `models/dto/DivisionUpdateDTO.java` (4) — Blockout division DTO; MRG-317/376 then MRG-351/352.

#### `matches-service` — 27

- `models/dto/match/MatchLiveLinkDTO.java` (5) — Blockout live DTO; MRG-361 then MRG-373/352.
- `models/dto/match/MatchLiveSummaryDTO.java` (13) — Blockout live summary; MRG-361 then MRG-373/352.
- `models/dto/users/CustomUserDTO.java` (7) — copied downstream DTO; generated users adapter in MRG-361.
- `models/dto/users/UserFavoriteDTO.java` (2) — copied downstream DTO; generated users adapter in MRG-361.

#### `mobile-gateway` — 220

- `models/dto/club/ClubDTO.java` (6) — MRG-367/375/352.
- `models/dto/club/ClubUpdateDTO.java` (4) — MRG-367/375/352.
- `models/dto/competition/CompetitionAssociationDTO.java` (18) — MRG-368/375/352.
- `models/dto/competition/PoolWithRankingDTO.java` (1) — MRG-368/375/352.
- `models/dto/competition/TeamRankingDTO.java` (4) — MRG-368/375/352.
- `models/dto/config/AppStatusDTO.java` (7) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/config/AppStatusUpdateDTO.java` (6) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/config/DivisionDTO.java` (7) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/config/DivisionUpdateDTO.java` (4) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/config/LegalDocumentDTO.java` (2) — legal slice MRG-332, then MRG-375/352.
- `models/dto/config/RawDivisionMappingDTO.java` (5) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/config/ScraperStatusDTO.java` (1) — remaining configuration MRG-343, then MRG-375/352.
- `models/dto/match/DayPageDTO.java` (3) — MRG-368/375/352.
- `models/dto/match/EnrichedDayPageDTO.java` (3) — MRG-368/375/352.
- `models/dto/match/EnrichedMatchDTO.java` (11) — MRG-368/375/352.
- `models/dto/match/EnrichedMatchLiveLinkDTO.java` (11) — MRG-368/375/352.
- `models/dto/match/EnrichedMatchLiveSummaryDTO.java` (10) — MRG-368/375/352.
- `models/dto/match/MatchDTO.java` (12) — MRG-368/375/352.
- `models/dto/match/MatchLiveLinkDTO.java` (5) — MRG-368/375/352.
- `models/dto/match/MatchLiveLinkResponseDTO.java` (3) — MRG-368/375/352.
- `models/dto/match/MatchLiveSummaryDTO.java` (13) — MRG-368/375/352.
- `models/dto/match/PoolMatchesDTO.java` (1) — MRG-368/375/352.
- `models/dto/notification/EnrichedUserNotificationDTO.java` (10) — MRG-343/375/352.
- `models/dto/notification/EnrichedUserNotificationPageDTO.java` (2) — MRG-343/375/352.
- `models/dto/notification/UserNotificationDTO.java` (9) — MRG-343/375/352.
- `models/dto/notification/UserNotificationPageDTO.java` (2) — MRG-343/375/352.
- `models/dto/pool/EnrichedPoolDTO.java` (6) — MRG-367/375/352.
- `models/dto/pool/PoolDTO.java` (9) — MRG-367/375/352.
- `models/dto/pool/PoolSummaryDTO.java` (3) — MRG-367/375/352.
- `models/dto/pool/PoolUpdateDTO.java` (6) — MRG-367/375/352.
- `models/dto/report/GitHubIssueResponseDTO.java` (1) — generated report workflow in MRG-343; vendor mapping retained
  only in the reports-service adapter.
- `models/dto/report/ReportCreateDTO.java` (5) — generated report workflow in MRG-343; then MRG-375/352.
- `models/dto/team/EnrichedTeamDTO.java` (5) — MRG-367/375/352.
- `models/dto/team/TeamDTO.java` (9) — MRG-367/375/352.
- `models/dto/team/TeamSummaryDTO.java` (2) — MRG-367/375/352.
- `models/dto/team/TeamUpdateDTO.java` (6) — MRG-367/375/352.
- `models/dto/team/TeamWithStatsDTO.java` (5) — MRG-367/375/352.
- `models/dto/user/CustomUserUpdateDTO.java` (3) — MRG-343/375/352.

#### `notification-service` — 15

- `models/dto/pool/PoolDTO.java` (8) — copied downstream DTO; generated pool adapter in MRG-366.
- `models/dto/team/TeamDTO.java` (7) — copied downstream DTO; generated team adapter in MRG-366.

#### `pools-service` — 6

- `models/dto/PoolUpdateDTO.java` (6) — Blockout DTO; MRG-336 then MRG-351/352.

#### `reports-service` — 6

- `models/dto/github/GitHubIssueResponseDTO.java` (1) — provider `html_url`; retain provider name only in the GitHub
  adapter and expose Blockout `htmlUrl` through generated contracts in MRG-340/409.
- `models/dto/report/ReportCreateDTO.java` (5) — Blockout request; MRG-340 then MRG-374/352.

#### `search-worker` — 28

- `models/dto/club/ClubDTO.java` (5) — copied service snapshot; generated adapter MRG-334, then MRG-374/352.
- `models/dto/config/DivisionDTO.java` (7) — copied service snapshot; generated adapter MRG-376, then MRG-374/352.
- `models/dto/pool/PoolDTO.java` (8) — copied service snapshot; generated adapter MRG-336, then MRG-374/352.
- `models/dto/team/TeamDTO.java` (8) — copied service snapshot; generated adapter MRG-335, then MRG-374/352.

#### `teams-service` — 6

- `models/dto/TeamUpdateDTO.java` (6) — Blockout DTO; MRG-335 then MRG-351/352.

`users-service` and `search-service` have no `@JsonProperty`, but their global `SNAKE_CASE` settings still control
Blockout wires. No source class uses `@JsonAlias` or `@JsonNaming`.

### 7.3 Non-Naming Jackson Annotations

These sites are not evidence for retaining snake_case, but they still require boundary review:

- nine `@JsonInclude` classes control null omission across BFF match/pool/report shapes and reports-service GitHub,
  Discord, and report shapes;
- four field-level `@JsonIgnore` sites hide persistence/internal fields in `Match`, `UserFavorite`, and
  `ExpoMessageDTO`;
- six `@JsonIgnoreProperties(ignoreUnknown = true)` classes cover search DTO copies in search-service and the BFF.

Generated contract required/nullable rules replace Blockout DTO null/unknown-field behavior only after parity is
captured. Vendor omission rules remain adapter-local. Entity exposure must be removed rather than preserved with
`@JsonIgnore`.

## 8. Migration And Removal Gates

Every assigned boundary follows this order:

1. MRG-304 records supported old/new callers, compatibility reads, deployment order, rollback, and the last legacy
   version that may send snake_case.
2. The owning source-contract task defines canonical camelCase operation and payload names.
3. The configured generator produces the server/client boundary deterministically.
4. The consuming adapter maps generated transport models immediately to local commands, views, snapshots, or vendor
   inputs.
5. Backend, BFF, Expo, scraper, worker, and external callers migrate in the owning vertical slice.
6. Parity proves auth, errors, nulls, ordering, pagination, multipart bytes, timeouts, and fallback behavior.
7. MRG-351/373/374/375 removes the applicable global naming strategy only after the slice is canonical.
8. MRG-352 removes remaining Blockout-only Jackson annotations; MRG-353 removes Expo transformations and packages.
9. MRG-354 enforces the final allowlist while excluding database, Python identifier, Elasticsearch provider, and
   external-vendor names.

No current handwritten client, casing helper, annotation, or unused method is removed by this inventory.

## 9. Reproducible Evidence

The inventory was reconciled with current source using these searches:

```bash
rg -l --glob '*.java' 'RestTemplate|WebClient|RestClient|HttpClient' apps/backend
find apps/backend -path '*/src/main/java/*' -type f -path '*/services/clients/*.java'
rg -l --glob '*.java' 'S3Client|GitHub|ExpoPushNotificationClient|com\.auth0\.client' apps/backend
find apps/frontend/mobile/src/api -type f
rg -n --glob '*.{ts,tsx,js,json}' 'camelcase-keys|snakecase-keys|axios-case-converter|transformCase|appendJsonSnake'
rg -l --glob '*.py' '(session|self\.session)\.(get|post|put|patch|delete)\(|requests\.(get|post|put|patch|delete)\(' apps/scrapers
rg -n --glob 'application*.{yml,yaml,properties}' 'property-naming-strategy: SNAKE_CASE' apps/backend
rg -n --glob '*.java' '@JsonProperty|@JsonAlias|@JsonNaming' apps/backend
```

Source search also proves no `WebClient`, Spring `RestClient`, Java `HttpClient`, OkHttp, or OpenFeign client exists in
the backend; current direct HTTP uses `RestTemplate`. It proves `ApiRegistry`, `sendTestPush`, `sse2.py`, `sse3.py`, and
`MatchClientService.listPendingLiveLinks()` have no source caller/import outside their declaration files.

## 10. Handoff

- MRG-304 must use this inventory to define the per-boundary support window and rollback order.
- MRG-313 must decide how the mobile mutator preserves current auth/error behavior without case conversion.
- MRG-314 must decide how Python snake_case application models map to canonical camelCase Blockout wires.
- MRG-317 through MRG-376 must not invent the nonexistent `/live-links/pending` operation or model provider APIs as
  Blockout contracts. Existing deployed BFF operations without a proven Expo caller remain governed by MRG-304 until
  their compatibility/removal gate closes.
- MRG-351 through MRG-353 must reconcile their removal searches against the counts and files in this inventory.
- MRG-417 and MRG-501/601 own deletion decisions for unused backend/mobile/scraper artifacts after their evidence
  gates; this inventory alone does not authorize deletion.
