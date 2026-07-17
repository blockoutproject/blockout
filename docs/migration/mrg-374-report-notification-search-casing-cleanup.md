# MRG-374 Report Notification And Search Casing Cleanup

- Status: implemented in the monorepo baseline
- Owners: `reports-service`, `notification-service`, `search-service`, and `search-worker`
- Canonical wire format: camelCase
- Retained compatibility format: adapter-local v1 snake_case
- Production effect: none

## Purpose

MRG-374 completes the report, notification, search, and search-worker casing wave after their canonical REST owners,
generated downstream clients, provider adapters, worker snapshot clients, gateway callers, and Expo callers migrated.
Reports, notifications, and search-service had already removed their global Jackson naming strategies while isolating
v1 during MRG-340 through MRG-342. This task removes the remaining `search-worker` global `SNAKE_CASE` setting and
verifies the complete four-module boundary.

The change is limited to HTTP/client casing configuration. It changes no route, authorization rule, application
record, provider request, Elasticsearch document field, database schema, event body, RabbitMQ topology, or production
resource.

## Closed Caller Gate

The cleanup follows the completed owner and caller migrations:

| Boundary                                                       | Completed migration evidence           |
| -------------------------------------------------------------- | -------------------------------------- |
| Reports owner and provider isolation                           | MRG-340                                |
| Notification inbox, mutation, delivery, and provider isolation | MRG-341, MRG-365, and MRG-366          |
| Search owner and Elasticsearch document isolation              | MRG-342                                |
| Worker club, team, pool, and division generated clients        | MRG-334, MRG-335, MRG-336, and MRG-376 |
| Gateway report, notification, and search workflows             | MRG-343                                |
| Expo report, notification, and search workflows                | MRG-347                                |

These repository migrations close the canonical implementation prerequisite. They do not claim that the future
MRG-304 production-retirement observation gate has completed and do not authorize removing v1.

## Boundary Ownership

None of the four module configuration files now sets `spring.jackson.property-naming-strategy`. A current-source
audit finds no handwritten `@JsonProperty`, `@JsonAlias`, or `@JsonNaming` site in their main sources. The old
Blockout report request, notification downstream copies, and worker snapshot copies recorded by MRG-303 were already
removed by their owner/runtime migrations. MRG-374 verifies zero slice-owned naming annotation remains instead of
creating another transport mapper.

Search-worker does not serve a REST boundary. Its authenticated `RestTemplate` instances and generated config, club,
team, and pool clients already consume canonical camelCase pages and map them immediately into immutable worker
snapshots. Focused client tests exercise literal camelCase bodies and canonical v2 routes for all four providers.

## Retained Compatibility And External Mappings

Supported v1 JSON controllers explicitly use three adapter-local mappers:

- `LegacyReportsJson`
- `LegacyNotificationsJson`
- `LegacySearchJson`

Only these mappers retain `PropertyNamingStrategies.SNAKE_CASE`. Their focused tests preserve report multipart JSON
and provider-shaped response keys, notification pages and push-token input, and search raw arrays independently from
the Spring HTTP mapper. They remain required until the MRG-304 production-retirement gate closes.

Three `@JsonIgnoreProperties(ignoreUnknown = true)` annotations remain on club, team, and pool Elasticsearch source
documents. They are non-naming store-boundary tolerance, not Blockout REST conversion, and are intentionally retained.
GitHub SDK behavior, Discord webhook content, Expo SDK messages/tickets, S3 keys, and Elasticsearch field names remain
confined to their infrastructure adapters without being renamed or projected into canonical REST models.

## Events And Rollback

MRG-374 changes no Rabbit converter, event model, routing key, queue, listener, acknowledgement, retry, or index/cache
projection. Rabbit converters construct their own audited camelCase mapper independently from Spring HTTP naming.

Before a future deployment, rollback is the previous search-worker image with its matching configuration. Reports,
notifications, and search-service have no new runtime change in this task. Database, index, cache, and event contracts
require no rollback. Reintroducing a global snake_case mapper is not a safe canonical-client rollback; the isolated v1
HTTP adapters remain the supported compatibility path.

## Verification Evidence

- Focused report, notification, and search boundary suites pass for canonical generated models and retained v1 JSON.
- The four search-worker generated-client suites pass with canonical camelCase response bodies, v2 routes, bearer
  transport, complete page aggregation, and immediate immutable mapping.
- The targeted Maven reactor for shared models, event contracts, and all four modules passes.
- Main-source searches find no global `SNAKE_CASE` setting or Blockout naming annotation in the four modules.
- Main-source `SNAKE_CASE` references are limited to the three documented v1 adapter-local mappers.
- The three retained Jackson annotations are non-naming Elasticsearch unknown-field tolerance.
- Complete backend compilation, repository validation, deterministic generated-file checks, and CI are required
  before publication.

## Closed Scope

- MRG-375 owns the remaining mobile-gateway global strategy removal.
- MRG-352 owns repository-wide Blockout-only annotation cleanup after all service waves close.
- MRG-353 owns obsolete Expo case-conversion removal.
- MRG-354 owns the final allowlisted repository guard, including explicit external-store and vendor exclusions.
- No deployment, provider call, production observation, v1 retirement, event cutover, MRG-9xx, or MRG-1000 work is
  performed or authorized.
- The active goal stops successfully before Phase MRG-900.
