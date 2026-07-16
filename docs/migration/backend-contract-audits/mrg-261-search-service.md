# MRG-261 — search-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `e84a9bd8f1e6f3bd7f6ad0d966230fba82beea3d`
- Scope roots: `apps/backend/search-service`, the search facade and client slice of
  `apps/backend/mobile-gateway`, the search transport/query/view slice of `apps/frontend/mobile`, and the Elasticsearch
  document and mapping ownership required from `apps/backend/search-worker`
- Audited deployable or workflow: club, team, and pool autocomplete through Elasticsearch, the public mobile gateway,
  and the Expo search screen
- Runtime mutation: none
- Evidence limitations: committed source and configuration only; no production Elasticsearch mappings, documents,
  scores, shard topology, partial-response settings, query latency, access logs, Auth0 M2M claims, deployed mobile
  versions, reverse-proxy rate limits, or standalone-repository telemetry was observed

## Scope

This audit covers all three search-service REST operations, all three mutable search DTOs, all Elasticsearch query and
source-filter fields, authentication and configuration, the three copied BFF DTOs and public pass-through operations,
the three Expo API methods and TanStack queries, search filters, cards, empty/error states, and the search-worker
document/mapping evidence needed to establish Elasticsearch ownership.

Search-service has 13 production Java files, three controllers, three services, three DTOs, no entity, repository,
mapper, event listener, publisher, or scheduled job, and one context-load test. Detailed search-worker bootstrap,
events, caches, schedulers, and write recovery are reserved for MRG-262; this audit reads only its index documents,
mappings, repositories, and index writers where they prove the store fields consumed by search-service.

Current Springdoc annotations, mutable DTOs reused as Elasticsearch source projections and REST responses, global
Jackson `SNAKE_CASE`, copied BFF classes, and mobile case transforms are implementation evidence, not target contract
authority. Blockout REST fields and query parameters target camelCase. Elasticsearch storage field names are a
separate persistence concern and are already camelCase. Target roles remain provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary                   | Current owner / entry                                     | Producer                            | Consumer / effect                         | Auth / data owner                              | Evidence                            | Status   |
| -------------------------- | --------------------------------------------------------- | ----------------------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------- | -------- |
| internal club search       | search-service `GET /api/v1/search/clubs`                 | BFF or another authenticated caller | `clubs` index read                        | any valid JWT; search-worker owns index writes | club controller/service             | `PROVEN` |
| internal team search       | search-service `GET /api/v1/search/teams`                 | BFF or another authenticated caller | `teams` index read                        | any valid JWT; search-worker owns index writes | team controller/service             | `PROVEN` |
| internal pool search       | search-service `GET /api/v1/search/pools`                 | BFF or another authenticated caller | `pools` index read                        | any valid JWT; search-worker owns index writes | pool controller/service             | `PROVEN` |
| public BFF search          | mobile-gateway `/api/v1/mobile/public/search/**`          | Expo public HTTP client             | one internal search request per operation | public inbound; BFF M2M outbound               | search BFF controller/client        | `PROVEN` |
| Elasticsearch query        | search-service Java client                                | query/filter inputs                 | fixed-size source projections             | Elasticsearch basic auth; shared store         | search services/config              | `PROVEN` |
| Elasticsearch schema/write | search-worker document repositories and index initializer | domain APIs/events/caches           | `clubs`, `teams`, and `pools` indices     | search-worker owns mappings and writes         | worker docs/mappings/index services | `PROVEN` |
| Expo search                | mobile-local API, TanStack queries, and cards             | debounced user text plus filters    | result cards and entity navigation        | no user token on public client                 | Expo search module                  | `PROVEN` |

Search-service is a read adapter over indices owned and recreated by search-worker. It does not own the source club,
team, pool, division, season, format, or gender data. The BFF performs no enrichment or fan-out in this workflow; it
copies the downstream shapes and changes empty-result status semantics.

## 2. REST Operation Inventory

No operation declares an authoritative source-contract `operationId`; all operation IDs are `MISSING`.

| Boundary | Method and path                          | Controller                           | Auth                        | Request                                         | Success                    | Empty       | Pagination | Proven caller | Status   |
| -------- | ---------------------------------------- | ------------------------------------ | --------------------------- | ----------------------------------------------- | -------------------------- | ----------- | ---------- | ------------- | -------- |
| service  | GET `/api/v1/search/clubs`               | `ClubSearchController.search`        | authenticated JWT; no scope | required `query`                                | 200 raw array, max 5 or 20 | 200 `[]`    | none       | BFF           | `PROVEN` |
| service  | GET `/api/v1/search/teams`               | `TeamSearchController.search`        | authenticated JWT; no scope | `query`; optional season/division/format/gender | 200 raw array, max 5 or 20 | 200 `[]`    | none       | BFF           | `PROVEN` |
| service  | GET `/api/v1/search/pools`               | `PoolSearchController.search`        | authenticated JWT; no scope | same filter family                              | 200 raw array, max 5 or 20 | 200 `[]`    | none       | BFF           | `PROVEN` |
| BFF      | GET `/api/v1/mobile/public/search/clubs` | `SearchPublicController.searchClubs` | `permitAll`                 | required `query`                                | 200 raw array              | 204 no body | none       | Expo          | `PROVEN` |
| BFF      | GET `/api/v1/mobile/public/search/teams` | `SearchPublicController.searchTeams` | `permitAll`                 | same filter family                              | 200 raw array              | 204 no body | none       | Expo          | `PROVEN` |
| BFF      | GET `/api/v1/mobile/public/search/pools` | `SearchPublicController.searchPools` | `permitAll`                 | same filter family                              | 200 raw array              | 204 no body | none       | Expo          | `PROVEN` |

Current operation behavior:

- `query` is a required query parameter at both controllers. A missing parameter fails before the service call; an
  empty or whitespace-only value is accepted and selects the random-example branch.
- Team and pool use current wire parameter `division_id`. Expo constructs `divisionId`, and the global request
  interceptor converts it to `division_id`; the BFF forwards the same snake-case name to search-service.
- The service controllers always call `ResponseEntity.ok(results)`. Their Springdoc annotations advertise 204 for no
  results, but no controller branch returns 204. The BFF alone converts an empty list into 204.
- Search-service catches every Elasticsearch/query/deserialization exception and returns an empty list. Consequently,
  an index outage, timeout exception, mapping failure, or real no-match result is exposed by the BFF as the same 204.
- Raw arrays have no wrapper, total, page, continuation, or truncation indicator. The result is intentionally capped,
  but callers cannot distinguish a complete five/twenty-item set from a terminated or partial search.
- Search-service accepts any authenticated JWT and declares no scope rule. The public BFF has no user JWT and therefore
  uses its M2M RestTemplate; public search availability depends on a valid internal token.
- Missing/malformed parameters use framework/BFF ad hoc errors. No stable error code or Problem Details contract
  exists. The BFF maps a missing required parameter through its 400 binding handler, while a nonnumeric
  `division_id` reaches its generic `Exception` handler and becomes a generic 500.

Evidence: search controllers lines 14-35; search services lines 25-150; BFF search controller lines 14-53;
`SearchClientService` lines 17-93; BFF security public chain lines 21-30; `ApiClientService` lines 33-74.

## 3. Query, Ordering, and Empty-Result Semantics

| Entity / branch | Query                                              | Search fields and boosts                                          | Filters                            | Limit / termination                    | Ordering                                | Status   |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- | -------------------------------------- | --------------------------------------- | -------- |
| club empty      | function-score `match_all` + unseeded random score | none                                                              | none                               | size 5; terminate after 1,000; 150 ms  | random, not repeatable                  | `PROVEN` |
| club non-empty  | `multi_match`, `bool_prefix`, `AND`                | name ×4, city ×2, `all`                                           | none                               | size 20; terminate after 5,000; 150 ms | Elasticsearch score; tie order unstated | `PROVEN` |
| team empty      | same random branch                                 | none                                                              | exact optional filters             | size 5; terminate after 1,000; 150 ms  | random within filtered set              | `PROVEN` |
| team non-empty  | `multi_match`, `bool_prefix`, `AND`                | shortName ×4; name ×3; clubName, clubCity, divisionName ×2; `all` | season, divisionId, format, gender | size 20; terminate after 5,000; 150 ms | Elasticsearch score; tie order unstated | `PROVEN` |
| pool empty      | same random branch                                 | none                                                              | exact optional filters             | size 5; terminate after 1,000; 150 ms  | random within filtered set              | `PROVEN` |
| pool non-empty  | `multi_match`, `bool_prefix`, `AND`                | shortName ×4; name ×3; divisionName and leagueName ×2; `all`      | season, divisionId, format, gender | size 20; terminate after 5,000; 150 ms | Elasticsearch score; tie order unstated | `PROVEN` |

All searchable text fields use the worker-owned `folded_autocomplete` analyzer: standard tokenizer, lowercase,
ASCII-folding, and French elision. `search_as_you_type` subfields supply `_2gram` and `_3gram` terms. The aggregate
`all` field is populated in the inverted index through `copy_to`, even though worker builders leave the Java `all`
property unset.

Filters are exact `term` queries. Blank filter strings are ignored by search-service; negative or unknown division
IDs and unknown nonblank format/gender strings are accepted and normally produce no match. No input length, enum,
season, numeric range, result-size, rate, or query-complexity validation exists in source.

`trackTotalHits(false)` suppresses totals. Search-service does not inspect `timedOut`, shard failures,
`terminatedEarly`, or total-hit metadata. Whether a 150 ms timeout returns partial hits or an exception depends on
unobserved Elasticsearch/cluster partial-result configuration and is `UNKNOWN`.

The fixed cap makes this an autocomplete/bounded-list workflow rather than current page navigation. A future
`*ListResponse` can express the bounded items, but relevance order, random examples, truncation, and partial-result
semantics require explicit parity decisions; deterministic pagination must not be invented during this audit.

## 4. Type Inventory

| Type ID        | Current shape / role                                 | Owner          | Mutable                | Constructed by           | Consumed by                  | Serialized / stored      | Duplicate family | Status   |
| -------------- | ---------------------------------------------------- | -------------- | ---------------------- | ------------------------ | ---------------------------- | ------------------------ | ---------------- | -------- |
| `S-SVC-CLUB`   | `ClubSearchDocDTO`, Elasticsearch source + REST item | search-service | yes                    | Elasticsearch client     | controller                   | ES source read + REST    | club result      | `PROVEN` |
| `S-SVC-TEAM`   | `TeamSearchDocDTO`, Elasticsearch source + REST item | search-service | yes                    | Elasticsearch client     | controller                   | ES source read + REST    | team result      | `PROVEN` |
| `S-SVC-POOL`   | `PoolSearchDocDTO`, Elasticsearch source + REST item | search-service | yes                    | Elasticsearch client     | controller                   | ES source read + REST    | pool result      | `PROVEN` |
| `S-ES-CLUB`    | `ClubDoc` + `clubs-index.json`                       | search-worker  | yes                    | worker index service     | Elasticsearch/search-service | Elasticsearch            | club result      | `PROVEN` |
| `S-ES-TEAM`    | `TeamDoc` + `teams-index.json`                       | search-worker  | yes                    | worker index service     | Elasticsearch/search-service | Elasticsearch            | team result      | `PROVEN` |
| `S-ES-POOL`    | `PoolDoc` + `pools-index.json`                       | search-worker  | yes                    | worker index service     | Elasticsearch/search-service | Elasticsearch            | pool result      | `PROVEN` |
| `S-BFF-CLUB`   | copied club DTO and raw list                         | mobile-gateway | yes                    | managed RestTemplate     | public controller            | internal HTTP + BFF REST | club result      | `PROVEN` |
| `S-BFF-TEAM`   | copied team DTO and raw list                         | mobile-gateway | yes                    | managed RestTemplate     | public controller            | internal HTTP + BFF REST | team result      | `PROVEN` |
| `S-BFF-POOL`   | copied pool DTO and raw list                         | mobile-gateway | yes                    | managed RestTemplate     | public controller            | internal HTTP + BFF REST | pool result      | `PROVEN` |
| `S-MOB-CLUB`   | `ClubSearchDocDTO` interface                         | Expo           | no runtime enforcement | HTTP client              | club card/navigation         | mobile runtime           | club result      | `PROVEN` |
| `S-MOB-TEAM`   | `TeamSearchDocDTO` interface                         | Expo           | no runtime enforcement | HTTP client              | team card/navigation         | mobile runtime           | team result      | `PROVEN` |
| `S-MOB-POOL`   | `PoolSearchDocDTO` type                              | Expo           | no runtime enforcement | HTTP client              | pool card/navigation         | mobile runtime           | pool result      | `PROVEN` |
| `S-MOB-FILTER` | query/filter state + `EnumFormat`/`EnumGender`       | Expo           | yes                    | search screens/selectors | API/query keys               | query params only        | filters          | `PROVEN` |

Search-service has no application command/view, domain model, persistence entity, repository, or mapper. Each service
DTO is simultaneously the Elasticsearch deserialization projection, service result, and REST item. Mapper inventory:
`NONE`.

## 5. Field-Lineage Matrix

### 5.1 Request and filter fields

| Field       | Java/TS name | Current service/BFF wire | Target wire  | Producer                    | Search consumer / behavior                        | Validation / default                      | Class      | Status   |
| ----------- | ------------ | ------------------------ | ------------ | --------------------------- | ------------------------------------------------- | ----------------------------------------- | ---------- | -------- |
| query       | `query`      | `query`                  | `query`      | Expo text, debounced 300 ms | random examples when blank; multi-match otherwise | required parameter; no length/trim rule   | `REQUIRED` | `PROVEN` |
| season      | `season`     | `season`                 | `season`     | hardcoded Expo selector     | exact keyword term on team/pool                   | optional; blank ignored                   | `REQUIRED` | `PROVEN` |
| division ID | `divisionId` | `division_id`            | `divisionId` | active-division selector    | exact long term on team/pool                      | optional; no range/existence check        | `REQUIRED` | `PROVEN` |
| format      | `format`     | `format`                 | `format`     | Expo `SIX/FOUR/TWO` enum    | exact keyword term on team/pool                   | service accepts any string; blank ignored | `REQUIRED` | `PROVEN` |
| gender      | `gender`     | `gender`                 | `gender`     | Expo `M/F/O` enum           | exact keyword term on team/pool                   | service accepts any string; blank ignored | `REQUIRED` | `PROVEN` |

Team and pool screens enable their TanStack query even when the text is empty, so empty search intentionally loads five
random filtered examples. Club enables its query when text is non-empty or the screen explicitly requests empty
examples. Query keys contain exact text and every filter and remain fresh for five minutes; retry is disabled.

### 5.2 Club store and result fields

| Field       | Store (`S-ES-CLUB`)         | Service/BFF wire | Expo declaration / use       | Derivation / nullability                      | Class              | Status   |
| ----------- | --------------------------- | ---------------- | ---------------------------- | --------------------------------------------- | ------------------ | -------- |
| id          | keyword/string              | `id`             | string; navigation/key       | source club ID                                | `REQUIRED`         | `PROVEN` |
| name        | analyzed text               | `name`           | card title                   | source name; no local constraint              | `REQUIRED`         | `PROVEN` |
| logoUrl     | keyword `logoUrl`           | `logo_url`       | nullable card image          | source logo; Java nullable                    | `REQUIRED`         | `PROVEN` |
| city        | analyzed text               | `city`           | declared non-null; card chip | source city; Java permits null                | `REQUIRED`         | `PROVEN` |
| all         | copied analyzed text        | absent           | absent                       | derived from name/city; queried, not returned | `DERIVED`          | `PROVEN` |
| nameSuggest | mapping-only `name_suggest` | absent           | absent                       | no writer/query field found                   | `PERSISTENCE_ONLY` | `PROVEN` |

### 5.3 Team store and result fields

| Field             | Store (`S-ES-TEAM`)                  | Service/BFF wire                        | Expo declaration / proven use                          | Class                | Status   |
| ----------------- | ------------------------------------ | --------------------------------------- | ------------------------------------------------------ | -------------------- | -------- |
| id                | long                                 | `id`                                    | number; navigation/key                                 | `REQUIRED`           | `PROVEN` |
| name              | analyzed text                        | `name`                                  | card title                                             | `REQUIRED`           | `PROVEN` |
| shortName         | analyzed text                        | `short_name`                            | omitted from mobile type/UI                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| clubId            | keyword                              | `club_id`                               | declared; no search UI read                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| clubName          | analyzed text                        | `club_name`                             | declared; no search UI read                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| clubCity          | analyzed text                        | `club_city`                             | declared; no search UI read                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| logoUrl           | keyword                              | `logo_url`                              | nullable card image                                    | `REQUIRED`           | `PROVEN` |
| divisionId        | long; source-filtered and filterable | absent because service DTO has no field | declared required; no UI read                          | `PERSISTENCE_ONLY`   | `PROVEN` |
| divisionName      | analyzed text                        | `division_name`                         | division chip label                                    | `REQUIRED`           | `PROVEN` |
| divisionMainColor | absent                               | absent                                  | declared and read only for fallback-capable chip color | `COMPATIBILITY_ONLY` | `PROVEN` |
| format            | keyword                              | `format`                                | format chip/label lookup                               | `REQUIRED`           | `PROVEN` |
| gender            | keyword                              | `gender`                                | gender chip/label lookup                               | `REQUIRED`           | `PROVEN` |
| season            | keyword                              | `season`                                | season chip                                            | `REQUIRED`           | `PROVEN` |
| all               | copied analyzed text                 | absent                                  | absent                                                 | `DERIVED`            | `PROVEN` |
| nameSuggest       | mapping-only `name_suggest`          | absent                                  | absent                                                 | `PERSISTENCE_ONLY`   | `PROVEN` |

The service asks Elasticsearch to include `divisionId` but deserializes into a DTO without that property;
`@JsonIgnoreProperties(ignoreUnknown = true)` prevents it from reaching REST. Expo nevertheless declares
`divisionId`. `divisionMainColor` exists only in the Expo type and card fallback expression; neither the index,
search-service, nor the BFF produces it. Current cards therefore use the theme fallback rather than a division color.

### 5.4 Pool store and result fields

| Field             | Store (`S-ES-POOL`)                  | Service/BFF wire                        | Expo declaration / proven use                          | Class                | Status   |
| ----------------- | ------------------------------------ | --------------------------------------- | ------------------------------------------------------ | -------------------- | -------- |
| id                | long                                 | `id`                                    | number; navigation/key                                 | `REQUIRED`           | `PROVEN` |
| name              | analyzed text                        | `name`                                  | card title                                             | `REQUIRED`           | `PROVEN` |
| shortName         | analyzed text                        | `short_name`                            | omitted from mobile type/UI                            | `COMPATIBILITY_ONLY` | `PROVEN` |
| divisionId        | long; source-filtered and filterable | absent because service DTO has no field | declared required; no UI read                          | `PERSISTENCE_ONLY`   | `PROVEN` |
| divisionName      | analyzed text                        | `division_name`                         | division chip label                                    | `REQUIRED`           | `PROVEN` |
| divisionMainColor | absent                               | absent                                  | declared and read only for fallback-capable chip color | `COMPATIBILITY_ONLY` | `PROVEN` |
| leagueCode        | keyword                              | `league_code`                           | determines regional display                            | `REQUIRED`           | `PROVEN` |
| leagueName        | analyzed text                        | `league_name`                           | conditional regional chip                              | `REQUIRED`           | `PROVEN` |
| season            | keyword                              | `season`                                | season chip                                            | `REQUIRED`           | `PROVEN` |
| format            | keyword                              | `format`                                | format chip/label lookup                               | `REQUIRED`           | `PROVEN` |
| gender            | keyword                              | `gender`                                | gender chip/label lookup                               | `REQUIRED`           | `PROVEN` |
| logoUrl           | keyword                              | `logo_url`                              | optional card image                                    | `REQUIRED`           | `PROVEN` |
| all               | copied analyzed text                 | absent                                  | absent                                                 | `DERIVED`            | `PROVEN` |
| nameSuggest       | mapping-only `name_suggest`          | absent                                  | absent                                                 | `PERSISTENCE_ONLY`   | `PROVEN` |

All Java result fields are nullable and have no validation. Expo declares most fields non-null and casts format/gender
strings into label records. A missing or unknown format/gender can yield an undefined label; exact production index
null rates are `UNKNOWN` without document sampling.

### 5.5 Elasticsearch configuration fields

| Field    | Source                   | Consumer             | Boundary                     | Class          | Status   |
| -------- | ------------------------ | -------------------- | ---------------------------- | -------------- | -------- |
| host     | `ELASTICSEARCH_HOST`     | client `connectedTo` | infrastructure config only   | `VENDOR_OWNED` | `PROVEN` |
| username | `ELASTICSEARCH_USERNAME` | basic auth           | infrastructure secret/config | `VENDOR_OWNED` | `PROVEN` |
| password | `ELASTICSEARCH_PASSWORD` | basic auth           | infrastructure secret        | `VENDOR_OWNED` | `PROVEN` |

All three properties are `@NotBlank`. They are not API fields and must not enter OpenAPI. TLS, certificate handling,
connection pooling, and retry behavior are not configured in search-service source and depend on the host/client
environment.

## 6. Construction, Mapping, and Conversion Inventory

| ID      | Source → target                           | Mechanism                                          | Loss / mixed behavior                                               | Provisional owner                          | Status     |
| ------- | ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| `S-C01` | domain API/event/cache → worker index doc | manual worker builders plus cache enrichment       | null fallbacks and enum names mixed with indexing                   | search-worker index projector              | `PROVEN`   |
| `S-C02` | index mapping `copy_to` → `all`           | Elasticsearch analyzer/mapping                     | derived inverted-index field absent from source object              | Elasticsearch adapter                      | `PROVEN`   |
| `S-C03` | ES hit source → service DTO               | direct Java client deserialization                 | persistence projection doubles as REST item; unknown fields ignored | search-service Elasticsearch adapter       | `PROVEN`   |
| `S-C04` | service DTO → internal REST               | Spring MVC + global `SNAKE_CASE`                   | camel Java becomes snake JSON                                       | service API boundary                       | `PROVEN`   |
| `S-C05` | internal response → BFF copied DTO        | managed RestTemplate/Jackson                       | current code relies on naming bridge; no explicit mapper            | generated client adapter later             | `INFERRED` |
| `S-C06` | BFF copied DTO → public response          | raw pass-through + global `SNAKE_CASE`             | no BFF-specific projection; empty list becomes 204                  | BFF search facade                          | `PROVEN`   |
| `S-C07` | Expo camel query → BFF query              | global deep `snakecaseKeys`                        | `divisionId` becomes `division_id`                                  | mobile-local generated client later        | `PROVEN`   |
| `S-C08` | BFF snake response → Expo type            | global deep `camelcaseKeys` + TypeScript assertion | missing/extra/null fields are not validated                         | mobile-local generated schema/client later | `PROVEN`   |
| `S-C09` | Expo result → card/navigation             | direct property reads                              | stale division fields and unused copies are masked                  | mobile search view model                   | `PROVEN`   |

The exact ObjectMapper instance installed in the two BFF RestTemplates was not inspected at runtime. They are built by
the managed `RestTemplateBuilder` and the copied DTOs have no snake-case annotations, so current operation relies on
Boot's configured message converters honoring the BFF naming strategy. A runtime converter/fixture is required to move
`S-C05` from `INFERRED` to `PROVEN` behavior.

## 7. Duplicate-Type Analysis

| Family          | Members                                                         | Drift                                                                    | Proven consumer reason             | Provisional disposition                            | Status   |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------- | -------- |
| club result     | worker doc, service DTO, BFF DTO, Expo interface                | worker adds `all`; wire copies otherwise align; city nullability differs | club card/navigation               | generated internal item → BFF item → mobile view   | `PROVEN` |
| team result     | worker doc, service/BFF DTO, Expo interface                     | API drops divisionId; Expo adds divisionMainColor and drops shortName    | card/navigation and filter display | separate index projection and generated boundaries | `PROVEN` |
| pool result     | worker doc, service/BFF DTO, Expo type                          | same division drift; Expo drops shortName                                | card/navigation and regional chips | same                                               | `PROVEN` |
| filter values   | raw Java strings, worker enums, BFF enums elsewhere, Expo enums | search boundary performs no enum validation                              | Expo selectors and exact ES terms  | shared contract enums after ownership approval     | `PROVEN` |
| raw result list | service array, BFF array, TanStack array                        | BFF changes empty 200 to 204                                             | current flat-list workflow         | bounded list wrappers with parity decision         | `PROVEN` |

The DTO simple names describe Elasticsearch documents even when exposed as public BFF results. Object shapes remain
boundary-local by default; this audit does not recommend sharing the object class itself.

## 8. Elasticsearch Persistence Boundary

| Index   | Identifier      | Mapping owner / writer | Search fields                  | Filter fields                   | REST exposure                       | Constraint / lifecycle gap                          | Status   |
| ------- | --------------- | ---------------------- | ------------------------------ | ------------------------------- | ----------------------------------- | --------------------------------------------------- | -------- |
| `clubs` | keyword club ID | search-worker          | name, city, all                | none                            | selected fields through service DTO | unseeded random examples; nullable source           | `PROVEN` |
| `teams` | long team ID    | search-worker          | short/name/club/division/all   | season/divisionId/format/gender | selected fields; divisionId dropped | no alias/version; index recreated at worker startup | `PROVEN` |
| `pools` | long pool ID    | search-worker          | short/name/division/league/all | season/divisionId/format/gender | selected fields; divisionId dropped | same                                                | `PROVEN` |

Search-worker owns Spring Data repositories, mappings, manual document construction, and the only proven writes.
Search-service owns only read queries and source filtering. No index alias, schema version, migration, compatibility
read, or mapping handshake between the two deployables exists.

`IndexInitializerService` deletes each existing index and recreates it in three `@PostConstruct` methods whenever the
worker starts. Search-service converts the resulting missing/empty/error interval into normal empty results. Exact
initialization ordering, repopulation completion, concurrent worker behavior, and production downtime belong to
MRG-262 and require runtime evidence.

The mapping contains `name_suggest` completion fields for all three indices, but no document class, writer, or query
uses them. They remain persistence-only until production mappings and external Elasticsearch consumers are proven.

## 9. Validation, Error, Security, and Compatibility Behavior

| Boundary                 | Current rule                                      | Failure / compatibility behavior                                 | Status    |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| service auth             | every request authenticated; no scopes            | invalid/missing JWT rejected before controller                   | `PROVEN`  |
| BFF auth                 | public path `permitAll`                           | outbound call switches to M2M because no user JWT                | `PROVEN`  |
| required query           | Spring required parameter                         | missing value is framework/BFF 400; empty string is valid        | `PROVEN`  |
| division ID shape        | framework `Long` conversion                       | search-service default 400; BFF generic handler returns 500      | `PROVEN`  |
| filters                  | optional raw strings/Long                         | blanks ignored; arbitrary values accepted                        | `PROVEN`  |
| ES failure               | catch all exceptions                              | logged message only; exposed as empty list/204                   | `PROVEN`  |
| service empty            | controller always 200 array                       | contradicts annotated 204                                        | `PROVEN`  |
| BFF empty                | empty list → 204                                  | Expo transport is statically typed as an array with no 204 union | `PROVEN`  |
| BFF upstream 4xx         | propagated then ad hoc five-field map             | no stable code                                                   | `PROVEN`  |
| BFF upstream 5xx/network | generic runtime error → generic 500               | original dependency status/detail lost                           | `PROVEN`  |
| casing                   | two global Jackson strategies + mobile transforms | ES store stays camelCase; REST stays snake_case                  | `PROVEN`  |
| public load              | no source rate limit/cache                        | external reverse-proxy protection is `UNKNOWN`                   | `UNKNOWN` |

Both `SearchService` and the generic BFF API client log the raw query; the latter logs the full downstream URL with
filters. Expo also logs request params in its HTTP interceptor. Retention, redaction, and production log access are
`UNKNOWN`, but user-entered search terms are a proven logged field.

The BFF uses `query` and filter values without aggregation or normalization. Its client omits blank season but forwards
non-null blank format/gender, which search-service then ignores. Unicode, apostrophe, slash, percent, and very long
query behavior needs an HTTP-to-Elasticsearch fixture before generated-client migration.

## 10. BFF and Mobile Call Graph

| Workflow    | Call graph                                    | Cardinality         | Ordering / cache                     | Empty / failure                                             | Visible purpose                                               | Status   |
| ----------- | --------------------------------------------- | ------------------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| club search | Expo → public BFF → internal club search → ES | one downstream call | ES random/score; TanStack 5 min      | 204 becomes no result body; network errors show error state | title, city, logo, navigation                                 | `PROVEN` |
| team search | Expo → public BFF → internal team search → ES | one downstream call | same; query key includes all filters | same                                                        | title, division/gender/season/format, logo, navigation        | `PROVEN` |
| pool search | Expo → public BFF → internal pool search → ES | one downstream call | same                                 | same                                                        | title, division/league/gender/season/format, logo, navigation | `PROVEN` |

There is no BFF fan-out, enrichment, batching, pagination, or BFF cache. Team and pool screens separately load active
divisions from config-service to construct filter options; that call does not enrich search results.

The search screen debounces text by 300 ms, switches among teams/pools/clubs, and renders `data ?? []`. Empty states use
entity-specific French messages; errors use one retryable generic message. Because search-service hides Elasticsearch
failures as empty, that error state cannot represent most store failures. The exact Axios/FlatList value observed for a
204 response is `UNKNOWN` without a transport/device fixture.

TanStack and view state remain mobile-owned. Later Orval generation should replace only the mobile-local BFF transport
and contract schema, not create a shared TanStack library or move filters/cards/navigation into generated code.

## 11. Test and Parity Evidence

| Area            | Existing evidence                       | What it proves                       | Missing parity evidence for later migration                           | Status    |
| --------------- | --------------------------------------- | ------------------------------------ | --------------------------------------------------------------------- | --------- |
| service startup | one `@SpringBootTest` context-load test | only attempted Spring context wiring | disposable Elasticsearch/auth/config fixture                          | `PROVEN`  |
| service REST    | source only                             | controller signatures                | auth, required/blank query, snake casing, 200 empty, error bodies     | `PROVEN`  |
| query semantics | source only                             | configured query DSL                 | analyzed accents/elision/prefixes, AND behavior, score order, filters | `PROVEN`  |
| bounds/partial  | source only                             | requested caps/timeouts              | termination, shard failures, timed-out/partial responses              | `PROVEN`  |
| worker/store    | mappings and writer source              | declared documents and ownership     | mapping compatibility, startup rebuild availability, null fixtures    | `PROVEN`  |
| BFF             | source only                             | pass-through and 204 branch          | M2M, converter casing, upstream errors, 204 body                      | `PROVEN`  |
| Expo            | typecheckable source only               | declared types and UI reads          | 204 runtime, stale fields, empty/error state, filter encoding, cards  | `PROVEN`  |
| production      | unavailable                             | nothing                              | real mappings/docs/scores/latency/callers/rate limits                 | `UNKNOWN` |

No tests were added because MRG-261 is a read-only audit. Behavioral fixtures are required before replacing query DSL,
DTOs, casing bridges, raw arrays, empty semantics, copied clients, or index projections.

## 12. Findings and Provisional Target Roles

| ID           | Finding / risk                                                                                 | Follow-up               | Status   |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| `SEARCH-F01` | one mutable DTO family doubles as Elasticsearch source and REST result                         | MRG-268/326/411         | `PROVEN` |
| `SEARCH-F02` | search-service has no mapper or application read model boundary                                | MRG-268/411             | `PROVEN` |
| `SEARCH-F03` | internal controllers document 204 but always return 200 arrays                                 | MRG-301/326             | `PROVEN` |
| `SEARCH-F04` | BFF alone changes empty arrays to 204, while Expo expects arrays                               | MRG-264/267/327         | `PROVEN` |
| `SEARCH-F05` | all Elasticsearch exceptions are indistinguishable from no results                             | MRG-268/326/411         | `PROVEN` |
| `SEARCH-F06` | timeout/termination/shard metadata is ignored, so partial results are undisclosed              | query parity policy     | `PROVEN` |
| `SEARCH-F07` | blank queries produce unseeded random examples; non-empty tie order is unstated                | MRG-268/326             | `PROVEN` |
| `SEARCH-F08` | filter strings, query length, and numeric range lack validation; malformed BFF division is 500 | MRG-326/342             | `PROVEN` |
| `SEARCH-F09` | search-service source-filters `divisionId`, but service and BFF DTOs silently drop it          | MRG-267/326             | `PROVEN` |
| `SEARCH-F10` | Expo requires missing divisionId/main-color fields and masks the color with fallback           | MRG-264/267/327         | `PROVEN` |
| `SEARCH-F11` | team club fields and team/pool short names are returned without a current UI read              | MRG-267                 | `PROVEN` |
| `SEARCH-F12` | Java nullable strings conflict with mostly non-null Expo declarations                          | generated schema/client | `PROVEN` |
| `SEARCH-F13` | public search depends on BFF M2M credentials and internal any-JWT auth                         | MRG-301/304             | `PROVEN` |
| `SEARCH-F14` | raw user search terms and full downstream URLs are logged                                      | logging/privacy review  | `PROVEN` |
| `SEARCH-F15` | search-worker recreates shared indices on startup without alias/version handshake              | MRG-262/304/412         | `PROVEN` |
| `SEARCH-F16` | mapping-only completion fields have no proven writer/query consumer                            | MRG-262/267             | `PROVEN` |
| `SEARCH-F17` | snake-case REST and mobile deep conversion hide an already camelCase ES store                  | MRG-303/351-354         | `PROVEN` |
| `SEARCH-F18` | `EXPO_PUBLIC_API_SEARCH_BASE_URL` is configured but current SearchApi uses only gateway URL    | MRG-267/503             | `PROVEN` |

| Current type / behavior    | Provisional target role                                             | Keep / split / map / retire  | Preconditions / decision owner  |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| worker documents/mappings  | Elasticsearch persistence projections                               | keep behind worker adapter   | MRG-262/268                     |
| service search DTOs        | application search result views + generated internal response items | split/map                    | MRG-268/326/411                 |
| raw bounded arrays         | generated internal/BFF list responses                               | replace boundary with parity | empty/truncation/order decision |
| query/filter arguments     | application search query input                                      | map/validate                 | enum/blank/limit policy         |
| copied BFF DTOs/client     | generated downstream client → BFF projection                        | retire/map                   | MRG-327/342/413                 |
| Expo search DTOs/API       | generated BFF transport → mobile view model                         | retire/map transport only    | MRG-313/328/347                 |
| TanStack/filter/card state | mobile search application/view module                               | keep mobile-local            | preserve current UX             |
| global casing bridges      | rollout compatibility adapters                                      | retire later                 | MRG-304/351-354                 |
| `name_suggest` mappings    | unproven persistence artifacts                                      | retain pending proof         | production/external inventory   |

## 13. Unknowns and Completion

| Unknown                                                                         | Required evidence                                          | Blocking later work            |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| deployed mappings, document null rates, index sizes, and stale-index divergence | safe production mapping/document/stat inventory            | MRG-262/304/cutover            |
| actual score order for representative French queries and equal scores           | deterministic fixture against production-shaped mappings   | MRG-326/411                    |
| timeout, termination, shard failure, and partial-result behavior                | disposable multi-shard failure fixtures + cluster settings | error/parity contract          |
| startup delete/recreate downtime and repopulation ordering                      | worker lifecycle trace and concurrent-start fixture        | MRG-262/304                    |
| external callers of direct search-service or public BFF endpoints               | access logs and deployed client inventory                  | response/empty reduction       |
| BFF RestTemplate ObjectMapper and snake-case behavior                           | runtime bean/HTTP fixture                                  | generated client cutover       |
| mobile runtime value and UI behavior for 204                                    | Axios/device integration fixture                           | BFF empty contract             |
| null/unknown format, gender, city, logo, and enrichment frequency               | production-shaped document fixture                         | schema required/nullable rules |
| public rate limiting and abuse controls                                         | reverse-proxy/deployment configuration                     | security/capacity plan         |
| log retention/redaction for user search text                                    | production logging policy/configuration                    | privacy review                 |
| consumers or purpose of `name_suggest`                                          | production mappings, external ES clients, history          | field classification           |

- [x] All three internal and three BFF REST operations, auth rules, parameters, results, errors, and empty behavior are
      inventoried.
- [x] Every club, team, and pool result/store/mobile field has lineage, current casing, target casing, consumer,
      nullability, and one primary classification.
- [x] Empty and non-empty query DSL, boosts, analyzers, exact filters, caps, termination, timeout, totals, ordering, and
      partial-result unknowns are explicit.
- [x] Elasticsearch mapping/write ownership is separated from search-service read ownership without pre-auditing the
      full MRG-262 worker scope.
- [x] Direct DTO reuse, absent mappers/entities/repositories, copied BFF clients, and mobile transforms are explicit.
- [x] BFF call graphs, M2M behavior, empty conversion, logs, and every proven Expo result-field purpose are traced.
- [x] TanStack query ownership, debounce, query keys, caching, filters, empty/error states, and navigation are recorded.
- [x] Existing tests, missing parity fixtures, provisional target roles, and environment unknowns are explicit.
- [x] No runtime, contract, generated artifact, mapping, configuration, test, deployment, or production state changed.

MRG-262 must audit worker bootstrap, events, caches, schedulers, writers, reconciliation, and rebuild recovery in full.
MRG-263/264 must consolidate the BFF pass-through, public auth, empty/error handling, and copied client. MRG-267/268 must
approve retained fields, nullability, bounded-list semantics, search ordering, Elasticsearch/application ownership,
and mapper roles. MRG-301/303/304/326/327 must define authoritative camelCase REST contracts and coexistence.
MRG-342/343/347/411/412/413/414 must migrate generated boundaries and role-owned search projections with parity.
MRG-351-354 must remove snake-case strategies and transforms only after every caller is cut over. TanStack and Orval
remain Expo-owned. Production deployment did not occur.
