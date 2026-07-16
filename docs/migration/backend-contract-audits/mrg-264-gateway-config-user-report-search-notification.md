# MRG-264 — mobile-gateway configuration, user, report, search, and notification orchestration audit

- Audit date: 2026-07-16
- Commit: `d15a846ca0f9ce7b1207a4eb1ca8a8cc4abd44d8`
- Scope roots: `apps/backend/mobile-gateway`, `apps/frontend/mobile/src`, and the MRG-252, MRG-258 through
  MRG-261, and MRG-263 audit evidence
- Audited workflow: configuration, user, report, search, and notification mobile facade orchestration
- Runtime mutation: none
- Evidence limitations: committed source only; no deployed payload capture, generated Springdoc document, external
  caller inventory, production logs, Auth0 token, cache contents, notification rows, GitHub response, Elasticsearch
  response, or physical mobile-device run was available

## Scope

This audit covers 30 facade operations: 15 configuration operations, five user operations, one report operation, three
search operations, and six notification operations. It follows each controller through its facade service and
handwritten downstream client, then follows the handwritten Expo API, TanStack Query hook, form, screen, provider, or
utility that constructs or consumes the payload. It records every pass-through, aggregation, cache, fallback,
multipart conversion, copied or drifted field, and proven frontend-visible reason for the five response families.

Configuration-service persistence, users-service storage and follow side effects, reports-service vendor adapters,
search-service Elasticsearch behavior, and notification-service persistence and RabbitMQ behavior are not repeated in
full. They remain owned by MRG-252, MRG-258, MRG-259, MRG-261, and MRG-260 respectively and are cited where those
behaviors explain the facade. Club, team, pool, match, competition, ranking, and live projection internals are excluded
because MRG-265 and MRG-266 own their deeper call graphs. MRG-267 owns the cross-service consolidation, and MRG-268
owns the architecture decision.

The current Spring-generated schema remains implementation evidence, not the target contract. Blockout-owned target
REST and event properties are camelCase. Database columns and Python-internal identifiers may remain snake_case behind
explicit adapters. The current gateway-wide snake-case naming strategy, field annotations, Expo deep case conversion,
and multipart-specific conversion are compatibility mechanisms to retire only after parity is proven. Orval-generated
operations, TanStack Query hooks, cache keys, and mobile mutators remain local to Expo because it is the only frontend
application.

Maaatch is a structural reference, not a product template. Its BFF uses source-contract API interfaces, generated
models, application services, gateway ports, explicit mappers, principal providers, and a tested `ProblemDetail`
boundary. Blockout must preserve its current product behavior while applying the relevant separation and contract
discipline; this audit does not approve the final split.

## 1. Runtime Boundary Summary

| Boundary             | Entry and owner                                         | Calls / consumers                                               | Auth                            | Data owner                                              | Current behavior                                                                       | Evidence                                                  | Status           |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| public configuration | `ConfigPublicController` -> `ConfigService`             | config client; session, maintenance/update, divisions, legal UI | inbound anonymous; outbound M2M | config-service                                          | four pass-through reads; division reads are cached in the client                       | controllers/services/clients; Expo config hooks           | `PROVEN`         |
| secure configuration | `ConfigSecureController` -> `ConfigService`             | config client; admin forms and toggles                          | inbound JWT; forwarded JWT      | config-service                                          | eleven pass-through mutations/reads; division multipart is parsed and rebuilt          | same                                                      | `PROVEN`         |
| secure user          | `UserSecureController` -> `UserService`                 | users client; session, profile, favorite hooks                  | inbound JWT; forwarded JWT      | users-service                                           | five pass-through operations; no ownership check in the facade                         | controller/service/client; Expo session/profile/favorites | `PROVEN`         |
| public report        | `ReportPublicController` -> `ReportService`             | reports client; report form                                     | inbound anonymous; outbound M2M | reports-service and its vendor adapters                 | one multipart relay with JSON parse/reserialize and image buffering                    | controller/service/client; `ReportForm`                   | `PROVEN`         |
| public search        | `SearchPublicController` -> `SearchService`             | search client; three search screens                             | inbound anonymous; outbound M2M | search-service / Elasticsearch                          | three list pass-throughs; empty and downstream-swallowed failure converge              | controller/service/client; search hooks/screens           | `PROVEN`         |
| secure notification  | `NotificationSecureController` -> `NotificationService` | notification and config clients; notification screen/provider   | inbound JWT; forwarded JWT      | notification-service; config-service owns division logo | five pass-through operations plus one page enrichment                                  | controller/service/clients; notification hooks/screens    | `PROVEN`         |
| mobile transport     | handwritten Expo API modules and Axios wrapper          | TanStack Query hooks and UI                                     | public or bearer Axios instance | facade contract                                         | deep request snake-casing and response camel-casing; multipart JSON has another helper | `HttpClient`, API modules, hooks                          | `PROVEN`         |
| events / schedules   | none in the gateway scope                               | not applicable                                                  | not applicable                  | downstream services                                     | gateway has no in-scope listener, producer, scheduler, or persistence store            | Java source inventory                                     | `NOT_APPLICABLE` |

The five facade services contain no mapper and no domain or persistence model. Their mutable Lombok DTOs are both
downstream client shapes and mobile responses. Only notification creates a distinct enriched response. Report,
configuration-division, and user-update flows additionally deserialize a stringified multipart JSON part and then
reserialize it for the downstream service.

## 2. REST Operation and Orchestration Inventory

No controller declares a stable OpenAPI operation ID, so every operation ID is `MISSING`. Paths are full facade paths.
Secure calls forward the authenticated user JWT; public calls have no authenticated principal and therefore use M2M.

| Family       | Method and path                                                       | Input                                        | Success                   | Facade steps                                                                    | Expo consumer                                       | Status   |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | -------- |
| config       | GET `/api/v1/mobile/public/config/app-status`                         | none                                         | 200 app status            | one config GET; direct DTO                                                      | session provider and admin                          | `PROVEN` |
| config       | GET `/api/v1/mobile/public/config/divisions`                          | none                                         | 200 array                 | cached one config GET; null body becomes `[]`                                   | division hooks and forms                            | `PROVEN` |
| config       | GET `/api/v1/mobile/public/config/divisions/{id}`                     | long path ID                                 | 200 division              | cached one config GET                                                           | no direct Expo caller found                         | `PROVEN` |
| config       | GET `/api/v1/mobile/public/config/legal/{type}`                       | untyped string path                          | 200 legal document        | one config GET                                                                  | legal-document hook                                 | `PROVEN` |
| config       | PUT `/api/v1/mobile/secure/config/app-status`                         | JSON update                                  | 200 app status            | one config PUT; direct DTO                                                      | admin screen                                        | `PROVEN` |
| config       | POST `/api/v1/mobile/secure/config/divisions`                         | multipart `data`, optional `image`           | 201 division + Location   | parse JSON, rebuild multipart, one config POST                                  | division form                                       | `PROVEN` |
| config       | PUT `/api/v1/mobile/secure/config/divisions/{id}`                     | multipart `data`, optional `image`           | 200 division              | parse/rebuild multipart, one config PUT, cache update/eviction                  | division form                                       | `PROVEN` |
| config       | DELETE `/api/v1/mobile/secure/config/divisions/{id}`                  | long path ID                                 | 204                       | one config DELETE, cache eviction                                               | division item                                       | `PROVEN` |
| config       | POST `/api/v1/mobile/secure/config/raw-divisions`                     | full mapping DTO                             | 201 mapping + Location    | one config POST; response DTO reused as request                                 | API method exists; no caller found                  | `PROVEN` |
| config       | PUT `/api/v1/mobile/secure/config/legal/{type}`                       | JSON update                                  | 200 legal document        | one config PUT                                                                  | legal editor                                        | `PROVEN` |
| config       | GET `/api/v1/mobile/secure/config/raw-divisions`                      | optional `league_code`, season               | 200 array                 | one config GET; null body becomes `[]`                                          | mapping list hook                                   | `PROVEN` |
| config       | GET `/api/v1/mobile/secure/config/raw-divisions/{id}`                 | long path ID                                 | 200 mapping               | one config GET                                                                  | API method exists; no caller found                  | `PROVEN` |
| config       | PUT `/api/v1/mobile/secure/config/raw-divisions/{id}`                 | JSON update                                  | 200 mapping               | one config PUT                                                                  | mapping form                                        | `PROVEN` |
| config       | PUT `/api/v1/mobile/secure/config/scrapers/{name}/enabled`            | required `enabled` query                     | 200 scraper status        | one config PUT                                                                  | admin screen                                        | `PROVEN` |
| config       | GET `/api/v1/mobile/secure/config/scrapers/status`                    | none                                         | 200 array                 | one config GET; null body becomes `[]`                                          | admin screen                                        | `PROVEN` |
| user         | PUT `/api/v1/mobile/secure/users/{auth0Id}`                           | multipart `data`, optional `image`           | 200 user                  | parse/rebuild multipart, one users PUT                                          | profile form                                        | `PROVEN` |
| user         | PUT `/api/v1/mobile/secure/users/me`                                  | none                                         | 200 user                  | one users PUT                                                                   | session bootstrap                                   | `PROVEN` |
| user         | DELETE `/api/v1/mobile/secure/users/me`                               | none                                         | 204                       | one users DELETE                                                                | account-deletion flow                               | `PROVEN` |
| user         | POST `/api/v1/mobile/secure/favorites/follow`                         | `entity_type`, `entity_id` query             | 204                       | subject read for log only; one users POST                                       | follow hooks                                        | `PROVEN` |
| user         | DELETE `/api/v1/mobile/secure/favorites/follow`                       | same                                         | 204                       | subject read for log only; one users DELETE                                     | unfollow hooks                                      | `PROVEN` |
| report       | POST `/api/v1/mobile/public/reports`                                  | multipart `data`, optional repeated `images` | 201 issue response        | parse JSON, rebuild multipart, buffer images, one reports POST                  | report form                                         | `PROVEN` |
| search       | GET `/api/v1/mobile/public/search/clubs`                              | required `query`                             | 200 array; 204 when empty | one search GET; null body becomes `[]`                                          | club search                                         | `PROVEN` |
| search       | GET `/api/v1/mobile/public/search/teams`                              | query + optional filters                     | 200 array; 204 when empty | one search GET; null body becomes `[]`                                          | team search                                         | `PROVEN` |
| search       | GET `/api/v1/mobile/public/search/pools`                              | query + optional filters                     | 200 array; 204 when empty | one search GET; null body becomes `[]`                                          | pool search                                         | `PROVEN` |
| notification | GET `/api/v1/mobile/secure/notifications`                             | page default 0, size default 20              | 200 enriched page         | page GET, distinct metadata division IDs, sequential config fan-out, projection | notification screen                                 | `PROVEN` |
| notification | GET `/api/v1/mobile/secure/notifications/unread-count`                | none                                         | 200 `{unread}`            | one notification GET                                                            | API method exists; declared as `{count}`; no caller | `PROVEN` |
| notification | POST `/api/v1/mobile/secure/notifications/{id}/read`                  | long path ID                                 | 204                       | one notification POST                                                           | API method exists; no caller found                  | `PROVEN` |
| notification | POST `/api/v1/mobile/secure/notifications/{id}/opened`                | long path ID                                 | 204                       | one notification POST                                                           | API method exists; no caller found                  | `PROVEN` |
| notification | DELETE `/api/v1/mobile/secure/notifications/{id}`                     | long path ID                                 | 204                       | one notification DELETE                                                         | optimistic deletion hook                            | `PROVEN` |
| notification | POST `/api/v1/mobile/secure/notifications/users/{userId}/push-tokens` | JSON token request                           | 202                       | one notification POST                                                           | session provider and onboarding utility             | `PROVEN` |

### Operation semantics

- Configuration, user, report, and notification object-returning calls pass a null downstream body onward. Controllers
  can therefore produce a successful empty body, and create controllers can dereference a null ID while building a
  Location header. There is no explicit null policy. `PROVEN`
- Configuration and search list clients replace a null downstream body with `[]`. Search controllers then convert an
  empty array to 204; other list controllers return 200 with `[]`. `PROVEN`
- Search `query` is required by Spring binding but may be blank. Blank is deliberate product behavior: all three
  screens request random examples. Team and pool filters are optional and passed without normalization. `PROVEN`
- No in-scope list has a total count. Notifications use zero-based page/size and downstream `hasNext`/`nextPage`;
  search has no pagination. `PROVEN`
- The gateway does not validate positive page/size, search filter enums, legal type, scraper name, favorite type or ID,
  notification ownership, or authenticated-path identity. Downstream behavior remains the effective rule. `PROVEN`
- HTTP status failures from clients reach the global handler; generic technical failures are normalized to a generic 500. Search-service itself catches Elasticsearch failures and returns an empty list, so the gateway cannot distinguish
  dependency failure from no results. `PROVEN`

## 3. Type and Duplicate-Family Inventory

| Type ID                  | Current shape                        | Role and construction                                      | Duplicate family / difference                                               | Status   |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| `GW-CFG-AS-R`            | `AppStatusDTO`                       | mutable copied config response and BFF response            | service entity/response and Expo interface; gateway adds no projection      | `PROVEN` |
| `GW-CFG-AS-U`            | `AppStatusUpdateDTO`                 | mutable BFF request and copied downstream request          | response minus `lastUpdate`; boxed fields support omission                  | `PROVEN` |
| `GW-CFG-DIV-R`           | `DivisionDTO`                        | copied response, BFF response, cache value                 | service response, worker copy, Expo interface                               | `PROVEN` |
| `GW-CFG-DIV-U`           | `DivisionUpdateDTO`                  | parsed multipart request and copied downstream JSON        | response omits owner fields and logo, which is a binary part                | `PROVEN` |
| `GW-CFG-LEGAL-R/U`       | legal response and update DTOs       | direct pass-through JSON                                   | update has title/version/content only                                       | `PROVEN` |
| `GW-CFG-RAW-R/U`         | raw mapping response and update DTOs | response is also create input; narrow update exists        | create accidentally accepts ID and timestamps                               | `PROVEN` |
| `GW-CFG-SCRAPER-R`       | `ScraperStatusDTO`                   | direct pass-through                                        | copied service/Expo shape                                                   | `PROVEN` |
| `GW-USR-R`               | `CustomUserDTO`                      | mutable copied response and BFF response                   | service entity response contains favorite entity details the gateway drops  | `PROVEN` |
| `GW-USR-U`               | `CustomUserUpdateDTO`                | multipart BFF request                                      | wider than users-service update: ID, first/last name are ignored downstream | `PROVEN` |
| `GW-USR-FAV`             | `UserFavoriteDTO`                    | nested response item                                       | reduced view of downstream favorite entity                                  | `PROVEN` |
| `GW-RPT-C`               | `ReportCreateDTO`                    | parsed and reserialized multipart request                  | copies reports-service DTO; also contains server-mutated URL list           | `PROVEN` |
| `GW-RPT-R`               | `GitHubIssueResponseDTO`             | copied vendor-derived response                             | reports-service adapter response and Expo type                              | `PROVEN` |
| `GW-SRCH-CLUB/TEAM/POOL` | three search document DTOs           | copied Elasticsearch projections passed directly to mobile | search-service copies; Expo adds fields absent from gateway for team/pool   | `PROVEN` |
| `GW-NOTIF-I/P`           | base item and page DTOs              | copied notification-service page                           | BFF-local copies of notification API shapes                                 | `PROVEN` |
| `GW-NOTIF-EI/EP`         | enriched item and page DTOs          | mutable BFF projection constructed field by field          | base plus derived `divisionLogoUrl`                                         | `PROVEN` |
| `GW-NOTIF-PUSH`          | push-token request                   | pass-through request                                       | notification-service and Expo copies                                        | `PROVEN` |
| `GW-NOTIF-UNREAD`        | unread response                      | pass-through response                                      | Expo handwritten type calls the field `count` instead                       | `PROVEN` |

All Java gateway types above are mutable Lombok data holders. None is a record, application command, application view,
generated model, domain type, or JPA entity. There is no MapStruct or manual mapper boundary; notification's setter-by-
setter construction is inline service assembly. Object DTOs remain boundary-local candidates even when their fields
match. Repeated enums and contract concepts require MRG-267/MRG-268 ownership decisions.

## 4. Configuration Call Graph, Caches, and Field Reasons

### Call graph and fallback matrix

| Operation group    | Downstream calls              | Fan-out / ordering                    | Cache and fallback                                         | Failure behavior                                              | Status   |
| ------------------ | ----------------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| app status         | exactly one GET or PUT        | 1; direct                             | none; no fallback                                          | exception propagates; null body not rejected                  | `PROVEN` |
| division list/read | exactly one GET on cache miss | 0 or 1; service order preserved       | list and ID caches expire after one day; null list -> `[]` | stale values possible; null object not rejected               | `PROVEN` |
| division create    | one multipart POST            | 1                                     | does not evict populated list cache                        | create can succeed while list remains stale for up to one day | `PROVEN` |
| division update    | one multipart PUT             | 1                                     | puts ID result and evicts list                             | exception propagates                                          | `PROVEN` |
| division delete    | one DELETE                    | 1                                     | evicts ID and list                                         | exception propagates                                          | `PROVEN` |
| legal              | one GET or PUT                | 1                                     | none                                                       | exception propagates                                          | `PROVEN` |
| raw mappings       | one GET/POST/PUT              | 1; list order preserved               | null list -> `[]`; no other fallback                       | exception propagates                                          | `PROVEN` |
| scrapers           | one GET or PUT                | 1; list order then Expo sorts by name | null list -> `[]`                                          | exception propagates                                          | `PROVEN` |

### Configuration projection fields

Every current wire name is snake_case when it contains multiple words; every target Blockout-owned wire name is the
listed camelCase Java/Expo name. The gateway performs no semantic transformation beyond list null fallback.

| Type               | Field(s)                                                                       | Frontend-visible or orchestration reason                                      | Classification       | Status   |
| ------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------- | -------- |
| app status         | `maintenance`                                                                  | gates the application into maintenance mode and drives admin toggle           | `REQUIRED`           | `PROVEN` |
| app status         | `message`, `imageUrl`                                                          | maintenance copy/image and admin editing                                      | `REQUIRED`           | `PROVEN` |
| app status         | `minVersionIos`, `minVersionAndroid`                                           | platform-specific forced-update comparison                                    | `REQUIRED`           | `PROVEN` |
| app status         | `storeUrlIos`, `storeUrlAndroid`                                               | platform store action                                                         | `REQUIRED`           | `PROVEN` |
| app status         | `forceUpdateMessage`                                                           | forced-update screen copy                                                     | `REQUIRED`           | `PROVEN` |
| app status         | `lastUpdate`                                                                   | admin status display                                                          | `REQUIRED`           | `PROVEN` |
| division           | `id`, `name`                                                                   | key, route/action, sorting/search, labels and selectors                       | `REQUIRED`           | `PROVEN` |
| division           | `mainColor`, `firstGradientColor`, `secondGradientColor`, `thirdGradientColor` | admin edit/display and mobile visual identity; other projections consume them | `REQUIRED`           | `PROVEN` |
| division           | `logoUrl`                                                                      | admin and mobile visual identity; notification enrichment reads it            | `REQUIRED`           | `PROVEN` |
| division           | `active`                                                                       | admin filters/status and mapping choices                                      | `REQUIRED`           | `PROVEN` |
| division           | `createdAt`, `lastUpdate`                                                      | copied through this BFF response with no direct Expo read found               | `COMPATIBILITY_ONLY` | `PROVEN` |
| division update    | `name` and four color fields                                                   | editable configuration; all required by the current form                      | `REQUIRED`           | `PROVEN` |
| legal              | `type`                                                                         | selects the update path and document identity                                 | `REQUIRED`           | `PROVEN` |
| legal              | `title`                                                                        | editor field; read screen currently supplies a route title separately         | `REQUIRED`           | `PROVEN` |
| legal              | `version`, `content`                                                           | displayed version label and Markdown body/editor                              | `REQUIRED`           | `PROVEN` |
| legal              | `id`, `createdAt`, `lastUpdate`                                                | copied response with no current Expo read                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| raw mapping        | `id`                                                                           | edit key/action and ordering                                                  | `REQUIRED`           | `PROVEN` |
| raw mapping        | `rawDivisionName`                                                              | admin search/display and immutable source identity                            | `REQUIRED`           | `PROVEN` |
| raw mapping        | `divisionId`, `format`, `gender`                                               | mapped-state test and editable target classification                          | `REQUIRED`           | `PROVEN` |
| raw mapping        | `leagueCode`, `season`                                                         | filtering, context and display                                                | `REQUIRED`           | `PROVEN` |
| raw mapping        | `createdAt`, `lastUpdate`                                                      | copied response with no current Expo read                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| raw mapping create | `id`, `createdAt`, `lastUpdate`                                                | accepted only because the response DTO is reused; no mobile caller proven     | `COMPATIBILITY_ONLY` | `PROVEN` |
| scraper status     | `name`, `enabled`                                                              | key, label, update path and toggle state                                      | `REQUIRED`           | `PROVEN` |
| scraper status     | `id`, `lastUpdate`                                                             | copied response with no current Expo read                                     | `COMPATIBILITY_ONLY` | `PROVEN` |

The app-status service ignores null patch fields. Expo sends null when an administrator tries to clear minimum versions,
store URLs, or the forced-update message, so those fields remain unchanged. That is current behavior, not a target patch
policy. Disabling maintenance intentionally omits message/image and therefore preserves them. Both behaviors require
parity fixtures before the contract or DTO split changes null/absent semantics. `PROVEN`

Division create is the only in-scope cache invalidation gap: a previously cached list is not evicted. A successful new
division may remain invisible until expiry or a later update/delete. Production occurrence is `UNKNOWN`; a cache-aware
integration fixture is required.

## 5. User Call Graph and Field Reasons

| Operation       | Downstream calls                    | Identity and transformation                                                     | Mobile behavior                                             | Status   |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| update user     | one multipart PUT by path `auth0Id` | parses/rebuilds JSON; facade does not bind path to JWT subject                  | profile updates pseudo/image, then refreshes user state     | `PROVEN` |
| ensure current  | one PUT `/users/me`                 | forwarded JWT is identity                                                       | session bootstrap obtains/creates current user              | `PROVEN` |
| delete current  | one DELETE `/users/me`              | forwarded JWT is identity                                                       | deletion flow currently signs out before making this call   | `PROVEN` |
| follow/unfollow | one POST/DELETE with query fields   | controller reads subject, client ignores that method argument and relies on JWT | optimistic favorite state, cache invalidation, user refetch | `PROVEN` |

| Field                                                          | Producer / transformation                             | Proven consumer or reason                                       | Classification                            | Status   |
| -------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- | -------- |
| `id`                                                           | users response copied                                 | report `userId`, push-token path, stable application identity   | `REQUIRED`                                | `PROVEN` |
| `auth0Id`                                                      | users response copied                                 | profile update path and live-link ownership comparison          | `REQUIRED`                                | `PROVEN` |
| `email`                                                        | users response copied                                 | profile/session display                                         | `REQUIRED`                                | `PROVEN` |
| `pseudo`                                                       | users response copied/update input                    | profile/tab display and report author                           | `REQUIRED`                                | `PROVEN` |
| `pictureUrl`                                                   | users response copied; multipart image may replace it | profile/tab image and edit preservation                         | `REQUIRED`                                | `PROVEN` |
| `favorites`                                                    | reduced downstream favorite rows                      | feed filters and follow state                                   | `REQUIRED`                                | `PROVEN` |
| favorite `entityType`, `entityId`                              | copied from downstream                                | selects team/pool and entity key                                | `REQUIRED`                                | `PROVEN` |
| `createdAt`                                                    | copied from service persistence                       | no direct Expo read; other services use account age in behavior | `COMPATIBILITY_ONLY` on this BFF response | `PROVEN` |
| `firstName`, `lastName`, `phoneNumber`, `active`, `lastUpdate` | copied from downstream                                | no current Expo read found                                      | `COMPATIBILITY_ONLY`                      | `PROVEN` |
| update `pseudo`, `pictureUrl`                                  | profile form / prior state                            | actual current editable/preservation fields                     | `REQUIRED`                                | `PROVEN` |
| update `id`, `firstName`, `lastName`                           | accepted by gateway DTO                               | users-service narrow update ignores them; no current form use   | `COMPATIBILITY_ONLY`                      | `PROVEN` |

The update path is caller-selected and neither the gateway nor the audited users-service compares it to the JWT subject.
The downstream scope is the only current authorization check. The account-deletion UI calls `signOutSSO()` before
`deleteCurrentUser()`: loss of the bearer token before the secure call is a likely failure, but device/session timing was
not executed, so the failure outcome is `INFERRED`. A physical or authenticated integration run is required. The same
flow promises complete deletion, while cleanup of notification rows/tokens and stored profile images is not proven.

The gateway logs raw Auth0 IDs, favorite types and IDs at INFO. Those values are unnecessary for a stable contract and
need the later logging-policy pass; this audit does not alter logging.

## 6. Report Multipart Flow and Field Reasons

The report facade is not an aggregator. Expo builds `data` in camelCase, its multipart helper serializes that JSON using
snake_case, the BFF parses it into `ReportCreateDTO`, then the reports client serializes the DTO again and buffers every
image into a byte array for a second multipart request. The downstream reports service owns S3, GitHub, Discord, and
vendor casing. The BFF must not expose those adapters as Blockout contract models.

| Field / part                          | Producer and flow                                            | Proven purpose                                                                                | Classification       | Status   |
| ------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | -------------------- | -------- |
| `data` part                           | Expo string JSON -> BFF DTO -> string JSON                   | required report metadata envelope                                                             | `REQUIRED`           | `PROVEN` |
| `images` parts                        | optional repeated Expo files -> buffered/repeated downstream | report evidence attachments                                                                   | `REQUIRED`           | `PROVEN` |
| `type`                                | form/default                                                 | report category and vendor body label                                                         | `REQUIRED`           | `PROVEN` |
| `title`                               | user input                                                   | report/vendor title                                                                           | `REQUIRED`           | `PROVEN` |
| `description`                         | required mobile input                                        | report body                                                                                   | `REQUIRED`           | `PROVEN` |
| `appVersion`, `deviceModel`, `os`     | app/device runtime                                           | diagnostic context                                                                            | `REQUIRED`           | `PROVEN` |
| `userId`, `userName`                  | session or caller context                                    | report author context; not authenticated identity                                             | `REQUIRED`           | `PROVEN` |
| `screen`                              | each report entry point                                      | navigation/UI context                                                                         | `REQUIRED`           | `PROVEN` |
| `attachmentImageUrls`                 | accepted from caller and later mutated by service            | absent from current Expo request; mixes input with server-owned storage results               | `COMPATIBILITY_ONLY` | `PROVEN` |
| response `number`, `htmlUrl`, `title` | GitHub adapter flattened by reports-service                  | downstream logging/notification requires them, but the current mobile ignores the facade body | `COMPATIBILITY_ONLY` | `PROVEN` |
| response `id`, `state`                | GitHub adapter                                               | current mobile ignores body                                                                   | `COMPATIBILITY_ONLY` | `PROVEN` |

`ReportCreateDTO` declares Bean Validation annotations on `type` and `title`, but `ReportPublicController` manually
deserializes the string without invoking validation. Current mobile validation supplies nonblank title/description, but
anonymous or external callers can bypass it. All `ReportFormSheet` callers ignore the response and treat any successful
201 as completion. External consumers remain `UNKNOWN`, so response reduction is not authorized.

## 7. Search Pass-through and Field Reasons

All search operations are one-call pass-throughs. The gateway does not enrich, filter, reorder, paginate, or map search
documents. It logs raw query/filter values at INFO. A null downstream body becomes an empty list, then a 204 response.
The search-service also converts Elasticsearch exceptions to an empty list, so outage, index failure, zero hits, and a
null downstream body are observationally equivalent to the mobile client.

| Shape               | Field(s)                                                                                          | Frontend-visible reason                                                | Classification                       | Status   |
| ------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------ | -------- |
| request             | `query`                                                                                           | debounced text search; blank deliberately requests random examples     | `REQUIRED`                           | `PROVEN` |
| request             | `season`, `divisionId`, `format`, `gender`                                                        | team/pool filters and query-cache identity                             | `REQUIRED`                           | `PROVEN` |
| club result         | `id`, `name`, `logoUrl`, `city`                                                                   | route/key, title, image and city chip                                  | `REQUIRED`                           | `PROVEN` |
| team result         | `id`, `name`, `logoUrl`, `divisionName`, `format`, `gender`, `season`                             | route/key and visible card metadata                                    | `REQUIRED`                           | `PROVEN` |
| team result         | `shortName`, `clubId`, `clubName`, `clubCity`                                                     | returned but no current Expo read found                                | `COMPATIBILITY_ONLY`                 | `PROVEN` |
| pool result         | `id`, `name`, `divisionName`, `leagueCode`, `leagueName`, `season`, `format`, `gender`, `logoUrl` | route/key and visible card metadata                                    | `REQUIRED`                           | `PROVEN` |
| pool result         | `shortName`                                                                                       | returned but no current Expo read found                                | `COMPATIBILITY_ONLY`                 | `PROVEN` |
| Expo-only team/pool | `divisionId`                                                                                      | declared in handwritten TS, absent from gateway response, no UI read   | `COMPATIBILITY_ONLY`                 | `PROVEN` |
| Expo-only team/pool | `divisionMainColor`                                                                               | card reads it, gateway never returns it, so theme fallback always wins | `REQUIRED` UI intent; missing source | `PROVEN` |

The club `city` field is non-null in the handwritten TypeScript type but can be null in the Java/source projection.
Team and pool `divisionMainColor` are a concrete handwritten-client drift: generated clients would expose the absence
at compile time. Whether the target adds the color, derives it in the BFF, or removes the UI expectation is reserved for
MRG-268 after MRG-267 establishes lineage.

The mobile query keys include the exact query and filters, have five-minute stale time, disable retries, and use
`data ?? []`, so both 204 and absent data render an empty state. Search order is owned by the downstream response and is
preserved.

## 8. Notification Aggregation and Field Reasons

### Exact page call graph

| Step | Call / transformation         | Cardinality and ordering                                              | Cache / fallback                                       | Failure behavior                           | Status   |
| ---- | ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | -------- |
| 1    | notification client GET page  | exactly 1; downstream item order retained                             | null page/items -> empty page                          | HTTP exception propagates                  | `PROVEN` |
| 2    | read `metadata.divisionId`    | 0..N item inspections; distinct encounter order                       | missing/null/non-numeric ignored                       | no failure for invalid value               | `PROVEN` |
| 3    | resolve uncached division IDs | 0..D sequential config GETs, where D is distinct locally uncached IDs | local unbounded map plus config client's one-day cache | intended lookup failure fallback is broken | `PROVEN` |
| 4    | construct enriched items      | exactly N setter-by-setter copies in original order                   | absent lookup should yield null logo                   | any prior cache NPE aborts whole page      | `PROVEN` |
| 5    | construct page                | one page; copies `hasNext` and `nextPage`                             | base null -> false/null                                | no partial-result marker                   | `PROVEN` |

`divisionId` accepts a JSON number or numeric string. The service stores resolved logos in an unbounded
`ConcurrentHashMap<Long, String>` without expiry or invalidation. The config client has a second one-day cache. Reads are
not atomic, so concurrent requests can repeat a lookup; lookups are sequential, so latency grows with distinct misses.
Successful local entries can remain stale indefinitely.

The intended optional-logo fallback is not executable. `ConcurrentHashMap` rejects null values. A successful config
response with a null/blank `logoUrl` calls `put(id, null)` and fails; an exception enters the catch block, whose
`putIfAbsent(id, null)` fails again. Therefore either a missing logo or any config lookup failure aborts the entire page
with a generic 500 instead of returning notifications without that logo. The code path is `PROVEN`; production
frequency is `UNKNOWN` without data/log evidence.

### Notification projection fields

| Field(s)                                     | Source / transformation                 | Proven frontend-visible reason                                                    | Classification                     | Status               |
| -------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------- | -------------------- | -------- |
| `id`                                         | copied base item                        | list key and delete path                                                          | `REQUIRED`                         | `PROVEN`             |
| `title`, `body`                              | copied base item                        | notification card content                                                         | `REQUIRED`                         | `PROVEN`             |
| `deepLink`                                   | copied base item                        | navigation on press                                                               | `REQUIRED`                         | `PROVEN`             |
| `createdAt`                                  | copied base item                        | relative timestamp                                                                | `REQUIRED`                         | `PROVEN`             |
| `divisionLogoUrl`                            | config lookup from metadata division ID | optional card image                                                               | `DERIVED`                          | `PROVEN`             |
| `metadata`                                   | copied JsonNode and read for enrichment | internal division lookup requires it, but Expo declares it incorrectly as `string | null` and does not read the output | `COMPATIBILITY_ONLY` | `PROVEN` |
| `userId`, `type`, `targetType`, `targetId`   | copied base item                        | no current notification-screen read found                                         | `COMPATIBILITY_ONLY`               | `PROVEN`             |
| `isRead`, `isOpened`, `readAt`, `openedAt`   | copied base item                        | no current screen read; read/opened methods have no caller                        | `COMPATIBILITY_ONLY`               | `PROVEN`             |
| page `notifications`                         | constructed list                        | infinite-list rows                                                                | `REQUIRED`                         | `PROVEN`             |
| page `nextPage`                              | copied downstream                       | sole `getNextPageParam` input                                                     | `REQUIRED`                         | `PROVEN`             |
| page `hasNext`                               | copied downstream                       | current Expo does not read it                                                     | `COMPATIBILITY_ONLY`               | `PROVEN`             |
| unread `unread`                              | copied downstream                       | no caller; handwritten Expo expects `count`                                       | `COMPATIBILITY_ONLY`               | `PROVEN`             |
| push `expoPushToken`, `platform`, `deviceId` | Expo/provider request copied downstream | push registration identity and routing                                            | `REQUIRED`                         | `PROVEN`             |

Opening a card follows `deepLink` locally but does not call the read or opened operation. Deletion optimistically removes
the item only from the page-size-20 cache, rolls back on failure, then refetches. The session-provider registration path
uses a mutation hook after authentication/onboarding. A second onboarding utility calls `useApis()` inside a plain async
function/event callback, which violates React hook rules; its caller swallows the error. Runtime device frequency is
`UNKNOWN`.

`RegisterPushTokenRequestDTO` has `@Valid` on the controller but no field constraints. The user ID path is caller-
controlled and neither audited boundary binds it to the JWT subject. `deviceId` is an OS build identifier rather than a
proven device identifier. Those are current compatibility/security facts, not target schema decisions.

## 9. Construction, Casing, Validation, Error, and Logging

| Boundary                               | Mechanism                                                                     | Field loss / default / compatibility behavior                                  | Provisional owner                                                 | Status                                   |
| -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------- |
| JSON response/request                  | gateway-wide Jackson `SNAKE_CASE`, plus many explicit annotations             | Java camelCase becomes snake_case; duplicate mechanisms hide drift             | compatibility layer until camelCase cutover                       | `PROVEN`                                 |
| Expo JSON                              | Axios deep request snake-case and response camel-case                         | runtime shapes differ from TypeScript declarations only when keys/fields drift | Expo-local transport adapter until generated client cutover       | `PROVEN`                                 |
| multipart JSON                         | Expo `appendJsonSnake`, BFF `ObjectMapper`, downstream `MultipartBodyBuilder` | JSON parsed and reserialized; images buffered                                  | explicit generated/adapter boundary after MRG-268                 | `PROVEN`                                 |
| config/user/search/report pass-through | same mutable DTO returned by client and controller                            | unknown fields may be dropped; no mapper or application view                   | boundary-local generated model plus explicit application/BFF role | `INFERRED` target; MRG-268 decides       |
| notification projection                | setter-by-setter inline service copy                                          | all 14 base fields repeated; one derived logo                                  | BFF projection mapper/application service candidate               | `INFERRED` target; MRG-268 decides       |
| errors                                 | generic gateway exception handler                                             | downstream 4xx retained; technical/unexpected errors become generic 500        | stable source-contract `ProblemDetail` boundary candidate         | `PROVEN` current; MRG-268 decides target |

There is no mapper, entity, repository, event, or persistence boundary in the in-scope gateway code. Direct entity
conversion belongs to the downstream audits, not this facade. `@JsonIgnoreProperties(ignoreUnknown = true)` and tolerant
copied DTOs let downstream services add fields without immediate failure, but they also silently discard fields before
the mobile response.

Validation is inconsistent: manually parsed report and multipart DTOs do not run Bean Validation; the push request runs
`@Valid` with zero constraints; search and most JSON/path/query values rely on binding or downstream validation. The
camelCase contract must state requiredness, nullability, enum values, multipart encoding, and errors explicitly before
annotations/converters are removed.

Logs contain raw search terms and filters, Auth0 IDs, favorite IDs/types, division names, report type/count/number, and
notification identifiers. Report failures are logged in `ReportService` and again at the global boundary, which can
duplicate exception reporting. There is no stable request/correlation ID in these paths. Logging policy is a later
cross-cutting concern; it must not be encoded into DTO fields.

## 10. Test and Parity Evidence

| Behavior                  | Existing evidence                        | Proven coverage                                      | Missing parity evidence required later                                                          | Status                   |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| gateway boot              | one `contextLoads` test                  | only Spring context when required environment exists | deterministic auth/config fixture                                                               | `PROVEN`                 |
| config pass-through/cache | source inspection only                   | annotations and call sequence                        | controller/client contract tests; create-list cache invalidation; null/absent patch fixtures    | `UNKNOWN` runtime parity |
| user identity/multipart   | source inspection only                   | path/JWT usage and fields                            | authenticated ownership tests; multipart fixtures; deletion E2E                                 | `UNKNOWN` runtime parity |
| report multipart          | source inspection and service audit      | parse/reserialize/buffer path                        | multipart byte/content-type/filename limits and error fixtures                                  | `UNKNOWN` runtime parity |
| search                    | source inspection and search audit       | filter forwarding, 204 rule, UI empty fallback       | success/empty/outage distinction, order and nullability fixtures                                | `UNKNOWN` runtime parity |
| notification aggregation  | source inspection and notification audit | algorithm and null-cache failure path                | zero/many/malformed IDs, null logo, dependency failure, order, pagination and concurrency tests | `UNKNOWN` runtime parity |
| Expo client/types         | caller inventory only                    | query keys and direct field reads                    | generated-client compile, mobile integration tests, physical push/deletion flows                | `UNKNOWN` runtime parity |
| error contract            | handler source only                      | current translation branches                         | controller slices with stable `ProblemDetail` fixtures comparable to Maaatch                    | `UNKNOWN` runtime parity |

The sole context-load test is pre-existingly coupled to `AUTH0_ISSUER`; it fails locally when that environment value is
absent. There are no focused controller, client, mapper, aggregation, projection, or mobile tests in scope. This audit
does not add tests.

## 11. Findings

| ID           | Observation and behavioral risk                                                                                                                                                                                                                                               | Affected boundary          | Status                                | Follow-up                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `MRG264-F01` | 29 of 30 operations are architected around one downstream operation, with two division reads able to use a cache and four multipart operations rebuilding payloads; copied DTOs and handwritten clients create duplication without an explicit application or mapper boundary | all five families          | `PROVEN`                              | MRG-267/268                                                |
| `MRG264-F02` | notification page is the only in-scope enrichment; null/failed logo lookup deterministically throws because null is inserted into `ConcurrentHashMap`                                                                                                                         | notifications              | `PROVEN`                              | preserve/fix via approved migration sequence after MRG-268 |
| `MRG264-F03` | division create does not invalidate the one-day list cache                                                                                                                                                                                                                    | configuration              | `PROVEN`                              | parity/fix task after architecture gate                    |
| `MRG264-F04` | app-status null means preserve downstream, so the current admin cannot clear several optional fields                                                                                                                                                                          | configuration/mobile       | `PROVEN`                              | explicit patch semantics in contract tasks                 |
| `MRG264-F05` | user update and push registration accept caller-selected identity paths without subject equality enforcement                                                                                                                                                                  | user/notification          | `PROVEN`                              | contract/security policy after MRG-268                     |
| `MRG264-F06` | account deletion signs out before the authenticated delete call                                                                                                                                                                                                               | user/mobile                | `PROVEN` ordering; `INFERRED` failure | authenticated device/E2E evidence                          |
| `MRG264-F07` | report annotations are inactive after manual JSON parsing; push validation has no constraints                                                                                                                                                                                 | report/notification        | `PROVEN`                              | source-contract validation policy                          |
| `MRG264-F08` | search hides downstream failure as empty and returns 204 for every empty case                                                                                                                                                                                                 | search                     | `PROVEN`                              | compatibility decision and error contract                  |
| `MRG264-F09` | team/pool search types promise absent `divisionMainColor`; unread type promises `count` while wire sends `unread`; notification metadata is typed as string but is an object                                                                                                  | search/notification/mobile | `PROVEN`                              | MRG-267 and generated-client cutover                       |
| `MRG264-F10` | multipart payloads cross two manual casing/serialization boundaries and images are buffered in memory                                                                                                                                                                         | config/user/report         | `PROVEN`                              | MRG-303/contract generation                                |
| `MRG264-F11` | current UI consumes a minority of several copied response shapes; unused-looking fields cannot be removed without external/deployed consumer evidence                                                                                                                         | all five families          | `PROVEN` local; external `UNKNOWN`    | MRG-267/301/304                                            |
| `MRG264-F12` | TanStack/Orval concerns are mobile-only and do not justify a shared frontend library                                                                                                                                                                                          | Expo                       | `PROVEN` repository topology          | MRG-303/315 onward                                         |

## 12. Provisional Target Roles

| Current type or behavior      | Provisional target role                               | Disposition hypothesis                                                      | Preconditions                                             | Decision owner | Status     |
| ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | -------------- | ---------- |
| copied downstream DTOs        | generated boundary-local client models                | stop reusing them as mobile response/application types                      | authoritative owner contracts and compatibility inventory | MRG-268        | `INFERRED` |
| app/mobile facade responses   | explicit BFF projections and generated API models     | keep consumer-backed fields; map deliberately                               | MRG-267 field lineage and external consumer evidence      | MRG-268        | `INFERRED` |
| mutation inputs               | generated API request + application command           | separate caller input from response/entity state                            | null/absent and multipart parity fixtures                 | MRG-268        | `INFERRED` |
| notification enrichment       | application orchestration + projection mapper         | preserve order/pagination and optional-logo behavior; define failure policy | fan-out/cache/error tests                                 | MRG-268        | `INFERRED` |
| report vendor response        | reports-service vendor adapter plus Blockout response | keep vendor ownership out of BFF DTO design                                 | external consumer inventory                               | MRG-268        | `INFERRED` |
| casing converters/annotations | temporary compatibility adapter                       | retire after one camelCase wire cutover sequence                            | MRG-301-304 coexistence and rollback plan                 | MRG-268/304    | `INFERRED` |
| Expo TanStack integration     | mobile-local generated Orval operations/hooks         | replace handwritten modules incrementally; do not create shared library     | stable contract, auth/error/case mutators                 | MRG-268/315+   | `INFERRED` |

No row approves MapStruct, records, package layout, generator options, field deletion, error redesign, or rollout order.
Those choices require the MRG-268 Plan-mode approval and later contract-first tasks.

## 13. Unknowns and Required Follow-up Evidence

| Unknown                                                                      | Evidence checked                       | Required evidence                                                    | Blocking later task?               |
| ---------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| deployed external callers of all 30 operations and compatibility-only fields | repository callers and prior audits    | access logs, published client inventory, consumer-owner confirmation | blocks removal, not this audit     |
| actual generated Springdoc schema and operation naming                       | controllers/DTOs/config only           | captured deployed/local OpenAPI document                             | required by MRG-301                |
| production frequency of notification null-logo/cache failures                | source algorithm only                  | logs/metrics/data fixture or authenticated reproduction              | blocks prioritization, not lineage |
| actual account-deletion outcome after sign-out                               | source ordering only                   | authenticated physical-device/E2E trace                              | blocks behavior-preserving rewrite |
| intended search color projection                                             | search/BFF/Expo types and callers      | product decision plus config/search lineage                          | MRG-267/268                        |
| whether report response has non-Expo consumers                               | current Expo call sites only           | deployed caller inventory                                            | blocks response reduction          |
| cache population and stale-division incidents                                | cache annotations/source               | cache metrics or integration reproduction                            | blocks incidence claim only        |
| push registration utility execution frequency and real device identity       | source/provider paths                  | telemetry and physical device run                                    | blocks cleanup/security decision   |
| acceptable error and partial-result policy                                   | current handlers and Maaatch reference | approved contract/error policy                                       | MRG-268/304                        |

## 14. Audit Completion Checklist

- [x] all 30 in-scope REST operations and their downstream entries are inventoried;
- [x] absence of in-scope events, schedules, persistence, and entities is explicit;
- [x] every in-scope type family and every declared field has a stable grouped lineage entry;
- [x] current snake_case and target camelCase behavior are explicit;
- [x] producers, consumers, validation, defaults, caches, derivations, and conversions are recorded;
- [x] missing mapper/application boundaries and duplicated shapes are explicit;
- [x] notification fan-out, ordering, pagination, null handling, and failure behavior are reconstructed;
- [x] every frontend-visible projection reason and every locally unused or drifted field is classified;
- [x] tests and missing parity evidence are recorded;
- [x] inferences and unknowns name the evidence needed to resolve them;
- [x] target roles remain provisional and route to MRG-268;
- [x] no runtime, contract, generated artifact, configuration, migration, test, or deployment file changed.

## Source Evidence

- Gateway controllers, services, clients, DTOs, caching, security, Jackson configuration, exception handling, and the
  context test under `apps/backend/mobile-gateway/src`.
- Expo API modules, Axios case conversion, TanStack hooks, session/onboarding providers, admin/profile/report/search/
  notification screens and forms under `apps/frontend/mobile/src`.
- `docs/migration/backend-contract-audits/mrg-252-config-service.md`.
- `docs/migration/backend-contract-audits/mrg-258-users-service.md`.
- `docs/migration/backend-contract-audits/mrg-259-reports-service.md`.
- `docs/migration/backend-contract-audits/mrg-260-notification-service.md`.
- `docs/migration/backend-contract-audits/mrg-261-search-service.md`.
- `docs/migration/backend-contract-audits/mrg-263-mobile-gateway-facade.md`.
- Read-only Maaatch references: `CompetitionPublicReadApplicationService`, `CompetitionPublicReadController`,
  `UserProfileApplicationService`, `ApiExceptionHandler`, and `ApiExceptionHandlerWebMvcTest` under
  `/Users/legel/Documents/Projets/Maaatch/maaatch/apps/backend/bff`.

## Downstream Handoff

MRG-265 and MRG-266 continue the remaining aggregation families. MRG-267 must merge this projection evidence into the
cross-service type and field-lineage matrix without treating repository non-use as deletion proof. MRG-268 must then
approve, service by service, generated API DTOs, application commands/views/records, domain and persistence separation,
mappers, BFF projection ownership, mobile-local Orval/TanStack integration, camelCase coexistence, and migration order.
MRG-301 through MRG-304 must capture the deployed wire and compatibility/rollback evidence before any JSON annotation,
case converter, copied DTO, or handwritten client is retired.
