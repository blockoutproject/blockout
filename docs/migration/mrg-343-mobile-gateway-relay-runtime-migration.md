# MRG-343 Mobile Gateway Relay Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `mobile-gateway`
- Canonical BFF operations: 28 configuration, report, search, notification, user, and favorite operations
- Production effect: none

## Purpose

MRG-343 migrates the remaining configuration, report, search, notification, user, and favorite BFF relays to generated
`/api/v2/**` server interfaces and generated downstream service clients. Each canonical workflow owns immutable
application commands and views. Generated transport models are mapped immediately at inbound and outbound adapters,
and multipart files are represented by an immutable application attachment between those edges.

The existing `/api/v1/**` controllers, generic services, copied DTOs, and handwritten clients remain active solely as
coexistence adapters. They are not the target architecture and are not reused by canonical workflows. MRG-343 does not
remove them because released Expo versions still call v1 and the MRG-304 mobile and zero-traffic gates are not closed.

The legal-document workflow remains the separate MRG-332 pilot. Club, team, and pool aggregation belongs to MRG-367;
competition, match, and live aggregation belongs to MRG-368.

## Boundary Ownership

| Workflow family     | Inbound adapter                              | Application owner                  | Outbound adapter and generated client                                |
| ------------------- | -------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| configuration       | `configuration/runtime/api`                  | `MobileConfigurationWorkflow`      | config app-status, division, raw-mapping, and scraper clients        |
| report              | `report/api`                                 | `MobileReportWorkflow`             | generated reports client and bounded temporary multipart bridge      |
| search              | `search/api`                                 | `MobileSearchWorkflow`             | generated search client and immediate result projection              |
| notifications       | `notification/api`                           | `MobileNotificationWorkflow`       | generated notification clients and generated config logo client      |
| user and favorites  | `user/api`                                   | `MobileUserWorkflow`               | generated user-account and favorite clients                          |
| cross-cutting v2    | `shared/api`                                 | request/error/compatibility policy | Problem Details, security writer, and payload-free telemetry         |
| generated transport | Maven `target/generated-sources/openapi/**`  | adapter-only                       | server interfaces plus config/users/reports/notification/search DTOs |
| v1 coexistence      | existing `controllers/v1`, services and DTOs | released mobile compatibility only | existing handwritten v1 clients and global snake-case behavior       |

Generated server models appear only in canonical API adapters. Generated downstream models and clients appear only in
outbound adapters and their configuration. Application records do not depend on Spring MVC, OpenAPI, handwritten v1
DTOs, or downstream generated packages.

## Canonical Operation Set

MRG-343 activates these generated BFF operation families in the shadow monorepo:

- configuration: `BFF-P-02` through `BFF-P-04`, `BFF-S-02` through `BFF-S-06`, and `BFF-S-08` through `BFF-S-12`;
- report and search: `BFF-P-11` through `BFF-P-14`;
- notifications: `BFF-S-21` through `BFF-S-26`;
- account and favorites: `BFF-S-29` through `BFF-S-33`.

The compatibility filter assigns all 28 operation IDs for both v1 and v2 without recording payloads, query values,
tokens, user identifiers, multipart content, or downstream bodies. The separate legal telemetry continues to own
`BFF-P-05` and `BFF-S-07`.

## Preserved Behavior

The canonical workflows preserve the approved BFF behavior within the v2 source contracts:

- public configuration, report, and search calls forward an authenticated user JWT when one exists and otherwise use
  the existing Auth0 M2M transport;
- secure configuration, notification, user, and favorite calls use the forwarded authenticated JWT;
- the existing connection/read timeout interceptors, token refresh, and no-implicit-retry behavior remain unchanged;
- division list/detail caches and user-favorite team/pool cache eviction retain their current cache names and intent;
- notification pages retain downstream ordering and page metadata, enrich division logos, cache successful and missing
  lookups, and contain enrichment failures without failing the page;
- report, profile-image, and division-image multipart content is read at the inbound edge, defensively copied, and
  materialized as a generated-client `File` only for the duration of the outbound call;
- generated downstream Problem Details retain safe status, code, detail, and request ID while the BFF rebinds the
  instance to its own route; unknown bodies and transport failures use safe BFF-owned fallbacks;
- public and secure v2 routes emit camelCase and never invoke a snake/camel converter.

The v1 paths preserve their existing authentication, snake_case JSON, statuses, error maps, nulls, collections,
multipart shape, cache behavior, ordering, fallback, and partial-failure behavior. The global mobile-gateway Jackson
snake-case strategy remains temporarily because those v1 DTOs still depend on it; MRG-375 removes it only after the
generated Expo v2 boundary is active.

## Temporary Names And Removal

The following source is migration scaffolding and is explicitly expected to disappear:

- existing `controllers/v1/**`, generic `services/**`, `services/clients/**`, copied `models/dto/**`, and v1-only
  conversion helpers after their callers and field-lineage gates close;
- `Legacy*` classes and adapter-local snake-case transport after the MRG-304 production retirement gate;
- source qualifiers such as `V2`, `v2`, and `isV2` once only one Java implementation remains and version branching is
  no longer needed;
- temporary duplicate shapes such as team/zone compatibility DTOs when MRG-367, MRG-413 through MRG-417, and the
  MRG-267 lineage evidence prove their canonical replacement.

The public `/api/v2/**` route version does not disappear: it remains the canonical external contract. Only migration
names and duplicate Java source structures are removed. A file is not deleted merely because its name looks legacy;
its production callers, data lineage, rollback role, and 30-day evidence must first be closed. Final production v1
route removal remains MRG-909 and is outside this goal.

## Deployment And Rollback

The future provider-first order is:

1. retain validated dual-route owner-service images for config, reports, search, notifications, and users;
2. deploy and validate a dual-route mobile-gateway image containing the generated v2 clients and server interfaces;
3. retain that image as the mobile rollback baseline;
4. migrate Expo consumers through MRG-344 and MRG-347;
5. observe per-operation v1/v2 telemetry before any compatibility removal.

Before any v2 Expo consumer is released, mobile-gateway may roll back to the preceding v1-only image. After a v2 Expo
consumer is active, rollback uses the last known-good dual-route image unless the mobile consumer is first reverted to
v1. No task in this goal activates production traffic.

## Verification Evidence

- Maven generation and compilation prove that the five canonical controllers implement every generated server method
  and that all five downstream client families compile from committed owner bundles.
- Fifty-six focused mobile-gateway tests prove the legal pilot remains intact, all 28 compatibility operation mappings,
  JWT-versus-M2M selection, URL normalization, immutable multipart bytes, missing-logo caching, and safe camelCase
  security/downstream Problem Details.
- Source confinement checks prove generated server types remain in API adapters and downstream generated types remain
  in outbound adapters/configuration; no canonical slice contains Jackson naming annotations or case conversion.
- Contract validation, two-run deterministic generation, full backend packaging, documentation validation, Maaatch
  structural comparison, Prettier, and whitespace checks are publication gates.

## Closed Scope

- No v1 route, DTO, service, client, global Jackson setting, or compatibility behavior is removed.
- No owner-service, Expo runtime, Orval configuration, generated mobile output, scraper, event, database, standalone
  repository, production environment, or Maaatch file changes.
- Blockout's existing Orval configuration remains authoritative. Maaatch guides the Axios/TanStack boundary and proven
  conventions, but MRG-343 does not simplify Blockout-specific deterministic output, mutator, split, or Zod settings.
- MRG-367 and MRG-368 own the remaining BFF workflow families; MRG-344 and MRG-347 own these Expo consumers; MRG-375,
  MRG-413, MRG-414, and MRG-417 own cleanup after caller and lineage proof.

The active goal stops before Phase MRG-900.
