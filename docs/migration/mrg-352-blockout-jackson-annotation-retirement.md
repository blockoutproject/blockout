# MRG-352 Blockout Jackson Annotation Retirement

- Status: implemented in the monorepo baseline
- Owners: backend REST boundaries and `mobile-gateway`
- Canonical wire format: camelCase
- Retained compatibility format: explicit MRG-304 v1 adapter snake_case
- Production effect: none

## Purpose

MRG-352 removes Blockout-owned Jackson property-name annotations after the canonical v2 callers and all global
`SNAKE_CASE` settings have already migrated. Current backend source now contains no `@JsonProperty`, `@JsonAlias`, or
`@JsonNaming` site. Canonical Spring mappers remain camelCase by default.

The released-mobile v1 BFF remains available. Its snake_case contract now belongs to one explicit mobile-gateway v1
JSON adapter instead of 244 field annotations, matching the adapter ownership already established for each retained
owner-service v1 boundary by MRG-304.

## Removed Naming Surface

Before this task, all 244 remaining Blockout property annotations were confined to the historical
`mobile-gateway/models/dto` graph. Every annotation value matched the deterministic snake_case spelling of its Java
field, so no exceptional wire key required a retained property override. MRG-352 removes those annotations and their
imports.

Backend application source now has:

- zero `@JsonProperty` sites;
- zero `@JsonAlias` sites;
- zero `@JsonNaming` sites; and
- zero global Jackson naming strategies.

Generated OpenAPI artifacts keep their generator-owned annotations. They are build output, not handwritten naming
adapters, and continue to define canonical camelCase contract fields.

## Explicit V1 Transport Ownership

Exactly twelve application-source mappers retain local `PropertyNamingStrategies.SNAKE_CASE` ownership:

| Boundary | Adapter |
| --- | --- |
| Clubs | `LegacyClubsJson` |
| Competition | `LegacyCompetitionJson` |
| Configuration | `LegacyConfigJson` |
| Legal documents | `LegacyLegalDocumentJson` |
| Matches | `LegacyMatchesJson` |
| Mobile BFF | `LegacyMobileGatewayJson` |
| Notifications | `LegacyNotificationsJson` |
| Pools | `LegacyPoolsJson` |
| Reports | `LegacyReportsJson` |
| Search | `LegacySearchJson` |
| Teams | `LegacyTeamsJson` |
| Users | `LegacyUsersJson` |

The mobile BFF adapter is connected only to the historical transport graph:

- a read-only MVC converter accepts types under `models.dto` and never writes responses;
- response advice scoped to `controllers.v1` converts legacy response bodies to snake_case JSON trees;
- dedicated authenticated and M2M `RestTemplate` beans serialize and deserialize legacy downstream DTOs without
  changing the generated canonical clients; and
- multipart and manually parsed v1 request bodies use the same adapter explicitly.

The default `ObjectMapper`, generated v2 controllers, canonical exception handlers, security Problem Details writers,
and generated downstream clients do not use this adapter.

## Retained Non-Naming Jackson Behavior

Six `@JsonIgnoreProperties(ignoreUnknown = true)` sites remain on Elasticsearch documents and their historical mobile
search projections. They preserve tolerant document reads and do not rename a wire property. Entity `@JsonIgnore`
and legacy response `@JsonInclude` sites likewise control inclusion only; they are not casing adapters. No
Blockout-specific naming annotation remains at a vendor boundary because none is currently required.

## Compatibility Evidence

- A default mapper serializes generated canonical models with camelCase.
- The explicit mobile v1 adapter preserves representative response and request snake_case fields across configuration,
  notifications, search, users, and favorites.
- MVC converter tests prove only historical DTOs are eligible for v1 request decoding and that the converter cannot
  write responses.
- Response-advice tests prove v1 DTO bodies become snake_case JSON trees.
- Dedicated REST transport tests prove the legacy mapper is isolated from the canonical transport mapper.
- A source-to-baseline comparison proves every removed property annotation was exactly reproducible by the local
  snake_case strategy.
- Focused v1 compatibility suites, complete backend compilation, repository validation, deterministic generated-file
  checks, and CI are required before publication.

## Rollback

Before a future deployment, rollback is the previous `mobile-gateway` image with the 244 DTO annotations and without
the new v1 adapter wiring. Owner services and their existing v1 adapters are unchanged. No database, cache, event,
provider, Expo bundle, or production resource requires rollback.

Do not partially restore a global naming strategy: it would conflict with canonical generated v2 boundaries. If a
legacy mobile regression is observed, restore the previous gateway image as one unit.

## Closed Scope

- MRG-304 still owns the production observation and retirement gate for every v1 route and adapter.
- MRG-353 owns obsolete Expo case-conversion removal.
- MRG-354 owns the repository-wide allowlisted casing guard.
- No form migration, Expo release, deployment, production observation, v1 retirement, event cutover, MRG-9xx, or
  MRG-1000 work is performed or authorized.
- The active goal stops successfully before Phase MRG-900.
