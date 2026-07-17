# MRG-361 Matches Live-Link And History Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `MATCH-08` through `MATCH-10`
- Owner: `matches-service`
- Deferred callers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-361 introduces generated canonical boundaries for live-link history, upsert, and delete while preserving the
deployed ownership, quota, provider, timing, state-transition, ordering, and compatibility behavior. Canonical
`/api/v2/**` controllers implement the generated `MatchLiveLinkHistoryApi` and `MatchLiveLinksApi`, map generated
camelCase transport models immediately to role-owned application records, and use the progressive matches-service
Problem Details boundary. Existing `/api/v1/**` routes remain isolated snake_case adapters invoking the same
application service.

The previously broad OpenAPI tags are split into `MatchLiveLinkHistory`, `MatchLiveLinks`, `MatchLiveLinkReports`, and
`MatchModeration`. This is a generated-interface ownership correction only: no route, payload, status, security rule,
or live behavior changes. Reporting and moderation remain entirely owned by MRG-362.

## Boundary Ownership

| Concern                     | Owner and target                                                              |
| --------------------------- | ----------------------------------------------------------------------------- |
| Upsert intent               | `UpsertMatchLiveLinkCommand`                                                  |
| Canonical result            | `MatchLiveLinkResultView`                                                     |
| History projection          | `MatchLiveLinkHistoryItemView` and `MatchLiveLinkHistoryPage`                 |
| Current-user dependency     | `CurrentUserProvider` and minimal immutable `CurrentUserSnapshot`             |
| Live-created event boundary | `MatchLiveLinkEvents` and immutable `MatchLiveLinkCreatedEventInput`          |
| Application behavior        | transactional `MatchLiveLinkApplicationService`                               |
| Persistence mapping         | strict `MatchLiveLinkPersistenceMapper` around retained JPA entities          |
| Canonical REST              | generated live/history APIs behind two v2 transport controllers               |
| Generated transport mapper  | strict `MatchLiveLinkApiMapper`                                               |
| Users-service outbound edge | staged generated client plus isolated provider-first v1 compatibility adapter |
| Legacy REST                 | adapter-local records and `LegacyMatchesJson`                                 |

Generated matches and users-service models stop at their respective adapters. Application records contain no Spring
Web, Jackson, JPA, Lombok, or generated-contract annotations. The generic handwritten `ApiClientService`, copied user
and favorite DTOs, and three superseded live-link DTOs are removed.

## Preserved Upsert And Delete Semantics

| Behavior                 | Preserved rule                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| current user             | the forwarded bearer resolves `/users/me`; a missing body remains an application failure                          |
| account age              | non-moderators require an account at least seven days old                                                         |
| providers                | exact domains and subdomains of YouTube, Twitch, Facebook, `fb.com`, and `fb.watch` are accepted                  |
| professional competition | AALNV matches reject user-submitted live links                                                                    |
| live window              | non-moderators remain constrained to the existing one-hour publication window                                     |
| owner protection         | an active link can be replaced or deleted only by its owner unless the existing moderator policy permits it       |
| unchanged link           | the same owner, provider, and URL returns the existing active version before quota checks                         |
| per-match quota          | an owner retains the existing maximum of three versions for one match                                             |
| daily quota              | an owner retains the existing maximum of three distinct matches per Paris-local day                               |
| active transition        | a replaced active version becomes `EXPIRED`; a new pre-finish or moderator version becomes `ACTIVE`               |
| post-match transition    | a non-moderator submission expires prior active/pending versions and creates `PENDING`                            |
| post-match match touch   | the match `lastUpdate` remains updated when a new pending post-match version is saved                             |
| delete                   | no active link is a successful `204` no-op; an authorized active link becomes `DEACTIVATED`                       |
| live-created event       | only non-finished upserts publish the existing unversioned event, after the live-link save inside the transaction |

Provider matching now makes the intended exact/subdomain rule explicit, preventing lookalike hosts such as
`youtube.com.evil` without changing any valid provider URL. The application clock is injected so account age, daily
quota boundaries, timestamps, and tests share one instant.

## History, Pagination, Ordering, And Null Parity

The v1 history route remains an unpaged JSON array with all versions. The canonical v2 route uses the approved
`page`/`pageSize` bounds and exact `PageInfo` totals. Both read from one stable repository order: `createdAt`
descending, then `id` descending. Empty history remains successful and does not add a match-existence lookup.

The v1 projection retains route-duplicated `match_id`, report count, owner Auth0 ID, and audit timestamps in
adapter-local snake_case. The canonical projection omits route-duplicated `matchId` and keeps only the approved
generated camelCase history fields. The upsert v1 response likewise retains report count and owner identity while the
canonical result exposes only match ID, provider, URL, and status.

## Generated Users-Service Client

Matches-service now generates the standard OpenAPI Generator Java `UserAccountsClient` from the committed users-service
bundle during Maven `generate-sources`. The existing forwarded-JWT `RestTemplate`, connection pool, and timeouts remain
authoritative. Configured service-host, `/api/v1/users`, and `/api/v2/users` values normalize to the host before the
generated client calls canonical `/api/v2/users/me`. Its response is reduced immediately to only the Auth0 subject and
account creation time required by the current live policy; unrelated generated profile fields do not cross the
adapter.

MRG-339 has not yet supplied the provider-side generated users route. Activating the consumer now would break both v1
and v2 live commands in the monorepo baseline, so an explicitly temporary `LegacyCurrentUserAdapter` remains primary.
It uses the existing forwarded bearer, requests the unchanged v1 route, reads only `auth0_id` and `created_at` from a
`JsonNode`, and exposes the same minimal snapshot. MRG-339 must implement the provider first, switch authority to the
already generated adapter, prove rollback, and delete this legacy adapter. No runtime fallback or dual-call behavior
is introduced. The positive numeric local ID remains canonical in users-service; the live-link policy does not consume a local user
identifier while ownership rows still use Auth0 subjects.

## Generated Python Artifact

The official OpenAPI Generator Python `asyncio` client is regenerated from the corrected tags. It now exposes four
separate async owners for live-link history, commands, reports, and moderation. No handwritten Python code generator,
recursive case converter, scraper runtime call, dependency, or Dockerfile changes. Scraper activation remains MRG-349.

## Events, Transactions, And Deferred Corrections

The existing unversioned `match.live.created` payload and publication timing remain unchanged. This slice introduces
only an immutable application event input so the publisher no longer receives a JPA `Match`. It creates no AsyncAPI
message, v2 route, queue, listener, outbox row, or deduplication store. MRG-370 owns the generated event contract and
MRG-372 owns the matches outbox and consumer deduplication.

Current quota race windows, Auth0-owned persistence columns, event publication inside the database transaction, and
the retained JPA-centric persistence service are documented behavior, not silently corrected. MRG-423 owns deeper
live-link restructuring and concurrency decisions.

## Coexistence And Temporary Names

- `controllers/v1`, `LegacyMatchesJson`, and adapter-local legacy records remain until every caller migrates and the
  approved zero-traffic evidence gate closes.
- `api/v2` packages and suffixes such as `MatchLiveLinksV2Controller` distinguish the canonical transport only during
  coexistence; after authorized v1 retirement, the surviving controller becomes unqualified.
- The canonical public `/api/v2/**` route remains the published stable contract.
- Generated APIs/models at adapters, application records, strict mappers, ports, and persistence separation remain.
- Flyway files named `V2__...` remain immutable database history and are unrelated to REST coexistence cleanup.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes production retirement.

## Verification Evidence

- Application tests prove active and pending creation, no-op ordering, owner checks, provider restrictions, AALNV and
  account-age policy, both quotas, state transitions, timestamps, event-after-save order, absent delete, and stable
  history pagination.
- Generated-boundary tests prove live commands, history, reports, and moderation have separate interfaces, generated
  URI input maps to an application string, and canonical output remains camelCase under the temporary global
  snake_case mapper.
- Outbound tests prove configured URL normalization, immediate reduction from the generated users response, and exact
  temporary v1 snake_case projection without copied DTOs.
- Python tests prove the four generated async API owners are disjoint and contain every live operation.
- Focused matches tests, Python client tests, contract generation tests, source lint, full backend packaging,
  documentation validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-362 owns `MATCH-07` and `MATCH-11` through `MATCH-14`: moderation list/actions and live-link reporting.
- MRG-346 and MRG-368 own Expo and mobile-gateway live workflows.
- MRG-339 owns provider-side users-service runtime migration, activation of the staged generated consumer, and removal
  of `LegacyCurrentUserAdapter`.
- MRG-349 owns scraper use of the official generated Python clients.
- MRG-370 and MRG-372 own generated match events and the transactional outbox.
- MRG-423 owns deeper live-link internals and concurrency decisions.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement is outside this active goal.
