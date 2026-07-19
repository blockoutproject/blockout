# Blockout Refactor Direction

## Objective

Modernize Blockout incrementally while keeping the imported applications functional. Maaatch is the read-only reference for repository structure, naming, and clear application boundaries. Blockout keeps its own domain and behavior.

The first refactor aligns the Blockout-owned HTTP contract on native camelCase. Bodies, responses, and query parameters use the same names in every producer and consumer in this repository.

## API evolution

The broader reconstruction is conceptually the next version of Blockout, but this first migration does not introduce `/v2` routes, V2 controllers, duplicated DTOs, or compatibility aliases. Existing V1 routes stay in place while their application-owned JSON representation changes atomically.

This is intentionally a breaking contract change. It is acceptable only because the backend services, mobile application, workers, and scrapers are migrated and validated together before any deployment work is considered.

## Naming and boundaries

Blockout will first reach a clean handwritten architecture. Internal HTTP models should eventually use explicit Maaatch-style semantics such as `InternalRequest` and `InternalResponse`; application mutations should use command-oriented types; public views should be distinct from internal transport models.

That cleanup is not part of the camelCase migration. Existing DTOs are renamed or reorganized only in later focused tasks. Contract-first specifications and generated models replace stable handwritten boundaries afterwards, not during this phase.

The cleanup now proceeds one owning service at a time. Each service first establishes a clean handwritten boundary with Maaatch-style `api`, `application`, and `infrastructure` responsibilities. HTTP models use `InternalRequest` and `InternalResponse`; application mutations use commands; application reads return views; persistence entities never cross the API boundary. Contract sources and code generation remain deferred until these handwritten boundaries are stable.

## Model ownership

Each complete business resource has one owning service. That service defines the authoritative field set and semantics while the repository still uses handwritten contracts. Any complete mirror in a gateway, worker, scraper, or frontend must match that authoritative representation. Missing fields, incompatible types, and unrelated extra fields are corrected in the same service slice.

Purpose-specific messages and read models are not forced to become complete resource copies. Their smaller shape must be explicit in their name and usage, and their producer and consumer must still agree exactly.

REF-007 establishes the first ownership rule:

- `clubs-service` owns the complete Club representation: `id`, `rawName`, `name`, `address`, `city`, `postalCode`, `email`, `phoneNumber`, `website`, `logoUrl`, `active`, `latitude`, `longitude`, `createdAt`, and `lastUpdate`;
- the gateway, search worker, club scraper, and mobile application mirror that complete representation at their Club HTTP boundaries;
- `ClubUpsertEvent`, `ClubDeactivationEvent`, search documents, and search result DTOs remain intentionally smaller lifecycle or query projections.

REF-010 establishes configuration ownership:

- `config-service` owns the app status response: `maintenance`, `message`, `imageUrl`, `minVersionIos`,
  `minVersionAndroid`, `storeUrlIos`, `storeUrlAndroid`, `forceUpdateMessage`, and `lastUpdate`;
- `config-service` owns the complete Division representation: `id`, `name`, `mainColor`, `firstGradientColor`,
  `secondGradientColor`, `thirdGradientColor`, `logoUrl`, `active`, `createdAt`, and `lastUpdate`;
- `config-service` owns the complete LegalDocument representation: `id`, `type`, `title`, `version`, `content`,
  `createdAt`, and `lastUpdate`;
- `config-service` owns the complete RawDivisionMapping representation: `id`, `rawDivisionName`, `divisionId`,
  `format`, `gender`, `leagueCode`, `season`, `createdAt`, `lastUpdate`, and the derived `mapped` flag;
- `config-service` owns the complete ScraperStatus representation: `id`, `name`, `enabled`, and `lastUpdate`;
- `Format`, `Gender`, and `ScraperName` are handwritten transport enums owned by `config-service` until the later,
  explicitly authorized contract-first phase replaces stable handwritten boundaries.

REF-011 establishes Team ownership:

- `teams-service` owns the complete Team representation: `id`, `clubId`, `rawName`, `name`, `shortName`, `leagueCode`,
  `divisionId`, `season`, `format`, `gender`, `followersCount`, `logoUrl`, `active`, `createdAt`, and `lastUpdate`;
- the gateway, notification service, search worker, competition scraper, and mobile application mirror that complete
  representation wherever they deserialize the Team HTTP resource;
- BFF coordinates remain a Club-derived view enrichment, while `TeamUpsertEvent`, deactivation commands, rankings, and
  search documents remain intentionally smaller purpose-specific models.

REF-012 establishes Pool ownership:

- `pools-service` owns the complete Pool representation: `id`, `poolCode`, `leagueCode`, `season`, `leagueName`,
  `rawName`, `name`, `shortName`, `divisionId`, `format`, `gender`, `followersCount`, `active`, `createdAt`, and
  `lastUpdate`;
- the gateway, notification service, search worker, competition scraper, and mobile application mirror that complete
  representation wherever they deserialize the Pool HTTP resource;
- `PoolUpsertEvent`, deactivation commands, rankings, enriched BFF views, and search documents remain intentionally
  smaller purpose-specific models.

REF-013 establishes Competition Association ownership:

- `competition-service` owns the complete Competition Association representation: `id`, `poolId`, `teamId`, `clubId`,
  `active`, `points`, `played`, `wins`, `losses`, `winsThreeToZero`, `winsThreeToOne`, `winsThreeToTwo`,
  `lossesZeroToThree`, `lossesOneToThree`, `lossesTwoToThree`, `wonSets`, `lostSets`, `wonPoints`, `lostPoints`,
  `pointsPenalty`, `coefSets`, `coefPoints`, `createdAt`, and `lastUpdate`;
- the gateway and competition scraper mirror that complete representation wherever they deserialize the association
  HTTP resource;
- bulk-deactivation requests, cascade commands, team rankings, and pool-with-ranking responses remain intentionally
  smaller purpose-specific models.

REF-014 establishes User ownership:

- `users-service` owns the complete User representation: `id`, `auth0Id`, `email`, `pseudo`, `firstName`, `lastName`,
  `pictureUrl`, `phoneNumber`, `active`, `createdAt`, `lastUpdate`, and `favorites`;
- each nested favorite is the explicit summary `entityType` and `entityId`, while the dedicated favorites endpoint owns
  the complete `id`, `entityType`, `entityId`, and `createdAt` representation;
- the gateway, matches service, notification service, and mobile application mirror the complete User representation at
  their real HTTP boundaries;
- Auth0 identities, S3 objects, Team/Pool follower counters, and RabbitMQ follow events remain provider or
  purpose-specific boundaries rather than User resource copies.

REF-015 establishes Match ownership:

- `matches-service` owns the complete Match representation: `id`, `matchCode`, `leagueCode`, `poolId`, `liveCode`,
  `teamIdA`, `teamIdB`, `matchDate`, `season`, `set`, `score`, `status`, `venue`, `firstReferee`, `secondReferee`,
  `active`, `createdAt`, `lastUpdate`, `liveUrl`, `liveProvider`, and `liveOwnerAuth0Id`;
- list, detail, day-group, create, and update routes now use that same representation, while write requests, day/pool
  containers, live-link moderation views, and event payloads remain explicit purpose-specific models;
- the competition scraper, gateway, and mobile application mirror the complete Match representation at their real
  HTTP boundaries, and the scraper writes only accepted create or update fields;
- live-link persistence, user lookup, moderation policy, and RabbitMQ publication are isolated behind the Match
  application boundary without changing V1 routes, database tables, routing keys, or runtime rules.

REF-016 establishes Notification ownership:

- `notification-service` owns the complete User Notification representation: `id`, `userId`, `type`, `title`, `body`,
  `deepLink`, `targetType`, `targetId`, `metadata`, `isRead`, `isOpened`, `createdAt`, `readAt`, and `openedAt`;
- the gateway and mobile application mirror that representation at their real HTTP boundaries, including typed
  notification values, structured metadata, UTC timestamps, and the `unread` count field;
- push-token registration, follower projections, delivery attempts, Match and Follow messages, Team/Pool/User HTTP
  mirrors, and Expo payloads remain explicit purpose-specific boundaries rather than duplicate Notification resources;
- persistence, event listeners, Auth0 service authentication, internal HTTP clients, and the Expo provider are isolated
  behind the Notification application boundary without changing V1 routes, database tables, queues, routing keys, or
  provider behavior.

REF-017 establishes Report ownership:

- `reports-service` owns the report creation input and the complete creation result: `id`, `number`, `htmlUrl`, `title`,
  and `state`;
- the gateway and mobile application mirror that result as a Report contract instead of exposing a GitHub-named DTO;
- multipart decoding, application assembly, image validation, image storage, issue creation, and best-effort notification
  are separate responsibilities, while GitHub, S3, and Discord models remain confined to their provider adapters;
- the V1 routes, multipart part names, image limits, result JSON, provider calls, and failure semantics remain unchanged.

The camelCase rule applies to transport names owned by Blockout:

- REST request and response bodies;
- service-to-service HTTP payloads;
- RabbitMQ payloads owned by Blockout;
- scraper requests and responses exchanged with Blockout APIs;
- mobile requests and responses exchanged with the gateway;
- HTTP query parameters exchanged between Blockout applications;
- JSON documents owned by Blockout workers where field names are part of an application interface.

Java, Python, and TypeScript transport models use native camelCase. Clients send
and read those names directly. Generic case-conversion utilities, Jackson naming
annotations, and Jackson naming strategies are not used.

It does not rename:

- database tables or columns;
- environment variables or Spring configuration keys;
- URL paths, HTTP headers, queue names, routing keys, or metrics;
- payloads imposed by Auth0, FFVB, LNV, Expo, GitHub, Discord, Mapbox, or another external provider;
- Python logging metadata or internal implementation dictionaries that are not transport contracts.

## Delivery order

The migration first inventories the boundaries, then protects representative flows with characterization tests. All repository-owned producers and consumers switch to camelCase in one atomic task. The final gate starts the required local APIs and validates both scrapers through controlled end-to-end flows.

No production deployment, broker operation, dual contract support, generated source, or unrelated business refactor is authorized by this direction.

## Current boundary inventory

| Application            | Blockout-owned JSON to migrate                                                 | External JSON to preserve                      |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| `club-scraper`         | Config status responses and club/competition API writes                        | Auth0 and FFVB responses                       |
| `competition-scraper`  | Config, competition, team, pool, and match API payloads                        | Auth0, FFVB, and LNV inputs                    |
| `clubs-service`        | REST bodies and club lifecycle events                                          | Mapbox responses                               |
| `competition-service`  | REST bodies and competition lifecycle events                                   | None identified                                |
| `config-service`       | REST bodies used by the gateway and scrapers                                   | None identified                                |
| `matches-service`      | REST bodies, internal user lookups, and match events                           | None identified                                |
| `mobile-gateway`       | Mobile-facing REST bodies and internal service payloads                        | Provider response models remain provider-owned |
| `notification-service` | REST bodies, consumed Blockout events, and stored notification JSON            | Auth0 and Expo payloads                        |
| `pools-service`        | REST bodies and pool lifecycle events                                          | None identified                                |
| `reports-service`      | REST report bodies                                                             | GitHub and Discord payloads                    |
| `search-service`       | Search REST bodies                                                             | Elasticsearch protocol fields                  |
| `search-worker`        | Consumed Blockout events, internal service payloads, and owned index documents | Elasticsearch protocol fields                  |
| `teams-service`        | REST bodies and team lifecycle events                                          | None identified                                |
| `users-service`        | REST bodies, internal service payloads, and follow events                      | Auth0 payloads                                 |
| `mobile`               | Gateway request and response bodies                                            | Auth0 and native framework values              |

Before REF-003, twelve Spring applications enabled global `SNAKE_CASE` serialization. Explicit `@JsonProperty` mappings also existed in service and gateway DTOs, both Python scrapers constructed snake_case Blockout payloads, and the mobile HTTP client converted request bodies to snake_case before converting responses back to camelCase. REF-003 migrated JSON, and REF-005 removed the remaining case-conversion layers while aligning Blockout query parameters.

## Search read ownership after REF-018

`search-service` owns three purpose-specific internal result contracts: club, team, and pool search results. These are read shapes, not copies of the complete resources owned by `clubs-service`, `teams-service`, or `pools-service`.

The HTTP layer exposes dedicated `*SearchInternalResponse` records, the application layer owns the search query and result views, and the Elasticsearch adapter alone owns index documents and query construction. Filter-only index fields such as `divisionId` remain outside response bodies. The V1 routes, camelCase field names, filters, index names, source fields, limits, timeout, and empty-query random selection remain unchanged.
