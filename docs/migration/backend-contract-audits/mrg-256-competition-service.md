# MRG-256 — competition-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `51571024d449e2f8c73907284794274c7250da70`
- Scope roots: `apps/backend/competition-service`, association-facing competition scraper code, ranking/cascade slices
  of `mobile-gateway`, `pools-service`, `teams-service`, `clubs-service`, `matches-service`, `search-worker`, and Expo
- Audited deployable or workflow: competition-service association ownership and all proven monorepo consumers
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no production traffic, database, Rabbit messages, Auth0
  grants, deployed schemas, or league rulebook was observed

## Scope

This audit covers all competition REST operations, every association/statistics field, persistence, add/reactivate,
bulk cleanup, lifecycle cascade, ranking construction, scraper computation and BFF projections. Match lifecycle details
remain assigned to MRG-257, but matches-service topology is included where competition events claim to affect it.

Evidence statuses and classifications follow `backend-contract-data-audit-template.md`. Current behavior is evidence,
not target authority. Canonical target Blockout wire names are camelCase; Python identifiers may remain snake_case
behind explicit adapters. Target ownership remains provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary             | Owner / entry                         | Producers                           | Consumers / effects                                 | Auth                                                    | Status   |
| -------------------- | ------------------------------------- | ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | -------- |
| association REST     | competition-service, eight operations | competition scraper, BFF            | PostgreSQL and lifecycle events                     | authenticated globally; writes add create/update/delete | `PROVEN` |
| association storage  | one JPA entity/table                  | add/reactivate, stats, bulk cleanup | rankings, scraper cache, BFF                        | internal                                                | `PROVEN` |
| statistics transport | 17-field replacement request          | competition scraper                 | association row and rankings                        | `update:competitions`                                   | `PROVEN` |
| cascade publisher    | competition-service                   | three bulk cleanup paths            | pools, teams, clubs, search, claimed matches queues | broker credentials                                      | `PROVEN` |
| ranking projection   | competition-service plus BFF          | active associations                 | team, pool, and match screens                       | authenticated downstream                                | `PROVEN` |
| scraper calculation  | competition scraper                   | FFVB CSV and LNV XML ranking        | association stats replacement                       | Auth0 M2M                                               | `PROVEN` |

## 2. REST Operation Inventory

Springdoc summaries exist, but no operation has an explicit source-contract `operationId`.

| Method and path                             | Controller                  | Auth                               | Request                         | Success                      | Caller               | Status   |
| ------------------------------------------- | --------------------------- | ---------------------------------- | ------------------------------- | ---------------------------- | -------------------- | -------- |
| POST `/pools/{poolId}/teams/{teamId}`       | `addTeamToPool`             | create **and** update competitions | `club_id` query                 | 200 direct entity            | competition scraper  | `PROVEN` |
| GET `/pools/{poolId}/teams`                 | `listPoolTeams`             | authenticated only                 | pool ID                         | 200 active entity list       | scraper, BFF         | `PROVEN` |
| GET `/teams/{teamId}/pools`                 | `listAssociationsByTeam`    | authenticated only                 | team ID                         | 200 active entity list       | no active BFF caller | `PROVEN` |
| PUT `/pools/{poolId}/teams/bulk-deactivate` | `bulkDeactivateTeams`       | delete competitions                | `missing_team_ids` JSON         | 200 empty                    | competition scraper  | `PROVEN` |
| PUT `/pools/bulk-deactivate`                | `bulkDeactivatePools`       | delete competitions                | `missing_pool_ids` JSON         | 200 empty                    | competition scraper  | `PROVEN` |
| PUT `/clubs/bulk-deactivate`                | `bulkDeactivateClubs`       | delete competitions                | `missing_club_ids` JSON         | 200 empty                    | club scraper         | `PROVEN` |
| PUT `/pools/{poolId}/teams/{teamId}/stats`  | `updateStats`               | update competitions                | 17-field statistics replacement | 200 direct entity; 404       | competition scraper  | `PROVEN` |
| GET `/teams/{teamId}/pools-with-ranking`    | `getPoolsAndRankingsByTeam` | authenticated only                 | team ID                         | 200 pool/ranking projections | BFF team profile     | `PROVEN` |

The OpenAPI annotations advertise 204 for empty read results, but both reads always return 200 with an empty list.
Bulk DTO comments say IDs are “still present,” while property names, scraper payloads, and repository queries treat
them as IDs to deactivate. Null bulk lists cause `HashSet` construction failures and generic 500 responses.

## 3. Operation Semantics and Ownership

- Add/reactivate looks up the unique `(poolId, teamId)` association. New rows initialize all stats to zero. Existing
  active rows are returned unchanged; inactive rows are reactivated without resetting stats or updating `clubId`.
- Neither add nor any read verifies that pool, team, or club exists or is active. There are no cross-service foreign
  keys; IDs and club ownership are accepted on trust.
- Stats update replaces all 17 values, even when request fields are null. The database rejects nulls later; negative,
  contradictory, or extreme values have no application validation.
- Active reads have no explicit order. The team ranking endpoint groups through hash-based collections and returns
  unsorted pools and unsorted ranking entries; the BFF performs user-visible sorting.
- All successful add/stats/read operations expose either the JPA entity or copied handwritten projections in current
  snake_case. No mapper separates persistence, commands, and transport.
- Unused code includes repository reads without active filtering, plus the BFF's `getAssociationsByTeam` client.

## 4. Association Entity and Statistics Field Matrix

| Field             | Current wire           | Producer / update source    | Consumers / calculation                       | DB/default               | Class              | Status   |
| ----------------- | ---------------------- | --------------------------- | --------------------------------------------- | ------------------------ | ------------------ | -------- |
| id                | `id`                   | DB identity                 | direct responses only                         | generated                | `PERSISTENCE_ONLY` | `PROVEN` |
| poolId            | `pool_id`              | path on add                 | unique key, pool reads, ranking, cascades     | non-null, no FK          | `REQUIRED`         | `PROVEN` |
| teamId            | `team_id`              | path on add                 | unique key, team reads, ranking, cascades     | non-null, no FK          | `REQUIRED`         | `PROVEN` |
| clubId            | `club_id`              | query on first add only     | club bulk cleanup/cascade                     | non-null, no FK          | `REQUIRED`         | `PROVEN` |
| active            | `active`               | add/reactivate/bulk cleanup | active reads and cascade existence checks     | non-null, default true   | `REQUIRED`         | `PROVEN` |
| points            | `points`               | CSV/LNV stats               | primary ranking key                           | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| played            | `played`               | CSV/LNV stats               | ranking display                               | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| wins              | `wins`                 | CSV/LNV stats               | third ranking key/display                     | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| losses            | `losses`               | CSV/LNV stats               | ranking display                               | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| winsThreeToZero   | `wins_three_to_zero`   | CSV/LNV stats               | stored/audit only in current UI               | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| winsThreeToOne    | `wins_three_to_one`    | CSV/LNV stats               | stored/audit only                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| winsThreeToTwo    | `wins_three_to_two`    | CSV/LNV stats               | stored/audit only                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| lossesZeroToThree | `losses_zero_to_three` | CSV/LNV stats               | stored/audit only                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| lossesOneToThree  | `losses_one_to_three`  | CSV/LNV stats               | stored/audit only                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| lossesTwoToThree  | `losses_two_to_three`  | CSV/LNV stats               | stored/audit only                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| wonSets           | `won_sets`             | detailed score/LNV ranking  | coefficient input; not in reduced ranking DTO | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| lostSets          | `lost_sets`            | detailed score/LNV ranking  | coefficient denominator                       | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| wonPoints         | `won_points`           | detailed score/LNV ranking  | coefficient input                             | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| lostPoints        | `lost_points`          | detailed score/LNV ranking  | coefficient denominator                       | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| pointsPenalty     | `points_penalty`       | scraper                     | second ranking key                            | non-null, default 0      | `REQUIRED`         | `PROVEN` |
| coefSets          | `coef_sets`            | scraper finalization        | fourth ranking key                            | non-null, default 0.0    | `DERIVED`          | `PROVEN` |
| coefPoints        | `coef_points`          | scraper finalization        | fifth ranking key                             | non-null, default 0.0    | `DERIVED`          | `PROVEN` |
| createdAt         | `created_at`           | JPA callback                | copied DTOs only                              | nullable local timestamp | `PERSISTENCE_ONLY` | `PROVEN` |
| lastUpdate        | `last_update`          | JPA callback                | copied DTOs/change logs                       | nullable local timestamp | `PERSISTENCE_ONLY` | `PROVEN` |

`TeamAssociationStatsRequestDTO` repeats the 17 statistics fields as nullable Java wrappers, but service code treats
all of them as a required full replacement. `TeamRankingDTO` reduces the row to teamId, points, pointsPenalty, played,
wins, losses, coefSets, and coefPoints. The BFF copies that reduced type and then builds its own team view.

## 5. Persistence and Consistency

| Boundary             | Current invariant                        | Gap                                                                  | Status   |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------- | -------- |
| association identity | unique poolId + teamId                   | no pool/team FK or service existence check                           | `PROVEN` |
| club ownership       | clubId captured only on initial insert   | reactivation/add never corrects a moved or stale club                | `PROVEN` |
| statistics           | all columns non-null                     | no nonnegative, arithmetic, played/win/loss, or ratio constraints    | `PROVEN` |
| timestamps           | JVM-local `LocalDateTime` callbacks      | no timezone; no externally meaningful version                        | `PROVEN` |
| concurrency          | read/mutate/save transactions            | no optimistic version, row lock, idempotency key, or source revision | `PROVEN` |
| cross-system commit  | DB writes plus Rabbit inside transaction | no outbox; broker and DB cannot commit atomically                    | `PROVEN` |

Reactivation preserves historical statistics. That may be a compatibility requirement, but no rule or test establishes
whether a new season/source reappearance should preserve or reset values. Concurrent scraper runs can overwrite newer
full-stat snapshots without detection.

## 6. Bulk Deactivation and Event Cascade

| Trigger                   | Rows deactivated                     | Events attempted                                                | Proven consumers / gap                                | Status   |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------- | -------- |
| missing teams in one pool | active matching pool/team rows       | `teambypool.deactivation`; possibly pool/team/club deactivation | matches queue exists but has no listener              | `PROVEN` |
| missing pools             | all active rows in listed pools      | pool; possibly team and club deactivation                       | early return emits nothing for zero-association pools | `PROVEN` |
| missing clubs             | all active rows with listed club IDs | possibly pool, team, and club deactivation                      | early return emits nothing for zero-association clubs | `PROVEN` |

- Pool/team/club events are published only when no active association remains for that identity. Pool, team, club, and
  search services consume relevant routes.
- Matches-service declares durable queues for pool, team, and team-by-pool deactivation but contains no
  `@RabbitListener`; all three match cleanup routes are presently unconsumed there.
- `teambypool.deactivation` has no other monorepo consumer, so every such event currently has no runtime effect beyond
  broker retention.
- Repository helpers named `findDistinct...ByActiveTrue...` omit `active=true` in their explicit JPQL. The team helper
  branch is effectively unreachable with current early returns; the club helper can include club IDs from inactive or
  stale associations.
- `addOrReactivateAssociation` never updates `clubId`, so club cascade truth can remain tied to a team's former club.
- Events are emitted within the database transaction without versioning, ordering, idempotency, retry policy, or
  outbox. Exact wire casing remains `UNKNOWN` until captured.

## 7. Scraper Calculation and Transport

| Stage                      | Current behavior                                                      | Risk / parity requirement                                        | Status   |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| active cache load          | service entities converted to original stats; updated starts at zero  | current scrape replaces rather than increments historical totals | `PROVEN` |
| CSV match aggregation      | per-match stats accumulated into updated snapshot                     | two-set results reuse three-set field names                      | `PROVEN` |
| LNV XML ranking            | source totals replace updated snapshot                                | source ratios assigned, then ignored/recomputed later            | `PROVEN` |
| coefficient finalization   | won/lost ratio rounded to 3 decimals; denominator zero becomes 1000.0 | undocumented sentinel affects sorting and generated schema       | `PROVEN` |
| changed-snapshot detection | dataclass equality compares every stat                                | float/source rounding changes can trigger writes                 | `PROVEN` |
| async flush                | all PUT coroutines sent with one `asyncio.gather`                     | one failure aborts gather; append-time try does not catch I/O    | `PROVEN` |

`parse_team_score` returns a `ValueError` object for non-numeric values instead of raising it or returning `None`, while
the caller comments and branches expect `None`. Legacy `F`/`P` scores can therefore fail later comparisons with a type
error. Invalid detailed sets are silently skipped, ties are ignored, and the aggregate still marks the match played.

`schedule_association_replace` copies all raw totals except `coefSets`/`coefPoints`; finalization recomputes them, so
LNV `RatioSet` and `RatioPoints` are not authoritative. It also assigns `pointsPenalty` and immediately overwrites it
with `abs(team_stats.points - updated.points)`, which is always zero after assigning the same points value.

Python association and stats identifiers remain snake_case. The target adapter must emit camelCase explicitly without
changing these calculation semantics until separately approved and covered by fixture-based parity tests.

## 8. Ranking and BFF Projection Call Graph

| Workflow     | Competition output                         | BFF enrichment                                  | Ordering / loss                                              | Status   |
| ------------ | ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------ | -------- |
| pool profile | full active association rows               | each team, each club, one division              | BFF sorts and retains coordinates                            | `PROVEN` |
| match detail | full active association rows               | teams/clubs plus pool/division/match            | same copied comparator; coordinates omitted from ranking     | `PROVEN` |
| team profile | poolId plus reduced ranking for every pool | each team, club, pool; one team division reused | same copied comparator; service pool/ranking order arbitrary | `PROVEN` |

The user-visible comparator is duplicated three times: points descending, pointsPenalty ascending, wins descending,
coefSets descending, then coefPoints descending. Competition-service calls its unsorted list “ranking,” so a generated
contract must not accidentally promise service-side order before ownership is decided. BFF enrichment performs
O(teams + clubs + pools) calls and fails whole views when required pool/team/division data is missing.

The BFF full association DTO copies all 24 entity fields with 18 explicit `@JsonProperty` annotations. Reduced ranking
DTOs are duplicated between competition-service and BFF. Expo's unused `CompetitionAssociation` interface omits
`clubId`; actual screens consume BFF `TeamWithStats` projections instead.

## 9. Construction, Conversion, and Duplicate Inventory

| ID      | Source → target                     | Mechanism                    | Loss / duplication                                       | Provisional target                        | Status   |
| ------- | ----------------------------------- | ---------------------------- | -------------------------------------------------------- | ----------------------------------------- | -------- |
| `C-C01` | path/query → association create     | manual entity builder        | trust-only cross-service IDs; server defaults mixed      | create command + entity mapper            | `PROVEN` |
| `C-C02` | stats JSON → entity                 | 17 direct setter calls       | nullable request overwrites non-null storage             | validated generated request + mapper      | `PROVEN` |
| `C-C03` | entity → REST                       | direct Jackson serialization | persistence and audit fields exposed                     | response DTO + mapper                     | `PROVEN` |
| `C-C04` | entity → reduced ranking            | manual builder               | 9 identity/statistics fields discarded                   | explicit ranking projection               | `PROVEN` |
| `C-C05` | bulk DTO → repository/event cascade | lists → sets + manual loops  | comments contradict payload semantics                    | validated commands                        | `PROVEN` |
| `C-C06` | cascade IDs → four event families   | copied handwritten events    | unversioned casing/topology; no outbox                   | generated versioned event contracts       | `PROVEN` |
| `C-C07` | service → BFF DTOs                  | copied classes/annotations   | full and reduced duplicates                              | generated downstream client               | `PROVEN` |
| `C-C08` | association/ranking → user views    | three BFF builders/sorters   | duplicated ordering and inconsistent derived coordinates | BFF projection mapper/policy              | `PROVEN` |
| `C-C09` | Python dataclasses → JSON           | reflection/asdict            | exact snake_case coupling                                | explicit camelCase transport adapter      | `PROVEN` |
| `C-C10` | BFF → Expo                          | deep case interceptor        | handwritten unused and user-view types                   | Orval mobile-local client and view models | `PROVEN` |

## 10. Validation, Errors, and Tests

| Area                          | Current evidence         | Missing parity evidence                                               | Status    |
| ----------------------------- | ------------------------ | --------------------------------------------------------------------- | --------- |
| identity/referential validity | unique key only          | pool/team/club existence, active state, moved-club cases              | `PROVEN`  |
| statistics invariants         | DB non-null only         | null, negative, inconsistent totals, ratio, overflow cases            | `PROVEN`  |
| add/reactivate                | source only              | duplicate, stale club, preserved/reset stats, concurrent add          | `PROVEN`  |
| bulk commands                 | source only              | null/empty/duplicate/zero-association and partial-cascade matrix      | `PROVEN`  |
| events                        | source only              | casing, routing, consumer, retry, transaction and idempotency tests   | `UNKNOWN` |
| scraper calculations          | source only              | FFVB/LNV golden fixtures, F/P, malformed/tied sets, zero denominators | `PROVEN`  |
| ranking                       | three copied comparators | deterministic tie/order and missing-data tests                        | `PROVEN`  |
| service tests                 | one context smoke test   | no endpoint, repository, service, event, or calculation behavior      | `PROVEN`  |

## 11. Findings and Provisional Target Roles

| ID         | Finding / risk                                                                                | Follow-up                                    | Status   |
| ---------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- |
| `COMP-F01` | one mutable entity is persistence model and full REST response                                | split DTO/application/entity at MRG-268      | `PROVEN` |
| `COMP-F02` | stats request has 17 nullable fields but service performs an unvalidated full replacement     | canonical invariants and generated request   | `PROVEN` |
| `COMP-F03` | reactivation retains stats and stale `clubId` without an explicit policy                      | ownership/reactivation decision              | `PROVEN` |
| `COMP-F04` | zero-association bulk paths return before publishing required entity deactivation             | cascade correction plan                      | `PROVEN` |
| `COMP-F05` | matches-service declares three deactivation queues but consumes none                          | MRG-257 topology and behavior audit          | `PROVEN` |
| `COMP-F06` | active-named repository helpers omit active predicates                                        | repository correction/parity tests           | `PROVEN` |
| `COMP-F07` | broker publication inside DB transactions has no outbox/version/idempotency                   | event ownership at MRG-268                   | `PROVEN` |
| `COMP-F08` | service ranking is unordered while BFF duplicates one comparator three times                  | single ranking policy and projection owner   | `PROVEN` |
| `COMP-F09` | scraper returns `ValueError` as a value for legacy scores                                     | calculation fixture and error policy         | `PROVEN` |
| `COMP-F10` | scraper ignores LNV ratio fields, forces zero penalty, and uses undocumented ratio sentinels  | golden-fixture parity before cleanup         | `PROVEN` |
| `COMP-F11` | BFF copies full/reduced DTOs and annotations, then Expo relies on different handwritten views | generated clients plus explicit BFF mappings | `PROVEN` |
| `COMP-F12` | global snake casing and Python/Expo transforms obscure ownership across every boundary        | MRG-303/304 camelCase cutover                | `PROVEN` |
| `COMP-F13` | bulk request documentation contradicts actual “missing IDs” behavior                          | contract descriptions and validation         | `PROVEN` |
| `COMP-F14` | no focused test protects ranking, stats, cascade, scraper, or generated-contract parity       | MRG-306/307 parity suite                     | `PROVEN` |

| Current family          | Provisional target role                                                        | Decision owner / prerequisite |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| association entity      | JPA entity behind generated create/response DTOs and application commands      | MRG-268                       |
| statistics update       | validated full snapshot or explicit patch with source revision                 | MRG-268 plus scraper fixtures |
| ranking                 | one explicit ranking projection and one ordering policy                        | MRG-265/268                   |
| bulk lifecycle commands | validated generated commands with explicit missing-ID semantics                | MRG-268                       |
| lifecycle events        | versioned generated payloads with proven consumers/outbox policy               | MRG-257/262/268               |
| BFF copies/views        | generated competition client plus context-specific projection mappers          | MRG-265/266                   |
| Python                  | snake_case calculation models plus explicit camelCase generated adapter        | MRG-304 and golden fixtures   |
| Expo                    | Orval client with mobile-local TanStack queries; UI ranking view remains local | MRG-305/306                   |

## 12. Unknowns

| Unknown                                       | Required evidence                        | Blocking                           |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------- |
| official ranking/penalty/ratio rules          | league rulebook and product approval     | validation and canonical algorithm |
| live null/negative/inconsistent stats         | safe DB inventory                        | schema hardening                   |
| stale association club IDs                    | team/club/association comparison         | club cascade correction            |
| duplicate/concurrent scraper execution        | scheduler/deployment topology and logs   | snapshot versioning/idempotency    |
| Rabbit payload casing and queue depth         | safe capture/broker metrics              | event generation/topology cleanup  |
| intended matches deactivation behavior        | product/history plus match data analysis | listener implementation/removal    |
| external callers of raw association endpoints | access logs/client inventory             | DTO field removal                  |
| active clients relying on current tie order   | telemetry/version support matrix         | service-side sorting               |

## 13. Completion and Handoff

- [x] All eight operations, 24 entity fields, 17 stats inputs, bulk commands, persistence rules, and response
      projections are inventoried.
- [x] Scraper, BFF, Expo, pool, team, club, matches, and search lifecycle lineage is explicit.
- [x] Ranking computation, ordering, projection loss, and BFF duplication are documented.
- [x] Empty-association cascades, stale club ownership, unconsumed match queues, and event transaction gaps are explicit.
- [x] Current snake_case, target camelCase, annotations/interceptors, and Python adapter requirements are explicit.
- [x] Validation, calculation fixtures, tests, unknowns, and downstream task owners are explicit.
- [x] No runtime, contract, generated artifact, schema, migration, test, or deployment file changed.

MRG-257 must decide the claimed matches-service deactivation behavior. MRG-262 must reconcile search lifecycle events.
MRG-265/266 must consolidate ranking/fan-out projections. MRG-267/268 must merge duplicate association/ranking/event
types and approve persistence, commands, validation, ranking, cascade, mapper, and outbox ownership. MRG-301/303/304
must capture all operations and stage camelCase across Java, BFF, Expo, Python, and Rabbit. Production deployment did
not occur.
