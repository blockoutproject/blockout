# MRG-368 Mobile Gateway Match And Live Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `mobile-gateway`
- Canonical BFF operations: eleven match, live, moderation, history, and signed-document operations
- Production effect: none

## Purpose

MRG-368 migrates the remaining match and live BFF workflows to generated `/api/v2/**` server interfaces and generated
matches-, competition-, pools-, teams-, clubs-, and config-service clients. Generated inbound models stop at the API
adapter, generated downstream models stop at outbound adapters, and immutable application records own the distinct
list, detail, history, moderation, and live-command roles.

The existing `/api/v1/**` controllers, generic match service, handwritten clients, copied DTOs, snake_case responses,
and released-mobile behavior remain isolated coexistence adapters. This task does not remove them, switch Expo, or
change a production route.

## Canonical Operation Set

| Operation ID | Canonical operation             | BFF role             | Downstream owner     |
| ------------ | ------------------------------- | -------------------- | -------------------- |
| `BFF-P-06`   | resolve signed federation PDF   | binary continuation  | federation provider  |
| `BFF-P-07`   | get enriched match detail       | all-or-error detail  | matches and catalogs |
| `BFF-P-08`   | list enriched match days        | partial list page    | matches and catalogs |
| `BFF-S-13`   | upsert match live link          | command relay        | matches-service      |
| `BFF-S-14`   | delete match live link          | idempotent command   | matches-service      |
| `BFF-S-15`   | report match live link          | command relay        | matches-service      |
| `BFF-S-16`   | list match live-link history    | canonical page relay | matches-service      |
| `BFF-S-17`   | list live-link moderation cards | partial page         | matches and catalogs |
| `BFF-S-18`   | approve pending live link       | command relay        | matches-service      |
| `BFF-S-19`   | reject pending live link        | command relay        | matches-service      |
| `BFF-S-20`   | reactivate eligible live link   | command relay        | matches-service      |

The payload-free compatibility filter assigns these IDs to both v1 and v2 paths without logging route identifiers,
tokens, URLs, report reasons, or response bodies.

## Projection And Partial-Result Policy

- Match-day pagination remains a count of distinct `Europe/Paris` dates rather than match rows. A null or empty owner
  page becomes a terminal empty BFF page with `hasNext=false` and `nextPage=null`.
- Later enrichment-only omissions retain owner `hasNext` and `nextPage`. Missing pools, missing divisions, inactive
  divisions, empty pools, and resulting empty days are silently removed without reordering retained groups.
- Missing match-list teams remain nullable sides. A present team uses its own logo or the current club-logo fallback;
  no partial-result marker is invented.
- Match detail remains all-or-error for the match, pool, division, both sides, every association team, and the signing
  inputs. The ranking keeps points descending, penalty ascending, wins descending, set coefficient descending, then
  point coefficient descending. Exact ties retain association order and no ordinal or immutable-ID tie-breaker is
  added.
- Live-link history retains matches-service page order and `PageInfo`. Moderation silently removes rows whose pool,
  active division, or either team cannot be enriched while retaining the downstream page metadata.
- Live upsert, delete, report, approve, reject, and reactivate remain matches-service decisions. The BFF forwards the
  authenticated user JWT and does not reproduce provider, ownership, quota, moderation, or state-transition policy.

## Signed Federation Documents

The detail workflow creates both short-lived canonical v2 continuation URLs from the existing signed-token service.
The signing inputs remain season, league code, and match code; a missing input fails the whole detail. The continuation
validates the token, accepts only `address` or `sheet`, retains the existing FFVB and LNV provider requests, returns an
inline no-store PDF, maps an invalid or expired token to `401`, and maps provider failure to `502` Problem Details.

Tokens and provider payloads never enter compatibility telemetry. The provider transport remains a dedicated external
`RestTemplate` with the existing proxy, user agent, and timeouts.

## Generated Boundaries And Authentication

Public match reads select the generated user-forwarding client when a user JWT exists and otherwise use generated M2M
clients. Catalog enrichment follows the same established public transport selection. Secure live and moderation
operations use only generated user-forwarding clients. Generated response and request types are confined to API and
outbound packages; application workflows do not import generated contracts, copied legacy DTOs, or v1 controllers.

The match list retains explicit sequential distinct-ID fan-out. This task introduces no batching, concurrency, retry,
fallback, cache, or downstream call-order redesign.

## Deployment And Rollback

The future provider-first order is matches, competition, pools, teams, clubs, and config dual-route owner images; then
the dual-route mobile-gateway image; then MRG-346's generated Expo consumers. Before any v2 Expo consumer is released,
rollback may use the preceding v1-only BFF image. Once a v2 consumer is active, rollback uses the retained last-known-
good dual-route BFF image unless Expo returns to v1 first.

No production image, traffic, service, route, token key, proxy, or deployment is changed by MRG-368.

## Temporary Names And Removal

The canonical public `/api/v2/**` routes remain stable. Java coexistence names do not: `controllers/v1/**`, generic
match service and handwritten client layers, copied match/competition DTOs, source qualifiers such as `V2`/`v2`, and
compatibility-only signed-document adapters are removed only after the MRG-304 caller, traffic, lineage, and rollback
gates close. No v1 source is removed merely because the v2 runtime now exists.

## Verification Evidence

- Maven generation, compilation, and an environment-backed Spring context start prove all eleven generated server
  methods, the generated matches client family, transport qualifiers, and application wiring resolve together.
- Eighty-one focused mobile-gateway tests prove retained compatibility behavior and all eleven payload-free operation
  mappings. The context smoke test remains excluded from the normal local gate because the current JDK cannot
  self-attach Mockito; with bounded dummy configuration the application context starts before that unrelated listener
  failure.
- Source inspection proves generated types remain adapter-owned, the five-key ranking comparator is explicit, list and
  moderation drops preserve owner continuation metadata, missing list sides remain nullable, detail dependencies are
  strict, and live decisions remain downstream relays.
- Contract tests, source lint, deterministic generation, full backend packaging, documentation validation, Maaatch
  comparison, Prettier, and whitespace checks remain publication gates.

## Closed Scope

- Existing v1 routes, snake_case JSON, copied DTOs, handwritten clients, and released Expo callers remain available.
- Expo, Orval output, owner-service runtime, scrapers, events, databases, standalone repositories, production, and
  Maaatch are unchanged.
- MRG-346 owns the Expo match/live consumer cutover. MRG-375 and the deep MRG-400 cleanup slices own post-caller source
  retirement. MRG-909 remains outside this goal.

The active goal stops before Phase MRG-900.
