# MRG-263 — mobile-gateway facade contract audit

- Audit date: 2026-07-16
- Commit: `7eb0dce89f56f04f2340d3c434e91280c65dcf48`
- Scope roots: `apps/backend/mobile-gateway`, `apps/frontend/mobile/src/api`, and proven Expo call sites
- Audited deployable: `mobile-gateway`
- Runtime mutation: none
- Evidence limitations: committed source and configuration only; no deployed route captures, Spring-generated OpenAPI
  document, Auth0 claims, gateway access logs, downstream payloads, cache contents, FFVB/LNV responses, or production
  error fixtures were observed

## Scope

This audit covers all 111 production Java files, 15 controllers, 50 facade operations, 11 handwritten downstream
client classes, 52 DTO classes with 437 declared fields, eight copied enums, the security chains, outbound auth selection,
error translation, casing bridges, cache declarations, the single context-load test, nine handwritten Expo API modules,
and their proven callers. It establishes the operation-level boundary required before the deeper orchestration audits.

MRG-264 owns configuration, user, report, search, and notification orchestration. MRG-265 owns club, team, and pool
aggregation. MRG-266 owns match, competition, ranking, and live aggregation. Those tasks must justify every projection
field, ordering rule, fallback, fan-out, and frontend dependency. This report records which operation enters each call
graph without prematurely selecting the target architecture reserved for MRG-268.

The Spring-generated description is not a target contract. No controller declares a stable OpenAPI `operationId`, the
gateway globally serializes JSON with `SNAKE_CASE`, and copied mutable Lombok DTOs serve transport, aggregation, and
response roles. Blockout-owned target REST and event properties are camelCase. Database and Python identifiers are not
wire properties and may remain snake_case behind adapters. TanStack Query, Orval, generated hooks, auth/error mutators,
and cache keys remain local to the sole Expo application rather than becoming a shared frontend library.

Maaatch is a structural reference only: source OpenAPI fragments, stable operation IDs, generated Java/TypeScript
models, explicit application projections, mapper boundaries, and uniform errors are applicable references. Blockout
keeps its services, Auth0, Expo, FFVB/LNV integration, workflows, and user-visible behavior.

## 1. Runtime Boundary Summary

| Boundary           | Current implementation                                       | Auth / identity                                                                  | Contract consequence                                                                     | Status   |
| ------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| public facade      | `/api/v1/mobile/public/**`, eight controllers, 17 operations | incoming request is `permitAll`; internal calls use M2M                          | public product data is fetched through privileged service credentials                    | `PROVEN` |
| secure facade      | `/api/v1/mobile/secure/**`, seven controllers, 33 operations | any authenticated JWT; no facade scope or role rules                             | downstream services receive the user token and remain the effective authorization owners | `PROVEN` |
| internal transport | ten owner-specific clients over generic `ApiClientService`   | forwarded JWT when the security context holds a JWT, otherwise cached M2M bearer | method, path, query, DTO and error contracts are handwritten                             | `PROVEN` |
| external PDF proxy | signed public token, FFVB/LNV HTTP calls, streamed PDF       | capability token in URL; proxy credentials/config                                | binary response and proxy error semantics require an explicit external adapter contract  | `PROVEN` |
| aggregation        | mutable services build enriched mobile DTOs                  | same auth choice applies to every nested call                                    | fan-out and partial-failure semantics are hidden from the current schema                 | `PROVEN` |
| mobile transport   | nine handwritten API modules and shared Axios wrapper        | public or bearer Axios instance                                                  | requests/queries are deep snake-cased and JSON responses deep camel-cased at runtime     | `PROVEN` |

`SecurityConfig` defines two ordered chains. Public routes are allowed without authentication and secure routes require
only `authenticated()`. There is no `@PreAuthorize`, explicit scope, role, audience, or ownership rule in the 15
controllers. `ApiClientService` chooses the user-forwarding `RestTemplate` whenever an authenticated
`JwtAuthenticationToken` exists; otherwise it uses the M2M template. Therefore public facade calls use M2M and secure
calls forward the caller JWT. Exact downstream scopes and role decisions remain owned by the audited services.

`JwtDebugFilter` runs in both chains and logs an INFO entry for a received JWT or a WARN entry when the Authorization
header is absent. Thus normal public traffic produces missing-header warnings. The filter does not establish an audit
identity or correlation ID.

## 2. Public Facade Operation Inventory

Every current operation ID is `MISSING`. `Expo entry` names the handwritten method; `indirect` means the app consumes a
URL returned inside another response rather than calling the operation through an API module.

| ID        | Method and facade path        | Request                                                          | Response / status                           | Gateway call graph entry                                 | Expo entry and proven caller                              | Status   |
| --------- | ----------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- | -------- |
| `MG-P-01` | GET `/clubs/{id}`             | path string ID                                                   | `ClubDTO`, 200                              | `ClubService` -> club client; phone removed              | `ClubApi.getClubById` -> `useClubById`                    | `PROVEN` |
| `MG-P-02` | GET `/config/app-status`      | none                                                             | `AppStatusDTO`, 200                         | config pass-through                                      | `ConfigApi.getAppStatus` -> `useAppStatus`                | `PROVEN` |
| `MG-P-03` | GET `/config/divisions`       | none                                                             | raw `DivisionDTO[]`, 200                    | config pass-through/cache                                | `ConfigApi.getDivisions` -> `useDivisions`                | `PROVEN` |
| `MG-P-04` | GET `/config/divisions/{id}`  | path long ID                                                     | `DivisionDTO`, 200                          | config pass-through/cache                                | no Expo API method or caller found                        | `PROVEN` |
| `MG-P-05` | GET `/config/legal/{type}`    | untyped path string                                              | `LegalDocumentDTO`, 200                     | config pass-through                                      | `ConfigApi.getLegalDocument` -> `useLegalDocument`        | `PROVEN` |
| `MG-P-06` | GET `/ffvb/pdf/{token}`       | signed path token                                                | inline PDF 200; plain 4xx/5xx errors        | token validation -> FFVB or LNV proxy                    | indirect URL -> `MatchInfoCard`/`Linking`                 | `PROVEN` |
| `MG-P-07` | GET `/matches/{id}`           | path long ID                                                     | `EnrichedMatchDTO`, 200                     | match + pool + config + competition + team enrichment    | `MatchApi.getEnrichedMatchById` -> `useEnrichedMatchById` | `PROVEN` |
| `MG-P-08` | GET `/matches`                | page=0, size=4, required status, optional `pool_ids`, `team_ids` | `EnrichedDayPageDTO`, 200                   | day page + pool/team/division enrichment                 | `MatchApi.getEnrichedMatches` -> `useMatchList`           | `PROVEN` |
| `MG-P-09` | GET `/pools/{id}`             | path long ID                                                     | `EnrichedPoolDTO`, 200                      | pool + division + competition + team enrichment          | `PoolApi.getEnrichedPoolById` -> `useEnrichedPoolById`    | `PROVEN` |
| `MG-P-10` | GET `/pools/by-ids`           | required repeated `ids`                                          | raw `PoolSummaryDTO[]`, 200                 | repeated pool reads + division enrichment                | `PoolApi.getPoolListByIds` -> `useFollowedPoolList`       | `PROVEN` |
| `MG-P-11` | POST `/reports`               | multipart `data` JSON + optional repeated `images`               | `GitHubIssueResponseDTO`, 201               | deserialize then reserialize multipart to report service | `ReportApi.createReport` -> `ReportForm`                  | `PROVEN` |
| `MG-P-12` | GET `/search/clubs`           | required `query`                                                 | raw `ClubSearchDocDTO[]`, 200; empty is 204 | search pass-through                                      | `SearchApi.searchClubs` -> club search hook               | `PROVEN` |
| `MG-P-13` | GET `/search/teams`           | required `query`; optional season, `division_id`, format, gender | raw `TeamSearchDocDTO[]`, 200; empty is 204 | search pass-through                                      | `SearchApi.searchTeams` -> team search hook               | `PROVEN` |
| `MG-P-14` | GET `/search/pools`           | same filter family                                               | raw `PoolSearchDocDTO[]`, 200; empty is 204 | search pass-through                                      | `SearchApi.searchPools` -> pool search hook               | `PROVEN` |
| `MG-P-15` | GET `/teams/{id}`             | path long ID                                                     | `EnrichedTeamDTO`, 200                      | team + config + competition + pool + club enrichment     | `TeamApi.getEnrichedTeamById` -> `useEnrichedTeamById`    | `PROVEN` |
| `MG-P-16` | GET `/teams/by-club/{clubId}` | path string club ID                                              | raw `TeamSummaryDTO[]`, 200                 | team list + divisions + club enrichment                  | `TeamApi.getTeamListByClubId` -> team-by-club hook        | `PROVEN` |
| `MG-P-17` | GET `/teams/by-ids`           | required repeated `ids`                                          | raw `TeamSummaryDTO[]`, 200                 | repeated team reads + divisions + clubs                  | `TeamApi.getTeamListByIds` -> followed-team hook          | `PROVEN` |

Facade paths in this and the next table are relative to the public or secure base. Search deliberately returns 204 for
an empty list while other list operations return 200 with `[]`. The future contract must preserve that behavior until
an explicit compatibility decision changes it.

## 3. Secure Facade Operation Inventory

| ID        | Method and facade path                           | Request                                   | Response / status                      | Gateway call graph entry                   | Expo entry and proven caller                              | Status   |
| --------- | ------------------------------------------------ | ----------------------------------------- | -------------------------------------- | ------------------------------------------ | --------------------------------------------------------- | -------- |
| `MG-S-01` | PUT `/clubs/{id}`                                | multipart `data` + image                  | `ClubDTO`, 200                         | club multipart relay/cache                 | `ClubApi.updateClub` -> `ClubForm`                        | `PROVEN` |
| `MG-S-02` | PUT `/config/app-status`                         | `AppStatusUpdateDTO`                      | `AppStatusDTO`, 200                    | config pass-through                        | `ConfigApi.updateAppStatus` -> admin screen               | `PROVEN` |
| `MG-S-03` | POST `/config/divisions`                         | multipart update + image                  | `DivisionDTO`, 201 + Location          | config multipart relay/cache               | `ConfigApi.createDivision` -> `DivisionForm`              | `PROVEN` |
| `MG-S-04` | PUT `/config/divisions/{id}`                     | multipart update + image                  | `DivisionDTO`, 200                     | config multipart relay/cache               | `ConfigApi.updateDivision` -> `DivisionForm`              | `PROVEN` |
| `MG-S-05` | DELETE `/config/divisions/{id}`                  | path ID                                   | 204                                    | downstream delete/cache eviction           | `ConfigApi.deactivateDivision` -> `DivisionItem`          | `PROVEN` |
| `MG-S-06` | POST `/config/raw-divisions`                     | `RawDivisionMappingDTO` reused as request | same DTO, 201 + Location               | config pass-through                        | `ConfigApi.createRawDivisionMapping`; no caller found     | `PROVEN` |
| `MG-S-07` | PUT `/config/legal/{type}`                       | `LegalDocumentUpdateDTO`                  | `LegalDocumentDTO`, 200                | config pass-through                        | `ConfigApi.updateLegalDocument` -> `LegalDocumentForm`    | `PROVEN` |
| `MG-S-08` | GET `/config/raw-divisions`                      | optional `league_code`, season            | raw DTO array, 200                     | config pass-through                        | `ConfigApi.getRawDivisionMappings` -> mapping hook        | `PROVEN` |
| `MG-S-09` | GET `/config/raw-divisions/{id}`                 | path ID                                   | `RawDivisionMappingDTO`, 200           | config pass-through                        | `ConfigApi.getRawDivisionMappingById`; no caller found    | `PROVEN` |
| `MG-S-10` | PUT `/config/raw-divisions/{id}`                 | update DTO                                | mapping DTO, 200                       | config pass-through                        | `ConfigApi.updateRawDivisionMapping` -> mapping form      | `PROVEN` |
| `MG-S-11` | PUT `/config/scrapers/{name}/enabled`            | required `enabled` query                  | `ScraperStatusDTO`, 200                | config pass-through                        | `ConfigApi.updateScraperStatus` -> admin screen           | `PROVEN` |
| `MG-S-12` | GET `/config/scrapers/status`                    | none                                      | raw status array, 200                  | config pass-through                        | `ConfigApi.getScraperStatuses` -> scraper-status hook     | `PROVEN` |
| `MG-S-13` | POST `/matches/{matchId}/live-link`              | live-link request                         | live-link response, 200                | match pass-through                         | `MatchApi.upsertMatchLiveLink` -> live-link form/hooks    | `PROVEN` |
| `MG-S-14` | DELETE `/matches/{matchId}/live-link`            | path ID                                   | 204                                    | match pass-through                         | `MatchApi.deleteMatchLiveLink` -> live-link hooks         | `PROVEN` |
| `MG-S-15` | POST `/matches/{matchId}/live-link/report`       | reason request                            | 204                                    | match pass-through                         | `MatchApi.reportMatchLiveLink` -> report flow             | `PROVEN` |
| `MG-S-16` | GET `/matches/{matchId}/live-links`              | path ID                                   | raw history array, 200                 | match pass-through                         | `MatchApi.getMatchLiveLinksHistory` -> history hook       | `PROVEN` |
| `MG-S-17` | GET `/matches/live-moderation`                   | optional status                           | enriched summary array, 200            | match list + pool/division/team enrichment | `MatchApi.getMatchesForLiveModeration` -> moderation hook | `PROVEN` |
| `MG-S-18` | POST `/matches/live-links/{id}/approve`          | path ID                                   | 204                                    | match pass-through                         | `MatchApi.approvePendingLiveLink` -> moderation hook      | `PROVEN` |
| `MG-S-19` | POST `/matches/live-links/{id}/reject`           | path ID                                   | 204                                    | match pass-through                         | `MatchApi.rejectPendingLiveLink` -> moderation hook       | `PROVEN` |
| `MG-S-20` | POST `/matches/live-links/{id}/reactivate`       | path ID                                   | 204                                    | match pass-through                         | `MatchApi.reactivateLiveLink` -> moderation hook          | `PROVEN` |
| `MG-S-21` | GET `/notifications`                             | page=0, size=20                           | `EnrichedUserNotificationPageDTO`, 200 | notification page + division enrichment    | `NotificationApi.getNotifications` -> `useNotifications`  | `PROVEN` |
| `MG-S-22` | GET `/notifications/unread-count`                | none                                      | `UnreadCountDTO {unread}`, 200         | notification pass-through                  | Expo expects `{count}`; no caller found                   | `PROVEN` |
| `MG-S-23` | POST `/notifications/{id}/read`                  | path ID                                   | 204                                    | notification pass-through                  | API method exists; no caller found                        | `PROVEN` |
| `MG-S-24` | POST `/notifications/{id}/opened`                | path ID                                   | 204                                    | notification pass-through                  | API method exists; no caller found                        | `PROVEN` |
| `MG-S-25` | DELETE `/notifications/{id}`                     | path ID                                   | 204                                    | notification pass-through                  | `NotificationApi.deleteNotification` -> deletion hook     | `PROVEN` |
| `MG-S-26` | POST `/notifications/users/{userId}/push-tokens` | `RegisterPushTokenRequestDTO`             | 202                                    | notification pass-through                  | registration hook and notification utility                | `PROVEN` |
| `MG-S-27` | PUT `/pools/{id}`                                | `PoolUpdateDTO`                           | `PoolDTO`, 200                         | pool pass-through/cache                    | `PoolApi.updatePool` -> `PoolForm`                        | `PROVEN` |
| `MG-S-28` | PUT `/teams/{id}`                                | multipart `data` + image                  | `TeamDTO`, 200                         | team multipart relay/cache                 | `TeamApi.updateTeam` -> `TeamForm`                        | `PROVEN` |
| `MG-S-29` | PUT `/users/{auth0Id}`                           | multipart `data` + image                  | `CustomUserDTO`, 200                   | user relay using path identity             | `UserApi.updateUser` -> `ProfileForm`                     | `PROVEN` |
| `MG-S-30` | PUT `/users/me`                                  | no body                                   | `CustomUserDTO`, 200                   | ensure current downstream user             | `UserApi.ensureCurrentUser` -> `useEnsureUser`            | `PROVEN` |
| `MG-S-31` | DELETE `/users/me`                               | none                                      | 204                                    | delete current downstream user             | `UserApi.deleteCurrentUser` -> profile route              | `PROVEN` |
| `MG-S-32` | POST `/favorites/follow`                         | `entity_type`, `entity_id` query          | 204                                    | user pass-through/cache eviction           | `UserApi.follow` -> team/pool follow hooks                | `PROVEN` |
| `MG-S-33` | DELETE `/favorites/follow`                       | same query                                | 204                                    | user pass-through/cache eviction           | `UserApi.unfollow` -> team/pool follow hooks              | `PROVEN` |

The path identity in `MG-S-29` is not bound to the JWT subject by the gateway. It is forwarded to users-service, which
must remain the authorization owner until an approved contract moves that rule. Conversely, the `auth0Id` argument in
the gateway follow/unfollow service is not placed in the downstream URL or body; the forwarded JWT supplies identity.

### 3.1 Expo caller coverage

The nine modules expose 48 methods for 48 of the 50 facade operations. There is no method for `MG-P-04`; `MG-P-06` is
consumed indirectly through signed URLs. The following matrix records every direct method and every source caller found.

| Expo API          | Methods -> source callers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `ClubApi`         | `getClubById` -> `useClubById`; `updateClub` -> `ClubForm`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `PROVEN` |
| `ConfigApi`       | `getLegalDocument` -> `useLegalDocument`; `updateLegalDocument` -> `LegalDocumentForm`; `getDivisions` -> `useDivisions`; `createDivision`/`updateDivision` -> `DivisionForm`; `deactivateDivision` -> `DivisionItem`; `getRawDivisionMappings` -> `useRawDivisionMapping`; `updateRawDivisionMapping` -> `RawDivisionMappingForm`; `updateScraperStatus` -> `AdminScreen`; `getScraperStatuses` -> `useScraperStatus`; `getAppStatus` -> `useAppStatus`; `updateAppStatus` -> three flows in `AdminScreen`; `getRawDivisionMappingById` and `createRawDivisionMapping` -> no caller found | `PROVEN` |
| `MatchApi`        | `getEnrichedMatches` -> `useMatchList`; `getEnrichedMatchById` -> `useEnrichedMatchById`; `upsertMatchLiveLink` -> `MatchLiveLinkForm`; `deleteMatchLiveLink` -> `MatchLiveLinkDeleteForm` and `MatchLiveLinksHistoryScreen`; `reportMatchLiveLink` -> `MatchLiveLinkReportForm`; `getMatchLiveLinksHistory` -> `useMatchLiveLinksHistory`; `getMatchesForLiveModeration` -> `useLiveModerationMatches`; approve/reject/reactivate -> `MatchLiveLinksHistoryScreen`                                                                                                                        | `PROVEN` |
| `NotificationApi` | `getNotifications` -> `useNotifications`; `deleteNotification` -> `useDeleteNotification`; `registerPushToken` -> `useRegisterPushToken` from `SessionProvider` and `registerPushTokenOnBackend` from onboarding; unread count/read/opened -> no caller found                                                                                                                                                                                                                                                                                                                              | `PROVEN` |
| `PoolApi`         | `getEnrichedPoolById` -> `useEnrichedPoolById`; `getPoolListByIds` -> `useFollowedPoolList`; `updatePool` -> `PoolForm`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `PROVEN` |
| `ReportApi`       | `createReport` -> `ReportForm`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `PROVEN` |
| `SearchApi`       | club/team/pool search -> `useSearchClubs`, `useSearchTeams`, `useSearchPools` respectively                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `PROVEN` |
| `TeamApi`         | enriched/by-club/by-IDs reads -> `useEnrichedTeamById`, `useTeamListByClubId`, `useFollowedTeamList`; `updateTeam` -> `TeamForm`                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `PROVEN` |
| `UserApi`         | `ensureCurrentUser` -> `useEnsureUser`; `updateUser` -> `ProfileForm`; `deleteCurrentUser` -> profile route; follow/unfollow -> `useTeamFollowState` and `usePoolFollowState`                                                                                                                                                                                                                                                                                                                                                                                                              | `PROVEN` |

## 4. Handwritten Downstream Client Inventory

| Client                      | Downstream boundary   | Methods / route families                                 | DTO direction                 | Cache / special behavior                                                    | Status   |
| --------------------------- | --------------------- | -------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- | -------- |
| `ApiClientService`          | all internal services | generic GET/POST/PUT/DELETE and multipart variants       | caller-selected classes       | selects forwarded JWT or M2M; 5 s connect/15 s read; logs URL and auth mode | `PROVEN` |
| `ClubClientService`         | clubs-service         | get `/{id}`, get `/{id}/logo`, multipart put `/{id}`     | club response/update          | club and logo caches; update evicts logo                                    | `PROVEN` |
| `CompetitionClientService`  | competition-service   | team pools, pool teams, team pools-with-ranking          | associations/ranking          | no generated types or batching                                              | `PROVEN` |
| `ConfigClientService`       | config-service        | app status, divisions, legal, raw divisions, scrapers    | nine copied config shapes     | division caches; multipart division relay; snake query names                | `PROVEN` |
| `MatchClientService`        | matches-service       | day groups, match, live-link, history/moderation/actions | seven copied match shapes     | action paths and raw arrays                                                 | `PROVEN` |
| `NotificationClientService` | notification-service  | page/count/read/opened/delete/push token                 | four copied shapes            | user JWT forwarded; no local ownership check                                | `PROVEN` |
| `PoolClientService`         | pools-service         | get by ID, list by IDs, update                           | pool response/update          | ID cache; list query includes `active=true`                                 | `PROVEN` |
| `ReportClientService`       | reports-service       | multipart create at configured base                      | report request/issue response | reads images into memory; serializes JSON part manually                     | `PROVEN` |
| `SearchClientService`       | search-service        | clubs/teams/pools search                                 | three search arrays           | manually builds legacy snake query names                                    | `PROVEN` |
| `TeamClientService`         | teams-service         | get by ID, list by IDs/club, multipart update            | team response/update          | team/club caches; legacy `club_id` query                                    | `PROVEN` |
| `UserClientService`         | users-service         | path user update, me, favorites                          | user response/update          | auth0 argument ignored for favorite URL; cache eviction                     | `PROVEN` |

No generated client exists. The configured URL is treated as a caller-owned route base, so some clients append resource
segments while others call it directly. Example configuration uses service hosts, but several calls require a resource
prefix; actual deployed values are `UNKNOWN`. The contract-first client must own paths and leave configuration with a
documented origin/base URL policy.

M2M refresh catches and suppresses refresh failures, so the gateway can continue with a blank token. Refresh uses a
fixed interval rather than token expiry. These are runtime policies to preserve or deliberately replace, not defaults
to inherit accidentally from a generator.

## 5. DTO and Enum Inventory

All 52 DTO classes are mutable gateway-owned copies or gateway projections. There is no generated API model package,
record-based request/view boundary, domain model, entity boundary, or mapper package. The table records every class and
field; detailed field justification belongs to MRG-264 through MRG-267 and the owning-service audits MRG-252 through
MRG-261.

| Family       | Classes and declared fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Current role                                                         | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------- |
| club         | `ClubDTO`: id, rawName, name, city, postalCode, email, phoneNumber, website, logoUrl, latitude, longitude, active, createdAt, lastUpdate; `ClubUpdateDTO`: id, rawName, name, city, postalCode, logoUrl, email, phoneNumber, website                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | copied response and update/multipart request                         | `PROVEN` |
| competition  | `CompetitionAssociationDTO`: id, poolId, teamId, clubId, active, points, played, wins, losses, winsThreeToZero, winsThreeToOne, winsThreeToTwo, lossesZeroToThree, lossesOneToThree, lossesTwoToThree, wonSets, lostSets, wonPoints, lostPoints, pointsPenalty, coefSets, coefPoints, createdAt, lastUpdate; `PoolWithRankingDTO`: poolId, ranking; `TeamRankingDTO`: teamId, points, pointsPenalty, played, wins, losses, coefSets, coefPoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | copied downstream rows used to assemble rankings                     | `PROVEN` |
| config       | `AppStatusDTO`: maintenance, message, imageUrl, minVersionIos, minVersionAndroid, storeUrlIos, storeUrlAndroid, forceUpdateMessage, lastUpdate; `AppStatusUpdateDTO`: same except lastUpdate; `DivisionDTO`: id, name, mainColor, firstGradientColor, secondGradientColor, thirdGradientColor, logoUrl, active, createdAt, lastUpdate; `DivisionUpdateDTO`: name and four colors; `LegalDocumentDTO`: id, type, title, version, content, createdAt, lastUpdate; `LegalDocumentUpdateDTO`: title, version, content; `RawDivisionMappingDTO`: id, rawDivisionName, divisionId, format, gender, leagueCode, season, createdAt, lastUpdate; `RawDivisionMappingUpdateDTO`: divisionId, format, gender; `ScraperStatusDTO`: id, name, enabled, lastUpdate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | copied requests/responses; one response DTO reused as create request | `PROVEN` |
| match        | `DayMatchesDTO`: date, pools; `DayPageDTO`: dayMatches, hasNext, nextPage; `EnrichedDayMatchesDTO`: date, pools; `EnrichedDayPageDTO`: dayMatches, hasNext, nextPage; `EnrichedMatchDTO`: id, liveCode, matchDate, season, set, score, status, venue, firstReferee, secondReferee, liveUrl, liveProvider, liveOwnerAuth0Id, teamA, teamB, matchAddressPdfUrl, matchSheetPdfUrl, pool; `EnrichedMatchLiveLinkDTO`: liveLinkId, matchId, matchDate, season, set, score, teamA, teamB, poolName, divisionName, leagueName, liveUrl, liveOwnerAuth0Id, liveOwnerUsername; `EnrichedMatchLiveSummaryDTO`: id, matchDate, season, set, score, status, liveCode, lastLiveLinkId, lastLiveLinkStatus, lastLiveLinkProvider, lastLiveLinkUrl, lastLiveLinkOwnerAuth0Id, lastLiveLinkCreatedAt, teamA, teamB, pool; `EnrichedPoolMatchesDTO`: pool, matches; `MatchDTO`: id, matchCode, leagueCode, poolId, liveCode, teamIdA, teamIdB, matchDate, season, set, score, status, venue, firstReferee, secondReferee, liveUrl, liveProvider, liveOwnerAuth0Id; `MatchLiveLinkDTO`: id, matchId, provider, url, status, reportCount, ownerAuth0Id, createdAt, lastUpdate; request/report/response DTOs: url; reason; matchId, provider, url, status, reportCount, ownerAuth0Id; `MatchLiveSummaryDTO`: match base plus last-live fields; `PoolMatchesDTO`: poolId, matches | copied service results plus large mobile projections                 | `PROVEN` |
| notification | `EnrichedUserNotificationDTO`: id, userId, type, title, body, deepLink, targetType, targetId, metadata, isRead, isOpened, createdAt, readAt, openedAt, divisionLogoUrl; `EnrichedUserNotificationPageDTO`: notifications, hasNext, nextPage; `RegisterPushTokenRequestDTO`: expoPushToken, platform, deviceId; `UnreadCountDTO`: unread; `UserNotificationDTO`: enriched fields except divisionLogoUrl; `UserNotificationPageDTO`: notifications, hasNext, nextPage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | copied page/request/count plus enriched mobile page                  | `PROVEN` |
| pool         | `EnrichedPoolDTO`: id, season, poolCode, leagueCode, leagueName, name, shortName, rawName, format, gender, followersCount, ranking, division; `PoolDTO`: id, poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, followersCount, active, createdAt, lastUpdate; `PoolSummaryDTO`: id, name, shortName, leagueName, leagueCode, season, gender, format, division; `PoolUpdateDTO`: poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, active                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | copied pool transport plus mobile projections                        | `PROVEN` |
| report       | `GitHubIssueResponseDTO`: id, number, htmlUrl, title, state; `ReportCreateDTO`: type, title, description, appVersion, userId, userName, screen, deviceModel, os, attachmentImageUrls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | copied multipart request/response                                    | `PROVEN` |
| search       | `ClubSearchDocDTO`: id, name, logoUrl, city; `PoolSearchDocDTO`: id, name, shortName, divisionName, leagueCode, leagueName, season, format, gender, logoUrl; `TeamSearchDocDTO`: id, name, shortName, clubId, clubName, clubCity, logoUrl, divisionName, format, gender, season                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | copied search response documents                                     | `PROVEN` |
| team         | `EnrichedTeamDTO`: id, name, clubId, shortName, rawName, format, gender, season, followersCount, logoUrl, club, division, pools; `TeamDTO`: id, clubId, rawName, name, shortName, leagueCode, divisionId, format, gender, season, latitude, longitude, followersCount, logoUrl, active, createdAt, lastUpdate; `TeamSummaryDTO`: id, name, season, gender, format, logoUrl, division, club, shortName; `TeamUpdateDTO`: clubId, rawName, name, shortName, leagueCode, divisionId, logoUrl, season, format, gender, active; `TeamWithStatsDTO`: id, name, shortName, logoUrl, points, played, wins, losses, pointsPenalty, longitude, latitude, coefSets, coefPoints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | copied transport plus ranking/mobile projections                     | `PROVEN` |
| user         | `CustomUserDTO`: id, auth0Id, email, pseudo, firstName, lastName, pictureUrl, phoneNumber, active, createdAt, lastUpdate, favorites; `CustomUserUpdateDTO`: id, pseudo, firstName, lastName, pictureUrl; `UserFavoriteDTO`: entityType, entityId                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | copied user response/update/favorite                                 | `PROVEN` |

The eight enum copies are: `DevicePlatform` = IOS/ANDROID/WEB/UNKNOWN; `EntityType` = TEAM/POOL; `Format` =
SIX/FOUR/TWO; `Gender` = M/F/O; `LiveLinkStatus` = ACTIVE/DEACTIVATED/BANNED/EXPIRED/PENDING/REJECTED;
`LiveProvider` = YOUTUBE/TWITCH/FACEBOOK; `MatchStatus` = UPCOMING/FINISHED; and `ReportType` =
DISPLAY_BUG/DATA_ERROR/LOGO/LIVE/OTHER.

Only `ReportCreateDTO.type` and `.title` declare Bean Validation constraints. `NotificationSecureController` applies
`@Valid` to `RegisterPushTokenRequestDTO`, but that DTO declares no constraints, so the annotation currently rejects
nothing. Other facade request DTOs have no gateway validation policy.

## 6. Casing and Mobile Client Bridge

The gateway's ObjectMapper uses `PropertyNamingStrategies.SNAKE_CASE`. Of 437 DTO fields, 220 also carry explicit
`@JsonProperty` names, while classes such as `CustomUserDTO` and the search DTOs rely only on the global strategy. This
mix makes the generated Spring schema and runtime JSON depend on implementation configuration rather than an
authoritative contract.

Expo's `HttpClient` defaults `transformCase` to true. It deep-converts JSON bodies and query parameters to snake_case,
then deep-converts JSON responses to camelCase. GET parameters are converted because the absence of a Content-Type is
treated as JSON-compatible. Multipart API modules separately call `appendJsonSnake` for the `data` part. Concrete
examples include `poolIds -> pool_ids`, `divisionId -> division_id`, `logoUrl -> logo_url`, and
`entityType -> entity_type`.

This runtime bridge hides drift. `NotificationApi.getUnreadNotificationsCount` declares `{count: number}`, while the
gateway sends `{unread: number}`. No caller currently consumes the method, so no user-visible regression is proven, but
generation would expose the mismatch immediately. The camelCase cutover must replace conversion code and JSON
annotations only after operation fixtures prove compatibility; it must not run two conflicting transformations.

TanStack Query is used by Expo hooks around these API modules. Because Expo is the only application, the target Orval
configuration, generated operations, React Query hooks, cache keys, and handwritten mutators remain under the mobile
application. Shared artifacts should be limited to authoritative contract sources and generated language models where
cross-runtime reuse is justified.

## 7. Error, Timeout, and Logging Behavior

`GlobalExceptionHandler` returns a five-key legacy JSON object (`timestamp`, `status`, `error`, `message`, `path`) for
handled controller exceptions. `HttpClientErrorException` preserves the downstream status and tries to extract only a
downstream `message`; `ApiErrorUtils.extractCode` has no caller. `InconsistentStateException` becomes 500,
`IllegalStateException` and `ServletRequestBindingException` become 400, and the catch-all becomes a generic 500.
There is no stable error code, Problem Detail type, field-error list, request/correlation ID, or retry metadata.

Downstream 5xx, connection/timeouts, malformed JSON, multipart serialization failures, type mismatches, and many
validation failures fall into the generic 500 path. Authentication failures occur before controller advice and their
exact deployed shape is `UNKNOWN`. The Expo wrapper normalizes Axios errors locally, uses a 20-second timeout, calls a
401 callback, and silently removes the Authorization header when its token supplier fails.

Internal clients use 5-second connect and 15-second read timeouts. `ApiClientService` logs full downstream URLs and the
selected auth mode. Expo passes method, URL, headers, parameters, and data to `console.log`; the headers object includes
Authorization for authenticated calls, so bearer-token exposure in application logs is source-proven. The FFVB proxy
logs the signed capability token, payload identifiers, upstream URLs, and upstream error bodies. These values require
redaction during the compatibility-preserving migration.

The PDF proxy has a separate error surface: invalid or expired signed tokens return 401, invalid kinds return 400,
upstream HTTP exceptions are translated to 502, direct non-2xx responses preserve their status with a plain body, and
unhandled failures return 500. A successful response is an inline, no-store PDF. This binary endpoint must not be
forced into the standard JSON error path without an explicit compatibility decision.

## 8. Aggregation, Cache, and Ownership Handoff

The gateway creates large mobile projections because a screen needs data owned by multiple services. That product
reason is valid; the current implementation nevertheless mixes downstream DTO copies, screen projections, caches,
fallbacks, logging, and mapping inside service classes. The next audits must preserve the user-visible result while
separating generated downstream transport types from explicit application views and mappers.

| Entry family                 | Proven downstream owners                                        | Deep audit owner |
| ---------------------------- | --------------------------------------------------------------- | ---------------- |
| config, user, report, search | respective single service, with multipart/auth/error adaptation | MRG-264          |
| notification page            | notification-service plus config-service division enrichment    | MRG-264          |
| club                         | clubs-service plus public phone-number removal                  | MRG-265          |
| team                         | teams, config, competition, pools, clubs                        | MRG-265          |
| pool                         | pools, config, competition, teams                               | MRG-265          |
| match/day/live moderation    | matches, pools, config, competition, teams; signed FFVB links   | MRG-266          |

Caffeine caches divisions for one day and club/team/pool data for four hours. Public M2M calls and secure user-token
calls use cache keys that omit principal and auth mode. Current cached resources are product data rather than a proven
per-user response, but cache hits bypass repeated downstream authorization and invalidation is partial. MRG-264 through
MRG-266 must record exact ownership and invalidation before generated clients or projections change cache placement.

## 9. Findings and Contract-First Requirements

| ID        | Finding                                                        | Consequence                                                   | Required follow-up                                                                     | Status   |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `MG-F-01` | no source OpenAPI or stable operation IDs for 50 operations    | generated clients cannot be authoritative                     | MRG-301/305/308 define every operation and uniqueness rule                             | `PROVEN` |
| `MG-F-02` | 52 mutable DTO copies, 437 fields, no mapper package           | transport changes can leak into screen responses              | MRG-264-268 classify and separate generated, application, domain and persistence roles | `PROVEN` |
| `MG-F-03` | global snake strategy + 220 annotations + Expo deep conversion | runtime magic hides wire drift and duplicates work            | MRG-303/304/352 stage one camelCase cutover per boundary                               | `PROVEN` |
| `MG-F-04` | all secure routes require only authentication at the facade    | authorization semantics are implicit downstream               | preserve fixtures and assign every scope/ownership rule in MRG-268/317                 | `PROVEN` |
| `MG-F-05` | public routes use privileged M2M internally                    | public availability depends on token refresh and service auth | make service credential policy explicit in generated client adapters                   | `PROVEN` |
| `MG-F-06` | unread-count TypeScript expects `count`, Java returns `unread` | generated typing will break an unused handwritten assumption  | choose and fixture canonical field before activation                                   | `PROVEN` |
| `MG-F-07` | search empty list uses 204 while other arrays use 200          | uniform generator defaults could change behavior              | capture and preserve operation-specific empty semantics                                | `PROVEN` |
| `MG-F-08` | `@Valid` push-token request has no constraints                 | invalid payload behavior is undefined                         | define validation and stable errors from observed compatibility                        | `PROVEN` |
| `MG-F-09` | broad generic error translation loses downstream codes         | mobile cannot reliably branch on errors                       | design stable BFF error catalog after capturing current fixtures                       | `PROVEN` |
| `MG-F-10` | Expo and FFVB logging can expose bearer/capability tokens      | credentials may enter logs                                    | redact without changing API behavior                                                   | `PROVEN` |
| `MG-F-11` | configured URL semantics mix origin and resource base          | environment configuration is part of handwritten contracts    | generated clients own paths; document base URL convention                              | `PROVEN` |
| `MG-F-12` | only one unisolated context-load test exists                   | no facade parity or aggregation safety net                    | MRG-318-322 add generated API, adapter, mapping and compatibility tests                | `PROVEN` |

## 10. Provisional Target Roles

These roles are evidence-based inputs, not an MRG-268 architecture approval:

- source OpenAPI fragments own the 50 mobile facade operations, stable operation IDs, camelCase properties and query
  names, multipart/binary behavior, security declarations, pagination, arrays, and errors;
- generated Java API models remain transport-only and generated downstream clients replace the ten owner-specific
  handwritten route builders;
- explicit application commands and immutable mobile views model updates and enriched screen responses;
- mappers isolate generated types, application types, domain concepts, and any persistence entities in owning services;
- the BFF retains justified aggregation, signed-PDF links, compatibility fallbacks, and screen-focused projections;
- Expo-local Orval output owns functions and TanStack hooks, with a small handwritten auth/error/casing-free transport
  mutator and no shared TanStack library;
- external FFVB/LNV calls remain handwritten or generated external adapters and do not dictate Blockout contracts;
- Python scraper code may keep Pythonic snake_case internally while its Blockout-owned wire adapter speaks camelCase.

## 11. Validation and Unknowns

Source inspection proves all 50 facade operations, 11 client classes, 52 DTOs, eight enums, nine Expo API modules,
security chains, casing transformations, error handlers, timeouts, logs, cache declarations, and current call sites. The
following runtime facts remain `UNKNOWN` and must be captured before cutover:

Validation results:

- Prettier check passes for this report;
- documentation local-link validation passes;
- `git diff --check` passes;
- `mvn -f apps/backend/pom.xml -pl mobile-gateway -am -DskipTests package` passes;
- the direct `mobile-gateway` test run reaches its only context-load test but fails before assertions because the test
  provides no `AUTH0_ISSUER`. This pre-existing environment coupling is consistent with the missing isolated facade
  test finding; no product or audit code caused the failure;
- the Maaatch source-contract fragments, generated `schemaMappings`, BFF Problem Detail normalization, and focused BFF
  error tests were inspected read-only as structural references.

- deployed base URLs, downstream route prefixes, Auth0 audiences/scopes/claims, M2M expiry and refresh behavior;
- actual Spring-generated OpenAPI, JSON/multipart/error fixtures, security-filter error bodies, and 204 response bodies;
- downstream failure bodies, cache hit/miss behavior, fan-out latency, partial failures, and ordering under live data;
- signed PDF expiry/rotation behavior and real FFVB/LNV content/error responses;
- whether the five currently uncalled Expo methods or the division-by-ID facade route have external consumers;
- whether mobile log collection persists bearer headers or signed PDF URLs in deployed builds.

No runtime behavior, contract, generated artifact, DTO, mapper, client, route, error, cache, auth rule, or Expo caller was
changed by this audit.
