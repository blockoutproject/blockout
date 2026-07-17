# MRG-375 Mobile Gateway Casing Cleanup

- Status: implemented in the monorepo baseline
- Owner: `mobile-gateway`
- Canonical wire format: camelCase
- Retained compatibility format: explicit v1 DTO snake_case
- Production effect: none

## Purpose

MRG-375 removes the last global Jackson `SNAKE_CASE` strategy in the backend after every mobile-gateway canonical
inbound boundary, generated downstream client, and Expo caller migrated to camelCase. The default Spring mapper now
matches generated v2 contracts without a workspace-wide naming override.

The released-mobile v1 BFF remains available. Its handwritten DTO graph is now explicit about every compound
snake_case property instead of relying partly on the removed global strategy. This is temporary MRG-304 coexistence
scaffolding: MRG-352 owns replacing these field annotations with one adapter-local v1 mapper after all global cleanup
waves close.

## Closed Caller Gate

The cleanup follows the completed gateway and Expo migrations:

| Boundary                                                                     | Completed migration evidence |
| ---------------------------------------------------------------------------- | ---------------------------- |
| Legal document gateway slice                                                 | MRG-332                      |
| Configuration, user, report, search, and notification gateway slices         | MRG-343                      |
| Club, team, and pool gateway slices                                          | MRG-367                      |
| Competition, match, live, moderation, and federation-document gateway slices | MRG-368                      |
| Expo authentication and configuration callers                                | MRG-344                      |
| Expo club, team, and pool callers                                            | MRG-345                      |
| Expo competition, match, live, and moderation callers                        | MRG-346                      |
| Expo report, search, and notification callers                                | MRG-347                      |

These repository migrations close the canonical implementation prerequisite. They do not claim that the future
MRG-304 production-retirement observation gate has completed and do not authorize removing v1.

## Canonical Isolation

`mobile-gateway` no longer sets `spring.jackson.property-naming-strategy`. Canonical controllers and generated
downstream clients use generated OpenAPI request/response models under role-owned gateway ports and application
projections. No handwritten `models.dto` type or handwritten `@JsonProperty`, `@JsonAlias`, or `@JsonNaming` site is
referenced from canonical gateway packages.

A focused default-mapper test proves generated fields such as `minVersionIos` and `forceUpdateMessage` serialize in
camelCase and reject their snake_case spellings. Existing generated-controller and downstream-client tests preserve
canonical mapping, multipart ownership, auth transport, errors, and workflow behavior.

## Retained V1 Isolation

The v1 controllers, legacy services, legacy downstream clients, and `models.dto` package remain solely for released
mobile compatibility. MRG-303 inventoried 220 explicit snake_case properties in that graph. Twenty-four additional
compound fields still depended implicitly on the global strategy, covering raw-mapping updates, push tokens, search
results, users, and favorites. MRG-375 makes those properties explicit before removing the global setting.

All 244 `@JsonProperty` sites are now confined to `models.dto`; no camelCase Java field in that package lacks an
explicit snake_case property. Focused default-mapper tests prove representative request deserialization and response
serialization for every newly explicit field family. The annotations are not target architecture: MRG-352 will remove
them only after installing the final adapter-local v1 conversion and proving the same byte shapes.

The v1 BFF remains mandatory until supported mobile versions age out and the MRG-304 production-retirement gate
closes. This task neither removes nor schedules any v1 route.

## Rollback

Before a future deployment, rollback is the previous mobile-gateway image with its matching global naming
configuration. No owner service, Expo bundle, database, cache namespace, event contract, or provider resource requires
rollback. Reintroducing only the property into a current image is not a valid partial rollback because canonical v2
would again depend on generated annotations overriding a conflicting mapper.

## Verification Evidence

- The casing boundary suite passes for canonical generated camelCase and retained v1 request/response snake_case with
  the default mapper.
- Canonical relay, generated legal-document client, and shared downstream-client tests pass beside the new casing
  suite.
- Source searches prove no backend application config retains global `SNAKE_CASE`.
- Source confinement proves all 244 handwritten naming annotations remain only in the v1 DTO graph and none enters a
  canonical package.
- Every compound field in the v1 DTO graph has an explicit property during this intermediate coexistence step.
- Complete backend compilation, repository validation, deterministic generated-file checks, and CI are required
  before publication.

## Closed Scope

- MRG-352 owns replacement of temporary Blockout-only annotations with the adapter-local v1 mapper.
- MRG-353 owns obsolete Expo case-conversion removal.
- MRG-354 owns the final allowlisted repository guard.
- No form migration, mobile release, deployment, production observation, v1 retirement, MRG-9xx, or MRG-1000 work is
  performed or authorized.
- The active goal stops successfully before Phase MRG-900.
