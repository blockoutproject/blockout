# MRG-367 Mobile Gateway Catalog Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `mobile-gateway`
- Canonical BFF operations: nine club, team, and pool operations
- Production effect: none

## Purpose

MRG-367 migrates the club, team, and pool BFF workflows to generated `/api/v2/**` server interfaces and generated
clubs-, teams-, pools-, config-, and competition-service clients. Canonical API adapters map generated request and
response models immediately into immutable workflow-owned commands, snapshots, and views. Aggregation and policy stay
manual because they combine several owners and are not structural mappings.

The existing `/api/v1/**` controllers, generic services, handwritten clients, copied DTOs, `TeamGZone` compatibility
shapes, and version switches remain only as released-mobile coexistence adapters. They are not reused by the canonical
workflows and are expected to disappear after their caller, lineage, rollback, and traffic gates close.

## Canonical Operation Set

| Operation ID | Canonical operation           | Workflow owner | Downstream owners                        |
| ------------ | ----------------------------- | -------------- | ---------------------------------------- |
| `BFF-P-01`   | get public club               | club workflow  | clubs-service                            |
| `BFF-P-09`   | get public pool detail        | pool workflow  | pools, teams, clubs, config, competition |
| `BFF-P-10`   | list public pools by IDs      | pool workflow  | pools, config                            |
| `BFF-P-15`   | get public team detail        | team workflow  | teams, pools, clubs, config, competition |
| `BFF-P-16`   | list public teams by club     | team workflow  | teams, clubs, config                     |
| `BFF-P-17`   | list public teams by IDs      | team workflow  | teams, clubs, config                     |
| `BFF-S-01`   | update club and optional logo | club workflow  | clubs-service                            |
| `BFF-S-27`   | update pool                   | pool workflow  | pools-service                            |
| `BFF-S-28`   | update team and optional logo | team workflow  | teams-service                            |

The compatibility filter assigns each operation ID to both its v1 and v2 route without recording path values, ID
lists, tokens, multipart content, or downstream bodies.

## Projection And Privacy Policy

- Club output deliberately excludes owner-only phone, postal-code, and active-state fields. The workflow snapshot does
  not contain those values, so they cannot leak through a later transport mapper.
- Team and pool detail projections require their primary object, division, and every team named by a ranking or
  association. Missing required data becomes a stable BFF inconsistent-state failure instead of a partial fabricated
  detail.
- Batch-by-ID endpoints retain the legacy `HashSet` deduplication/order behavior, omit missing or inactive objects, and
  tolerate missing division or club enrichment. A team with no own logo may therefore keep a null logo in the batch
  response when its optional club lookup is absent.
- Teams-by-club retains downstream page order and requires the club only when a team needs the club logo fallback.
- Ranking rows retain the current ordered keys: points descending, penalty ascending, wins descending, set coefficient
  descending, then point coefficient descending. Exact ties remain stable in owner order.
- Team and pool detail fan-out is explicit: collect identifiers, fetch required snapshots, enrich club logo and
  coordinates once per distinct club, then project. Generated transport objects never enter the workflow or cache.
- Public downstream calls forward a user JWT when present and otherwise use M2M. Secure updates always forward the user
  JWT. No generated client adds retry or casing conversion.

## Cache Coexistence

Canonical caches use `mobileV2ClubById`, `mobileV2TeamById`, `mobileV2TeamsByClubId`, `mobileV2PoolById`,
`mobileV2Divisions`, and `mobileV2DivisionById`. These names are intentionally separate from the v1 caches: v1 stores
legacy mutable DTOs while v2 stores immutable application snapshots, so sharing a cache name would permit unsafe
cross-casting during coexistence.

Canonical mutations evict both their v2 cache and the corresponding legacy cache. Favorite follow/unfollow mutations
also evict both team and pool namespaces. This preserves released v1 behavior while preventing stale canonical
projections. The duplicate cache namespaces disappear with the v1 adapters; they are migration state, not the final
single-route design.

## Multipart And Generated Boundaries

Club and team image parts become defensively copied `BinaryPart` values at the API edge and temporary `File` values only
inside the generated outbound adapter. Temporary files are bounded by try-with-resources. Pool updates remain JSON-only.
Generated server models are confined to API adapters; generated downstream clients and models are confined to outbound
adapters and client configuration.

## Deployment And Rollback

The future provider-first order is clubs, teams, pools, config, and competition dual-route owner images; then the
dual-route mobile-gateway image; then MRG-345's generated Expo consumers. Before any v2 Expo consumer is released,
rollback may use the preceding v1-only BFF image. Once a v2 Expo consumer is active, rollback uses the retained
last-known-good dual-route BFF image unless the consumer is reverted to v1 first.

No production route, traffic, cache, service, or deployment is changed by MRG-367.

## Temporary Names And Removal

The canonical public `/api/v2/**` paths remain. Java coexistence names do not: `controllers/v1/**`, generic service and
client layers, copied DTOs including `TeamGZone`, `Legacy*`, source qualifiers such as `V2`/`v2`, and flags such as
`isV2` are removed after all production callers are canonical and the MRG-304/MRG-909 gates are satisfied. No file is
removed merely from its name; its active field lineage and rollback role must first be closed.

## Verification Evidence

- Maven generation and compilation prove all nine generated server methods and the four newly activated owner-client
  families compile with the existing generated config boundary.
- Seventy focused mobile-gateway tests prove optional batch enrichment, strict teams-by-club logo fallback, stable
  ranking with logo/coordinate enrichment, separate cache registration, `404`-only nullable owner lookups, and all nine
  payload-free compatibility mappings.
- Source inspection proves private club fields cannot enter the canonical view, ranking keys are explicit, generated
  types remain adapter-owned, and v1/v2 cache value types use separate namespaces with cross-version eviction.
- Contract tests, deterministic generation, full backend packaging, documentation validation, Maaatch structural
  comparison, Prettier, and whitespace checks remain publication gates.

## Closed Scope

- No owner-service, Expo, Orval, scraper, event, database, standalone repository, production environment, or Maaatch
  runtime is changed.
- Existing v1 routes, responses, snake_case behavior, caches, and callers remain available.
- MRG-345 owns the Expo catalog consumer cutover. MRG-375 and the deep MRG-400 cleanup slices own post-caller source
  retirement. MRG-909 remains outside this goal.

The active goal stops before Phase MRG-900.
