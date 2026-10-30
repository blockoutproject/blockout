# Contracts: search and discovery

The authoritative surface is [mobile/openapi.yaml](../../../contracts/http/mobile/openapi.yaml), extended by [discovery paths](../../../contracts/http/mobile/discovery/paths.yaml), [parameters](../../../contracts/http/mobile/discovery/parameters.yaml) and [schemas](../../../contracts/http/mobile/discovery/schemas.yaml). This folder contains no editable API copy.

## Provider, consumers and ownership

The existing backend provides all four reads; the mobile consumes them. F04 owns text matching, examples, filters and traversal. F02 owns identity, classification, source/manual values, aliases and visibility. Existing [consultation representations](../../../contracts/http/mobile/consultation/schemas.yaml) supply identical team/pool summaries; F03 owns detail destinations. F12 owns optional maintenance admission; F13 owns error and generation conventions.

| Operation                      | Representation and behavior                                                       |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `GET /clubs`                   | Club summaries, searchable by name and current city; no sporting filters.         |
| `GET /teams`                   | Existing team summaries, with the selected season/division/format/gender filters. |
| `GET /pools`                   | Existing pool summaries with the same filter concepts.                            |
| `GET /sporting-search-options` | Current choices for the required team/pool type; no option catalogue for clubs.   |

Collection reads use empty text for five examples and nonempty text for pages of up to twenty matches. `exampleIds` rereads at most five retained examples in their order; it is forbidden with nonempty text or a cursor. `cursor` is a native position for nonempty-text traversal; clients reuse it with the same criteria, while cross-context reuse can skip results and grants no access. Unknown or ineligible resource/filter identities produce no matches, not an inferred replacement. Invalid parameter shapes/combinations return the shared bad-request response. No custom bulk dispatcher or route per screen is added.

Successful JSON uses `Cache-Control: no-store`. Existing BadRequest, Unauthorized, Forbidden and AccessUnavailable responses cover validation, explicit bypass refusal, maintenance and ordinary dependency failure. There is no search-specific error vocabulary or empty-on-failure fallback. Native timeouts and engine exceptions are failures, even if some hits were available; the native request disallows partial shard results.

## Compatibility and generation

These are additive routes; existing F03 routes and wire meanings remain unchanged. Collections have meaningful `clubs`, `teams` or `pools` fields with optional `nextCursor`; no total or snapshot promise. Reuse F02 format/gender enums, F03 identity/season/classification/summary components and existing shared error/header components. Generated MVC conversion/Bean Validation own query types and bounds; unknown query fields are ignored. Only actual mode exclusions and cursor parsing remain handwritten; additive response properties remain accepted. No inheritance composition or duplicate enum is needed.

Use F13's OpenAPI YAML 3.0.4 → Redocly validation/bundle → OpenAPI Generator Java interfaces/DTOs and Orval mobile functions/types/Zod. One validated JSON response enters Query once. The collector consumes no F04 HTTP endpoint; after-commit projection requests and current sporting reads are in-process application interfaces, with no extra REST surface. UUID-based detail routes remain the mobile's existing navigation contract; these additions do not claim a hypermedia API.

The [qualification boundary](../quickstart.md#contracts-and-access) records scoped generated compilation, query-array encoding, Unicode length handling and response validation. Discovery's generator tag isolates its four operations; story adapters still supply the business responses and shared access admission. Generated files remain ignored outputs.

## Existing support navigation boundary

Search opens F10's existing `supportHref` route with its finite `search` screen origin. F10 maps it to “Recherche”; known detail targets continue through its existing type/UUID validation. No query text, tab/filter payload, raw error or attachment is added to the URL or support context. This changes no HTTP contract, submission transport or private destination. F05/F13 still own session invalidation and F10 owns private draft disposal.
