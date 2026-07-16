# MRG-266 — mobile-gateway competition, match, and live aggregation audit

- Audit date: 2026-07-16
- Commit: `088f787c977f1a16a573572cb4af78cb8db15b50`
- Scope roots: `apps/backend/mobile-gateway`, match-facing `apps/backend/matches-service` and
  `apps/backend/competition-service` sources, `apps/frontend/mobile/src`, and MRG-256, MRG-257, MRG-263, and MRG-265
  audit evidence
- Audited workflow: public match list/detail, competition-backed ranking, secure live-link commands/history, and live
  moderation
- Runtime mutation: none
- Evidence limitations: committed source only; no deployed payloads, generated Springdoc document, access logs,
  production cache state, fan-out/latency traces, Auth0 tokens, safe database samples, active mobile-version inventory,
  or physical mobile run were available

## Scope

This audit covers all ten match-facing mobile-gateway operations: two public reads and eight secure live operations. It
follows `MatchPublicController` and `MatchSecureController` through `MatchService`; every match, pool, team, club,
division, and competition client call; day pagination, ranking construction, signed PDF-link generation, mutable team
enrichment, caches, errors, and logs; and every proven Expo list, detail, ranking, live-link, history, moderation, form,
and navigation consumer.

There is no standalone competition facade operation in the gateway. Competition-service participates only as the
association/ranking source for match detail in this scope; club/team/pool aggregation already audited by MRG-265 is
repeated here only where match behavior depends on it. MRG-256 and MRG-257 continue to own competition and matches
persistence, scraper, event, state-policy, and database details. MRG-267 owns the consolidated field matrix, and
MRG-268 owns target architecture and migration order.

No current Springdoc shape is promoted to a target contract. Blockout-owned target REST and event properties remain
camelCase. Database columns and Python-internal identifiers may remain snake_case behind adapters. The gateway's
explicit Jackson annotations, Expo deep request/response conversion, and handwritten clients are compatibility
evidence only. Orval and TanStack Query remain local to the sole Expo application.

Maaatch remains a read-only structural reference. Its competition public-read workflow separates a generated inbound
interface and mapper, application service/view/port, generated downstream client adapter, outbound view mapper, and
focused application tests. Those roles are relevant to Blockout; Maaatch competition payloads, publication rules, web
architecture, and product behavior are not.

## 1. Runtime Boundary Summary

| Boundary                     | Current owner                                 | Entry / calls                                                                        | Auth                                          | Data owner                    | Aggregation role                                                       | Evidence                                          | Status           |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- | ---------------- |
| public match list            | mobile-gateway match facade                   | one day page, then pools, teams, clubs, and divisions                                | anonymous inbound; M2M outbound               | matches plus catalog services | paginated date/pool/mobile row projection                              | public controller and `getMatchList`              | `PROVEN`         |
| public match detail          | mobile-gateway match facade                   | match, pool, division, competition associations, teams, clubs, local PDF tokens      | anonymous inbound; M2M outbound               | owning downstream services    | detail, ranking, live, and signed-link projection                      | public controller and `getMatchById`              | `PROVEN`         |
| competition ranking source   | competition-service through gateway client    | active associations for one pool                                                     | M2M from public facade                        | competition-service           | supplies ranking statistics only                                       | `CompetitionClientService` and association source | `PROVEN`         |
| secure live commands         | mobile-gateway match facade                   | one matches-service call per command                                                 | authenticated inbound; forwarded JWT outbound | matches-service               | pass-through plus subject logging                                      | secure controller/service/client                  | `PROVEN`         |
| secure live history          | mobile-gateway match facade                   | one matches-service call                                                             | authenticated inbound; forwarded JWT outbound | matches-service               | raw copied history list                                                | history controller/service/client                 | `PROVEN`         |
| secure moderation            | mobile-gateway match facade                   | one summary list, then pools, divisions, teams, and clubs                            | authenticated inbound; forwarded JWT outbound | matches plus catalog services | unbounded enriched moderation list                                     | `listMatchesForLiveModeration`                    | `PROVEN`         |
| signed PDF continuation      | mobile-gateway FFVB facade                    | local token generation during detail; external proxy call only after user opens link | anonymous tokenized proxy                     | FFVB/LNV vendor               | derived short-lived links                                              | token service, FFVB controller, `MatchInfoCard`   | `PROVEN`         |
| Expo transport/query         | handwritten `MatchApi` and mobile-local hooks | Axios case conversion and TanStack queries                                           | public or bearer Axios instance               | BFF wire                      | UI workflow and cache ownership                                        | API, hooks, screens, forms                        | `PROVEN`         |
| persistence/events/schedules | none in gateway scope                         | not applicable                                                                       | not applicable                                | downstream services           | no gateway entity, repository, event, listener, producer, or scheduler | gateway source inventory                          | `NOT_APPLICABLE` |

`MatchService` has eight collaborators and 589 lines. There is no mapper package, generated API interface, application
view/command boundary, named projector, or fan-out policy. The service receives copied mutable downstream DTOs,
assembles response DTOs inline, and delegates mutable team enrichment to `TeamLogoEnricher`.

## 2. REST Operation Inventory

No controller declares a stable OpenAPI `operationId`; every current operation ID is `MISSING`.

| Family     | Method and facade path                                                  | Input                                                           | Success                  | Aggregation / pass-through                  | Expo caller                                  | Status   |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------- | -------------------------------------------- | -------- |
| match      | GET `/api/v1/mobile/public/matches`                                     | page=0, size=4, optional `pool_ids`/`team_ids`, required status | 200 `EnrichedDayPageDTO` | day-page plus catalog fan-out               | `useMatchList` from feed/club/team/pool tabs | `PROVEN` |
| match      | GET `/api/v1/mobile/public/matches/{id}`                                | long match ID                                                   | 200 `EnrichedMatchDTO`   | multi-service detail/ranking/PDF projection | `useEnrichedMatchById` -> match screen       | `PROVEN` |
| live       | POST `/api/v1/mobile/secure/matches/{matchId}/live-link`                | JSON URL                                                        | 200 copied live response | one matches-service POST                    | `MatchLiveLinkForm`                          | `PROVEN` |
| live       | DELETE `/api/v1/mobile/secure/matches/{matchId}/live-link`              | match ID                                                        | 204                      | one matches-service DELETE                  | delete form and moderation history           | `PROVEN` |
| live       | POST `/api/v1/mobile/secure/matches/{matchId}/live-link/report`         | JSON reason                                                     | 204                      | one matches-service POST                    | report form                                  | `PROVEN` |
| live       | GET `/api/v1/mobile/secure/matches/{matchId}/live-links`                | match ID                                                        | 200 raw history array    | one matches-service GET                     | moderation history hook                      | `PROVEN` |
| moderation | GET `/api/v1/mobile/secure/matches/live-moderation`                     | optional live-link status                                       | 200 enriched raw array   | summary plus catalog fan-out                | moderation hook/screen                       | `PROVEN` |
| moderation | POST `/api/v1/mobile/secure/matches/live-links/{liveLinkId}/approve`    | live-link ID                                                    | 204                      | one matches-service POST                    | history screen                               | `PROVEN` |
| moderation | POST `/api/v1/mobile/secure/matches/live-links/{liveLinkId}/reject`     | live-link ID                                                    | 204                      | one matches-service POST                    | history screen                               | `PROVEN` |
| moderation | POST `/api/v1/mobile/secure/matches/live-links/{liveLinkId}/reactivate` | live-link ID                                                    | 204                      | one matches-service POST                    | history screen                               | `PROVEN` |

The public list is the only paginated BFF operation in scope. Its `size` counts distinct local dates, not match rows,
and has no lower or upper bound. A single date may therefore produce unbounded pools, matches, team lookups, club
lookups, and response bytes. There is no `pageInfo` wrapper, `pageSize` field, total, snapshot, or stable immutable
tie-breaker. The secure moderation and history arrays are unpaginated and unbounded.

The secure BFF chain requires authentication but declares no local scopes. `ApiClientService` detects the current JWT
and forwards it; matches-service owns the operation-specific scopes. Public operations use M2M credentials. The BFF
extracts the JWT subject for logs but does not use that value to make live policy decisions.

## 3. Type and Duplicate Inventory

| Type ID                 | Shape / fields                                                                       | Current role                                              | Duplicate / drift                                                        | Status   |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| `GW-MATCH-DAY-PAGE-IN`  | `DayPageDTO`: dayMatches, hasNext, nextPage                                          | copied matches-service page                               | copied again as enriched page                                            | `PROVEN` |
| `GW-MATCH-DAY-IN`       | `DayMatchesDTO`: date, pools                                                         | copied downstream day group                               | same shape family in Expo                                                | `PROVEN` |
| `GW-MATCH-POOL-IN`      | `PoolMatchesDTO`: poolId, matches                                                    | copied downstream pool group                              | replaced by enriched pool group                                          | `PROVEN` |
| `GW-MATCH-B`            | 18-field `MatchDTO`                                                                  | copied downstream list/detail row                         | matches-service DTO and Expo `Match` copies                              | `PROVEN` |
| `GW-MATCH-DAY-PAGE-OUT` | `EnrichedDayPageDTO`: dayMatches, hasNext, nextPage                                  | BFF list response                                         | handwritten Expo copy                                                    | `PROVEN` |
| `GW-MATCH-DAY-OUT`      | `EnrichedDayMatchesDTO`: date, pools                                                 | BFF list day section                                      | handwritten Expo copy                                                    | `PROVEN` |
| `GW-MATCH-POOL-OUT`     | `EnrichedPoolMatchesDTO`: pool, matches                                              | BFF list pool section                                     | handwritten Expo copy                                                    | `PROVEN` |
| `GW-MATCH-E`            | 18-field `EnrichedMatchDTO`                                                          | list row and detail response                              | one oversized class populated differently; Expo adds `liveOwnerUsername` | `PROVEN` |
| `GW-POOL-E`             | 13-field `EnrichedPoolDTO`                                                           | list parent, detail pool/ranking, moderation pool         | one class populated differently in three workflows                       | `PROVEN` |
| `GW-TEAM-B`             | 17-field `TeamDTO`                                                                   | mutable cached aggregation input and nested public output | broad teams-service copy; Expo omits coordinates                         | `PROVEN` |
| `GW-TEAM-RANK`          | 13-field `TeamWithStatsDTO`                                                          | detail ranking row                                        | same comparator/projection family as pool/team workflows                 | `PROVEN` |
| `GW-COMP-A`             | full 24-field `CompetitionAssociationDTO`                                            | detail ranking source                                     | 16 fields discarded before BFF output                                    | `PROVEN` |
| `GW-LIVE-REQ`           | `MatchLiveLinkRequestDTO`: url                                                       | secure command request                                    | copied matches-service/Expo shape                                        | `PROVEN` |
| `GW-LIVE-RES`           | matchId, provider, url, status, reportCount, ownerAuth0Id                            | secure command response                                   | Expo declares only first four and ignores response                       | `PROVEN` |
| `GW-LIVE-HISTORY`       | id, matchId, provider, url, status, reportCount, ownerAuth0Id, createdAt, lastUpdate | raw secure history response                               | copied matches-service/Expo shape                                        | `PROVEN` |
| `GW-LIVE-REPORT`        | `MatchLiveLinkReportRequestDTO`: reason                                              | secure report request                                     | Expo validates more strictly than backend                                | `PROVEN` |
| `GW-LIVE-SUMMARY-IN`    | 18-field `MatchLiveSummaryDTO`                                                       | matches-service moderation row                            | matchCode/leagueCode later discarded                                     | `PROVEN` |
| `GW-LIVE-SUMMARY-OUT`   | 16-field `EnrichedMatchLiveSummaryDTO`                                               | enriched moderation row                                   | broad nested team/pool values; several last-link fields unused           | `PROVEN` |
| `GW-LIVE-UNUSED`        | 14-field `EnrichedMatchLiveLinkDTO`                                                  | no construction or consumer                               | declares username not produced elsewhere                                 | `PROVEN` |
| `GW-MATCH-ENUMS`        | MatchStatus, LiveProvider, LiveLinkStatus                                            | copied enums in service, gateway, and Expo                | exact current value sets repeated three times                            | `PROVEN` |

All Java shapes are mutable Lombok holders. `GW-MATCH-B`, `GW-TEAM-B`, and `GW-POOL-E` cross transport, cache,
aggregation, and public-response roles. Object DTOs remain boundary-local candidates even where field sets match;
shared enums are the only provisional shared-contract family.

## 4. Public Match List Call Graph and Pagination

Let:

- `G` be downstream day groups on the selected page;
- `M` be match rows across those groups;
- `P` be distinct pool IDs;
- `T` be distinct team IDs across both match sides;
- `C` be distinct nonblank club IDs among found teams;
- `D` be distinct division IDs among found pools.

| Step | Operation             | Cardinality / fan-out                      | Ordering / pagination                                 | Missing / partial behavior                                | Status   |
| ---- | --------------------- | ------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------- | -------- |
| 1    | matches day-page GET  | 1 uncached call                            | page of distinct dates; status and filters forwarded  | null/empty body becomes terminal empty page               | `PROVEN` |
| 2    | collect pool/team IDs | inspect `G`/`M`; HashSet dedup             | lookup order unspecified; response order not changed  | null IDs survive into later failing calls                 | `PROVEN` |
| 3    | pool GETs             | `P` cached calls                           | HashSet lookup order                                  | missing pool logged; every occurrence later dropped       | `PROVEN` |
| 4    | team GETs             | `T` cached calls                           | HashSet lookup order                                  | missing team logged but match retained with absent side   | `PROVEN` |
| 5    | club enrichment       | `C` cached calls                           | HashSet lookup order; mutates found teams             | null club tolerated; HTTP failure aborts                  | `PROVEN` |
| 6    | division GETs         | `D` cached calls                           | set lookup order                                      | missing division retained only in map absence             | `PROVEN` |
| 7    | build enriched pools  | at most `P` builders                       | temporary HashMap order irrelevant                    | missing/inactive division drops pool; pool.active ignored | `PROVEN` |
| 8    | rebuild page          | inspect original `G`, pool groups, and `M` | preserves downstream day/pool/match order after drops | empty pools/days removed; no partial marker               | `PROVEN` |

The gateway performs `1 + P + T + C + D` client-method invocations per non-empty page. Cold-cache network fan-out has
the same upper bound; warm pool/team/club/division caches reduce it to the one uncached matches call. Calls remain
sequential. `size` bounds `G`, not `M`, `P`, `T`, `C`, or `D`, so the public parameter does not bound fan-out.

Matches-service orders UPCOMING dates ascending and FINISHED dates descending. Within a day it groups pools in a
`TreeMap`, so pool IDs are ascending. Its range query orders by pool ID then match date in the status direction. Equal
match dates within one pool have no immutable-ID tie-breaker. The gateway preserves those sequences while dropping
rows. Expo flattens pages without reordering or merging repeated date sections.

Matches-service date discovery ignores `active`, while its row query receives `active=true`. It can therefore return
an empty day page with a non-null downstream `nextPage`. The gateway's early-empty branch discards that continuation
and forces `hasNext=false`, `nextPage=null`; Expo then stops because `getNextPageParam` reads only `nextPage`. Later
matching dates can become invisible. If the downstream page contains day groups but gateway enrichment drops every
pool, the gateway preserves the downstream continuation instead.

Negative page, zero/negative size, multiplication overflow, and excessive size are not validated at either BFF
boundary. Offset pagination has no snapshot: newly inserted or reclassified dates can shift later pages. Both filters
are set-like and combined with OR downstream. Expo sorts filter IDs only for the TanStack query key and sends the
original arrays; Axios serializes repeated snake_case query parameters.

## 5. Public Match List Projection Fields

### Page and grouping fields

| Field                | Source / transformation                   | Exact Expo consumer / purpose                                 | Classification | Status   |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- | -------------- | -------- |
| `dayMatches`         | rebuilt after catalog drops               | flattened into date sections and pool rows                    | `DERIVED`      | `PROVEN` |
| `hasNext`            | copied except forced false on early empty | declared but not read directly; TanStack derives its own flag | `DERIVED`      | `PROVEN` |
| `nextPage`           | copied except forced null on early empty  | sole `getNextPageParam` input                                 | `DERIVED`      | `PROVEN` |
| day `date`           | copied                                    | section key and French header formatting                      | `REQUIRED`     | `PROVEN` |
| day `pools`          | rebuilt                                   | flattened pool cards                                          | `DERIVED`      | `PROVEN` |
| pool-group `pool`    | pool plus division projection             | header, gradient, pool navigation                             | `DERIVED`      | `PROVEN` |
| pool-group `matches` | match/team projection                     | match rows and navigation                                     | `DERIVED`      | `PROVEN` |

### Context population of `EnrichedMatchDTO`

| Field                         | List population               | Detail population             | Exact Expo purpose                                          | Classification       | Status   |
| ----------------------------- | ----------------------------- | ----------------------------- | ----------------------------------------------------------- | -------------------- | -------- |
| `id`                          | match                         | match                         | row key/navigation; detail/report/live identity             | `REQUIRED`           | `PROVEN` |
| `liveCode`                    | copied                        | copied                        | no current Expo read found                                  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `matchDate`                   | copied                        | copied                        | row time; detail date/time and live-window calculation      | `REQUIRED`           | `PROVEN` |
| `season`                      | omitted                       | omitted                       | Expo declares required but reads `pool.season` instead      | `COMPATIBILITY_ONLY` | `PROVEN` |
| `set`                         | copied                        | copied                        | list score, detail final score, highlights, header          | `REQUIRED`           | `PROVEN` |
| `score`                       | copied                        | copied                        | unused list; per-set detail breakdown                       | `REQUIRED`           | `PROVEN` |
| `status`                      | copied                        | copied                        | upcoming/finished rendering and live/replay behavior        | `REQUIRED`           | `PROVEN` |
| `venue`                       | copied                        | copied                        | unused list; detail venue/fallback                          | `REQUIRED`           | `PROVEN` |
| `firstReferee`                | copied                        | copied                        | unused list; detail referee row                             | `REQUIRED`           | `PROVEN` |
| `secondReferee`               | copied                        | copied                        | unused list; detail referee row                             | `REQUIRED`           | `PROVEN` |
| `liveUrl`                     | copied active-link projection | copied active-link projection | live badge, playback, edit/delete/report state              | `DERIVED`            | `PROVEN` |
| `liveProvider`                | omitted                       | copied                        | detail provider label/icon                                  | `DERIVED`            | `PROVEN` |
| `liveOwnerAuth0Id`            | omitted                       | copied                        | detail owner edit/delete decision                           | `DERIVED`            | `PROVEN` |
| `teamA`                       | team lookup                   | required found team           | labels, logos, navigation, score, report context            | `DERIVED`            | `PROVEN` |
| `teamB`                       | team lookup                   | required found team           | labels, logos, navigation, score, report context            | `DERIVED`            | `PROVEN` |
| `matchAddressPdfUrl`          | omitted                       | generated signed gateway URL  | venue-information PDF action                                | `DERIVED`            | `PROVEN` |
| `matchSheetPdfUrl`            | omitted                       | generated signed gateway URL  | finished-match sheet action                                 | `DERIVED`            | `PROVEN` |
| `pool`                        | omitted; parent group owns it | enriched detail pool/ranking  | styling, metadata, pool navigation, ranking, report context | `DERIVED`            | `PROVEN` |
| Expo-only `liveOwnerUsername` | no Java field or producer     | no Java field or producer     | no current Expo read                                        | `COMPATIBILITY_ONLY` | `PROVEN` |

List builders unnecessarily copy score, venue, referees, and liveCode for current rows, while omitting provider and
owner. Missing team lookups do not drop the match: `teamA` or `teamB` is null and suppressed by `NON_NULL`; Expo
declares and dereferences both, so a successful list response can crash rendering.

### Nested list pool and team fields

| Nested family | Fields required by current list UI                      | Populated but unused in this workflow                                                                                      | Omitted despite broad Expo type | Classification / status                                                        |
| ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| pool          | id, leagueCode, leagueName, shortName, gender, division | season, name, format, followersCount                                                                                       | poolCode, rawName, ranking      | required fields `REQUIRED`; extras `COMPATIBILITY_ONLY`; `PROVEN`              |
| division      | name, first/second/third gradient colors, logoUrl       | id, mainColor, active, timestamps                                                                                          | none                            | required fields `REQUIRED`; extras `COMPATIBILITY_ONLY`; `PROVEN`              |
| team          | shortName; logoUrl after fallback                       | id, clubId, rawName, name, leagueCode, divisionId, format, gender, season, coordinates, followersCount, active, timestamps | none                            | shortName `REQUIRED`, logoUrl `DERIVED`, extras `COMPATIBILITY_ONLY`; `PROVEN` |

The broad nested team payload exposes 17 fields where the list row reads two. Pool `active` is never checked by the
gateway; a found inactive pool remains visible when its division is active. The active flag on a found team is also
ignored. `TeamLogoEnricher` can copy a club logo and always overwrites coordinates from the club, even though list
consumers do not read coordinates. As documented by MRG-265, that mutates the cached `TeamDTO` and can preserve stale
fallback values across requests.

## 6. Public Match Detail, Ranking, and PDF Call Graph

Let:

- `A` be active competition-association rows for the pool;
- `U` be distinct association team IDs plus match team A and B;
- `C` be distinct nonblank club IDs among found teams.

| Step | Operation                    | Cardinality / fan-out         | Ordering / transformation                   | Missing / failure behavior                                | Status   |
| ---- | ---------------------------- | ----------------------------- | ------------------------------------------- | --------------------------------------------------------- | -------- |
| 1    | match GET                    | 1 uncached call               | establishes raw match/live values           | null -> explicit inconsistent-state 500                   | `PROVEN` |
| 2    | pool GET                     | 1 cached call                 | raw pool lookup                             | null -> explicit 500; pool.active ignored                 | `PROVEN` |
| 3    | division GET                 | 1 cached call                 | full division lookup                        | null -> explicit 500; division.active ignored             | `PROVEN` |
| 4    | competition associations GET | 1 uncached call               | active association order retained initially | null body -> empty list; HTTP failure aborts              | `PROVEN` |
| 5    | collect/fetch teams          | inspect `A`; `U` cached calls | HashSet lookup; map by ID                   | missing logged; A/B or referenced ranking row later fails | `PROVEN` |
| 6    | club enrichment              | `C` cached calls              | mutates team logo/coordinates               | missing club tolerated; HTTP failure aborts               | `PROVEN` |
| 7    | validate A/B                 | two map reads                 | no extra client call                        | missing side -> explicit 500                              | `PROVEN` |
| 8    | ranking build/sort           | `A` builders                  | five-key comparator, no ID tie-breaker      | missing team or nullable sort field aborts                | `PROVEN` |
| 9    | pool projection              | one builder                   | pool, division, ranking                     | rawName omitted                                           | `PROVEN` |
| 10   | address/sheet JWTs           | two local generations         | independent 10-minute signed tokens         | null claim/secret/key failure -> generic 500              | `PROVEN` |
| 11   | match projection             | one builder                   | detail response                             | no partial marker                                         | `PROVEN` |

There are `4 + U + C` client-method invocations. Cold-cache network fan-out has the same maximum; warm pool, division,
team, and club caches reduce it to the uncached match and competition calls. The two PDF token generations are local
CPU operations, not downstream calls. The FFVB/LNV network request occurs only when Expo later opens a signed link.

Competition-service returns active associations through an unordered repository query. The gateway sorts ranking rows
by points descending, points penalty ascending, wins descending, set coefficient descending, then point coefficient
descending. Exact ties retain arbitrary association order because there is no immutable-ID tie-breaker. Duplicate
association rows are not deduplicated and would yield duplicate ranking rows.

An empty association list produces a valid empty ranking. Any association whose team cannot be resolved fails the
whole detail. Null association/team IDs or nullable comparator inputs can fail generically. Found but inactive
match/pool/division/team values are not rejected by this workflow.

The address and sheet tokens contain `kind`, raw match season, leagueCode, and matchCode. Those three raw fields are
therefore required inside the aggregation even though matchCode and leagueCode are not exposed at the top level and
top-level season is never assigned. `Map.of` rejects null claims, so any missing source value fails both detail and all
otherwise independent content. The returned URLs always exist when detail succeeds; actual vendor availability is
deferred to the later proxy request.

## 7. Detail Pool, Team, and Ranking Field Justification

### Detail pool fields

| Field            | Source / transformation          | Exact Expo consumer / purpose                            | Classification       | Status   |
| ---------------- | -------------------------------- | -------------------------------------------------------- | -------------------- | -------- |
| `id`             | raw pool                         | pool navigation and ranking header action                | `REQUIRED`           | `PROVEN` |
| `season`         | raw pool                         | match header/report context                              | `REQUIRED`           | `PROVEN` |
| `poolCode`       | raw pool                         | match header/report context                              | `REQUIRED`           | `PROVEN` |
| `leagueCode`     | raw pool                         | LNV/live-card rule, header/report context, regional rule | `REQUIRED`           | `PROVEN` |
| `leagueName`     | raw pool                         | ranking header                                           | `REQUIRED`           | `PROVEN` |
| `name`           | raw pool                         | information-card pool label                              | `REQUIRED`           | `PROVEN` |
| `shortName`      | raw pool                         | ranking header                                           | `REQUIRED`           | `PROVEN` |
| `rawName`        | omitted                          | no match-screen read                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| `format`         | raw pool                         | no current match-screen read                             | `COMPATIBILITY_ONLY` | `PROVEN` |
| `gender`         | raw pool                         | ranking header label                                     | `REQUIRED`           | `PROVEN` |
| `followersCount` | raw pool                         | no current match-screen read                             | `COMPATIBILITY_ONLY` | `PROVEN` |
| `ranking`        | competition/team/club projection | ranking rows and match-side highlights                   | `DERIVED`            | `PROVEN` |
| `division`       | config lookup                    | gradients, labels, logo, highlighting                    | `REQUIRED`           | `PROVEN` |

### Detail nested teams

The detail screen reads only team `id`, `name`, `shortName`, and derived `logoUrl`: ID drives team navigation; name
builds report context; shortName and logo drive score/ranking presentation. The remaining 13 `TeamDTO` fields are
`COMPATIBILITY_ONLY` on this BFF response. Club fallback makes logoUrl `DERIVED`. Coordinates are overwritten during
enrichment but neither the match detail nor its ranking builder serializes them into ranking rows.

### Ranking row fields

| Field           | Source / transformation | Exact Expo consumer / purpose       | Classification       | Status   |
| --------------- | ----------------------- | ----------------------------------- | -------------------- | -------- |
| `id`            | team ID                 | key, highlight, and team navigation | `REQUIRED`           | `PROVEN` |
| `name`          | team                    | no current ranking-row read         | `COMPATIBILITY_ONLY` | `PROVEN` |
| `shortName`     | team                    | visible team label                  | `REQUIRED`           | `PROVEN` |
| `logoUrl`       | team or club fallback   | visible team image                  | `DERIVED`            | `PROVEN` |
| `points`        | association             | primary sort and visible points     | `REQUIRED`           | `PROVEN` |
| `played`        | association             | visible statistic                   | `REQUIRED`           | `PROVEN` |
| `wins`          | association             | sort and visible statistic          | `REQUIRED`           | `PROVEN` |
| `losses`        | association             | visible statistic                   | `REQUIRED`           | `PROVEN` |
| `pointsPenalty` | association             | server sort only                    | `COMPATIBILITY_ONLY` | `PROVEN` |
| `coefSets`      | association             | server sort only                    | `COMPATIBILITY_ONLY` | `PROVEN` |
| `coefPoints`    | association             | server sort only                    | `COMPATIBILITY_ONLY` | `PROVEN` |
| `latitude`      | omitted by builder      | no match ranking/map consumer       | `COMPATIBILITY_ONLY` | `PROVEN` |
| `longitude`     | omitted by builder      | no match ranking/map consumer       | `COMPATIBILITY_ONLY` | `PROVEN` |

This comparator is duplicated in pool, team, and match workflows. Its output fields differ by context: pool detail
copies coordinates for the map, while match and team detail do not. Consolidation requires an approved projection and
ordering policy, not a blind shared DTO.

## 8. Secure Live Moderation Aggregation

Let:

- `S` be downstream match summaries after the optional status predicate;
- `P` be distinct pool IDs;
- `D` be distinct division IDs among found pools;
- `T` be distinct team IDs across both match sides;
- `C` be distinct nonblank club IDs among found teams.

| Step | Operation              | Cardinality / fan-out      | Ordering / transformation          | Missing / partial behavior                                  | Status   |
| ---- | ---------------------- | -------------------------- | ---------------------------------- | ----------------------------------------------------------- | -------- |
| 1    | moderation summary GET | 1 uncached call            | matches-service date-desc order    | null/empty -> `[]`; HTTP failure aborts                     | `PROVEN` |
| 2    | collect IDs            | inspect `S`; HashSet dedup | lookup order unspecified           | null IDs later fail                                         | `PROVEN` |
| 3    | pool GETs              | `P` cached calls           | map by ID                          | missing pool logged                                         | `PROVEN` |
| 4    | division GETs          | `D` cached calls           | map by ID                          | missing division logged                                     | `PROVEN` |
| 5    | pool projection        | at most `P` builders       | temporary HashMap order irrelevant | missing/inactive division drops pool; pool.active ignored   | `PROVEN` |
| 6    | team GETs              | `T` cached calls           | map by ID                          | missing team logged                                         | `PROVEN` |
| 7    | club enrichment        | `C` cached calls           | mutable logo/coordinate enrichment | missing club tolerated; HTTP failure aborts                 | `PROVEN` |
| 8    | summary projection     | inspect `S`                | retains downstream relative order  | missing projected pool or either team drops only that match | `PROVEN` |

The gateway performs `1 + P + D + T + C` sequential client calls. Cold-cache network fan-out has the same maximum;
warm catalog caches leave the single summary call. The source list is unpaginated, so `S` and all derived cardinalities
are unbounded.

Matches-service sorts by match date descending with no ID tie-breaker. The BFF preserves relative order after skips.
Expo filters by team-name search and sorts by date descending again, also without an ID tie-breaker; null dates compare
as equal. No layer provides a stable total order.

The optional status filter means a match has _any_ historical link with that status. Matches-service then selects a
separate representative by priority ACTIVE, PENDING, BANNED, DEACTIVATED, REJECTED, EXPIRED and newest timestamp. Thus
a REJECTED request can display an ACTIVE representative. The BFF does not reconcile this mismatch.

Contrary to the logger wording and the broader MRG-257 summary, the gateway does not test `PoolDTO.active`. It drops a
moderation row only when the pool is missing, the division is missing/inactive, or either team is missing. It likewise
does not test match or team active flags. Each drop is a silent partial result with no omitted-count or reason metadata;
any downstream HTTP error still fails the entire request.

### Moderation response fields

| Field                      | Source / transformation | Exact Expo consumer / purpose                            | Classification       | Status   |
| -------------------------- | ----------------------- | -------------------------------------------------------- | -------------------- | -------- |
| `id`                       | raw summary             | list key, selected match, history query, delete identity | `REQUIRED`           | `PROVEN` |
| `matchDate`                | raw summary             | display and client sort                                  | `REQUIRED`           | `PROVEN` |
| `season`                   | raw summary             | card subtitle                                            | `REQUIRED`           | `PROVEN` |
| `set`                      | raw summary             | score / versus display                                   | `REQUIRED`           | `PROVEN` |
| `score`                    | raw summary             | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `status`                   | raw summary             | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `liveCode`                 | raw summary             | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastLiveLinkId`           | representative link     | no current moderation read; actions use history row IDs  | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastLiveLinkStatus`       | representative link     | status chip                                              | `DERIVED`            | `PROVEN` |
| `lastLiveLinkProvider`     | representative link     | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastLiveLinkUrl`          | representative link     | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastLiveLinkOwnerAuth0Id` | representative link     | no current moderation read                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastLiveLinkCreatedAt`    | representative link     | latest-link timestamp label                              | `DERIVED`            | `PROVEN` |
| `teamA`                    | team/club lookup        | search, label, and logo                                  | `DERIVED`            | `PROVEN` |
| `teamB`                    | team/club lookup        | search, label, and logo                                  | `DERIVED`            | `PROVEN` |
| `pool`                     | pool/division lookup    | short name, league name, division label/gradient         | `DERIVED`            | `PROVEN` |

Moderation reads only team name/shortName/logoUrl and pool shortName/leagueName/division. Every other nested team and
pool field is `COMPATIBILITY_ONLY` for this workflow. The raw summary's matchCode and leagueCode are discarded by the
BFF; pool league metadata comes from the pool lookup instead.

## 9. Live Command and History Relays

| Workflow      | Gateway calls      | Body/response behavior                                                 | Ordering / partial behavior                                  | Expo behavior                                              | Status   |
| ------------- | ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | -------- |
| upsert        | one matches POST   | copies URL request and six-field response; null body becomes 200 empty | all-or-error                                                 | validates nonblank URL, ignores response, refetches detail | `PROVEN` |
| delete active | one matches DELETE | no body; returns 204                                                   | downstream absent active link is also 204                    | refetch/dismiss or history refetch                         | `PROVEN` |
| report        | one matches POST   | copies reason; returns 204                                             | all-or-error                                                 | trims and validates 10..500                                | `PROVEN` |
| history       | one matches GET    | raw nine-field array; null body -> `[]`                                | downstream createdAt-desc, no ID tie; Expo re-sorts the same | history list and actions                                   | `PROVEN` |
| approve       | one matches POST   | null body downstream; returns 204                                      | all-or-error                                                 | refetches history                                          | `PROVEN` |
| reject        | one matches POST   | null body downstream; returns 204                                      | all-or-error                                                 | refetches history                                          | `PROVEN` |
| reactivate    | one matches POST   | null body downstream; returns 204                                      | all-or-error                                                 | refetches history                                          | `PROVEN` |

Upsert's matches-service path additionally calls users-service and owns URL/provider, account-age, league, window,
ownership, quota, and state policy; that is downstream behavior, not BFF orchestration. The BFF neither validates nor
reimplements it. Report and command state semantics remain owned by MRG-257.

### Live request, response, and history fields

| Shape / field                                   | Exact current purpose                                                                 | Classification       | Status   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------- | -------- |
| upsert `url`                                    | Expo user input; matches-service provider/policy and playback source                  | `REQUIRED`           | `PROVEN` |
| response `matchId`, `provider`, `url`, `status` | response ignored by current Expo; fields declared in TS                               | `COMPATIBILITY_ONLY` | `PROVEN` |
| response `reportCount`, `ownerAuth0Id`          | absent from Expo response type and ignored                                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| report `reason`                                 | Expo required trimmed 10..500 explanation; backend allows weaker null/blank semantics | `REQUIRED`           | `PROVEN` |
| history `id`                                    | key and approve/reject/reactivate identity                                            | `REQUIRED`           | `PROVEN` |
| history `matchId`                               | duplicates route/selected-match context; no current direct read                       | `COMPATIBILITY_ONLY` | `PROVEN` |
| history `provider`                              | icon and label                                                                        | `REQUIRED`           | `PROVEN` |
| history `url`                                   | visible/openable link                                                                 | `REQUIRED`           | `PROVEN` |
| history `status`                                | chip and allowed action selection                                                     | `REQUIRED`           | `PROVEN` |
| history `reportCount`                           | report badge                                                                          | `REQUIRED`           | `PROVEN` |
| history `ownerAuth0Id`                          | visible proposer identifier                                                           | `REQUIRED`           | `PROVEN` |
| history `createdAt`                             | display and descending sort                                                           | `REQUIRED`           | `PROVEN` |
| history `lastUpdate`                            | optional update timestamp                                                             | `REQUIRED`           | `PROVEN` |

History does not verify that the match exists; no links yields 200 `[]` for both an existing match with no history and
an absent match. The BFF's unused `listPendingLiveLinks()` client targets a downstream path that does not exist, and
`EnrichedMatchLiveLinkDTO` is never constructed or returned. Both remain removal candidates, not removal authorization.

## 10. Downstream Source-Field Use, Loss, and Duplicate Roles

| Source type                 | Fields consumed by these aggregations                                                                     | Fields copied but unused/dropped here                                                                   | Classification of dropped fields                              | Status   |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| `MatchDTO`                  | all 18 fields enter list/detail copying, lookup, live, or PDF logic                                       | matchCode, leagueCode, poolId, teamIdA/B remain internal; top-level season is accidentally not assigned | `REQUIRED` internally; absent output fields are context-owned | `PROVEN` |
| `PoolDTO`                   | id, season, poolCode, leagueCode, leagueName, name, shortName, divisionId, format, gender, followersCount | rawName and active/audit fields are not used; poolCode is omitted only in list                          | `COMPATIBILITY_ONLY` for these BFF workflows                  | `PROVEN` |
| `TeamDTO`                   | id, name, shortName, clubId, logoUrl; coordinates are mutated but not consumed                            | remaining service/entity copy fields are serialized despite no match UI role                            | `COMPATIBILITY_ONLY` on match responses                       | `PROVEN` |
| `CompetitionAssociationDTO` | teamId, points, played, wins, losses, pointsPenalty, coefSets, coefPoints                                 | id, poolId, clubId, active, detailed results, set/point totals, timestamps                              | `COMPATIBILITY_ONLY` for match detail                         | `PROVEN` |
| `MatchLiveSummaryDTO`       | all except raw matchCode/leagueCode feed BFF copy or aggregation                                          | matchCode and leagueCode discarded                                                                      | `COMPATIBILITY_ONLY` for this BFF consumer                    | `PROVEN` |
| `MatchLiveLinkDTO`          | all fields copied; all except matchId read by Expo                                                        | matchId duplicates route context                                                                        | `COMPATIBILITY_ONLY` for matchId                              | `PROVEN` |

The same `EnrichedMatchDTO` is a sparse list row and a full detail response. The same `EnrichedPoolDTO` is a sparse
list header, a ranked detail pool, and a broad moderation value. The same full `TeamDTO` is both cached outbound
transport and public nested output. These are contextual projections accidentally sharing mutable classes, not proof
that one target schema should be shared.

The three enums have exact repeated values and are provisional shared-enum candidates. Their JSON strings still need
authoritative shared schemas and generated consumers; no audit finding authorizes early replacement.

## 11. Authorization, Errors, Casing, Caches, and Logging

### Authorization and errors

| Concern                | Current behavior                                                       | Compatibility impact                      | Status   |
| ---------------------- | ---------------------------------------------------------------------- | ----------------------------------------- | -------- |
| public auth            | anonymous gateway route, M2M downstream                                | caller never sees downstream service auth | `PROVEN` |
| secure auth            | any authenticated gateway JWT, forwarded to matches-service            | downstream scopes remain authoritative    | `PROVEN` |
| 4xx downstream         | `HttpClientErrorException` status/message copied into legacy map error | Expo displays selected backend messages   | `PROVEN` |
| 5xx downstream         | wrapped or handled by generic branch                                   | legacy map-shaped generic 500             | `PROVEN` |
| inconsistent aggregate | explicit `InconsistentStateException`                                  | also map-shaped 500, not 404/503          | `PROVEN` |
| binding/null failures  | malformed enum/list/ID may be 400 or generic 500 depending layer       | no stable machine code                    | `PROVEN` |
| partial lists          | silent pool/day/match drops or absent team fields                      | 200 has no omitted-item metadata          | `PROVEN` |

There is no `ProblemDetail`, stable error code, request identifier in the body, dependency classification, or explicit
timeout/fallback policy. `ApiClientService.get` preserves 4xx but wraps other exceptions; POST/DELETE rethrow server
errors that the BFF handler converts to the same generic 500.

### Casing and construction

| Boundary            | Mechanism                                       | Current role / debt                                           | Provisional later owner                 | Status   |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- | -------- |
| Expo request        | deep `snakecase-keys` interceptor               | `poolIds`/`teamIds`, url, and reason become legacy wire names | mobile-local generated client/transport | `PROVEN` |
| Expo response       | deep `camelcase-keys` interceptor               | all nested BFF snake_case becomes camelCase                   | mobile-local Orval result               | `PROVEN` |
| gateway REST        | global snake strategy plus explicit annotations | duplicate implicit/explicit wire naming                       | generated BFF interface/models          | `PROVEN` |
| gateway -> services | URI builders and copied DTOs                    | handwritten exact paths/query names and DTO mirrors           | generated outbound adapters             | `PROVEN` |
| raw -> enriched     | inline Lombok builders                          | copying, lookup, filtering, ranking, and policy mixed         | workflow projector/application views    | `PROVEN` |
| team + club         | static mutable helper                           | cached source mutation for logo/coordinates                   | named immutable projection collaborator | `PROVEN` |
| PDF                 | handwritten JWT and URL assembly                | vendor continuation coupled to match detail                   | explicit signed-link adapter/projection | `PROVEN` |

Canonical target Blockout wire names are camelCase. Current snake_case remains compatibility evidence until
MRG-301/303/304 and the generated consumer migrations prove a staged cutover. Python identifiers and vendor FFVB/LNV
parameters remain separate adapter concerns.

### Cache and logging effects

Pool, team, and club cache entries live four hours; divisions live one day. Match, competition, moderation-summary,
history, and command calls are uncached. Caches are process-local and share mutable DTO instances. Club enrichment can
therefore change subsequent match/list/moderation projections and preserve stale fallback logos, as proven in MRG-265.
No cache key contains auth, status, or match context because only public catalog lookups are cached.

The BFF service logs filter counts and technical IDs, while `ApiClientService` logs complete downstream URLs, including
favorite pool/team identifiers. Expo's HTTP interceptor logs request headers, params, and JSON bodies; on secure live
calls this can expose the bearer header, submitted live URL, and report reason. The match live form also leaves a raw
`console.log(err)`. The FFVB proxy logs the signed bearer-like PDF token, decoded federation claims, and upstream URL;
the token is a temporary credential. Matches-service additionally logs submitted live URLs and owner/user identifiers.
These are `PROVEN` current paths and later logging/privacy work, not changes authorized by this audit.

## 12. Ordering and Partial-Failure Summary

| Workflow     | Stable primary order                                  | Missing-state behavior                                                           | Whole-request failures                                                  | Pagination / bounds                      | Status   |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- | -------- |
| match list   | dates by status; pool ID; match date; no match-ID tie | pool or missing/inactive division drops group; missing team remains absent field | any HTTP error, null ID, builder/runtime failure                        | date offset page; unbounded rows/fan-out | `PROVEN` |
| match detail | ranking five-key comparator; no team-ID tie           | empty ranking allowed                                                            | missing match/pool/division/A/B/ranking team, null stats, token failure | not paginated                            | `PROVEN` |
| moderation   | match date desc twice; no ID tie                      | missing pool/division, inactive division, or missing team drops row              | any HTTP/null/runtime failure                                           | unpaginated/unbounded                    | `PROVEN` |
| history      | createdAt desc twice; no ID tie                       | absent match indistinguishable from empty history                                | downstream failure                                                      | unpaginated/unbounded                    | `PROVEN` |
| commands     | not applicable                                        | delete missing active link is successful 204 downstream                          | validation/auth/state/dependency errors abort                           | not applicable                           | `PROVEN` |

## 13. Test and Parity Evidence

The gateway has only `MobileGatewayApplicationTests.contextLoads`; it is coupled to a missing `AUTH0_ISSUER` property
outside a configured test environment. No Expo test files exist. This audit adds no tests under the repository's
test-free audit policy.

| Behavior                | Existing evidence                         | What it proves                                          | Missing parity evidence before migration                                    | Status                         |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| list fan-out/projection | source reconstruction                     | exact loops, caches, builder fields                     | cold/warm cardinality, missing catalog, null ID, active flags               | `UNKNOWN` runtime parity       |
| date pagination         | matches repository/service plus Expo hook | order, nextPage flow, empty-page rewrite                | page/size bounds, inactive-only page continuation, mutation/DST fixtures    | `UNKNOWN` runtime parity       |
| detail/ranking          | source plus MRG-256/257                   | source, comparator, PDF claims                          | empty/duplicate/tied/null stats, missing teams, signed-link TTL fixtures    | `UNKNOWN` runtime parity       |
| moderation              | source plus Expo screen                   | status predicate, representative, drops, client sorting | large-list bounds, filter mismatch, drop metadata, active-state fixtures    | `UNKNOWN` runtime parity       |
| live relays             | source plus forms/history                 | body/response and action paths                          | forwarded auth/scope, exact errors, null response, ordering tests           | `UNKNOWN` runtime parity       |
| mutable caches          | source/config annotations                 | shared mutable object path and TTLs                     | cache-order/invalidation/replica tests                                      | `UNKNOWN` runtime parity       |
| mobile rendering        | exact caller inventory                    | direct field reads and query policies                   | generated-client compile, screen/form fixtures, Android/iOS request capture | `UNKNOWN` runtime parity       |
| logging/privacy         | source logging paths                      | potential credential/body exposure                      | safe runtime capture and redaction verification                             | `UNKNOWN` production incidence |

## 14. Findings

| Finding ID   | Observation                                                                                                            | Affected boundary          | Evidence                            | Follow-up                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------- | ------------------------------------ |
| `MRG266-F01` | date-page size does not bound matches or catalog fan-out; all lookups are sequential                                   | public list                | `PROVEN`                            | MRG-268/327/416                      |
| `MRG266-F02` | gateway early-empty handling discards a valid downstream nextPage and can hide later active dates                      | public list pagination     | `PROVEN`                            | parity decision before MRG-327/416   |
| `MRG266-F03` | list ordering lacks a match-ID tie and offset pages have no snapshot                                                   | public list                | `PROVEN`                            | stable pagination policy             |
| `MRG266-F04` | missing/inactive-division pools are silently dropped while missing teams remain malformed rows                         | public list                | `PROVEN`                            | explicit partial-result policy       |
| `MRG266-F05` | match detail has high sequential fan-out and fails whole-view for any referenced missing team                          | detail                     | `PROVEN`                            | MRG-268/416                          |
| `MRG266-F06` | ranking comparator is duplicated, has no immutable tie-breaker, and contextual rows copy different fields              | competition ranking        | `PROVEN`                            | approved projection/order policy     |
| `MRG266-F07` | PDF token generation couples otherwise valid detail to three nullable raw fields and exposes unconditional links       | detail/vendor continuation | `PROVEN`                            | explicit signed-link adapter/parity  |
| `MRG266-F08` | moderation is unpaginated/unbounded and silently drops rows without counts or reasons                                  | secure moderation          | `PROVEN`                            | MRG-268/327/416                      |
| `MRG266-F09` | moderation status filtering and representative-link selection can display different statuses                           | secure moderation          | `PROVEN`                            | product/policy decision from MRG-257 |
| `MRG266-F10` | pool/team active flags are ignored; logger wording incorrectly implies inactive pools are removed                      | list/moderation            | `PROVEN`                            | compatibility fixtures/documentation |
| `MRG266-F11` | oversized shared enriched DTOs serialize many fields absent from exact list/detail/moderation needs                    | BFF/Expo contract          | `PROVEN`                            | MRG-267/268/327                      |
| `MRG266-F12` | top-level season is never assigned, Expo-only username has no producer, and one enriched live DTO is unused            | type drift                 | `PROVEN`                            | MRG-267/327/346                      |
| `MRG266-F13` | history and moderation sort without immutable tie-breakers and have no collection bounds                               | live reads                 | `PROVEN`                            | target list/page policy              |
| `MRG266-F14` | BFF/mobile/vendor logging paths can expose filters, bearer headers, bodies, live URLs, report reasons, and PDF tokens  | logging/privacy            | `PROVEN` paths; incidence `UNKNOWN` | logging hardening with parity        |
| `MRG266-F15` | no focused gateway or mobile tests protect fan-out, pagination, projection, partial failure, live relays, or rendering | all                        | `PROVEN`                            | migration parity suites              |

## 15. Provisional Target Roles

| Current type / behavior               | Provisional owner / role                                             | Disposition hypothesis                                              | Preconditions                                     | Decision owner | Status     |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- | -------------- | ---------- |
| copied match/competition/catalog DTOs | generated outbound client adapter models                             | map immediately to workflow-owned inputs                            | authoritative internal contracts and field matrix | MRG-268        | `INFERRED` |
| day page/list graph                   | match-list application view/projector                                | explicit bounded page semantics, order, fan-out, and partial policy | pagination/product parity fixtures                | MRG-268        | `INFERRED` |
| match detail/ranking                  | match-detail application view plus ranking projector                 | separate from list and moderation shapes                            | MRG-267 lineage and ranking/PDF decisions         | MRG-268        | `INFERRED` |
| live moderation                       | moderation application view/projector                                | paginated/bounded only after approved behavior                      | filter/representative/drop semantics              | MRG-268        | `INFERRED` |
| live commands/history                 | generated inbound/outbound DTOs plus thin application commands/views | preserve matches-service policy ownership                           | error/auth/state parity                           | MRG-268        | `INFERRED` |
| team logo/coordinates                 | immutable projection collaborator                                    | stop mutating cached transports                                     | fallback/cache behavior approved                  | MRG-268        | `INFERRED` |
| signed PDF links                      | match-detail infrastructure adapter and derived view values          | isolate vendor continuation and credential logging                  | TTL/vendor/error/privacy evidence                 | MRG-268        | `INFERRED` |
| Expo match DTOs                       | mobile-local generated client plus screen/form models                | keep TanStack/Orval local; split list/detail/moderation needs       | BFF contract and generator decisions              | MRG-268/313+   | `INFERRED` |
| casing converters/annotations         | temporary compatibility adapter                                      | retire only after staged camelCase cutover                          | MRG-301-304 evidence                              | MRG-268/304    | `INFERRED` |

No row approves batching, concurrency, caching, pagination redesign, field removal, privacy semantics, live state rules,
ranking order, records, MapStruct, package layout, or generator options. Those decisions remain gated by MRG-268.

## 16. Unknowns and Required Follow-up Evidence

| Unknown                                                                    | Evidence checked                        | Required evidence                                  | Blocking later task?                 |
| -------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- | ------------------------------------ |
| deployed consumers of compatibility-only and live-response fields          | repository-wide callers                 | access logs and supported mobile/client inventory  | blocks removal                       |
| production frequency of empty continuation pages                           | repository query/control flow           | safe DB query, metrics, or captured pages          | blocks pagination correction rollout |
| accepted list/moderation/history bounds and stable tie-breakers            | source/UI only                          | product and architecture decision plus fixtures    | blocks target contracts              |
| acceptable partial-result behavior for missing catalog state               | current inconsistent branches           | product/operational decision and runtime incidence | blocks projector policy              |
| live status filter versus representative expectation                       | source contradiction                    | product/moderation owner decision                  | blocks target moderation contract    |
| inactive match/pool/team visibility                                        | active flags and current missing checks | production data and product rule                   | blocks active filtering changes      |
| ranking exact-tie order and duplicate associations                         | source without production samples       | rule owner and safe data/fixtures                  | blocks stable ranking contract       |
| PDF source nullability, vendor availability, and desired failure isolation | source/config only                      | safe payloads, vendor traces, product decision     | blocks signed-link restructuring     |
| cache hit ratio, replica count, and fan-out latency                        | process-local config/formulas           | deployment topology and tracing/metrics            | informs batching/cache design        |
| production logging exposure                                                | committed log statements                | sanitized runtime capture and retention review     | blocks privacy hardening claim       |
| actual Android/iOS casing and error parity                                 | TypeScript source                       | captured requests/responses and device fixtures    | blocks generated-client cutover      |

## 17. Audit Completion Checklist

- [x] all ten match-facing facade operations and current auth rules are inventoried;
- [x] absence of a standalone competition BFF route and gateway events/schedules/persistence is explicit;
- [x] every copied source, enriched projection, live, page, and enum family has a stable Type ID;
- [x] every response/request field has one primary classification and every exact Expo use is identified;
- [x] current snake_case and target camelCase behavior are explicit;
- [x] exact list, detail, moderation, and relay fan-out formulas plus cache reductions are recorded;
- [x] date/pool/match, ranking, moderation, and history ordering and tie gaps are reconstructed;
- [x] pagination, bounds, empty continuation, filter, deduplication, and snapshot behavior are explicit;
- [x] whole-request failures, silent drops, malformed partial rows, and live relay behavior are explicit;
- [x] oversized/context-dependent DTOs, unused client/type, unassigned fields, and source-field loss are recorded;
- [x] signed PDF generation and later vendor continuation are separated;
- [x] logging, casing, auth, errors, caches, tests, unknowns, and provisional roles are recorded;
- [x] Maaatch was used only as a read-only structural role reference;
- [x] no runtime, contract, generated artifact, configuration, migration, test, or deployment file changed.

## Source Evidence

- Gateway match controllers, `MatchService`, match/competition/catalog clients, all match DTOs/enums,
  `TeamLogoEnricher`, cache/security/error/client configuration, PDF token service, and FFVB proxy under
  `apps/backend/mobile-gateway/src`.
- Matches-service day grouping, repository ordering, detail/live projection, moderation representative selection,
  history order, command controllers, and live state services under `apps/backend/matches-service/src`.
- Competition-service active-association controller, service, and unordered repository method under
  `apps/backend/competition-service/src`.
- Expo `MatchApi`, HTTP case/error boundary, match/pool/team/division types, TanStack hooks, feed/club/team/pool list
  callers, match route/cards/ranking, live forms, and moderation/history components under `apps/frontend/mobile/src`.
- `docs/migration/backend-contract-audits/mrg-256-competition-service.md`.
- `docs/migration/backend-contract-audits/mrg-257-matches-service.md`.
- `docs/migration/backend-contract-audits/mrg-263-mobile-gateway-facade.md`.
- `docs/migration/backend-contract-audits/mrg-265-gateway-club-team-pool-aggregations.md`.
- Read-only Maaatch competition public-read generated API controller/mapper, application service/view/port, generated
  client adapter/outbound mapper, and focused application tests under
  `/Users/legel/Documents/Projets/Maaatch/maaatch/apps/backend/bff`.

## Downstream Handoff

MRG-267 must merge these raw, nested, derived, sparse, compatibility, and unused fields with every service audit.
MRG-268 must approve workflow-owned views, list/detail/moderation separation, ordering, pagination/bounds, fan-out,
partial-failure, cache, ranking, live, signed-link, error, logging, mapper, and migration policies. MRG-301 through
MRG-304 must then capture deployed wires and coexistence before MRG-327, MRG-338, MRG-346, MRG-413, or MRG-416 can
replace contracts, clients, conversions, or legacy shapes. TanStack Query and Orval remain owned by
`apps/frontend/mobile`; no shared TanStack library is introduced.
