# MRG-265 — mobile-gateway club, team, and pool aggregation audit

- Audit date: 2026-07-16
- Commit: `690600bfa291da81e4ce40053d8c4bf2ac5444e8`
- Scope roots: `apps/backend/mobile-gateway`, `apps/frontend/mobile/src`, and MRG-253 through MRG-256 plus MRG-263
  audit evidence
- Audited workflow: club profile, team detail/list, pool detail/list, and their secure update facades
- Runtime mutation: none
- Evidence limitations: committed source only; no deployed payloads, generated Springdoc document, access logs,
  production cache state, replica topology, downstream latency traces, Auth0 tokens, safe database samples, or physical
  mobile run were available

## Scope

This audit covers all nine club, team, and pool facade operations: six public reads and three secure updates. It follows
every controller through `ClubService`, `TeamService`, or `PoolService`; all club, team, pool, division, and competition
client calls; the manual builders and mutable enrichment helper; Caffeine behavior; the handwritten Expo API and
TanStack hooks; and every proven screen, form, card, ranking, map, follow, or navigation consumer.

The report gives exact cardinality formulas, method-call and potential downstream-network fan-out, iteration and result
ordering, deduplication, missing/null behavior, cache interaction, full-response and temporary fields, source-field
loss, and current frontend reasons. MRG-253 through MRG-256 continue to own the downstream service persistence, S3,
event, scraper, follower, and database details. MRG-266 owns match/live aggregation. MRG-267 owns the consolidated
cross-service field matrix, and MRG-268 owns target architecture and migration order.

No current Springdoc shape is promoted to a target contract. Blockout-owned target REST and event properties remain
camelCase. Database columns and Python-internal identifiers may remain snake_case behind adapters. The global Jackson
snake-case strategy, explicit annotations, Expo deep case conversion, and multipart helper are recorded only as
temporary compatibility evidence. Orval and TanStack Query remain local to the sole Expo application.

Maaatch remains a read-only structural reference. Its BFF separates generated inbound DTOs, application views and
ports, generated downstream clients, outbound view mappers, and API mappers. That separation is relevant to Blockout;
Maaatch competition payloads, web architecture, and product behavior are not.

## 1. Runtime Boundary Summary

| Boundary                     | Current owner              | Entry / calls                                    | Auth                                     | Data owner                  | Aggregation role                                                | Evidence                                                   | Status           |
| ---------------------------- | -------------------------- | ------------------------------------------------ | ---------------------------------------- | --------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| public club profile          | mobile-gateway club facade | one cached club client read, then phone mutation | anonymous inbound; M2M outbound          | clubs-service               | filters one field on a copied mutable DTO                       | `ClubPublicController`, `ClubService`, `ClubClientService` | `PROVEN`         |
| secure club update           | mobile-gateway club facade | multipart parse/rebuild and one club PUT         | authenticated inbound; user JWT outbound | clubs-service               | pass-through plus cache put/eviction                            | secure controller/client; `ClubForm`                       | `PROVEN`         |
| public team detail           | mobile-gateway team facade | team, division, competition, teams, clubs, pools | anonymous inbound; M2M outbound          | owning downstream services  | large mobile projection with pool rankings                      | `TeamService.getTeamById` and Expo team flow               | `PROVEN`         |
| public team lists            | mobile-gateway team facade | active list or iterative IDs, divisions, clubs   | anonymous inbound; M2M outbound          | teams/config/clubs services | summary projections and logo fallback                           | team service and list/follow flows                         | `PROVEN`         |
| secure team update           | mobile-gateway team facade | multipart parse/rebuild and one team PUT         | authenticated inbound; user JWT outbound | teams-service               | pass-through plus local cache changes                           | secure controller/client; `TeamForm`                       | `PROVEN`         |
| public pool detail           | mobile-gateway pool facade | pool, division, associations, teams, clubs       | anonymous inbound; M2M outbound          | owning downstream services  | ranking, logo, coordinate, and division projection              | `PoolService.getPoolById` and Expo pool flow               | `PROVEN`         |
| public pool list             | mobile-gateway pool facade | iterative pool IDs and divisions                 | anonymous inbound; M2M outbound          | pools/config services       | followed-pool summaries                                         | pool service and followed-pool flow                        | `PROVEN`         |
| secure pool update           | mobile-gateway pool facade | one pool PUT                                     | authenticated inbound; user JWT outbound | pools-service               | pass-through plus cache put                                     | secure controller/client; `PoolForm`                       | `PROVEN`         |
| mobile transport             | handwritten Expo APIs      | Axios case transforms and TanStack hooks         | public or bearer Axios instance          | facade wire contract        | no generated contract or view mapper                            | API/type/hook/component sources                            | `PROVEN`         |
| persistence/events/schedules | none in gateway scope      | not applicable                                   | not applicable                           | downstream services         | no gateway entity, repository, listener, producer, or scheduler | gateway source inventory                                   | `NOT_APPLICABLE` |

There is no mapper package, application command/view, generated API interface, persistence type, or explicit projector.
The three services receive copied downstream DTOs directly. Club mutates one, team and pool assemble responses with
Lombok builders, and `TeamLogoEnricher` mutates copied `TeamDTO` instances in place.

## 2. REST Operation Inventory

No controller declares a stable OpenAPI `operationId`; every current operation ID is `MISSING`.

| Family | Method and facade path                             | Input                              | Success               | Aggregation / pass-through                 | Expo caller                          | Status   |
| ------ | -------------------------------------------------- | ---------------------------------- | --------------------- | ------------------------------------------ | ------------------------------------ | -------- |
| club   | GET `/api/v1/mobile/public/clubs/{id}`             | string path ID                     | 200 `ClubDTO`         | cached club read, set `phoneNumber=null`   | `useClubById` -> club screen         | `PROVEN` |
| club   | PUT `/api/v1/mobile/secure/clubs/{id}`             | multipart `data`, optional `image` | 200 `ClubDTO`         | parse/rebuild multipart, one club PUT      | `ClubForm`                           | `PROVEN` |
| team   | GET `/api/v1/mobile/public/teams/{id}`             | long path ID                       | 200 `EnrichedTeamDTO` | multi-service detail projection            | `useEnrichedTeamById` -> team screen | `PROVEN` |
| team   | GET `/api/v1/mobile/public/teams/by-club/{clubId}` | nonblank string path ID            | 200 raw summary array | active team list, divisions, one club      | club and team-list screens           | `PROVEN` |
| team   | GET `/api/v1/mobile/public/teams/by-ids`           | required repeated `ids`            | 200 raw summary array | per-unique-ID team reads, divisions, clubs | followed-team hook                   | `PROVEN` |
| team   | PUT `/api/v1/mobile/secure/teams/{id}`             | multipart `data`, optional `image` | 200 `TeamDTO`         | parse/rebuild multipart, one team PUT      | `TeamForm`                           | `PROVEN` |
| pool   | GET `/api/v1/mobile/public/pools/{id}`             | long path ID                       | 200 `EnrichedPoolDTO` | multi-service detail/ranking projection    | `useEnrichedPoolById` -> pool screen | `PROVEN` |
| pool   | GET `/api/v1/mobile/public/pools/by-ids`           | required repeated `ids`            | 200 raw summary array | per-unique-ID pool reads and divisions     | followed-pool hook                   | `PROVEN` |
| pool   | PUT `/api/v1/mobile/secure/pools/{id}`             | JSON `PoolUpdateDTO`               | 200 `PoolDTO`         | one pool PUT                               | `PoolForm`                           | `PROVEN` |

The two `by-ids` endpoints are unpaginated and have no size bound. Missing request parameters fail through Spring
binding; an explicitly empty list reaches `InconsistentStateException` and becomes a 500. Duplicates are removed.
Lists have no total, `hasNext`, wrapper, or stated order. Public operations use M2M downstream credentials; secure
operations forward the authenticated JWT. The gateway adds no scope or ownership rule.

## 3. Type and Duplicate Inventory

| Type ID               | Shape / fields                                                                                                                                                               | Current role                                                   | Duplicate / drift                                                                    | Status   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- |
| `GW-CLUB-R`           | `ClubDTO`: id, rawName, name, city, postalCode, email, phoneNumber, website, logoUrl, latitude, longitude, active, createdAt, lastUpdate                                     | downstream response, cache value, direct and nested BFF output | clubs entity/response and Expo `Club`; Expo additionally declares `address`          | `PROVEN` |
| `GW-CLUB-U`           | `ClubUpdateDTO`: id, rawName, name, city, postalCode, logoUrl, email, phoneNumber, website                                                                                   | parsed multipart request and downstream request                | wider than current mobile form; no address                                           | `PROVEN` |
| `GW-TEAM-B`           | `TeamDTO`: id, clubId, rawName, name, shortName, leagueCode, divisionId, format, gender, season, latitude, longitude, followersCount, logoUrl, active, createdAt, lastUpdate | downstream response and mutable cache value                    | teams entity/response and Expo `Team`; Java timestamps are strings                   | `PROVEN` |
| `GW-TEAM-U`           | `TeamUpdateDTO`: clubId, rawName, name, shortName, leagueCode, divisionId, logoUrl, season, format, gender, active                                                           | parsed multipart request and downstream request                | current mobile form sends three fields only                                          | `PROVEN` |
| `GW-TEAM-E`           | `EnrichedTeamDTO`: id, name, clubId, shortName, rawName, format, gender, season, followersCount, logoUrl, club, division, pools                                              | BFF detail projection                                          | Expo omits embedded `club`                                                           | `PROVEN` |
| `GW-TEAM-S`           | `TeamSummaryDTO`: id, name, season, gender, format, logoUrl, division, club, shortName                                                                                       | BFF list projection                                            | Expo omits embedded `club`                                                           | `PROVEN` |
| `GW-TEAM-RANK`        | `TeamWithStatsDTO`: id, name, shortName, logoUrl, points, played, wins, losses, pointsPenalty, longitude, latitude, coefSets, coefPoints                                     | BFF ranking/map row                                            | copied comparator inputs plus team presentation fields                               | `PROVEN` |
| `GW-POOL-B`           | `PoolDTO`: id, poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, followersCount, active, createdAt, lastUpdate                 | downstream response and cache value                            | pools entity/response and Expo `Pool`                                                | `PROVEN` |
| `GW-POOL-U`           | `PoolUpdateDTO`: poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, active                                                      | JSON request and downstream request                            | current mobile form sends name/shortName only                                        | `PROVEN` |
| `GW-POOL-E`           | `EnrichedPoolDTO`: id, season, poolCode, leagueCode, leagueName, name, shortName, rawName, format, gender, followersCount, ranking, division                                 | pool detail and nested team-pool projection                    | one oversized class is populated differently by workflow                             | `PROVEN` |
| `GW-POOL-S`           | `PoolSummaryDTO`: id, name, shortName, leagueName, leagueCode, season, gender, format, division                                                                              | followed-pool projection                                       | raw public array and handwritten Expo copy                                           | `PROVEN` |
| `GW-DIV-N`            | full ten-field `DivisionDTO`                                                                                                                                                 | cached downstream response embedded unchanged                  | same DTO appears in every config/team/pool projection                                | `PROVEN` |
| `GW-COMP-A`           | full 24-field `CompetitionAssociationDTO`                                                                                                                                    | pool-detail source row                                         | 16 fields are discarded before BFF output                                            | `PROVEN` |
| `GW-COMP-PR`          | `PoolWithRankingDTO`: poolId, ranking                                                                                                                                        | team-detail source projection                                  | copied competition-service projection                                                | `PROVEN` |
| `GW-COMP-TR`          | `TeamRankingDTO`: teamId, points, pointsPenalty, played, wins, losses, coefSets, coefPoints                                                                                  | team-detail ranking source                                     | copied competition-service projection                                                | `PROVEN` |
| `EXPO-CLUB/TEAM/POOL` | handwritten boundary and form interfaces                                                                                                                                     | Axios result/request typing and UI props                       | requiredness exceeds runtime guarantees; broad types reused as partial update bodies | `PROVEN` |

All Java types are mutable Lombok holders. `GW-CLUB-R`, `GW-TEAM-B`, `GW-POOL-B`, and `GW-DIV-N` are simultaneously
downstream transports, cache entries, aggregation inputs, and parts of public BFF output. Object DTOs remain
boundary-local candidates even where their field sets match; no target sharing decision is made here.

## 4. Club Read, Update, and Nested Use

### Call graph

| Workflow         | Step       | Downstream call / mutation               | Cardinality                                   | Cache                                             | Null / failure                                      | Status   |
| ---------------- | ---------- | ---------------------------------------- | --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | -------- |
| public club      | 1          | club client GET by ID                    | 0..1 network calls                            | `clubById`, four hours, max 1,000                 | downstream error aborts                             | `PROVEN` |
| public club      | 2          | `club.setPhoneNumber(null)`              | one in-place mutation                         | mutates the object returned by the cache boundary | null club causes NPE -> generic 500                 | `PROVEN` |
| secure update    | 1          | parse `data` and rebuild multipart       | one JSON round trip; image buffered by helper | none                                              | parse/read error aborts                             | `PROVEN` |
| secure update    | 2          | club client PUT                          | one network call                              | puts `clubById`; evicts unused `clubLogoById`     | null body is returned as 200 empty                  | `PROVEN` |
| nested team/pool | enrichment | direct club-client GET per distinct club | 0..C network calls                            | same `clubById` cache                             | HTTP failure aborts; null club is usually tolerated | `PROVEN` |

The explicit phone nulling applies only through `ClubService.getClubById`. Team and pool aggregations call
`ClubClientService` directly and embed full `ClubDTO` values without that projection rule. Therefore nested public team
responses can serialize `phoneNumber`, while current Expo team types do not declare or read embedded clubs. Because the
cache stores mutable values and the public club path mutates its returned object, nested phone content can also depend
on whether that cached instance was previously read through the public club route. The code path is `PROVEN`; observed
cross-request incidence is `UNKNOWN` without a focused cache test or runtime trace.

### Direct club response fields

| Field               | Transformation                                | Exact Expo consumer / purpose                                     | Classification                         | Status   |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | -------- |
| `id`                | copied                                        | route/query key, team-list ownership, report context              | `REQUIRED`                             | `PROVEN` |
| `rawName`           | copied                                        | read-only context in `ClubForm`                                   | `REQUIRED`                             | `PROVEN` |
| `name`              | copied                                        | header, hero, map query, report context, editable name            | `REQUIRED`                             | `PROVEN` |
| `city`              | copied                                        | information row and map query                                     | `REQUIRED`                             | `PROVEN` |
| `postalCode`        | copied                                        | no current Expo read found                                        | `COMPATIBILITY_ONLY`                   | `PROVEN` |
| `email`             | copied                                        | visible mail action                                               | `REQUIRED`                             | `PROVEN` |
| `phoneNumber`       | forced null on public read                    | keeps the current phone row hidden                                | `REQUIRED`                             | `PROVEN` |
| `website`           | copied                                        | visible external-link action                                      | `REQUIRED`                             | `PROVEN` |
| `logoUrl`           | copied                                        | hero, background, map marker, form preview/preserve/delete        | `REQUIRED`                             | `PROVEN` |
| `latitude`          | copied from clubs-service-derived coordinates | club map position                                                 | `DERIVED`                              | `PROVEN` |
| `longitude`         | same                                          | club map position                                                 | `DERIVED`                              | `PROVEN` |
| `active`            | copied                                        | no current club-screen read                                       | `COMPATIBILITY_ONLY`                   | `PROVEN` |
| `createdAt`         | copied                                        | no current Expo read                                              | `COMPATIBILITY_ONLY`                   | `PROVEN` |
| `lastUpdate`        | copied                                        | no current Expo read                                              | `COMPATIBILITY_ONLY`                   | `PROVEN` |
| Expo-only `address` | not present in gateway DTO                    | information row and Google Maps query always receive no BFF value | `REQUIRED` UI intent; missing producer | `PROVEN` |

The secure form sends only `name` and `logoUrl` plus the optional image. `id`, `rawName`, `city`, `postalCode`, `email`,
`phoneNumber`, and `website` remain accepted by the BFF request DTO but have no current Expo submission. The response is
passed through the form callback, but all route callbacks ignore it and immediately refetch. External callers remain
unknown, so these fields and the response cannot be removed.

## 5. Enriched Team Detail Call Graph

Let:

- `P` be the number of `PoolWithRankingDTO` rows;
- `U` be the number of distinct team IDs across every ranking plus the requested team ID;
- `C` be the number of distinct nonblank club IDs among the resolved teams;
- `Q` be the number of distinct pool IDs across the `P` rows.

| Step | Operation                          | Method invocations                           | Ordering / transformation                                      | Missing / failure behavior                          | Status   |
| ---- | ---------------------------------- | -------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- | -------- |
| 1    | team client GET requested team     | 1; 0..1 network                              | establishes base team                                          | null -> explicit inconsistent-state 500             | `PROVEN` |
| 2    | config client GET division         | 1; 0..1 network                              | uses base `divisionId`                                         | null -> explicit 500; null ID -> generic 500        | `PROVEN` |
| 3    | competition GET pools with ranking | 1 network                                    | downstream pool/ranking order retained initially               | null body -> `[]`; HTTP failure aborts              | `PROVEN` |
| 4    | collect ranking team IDs           | inspect all `P` rankings                     | `HashSet`; lookup order unspecified; requested ID added        | null pool/ranking/team ID can cause generic 500     | `PROVEN` |
| 5    | team client GET each ID            | `U` calls; requested team is looked up again | non-null teams enter map                                       | missing logged, later referenced ranking throws 500 | `PROVEN` |
| 6    | club enrichment                    | `C` club-client calls                        | distinct HashSet order; mutates team logo and coordinates      | null club tolerated; HTTP failure aborts            | `PROVEN` |
| 7    | collect/fetch pools                | `Q` pool-client calls                        | set lookup order unspecified; map by pool ID                   | missing logged, later pool builder throws 500       | `PROVEN` |
| 8    | build enriched pools               | `P` builders                                 | preserves arbitrary downstream pool order; sorts every ranking | missing team/pool or nullable sort input aborts     | `PROVEN` |
| 9    | fetch main club again              | 1 club-client call                           | normally a cache hit when main club was enriched               | null club allowed; invalid club ID can fail         | `PROVEN` |
| 10   | build enriched team                | 1 builder                                    | main logo uses team logo, then club fallback                   | no partial-result marker                            | `PROVEN` |

There are `4 + U + C + Q` client-method invocations including the initial team, division, competition, and final club
calls. With cold caches, network fan-out is at most `U + C + Q + 2`: the second requested-team lookup and usually the
final main-club lookup hit values loaded earlier in the same request. Existing four-hour team/club/pool caches and the
one-day division cache can reduce network calls to the competition call only; they do not remove iterative method
structure or stale-data behavior.

Competition-service returns pools and reduced rankings through hash-based, explicitly unsorted collections. The BFF
preserves pool order, so team ranking tabs can appear in arbitrary order. Each ranking is sorted by points descending,
points penalty ascending, wins descending, set coefficient descending, then point coefficient descending. There is no
immutable-ID tie-breaker. Java's stable sort preserves the arbitrary input order for exact ties.

`TeamLogoEnricher` changes every resolved `TeamDTO` in place: a blank team logo receives the club logo, and latitude and
longitude are overwritten from the club whenever it exists. Those objects can be the same mutable instances stored in
`teamById`. Once a fallback logo has been copied into a cached team, a later club-logo update does not replace it because
the team logo is no longer blank; no club update invalidates `teamById`. The stale-fallback path is `PROVEN`; production
frequency is `UNKNOWN`.

### Enriched team fields

| Field            | Source / transformation                       | Exact Expo consumer / purpose                             | Classification       | Status   |
| ---------------- | --------------------------------------------- | --------------------------------------------------------- | -------------------- | -------- |
| `id`             | base team                                     | query key, match filters, follow identity, report context | `REQUIRED`           | `PROVEN` |
| `name`           | base team                                     | screen header, report context, edit initial value         | `REQUIRED`           | `PROVEN` |
| `clubId`         | base team                                     | club navigation                                           | `REQUIRED`           | `PROVEN` |
| `shortName`      | base team                                     | edit initial value                                        | `REQUIRED`           | `PROVEN` |
| `rawName`        | base team                                     | read-only edit context                                    | `REQUIRED`           | `PROVEN` |
| `format`         | base team                                     | profile chip                                              | `REQUIRED`           | `PROVEN` |
| `gender`         | base team                                     | profile chip/color                                        | `REQUIRED`           | `PROVEN` |
| `season`         | base team                                     | profile chip                                              | `REQUIRED`           | `PROVEN` |
| `followersCount` | base team                                     | optimistic follow counter                                 | `REQUIRED`           | `PROVEN` |
| `logoUrl`        | team logo or club fallback                    | profile image and edit preservation/deletion              | `DERIVED`            | `PROVEN` |
| `club`           | full club DTO fetched again                   | absent from Expo `EnrichedTeamDTO`; no current read       | `COMPATIBILITY_ONLY` | `PROVEN` |
| `division`       | one config division                           | profile colors/chip and every nested pool/ranking visual  | `REQUIRED`           | `PROVEN` |
| `pools`          | competition rankings plus pool/team/club data | dynamic tabs and ranking cards                            | `DERIVED`            | `PROVEN` |

The embedded `club` field carries a TODO for removal, but repository non-use is not removal authorization. Deployed
client inventory and a compatibility plan remain required.

## 6. Team List Call Graphs

### Teams by club

Let `T` be the number of active teams returned and `D` their distinct non-null division IDs.

| Step | Operation                | Cardinality             | Ordering / fallback                                          | Failure behavior                                      | Status   |
| ---- | ------------------------ | ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------- | -------- |
| 1    | validate `clubId`        | one check               | blank is rejected                                            | inconsistent-state 500                                | `PROVEN` |
| 2    | teams client active list | 1 call; 0..1 network    | downstream order retained; empty returns immediately         | HTTP failure aborts                                   | `PROVEN` |
| 3    | division reads           | `D` calls; 0..D network | missing division logged and omitted from map                 | summary keeps null division                           | `PROVEN` |
| 4    | club read                | 1 call; 0..1 network    | same club object embedded in every row                       | null club tolerated only while every team owns a logo | `PROVEN` |
| 5    | summary build            | `T` builders            | downstream team order retained; team logo then club fallback | blank team logo + null club causes NPE/500            | `PROVEN` |

The downstream active list has no documented stable order. Thus the response and both club/team-list screens inherit an
unstable order. Missing divisions are returned as null even though Expo declares `division` required and cards
dereference gradient fields before any optional guard; a successful BFF response can therefore crash rendering.

### Teams by IDs

Let `R` be request length, `U` unique IDs, `T` non-null active teams, `D` distinct divisions, and `C` distinct clubs.

| Step | Operation      | Cardinality              | Ordering / fallback                             | Failure behavior                       | Status   |
| ---- | -------------- | ------------------------ | ----------------------------------------------- | -------------------------------------- | -------- |
| 1    | validate IDs   | one check                | null/empty rejected                             | inconsistent-state 500                 | `PROVEN` |
| 2    | deduplicate    | `R` -> `U` via `HashSet` | duplicates removed; request order lost          | null element later fails               | `PROVEN` |
| 3    | team reads     | `U` cached per-ID calls  | missing/inactive rows omitted; `active` unboxed | null `active` or ID causes generic 500 | `PROVEN` |
| 4    | division reads | `D` calls                | missing division yields null projection         | HTTP failure aborts                    | `PROVEN` |
| 5    | club reads     | `C` calls                | missing club yields null and no logo fallback   | HTTP failure aborts                    | `PROVEN` |
| 6    | summary build  | `T` builders             | HashSet-derived team order retained             | no partial-result metadata             | `PROVEN` |

The client already implements one batch `getTeamsByIds(Set<Long>)` call with `active=true`, but this facade does not use
it. Expo sorts IDs only to build a stable query-key string; it sends the original favorites order, which the BFF loses.
The visible followed-team list therefore uses unspecified BFF order.

### Team summary fields

| Field       | Source / transformation            | Exact Expo consumer / purpose                | Classification       | Status   |
| ----------- | ---------------------------------- | -------------------------------------------- | -------------------- | -------- |
| `id`        | team                               | list key and team navigation                 | `REQUIRED`           | `PROVEN` |
| `name`      | team                               | card title or fallback title                 | `REQUIRED`           | `PROVEN` |
| `shortName` | team                               | primary club-list card title                 | `REQUIRED`           | `PROVEN` |
| `season`    | team                               | available-season derivation, filtering, chip | `REQUIRED`           | `PROVEN` |
| `gender`    | team                               | chip/label/color                             | `REQUIRED`           | `PROVEN` |
| `format`    | team                               | chip/label                                   | `REQUIRED`           | `PROVEN` |
| `logoUrl`   | team logo or club fallback         | card image                                   | `DERIVED`            | `PROVEN` |
| `division`  | per-ID config lookup               | gradient and division chip                   | `REQUIRED`           | `PROVEN` |
| `club`      | one shared or per-ID full club DTO | absent from Expo type and current card code  | `COMPATIBILITY_ONLY` | `PROVEN` |

## 7. Pool Detail and List Call Graphs

### Enriched pool detail

Let `A` be association rows, `U` distinct team IDs, and `C` distinct nonblank club IDs among found teams.

| Step | Operation                   | Cardinality             | Ordering / transformation                         | Failure behavior                                | Status   |
| ---- | --------------------------- | ----------------------- | ------------------------------------------------- | ----------------------------------------------- | -------- |
| 1    | pool client GET             | 1; 0..1 network         | accepts active or inactive pool                   | null -> explicit 500                            | `PROVEN` |
| 2    | division client GET         | 1; 0..1 network         | one full division                                 | null -> explicit 500; null ID -> generic 500    | `PROVEN` |
| 3    | competition association GET | 1 network               | null body -> empty list                           | HTTP failure aborts                             | `PROVEN` |
| 4    | collect/fetch teams         | `U` cached per-ID calls | HashSet lookup order; map by ID                   | missing logged, referenced row later throws 500 | `PROVEN` |
| 5    | collect/fetch clubs         | `C` cached calls        | mutates team logos and coordinates                | null club tolerated; HTTP failure aborts        | `PROVEN` |
| 6    | ranking build/sort          | `A` builders            | association order then copied five-key comparator | missing team/null sort value aborts             | `PROVEN` |
| 7    | pool build                  | one builder             | copies pool, division, ranking                    | no partial-result marker                        | `PROVEN` |

Cold-cache network fan-out is at most `U + C + 3`; warm team, club, pool, and division entries reduce it, but the
competition call remains uncached. Empty associations produce a valid empty ranking. Duplicate association rows are
not deduplicated and can produce duplicate ranking rows. Exact comparator ties retain arbitrary association order
because there is no ID tie-breaker.

Club enrichment overwrites team latitude and longitude even when the team DTO already contains values. Pool map markers
therefore represent club coordinates. The same helper mutates cached team objects. Unlike team-detail rankings,
pool-detail ranking builders copy those coordinates into `TeamWithStatsDTO`.

### Pools by IDs

Let `R` be request length, `U` unique IDs, `P` non-null active pools, and `D` distinct division IDs.

| Step | Operation            | Cardinality             | Ordering / fallback                             | Failure behavior                            | Status   |
| ---- | -------------------- | ----------------------- | ----------------------------------------------- | ------------------------------------------- | -------- |
| 1    | validate/deduplicate | `R` -> `U`              | HashSet removes duplicates and order            | null/empty -> 500; null element later fails | `PROVEN` |
| 2    | pool reads           | `U` cached per-ID calls | missing/inactive omitted; `active` unboxed      | null active/ID -> generic 500               | `PROVEN` |
| 3    | division reads       | `D` calls               | missing division logged, row retained with null | HTTP failure aborts                         | `PROVEN` |
| 4    | summary build        | `P` builders            | HashSet-derived pool order retained             | no partial-result metadata                  | `PROVEN` |

`PoolClientService.getPoolsByIds(Set<Long>)` already implements a batch read but is unused. Expo again sorts only its
query-key string and sends the original favorite order, which the BFF discards. A null division reaches Expo despite a
required type and is dereferenced by followed-pool cards.

### Pool summary fields

| Field        | Source / transformation | Exact Expo consumer / purpose            | Classification       | Status   |
| ------------ | ----------------------- | ---------------------------------------- | -------------------- | -------- |
| `id`         | pool                    | list key and pool navigation             | `REQUIRED`           | `PROVEN` |
| `name`       | pool                    | followed-pool title                      | `REQUIRED`           | `PROVEN` |
| `shortName`  | pool                    | no current followed-pool read            | `COMPATIBILITY_ONLY` | `PROVEN` |
| `leagueName` | pool                    | regional-league chip                     | `REQUIRED`           | `PROVEN` |
| `leagueCode` | pool                    | decides whether regional league is shown | `REQUIRED`           | `PROVEN` |
| `season`     | pool                    | season derivation/filter and chip        | `REQUIRED`           | `PROVEN` |
| `gender`     | pool                    | chip/label/color                         | `REQUIRED`           | `PROVEN` |
| `format`     | pool                    | chip/label                               | `REQUIRED`           | `PROVEN` |
| `division`   | config lookup           | image, gradient, and division chip       | `REQUIRED`           | `PROVEN` |

## 8. Enriched Pool and Ranking Field Matrix

`GW-POOL-E` is used both for pool detail and for each pool embedded in team detail. The pool-detail builder fills every
field. The team-detail builder omits `season` and `rawName`; `@JsonInclude(NON_NULL)` suppresses them, although Expo
declares both required. It also reuses the requested team's single division for every pool without checking the pool's
own `divisionId`.

| Field            | Pool-detail source / use | Team-detail source / use       | Exact Expo purpose                                     | Classification             | Status   |
| ---------------- | ------------------------ | ------------------------------ | ------------------------------------------------------ | -------------------------- | -------- |
| `id`             | base pool                | base pool                      | route, match filter, dynamic tab/ranking key           | `REQUIRED`                 | `PROVEN` |
| `season`         | base pool                | omitted                        | pool profile chip; absent in team nested wire          | `REQUIRED` for pool detail | `PROVEN` |
| `poolCode`       | base pool                | base pool                      | no current Expo read found                             | `COMPATIBILITY_ONLY`       | `PROVEN` |
| `leagueCode`     | base pool                | base pool                      | regional display rule in ranking header                | `REQUIRED`                 | `PROVEN` |
| `leagueName`     | base pool                | base pool                      | pool profile and regional ranking header               | `REQUIRED`                 | `PROVEN` |
| `name`           | base pool                | base pool                      | pool screen/report header; nested UI does not read it  | `REQUIRED`                 | `PROVEN` |
| `shortName`      | base pool                | base pool                      | ranking header and team dynamic tab title              | `REQUIRED`                 | `PROVEN` |
| `rawName`        | base pool                | omitted                        | read-only pool edit context                            | `REQUIRED` for pool detail | `PROVEN` |
| `format`         | base pool                | base pool                      | no current enriched-pool component read                | `COMPATIBILITY_ONLY`       | `PROVEN` |
| `gender`         | base pool                | base pool                      | profile/ranking gender label                           | `REQUIRED`                 | `PROVEN` |
| `followersCount` | base pool                | base pool                      | pool-detail optimistic follow count; unused nested     | `REQUIRED`                 | `PROVEN` |
| `ranking`        | association projection   | reduced rankings               | ranking list, team highlight, pool map                 | `DERIVED`                  | `PROVEN` |
| `division`       | pool division            | requested-team division reused | logos, gradients, chips, map border, ranking highlight | `REQUIRED`                 | `PROVEN` |

### Ranking row fields

| Field           | Source / transformation                    | Exact Expo consumer / purpose                          | Classification       | Status   |
| --------------- | ------------------------------------------ | ------------------------------------------------------ | -------------------- | -------- |
| `id`            | team ID                                    | key, highlight matching, team navigation, map identity | `REQUIRED`           | `PROVEN` |
| `name`          | team name                                  | no current ranking-row read                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| `shortName`     | team                                       | visible ranking label                                  | `REQUIRED`           | `PROVEN` |
| `logoUrl`       | team or club fallback                      | ranking and map marker image                           | `DERIVED`            | `PROVEN` |
| `points`        | association/reduced ranking                | primary sort and visible points                        | `REQUIRED`           | `PROVEN` |
| `played`        | association/reduced ranking                | visible played statistic                               | `REQUIRED`           | `PROVEN` |
| `wins`          | association/reduced ranking                | sort key and visible wins                              | `REQUIRED`           | `PROVEN` |
| `losses`        | association/reduced ranking                | visible losses                                         | `REQUIRED`           | `PROVEN` |
| `pointsPenalty` | association/reduced ranking                | server sort only; no current Expo read                 | `COMPATIBILITY_ONLY` | `PROVEN` |
| `coefSets`      | association/reduced ranking                | server sort only; no current Expo read                 | `COMPATIBILITY_ONLY` | `PROVEN` |
| `coefPoints`    | association/reduced ranking                | server sort only; no current Expo read                 | `COMPATIBILITY_ONLY` | `PROVEN` |
| `latitude`      | club coordinate copied only in pool detail | pool map filtering/marker                              | `DERIVED`            | `PROVEN` |
| `longitude`     | same                                       | pool map filtering/marker                              | `DERIVED`            | `PROVEN` |

Team-detail ranking rows serialize latitude/longitude as null because that builder does not copy them. Expo correctly
declares those two fields nullable. The remaining numeric fields are declared required in TypeScript but the BFF has no
null guard; comparator unboxing can fail before serialization.

### Nested division fields

| Field                 | Exact Expo consumer / aggregation role            | Classification       | Status   |
| --------------------- | ------------------------------------------------- | -------------------- | -------- |
| `id`                  | no current team/pool projection read              | `COMPATIBILITY_ONLY` | `PROVEN` |
| `name`                | profile, card, and ranking labels                 | `REQUIRED`           | `PROVEN` |
| `mainColor`           | chip, map border, and ranking highlight           | `REQUIRED`           | `PROVEN` |
| `firstGradientColor`  | team/pool/card gradients                          | `REQUIRED`           | `PROVEN` |
| `secondGradientColor` | same                                              | `REQUIRED`           | `PROVEN` |
| `thirdGradientColor`  | same                                              | `REQUIRED`           | `PROVEN` |
| `logoUrl`             | pool profile, followed-pool image, ranking header | `REQUIRED`           | `PROVEN` |
| `active`              | no current projection read                        | `COMPATIBILITY_ONLY` | `PROVEN` |
| `createdAt`           | no current projection read                        | `COMPATIBILITY_ONLY` | `PROVEN` |
| `lastUpdate`          | no current projection read                        | `COMPATIBILITY_ONLY` | `PROVEN` |

## 9. Downstream Source-Field Use and Loss

| Source type                 | Fields consumed by these aggregations                                                                                          | Fields copied but unused/dropped here                                                                           | Classification of dropped fields           | Status   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| `TeamDTO`                   | id, clubId, rawName, name, shortName, divisionId, format, gender, season, latitude, longitude, followersCount, logoUrl, active | leagueCode, createdAt, lastUpdate                                                                               | `COMPATIBILITY_ONLY` at this BFF workflow  | `PROVEN` |
| `PoolDTO`                   | id, poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, followersCount, active     | createdAt, lastUpdate                                                                                           | `COMPATIBILITY_ONLY`                       | `PROVEN` |
| `ClubDTO` during enrichment | logoUrl, latitude, longitude; full object also embedded in team outputs                                                        | rawName, name, city, postalCode, email, phoneNumber, website, active, timestamps have no enrichment role        | `COMPATIBILITY_ONLY` on nested outputs     | `PROVEN` |
| `CompetitionAssociationDTO` | teamId, points, played, wins, losses, pointsPenalty, coefSets, coefPoints                                                      | id, poolId, clubId, active, six detailed win/loss counts, won/lost sets, won/lost points, createdAt, lastUpdate | `COMPATIBILITY_ONLY` for this BFF consumer | `PROVEN` |
| `TeamRankingDTO`            | all eight fields                                                                                                               | none                                                                                                            | each is `REQUIRED` as source input         | `PROVEN` |
| `PoolWithRankingDTO`        | poolId and ranking                                                                                                             | none                                                                                                            | each is `REQUIRED`                         | `PROVEN` |

Original `TeamDTO.latitude/longitude` are fallback values only: a found club overwrites them. `active` is required by
the two by-ID filters but is not exposed in summaries. Detailed association statistics remain persistence/rule evidence
in competition-service but do not enter these BFF projections.

## 10. Update Inputs, Responses, and Cache Effects

| Update | Current mobile-submitted fields                | Other accepted BFF request fields                                                     | Response use                                | Cache behavior                                 | Status   |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- | -------- |
| club   | `name`, `logoUrl`, optional image              | id, rawName, city, postalCode, email, phoneNumber, website                            | route ignores returned object and refetches | put club ID; evict logo cache only             | `PROVEN` |
| team   | `name`, `shortName`, `logoUrl`, optional image | clubId, rawName, leagueCode, divisionId, season, format, gender, active               | route ignores returned object and refetches | put team ID; evict only returned/new club list | `PROVEN` |
| pool   | `name`, `shortName`                            | poolCode, leagueCode, season, leagueName, rawName, divisionId, format, gender, active | route ignores returned object and refetches | put pool ID                                    | `PROVEN` |

The mobile APIs type each body as `Partial` of the full entity interface rather than a form-specific request. Club and
team always call `formData.append("image", image as any)`, even when the image argument is undefined; exact React Native
multipart serialization on each platform is `UNKNOWN` without a captured request.

None of the request DTOs has Bean Validation at the gateway. Downstream null/omitted/logo semantics remain effective.
The club log includes the submitted display name at INFO. Multipart JSON is camelCase in form state, manually converted
to snake_case, parsed by the BFF, and reserialized under the gateway naming strategy.

Team updates evict `teamsByClubId` only for `#result.clubId`. If a wider caller moves a team, the old club list remains
cached. Club updates do not evict team entries carrying previously copied fallback logos. Pool/team follower mutations
evict only the base entity ID through `UserClientService`; downstream scraper/events and other replicas do not
invalidate local caches.

## 11. Ordering, Partial Failure, and Compatibility Summary

| Workflow          | Result ordering                  | Missing/null policy                                                 | Partial result                   | User-visible consequence                                | Status   |
| ----------------- | -------------------------------- | ------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------- | -------- |
| club profile      | single object                    | null object -> generic 500                                          | none                             | phone intentionally absent; address absent accidentally | `PROVEN` |
| team detail pools | arbitrary competition hash order | required main team/division/pool/team missing -> 500                | none                             | dynamic pool tabs can reorder                           | `PROVEN` |
| rankings          | five-key sort, no stable ID tie  | missing team/null comparator field -> 500                           | none                             | exact ties can reorder                                  | `PROVEN` |
| teams by club     | unsorted downstream order        | missing division retained as null; club conditionally required      | malformed partial rows possible  | cards can crash on null division                        | `PROVEN` |
| teams by IDs      | HashSet order                    | missing/inactive omitted; missing division/club retained null       | silent omission without metadata | favorites disappear/reorder                             | `PROVEN` |
| pool detail       | one object; sorted ranking       | inactive pool accepted; missing team -> 500; missing club tolerated | club fallback can be partial     | map/logo may use original/null team data                | `PROVEN` |
| pools by IDs      | HashSet order                    | missing/inactive omitted; missing division retained null            | silent omission without metadata | favorites disappear/reorder or card crashes             | `PROVEN` |

The list endpoints return 200 with `[]`, including when every requested ID is missing/inactive. There is no distinction
between an empty favorite set, all missing records, or partial omission. HTTP downstream 4xx statuses are preserved by
the global handler; inconsistent projections and generic/5xx technical failures become legacy map-shaped 500 errors.
There is no stable `ProblemDetail.code` or request ID.

## 12. Construction, Mapping, Casing, and Logging

| Conversion                            | Mechanism                                 | Field/default effect                                              | Provisional boundary owner                   | Status                              |
| ------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| downstream responses -> base DTOs     | handwritten copied Jackson classes        | unknown fields dropped; requiredness implicit                     | generated downstream adapters after approval | `PROVEN`                            |
| team/pool sources -> enriched outputs | inline Lombok builders                    | context-specific fields omitted; policy mixed with copying        | BFF application projection candidate         | `PROVEN` current; target `INFERRED` |
| team + club -> team                   | static mutable helper                     | logo fallback and coordinate overwrite mutate source/cache object | named projection/enrichment role candidate   | `PROVEN` current; target `INFERRED` |
| club public response                  | setter on cached DTO                      | phone removal mutates transport/cache object                      | explicit public API mapper candidate         | `PROVEN` current; target `INFERRED` |
| JSON wire                             | global `SNAKE_CASE` plus annotations      | camelCase identifiers become snake_case                           | temporary compatibility layer                | `PROVEN`                            |
| Expo transport                        | deep case converters and multipart helper | restores camelCase types at runtime                               | mobile-local generated transport later       | `PROVEN`                            |

There is explicitly `NONE` for a mapper boundary. The repeated ranking comparator, inline field copies, missing-state
decisions, and downstream calls all live inside services. Target collaborator and mapper choices remain provisional
until MRG-268.

INFO logs cover every read, result, update, and generic downstream request, including full URLs. Club update logs the
club name; API client errors can be logged and then translated again. Missing related rows are WARNed even when the
request later fails. There is no correlation ID. This audit records those facts without changing logging.

## 13. Test and Parity Evidence

| Behavior                | Existing evidence            | What it proves                            | Missing parity evidence required later                                     | Status                   |
| ----------------------- | ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| gateway boot            | one `contextLoads` test      | context only when auth environment exists | deterministic test config                                                  | `PROVEN`                 |
| club projection/privacy | source inspection            | direct phone mutation and nested bypass   | cache-order, nested phone, null club, address fixtures                     | `UNKNOWN` runtime parity |
| team detail             | source and downstream audits | call sequence, builders, comparator       | exact fan-out, cold/warm cache, missing/null, stable tie, pool-order tests | `UNKNOWN` runtime parity |
| team lists              | source and Expo callers      | dedup/filter/summary rules                | request-order, duplicate, missing/inactive, null division/club tests       | `UNKNOWN` runtime parity |
| pool detail             | source and downstream audits | association/team/club projection          | empty/duplicate/missing association, inactive pool, coordinate tests       | `UNKNOWN` runtime parity |
| pool list               | source and Expo callers      | dedup/filter/summary rules                | request-order, null active/division, batch-equivalence tests               | `UNKNOWN` runtime parity |
| mutable caches          | source/config annotations    | shared mutable DTO path and TTLs          | focused Caffeine mutation/invalidation/replica tests                       | `UNKNOWN` runtime parity |
| mobile                  | caller inventory only        | exact field reads and query keys          | generated-client compile, render fixtures, Android/iOS request capture     | `UNKNOWN` runtime parity |
| errors                  | handler/source inspection    | translation branches                      | controller slices for stable error bodies and downstream failures          | `UNKNOWN` runtime parity |

There are no focused controller, client, service, projection, cache, mapper, or mobile tests in scope. The single
context-load test remains pre-existingly coupled to a missing `AUTH0_ISSUER` fixture. This read-only audit adds no tests.

## 14. Findings

| ID           | Observation / behavioral risk                                                                                                              | Boundary               | Status                                     | Follow-up                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------------------------------ | ----------------------------------------------- |
| `MRG265-F01` | enriched team and pool reads perform iterative `O(teams + clubs + pools)` fan-out with no batch or latency budget                          | detail projections     | `PROVEN`                                   | MRG-268/415                                     |
| `MRG265-F02` | both by-ID facades ignore existing batch clients, deduplicate with `HashSet`, lose caller order, and silently omit missing/inactive values | followed lists         | `PROVEN`                                   | MRG-267/268/415                                 |
| `MRG265-F03` | all three visible list/ranking orders lack a stable final tie/order contract                                                               | teams, pools, rankings | `PROVEN`                                   | MRG-268/327/415                                 |
| `MRG265-F04` | direct club reads null phone on a mutable cached DTO, while nested public team projections bypass that rule and embed full clubs           | club/team projection   | `PROVEN` code; runtime incidence `UNKNOWN` | MRG-267/268/414-415                             |
| `MRG265-F05` | club enrichment mutates cached team logo/coordinates; copied fallback logos can remain stale after a club update                           | team/pool cache        | `PROVEN` path; incidence `UNKNOWN`         | cache/projection parity after MRG-268           |
| `MRG265-F06` | missing division is fatal in detail reads but tolerated in list rows that Expo immediately dereferences                                    | list compatibility     | `PROVEN`                                   | explicit partial-failure contract               |
| `MRG265-F07` | embedded `club` fields are marked TODO, absent from Expo types, and can expose fields not intended by direct club projection               | team outputs           | `PROVEN`                                   | external caller proof at MRG-267/301            |
| `MRG265-F08` | team-detail nested pools reuse one team division and omit season/rawName from a type that Expo declares complete                           | team detail            | `PROVEN`                                   | context-specific BFF projections                |
| `MRG265-F09` | pool and team ranking projections duplicate the same comparator without an ID tie-breaker and copy different coordinate subsets            | ranking                | `PROVEN`                                   | one approved ordering/projection policy         |
| `MRG265-F10` | club `address` is required by the current information/map UI but has no gateway field; direct public phone is always hidden                | club profile           | `PROVEN`                                   | product/privacy/contract decision at MRG-268    |
| `MRG265-F11` | broad entity-shaped update DTOs and responses exceed current form needs and hide null/logo semantics behind multipart conversion           | secure updates         | `PROVEN`                                   | MRG-267/268/303                                 |
| `MRG265-F12` | no behavioral test protects fan-out, ordering, cache mutation, missing-state, field projection, or Expo rendering parity                   | all                    | `PROVEN`                                   | migration parity suites after architecture gate |

## 15. Provisional Target Roles

| Current type / behavior         | Provisional owner / role                                    | Disposition hypothesis                                                             | Preconditions                                            | Decision owner | Status     |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------- | ---------- |
| base club/team/pool copies      | outbound service adapter generated models                   | map immediately to workflow-owned values                                           | authoritative service contracts and compatibility matrix | MRG-268        | `INFERRED` |
| enriched team/pool/summary DTOs | BFF workflow application views plus generated API responses | split by actual screen workflow instead of partial reuse                           | MRG-267 lineage and external caller inventory            | MRG-268        | `INFERRED` |
| ranking comparator/projection   | named BFF projection/ordering policy                        | one explicit stable order and context-specific coordinate rule                     | product/rule evidence and parity fixtures                | MRG-268        | `INFERRED` |
| logo/coordinate helper          | BFF projection collaborator                                 | stop mutating cached transport DTOs                                                | cache/fallback behavior approved                         | MRG-268        | `INFERRED` |
| club phone projection           | public API mapper/policy                                    | apply one explicit rule to direct and nested outputs                               | product/privacy decision and deployed-client evidence    | MRG-268        | `INFERRED` |
| per-ID list loops               | application projection/gateway policy                       | batch or preserve iterative behavior according to approved order/failure semantics | batch-equivalence and rollback tests                     | MRG-268        | `INFERRED` |
| Expo DTOs and partial requests  | mobile-local generated client plus screen/form models       | keep TanStack local; replace broad partial entity bodies                           | BFF contract and Orval decision                          | MRG-268/313+   | `INFERRED` |
| casing converters/annotations   | temporary compatibility adapter                             | retire only after staged camelCase cutover                                         | MRG-301-304 evidence                                     | MRG-268/304    | `INFERRED` |

No row approves records, MapStruct, batching, field removal, privacy semantics, stable ranking policy, partial results,
package layout, or generator options. Those decisions remain gated by MRG-268.

## 16. Unknowns and Required Follow-up Evidence

| Unknown                                                                                | Evidence checked             | Required evidence                                          | Blocking later task?                |
| -------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| deployed consumers of embedded `club`, update responses, and compatibility-only fields | repository-wide callers      | access logs, supported-version/client inventory            | blocks removal                      |
| live nested phone values and cache-order effect                                        | source/cache configuration   | focused cache test or safe runtime trace                   | blocks projection/privacy migration |
| intended direct/nested phone and address behavior                                      | current source contradiction | explicit product/privacy decision                          | blocks target BFF contract          |
| acceptable team/pool/favorite ordering and ranking tie-breaker                         | source and UI rendering      | product/rule owner decision plus fixtures                  | blocks stable target order          |
| fan-out latency and cache hit ratio                                                    | source formulas only         | traces/metrics by cardinality                              | informs batching/caching design     |
| production replica count and cache staleness                                           | process-local cache config   | deployment topology and cache metrics                      | blocks cache migration plan         |
| live nullability of active, IDs, stats, clubs, divisions                               | Java/DB audit declarations   | safe payload/database samples                              | blocks strict requiredness          |
| React Native serialization of appended undefined image                                 | API source only              | Android/iOS captured multipart requests                    | blocks multipart parity             |
| direct service batch equivalence to current iterative omission/order                   | client and service sources   | integration fixtures across missing/inactive/duplicate IDs | blocks loop replacement             |

## 17. Audit Completion Checklist

- [x] all nine in-scope REST operations and their current auth rules are inventoried;
- [x] absence of gateway events, schedules, persistence, and vendor payload ownership is explicit;
- [x] every copied source and BFF projection type has a stable Type ID and complete field inventory;
- [x] every output field has one primary classification and every exact Expo use is identified;
- [x] current snake_case and target camelCase behavior are explicit;
- [x] exact fan-out formulas, repeated lookups, cache reductions, and unused batch clients are recorded;
- [x] list, pool-tab, and ranking ordering plus deduplication are reconstructed;
- [x] missing/null, partial omission, inactive filtering, and whole-request failure rules are explicit;
- [x] temporary embedded clubs, inconsistent enriched-pool population, coordinate/logo mutation, and field loss are
      recorded;
- [x] update input/output and multipart compatibility behavior are recorded;
- [x] existing tests and missing parity evidence are recorded;
- [x] every inference and unknown names the evidence required to resolve it;
- [x] target roles remain provisional and route to MRG-268;
- [x] no runtime, contract, generated artifact, configuration, migration, test, or deployment file changed.

## Source Evidence

- Gateway club/team/pool controllers, services, clients, DTOs, `TeamLogoEnricher`, cache configuration, security,
  multipart helper, API client, error handler, and context test under `apps/backend/mobile-gateway/src`.
- Expo club/team/pool APIs and types; entity, followed-list and follow-state hooks; routes, forms, profiles, cards,
  ranking, map, match-tab, and report-context consumers under `apps/frontend/mobile/src`.
- `docs/migration/backend-contract-audits/mrg-253-clubs-service.md`.
- `docs/migration/backend-contract-audits/mrg-254-teams-service.md`.
- `docs/migration/backend-contract-audits/mrg-255-pools-service.md`.
- `docs/migration/backend-contract-audits/mrg-256-competition-service.md`.
- `docs/migration/backend-contract-audits/mrg-263-mobile-gateway-facade.md`.
- Read-only Maaatch public-read gateway port, generated-client adapter, outbound view mapper, application service, API
  mapper, controller, and tested `ProblemDetail` boundary under
  `/Users/legel/Documents/Projets/Maaatch/maaatch/apps/backend/bff`.

## Downstream Handoff

MRG-266 must finish match, competition, and live aggregation without duplicating this club/team/pool evidence.
MRG-267 must merge these source, nested, temporary, derived, and compatibility fields across services. MRG-268 must
approve workflow-owned views, ordering, batching/fan-out, missing-state and partial-failure semantics, cache ownership,
privacy rules, mapper placement, and migration sequence. MRG-301 through MRG-304 must then capture deployed wires and
coexistence before MRG-327, MRG-345, MRG-351 through MRG-353, or MRG-415 can replace contracts, clients, conversions,
or legacy shapes.
