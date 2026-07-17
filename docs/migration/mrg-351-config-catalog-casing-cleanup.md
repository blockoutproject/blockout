# MRG-351 Config And Catalog Casing Cleanup

- Status: implemented in the monorepo baseline
- Owners: `config-service`, `clubs-service`, `teams-service`, and `pools-service`
- Canonical wire format: camelCase
- Retained compatibility format: adapter-local v1 snake_case
- Production effect: none

## Purpose

MRG-351 removes the global Jackson `SNAKE_CASE` strategy from config, clubs, teams, and pools after their canonical v2
owners and known internal, Expo, gateway, and Python callers migrated to generated camelCase contracts. Generated v2
models now serialize with each service's default Jackson mapper rather than relying on generated annotations to
override a conflicting global strategy.

The change is deliberately limited to HTTP casing. It changes no route, authorization rule, application command,
persistence model, database schema, event body, RabbitMQ topology, or production resource.

## Closed Caller Gate

The cleanup follows the completed owner and caller migrations rather than preceding them:

| Boundary                                 | Completed migration evidence                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Config owner and worker                  | MRG-376 generated v2 owner controllers and the generated search-worker config client |
| Config gateway, Expo, and Python callers | MRG-343, MRG-344, MRG-348, and MRG-349                                               |
| Clubs owner                              | MRG-334                                                                              |
| Teams owner                              | MRG-335                                                                              |
| Pools owner                              | MRG-336                                                                              |
| Catalog gateway and Expo callers         | MRG-345 and MRG-367                                                                  |
| Catalog Python callers                   | MRG-348 and MRG-349                                                                  |

These repository migrations close the implementation prerequisite for the canonical paths. They do not assert that
the future MRG-304 production-retirement observation gate has completed and do not authorize v1 removal.

## Boundary Ownership

The four service configuration files no longer set `spring.jackson.property-naming-strategy`. A current-source audit
finds no handwritten `@JsonProperty`, `@JsonAlias`, or `@JsonNaming` site under the four service main-source trees.
The older update DTO annotations recorded by MRG-303 were already removed with those DTOs during the owner runtime
migrations; MRG-351 records and verifies that zero such slice-owned annotation remains instead of creating a
replacement adapter.

Canonical v2 controllers continue to expose generated OpenAPI models. Their focused boundary tests now use a default
`JsonMapper` and prove camelCase properties such as `mainColor`, `secondaryColor`, `shortName`, `divisionId`,
`createdAt`, and `updatedAt`, while rejecting the corresponding snake_case spellings.

## Retained V1 Isolation

Every supported v1 JSON controller in these services already reads and writes an explicit JSON string through one of
five adapter-local mappers:

- `LegacyConfigJson`
- `LegacyLegalDocumentJson`
- `LegacyClubsJson`
- `LegacyTeamsJson`
- `LegacyPoolsJson`

Only those mappers retain `PropertyNamingStrategies.SNAKE_CASE`. The associated v1 tests prove their snake_case
request and response behavior independently from the Spring HTTP mapper. The adapters remain required until the
MRG-304 production-retirement gate closes; this task neither removes nor schedules their removal.

## Events And Rollback

MRG-351 changes no event serialization. The MRG-371 outbox serializer owns its audited v1 and canonical v2 event
mappers independently from any service HTTP naming strategy.

Before a future deployment, rollback is the previous service image together with its matching configuration. The
database and event contracts require no rollback. Reintroducing a global snake_case mapper into a current image is
not a safe canonical-v2 rollback because it would alter generated HTTP responses; the isolated v1 adapters are the
supported compatibility path.

## Verification Evidence

- Focused default-mapper v2 boundary suites pass for config, legal documents, clubs, teams, and pools.
- Focused legacy JSON suites pass for all five retained v1 mappers.
- The targeted Maven reactor for shared models, event contracts, outbox support, and the four services passes.
- Main-source searches find no global `SNAKE_CASE` setting or Blockout naming annotation in the four services.
- Main-source `SNAKE_CASE` references are limited to the five documented v1 adapter-local mappers.
- Complete backend compilation, repository validation, deterministic generated-file checks, and CI are required
  before publication.

## Closed Scope

- MRG-373 through MRG-375 own the remaining service-specific global strategy removals.
- MRG-352 owns the repository-wide Blockout-only annotation cleanup after all service waves close.
- MRG-353 owns obsolete Expo case-conversion removal.
- MRG-354 owns the final allowlisted repository guard.
- No deployment, production observation, v1 retirement, MRG-9xx, or MRG-1000 work is performed or authorized.
- The active goal stops successfully before Phase MRG-900.
