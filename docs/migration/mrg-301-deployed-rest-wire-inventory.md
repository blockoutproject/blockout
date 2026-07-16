# MRG-301 — Deployed REST Wire Inventory

- Inventory date: 2026-07-17
- Source commit: `e38e682887e4f76cd832bdd8ae3dec8a0ca549f2`
- Scope: every Blockout-owned Spring MVC operation in the monorepo
- Runtime mutation: none
- Contract authority: none; this is discovery evidence for MRG-304 and MRG-317 through MRG-358

## Purpose And Evidence Boundary

This inventory freezes the current REST wire before authoritative OpenAPI fragments are written. It consolidates the
field-lineage evidence from MRG-252 through MRG-267 and reconciles it with every current controller mapping.

The checked-out source contains exactly 130 Spring MVC operations:

| Owner                        | Operations | Contract role                                         |
| ---------------------------- | ---------: | ----------------------------------------------------- |
| config-service               |         16 | internal owner API                                    |
| clubs-service                |          6 | internal owner API                                    |
| teams-service                |          8 | internal owner API                                    |
| pools-service                |          7 | internal owner API                                    |
| competition-service          |          8 | internal owner API                                    |
| matches-service              |         16 | internal owner API, including two test event triggers |
| users-service                |          9 | internal owner API                                    |
| reports-service              |          1 | internal owner API                                    |
| notification-service         |          6 | internal owner API                                    |
| search-service               |          3 | internal owner API                                    |
| mobile-gateway public facade |         17 | Expo-facing BFF API                                   |
| mobile-gateway secure facade |         33 | Expo-facing BFF API                                   |
| **Total**                    |    **130** | **80 internal + 50 BFF**                              |

`search-worker` exposes no Blockout REST controller and receives no invented API in this inventory. Framework actuator
surfaces are operational endpoints, not Blockout product contracts. RabbitMQ boundaries are intentionally excluded and
belong to MRG-302. Handwritten clients and conversion implementations belong to MRG-303.

No controller declares an authoritative `operationId`; every current operation ID is therefore `MISSING`. Springdoc,
controller annotations, entities, DTOs, and the tables below remain implementation evidence only.

## How Wire Names Are Recorded

Every path and parameter name in the operation tables is the exact current wire spelling. Shape codes point to the
field registries below. Those registries incorporate the complete `Current wire` columns of the approved MRG-252
through MRG-267 field matrices by reference; they are part of this inventory rather than future work.

Current serialization has four distinct behaviors:

1. every JSON-producing Spring module uses a global Jackson `SNAKE_CASE` strategy;
2. many DTO fields repeat that result with `@JsonProperty`, while other fields rely only on the global strategy;
3. Expo authors camelCase values, converts JSON bodies and query parameters to snake_case, and converts JSON responses
   back to camelCase; multipart JSON uses a separate snake-case helper;
4. Python application names are snake_case and currently leak directly onto Blockout-owned wires.

Therefore `division_id`, `pool_ids`, `logo_url`, and `last_update` below are current server wire names, while
`divisionId`, `poolIds`, `logoUrl`, and `lastUpdate` are only current Java/TypeScript application names. Fields already
spelled identically in both conventions, such as `id`, `name`, `status`, and `active`, are marked `same` in the shape
registry. Vendor payload names are not Blockout wire names.

## Security Profiles

| Profile      | Current rule                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `AUTH`       | Any authenticated JWT; no method scope.                                                                                 |
| `SCOPE:x`    | Authenticated JWT plus the exact `SCOPE_x` authority enforced by `@PreAuthorize`.                                       |
| `SCOPE:a+b`  | Both listed authorities are required.                                                                                   |
| `PUBLIC`     | Explicitly permitted without an incoming JWT.                                                                           |
| `APIKEY`     | Exact `X-API-KEY` checked by the users-service internal security chain.                                                 |
| `BFF-PUBLIC` | `/api/v1/mobile/public/**` is `permitAll`; downstream calls use M2M credentials.                                        |
| `BFF-SECURE` | `/api/v1/mobile/secure/**` requires any authenticated JWT; the JWT is forwarded and downstream services enforce scopes. |

## Error Profiles

The operation tables use these current profiles plus any row-specific status. None is a target error contract.

| Profile      | Current behavior                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CFG-ERR`    | Selected missing rows map to 404; several legal, binding, enum, and parsing failures become the legacy generic 500; division multipart may return 413.                                |
| `CLUB-ERR`   | Stable 404 map; malformed multipart, validation, S3, database, and unexpected failures usually become a generic French 500; oversized multipart returns 413.                          |
| `TEAM-ERR`   | Stable 404 map; binding, image, database, broker, and unexpected failures generally become generic 500; no explicit 413 handler.                                                      |
| `POOL-ERR`   | Stable 404 map; binding, enum, database, broker, and unexpected failures generally become generic 500.                                                                                |
| `COMP-ERR`   | Stats lookup has a stable 404; null bulk lists, binding, persistence, and unexpected failures generally become generic 500. Empty reads are 200 arrays.                               |
| `MATCH-ERR`  | Missing match/live state uses current ad hoc 4xx mappings; binding, range, persistence, broker, and unexpected failures retain the service legacy bodies described by MRG-257.        |
| `USER-ERR`   | Current controller advice preserves legacy JSON errors; the API-key chain returns plain-text 401 before advice. Authentication-filter bodies remain deployment-dependent.             |
| `REPORT-ERR` | Missing parts bind as 400, servlet overflow as 413, and JSON/image/vendor failures usually become generic 500; partial S3/GitHub/Discord side effects are not compensated.            |
| `NOTIF-ERR`  | Repeated read/open and missing/repeated delete return 404; invalid page, enum, null, database, and downstream failures use framework or generic legacy responses.                     |
| `SEARCH-ERR` | Search-service catches Elasticsearch/query/deserialization failures and returns 200 `[]`; the BFF converts empty results and swallowed failures to 204.                               |
| `BFF-ERR`    | Legacy `{timestamp,status,error,message,path}` JSON; downstream 4xx attempts to retain status and message; most other failures become generic 500. Auth failures occur before advice. |
| `PDF-ERR`    | Signed proxy: 401 invalid/expired token, 400 invalid kind, 502 upstream exception, direct non-2xx status where available, 500 unexpected; bodies are plain text, not JSON.            |

## Internal Owner Operations

`Shape` values are defined in the wire-shape registry. `Array` means an unwrapped JSON array. Unless the row says
otherwise, a collection has no pagination wrapper, count, continuation, or stable tie-breaker.

### config-service — 16 operations

| ID     | Method and path                              | Current parameters / request                                   | Security                            | Success                    | Error                                  | Collection / multipart     | Proven callers                  |
| ------ | -------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- | -------------------------- | -------------------------------------- | -------------------------- | ------------------------------- |
| CFG-01 | GET `/api/v1/config/app-status`              | none                                                           | `AUTH`                              | 200 `CFG-AS-R`             | `CFG-ERR`; 404 absent seed             | single                     | BFF public                      |
| CFG-02 | PUT `/api/v1/config/app-status`              | JSON `CFG-AS-U`                                                | `SCOPE:update:maintenance`          | 200 `CFG-AS-R`             | `CFG-ERR`                              | single                     | BFF secure, Expo admin          |
| CFG-03 | GET `/api/v1/config/divisions`               | none                                                           | `SCOPE:read:divisions`              | 200 Array `CFG-DIV-R`      | `CFG-ERR`                              | unpaged repository order   | BFF, search-worker              |
| CFG-04 | GET `/api/v1/config/divisions/{id}`          | path `id`                                                      | `SCOPE:read:divisions`              | 200 `CFG-DIV-R`            | `CFG-ERR`; 404 absent                  | single                     | BFF enrichment, search-worker   |
| CFG-05 | POST `/api/v1/config/divisions`              | multipart string `data` = `CFG-DIV-U`; optional binary `image` | `SCOPE:create:divisions`            | 201 `CFG-DIV-R` + Location | `CFG-ERR`; duplicate 400; overflow 413 | multipart                  | BFF secure, Expo admin          |
| CFG-06 | PUT `/api/v1/config/divisions/{id}`          | path `id`; same multipart as CFG-05                            | `SCOPE:update:divisions`            | 200 `CFG-DIV-R`            | `CFG-ERR`; 404 absent                  | multipart                  | BFF secure, Expo admin          |
| CFG-07 | DELETE `/api/v1/config/divisions/{id}`       | path `id`                                                      | `SCOPE:delete:divisions`            | 204                        | `CFG-ERR`; 404 absent                  | none                       | BFF secure, Expo admin          |
| CFG-08 | GET `/api/v1/config/legal/{type}`            | untyped path `type`                                            | `PUBLIC`                            | 200 `CFG-LEGAL-R`          | `CFG-ERR`; missing currently 500       | single                     | BFF public, Expo profile        |
| CFG-09 | PUT `/api/v1/config/legal/{type}`            | path `type`; JSON `CFG-LEGAL-U`                                | `SCOPE:update:legal`                | 200 `CFG-LEGAL-R`          | `CFG-ERR`; missing currently 500       | single                     | BFF secure, Expo editor         |
| CFG-10 | POST `/api/v1/config/raw-divisions`          | JSON direct `CFG-RAW-R` entity                                 | `SCOPE:create:raw_division_mapping` | 201 `CFG-RAW-R` + Location | `CFG-ERR`                              | single                     | competition scraper, BFF secure |
| CFG-11 | GET `/api/v1/config/raw-divisions`           | optional `league_code`, `season`                               | `SCOPE:read:raw_division_mapping`   | 200 Array `CFG-RAW-R`      | `CFG-ERR`                              | unpaged, exact filters     | scraper, BFF secure             |
| CFG-12 | GET `/api/v1/config/raw-divisions/{id}`      | path `id`                                                      | `SCOPE:read:raw_division_mapping`   | 200 `CFG-RAW-R`            | `CFG-ERR`; 404 absent                  | single                     | BFF secure                      |
| CFG-13 | PUT `/api/v1/config/raw-divisions/{id}`      | path `id`; JSON `CFG-RAW-U`                                    | `SCOPE:update:raw_division_mapping` | 200 `CFG-RAW-R`            | `CFG-ERR`; 404 absent                  | single                     | BFF secure, Expo admin          |
| CFG-14 | GET `/api/v1/config/scrapers/{name}/status`  | enum path `name`                                               | `AUTH`                              | 200 `CFG-SCRAPER-R`        | `CFG-ERR`; 404 absent                  | single                     | both Python scrapers            |
| CFG-15 | PUT `/api/v1/config/scrapers/{name}/enabled` | enum path `name`; required query `enabled`                     | `SCOPE:update:scrapers`             | 200 `CFG-SCRAPER-R`        | `CFG-ERR`                              | single                     | BFF secure, Expo admin          |
| CFG-16 | GET `/api/v1/config/scrapers/status`         | none                                                           | `SCOPE:read:scrapers`               | 200 Array `CFG-SCRAPER-R`  | `CFG-ERR`                              | unpaged, unspecified order | BFF secure, Expo admin          |

### clubs-service — 6 operations

| ID      | Method and path               | Current parameters / request                                           | Security             | Success                  | Error                  | Collection / multipart              | Proven callers                 |
| ------- | ----------------------------- | ---------------------------------------------------------------------- | -------------------- | ------------------------ | ---------------------- | ----------------------------------- | ------------------------------ |
| CLUB-01 | GET `/api/v1/clubs`           | optional repeated `ids`, optional `active`                             | `SCOPE:read:clubs`   | 200 Array `CLUB-R`       | `CLUB-ERR`             | unpaged; name order, no tie-breaker | club scraper, search-worker    |
| CLUB-02 | GET `/api/v1/clubs/{id}`      | string path `id`                                                       | `SCOPE:read:clubs`   | 200 `CLUB-R`             | `CLUB-ERR`; 404 absent | single                              | BFF, worker client method      |
| CLUB-03 | POST `/api/v1/clubs`          | multipart string `data` = `CLUB-C`; optional binary `image`            | `SCOPE:create:clubs` | 201 `CLUB-R` + Location  | `CLUB-ERR`             | multipart                           | club scraper                   |
| CLUB-04 | PUT `/api/v1/clubs/{id}`      | path `id`; multipart string `data` = `CLUB-U`; optional binary `image` | `SCOPE:update:clubs` | 200 `CLUB-R`             | `CLUB-ERR`; 404 absent | multipart                           | club scraper, BFF secure, Expo |
| CLUB-05 | DELETE `/api/v1/clubs/{id}`   | path `id`                                                              | `SCOPE:delete:clubs` | 204                      | `CLUB-ERR`; 404 absent | none                                | no monorepo caller found       |
| CLUB-06 | GET `/api/v1/clubs/{id}/logo` | path `id`                                                              | `AUTH`               | 200 plain URL, 204 empty | `CLUB-ERR`; 404 absent | text, not JSON                      | unused BFF helper              |

### teams-service — 8 operations

| ID      | Method and path                                   | Current parameters / request                                                              | Security             | Success                 | Error                  | Collection / multipart         | Proven callers                    |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- | ----------------------- | ---------------------- | ------------------------------ | --------------------------------- |
| TEAM-01 | GET `/api/v1/teams`                               | optional `division_id`, `format`, `gender`, `season`, `club_id`, repeated `ids`, `active` | `AUTH`               | 200 Array `TEAM-R`      | `TEAM-ERR`             | unpaged; `raw_name` order only | scraper, BFF, search-worker       |
| TEAM-02 | GET `/api/v1/teams/{id}`                          | long path `id`                                                                            | `AUTH`               | 200 `TEAM-R`            | `TEAM-ERR`; 404 absent | single                         | BFF                               |
| TEAM-03 | POST `/api/v1/teams`                              | JSON direct `TEAM-R` entity                                                               | `SCOPE:create:teams` | 201 `TEAM-R` + Location | `TEAM-ERR`             | single                         | competition scraper               |
| TEAM-04 | PUT `/api/v1/teams/{id}`                          | path `id`; multipart string `data` = `TEAM-U`; optional binary `image`                    | `SCOPE:update:teams` | 200 `TEAM-R`            | `TEAM-ERR`; 404 absent | multipart                      | scraper, BFF secure, Expo         |
| TEAM-05 | DELETE `/api/v1/teams/{id}`                       | path `id`                                                                                 | `SCOPE:delete:teams` | 204                     | `TEAM-ERR`; 404 absent | none                           | no monorepo caller found          |
| TEAM-06 | GET `/api/v1/teams/club-ids`                      | none                                                                                      | `AUTH`               | 200 Array string        | `TEAM-ERR`             | unpaged, unspecified order     | club scraper                      |
| TEAM-07 | POST `/api/v1/teams/{teamId}/followers/increment` | path `teamId`; query `user_id`                                                            | `SCOPE:follow:teams` | 200 `TEAM-R`            | `TEAM-ERR`; 404 absent | single                         | users-service, response discarded |
| TEAM-08 | POST `/api/v1/teams/{teamId}/followers/decrement` | path `teamId`; query `user_id`                                                            | `SCOPE:follow:teams` | 200 `TEAM-R`            | `TEAM-ERR`; 404 absent | single                         | users-service, response discarded |

### pools-service — 7 operations

| ID      | Method and path                                   | Current parameters / request                               | Security             | Success                 | Error                  | Collection / multipart         | Proven callers                    |
| ------- | ------------------------------------------------- | ---------------------------------------------------------- | -------------------- | ----------------------- | ---------------------- | ------------------------------ | --------------------------------- |
| POOL-01 | GET `/api/v1/pools`                               | optional `league_code`, `season`, `active`, repeated `ids` | `AUTH`               | 200 Array `POOL-R`      | `POOL-ERR`             | unpaged; season desc, name asc | scraper, worker, BFF batch        |
| POOL-02 | GET `/api/v1/pools/{id}`                          | long path `id`                                             | `AUTH`               | 200 `POOL-R`            | `POOL-ERR`; 404 absent | single                         | BFF, notification-service         |
| POOL-03 | POST `/api/v1/pools`                              | JSON direct `POOL-R` entity                                | `SCOPE:create:pools` | 201 `POOL-R` + Location | `POOL-ERR`             | single                         | competition scraper               |
| POOL-04 | PUT `/api/v1/pools/{id}`                          | path `id`; JSON `POOL-U`                                   | `SCOPE:update:pools` | 200 `POOL-R`            | `POOL-ERR`; 404 absent | single                         | scraper, BFF secure, Expo         |
| POOL-05 | DELETE `/api/v1/pools/{id}`                       | path `id`                                                  | `SCOPE:delete:pools` | 204                     | `POOL-ERR`; 404 absent | none                           | no monorepo caller found          |
| POOL-06 | POST `/api/v1/pools/{poolId}/followers/increment` | path `poolId`; query `user_id`                             | `SCOPE:follow:pools` | 200 `POOL-R`            | `POOL-ERR`; 404 absent | single                         | users-service, response discarded |
| POOL-07 | POST `/api/v1/pools/{poolId}/followers/decrement` | path `poolId`; query `user_id`                             | `SCOPE:follow:pools` | 200 `POOL-R`            | `POOL-ERR`; 404 absent | single                         | users-service, response discarded |

### competition-service — 8 operations

All paths below include the `/api/v1/competitions` controller base.

| ID      | Method and path                                                 | Current parameters / request                  | Security                                        | Success                  | Error                  | Collection / multipart     | Proven callers       |
| ------- | --------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- | ------------------------ | ---------------------- | -------------------------- | -------------------- |
| COMP-01 | POST `/api/v1/competitions/pools/{poolId}/teams/{teamId}`       | paths `poolId`, `teamId`; query `club_id`     | `SCOPE:create:competitions+update:competitions` | 200 `COMP-ASSOC-R`       | `COMP-ERR`             | single                     | competition scraper  |
| COMP-02 | GET `/api/v1/competitions/pools/{poolId}/teams`                 | path `poolId`                                 | `AUTH`                                          | 200 Array `COMP-ASSOC-R` | `COMP-ERR`             | active, unpaged            | scraper, BFF         |
| COMP-03 | GET `/api/v1/competitions/teams/{teamId}/pools`                 | path `teamId`                                 | `AUTH`                                          | 200 Array `COMP-ASSOC-R` | `COMP-ERR`             | active, unpaged            | no active BFF caller |
| COMP-04 | PUT `/api/v1/competitions/pools/{poolId}/teams/bulk-deactivate` | path `poolId`; JSON `missing_team_ids`        | `SCOPE:delete:competitions`                     | 200 empty                | `COMP-ERR`             | no body response           | competition scraper  |
| COMP-05 | PUT `/api/v1/competitions/pools/bulk-deactivate`                | JSON `missing_pool_ids`                       | `SCOPE:delete:competitions`                     | 200 empty                | `COMP-ERR`             | no body response           | competition scraper  |
| COMP-06 | PUT `/api/v1/competitions/clubs/bulk-deactivate`                | JSON `missing_club_ids`                       | `SCOPE:delete:competitions`                     | 200 empty                | `COMP-ERR`             | no body response           | club scraper         |
| COMP-07 | PUT `/api/v1/competitions/pools/{poolId}/teams/{teamId}/stats`  | paths `poolId`, `teamId`; JSON `COMP-STATS-U` | `SCOPE:update:competitions`                     | 200 `COMP-ASSOC-R`       | `COMP-ERR`; 404 absent | single                     | competition scraper  |
| COMP-08 | GET `/api/v1/competitions/teams/{teamId}/pools-with-ranking`    | path `teamId`                                 | `AUTH`                                          | 200 Array `COMP-RANK-R`  | `COMP-ERR`             | unpaged ranking projection | BFF team profile     |

### matches-service — 16 operations

| ID       | Method and path                                           | Current parameters / request                                                             | Security                         | Success                        | Error                   | Collection / multipart  | Proven callers              |
| -------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------ | ----------------------- | ----------------------- | --------------------------- |
| MATCH-01 | GET `/api/v1/matches`                                     | optional `pool_id`, repeated `team_ids`, `status`, `active`                              | `AUTH`                           | 200 Array `MATCH-R`            | `MATCH-ERR`             | unpaged                 | competition scraper         |
| MATCH-02 | GET `/api/v1/matches/day-groups`                          | default `page=0`, `size=4`; optional repeated `pool_ids`, `team_ids`, `status`, `active` | `AUTH`                           | 200 `MATCH-DAY-PAGE`           | `MATCH-ERR`             | date-page compatibility | BFF public                  |
| MATCH-03 | GET `/api/v1/matches/{id}`                                | long path `id`                                                                           | `AUTH`                           | 200 `MATCH-DETAIL-R`           | `MATCH-ERR`; 404 absent | single                  | BFF public                  |
| MATCH-04 | POST `/api/v1/matches`                                    | JSON direct `MATCH-R` entity                                                             | `SCOPE:create:matches`           | 201 `MATCH-R` + Location       | `MATCH-ERR`             | single                  | competition scraper         |
| MATCH-05 | PUT `/api/v1/matches/{id}`                                | path `id`; JSON direct `MATCH-R` entity                                                  | `SCOPE:update:matches`           | 200 `MATCH-R`                  | `MATCH-ERR`; 404 absent | single                  | competition scraper         |
| MATCH-06 | PUT `/api/v1/matches/pools/{poolId}/bulk-deactivate`      | path `poolId`; JSON `missing_match_codes`                                                | `SCOPE:delete:matches`           | 200 empty                      | `MATCH-ERR`             | no body response        | competition scraper         |
| MATCH-07 | GET `/api/v1/matches/live-moderation`                     | optional `status`                                                                        | `SCOPE:moderate:match_live_link` | 200 Array `MATCH-LIVE-SUMMARY` | `MATCH-ERR`             | unpaged                 | BFF secure                  |
| MATCH-08 | GET `/api/v1/matches/{matchId}/live-links`                | path `matchId`                                                                           | `SCOPE:moderate:match_live_link` | 200 Array `MATCH-LIVE-HISTORY` | `MATCH-ERR`             | unpaged history         | BFF secure, Expo moderation |
| MATCH-09 | POST `/api/v1/matches/{matchId}/live-link`                | path `matchId`; JSON `MATCH-LIVE-U`                                                      | `SCOPE:create:match_live_link`   | 200 `MATCH-LIVE-R`             | `MATCH-ERR`             | single                  | BFF secure, Expo            |
| MATCH-10 | DELETE `/api/v1/matches/{matchId}/live-link`              | path `matchId`; JWT subject                                                              | `SCOPE:delete:match_live_link`   | 204, including absent          | `MATCH-ERR`             | none                    | BFF secure, Expo            |
| MATCH-11 | POST `/api/v1/matches/{matchId}/live-link/report`         | path `matchId`; JSON `MATCH-LIVE-REPORT`; JWT subject                                    | `SCOPE:report:match_live_link`   | 204                            | `MATCH-ERR`             | single                  | BFF secure, Expo            |
| MATCH-12 | POST `/api/v1/matches/live-links/{liveLinkId}/approve`    | path `liveLinkId`                                                                        | `SCOPE:moderate:match_live_link` | 204                            | `MATCH-ERR`             | none                    | BFF secure, Expo moderation |
| MATCH-13 | POST `/api/v1/matches/live-links/{liveLinkId}/reject`     | path `liveLinkId`                                                                        | `SCOPE:moderate:match_live_link` | 204                            | `MATCH-ERR`             | none                    | BFF secure, Expo moderation |
| MATCH-14 | POST `/api/v1/matches/live-links/{liveLinkId}/reactivate` | path `liveLinkId`                                                                        | `SCOPE:moderate:match_live_link` | 204                            | `MATCH-ERR`             | none                    | BFF secure, Expo moderation |
| MATCH-15 | POST `/api/v1/matches/internal/test/{id}/emit-finished`   | path persisted match `id`                                                                | `SCOPE:publish:events`           | 202                            | `MATCH-ERR`             | test event trigger      | no caller found             |
| MATCH-16 | POST `/api/v1/matches/internal/test/emit-finished`        | JSON `MATCH-FINISHED-EVENT`                                                              | `SCOPE:publish:events`           | 202                            | `MATCH-ERR`             | test event trigger      | no caller found             |

### users-service — 9 operations

| ID      | Method and path                                             | Current parameters / request                                                | Security                    | Success                     | Error                       | Collection / multipart | Proven callers                |
| ------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------- | --------------------------- | --------------------------- | ---------------------- | ----------------------------- |
| USER-01 | GET `/api/v1/users/{auth0Id}`                               | path `auth0Id`                                                              | `SCOPE:read:users`          | 200 `USER-R`                | `USER-ERR`; 404 absent      | single                 | no monorepo caller found      |
| USER-02 | GET `/api/v1/users/me`                                      | JWT subject                                                                 | `SCOPE:read:current_user`   | 200 `USER-R`                | `USER-ERR`; 404 absent      | single                 | matches, notification-service |
| USER-03 | PUT `/api/v1/users/{auth0Id}`                               | path `auth0Id`; multipart string `data` = `USER-U`; optional binary `image` | `SCOPE:update:current_user` | 200 `USER-ENTITY-R`         | `USER-ERR`                  | multipart              | BFF secure, Expo              |
| USER-04 | PUT `/api/v1/users/me`                                      | JWT subject, no body                                                        | `SCOPE:create:current_user` | 200 `USER-ENTITY-R`         | `USER-ERR`                  | single                 | BFF secure, Expo bootstrap    |
| USER-05 | DELETE `/api/v1/users/me`                                   | JWT subject                                                                 | `SCOPE:delete:current_user` | 204                         | `USER-ERR`                  | none                   | BFF secure, Expo              |
| USER-06 | POST `/api/v1/users/internal/{auth0Id}/assign-default-role` | path `auth0Id`; header `X-API-KEY`                                          | `APIKEY`                    | 204                         | `USER-ERR`; plain 401       | none                   | external caller unknown       |
| USER-07 | GET `/api/v1/users/{userId}/favorites`                      | path numeric `userId`; optional `entity_type`                               | `AUTH`                      | 200 Array `USER-FAVORITE-R` | `USER-ERR`; 404 user absent | unpaged                | no monorepo caller found      |
| USER-08 | POST `/api/v1/users/favorites/follow`                       | query `entity_type`, `entity_id`; JWT subject                               | type-specific follow scope  | 204/no-op                   | `USER-ERR`                  | none                   | BFF secure, Expo              |
| USER-09 | DELETE `/api/v1/users/favorites/follow`                     | query `entity_type`, `entity_id`; JWT subject                               | type-specific follow scope  | 204/no-op                   | `USER-ERR`                  | none                   | BFF secure, Expo              |

The USER-08/09 security expressions choose `follow:teams` or `follow:pools` from the requested entity type. Exact
expressions remain captured in MRG-258; they are behavior evidence, not target authorization design.

### reports-service — 1 operation

| ID        | Method and path        | Current parameters / request                                            | Security               | Success        | Error        | Collection / multipart                     | Proven callers  |
| --------- | ---------------------- | ----------------------------------------------------------------------- | ---------------------- | -------------- | ------------ | ------------------------------------------ | --------------- |
| REPORT-01 | POST `/api/v1/reports` | multipart string `data` = `REPORT-C`; optional repeated binary `images` | `SCOPE:create:reports` | 201 `REPORT-R` | `REPORT-ERR` | multipart; no attachment count/idempotency | BFF public only |

### notification-service — 6 operations

| ID       | Method and path                                         | Current parameters / request             | Security                    | Success          | Error                                  | Collection / multipart | Proven callers                      |
| -------- | ------------------------------------------------------- | ---------------------------------------- | --------------------------- | ---------------- | -------------------------------------- | ---------------------- | ----------------------------------- |
| NOTIF-01 | GET `/api/v1/notifications`                             | default `page=0`, `size=20`; JWT subject | `SCOPE:read:current_user`   | 200 `NOTIF-PAGE` | `NOTIF-ERR`                            | offset page, no bounds | BFF secure, Expo infinite list      |
| NOTIF-02 | GET `/api/v1/notifications/unread-count`                | JWT subject                              | `SCOPE:read:current_user`   | 200 `{unread}`   | `NOTIF-ERR`                            | single                 | BFF secure; no mobile read found    |
| NOTIF-03 | POST `/api/v1/notifications/{id}/read`                  | path `id`; JWT subject                   | `SCOPE:read:current_user`   | 204 changed      | `NOTIF-ERR`; 404 absent/already read   | none                   | BFF secure; no mobile caller found  |
| NOTIF-04 | POST `/api/v1/notifications/{id}/opened`                | path `id`; JWT subject                   | `SCOPE:read:current_user`   | 204 changed      | `NOTIF-ERR`; 404 absent/already opened | none                   | BFF secure; no mobile caller found  |
| NOTIF-05 | DELETE `/api/v1/notifications/{id}`                     | path `id`; JWT subject                   | `SCOPE:read:current_user`   | 204 deleted      | `NOTIF-ERR`; 404 absent/repeated       | none                   | BFF secure, Expo optimistic delete  |
| NOTIF-06 | POST `/api/v1/notifications/users/{userId}/push-tokens` | path `userId`; JSON `NOTIF-TOKEN-C`      | `SCOPE:update:current_user` | 202              | `NOTIF-ERR`                            | single                 | BFF secure, Expo session/onboarding |

### search-service — 3 operations

| ID        | Method and path            | Current parameters / request                                           | Security | Success                             | Error        | Collection / multipart         | Proven callers |
| --------- | -------------------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------- | ------------ | ------------------------------ | -------------- |
| SEARCH-01 | GET `/api/v1/search/clubs` | required `query`                                                       | `AUTH`   | 200 Array `SEARCH-CLUB-R`, max 5/20 | `SEARCH-ERR` | unpaged; random or score order | BFF public     |
| SEARCH-02 | GET `/api/v1/search/teams` | required `query`; optional `season`, `division_id`, `format`, `gender` | `AUTH`   | 200 Array `SEARCH-TEAM-R`, max 5/20 | `SEARCH-ERR` | unpaged; random or score order | BFF public     |
| SEARCH-03 | GET `/api/v1/search/pools` | same parameters as SEARCH-02                                           | `AUTH`   | 200 Array `SEARCH-POOL-R`, max 5/20 | `SEARCH-ERR` | unpaged; random or score order | BFF public     |

## Mobile-Gateway BFF Operations

All BFF JSON and query names on the server wire are snake_case. Expo API code authors camelCase names and the Axios
bridge converts them. BFF response shape fields are fully registered through the workflow audit links below.

### Public facade — 17 operations

| ID       | Method and full path                               | Current parameters / request                                                            | Security     | Success                                | Error        | Collection / multipart           | Proven Expo caller                |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------ | -------------------------------------- | ------------ | -------------------------------- | --------------------------------- |
| BFF-P-01 | GET `/api/v1/mobile/public/clubs/{id}`             | path `id`                                                                               | `BFF-PUBLIC` | 200 `BFF-CLUB-R`                       | `BFF-ERR`    | single                           | `ClubApi.getClubById`             |
| BFF-P-02 | GET `/api/v1/mobile/public/config/app-status`      | none                                                                                    | `BFF-PUBLIC` | 200 `BFF-AS-R`                         | `BFF-ERR`    | single                           | `ConfigApi.getAppStatus`          |
| BFF-P-03 | GET `/api/v1/mobile/public/config/divisions`       | none                                                                                    | `BFF-PUBLIC` | 200 Array `BFF-DIV-R`                  | `BFF-ERR`    | unpaged/cache                    | `ConfigApi.getDivisions`          |
| BFF-P-04 | GET `/api/v1/mobile/public/config/divisions/{id}`  | path `id`                                                                               | `BFF-PUBLIC` | 200 `BFF-DIV-R`                        | `BFF-ERR`    | single/cache                     | no Expo method found              |
| BFF-P-05 | GET `/api/v1/mobile/public/config/legal/{type}`    | untyped path `type`                                                                     | `BFF-PUBLIC` | 200 `BFF-LEGAL-R`                      | `BFF-ERR`    | single                           | `ConfigApi.getLegalDocument`      |
| BFF-P-06 | GET `/api/v1/mobile/public/ffvb/pdf/{token}`       | signed path `token`                                                                     | `BFF-PUBLIC` | 200 inline PDF                         | `PDF-ERR`    | binary, no-store                 | indirect signed URL from match UI |
| BFF-P-07 | GET `/api/v1/mobile/public/matches/{id}`           | path `id`                                                                               | `BFF-PUBLIC` | 200 `BFF-MATCH-DETAIL`                 | `BFF-ERR`    | enriched single                  | `MatchApi.getEnrichedMatchById`   |
| BFF-P-08 | GET `/api/v1/mobile/public/matches`                | default `page=0`, `size=4`; required `status`; optional repeated `pool_ids`, `team_ids` | `BFF-PUBLIC` | 200 `BFF-MATCH-DAY-PAGE`               | `BFF-ERR`    | date page + enrichment           | `MatchApi.getEnrichedMatches`     |
| BFF-P-09 | GET `/api/v1/mobile/public/pools/{id}`             | path `id`                                                                               | `BFF-PUBLIC` | 200 `BFF-POOL-DETAIL`                  | `BFF-ERR`    | enriched single                  | `PoolApi.getEnrichedPoolById`     |
| BFF-P-10 | GET `/api/v1/mobile/public/pools/by-ids`           | required repeated `ids`                                                                 | `BFF-PUBLIC` | 200 Array `BFF-POOL-SUMMARY`           | `BFF-ERR`    | unpaged; missing records omitted | `PoolApi.getPoolListByIds`        |
| BFF-P-11 | POST `/api/v1/mobile/public/reports`               | multipart string `data` = `BFF-REPORT-C`; optional repeated binary `images`             | `BFF-PUBLIC` | 201 `BFF-REPORT-R`                     | `BFF-ERR`    | multipart relay                  | `ReportApi.createReport`          |
| BFF-P-12 | GET `/api/v1/mobile/public/search/clubs`           | required `query`                                                                        | `BFF-PUBLIC` | 200 Array `BFF-SEARCH-CLUB`; 204 empty | `SEARCH-ERR` | unpaged                          | `SearchApi.searchClubs`           |
| BFF-P-13 | GET `/api/v1/mobile/public/search/teams`           | required `query`; optional `season`, `division_id`, `format`, `gender`                  | `BFF-PUBLIC` | 200 Array `BFF-SEARCH-TEAM`; 204 empty | `SEARCH-ERR` | unpaged                          | `SearchApi.searchTeams`           |
| BFF-P-14 | GET `/api/v1/mobile/public/search/pools`           | same parameters as BFF-P-13                                                             | `BFF-PUBLIC` | 200 Array `BFF-SEARCH-POOL`; 204 empty | `SEARCH-ERR` | unpaged                          | `SearchApi.searchPools`           |
| BFF-P-15 | GET `/api/v1/mobile/public/teams/{id}`             | path `id`                                                                               | `BFF-PUBLIC` | 200 `BFF-TEAM-DETAIL`                  | `BFF-ERR`    | enriched single                  | `TeamApi.getEnrichedTeamById`     |
| BFF-P-16 | GET `/api/v1/mobile/public/teams/by-club/{clubId}` | path `clubId`                                                                           | `BFF-PUBLIC` | 200 Array `BFF-TEAM-SUMMARY`           | `BFF-ERR`    | unpaged + enrichment             | `TeamApi.getTeamListByClubId`     |
| BFF-P-17 | GET `/api/v1/mobile/public/teams/by-ids`           | required repeated `ids`                                                                 | `BFF-PUBLIC` | 200 Array `BFF-TEAM-SUMMARY`           | `BFF-ERR`    | unpaged; missing records omitted | `TeamApi.getTeamListByIds`        |

### Secure facade — 33 operations

| ID       | Method and full path                                                  | Current parameters / request                                      | Security     | Success                      | Error     | Collection / multipart            | Proven Expo caller                     |
| -------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | ---------------------------- | --------- | --------------------------------- | -------------------------------------- |
| BFF-S-01 | PUT `/api/v1/mobile/secure/clubs/{id}`                                | path `id`; multipart `data` = `BFF-CLUB-U`; optional `image`      | `BFF-SECURE` | 200 `BFF-CLUB-R`             | `BFF-ERR` | multipart                         | `ClubApi.updateClub`                   |
| BFF-S-02 | PUT `/api/v1/mobile/secure/config/app-status`                         | JSON `BFF-AS-U`                                                   | `BFF-SECURE` | 200 `BFF-AS-R`               | `BFF-ERR` | single                            | `ConfigApi.updateAppStatus`            |
| BFF-S-03 | POST `/api/v1/mobile/secure/config/divisions`                         | multipart `data` = `BFF-DIV-U`; optional `image`                  | `BFF-SECURE` | 201 `BFF-DIV-R` + Location   | `BFF-ERR` | multipart                         | `ConfigApi.createDivision`             |
| BFF-S-04 | PUT `/api/v1/mobile/secure/config/divisions/{id}`                     | path `id`; same multipart                                         | `BFF-SECURE` | 200 `BFF-DIV-R`              | `BFF-ERR` | multipart                         | `ConfigApi.updateDivision`             |
| BFF-S-05 | DELETE `/api/v1/mobile/secure/config/divisions/{id}`                  | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | `ConfigApi.deactivateDivision`         |
| BFF-S-06 | POST `/api/v1/mobile/secure/config/raw-divisions`                     | JSON `BFF-RAW-R` reused as request                                | `BFF-SECURE` | 201 `BFF-RAW-R` + Location   | `BFF-ERR` | single                            | API method, no source caller           |
| BFF-S-07 | PUT `/api/v1/mobile/secure/config/legal/{type}`                       | path `type`; JSON `BFF-LEGAL-U`                                   | `BFF-SECURE` | 200 `BFF-LEGAL-R`            | `BFF-ERR` | single                            | `ConfigApi.updateLegalDocument`        |
| BFF-S-08 | GET `/api/v1/mobile/secure/config/raw-divisions`                      | optional `league_code`, `season`                                  | `BFF-SECURE` | 200 Array `BFF-RAW-R`        | `BFF-ERR` | unpaged                           | `ConfigApi.getRawDivisionMappings`     |
| BFF-S-09 | GET `/api/v1/mobile/secure/config/raw-divisions/{id}`                 | path `id`                                                         | `BFF-SECURE` | 200 `BFF-RAW-R`              | `BFF-ERR` | single                            | API method, no source caller           |
| BFF-S-10 | PUT `/api/v1/mobile/secure/config/raw-divisions/{id}`                 | path `id`; JSON `BFF-RAW-U`                                       | `BFF-SECURE` | 200 `BFF-RAW-R`              | `BFF-ERR` | single                            | `ConfigApi.updateRawDivisionMapping`   |
| BFF-S-11 | PUT `/api/v1/mobile/secure/config/scrapers/{name}/enabled`            | path `name`; required query `enabled`                             | `BFF-SECURE` | 200 `BFF-SCRAPER-R`          | `BFF-ERR` | single                            | `ConfigApi.updateScraperStatus`        |
| BFF-S-12 | GET `/api/v1/mobile/secure/config/scrapers/status`                    | none                                                              | `BFF-SECURE` | 200 Array `BFF-SCRAPER-R`    | `BFF-ERR` | unpaged                           | `ConfigApi.getScraperStatuses`         |
| BFF-S-13 | POST `/api/v1/mobile/secure/matches/{matchId}/live-link`              | path `matchId`; JSON `BFF-LIVE-U`                                 | `BFF-SECURE` | 200 `BFF-LIVE-R`             | `BFF-ERR` | single                            | `MatchApi.upsertMatchLiveLink`         |
| BFF-S-14 | DELETE `/api/v1/mobile/secure/matches/{matchId}/live-link`            | path `matchId`                                                    | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | `MatchApi.deleteMatchLiveLink`         |
| BFF-S-15 | POST `/api/v1/mobile/secure/matches/{matchId}/live-link/report`       | path `matchId`; JSON `BFF-LIVE-REPORT`                            | `BFF-SECURE` | 204                          | `BFF-ERR` | single                            | `MatchApi.reportMatchLiveLink`         |
| BFF-S-16 | GET `/api/v1/mobile/secure/matches/{matchId}/live-links`              | path `matchId`                                                    | `BFF-SECURE` | 200 Array `BFF-LIVE-HISTORY` | `BFF-ERR` | unpaged                           | `MatchApi.getMatchLiveLinksHistory`    |
| BFF-S-17 | GET `/api/v1/mobile/secure/matches/live-moderation`                   | optional `status`                                                 | `BFF-SECURE` | 200 Array `BFF-LIVE-SUMMARY` | `BFF-ERR` | enriched, unpaged                 | `MatchApi.getMatchesForLiveModeration` |
| BFF-S-18 | POST `/api/v1/mobile/secure/matches/live-links/{id}/approve`          | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | moderation hook                        |
| BFF-S-19 | POST `/api/v1/mobile/secure/matches/live-links/{id}/reject`           | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | moderation hook                        |
| BFF-S-20 | POST `/api/v1/mobile/secure/matches/live-links/{id}/reactivate`       | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | moderation hook                        |
| BFF-S-21 | GET `/api/v1/mobile/secure/notifications`                             | default `page=0`, `size=20`                                       | `BFF-SECURE` | 200 `BFF-NOTIF-PAGE`         | `BFF-ERR` | offset page + division enrichment | `NotificationApi.getNotifications`     |
| BFF-S-22 | GET `/api/v1/mobile/secure/notifications/unread-count`                | none                                                              | `BFF-SECURE` | 200 `{unread}`               | `BFF-ERR` | single; Expo declares `{count}`   | API method, no caller                  |
| BFF-S-23 | POST `/api/v1/mobile/secure/notifications/{id}/read`                  | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | API method, no caller                  |
| BFF-S-24 | POST `/api/v1/mobile/secure/notifications/{id}/opened`                | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | API method, no caller                  |
| BFF-S-25 | DELETE `/api/v1/mobile/secure/notifications/{id}`                     | path `id`                                                         | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | `NotificationApi.deleteNotification`   |
| BFF-S-26 | POST `/api/v1/mobile/secure/notifications/users/{userId}/push-tokens` | path `userId`; JSON `BFF-TOKEN-C`                                 | `BFF-SECURE` | 202                          | `BFF-ERR` | single                            | registration hooks                     |
| BFF-S-27 | PUT `/api/v1/mobile/secure/pools/{id}`                                | path `id`; JSON `BFF-POOL-U`                                      | `BFF-SECURE` | 200 `BFF-POOL-R`             | `BFF-ERR` | single                            | `PoolApi.updatePool`                   |
| BFF-S-28 | PUT `/api/v1/mobile/secure/teams/{id}`                                | path `id`; multipart `data` = `BFF-TEAM-U`; optional `image`      | `BFF-SECURE` | 200 `BFF-TEAM-R`             | `BFF-ERR` | multipart                         | `TeamApi.updateTeam`                   |
| BFF-S-29 | PUT `/api/v1/mobile/secure/users/{auth0Id}`                           | path `auth0Id`; multipart `data` = `BFF-USER-U`; optional `image` | `BFF-SECURE` | 200 `BFF-USER-R`             | `BFF-ERR` | multipart                         | `UserApi.updateUser`                   |
| BFF-S-30 | PUT `/api/v1/mobile/secure/users/me`                                  | no body                                                           | `BFF-SECURE` | 200 `BFF-USER-R`             | `BFF-ERR` | single                            | `UserApi.ensureCurrentUser`            |
| BFF-S-31 | DELETE `/api/v1/mobile/secure/users/me`                               | none                                                              | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | `UserApi.deleteCurrentUser`            |
| BFF-S-32 | POST `/api/v1/mobile/secure/favorites/follow`                         | query `entity_type`, `entity_id`                                  | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | team/pool follow hooks                 |
| BFF-S-33 | DELETE `/api/v1/mobile/secure/favorites/follow`                       | same query                                                        | `BFF-SECURE` | 204                          | `BFF-ERR` | none                              | team/pool follow hooks                 |

## Wire-Shape Registry

The exact current field names and their Java, TypeScript, Python, persistence, producer, and consumer lineage are frozen
in the linked tables. Later OpenAPI work must read the named field sections; copying only a controller return type is
not sufficient.

| Shape codes                                                                             | Current Blockout wire-name families                                                                                                                                                         | Complete field registry                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CFG-AS-R/U`, `BFF-AS-R/U`                                                              | same: `maintenance`, `message`; snake: `image_url`, `min_version_ios`, `min_version_android`, `store_url_ios`, `store_url_android`, `force_update_message`, `last_update`                   | [MRG-252 App Status](backend-contract-audits/mrg-252-config-service.md#app-status)                                                                                                                                                                                                                                            |
| `CFG-DIV-R/U`, `BFF-DIV-R/U`                                                            | same: `id`, `name`, `active`; snake: `main_color`, three gradient color keys, `logo_url`, `created_at`, `last_update`                                                                       | [MRG-252 Division](backend-contract-audits/mrg-252-config-service.md#division)                                                                                                                                                                                                                                                |
| `CFG-LEGAL-R/U`, `BFF-LEGAL-R/U`                                                        | same: `id`, `type`, `title`, `version`, `content`; snake timestamps                                                                                                                         | [MRG-252 Legal Document](backend-contract-audits/mrg-252-config-service.md#legal-document)                                                                                                                                                                                                                                    |
| `CFG-RAW-R/U`, `BFF-RAW-R/U`                                                            | same: `id`, `format`, `gender`, `season`; snake: `raw_division_name`, `division_id`, `league_code`, timestamps                                                                              | [MRG-252 Raw Division Mapping](backend-contract-audits/mrg-252-config-service.md#raw-division-mapping)                                                                                                                                                                                                                        |
| `CFG-SCRAPER-R`, `BFF-SCRAPER-R`                                                        | same: `id`, `name`, `enabled`; snake: `last_update`                                                                                                                                         | [MRG-252 Scraper Status](backend-contract-audits/mrg-252-config-service.md#scraper-status)                                                                                                                                                                                                                                    |
| `CLUB-R/C/U`, `BFF-CLUB-R/U`                                                            | same identity/address/location fields; snake: `raw_name`, `postal_code`, `phone_number`, `logo_url`, timestamps                                                                             | [MRG-253 Service Entity and Multipart Input](backend-contract-audits/mrg-253-clubs-service.md#service-entity-and-multipart-input)                                                                                                                                                                                             |
| `TEAM-R/U`, `BFF-TEAM-R/U`, `BFF-TEAM-DETAIL/SUMMARY`                                   | same enum/name fields; snake: `club_id`, `raw_name`, `short_name`, `league_code`, `division_id`, `followers_count`, `logo_url`, timestamps; enriched nested keys remain snake_case          | [MRG-254 Service Entity and Update Input](backend-contract-audits/mrg-254-teams-service.md#service-entity-and-update-input) and [MRG-265 projection registry](backend-contract-audits/mrg-265-gateway-club-team-pool-aggregations.md)                                                                                         |
| `POOL-R/U`, `BFF-POOL-R/U`, `BFF-POOL-DETAIL/SUMMARY`                                   | same enum/name fields; snake: `pool_code`, `league_code`, `league_name`, `raw_name`, `short_name`, `division_id`, `followers_count`, timestamps; ranking/enrichment keys remain snake_case  | [MRG-255 Service Entity and Update Input](backend-contract-audits/mrg-255-pools-service.md#service-entity-and-update-input) and [MRG-265 projection registry](backend-contract-audits/mrg-265-gateway-club-team-pool-aggregations.md)                                                                                         |
| `COMP-ASSOC-R`, `COMP-STATS-U`, `COMP-RANK-R`                                           | snake identifiers, set/point/stat counters, timestamps, bulk `missing_*_ids`; ranking projection keys use the gateway/global snake strategy                                                 | [MRG-256 Association Entity and Statistics Field Matrix](backend-contract-audits/mrg-256-competition-service.md#association-entity-and-statistics-field-matrix) and [MRG-266 ranking registry](backend-contract-audits/mrg-266-gateway-competition-match-live-aggregations.md)                                                |
| `MATCH-R`, `MATCH-DETAIL-R`, `MATCH-DAY-PAGE`, `BFF-MATCH-DETAIL`, `BFF-MATCH-DAY-PAGE` | snake match/team/pool/date/time/referee/live identifiers and `next_page`; same: status, format, gender, active; enriched nested keys remain snake_case                                      | [MRG-257 Match Field-Lineage Matrix](backend-contract-audits/mrg-257-matches-service.md#match-field-lineage-matrix), [day/detail shapes](backend-contract-audits/mrg-257-matches-service.md#day-and-detail-shapes), and [MRG-266 projections](backend-contract-audits/mrg-266-gateway-competition-match-live-aggregations.md) |
| `MATCH-LIVE-U/R/HISTORY/SUMMARY/REPORT`, corresponding `BFF-LIVE-*`                     | snake: `match_id`, `user_id`, `user_name`, `created_at`, `last_update`, provider/status/history fields; same: `url`, `reason`, `status`; BFF enrichment remains snake_case                  | [MRG-257 live fields](backend-contract-audits/mrg-257-matches-service.md#live-link-and-report-persistence-fields) and [MRG-266 live registry](backend-contract-audits/mrg-266-gateway-competition-match-live-aggregations.md)                                                                                                 |
| `USER-R`, `USER-ENTITY-R`, `USER-U`, `USER-FAVORITE-R`, corresponding `BFF-USER-*`      | snake Auth0/local IDs, picture/profile/timestamp/favorite fields; same display/profile scalars; multipart JSON is snake_case                                                                | [MRG-258 Account and Favorite Field Lineage](backend-contract-audits/mrg-258-users-service.md#account-and-favorite-field-lineage) and [MRG-264 user registry](backend-contract-audits/mrg-264-gateway-config-user-report-search-notification.md)                                                                              |
| `REPORT-C/R`, `BFF-REPORT-C/R`                                                          | request same: `type`, `title`, `description`; response snake GitHub-derived keys such as `html_url`; `images` is the repeated binary part                                                   | [MRG-259 Field-Lineage Matrix](backend-contract-audits/mrg-259-reports-service.md#4-field-lineage-matrix)                                                                                                                                                                                                                     |
| `NOTIF-PAGE`, `NOTIF-TOKEN-C`, `BFF-NOTIF-PAGE`, `BFF-TOKEN-C`                          | page keys `notifications`, `has_next`, `next_page`; notification/entity/target/timestamp keys snake_case; token request snake: `expo_push_token`, `device_id`, with provider platform value | [MRG-260 Field-Lineage Matrix](backend-contract-audits/mrg-260-notification-service.md#5-field-lineage-matrix) and [MRG-264 notification registry](backend-contract-audits/mrg-264-gateway-config-user-report-search-notification.md)                                                                                         |
| `SEARCH-CLUB/TEAM/POOL-R`, corresponding `BFF-SEARCH-*`                                 | service and BFF JSON fields use snake_case; Elasticsearch document properties may be camelCase and are store names, not REST authority                                                      | [MRG-261 Field-Lineage Matrix](backend-contract-audits/mrg-261-search-service.md#5-field-lineage-matrix)                                                                                                                                                                                                                      |
| all cross-service duplicate families                                                    | current and target names, ownership, classifications, and removal gates                                                                                                                     | [MRG-267 owner and field matrix](backend-contract-audits/mrg-267-cross-service-type-field-lineage-matrix.md#3-owner-persistence-derived-and-event-field-matrix)                                                                                                                                                               |

`MATCH-FINISHED-EVENT` is listed only because a REST test trigger accepts it. Its asynchronous contract and exact live
serialization remain MRG-302/MRG-315 work; this inventory does not declare it an OpenAPI-owned event.

## Pagination, Ordering, Empty, And Multipart Compatibility Register

| Boundary             | Current compatibility behavior                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Match day service    | `page` defaults to 0 and `size` to 4; dates and content are queried separately; inactive-only dates can produce empty groups; no validated bounds or stable continuation guarantee. |
| Match day BFF        | Forwards date pagination and emits an enriched day page; current `next_page` behavior and empty-continuation loss are frozen by MRG-266.                                            |
| Notification service | `page=0`, `size=20`; wrapper is `notifications`, `has_next`, `next_page`; order is `created_at DESC` without ID tie-breaker; no bounds.                                             |
| Notification BFF     | Preserves the legacy wrapper while enriching divisions; Expo uses `nextPage` after response conversion.                                                                             |
| Search               | Service returns 200 `[]`; BFF returns 204 with no body for the same empty result and for swallowed search failures.                                                                 |
| Other collections    | Raw unwrapped arrays. Their audit-specific ordering, omissions, and inactive-row rules remain compatibility behavior.                                                               |
| Multipart `data`     | Always a string containing JSON, not a typed Spring part. Expo/BFF manually snake-case, parse, and sometimes reserialize it.                                                        |
| Binary parts         | `image` is optional for division, club, team, and user flows; `images` is optional and repeated for reports. Part names are casing-neutral and remain exact.                        |

## Caller And Deployment Limits

- Proven monorepo callers are recorded on every operation. `no caller found` means only that the checked-out
  monorepo has none; it is not removal authorization.
- Production base URLs, external automation, old mobile versions, and direct integrations are not available in this
  checkout. MRG-304 must treat those callers as compatibility unknowns until deployment evidence closes them.
- The two Python scrapers and search-worker use M2M authentication. Public BFF routes also use M2M downstream; secure
  routes forward the user JWT.
- The gateway has a handwritten call to a nonexistent matches `/live-links/pending` route, but no source caller invokes
  it. It is a client-inventory issue for MRG-303, not a deployed REST operation.
- The exact deployed authentication-filter error body is unknown because it is emitted before controller advice and
  no production capture is available.

## Source Reconciliation And Handoff

The inventory is complete when checked against these independent counts:

- 35 controller classes under `apps/backend/**`;
- 130 `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`, or `@DeleteMapping` annotations;
- 80 owner-service operations represented by CFG-01 through SEARCH-03;
- 50 BFF operations represented by BFF-P-01 through BFF-S-33;
- zero Blockout REST controllers in `search-worker`.

MRG-302 must inventory RabbitMQ independently. MRG-303 must assign every handwritten client, case converter, and
annotation to a generated or external adapter. MRG-304 must resolve compatibility and deployment order before any
legacy read is removed. MRG-317 through MRG-358 may use this inventory to write source contracts, but must preserve
the row-specific errors, collection semantics, multipart behavior, auth, nulls, callers, and wire names until an
explicit correction or compatibility decision says otherwise.
