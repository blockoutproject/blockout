# MRG-373 Competition Match And User Casing Cleanup

- Status: implemented in the monorepo baseline
- Owners: `competition-service`, `matches-service`, and `users-service`
- Canonical wire format: camelCase
- Retained compatibility format: adapter-local v1 snake_case
- Production effect: none

## Purpose

MRG-373 removes the global Jackson `SNAKE_CASE` strategy from competition, matches, and users after their association,
ranking, lifecycle, match, live, moderation, account, favorite, and identity boundaries and callers migrated to
generated canonical camelCase contracts. Generated v2 models now serialize with each service's default Jackson mapper
instead of relying on generated annotations to override a conflicting global strategy.

The change is limited to HTTP casing. It changes no route, authorization rule, application command, persistence model,
database schema, event body, outbox record, RabbitMQ topology, or production resource.

## Closed Caller Gate

The cleanup follows the completed owner and caller migrations:

| Boundary                                               | Completed migration evidence  |
| ------------------------------------------------------ | ----------------------------- |
| Competition association and statistics                 | MRG-337                       |
| Competition ranking and lifecycle                      | MRG-359 and MRG-360           |
| Match core and day pages                               | MRG-338                       |
| Match live, history, reporting, and moderation         | MRG-361 and MRG-362           |
| User account, profile, favorites, and identity storage | MRG-339, MRG-363, and MRG-364 |
| Gateway user workflows                                 | MRG-343                       |
| Gateway competition, match, and live workflows         | MRG-368                       |
| Expo user, competition, and match workflows            | MRG-344 and MRG-346           |
| Competition scraper callers                            | MRG-349                       |

These repository migrations close the canonical implementation prerequisite. They do not claim that the future
MRG-304 production-retirement observation gate has completed and do not authorize removing v1.

## Boundary Ownership

The three service configuration files no longer set `spring.jackson.property-naming-strategy`. A current-source audit
finds no handwritten `@JsonProperty`, `@JsonAlias`, or `@JsonNaming` site under their main-source trees. The competition
ranking and matches live/user-copy annotations recorded by MRG-303 were already removed with their handwritten DTOs
during MRG-359 and MRG-361. MRG-373 verifies that zero slice-owned annotation remains instead of creating another
transport mapper.

Canonical v2 controllers continue to expose generated OpenAPI models. Focused boundary tests now use a default
`ObjectMapper` and prove camelCase lifecycle, ranking, association, match, live, moderation, account, favorite, page,
and Problem Details fields while rejecting their snake_case equivalents.

## Retained V1 Isolation

Supported v1 JSON controllers explicitly read and write strings through three adapter-local mappers:

- `LegacyCompetitionJson`
- `LegacyMatchesJson`
- `LegacyUsersJson`

Only these mappers retain `PropertyNamingStrategies.SNAKE_CASE`. Focused compatibility tests prove retained
competition arrays and commands, match/live/moderation shapes, and user/account/favorite shapes independently from
the Spring HTTP mapper. The adapters remain required until the MRG-304 production-retirement gate closes; this task
neither removes nor schedules their removal.

## Events And Rollback

MRG-373 changes no event serialization, outbox producer, deduplication ledger, listener configuration, queue, or
acknowledgement behavior. The MRG-371/MRG-372 outbox path owns audited v1 and canonical v2 event mappers independently
from any service HTTP naming strategy.

Before a future deployment, rollback is the previous service image with its matching configuration. Database,
outbox, and event contracts require no rollback. Reintroducing a global snake_case mapper into a current image is not
a safe canonical-v2 rollback because it would alter generated HTTP responses; the isolated v1 adapters remain the
supported compatibility path.

## Verification Evidence

- Focused default-mapper v2 boundary suites pass for competition, match core/live/moderation, user account, favorites,
  and identity Problem Details.
- Focused legacy JSON and v1 response-shape suites pass for all three retained adapters.
- The targeted Maven reactor for shared models, event contracts, outbox support, and the three services passes.
- Main-source searches find no global `SNAKE_CASE` setting or Blockout naming annotation in these services.
- Main-source `SNAKE_CASE` references are limited to the three documented v1 adapter-local mappers.
- Complete backend compilation, repository validation, deterministic generated-file checks, and CI are required
  before publication.

## Closed Scope

- MRG-374 and MRG-375 own the remaining service-specific global strategy removals.
- MRG-352 owns repository-wide Blockout-only annotation cleanup after all service waves close.
- MRG-353 owns obsolete Expo case-conversion removal.
- MRG-354 owns the final allowlisted repository guard.
- No deployment, production observation, v1 retirement, event cutover, MRG-9xx, or MRG-1000 work is performed or
  authorized.
- The active goal stops successfully before Phase MRG-900.
