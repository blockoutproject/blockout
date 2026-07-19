# Blockout Refactor Direction

## Objective

Modernize Blockout incrementally while keeping the imported applications functional. Maaatch is the read-only reference for repository structure, naming, and clear application boundaries. Blockout keeps its own domain and behavior.

The first refactor changes only the JSON naming convention owned by Blockout. Application-owned fields move from snake_case to camelCase across every producer and consumer in this repository.

## API evolution

The broader reconstruction is conceptually the next version of Blockout, but this first migration does not introduce `/v2` routes, V2 controllers, duplicated DTOs, or compatibility aliases. Existing V1 routes stay in place while their application-owned JSON representation changes atomically.

This is intentionally a breaking contract change. It is acceptable only because the backend services, mobile application, workers, and scrapers are migrated and validated together before any deployment work is considered.

## Naming and boundaries

Blockout will first reach a clean handwritten architecture. Internal HTTP models should eventually use explicit Maaatch-style semantics such as `InternalRequest` and `InternalResponse`; application mutations should use command-oriented types; public views should be distinct from internal transport models.

That cleanup is not part of the camelCase migration. Existing DTOs are renamed or reorganized only in later focused tasks. Contract-first specifications and generated models replace stable handwritten boundaries afterwards, not during this phase.

The camelCase rule applies to JSON owned by Blockout:

- REST request and response bodies;
- service-to-service HTTP payloads;
- RabbitMQ payloads owned by Blockout;
- scraper requests and responses exchanged with Blockout APIs;
- mobile requests and responses exchanged with the gateway;
- JSON documents owned by Blockout workers where field names are part of an application interface.

It does not rename:

- database tables or columns;
- environment variables or Spring configuration keys;
- URL paths, query parameters, HTTP headers, queue names, routing keys, or metrics;
- payloads imposed by Auth0, FFVB, LNV, Expo, GitHub, Discord, Mapbox, or another external provider;
- Python logging metadata or internal implementation dictionaries that are not transport contracts.

## Delivery order

The migration first inventories the boundaries, then protects representative flows with characterization tests. All repository-owned producers and consumers switch to camelCase in one atomic task. The final gate starts the required local APIs and validates both scrapers through controlled end-to-end flows.

No production deployment, broker operation, dual contract support, generated source, or unrelated business refactor is authorized by this direction.

## Current boundary inventory

| Application | Blockout-owned JSON to migrate | External JSON to preserve |
| --- | --- | --- |
| `club-scraper` | Config status responses and club/competition API writes | Auth0 and FFVB responses |
| `competition-scraper` | Config, competition, team, pool, and match API payloads | Auth0, FFVB, and LNV inputs |
| `clubs-service` | REST bodies and club lifecycle events | Mapbox responses |
| `competition-service` | REST bodies and competition lifecycle events | None identified |
| `config-service` | REST bodies used by the gateway and scrapers | None identified |
| `matches-service` | REST bodies, internal user lookups, and match events | None identified |
| `mobile-gateway` | Mobile-facing REST bodies and internal service payloads | Provider response models remain provider-owned |
| `notification-service` | REST bodies, consumed Blockout events, and stored notification JSON | Auth0 and Expo payloads |
| `pools-service` | REST bodies and pool lifecycle events | None identified |
| `reports-service` | REST report bodies | GitHub and Discord payloads |
| `search-service` | Search REST bodies | Elasticsearch protocol fields |
| `search-worker` | Consumed Blockout events, internal service payloads, and owned index documents | Elasticsearch protocol fields |
| `teams-service` | REST bodies and team lifecycle events | None identified |
| `users-service` | REST bodies, internal service payloads, and follow events | Auth0 payloads |
| `mobile` | Gateway request and response bodies | Auth0 and native framework values |

Twelve Spring applications currently enable global `SNAKE_CASE` serialization. Explicit `@JsonProperty` mappings also exist in service and gateway DTOs, both Python scrapers construct snake_case Blockout payloads, and the mobile HTTP client converts request bodies to snake_case before converting responses back to camelCase. These are one connected contract surface and must change together.

Snake_case query parameters remain unchanged in this task because the rule concerns JSON fields. The same applies to multipart field names until a later endpoint-specific cleanup explicitly changes their contract.
