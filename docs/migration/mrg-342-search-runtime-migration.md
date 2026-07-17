# MRG-342 Search Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `search-service`
- Canonical operations: `SEARCH-01`, `SEARCH-02`, and `SEARCH-03`
- Production effect: none

## Purpose

MRG-342 migrates the three search owner operations to generated `/api/v2/**` server interfaces and separates REST
models, application results, and Elasticsearch source documents. It retains isolated `/api/v1/**` adapters for the
current BFF and preserves the deployed search query, fallback, casing, and result behavior.

`search-service` has no downstream Blockout REST dependency. Consequently, this slice does not invent an internal
generated client. MRG-343 owns the existing mobile-gateway search consumer and its generated client migration.

## Boundary Ownership

| Concern                         | Owner                                                                    |
| ------------------------------- | ------------------------------------------------------------------------ |
| Canonical REST source           | OpenAPI `search` service fragments and generated bundle                  |
| Canonical Java server boundary  | generated `SearchApi` and generated response models                      |
| Application results and filters | immutable feature-owned records under `club`, `team`, `pool`, and shared |
| Search fallback policy          | feature application services                                             |
| Elasticsearch requests          | feature-local outbound store adapters                                    |
| Elasticsearch source documents  | package-confined mutable store models                                    |
| Store-to-application mapping    | strict service-local MapStruct mappers                                   |
| Legacy JSON transport           | `LegacySearchController` and its local snake-case writer                 |
| Compatibility telemetry         | payload-free operation/version/status/latency/request-ID telemetry       |

Generated transport models are mapped at the REST edge and Elasticsearch documents are mapped inside outbound
adapters. Neither model family enters application services.

## Preserved Search Semantics

The migrated stores retain the deployed behavior:

- a null or blank query performs a random `match_all` search with size `5`, `terminate_after` `1000`, a `150ms`
  timeout, and disabled total-hit tracking;
- a nonblank query returns at most `20` results, uses `terminate_after` `5000`, keeps the `150ms` timeout, and preserves
  every current bool-prefix field and boost;
- team and pool season, division, format, and gender filters remain exact term filters;
- null and blank optional string filters remain absent rather than being normalized;
- source filtering keeps the exact current Elasticsearch fields, including infrastructure-only `divisionId`;
- any Elasticsearch, deserialization, or store-mapping exception still produces an empty result rather than an error.

No retry, sorting rule, pagination, deterministic random seed, query trimming, fuzzy matching, or index change is
introduced.

## REST Coexistence

The canonical routes are generated from `SEARCH-01` through `SEARCH-03`:

- `GET /api/v2/search/clubs`;
- `GET /api/v2/search/teams`;
- `GET /api/v2/search/pools`.

They accept and emit camelCase, use bounded `{ "items": [...] }` responses, shared generated enums, positive numeric
division identifiers, and progressive Problem Details for canonical request/security failures. Unknown enum values in
an existing Elasticsearch document are contained as null canonical fields instead of turning a successful search into
a server error.

The isolated legacy adapter retains:

- `/api/v1/search/**` paths;
- required-but-blank-compatible `query` parameters;
- snake_case `division_id`;
- permissive legacy format and gender strings;
- raw JSON arrays rather than list wrappers;
- all legacy-only fields such as `short_name`, club identity/location, and pool short name;
- the current authentication, empty-result fallback, status, null, ordering, and error behavior.

There is no global Jackson snake-case strategy, `@JsonProperty`, `@JsonAlias`, recursive casing converter, or generated
model conversion in the v1 path. The local legacy JSON writer is the only snake-case transport mechanism.

## Temporary Names And Retirement

`LegacySearchController`, `LegacySearchJson`, the `/api/v1/**` route family, and their local transport records are
coexistence scaffolding. They are removed only after MRG-343 migrates the BFF caller and the approved traffic/removal
gates are satisfied.

`SearchV2Controller`, its `api.v2` package qualifier, and compatibility telemetry version labels are also temporary
source naming. After v1 retirement the generated `/api/v2/**` public contract remains canonical, while the sole Java
implementation may be renamed to the unqualified search controller. Generated models/interfaces, application records,
MapStruct mappers, store adapters, and Elasticsearch documents remain because they are target architecture rather than
legacy duplication.

## Rollback

Before a v2 consumer is released, rollback uses the preceding v1-only `search-service` image. After MRG-343 activates
a v2 BFF consumer, rollback uses the last known-good dual-route image; returning to a v1-only image first requires
reverting the BFF consumer to v1. This task does not deploy or activate either route in production.

## Verification Evidence

- Generated compilation proves that `SearchV2Controller` implements the generated `SearchApi` boundary.
- Query tests prove blank/random and nonblank/boosted request shapes, limits, timeouts, source fields, and exact filters.
- Application tests prove pass-through behavior, unchanged filter values, and the all-exception empty-list fallback.
- Mapping tests prove Elasticsearch document isolation and the bounded canonical projections.
- Boundary tests prove v2 wrappers/enums and byte-exact v1 raw-array snake-case output with legacy-only fields.
- Source inspection proves that generated REST types stay at the v2 edge, store documents stay in outbound packages,
  and no handwritten Jackson property annotation or global naming strategy remains.
- Focused search tests, contract validation, deterministic generation, full backend packaging, documentation validation,
  Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-343 owns the generated mobile-gateway search client, public BFF relay, and workflow projection.
- MRG-347 owns the generated Expo search client and handwritten mobile query/view-model policy.
- MRG-411 through MRG-414 own deeper search-service, worker, index, cache, and reconciliation restructuring.
- Search index mappings, aliases, data, workers, RabbitMQ, BFF runtime, Expo, scrapers, standalone repositories,
  production, Maaatch, Orval, and Python generation are unchanged.

The active goal stops before Phase MRG-900 and performs no deployment or production activation.
