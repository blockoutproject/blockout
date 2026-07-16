# MRG-257 — matches-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `49ed4d692ca14f4badb8dafb6f2ee05bbd34835e`
- Scope roots: `apps/backend/matches-service`, match-facing `competition-scraper`, `mobile-gateway`,
  `notification-service`, and Expo match modules
- Audited deployable or workflow: matches-service match, day-page, live-link, moderation, report, scraper, event, and
  BFF boundaries plus all proven monorepo consumers
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no production traffic, PostgreSQL rows, Rabbit payloads or
  queue depths, Auth0 grants, generated Springdoc document, federation fixtures, or deployed mobile versions were
  observed

## Scope

This audit covers all 16 REST operations, three persisted entities, match and live-link DTOs, repositories, lifecycle
callbacks, live-link policies, Rabbit topology, the competition scraper cache/write path, both notification consumers,
all match-facing BFF clients and projections, and the Expo API, TanStack queries, forms, list, detail, and moderation
screens. The current behavior is evidence, not target contract authority.

The target Blockout-owned wire convention is camelCase. Python calculation and scraper-domain identifiers may remain
snake_case behind an explicit generated or handwritten transport adapter. Database columns and external federation
payloads remain outside that wire-name rule. Target ownership is provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary             | Current owner / entry                       | Producers                                         | Consumers / effects                                   | Auth                                  | Status   |
| -------------------- | ------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- | -------- |
| match REST           | matches-service, seven operations           | competition scraper, BFF                          | PostgreSQL, day/detail views, finish event            | authenticated globally; scoped writes | `PROVEN` |
| live REST            | matches-service, seven operations           | BFF/Expo                                          | live-link history, moderation, reports, notifications | scoped per operation                  | `PROVEN` |
| test REST            | matches-service, two operations             | external test caller unknown                      | publishes synthetic finish events                     | `publish:events`                      | `PROVEN` |
| match storage        | `matches` JPA entity/table                  | scraper create/update/cleanup                     | raw reads, projections, live links, events            | internal                              | `PROVEN` |
| live storage         | live-link and report entities/tables        | authenticated users/moderators                    | detail, history, moderation                           | internal                              | `PROVEN` |
| incoming lifecycle   | three durable queues and bindings           | competition-service                               | intended match deactivation                           | broker credentials; **no listeners**  | `PROVEN` |
| outgoing lifecycle   | `match.finished`, `match.live-link-created` | match update/live create                          | notification-service                                  | broker credentials                    | `PROVEN` |
| users HTTP           | forwarded-token `GET /me`                   | matches-service                                   | account-age/owner policy                              | current bearer token                  | `PROVEN` |
| BFF aggregation      | mobile-gateway public/secure match facades  | matches, pools, teams, clubs, config, competition | Expo views                                            | public or forwarded user token        | `PROVEN` |
| Expo transport/query | handwritten Axios API plus TanStack hooks   | BFF                                               | match list/detail/live/moderation UI                  | public or bearer token                | `PROVEN` |

The service has 42 production Java files, 12 local DTO files, 16 mapped operations, zero `@RabbitListener` methods,
and one context-load test. It owns match persistence but currently also owns user-facing live policy, day projection,
and event publication in the same application service layer.

## 2. REST Operation Inventory

No controller operation has an explicit source-contract `operationId`; every operation ID is therefore `MISSING`.
Springdoc annotations are descriptive implementation evidence only.

| Method and path                                         | Controller method              | Auth rule                  | Request                                                | Success                      | Proven caller       | Status   |
| ------------------------------------------------------- | ------------------------------ | -------------------------- | ------------------------------------------------------ | ---------------------------- | ------------------- | -------- |
| GET `/api/v1/matches`                                   | `listMatches`                  | authenticated              | optional `pool_id`, `team_ids`, status, active         | 200 direct entity list       | competition scraper | `PROVEN` |
| GET `/api/v1/matches/day-groups`                        | `dayGroups`                    | authenticated              | page=0, size=4, `pool_ids`, `team_ids`, status, active | 200 `DayPageDTO`             | BFF                 | `PROVEN` |
| GET `/api/v1/matches/{id}`                              | `getMatchById`                 | authenticated              | match ID                                               | 200 `MatchDTO`; 404          | BFF                 | `PROVEN` |
| POST `/api/v1/matches`                                  | `createMatch`                  | `create:matches`           | direct `Match` entity                                  | 201 direct entity + Location | competition scraper | `PROVEN` |
| PUT `/api/v1/matches/{id}`                              | `updateMatch`                  | `update:matches`           | direct `Match` entity                                  | 200 direct entity; 404       | competition scraper | `PROVEN` |
| PUT `/api/v1/matches/pools/{poolId}/bulk-deactivate`    | `bulkDeactivateMatches`        | `delete:matches`           | `missing_match_codes`                                  | 200 empty                    | competition scraper | `PROVEN` |
| GET `/api/v1/matches/live-moderation`                   | `listMatchesForLiveModeration` | `moderate:match_live_link` | optional status                                        | 200 summary list             | BFF                 | `PROVEN` |
| GET `/api/v1/matches/{matchId}/live-links`              | `getLiveLinksHistory`          | `moderate:match_live_link` | match ID                                               | 200 history list             | BFF/Expo moderation | `PROVEN` |
| POST `/api/v1/matches/{matchId}/live-link`              | `upsertLiveLink`               | `create:match_live_link`   | URL                                                    | 200 response DTO             | BFF/Expo            | `PROVEN` |
| DELETE `/api/v1/matches/{matchId}/live-link`            | `deleteLiveLink`               | `delete:match_live_link`   | JWT subject                                            | 204 even when absent         | BFF/Expo            | `PROVEN` |
| POST `/api/v1/matches/{matchId}/live-link/report`       | `reportLiveLink`               | `report:match_live_link`   | reason + JWT subject                                   | 204                          | BFF/Expo            | `PROVEN` |
| POST `/api/v1/matches/live-links/{id}/approve`          | `approvePendingLink`           | `moderate:match_live_link` | live-link ID                                           | 204                          | BFF/Expo moderation | `PROVEN` |
| POST `/api/v1/matches/live-links/{id}/reject`           | `rejectPendingLink`            | `moderate:match_live_link` | live-link ID                                           | 204                          | BFF/Expo moderation | `PROVEN` |
| POST `/api/v1/matches/live-links/{id}/reactivate`       | `reactivateLiveLink`           | `moderate:match_live_link` | live-link ID                                           | 204                          | BFF/Expo moderation | `PROVEN` |
| POST `/api/v1/matches/internal/test/{id}/emit-finished` | `emitFinishedById`             | `publish:events`           | persisted match ID                                     | 202                          | no monorepo caller  | `PROVEN` |
| POST `/api/v1/matches/internal/test/emit-finished`      | `emitFinishedCustom`           | `publish:events`           | finish event body                                      | 202                          | no monorepo caller  | `PROVEN` |

### Operation semantics

- Global Jackson `SNAKE_CASE` turns Blockout-owned Java property and query names into snake_case. The scraper depends on
  it directly; the BFF repeats it; Expo converts requests and responses deeply at runtime.
- Raw list/create/update expose the mutable JPA entity. Create accepts client IDs, status, active state, timestamps, and
  relationship-shaped input even though the service/framework overwrites or ignores some of them.
- Create derives status only from `set != null`. Update forces active=true and changes UPCOMING to FINISHED only when a
  previously upcoming match receives a non-null set; it never transitions back to UPCOMING.
- Update publishes `match.finished` before the repository save completes and while the database transaction remains
  open. A broker success followed by database rollback produces an event for state that did not commit.
- The bulk request name means codes to deactivate and the scraper sends that meaning, while its DTO comment incorrectly
  describes codes still present. Null input fails during `HashSet` construction.
- Day pages require at least one pool or team filter in the repository predicate. Both empty lists yield no dates.
  Negative page, zero/negative size, multiplication overflow, and excessive size are unvalidated.
- Date discovery omits the active filter, so inactive-only days can occupy pages that later return empty content. The
  finished-date query hardcodes FINISHED, while the range query accepts nullable status. Database date casts may use a
  session timezone even though Java boundaries use Europe/Paris.
- The moderation description claims a bounded post-match window; the implementation has no time-window predicate. A
  status filter checks whether _any_ historical link has that status, then displays a separately selected representative
  link, so a REJECTED filter can show an ACTIVE representative.
- The BFF contains a `listPendingLiveLinks()` call to `/live-links/pending`; matches-service exposes no such operation
  and no current code calls that client method.

## 3. Event and Scheduled Entry Inventory

| Entry                     | Direction       | Routing / queue                                                     | Payload                              | Failure / retry evidence                               | Status   |
| ------------------------- | --------------- | ------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ | -------- |
| team deactivation         | inbound claimed | `team.deactivation` → `team.deactivation.queue.matches`             | other-service event                  | durable queue, no listener                             | `PROVEN` |
| pool deactivation         | inbound claimed | `pool.deactivation` → `pool.deactivation.queue.matches`             | other-service event                  | durable queue, no listener                             | `PROVEN` |
| team-by-pool deactivation | inbound claimed | `teambypool.deactivation` → `teambypool.deactivation.queue.matches` | other-service event                  | durable queue, no listener; no other monorepo consumer | `PROVEN` |
| match finished            | outbound        | `entity.lifecycle.exchange` / `match.finished`                      | id, teamIdA, teamIdB, poolId, set    | publisher rethrows AMQP failure; no outbox             | `PROVEN` |
| live link created         | outbound        | `entity.lifecycle.exchange` / `match.live-link-created`             | id, teamIdA, teamIdB, poolId         | publisher rethrows AMQP failure; no outbox             | `PROVEN` |
| finish notification       | downstream      | `match.finished.queue.notifications`                                | copied finish event                  | notification listener and DLQ topology                 | `PROVEN` |
| live notification         | downstream      | `match.live-link-created.queue.notifications`                       | copied live event                    | notification listener and DLQ topology                 | `PROVEN` |
| internal test publish     | REST-to-event   | same finish routing key                                             | persisted or caller-supplied payload | can emit without state change                          | `PROVEN` |

Matches-service declares both notification queues despite only publishing to them; notification-service independently
declares and consumes the same named queues. Event classes are copied between services. Exact broker payload casing is
`UNKNOWN` until captured because the AMQP converter's mapper relationship to the HTTP naming configuration is not
proven. Events have no version, envelope, source revision, idempotency key, ordering key, or transactional outbox.

The missing inbound listeners break the cascade implied by MRG-254 through MRG-256: deactivated teams, pools, and
team-by-pool associations do not deactivate their matches. Implementing listeners is not automatically safe; product
and data evidence must decide whether a team deactivation should affect every historical match or only active/future
matches, and how later reactivation is reconciled.

## 4. Type and Ownership Inventory

| Type family                   | Current role                                            | Construction / serialization           | Duplicate or conflict                        | Status   |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------- | -------------------------------------------- | -------- |
| `Match`                       | mutable JPA entity, create/update request, raw response | Jackson + setters + JPA callbacks      | persistence and transport collapsed          | `PROVEN` |
| `MatchDTO`                    | detail/day response with active live fields             | two copied builders in MatchService    | same 15 match fields duplicated              | `PROVEN` |
| day/page DTOs                 | date → pool → matches pagination                        | handwritten mutable DTO graph          | copied in BFF, then enriched again           | `PROVEN` |
| `MatchLiveLink`               | mutable JPA history/version row                         | service builders and state mutation    | transport copied into two DTOs               | `PROVEN` |
| `MatchLiveLinkReport`         | mutable JPA report row                                  | report service builder                 | no response type                             | `PROVEN` |
| live request/response/history | REST shapes                                             | handwritten Lombok classes             | copied field-for-field in BFF                | `PROVEN` |
| live summary                  | service moderation projection                           | manual builder/status selector         | copied then enriched by BFF                  | `PROVEN` |
| user DTO/favorite             | downstream `/me` response                               | global casing + 9 explicit annotations | copied users contract; favorites unused here | `PROVEN` |
| finish/live events            | broker payloads                                         | Lombok builders/Jackson AMQP           | copied in notification-service               | `PROVEN` |
| Python `Match`                | scraper domain/cache and transport                      | dataclass + reflection `asdict`        | exact snake_case wire coupling               | `PROVEN` |
| BFF raw match/live types      | copied downstream transport                             | 15 files, 72 explicit annotations      | generated client candidate                   | `PROVEN` |
| BFF enriched views            | list/detail/moderation UI response                      | large manual builders                  | context-dependent fields and fallbacks       | `PROVEN` |
| Expo match types              | handwritten transport/view interfaces                   | deep Axios case conversion             | nullability and field drift                  | `PROVEN` |

There are no records, generated API types, explicit application commands, domain values, MapStruct mappers, or
dedicated API mappers in matches-service. Manual mapping is mixed into query, moderation, persistence, and aggregation
logic.

## 5. Match Field-Lineage Matrix

Current wire names are snake_case through service-wide Jackson configuration. Target names are camelCase.

| Field         | Producers / writes                                             | Consumers                                                   | Validation / persistence                               | Class              | Status   |
| ------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | ------------------ | -------- |
| id            | DB identity; accepted on entity input but not copied on update | scraper cache, BFF, Expo navigation, events                 | generated bigint                                       | `REQUIRED`         | `PROVEN` |
| matchCode     | scraper CSV                                                    | unique identity, PDF tokens, logging                        | non-null; unique with leagueCode+season                | `REQUIRED`         | `PROVEN` |
| leagueCode    | scraper pool                                                   | unique identity, live pro restriction, PDF tokens           | non-null; no enum/reference                            | `REQUIRED`         | `PROVEN` |
| poolId        | scraper/BFF path context                                       | filters, grouping, aggregation, events                      | non-null; no cross-service FK                          | `REQUIRED`         | `PROVEN` |
| liveCode      | LNV HTML scraper                                               | BFF/Expo display payload                                    | nullable; no format/range rule                         | `REQUIRED`         | `PROVEN` |
| teamIdA       | scraper                                                        | filters, BFF team A, notifications                          | non-null; no team FK/distinctness check                | `REQUIRED`         | `PROVEN` |
| teamIdB       | scraper                                                        | filters, BFF team B, notifications                          | non-null; no team FK/distinctness check                | `REQUIRED`         | `PROVEN` |
| matchDate     | CSV/LNV scraper                                                | day pagination, BFF/Expo time, live window                  | non-null timestamptz; no bound                         | `REQUIRED`         | `PROVEN` |
| season        | pool/scraper                                                   | unique identity, PDF token, moderation display via summary  | non-null; free string                                  | `REQUIRED`         | `PROVEN` |
| set           | CSV/LNV scraper                                                | status transition, score UI, finish notification            | nullable free string                                   | `REQUIRED`         | `PROVEN` |
| score         | CSV/LNV scraper                                                | per-set score UI                                            | nullable comma-delimited free string                   | `REQUIRED`         | `PROVEN` |
| status        | service derives from set                                       | filters, day order, BFF/Expo behavior, moderation threshold | UPCOMING/FINISHED DB check                             | `DERIVED`          | `PROVEN` |
| venue         | scraper                                                        | match detail UI                                             | nullable; scraper converts absent to empty string      | `REQUIRED`         | `PROVEN` |
| firstReferee  | scraper                                                        | match detail UI                                             | nullable; scraper converts absent to empty string      | `REQUIRED`         | `PROVEN` |
| secondReferee | scraper                                                        | match detail UI                                             | nullable; scraper converts absent to empty string      | `REQUIRED`         | `PROVEN` |
| active        | default/create, update forces true, bulk false                 | scraper cache, raw filter/day range                         | non-null default true                                  | `REQUIRED`         | `PROVEN` |
| createdAt     | JPA callback; scraper echoes it on update                      | raw scraper transport only                                  | entity non-null, migration column nullable             | `PERSISTENCE_ONLY` | `PROVEN` |
| lastUpdate    | JPA callback; live moderation mutates it                       | raw scraper transport only                                  | entity non-null, migration column nullable             | `PERSISTENCE_ONLY` | `PROVEN` |
| liveLinks     | ORM relationship                                               | moderation projection                                       | lazy one-to-many, cascade/orphan removal, JSON ignored | `PERSISTENCE_ONLY` | `PROVEN` |

The Python `Match` dataclass repeats all serialized match fields except `liveLinks`; `to_dict(asdict(...))` sends every
field, including id, derived status, active, and audit timestamps. Its response converter looks up exact snake_case
dataclass field names. The target adapter must map only approved command/response fields to camelCase without renaming
the Python domain fields.

### Match construction and transition risks

- Scraper identity is `(league_code, match_code)`, service uniqueness is `(match_code, league_code, season)`, and an
  unused repository lookup omits season. Cross-season cache/process behavior therefore needs fixture coverage.
- Scraper change merging considers matchDate/score/set, liveCode, pool/team IDs, venue, and referees. It does not compare
  season, leagueCode, or matchCode after choosing the cache key.
- A CSV set value such as `0/0` becomes non-null `0-0`, which marks a created or previously upcoming match FINISHED.
  LNV XML avoids assigning its own `0-0` sentinel, but CSV does not.
- A match with corrected/removed result remains FINISHED because update has no reverse transition or explicit state
  command. Event emission is exactly the first in-memory UPCOMING → non-null-set transition observed by this service.
- `parse_date` treats midnight (`00:00`) as UTC while every other time is interpreted in Europe/Paris then converted to
  UTC, creating a one/two-hour seasonal inconsistency for midnight fixtures.

## 6. Day, Detail, and Live Projection Fields

### Day and detail shapes

| Type / field                | Source                   | Proven consumer / purpose               | Classification | Status   |
| --------------------------- | ------------------------ | --------------------------------------- | -------------- | -------- |
| `DayPage.dayMatches`        | selected distinct dates  | Expo infinite list sections             | `REQUIRED`     | `PROVEN` |
| `DayPage.hasNext`           | `toIndex < allDays.size` | declared in Expo but hook uses nextPage | `DERIVED`      | `PROVEN` |
| `DayPage.nextPage`          | page+1 or null           | TanStack `getNextPageParam`             | `DERIVED`      | `PROVEN` |
| `DayMatches.date`           | Paris local date         | section header                          | `DERIVED`      | `PROVEN` |
| `DayMatches.pools`          | group by poolId          | BFF pool enrichment/list sections       | `DERIVED`      | `PROVEN` |
| `PoolMatches.poolId`        | Match.poolId             | BFF lookup/group key                    | `REQUIRED`     | `PROVEN` |
| `PoolMatches.matches`       | mapped rows              | BFF list projection                     | `REQUIRED`     | `PROVEN` |
| `MatchDTO` 15 base fields   | entity                   | BFF detail/list and PDF construction    | `REQUIRED`     | `PROVEN` |
| `MatchDTO.liveUrl`          | newest ACTIVE link       | Expo list badge/detail action           | `DERIVED`      | `PROVEN` |
| `MatchDTO.liveProvider`     | active link              | Expo detail provider label/icon         | `DERIVED`      | `PROVEN` |
| `MatchDTO.liveOwnerAuth0Id` | active link              | Expo edit/delete ownership              | `DERIVED`      | `PROVEN` |

`getMatchById` maps the same base fields as the day projection through a second manual builder. Neither response
contains `active`, createdAt, or lastUpdate. No stable ordering exists between matches with equal pool/date values.

### Live-link and report persistence fields

| Entity / field         | Producer               | Consumer / rule                        | Persistence / validation                                | Class              | Status   |
| ---------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------- | ------------------ | -------- |
| liveLink.id            | DB                     | history/moderation actions             | generated                                               | `REQUIRED`         | `PROVEN` |
| liveLink.match         | service                | relationship and all queries           | non-null FK, cascade delete from match                  | `PERSISTENCE_ONLY` | `PROVEN` |
| liveLink.ownerAuth0Id  | current `/me`          | owner/delete/update/moderation display | non-null, no user FK                                    | `REQUIRED`         | `PROVEN` |
| liveLink.provider      | derived from URL host  | labels/icons and no-op comparison      | non-null enum check                                     | `DERIVED`          | `PROVEN` |
| liveLink.url           | request                | playback/history/moderation            | non-null length 1024; URI/host check                    | `REQUIRED`         | `PROVEN` |
| liveLink.status        | policy/actions/reports | active selection/history/moderation    | six-value DB check                                      | `REQUIRED`         | `PROVEN` |
| liveLink.reportCount   | report recount         | moderation badge/threshold             | non-null int, denormalized                              | `DERIVED`          | `PROVEN` |
| liveLink.createdAt     | JPA/service            | version ordering, quota day, UI        | non-null timestamptz                                    | `REQUIRED`         | `PROVEN` |
| liveLink.lastUpdate    | JPA/service            | history UI                             | nullable timestamptz                                    | `REQUIRED`         | `PROVEN` |
| report.id              | DB                     | no external consumer                   | generated                                               | `PERSISTENCE_ONLY` | `PROVEN` |
| report.liveLink        | report service         | uniqueness/count/cascade               | non-null FK                                             | `PERSISTENCE_ONLY` | `PROVEN` |
| report.reporterAuth0Id | JWT subject            | one report per version                 | non-null; unique with live link                         | `REQUIRED`         | `PROVEN` |
| report.reason          | Expo form              | log/storage only                       | nullable length 512; backend has no length/content rule | `REQUIRED`         | `PROVEN` |
| report.createdAt       | JPA/service            | audit only                             | non-null timestamptz                                    | `PERSISTENCE_ONLY` | `PROVEN` |

### Live transport and summary fields

| Shape              | Fields                                                                                        | Proven purpose / discrepancy                                                             | Status   |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| request            | url                                                                                           | required by service; Expo only checks non-empty, service validates URI and provider host | `PROVEN` |
| response           | matchId, provider, url, status, reportCount, ownerAuth0Id                                     | Expo declares only first four; extra fields currently ignored                            | `PROVEN` |
| history            | id, matchId, provider, url, status, reportCount, ownerAuth0Id, createdAt, lastUpdate          | all except matchId are visibly used by moderation; matchId is context-duplicated         | `PROVEN` |
| report request     | reason                                                                                        | Expo enforces trimmed 10..500; backend permits null/blank and DB permits 512             | `PROVEN` |
| live summary match | id, matchCode, leagueCode, poolId, teamIdA/B, matchDate, season, set, score, status, liveCode | BFF discards matchCode/leagueCode after lookup context                                   | `PROVEN` |
| live summary link  | lastLiveLinkId/status/provider/url/ownerAuth0Id/createdAt                                     | moderation card/history navigation/actions                                               | `PROVEN` |

The service has 27 explicit `@JsonProperty` annotations across match/user DTOs in addition to global naming. The BFF
match DTO folder has 72 more. Most restate the global snake_case bridge and are not target design requirements.

## 7. Live-Link Policy, State, and Consistency

| Workflow          | Current behavior                                                             | Gap requiring parity/decision evidence                            | Status   |
| ----------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| user lookup       | forwarded GET `/me`; account must exist                                      | downstream outage becomes generic 500; copied broad user DTO      | `PROVEN` |
| provider          | URI host suffix allowlist for YouTube/Twitch/Facebook                        | scheme is not restricted to HTTP(S)                               | `PROVEN` |
| pro restriction   | all AALNV matches rejected, including moderators                             | comment suggests unresolved bypass policy                         | `PROVEN` |
| publish window    | non-moderator allowed from one hour before, with no upper bound for UPCOMING | client duplicates rule using device time                          | `PROVEN` |
| account age       | at least seven 24-hour periods                                               | application says days but uses Instant duration                   | `PROVEN` |
| quotas            | max 3 versions/match/owner and 3 distinct matches/Paris day                  | concurrent requests can pass counts                               | `PROVEN` |
| live update       | active owner or moderator; previous active becomes EXPIRED                   | no DB constraint guarantees one active link                       | `PROVEN` |
| post-match update | non-moderator link becomes PENDING                                           | existing ACTIVE is expired before approval, hiding valid replay   | `PROVEN` |
| delete            | active owner/moderator sets DEACTIVATED                                      | nonexistent active link is silent 204                             | `PROVEN` |
| report            | unique reporter/version; recount; ban at 3 live or 10 finished               | self-report/blank reason allowed; race can surface constraint 500 | `PROVEN` |
| approve           | PENDING → ACTIVE; newest active → EXPIRED                                    | only one discovered active is expired                             | `PROVEN` |
| reject            | PENDING → REJECTED                                                           | generic `IllegalStateException` maps to 400                       | `PROVEN` |
| reactivate        | rejected/expired/deactivated/banned → ACTIVE                                 | previous active becomes DEACTIVATED, unlike approval's EXPIRED    | `PROVEN` |
| representative    | priority ACTIVE→PENDING→BANNED→DEACTIVATED→REJECTED→EXPIRED, then newest     | differs from unused latest-link helper and endpoint wording       | `PROVEN` |

There is no partial unique index for one ACTIVE link per match, optimistic version, row lock, source revision, or
idempotency key. Check-then-write quota/report/state flows can race. `reportCount` duplicates the report table count and
casts a long count to int. Moderation/report state changes also update the parent match timestamp in some flows but not
others, so `Match.lastUpdate` has no single semantic meaning.

## 8. Scraper Transport and Cache Flow

| Stage           | Current behavior                                                    | Contract-first requirement                              | Status   |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| cache read      | GET raw matches by `pool_id`, exact snake_case dataclass conversion | camelCase adapter; retain Python snake_case model       | `PROVEN` |
| identity        | cache key leagueCode+matchCode                                      | reconcile service season-aware unique key               | `PROVEN` |
| CSV merge       | creates base match and compares selected field families             | golden fixtures before command-field reduction          | `PROVEN` |
| LNV XML         | overwrites date/result if meaningful                                | preserve priority and `0-0` sentinel behavior initially | `PROVEN` |
| LNV HTML        | adds liveCode by pool/team/date lookup                              | preserve lookup/time semantics initially                | `PROVEN` |
| create/update   | reflection serializes the entire dataclass                          | explicit generated or typed command adapter             | `PROVEN` |
| missing cleanup | computes absent active codes then PUTs `missing_match_codes`        | camelCase `missingMatchCodes`; validate semantics       | `PROVEN` |
| finalization    | sequential create/update loop; catches per match                    | define retry/idempotency/source revision later          | `PROVEN` |

The scraper may keep idiomatic snake_case fields. It must stop relying on reflection to make those names the wire
contract. Generated code, if selected by MRG-314, must remain isolated from parsing, priority, cache, and calculation
models.

## 9. BFF Aggregation and Projection Call Graph

| BFF workflow                 | Downstream sequence                                                                     | Fan-out / ordering                                                         | Missing-data behavior                                                               | Status   |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- |
| public match list            | one day-page call; each pool; each team; each club through logo enricher; each division | sequential O(pools+teams+clubs+divisions); service day/pool order retained | missing/inactive pool/division drops pool and matches; missing team may remain null | `PROVEN` |
| public match detail          | match; pool; division; pool associations; every team; every club; PDF tokens            | sequential fan-out; BFF sorts ranking                                      | missing match/pool/division/team fails whole view                                   | `PROVEN` |
| secure moderation list       | summaries; each pool; each division; each team; each club                               | sequential fan-out; service order retained then Expo re-sorts              | missing/inactive pool or missing team drops match                                   | `PROVEN` |
| secure live commands/history | one pass-through match call                                                             | no projection for commands/history                                         | downstream error propagated/translated generically                                  | `PROVEN` |

There is no batching, cache, timeout/fallback policy local to these workflows, concurrency, or declared partial-result
contract. The BFF constructs intentionally large detail views because the match screen needs team identity/logo, pool
and division styling, ranking, venue/referees, live ownership/provider, and signed PDF links. Those user-visible needs
justify a dedicated BFF projection, not reuse of the matches-service persistence entity.

### BFF projection field justification and drift

| Projection       | Fields retained                                                              | Fields absent, null, or discarded                                              | User-visible dependency                             | Status   |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | -------- |
| list match       | id, date, status, set, score, venue, referees, liveCode, teamA/B, liveUrl    | season never assigned; provider/owner/PDF/pool omitted at match level          | row time/score/live badge; parent owns pool styling | `PROVEN` |
| detail match     | list fields + provider, owner, enriched pool/ranking, two PDF URLs           | declared season never assigned; Expo-only liveOwnerUsername has no Java source | match cards, actions, ranking, PDFs                 | `PROVEN` |
| moderation match | id/date/season/set/score/status/liveCode, representative link, teamA/B, pool | raw matchCode/leagueCode discarded                                             | moderation search/card/history entry                | `PROVEN` |
| history          | copied live-link DTO                                                         | matchId duplicates route context                                               | moderation state/actions/audit                      | `PROVEN` |

`EnrichedMatchDTO.season` is never assigned in either list or detail builders and is unused by match screens, which use
`pool.season`. Expo additionally declares `liveOwnerUsername`, but no BFF field supplies it. The standalone BFF
`EnrichedMatchLiveLinkDTO` has no constructor or consumer. These are strong removal candidates, but remain deferred
until MRG-267 lineage and contract rollout evidence.

The detail ranking comparator duplicates competition workflows: points descending, pointsPenalty ascending, wins
descending, coefSets descending, coefPoints descending. Match detail also generates two short-lived signed PDF URLs
from season/leagueCode/matchCode, explaining why those raw identifiers are required inside the BFF even when they are
not exposed in the enriched match response.

## 10. Expo, TanStack, and Case Conversion

| Boundary           | Current behavior                                                                            | Target constraint                                       | Status   |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| HTTP               | handwritten `MatchApi` through global deep snake/camel Axios interceptors                   | Orval-generated mobile-local BFF client, camelCase wire | `PROVEN` |
| list query         | mobile-local `useInfiniteQuery`, stable sorted filter key, 5-minute stale time, retry false | keep TanStack ownership in Expo                         | `PROVEN` |
| detail query       | shared `useEntityById` key `enrichedMatches`                                                | generated transport may feed local query/view boundary  | `PROVEN` |
| moderation/history | mobile-local queries, staleTime 0                                                           | retain query ownership beside mobile workflow           | `PROVEN` |
| mutations          | forms call API directly; parent callbacks refetch/dismiss                                   | generate transport only; keep form/view state local     | `PROVEN` |
| validation         | Formik/Yup URL non-empty and report 10..500                                                 | backend/generated schema must express durable rules     | `PROVEN` |

TanStack Query is not a shared repository library for this single Expo application. Orval integration and generated
hooks/clients must remain mobile-owned. Generated DTOs and Zod schemas must not absorb React Native components,
Formik/Yup form state, navigation, haptics, bottom sheets, or display formatting.

Expo type drift includes required strings for values that can be absent, response fields omitted from interfaces
(`reportCount`, `ownerAuth0Id`), `liveProvider` typed as generic string in one view, and `liveOwnerUsername` with no
producer. Current deep conversion masks wire ownership and must be removed only after every active BFF call is on the
canonical camelCase contract.

## 11. Construction, Conversion, and Duplicate Inventory

| ID      | Source → target                   | Mechanism                         | Debt / field loss                     | Provisional target                          | Status   |
| ------- | --------------------------------- | --------------------------------- | ------------------------------------- | ------------------------------------------- | -------- |
| `M-C01` | HTTP body → Match entity          | direct Jackson/JPA entity         | accepts persistence/derived fields    | generated request → command → entity mapper | `PROVEN` |
| `M-C02` | Match entity → raw REST           | direct Jackson                    | exposes active/audit persistence      | generated response mapper                   | `PROVEN` |
| `M-C03` | Match → MatchDTO                  | two manual builders               | duplicated base mapping               | one explicit projector/mapper               | `PROVEN` |
| `M-C04` | matches → day page                | repository + nested builders      | pagination, grouping, live join mixed | application read model/projector            | `PROVEN` |
| `M-C05` | live entity → history/response    | two manual builders               | overlapping shapes and fields         | role-owned API mappers                      | `PROVEN` |
| `M-C06` | live history → summary            | priority selector + builder       | filter/representative semantics mixed | moderation policy/projector                 | `PROVEN` |
| `M-C07` | match → events                    | copied Lombok builders            | unversioned duplicated events         | generated versioned event adapter           | `PROVEN` |
| `M-C08` | users REST → copied DTO           | RestTemplate + casing/annotations | broad downstream type                 | generated users client projection           | `PROVEN` |
| `M-C09` | Python Match ↔ JSON              | `asdict` and exact-key converter  | reflection snake_case coupling        | explicit camelCase scraper adapter          | `PROVEN` |
| `M-C10` | matches-service → copied BFF DTOs | generic client + 72 annotations   | 15-file duplicate family              | generated internal client                   | `PROVEN` |
| `M-C11` | raw DTOs → BFF views              | large manual builders             | fan-out and policies embedded         | workflow projectors/API mappers             | `PROVEN` |
| `M-C12` | BFF JSON ↔ Expo                  | deep Axios case transforms        | implicit whole-app conversion         | Orval mobile-local client                   | `PROVEN` |

Shared enums (`MatchStatus`, `LiveProvider`, `LiveLinkStatus`) are repeated across matches-service, mobile-gateway, Expo,
and sometimes persistence checks. Object DTOs should remain boundary-local by default even when generated from shared
schema fragments; BFF view shapes are not matches-service DTOs.

## 12. Validation, Errors, and Test Evidence

| Area                  | Current evidence                                       | Missing parity evidence                                                    | Status    |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | --------- |
| match create/update   | DB null/check/unique constraints and status derivation | request validation, identity, transition, correction, concurrency fixtures | `PROVEN`  |
| day pagination        | repository source only                                 | page/size bounds, inactive-only days, timezone/DST, equal-date ordering    | `PROVEN`  |
| scraper               | no test files                                          | FFVB/LNV golden create/update/reactivate/deactivate and midnight fixtures  | `PROVEN`  |
| live URL/policy       | manual service checks                                  | scheme/host edge cases, account age, quotas, pro/moderator matrix          | `PROVEN`  |
| live state            | repository/service source only                         | concurrent active links, state transition matrix, old-active visibility    | `PROVEN`  |
| reports               | DB unique + service count                              | duplicate race, self-report, reason/null/length, threshold transitions     | `PROVEN`  |
| events                | copied listeners/config                                | serialized casing, transaction rollback, retry/DLQ, duplicates/order       | `UNKNOWN` |
| cascades              | queues/bindings only                                   | intended historical/future deactivation and reactivation semantics         | `UNKNOWN` |
| BFF                   | manual source                                          | fan-out, partial failure, missing dependencies, exact projection fields    | `PROVEN`  |
| Expo                  | runtime types/forms/hooks only                         | generated-client/Zod/query/mutation UI parity                              | `PROVEN`  |
| matches-service tests | one `contextLoads`                                     | no controller/service/repository/policy/event/mapper behavior              | `PROVEN`  |

The exception handler maps access denied to 403, authentication to 401, match absence to 404, illegal state/argument
to 400, and everything else to a generic 500 map. No Bean Validation is applied to request DTOs or controller bodies.
Database constraint failures, RestTemplate failures, race conflicts, malformed enum/query inputs, and unexpected nulls
therefore lack stable contract-specific errors.

## 13. Findings and Provisional Target Roles

| ID          | Finding / risk                                                                                          | Follow-up                                   | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| `MATCH-F01` | mutable Match JPA entity is also create/update input and raw response                                   | MRG-268/MRG-407 split roles                 | `PROVEN` |
| `MATCH-F02` | 16 Spring-derived operations have no source operation IDs or authoritative contract                     | MRG-301/322                                 | `PROVEN` |
| `MATCH-F03` | global snake_case, 99 local/BFF annotations, scraper reflection, and Expo transforms obscure ownership  | MRG-303/304/351-354                         | `PROVEN` |
| `MATCH-F04` | three declared deactivation queues have no listeners, so competition cascades do not affect matches     | product/data decision before implementation | `PROVEN` |
| `MATCH-F05` | set-nullness drives one-way finish state and can classify CSV `0-0` as FINISHED                         | fixture-backed transition policy            | `PROVEN` |
| `MATCH-F06` | finish and live events publish inside DB transactions without outbox/version/idempotency                | MRG-315/350                                 | `PROVEN` |
| `MATCH-F07` | date discovery ignores active, pagination is unvalidated, and timezone semantics are split              | day-page parity suite                       | `PROVEN` |
| `MATCH-F08` | no DB invariant prevents concurrent multiple ACTIVE live links                                          | live state redesign/parity                  | `PROVEN` |
| `MATCH-F09` | post-match pending submission expires the visible active link before approval                           | explicit product compatibility decision     | `PROVEN` |
| `MATCH-F10` | moderation status filter and representative selection can describe different links                      | canonical filter/projection semantics       | `PROVEN` |
| `MATCH-F11` | endpoint documentation claims a time window that code does not implement                                | contract description correction             | `PROVEN` |
| `MATCH-F12` | BFF has an unused client for a nonexistent pending endpoint                                             | lineage then retire                         | `PROVEN` |
| `MATCH-F13` | list/detail/moderation aggregations are sequential high fan-out with inconsistent missing-data behavior | MRG-266/416                                 | `PROVEN` |
| `MATCH-F14` | BFF/Expo drift includes unwritten season, nonexistent liveOwnerUsername, and unused enriched live type  | MRG-267/327/346                             | `PROVEN` |
| `MATCH-F15` | scraper midnight conversion differs from all other match times                                          | golden fixture and correction rollout       | `PROVEN` |
| `MATCH-F16` | backend report validation is weaker than Expo and reports can race/self-report                          | canonical durable validation                | `PROVEN` |
| `MATCH-F17` | only a context smoke test protects the service; scraper has no tests                                    | MRG-307/355/419/421                         | `PROVEN` |

| Current family    | Provisional target role                                                          | Preconditions / decision owner               |
| ----------------- | -------------------------------------------------------------------------------- | -------------------------------------------- |
| Match entity      | JPA entity behind generated requests/responses and application commands/views    | MRG-268, Flyway preservation                 |
| day page          | explicit application read model/projector mapped to generated API                | query parity and ownership decision          |
| live state        | application policy plus JPA entities and API views                               | state/concurrency/product decisions          |
| moderation/report | explicit commands, policy, projection, and API mappers                           | filter/representative/validation parity      |
| incoming cascades | versioned event consumers or deliberately removed topology                       | historical/future behavior and data evidence |
| outgoing events   | versioned payload adapter plus approved delivery pattern                         | MRG-315/350                                  |
| BFF copies        | generated matches client mapped immediately into workflow views                  | MRG-322/338/413/416                          |
| Python match      | snake_case scraper domain plus explicit camelCase transport                      | MRG-314/330/349 and fixtures                 |
| Expo              | Orval client/Zod schemas with mobile-local TanStack queries and view/form models | MRG-313/328/346                              |

## 14. Unknowns

| Unknown                                                     | Required evidence                              | Blocking                                    |
| ----------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| intended cascade effect on historical versus future matches | product history, production data, event intent | listeners/removal                           |
| live rows with multiple ACTIVE states                       | safe DB inventory                              | unique constraint/state migration           |
| current pending submission visibility expectation           | product decision and usage evidence            | live state cleanup                          |
| external callers of raw list/create/update/test endpoints   | access logs and client inventory               | DTO field reduction/test endpoint isolation |
| production pagination with inactive-only days               | database query and user reports                | query correction rollout                    |
| exact Rabbit payload casing and duplicate/routing behavior  | safe message capture and broker metrics        | generated event cutover                     |
| federation meanings for set/score/midnight/corrections      | representative FFVB/LNV fixtures               | transition validation                       |
| active mobile versions relying on snake_case/error quirks   | version support matrix/telemetry               | compatibility removal                       |
| whether moderator should bypass AALNV restriction           | product/legal decision                         | policy contract                             |

## 15. Completion and Handoff

- [x] All 16 REST operations, auth rules, inputs, outputs, errors, callers, and casing bridges are inventoried.
- [x] All Match, day/page, live-link, report, live summary, event, scraper, BFF, and Expo field families are traced.
- [x] Match construction, result transitions, reactivation, cleanup, date pagination, and scraper priority are explicit.
- [x] Live-link quotas, ownership, state transitions, reporting, moderation filtering, and concurrency gaps are explicit.
- [x] The three unconsumed deactivation routes and both notification event routes are reconciled with prior audits.
- [x] BFF fan-out, large projection reasons, partial-failure differences, duplicate types, and unused drift are explicit.
- [x] Canonical camelCase, Python snake_case adapter, generated clients, mobile-local Orval/TanStack ownership, and
      annotation/conversion removal dependencies are explicit.
- [x] Validation, parity tests, unknowns, provisional roles, and downstream task owners are explicit.
- [x] No runtime, source contract, generated artifact, schema, migration, test, configuration, or deployment file changed.

MRG-258 through MRG-266 must complete adjacent user, notification, worker, BFF, and aggregation evidence. MRG-267/268
must resolve duplicate type ownership, match/live state boundaries, cascade intent, delivery guarantees, and mapper
roles. MRG-301/303/304/315/322 must define the authoritative camelCase REST/event contracts and compatibility order.
MRG-338/346/349/350/407/416 must execute service, Expo, scraper, event, and architecture migrations with behavioral
parity. TanStack and Orval remain owned by `apps/frontend/mobile`; no shared TanStack library is introduced. Production
deployment did not occur.
