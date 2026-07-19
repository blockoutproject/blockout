# Blockout OpenAPI Source Layout

This directory is the source of truth for Blockout REST contracts as each owner contract is approved. MRG-305 fixed
the fragment layout and ownership rules, MRG-316 established the shared catalog, and the service contract tasks add
authoritative operations and schemas incrementally without changing runtime authority by themselves.

## Target Tree

```text
specs/source/
├── shared/
│   ├── base.json
│   └── schemas/
│       └── <SharedTechnicalSchema>.json
└── services/
    ├── config/
    ├── clubs/
    ├── teams/
    ├── pools/
    ├── competition/
    ├── matches/
    ├── users/
    ├── reports/
    ├── notification/
    ├── search/
    └── mobile-gateway/
        ├── base.json
        ├── paths/
        │   └── <operation-family>.json
        └── schemas/
            └── <BoundarySchema>.json
```

Every service directory uses the same `base.json`, `paths/`, and `schemas/` shape shown for `mobile-gateway`.
Directories are created by the first task that owns an actual fragment; empty placeholder trees are not committed.

## Fragment Roles

| Fragment                          | Required content                                                                                                     | Forbidden content                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `shared/base.json`                | OpenAPI shell for the generated shared-model catalog                                                                 | REST operations or business-object roots                                        |
| `shared/schemas/*.json`           | One stable backend enum or rare cross-boundary technical primitive per file                                          | Business-object roots, service-local copies, or generated output                |
| `services/<owner>/base.json`      | OpenAPI version, owner-specific title, placeholder server, tags, security schemes, reusable parameters and responses | Implemented paths, inline business schemas, or another service's policy         |
| `services/<owner>/paths/*.json`   | One coherent operation family as a top-level path map                                                                | `openapi`, `info`, generated output, events, or provider APIs                   |
| `services/<owner>/schemas/*.json` | One boundary-local named component per file                                                                          | JPA entities, application records, vendor SDK models, or copied downstream DTOs |

Fragments are JSON and contain only deterministic, repository-local content. Schema references use
`#/components/schemas/<Name>` and are resolved from the owning service plus the shared schema registry by the MRG-306
bundler. Files never reference generated bundles, backend sources, Expo sources, standalone repositories, or remote
URLs.

## Shared REST Catalog

MRG-316 establishes the only components inherited automatically by every deployable REST bundle:

- `bearerAuth` defines the common HTTP Bearer JWT shape, but operations still declare their exact public,
  authenticated, or scope-protected security requirement;
- `Page` and `PageSize` define zero-based pagination with a default size of 25 and a hard shared maximum of 100; an
  owner may document and enforce a lower maximum;
- `RequestId` and the standard Problem Details responses expose `X-Request-ID` without making correlation metadata a
  business field;
- `ProblemDetail` requires `title`, HTTP `status`, and stable machine-readable `code`; `requestId` remains optional
  when a runtime cannot safely supply it;
- `PageInfo` requires `page`, `pageSize`, and `hasNext`; `totalItems` remains optional;
- `UuidIdentifier`, `CalendarDate`, and `UtcDateTime` are rare shared wire aliases whose standard OpenAPI formats map
  to native generator types; positive numeric identifiers stay inline as `integer`/`int64` with `minimum: 1`;
- the twelve REST-visible enums retain their exact deployed wire values and contain no UI labels or provider metadata;
- backend-only application intent, decision, delta, claim, and result enums live in the same source-owned catalog so
  every backend module consumes one generated `com.blockout.shared.model.*Enum` type rather than a handwritten copy.

The shared source catalog is broader than the schemas inherited by a particular deployable REST bundle. The bundler
resolves only referenced REST components, while `shared.json` remains the complete generation input for the backend
`shared-models` module. Blockout event discriminators remain owned by AsyncAPI and generate into the shared
`event-contracts` module. No Java enum declaration is an authoritative source.

The inherited response catalog covers `400`, `401`, `403`, `404`, `409`, `413`, and `500`. An operation references
only the statuses it can actually return; the catalog does not silently change legacy behavior or make every response
universal.

Bounded-list wrappers deliberately remain owner-local and typed. A `*ListResponse` contains only a required `items`
array with a concrete item schema, while a `*PageResponse` contains concrete `items` plus shared `PageInfo`. There is no
generic untyped list schema. Complete-list operations document the bounded source and deterministic ordering;
growable collections use `Page`, `PageSize`, and a stable ordering tie-breaker.

Shared and owner component registries are merged deterministically. An owner cannot shadow a shared component or
schema name; the bundler rejects the collision so security, error, or enum behavior cannot drift silently.

## Owner And Bundle Map

| Source directory          | Contract owner                      | Generated bundle      | Contract task             | Consumers                                                   |
| ------------------------- | ----------------------------------- | --------------------- | ------------------------- | ----------------------------------------------------------- |
| `shared`                  | cross-contract technical primitives | `shared.json`         | MRG-316                   | backend shared models and generated clients                 |
| `services/config`         | config-service                      | `config.json`         | MRG-317                   | backend, mobile-gateway, search-worker, scrapers            |
| `services/clubs`          | clubs-service                       | `clubs.json`          | MRG-318                   | backend, mobile-gateway, search-worker, club scraper        |
| `services/teams`          | teams-service                       | `teams.json`          | MRG-319                   | backend, mobile-gateway, search-worker, both scrapers       |
| `services/pools`          | pools-service                       | `pools.json`          | MRG-320                   | backend, mobile-gateway, search-worker, competition scraper |
| `services/competition`    | competition-service                 | `competition.json`    | MRG-321                   | mobile-gateway and both scrapers                            |
| `services/matches`        | matches-service                     | `matches.json`        | MRG-322                   | mobile-gateway and competition scraper                      |
| `services/users`          | users-service                       | `users.json`          | MRG-323                   | backend and mobile-gateway                                  |
| `services/reports`        | reports-service                     | `reports.json`        | MRG-324                   | mobile-gateway                                              |
| `services/notification`   | notification-service                | `notification.json`   | MRG-325                   | mobile-gateway                                              |
| `services/search`         | search-service                      | `search.json`         | MRG-326                   | mobile-gateway                                              |
| `services/mobile-gateway` | Expo-facing mobile-gateway BFF      | `mobile-gateway.json` | MRG-327, MRG-357, MRG-358 | Expo only                                                   |

Folder names are stable contract identifiers, not Java module names. Internal service components use the documented
`Internal` shape naming; `mobile-gateway` components keep Expo/product workflow names and do not use an `Internal`
suffix. The BFF contract is organized by Expo workflow even though its source fragments share one deployable-owned
directory.

## Config-Service Contract

MRG-317 makes `services/config` authoritative for the sixteen canonical config-service operations inventoried by
MRG-301 and allocated by MRG-304. The bundle covers app status, divisions, legal documents, raw division mappings,
and scraper statuses under `/api/v2/config/**`.

The contract deliberately omits persistence-only identifiers and timestamps that have no current consumer. It keeps
the app-status `lastUpdate` value because the deployed BFF consumes it, preserves operation-specific null and omitted
field semantics, and models division writes as typed multipart requests with a canonical JSON `data` part plus an
optional image. Complete collections use owner-local typed list responses and retain the repository-defined
compatibility order; this task does not invent sorting or pagination.

Security remains operation-specific: legal-document reads are public, while runtime authorization retains the other
operations' audited scopes outside non-standard OpenAPI metadata. The generated v2 contract is not a runtime cutover. Existing v1 transports and their errors, nulls,
ordering, multipart behavior, and fallback semantics remain governed by the MRG-304 compatibility boundary until
their later vertical migration tasks.

## Clubs-Service Contract

MRG-318 makes `services/clubs` authoritative for the six canonical clubs-service operations inventoried by MRG-301
and allocated by MRG-304. The bundle covers paged club reads, typed multipart creation and update, soft deactivation,
and the compatibility plain-text logo read under `/api/v2/clubs/**`.

`ClubInternalResponse` retains the owner, contact, location, lifecycle, logo, and derived coordinate fields used by
proven consumers while omitting persistence audit timestamps. The growing collection uses `ClubInternalPageResponse`,
shared zero-based page parameters, and stable name-then-identifier ordering. Scraper and worker adapters that need the
legacy complete list must aggregate every page before exposing their unchanged application result.

Creation accepts only fields the current create behavior actually retains; `address` remains absent because the
deployed path drops it, and adding it requires a separately approved product correction. Update keeps current partial
field and implicit reactivation behavior while replacing the ambiguous `logoUrl` sentinel with required
`removeLogo`: an image replaces, `removeLogo: true` without an image deletes, and `false` without an image keeps the
logo. Conflicting removal and replacement is a canonical `400`.

Five operations retain their audited scopes. The logo read remains authenticated without a method scope and preserves
its `200` plain URL, `204` empty, and `404` missing-club outcomes. Public phone filtering remains BFF-owned; Mapbox,
S3, RabbitMQ, v1 transport, and runtime activation remain outside this contract-definition task.

## Teams-Service Contract

MRG-319 makes `services/teams` authoritative for the eight canonical teams-service operations inventoried by MRG-301
and allocated by MRG-304. The bundle covers filtered team reads, clean JSON creation, typed multipart update, soft
deactivation, club-ID discovery, and the two follower-projection mutations under `/api/v2/teams/**`.

`TeamInternalResponse` retains the owner, classification, follower, image, lifecycle, and owner-revision fields
required by proven consumers while omitting persistence timestamps and BFF-derived club coordinates or fallback
images. Team and club-ID collections use typed page responses and deterministic raw-name/identifier or
club-identifier ordering.
Compatibility scraper, BFF, and worker adapters aggregate all pages before exposing a legacy complete-list result.

Creation contains only caller-owned team identity and classification fields; server identity, follower count, active
state, logo storage, and timestamps cannot be supplied. Update preserves current partial-field and explicit active
semantics while replacing the destructive `logoUrl` sentinel with required `removeLogo`, using the same keep, replace,
delete, and conflict rules as the club contract. Shared `FormatEnum` and `GenderEnum` are the only REST enum sources.

List, detail, and club-ID discovery remain authenticated without method scopes. Create, update, delete, and both
follower mutations retain their audited scopes. Because the follower caller discards the legacy entity response, v2
returns `204`; v1 keeps `200` and its full body inside the compatibility adapter. Canonical unique conflicts and
oversized multipart updates use `409` and `413` Problem Details, while v1 error behavior remains unchanged. Favorite
authority, idempotency, reconciliation, S3 compensation, RabbitMQ, and runtime activation remain later tasks.

## Pools-Service Contract

MRG-320 makes `services/pools` authoritative for the seven canonical pools-service operations inventoried by MRG-301
and allocated by MRG-304. The bundle covers filtered pool reads, clean JSON creation and partial update, soft
deactivation, and the two follower-projection mutations under `/api/v2/pools/**`.

`PoolInternalResponse` retains the thirteen owner identity, display, classification, follower, and lifecycle fields
required by proven consumers while omitting persistence timestamps and every BFF-derived division, ranking, match,
and team projection. The growing collection uses `PoolInternalPageResponse`, shared zero-based page parameters, and
stable season-descending, name-ascending, identifier-ascending ordering. Compatibility scraper, BFF, notification,
and worker adapters aggregate all pages before exposing a legacy complete-list result.

Creation contains only caller-owned pool identity, display, and classification fields; server identity, follower
count, active state, and timestamps cannot be supplied. Update preserves the current null-skipping eleven-field
semantics. Its `active` value is explicit lifecycle intent: `true` requests reactivation, `false` requests
deactivation, and omission or null preserves the stored state. The application boundary must map that intent
separately from identity, display, and classification changes. Shared `FormatEnum` and `GenderEnum` are the only REST
enum sources.

List and detail remain authenticated without method scopes. Create, update, delete, and both follower mutations retain
their audited scopes. Because the follower caller discards the legacy entity response, v2 returns `204`; v1 keeps
`200` and its full body inside the compatibility adapter. Canonical uniqueness conflicts use `409` Problem Details,
while v1 errors and nullable legacy data remain unchanged until their vertical migration. Favorite authority,
idempotency, counter reconciliation, explicit lifecycle events, RabbitMQ, BFF cache invalidation, search rebuilding,
and runtime activation remain later tasks.

## Competition-Service Contract

MRG-321 makes `services/competition` authoritative for the eight canonical competition-service operations inventoried
by MRG-301 and allocated by MRG-304. The bundle covers association creation/reactivation and reads, full statistics
replacement, three explicit missing-ID lifecycle commands, and team-to-pool ranking projections under
`/api/v2/competitions/**`.

`CompetitionAssociationInternalResponse` keeps the twenty-one owner association and statistics fields required by the
scraper and aggregation workflows while omitting persistence identity and audit timestamps. Both association reads use
shared pages: pool reads order by team identifier, team reads by pool identifier, and compatibility adapters aggregate
all pages before exposing the legacy complete arrays. Add/reactivate still requires both `create:competitions` and
`update:competitions`, retains historical statistics and the stored club identity on reactivation, and does not invent
cross-service existence validation.

`CompetitionStatisticsSnapshotInternalRequest` makes all seventeen current statistics required because the operation
is a full replacement, not a patch. It deliberately does not add nonnegative, arithmetic, overflow, ratio, source
revision, or league-rule constraints without the missing product and production evidence. The three lifecycle request
names now state their real missing-ID meaning; empty lists remain no-ops and duplicate IDs retain set semantics. Their
canonical v2 success is `204`, while v1 adapters retain the current empty `200` response.

Competition-service owns ranking order. Pool groups sort by `poolId` ascending, and each complete nested ranking sorts
by points descending, points penalty ascending, wins descending, set coefficient descending, point coefficient
descending, then `teamId` ascending as a deterministic technical tie-breaker. Array position expresses order without
inventing an ordinal field. Cascade corrections, official rule validation, scraper calculation fixes, repository
hardening, generated events, outboxes, BFF enrichment, and runtime activation remain later tasks.

## Matches-Service Contract

MRG-322 makes `services/matches` authoritative for all sixteen canonical matches-service operations inventoried by
MRG-301 and allocated by MRG-304. Three path families separate owner match/day operations, live-link and moderation
workflows, and the two existing internal test triggers under `/api/v2/matches/**`; AsyncAPI remains the sole event
contract authority.

The owner snapshot retains sixteen consumer-backed match fields while omitting persistence timestamps and ORM live-link
relationships. Create and update accept the thirteen scraper-owned fields only; identity, status, active state, and
timestamps are server-owned. The canonical contract preserves status derivation from `set`, update's implicit
reactivation, the one-way finish transition, and nullable score/live/location fields without silently correcting
scraper semantics. Raw bootstrap becomes a stable shared page whose compatibility adapter aggregates all pages.

Match-day pagination remains a dedicated meaningful grouped projection with `dayMatches`, `hasNext`, and `nextPage`,
preserving Paris-local dates and the current infinite-query cursor. Detail adds only newest-active live fields.
Moderation and history use shared pages; history is newest first and drops route-duplicated `matchId`. The moderation
contract explicitly preserves the current distinction between historical status filtering and representative-link
selection and does not promise the unimplemented time window.

Live-link commands, history, reports, and moderation use separate operation tags so their generated interfaces follow
the application roles and roadmap slices. This separation changes neither paths nor payloads: MRG-361 owns history,
upsert, and delete, while MRG-362 implements reporting and moderation reads/actions through their separate generated
server boundaries. Both slices retain isolated unpaged v1 adapters until their downstream callers migrate.

Live-link commands retain existing ownership, provider, account-age, quota, timing, professional-league, report, and
state policies. The upsert result keeps only the four fields consumed by Expo. Report reason uses the existing mobile
10..500 submission rule. Bulk match deactivation returns canonical `204` while v1 retains empty `200`. Concurrency
hardening, cascade decisions, policy corrections, scraper fixtures, outboxes, BFF projections, Expo forms, and runtime
activation remain later tasks.

## Users-Service Contract

MRG-323 makes `services/users` authoritative for all nine users-service operations inventoried by MRG-301 and allocated
by MRG-304. Account, identity-role, and favorite path families remain separate. Bearer authentication is the default;
the role-assignment operation overrides it with a service-local `X-API-KEY` scheme. Existing method scopes, the
type-dependent team/pool follow scopes, the unbound Auth0 update path, and current idempotent follow/unfollow outcomes
remain explicit contract behavior rather than being silently corrected.

The positive numeric local Blockout ID is the canonical v2 user identity. Auth0 subjects remain only on the two audited
identity-facing paths and the account view needed by current profile/live-owner workflows. The account view contains the seven
consumer-backed fields: local identity, Auth0 identity, email, pseudo, picture URL, creation time, and reduced favorites.
Names, phone, active state, update timestamp, favorite row IDs, owner relationships, and
favorite timestamps stay isolated in v1 compatibility or persistence adapters.

Profile update is a canonical multipart command with optional pseudo, required `removePicture`, and optional image. It
eliminates the legacy requirement to echo `pictureUrl` to preserve an image while retaining explicit preserve, replace,
and remove outcomes. Favorite listing pages by creation then storage identity and returns only entity type and entity
ID; the v1 adapter preserves its unpaged repository response. Current Auth0 linking, Auth0-first deletion, S3 ordering,
synchronous counters, follow publication, null favorites, authorization gaps, and retention behavior are preserved
until their assigned runtime, storage, event, security, and privacy tasks.

## Reports-Service Contract

MRG-324 makes `services/reports` authoritative for the single reports-service operation inventoried by MRG-301 and
allocated by MRG-304. The canonical `/api/v2/reports` multipart boundary retains bearer authentication and the
`create:reports` scope. Its `data` part is a generated Blockout command, and its repeated `images` parts remain explicit
attachment inputs. The command carries the nine consumer-backed report/context fields in camelCase and never accepts
the legacy caller-controlled `attachmentImageUrls` workflow state.

The canonical result contains only the provider-independent issue number, public URL, and title required by the current
workflow. GitHub global ID/state, SDK objects, label names, Markdown, assignees and milestone; S3 keys, bucket and public
URL construction; and Discord webhook JSON remain infrastructure-adapter models. No provider model or configuration
enters the OpenAPI source.

The contract records current sequential uploads, GitHub create then best-effort body update, best-effort Discord
notification, empty-image skipping, missing attachment-count/idempotency limits, and partial-success semantics without
changing them. Legacy malformed-JSON/image errors, aggregate request limits, anonymous BFF-to-M2M relay, token/secret
leaks, orphan cleanup, validation corrections, provider compensation, BFF projection, Expo form migration, and runtime
activation remain assigned later work.

## Notification-Service Contract

MRG-325 makes `services/notification` authoritative for all six notification-service REST operations inventoried by
MRG-301 and allocated by MRG-304. The bundle separates current-user inbox reads and mutations from push-token
registration under `/api/v2/notifications/**`, retains the audited scopes, and keeps the approved coexistence token
path with the canonical positive numeric local Blockout user ID.

The persistence-independent inbox item retains the visible content, notification kind, read/open state, creation time,
and an explicit nullable `divisionId` needed by BFF enrichment. Recipient IDs, target storage keys, generic `JsonNode`
metadata, read/open timestamps, and the JPA entity remain outside the generated boundary. The page uses `items` plus
shared `PageInfo`, defaults to the current mobile size of 20, and adds a hard maximum and deterministic
creation-time/identity ordering. The v1 adapter preserves its `notifications`, `hasNext`, `nextPage`, `size`, and
equal-timestamp behavior until the vertical cutover proves parity.

Unread count uses the unambiguous `unreadCount` field. Read, opened, and delete mutations retain their current
state-sensitive 404 outcomes instead of silently becoming idempotent. Push registration requires the token, shared
platform enum, and device identifier; Expo messages, tickets, receipts, provider configuration, delivery-ledger state,
and follower projections do not enter the REST contract. The current caller-controlled user path, OS-build device
identity, missing unregister/account-cleanup behavior, and delivery consistency gaps remain explicit later security,
privacy, application, and persistence work.

RabbitMQ schemas, envelopes, routes, headers, queues, publishers, and listeners remain solely governed by MRG-315 and
its event-contract tasks. MRG-325 creates no AsyncAPI component and activates no REST or broker runtime behavior.

## Search-Service Contract

MRG-326 makes `services/search` authoritative for the three search-service reads inventoried by MRG-301 and allocated
by MRG-304. Club, team, and pool autocomplete remain authenticated internal operations under `/api/v2/search/**`
without method scopes. Team and pool filters use canonical camelCase query names and the approved shared format and
gender enums.

Each operation returns an owner-local bounded `ListResponse`, never a page or raw Elasticsearch document. Blank or
whitespace-only queries still produce up to five unseeded random examples; nonblank queries retain the current analyzer,
AND-prefix matching, score order, 150 ms timeout, early termination, and maximum of twenty results. Equal-score order,
partial-shard behavior, and Elasticsearch failures hidden as empty successful results remain explicit parity behavior
until separately approved corrections. The v1 service adapter keeps raw 200 arrays, and the BFF compatibility boundary
keeps its current empty-to-204 behavior until their vertical cutovers.

Result items contain only the current card, label, image, and navigation inputs. Elasticsearch-only `all`,
`name_suggest`, filter IDs, worker cache values, and index mappings are excluded. Team short name and club details, pool
short name, and phantom division-color fields remain outside v2 because no current search UI consumes them. Nullable
stored strings stay nullable even where legacy TypeScript claimed otherwise; generated mobile projections must handle
that proven storage behavior explicitly.

`search-worker` remains an event and snapshot consumer plus Elasticsearch projection owner. It exposes no controller,
receives no OpenAPI server contract, and must consume the already approved service bundles through generated outbound
clients. Its RabbitMQ payloads remain governed by MRG-315, while caches, index documents, mappings, versioned indices,
alias swaps, reconciliation, and rollback remain worker application/infrastructure concerns.

## Mobile-Gateway Relay Workflows

MRG-327 makes 30 Expo-facing relay operations authoritative in the `mobile-gateway` bundle: configuration, account and
favorites, reports, search, and notifications. These operations use the exact public/secure `/api/v2/mobile/**` split
approved by MRG-304. Public operations declare empty security locally; secure operations inherit bearer security.

Every schema is BFF-owned and named for the mobile workflow. No downstream `Internal` DTO is reused across the boundary.
Complete configuration and search collections use typed `items` wrappers, notifications use `items + pageInfo`, and
multipart JSON parts are typed camelCase requests. The notification view contains only the six fields consumed by the
mobile inbox, including the BFF-enriched nullable division logo. The positive numeric local user ID is canonical, vendor/report/search
store models stay outside the bundle, and no BFF cache representation enters the wire contract.

This source defines target v2 behavior only. Isolated v1 adapters retain current raw arrays, `count` and `nextPage`,
snake_case multipart/query fields, statuses, authentication, caching, null, fallback, and partial-failure semantics
until the owning vertical migration. MRG-357 adds club/team/pool aggregation below, and MRG-358 completes the
match-facing workflows.

## Mobile-Gateway Club, Team, And Pool Workflows

MRG-357 adds the nine audited club, team, and pool facade operations. Each public detail, public list, and secure update
uses a workflow-owned schema rather than a downstream service model. Direct club profiles restore the owner-backed
nullable address needed by the current UI and exclude phone number under the BFF-owned public privacy rule. Postal
code, lifecycle state, audit timestamps, embedded full clubs, server-only ranking inputs, and fields unused by the
owning Expo workflow stay outside these views.

Team detail, team list, pool detail, pool list, and team-nested pool projections remain distinct. Nested divisions
contain only label and styling inputs; list divisions are nullable because current partial enrichment can omit them.
Ranking rows contain only visible ranking and map inputs while array position carries the server decision. Update
commands contain only current mobile edit fields, with explicit club/team logo intent, and their results are narrow
edit-workflow projections.

Compatibility behavior is explicit rather than repaired by inference. Team and pool by-ID reads deduplicate input,
silently omit missing or inactive rows, expose no partial-result marker, and retain their current unspecified set order.
Teams by club retain downstream order without a new stability promise. Exact ranking ties and team-detail pool order
remain unspecified, missing required detail inputs fail the entire request, inactive pool detail remains readable, and
missing list divisions remain null. The v1 adapter retains raw arrays and every legacy transport shape until MRG-367
proves parity.

## Mobile-Gateway Match, Live, And Moderation Workflows

MRG-358 adds the final eleven audited facade operations: the public match-day list and match detail, eight secure live
and moderation operations, and the signed federation PDF continuation. Together with MRG-327 and MRG-357, the bundle
now owns all 50 MRG-301/MRG-304 mobile-gateway operations. Public operations remain anonymous; secure operations
inherit bearer security and leave every live-link decision to matches-service.

The list keeps its meaningful `dayMatches`, `hasNext`, and `nextPage` cursor while renaming the bounded date-count
input to `pageSize`. Page size counts Paris-local dates, not match rows or fan-out. Day, pool, and match order remains
status-dependent and retains its missing immutable-ID tie gap. Missing or inactive-division pools, empty pools, and
empty days are silently removed; a missing team remains a nullable side on an otherwise retained match. No omission
metadata is invented. The audited early-empty branch still forces a terminal cursor, while enrichment-only drops
preserve the downstream continuation.

Match detail is separate from list and moderation. It contains only the screen's match, team, pool, division, ranking,
live, and signed-document inputs. Ranking rows omit server-only comparator fields and coordinates; exact five-key ties
retain unspecified association order. Both signed document URLs are BFF-owned derived values, and missing match, pool,
division, side, ranking team, claim, or signing input still fails the whole detail instead of returning a partial
object. The token continuation returns binary PDF with `no-store`; vendor requests and parameters remain adapter-only.

History and moderation are canonical `items + pageInfo` collections. Their v1 adapters aggregate pages to retain the
legacy raw arrays. History drops route-duplicated `matchId`, preserves newest-first ordering without an ID tie, and
continues to make an absent match indistinguishable from empty history. Moderation contains only rendered card fields,
preserves the historical-filter versus representative-link distinction, silently drops rows with missing catalog
dependencies, and reports no omitted count. Command request/result schemas remain distinct, use the mobile 10..500
report rule, and preserve existing success statuses. MRG-368 must prove these semantics before runtime activation.

## Closed Boundaries

- `search-worker` has no REST controller and receives no source directory or generated server bundle.
- RabbitMQ contracts belong to the event source selected by MRG-315, never to this OpenAPI tree.
- Auth0, FFVB/LNV, Mapbox, S3, GitHub, Discord, and Expo provider payloads remain vendor-adapter models.
- Canonical operations use the `/api/v2/**` paths and camelCase wire names fixed by MRG-304.
- Existing `/api/v1/**` shapes remain isolated legacy adapters and are not modeled as generated canonical operations.
- No service imports another service's source fragments. Cross-service reuse is limited to approved `shared/schemas`.

## Generation Boundary

MRG-306 through MRG-309 establish the deterministic Maaatch-shaped bundler, tests, source lint, committed source shells,
and generated bundles. The bundler discovers service directories lexicographically, cleans its owned output, and
writes only to `libs/shared/contracts/generated/specs/**`. Empty `paths` in deployable bundles state that no canonical
operation exists yet. Shared Problem Details may already appear because inherited reusable responses reference it;
owner contract tasks populate business paths and schemas. Generation availability does not by itself change runtime
authority or activate a canonical route.
