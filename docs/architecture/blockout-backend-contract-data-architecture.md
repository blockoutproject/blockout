# Blockout Backend Contract And Data Architecture

- Status: approved target architecture
- Approved by: MRG-268 Plan-mode decision
- Approval date: 2026-07-17
- Runtime effect: none; this document governs later incremental migration tasks
- Evidence baseline: MRG-252 through MRG-267 audits and the checked-out production-shaped source

## Purpose

This document defines the target contract, data, mapping, and service-boundary architecture for Blockout. It is the
durable decision source for Phase MRG-300 contract-first work and Phase MRG-400 backend restructuring.

The target follows the generated-boundary structure proven in Maaatch while preserving Blockout's Expo application,
Python scrapers, Spring Boot services, Flyway migrations, RabbitMQ topology, Elasticsearch projections, Auth0 model,
and independent deployable ownership.

The migration has two controlled passes:

1. stabilize every REST, event, BFF, Expo, and scraper boundary with generated or typed contracts, explicit application
   shapes, mappers, compatibility evidence, and rollback; then
2. restructure each service internally by feature after its boundaries are stable.

The first pass may introduce only the application records and mappers required to isolate a migrated boundary. It must
not turn a contract cutover into an unbounded package rewrite. The second pass completes the deeper application,
domain, persistence, projection, and infrastructure separation.

## Closed Boundaries

- Preserve current product-visible behavior until a separate task explicitly approves a change.
- Preserve service ownership, database ownership, ports, security intent, environment contracts, image behavior, and
  standalone production authority.
- Do not copy Maaatch product vocabulary, web architecture, Next.js behavior, or shared TanStack ownership.
- Do not expose new endpoints, activate currently absent listeners, change privacy behavior, or repair ambiguous
  ordering, pagination, null, partial-failure, or fallback semantics by architectural inference.
- Do not delete a field or type merely because the current monorepo has no consumer. MRG-267 removal gates remain
  mandatory.
- Do not treat Springdoc output, handwritten DTOs, generated artifacts, database schemas, events, Expo types, or
  scraper dictionaries as the target contract source by themselves.

## 1. Boundary Taxonomy

| Boundary         | Owner                                                           | Allowed forms                                                               | Forbidden coupling                                          |
| ---------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| REST source      | OpenAPI fragments under `libs/shared/contracts/specs/source/**` | schemas, paths, errors, security, pagination, multipart                     | controller-derived source authority                         |
| REST adapter     | owning service `api` package                                    | generated API interfaces/models, controllers, API mappers                   | JPA entities or generated DTOs as application contracts     |
| Application      | owning feature or BFF workflow                                  | commands, query inputs, views, snapshots, decisions, plans, policies, ports | transport DTOs, JPA repositories, vendor SDK models         |
| Domain           | owning feature, only when invariants justify it                 | values, pure concepts, policies, domain exceptions                          | Spring Web, Spring Data, generated objects, vendor clients  |
| Persistence      | owning service infrastructure                                   | JPA entities, repositories, persistence-local mappers                       | API responses, BFF projections, generated object DTO fields |
| Event            | separately selected event-contract source                       | versioned payloads, envelope metadata, producer/consumer adapters           | fake OpenAPI endpoints or REST DTO reuse                    |
| BFF inbound      | workflow `api` package                                          | generated BFF DTOs and API mappers                                          | downstream generated client DTOs                            |
| BFF outbound     | workflow infrastructure adapter                                 | generated downstream client and adapter mapper                              | generated client DTOs leaving the adapter                   |
| Expo transport   | `apps/frontend/mobile`                                          | Orval output, generated contract schemas, auth/error mutator                | screen state, form semantics, shared TanStack package       |
| Expo application | owning mobile domain                                            | TanStack policy, query composition, view/form models, navigation state      | handwritten transport DTO mirrors                           |
| Python transport | scraper infrastructure adapter                                  | fully generated async clients selected by MRG-314                           | provider-shaped or snake_case keys on Blockout wires        |
| Vendor           | owning infrastructure adapter                                   | Auth0, Mapbox, S3, GitHub, Discord, FFVB/LNV, Expo provider shapes          | vendor names leaking into Blockout contracts                |

### 1.1 Role-Owned Java Records

Records are used only for stable immutable application roles. Approved forms include:

- commands and query inputs owned by one use case;
- read views returned to an API mapper or another application collaborator;
- immutable snapshots with historical or consistency meaning;
- decisions and plans produced by policies;
- pure domain values with real invariants.

Do not create a record solely because a generated DTO or entity exists. A mechanical
`GeneratedDto -> IdenticalRecord -> Entity` chain adds no ownership and is prohibited. Do not create generic `records`,
`data`, `models`, or `mappers` bags. Place each record in the role package that owns it.

### 1.2 Generated Models

Generated Java and TypeScript object models are transport artifacts. They may exist only at the adapter that owns the
wire boundary. Generated enums may cross backend boundaries when they are stable shared contract values. Generated
object models must not become domain entities, JPA fields, application service interfaces, BFF application views,
worker cache records, Elasticsearch documents, mobile view models, or form models.

## 2. Package And Mapper Rules

Backend services are organized by business feature first and technical role second. Small services may retain a flat
`api`, `application`, `domain`, `infrastructure`, `config`, and `shared` layout while it remains coherent. Complex
services split by feature. Empty architecture folders are not created.

Mappers live at the translated boundary:

- generated request/response to application command/view: `api/mappers`;
- simple entity-to-view mapping: beside the target application view family;
- repository-backed assembly or enrichment: `application/projection` as a projector or projection service;
- application policy, payload, or mutation conversion: the owning application role;
- persistence-local conversion: `infrastructure/persistence/mappers`;
- BFF downstream generated DTO conversion: the owning outbound infrastructure adapter.

Each service introduces a strict local MapStruct configuration when structural mapping benefits from it:

- Spring component model;
- constructor injection;
- null checks before nested conversion;
- unmapped target fields reported as errors;
- one mapper per coherent source/target family;
- explicit mappings only for renamed, nested, flattened, ignored, defaulted, or qualified fields.

Manual mapping remains mandatory for aggregation, partial-result policy, ranking, authorization decisions, vendor
translation, explicit update intent, event construction, and any transformation whose meaning is more important than
its field correspondence.

## 3. Canonical Contracts And Casing

Every Blockout-owned REST property, query parameter, multipart JSON property, and event field is canonical camelCase.
The canonical name is declared directly in the source contract and preserved by generated artifacts.

The following are intentionally outside the wire-casing rule:

- PostgreSQL tables, columns, constraints, and Flyway identifiers;
- idiomatic Python application identifiers;
- Elasticsearch provider mapping names that are not Blockout REST/event fields;
- third-party payloads contained inside explicit vendor adapters.

The target state contains no global Jackson `SNAKE_CASE` strategy, Blockout-only `@JsonProperty` or `@JsonAlias`, Expo
request/response case conversion, or reflective Python serialization that leaks snake_case onto a Blockout wire.

### 3.1 Vertical Compatibility Rule

The exact REST v1/v2 paths, caller tasks, RabbitMQ v2 names, deployment order, rollback state, telemetry, and removal
gates are fixed by the
[MRG-304 coexistence matrix](../migration/mrg-304-contract-coexistence-cutover-matrix.md). Later generator and vertical
migration tasks implement that matrix; they do not select a different compatibility topology.

Version-qualified controller names and packages are coexistence scaffolding. While v1 and v2 both exist, suffixes such
as `V2Controller` and packages such as `api/v2` make the transport choice explicit. After authorized v1 retirement,
the surviving canonical transport becomes unqualified and that version-only naming is removed. Generated boundary
interfaces and models, meaningful application records, strict mappers, application ports, and persistence separation
remain. Flyway migration version names are immutable database history and are not part of this cleanup.

Each boundary migrates independently:

1. capture current requests, responses, errors, authentication, null behavior, ordering, pagination, multipart bytes,
   event bytes, and caller versions;
2. define the canonical camelCase source contract;
3. generate the owning server and clients;
4. write only canonical camelCase from the new path;
5. accept legacy snake_case temporarily through a named compatibility adapter when MRG-304 proves it is required;
6. migrate every backend, BFF, Expo, scraper, worker, event, and external caller in the boundary's support window;
7. prove parity and rollback;
8. remove the adapter, annotations, copied types, and case conversion for that boundary only.

Compatibility is never embedded permanently in generated models, application records, domain values, or entities.

## 4. Shared Models

The backend `shared-models` module contains stable generated enums and rare cross-boundary technical primitives only.
It must not contain shared Club, Team, Pool, User, Match, Notification, Search, Report, or other business object DTOs.
Its only model source is the committed `generated/specs/shared.json` bundle. Maven generates model-only Java under the
module-local `target/generated-sources/openapi/shared-models` tree; generated Java is not committed, and handwritten
business models are not added to this module. Service modules declare a dependency only when their generated or
handwritten boundary actually uses an approved shared schema.

The approved initial REST enum set is:

- `FormatEnum`;
- `GenderEnum`;
- `ScraperNameEnum`;
- `EntityTypeEnum`;
- `DevicePlatformEnum`;
- `MatchStatusEnum`;
- `LiveLinkStatusEnum`;
- `LiveProviderEnum`;
- `ReportTypeEnum`;
- `NotificationStatusEnum`;
- `NotificationTargetTypeEnum`;
- `NotificationTypeEnum`.

MRG-301 through MRG-303 must confirm exact deployed values before generation. Provider labels and French display text
remain application projections rather than enum metadata. `EventType` remains owned by the event-contract source
selected in [MRG-315](../decisions/mrg-315-rabbitmq-event-contracts.md), never REST `shared-models`. The unreferenced
legacy `UserGender` remains a removal candidate under MRG-267 gates.

Approved technical primitives include Problem Details, page information, bounded-list wrappers, identifiers, dates,
and security shapes only when several contracts share identical semantics.

The MRG-316 shared catalog implements that boundary with `ProblemDetail`, `PageInfo`, UUID/numeric identifier aliases,
calendar/UTC date aliases, Bearer JWT security, request correlation, common Problem Details responses, and the approved
REST enums. `*ListResponse` and `*PageResponse` remain concrete owner-local schemas so generated clients retain their
item type; sharing the wrapper policy does not justify an untyped generic item bag.

## 5. Error And Collection Contracts

The target error body is Problem Details compatible and includes a stable machine-readable `code`. A safe request
identifier is included when the runtime can supply one. Services translate application exceptions at the API edge;
the BFF translates downstream failures into its own safe facade contract without leaking service or vendor bodies.

Error migration is progressive. Current status codes, response bodies, and security-filter behavior are captured first.
Legacy bodies remain available only through the compatibility mechanism recorded in MRG-304. Generated clients switch
to Problem Details before the legacy path is removed.

Collections follow two shapes:

- `*ListResponse` with `items` only for a complete, intentionally bounded collection;
- `*PageResponse` with `items` and `pageInfo` for a growable collection, with zero-based `page`, bounded `pageSize`,
  required `hasNext`, and deterministic ordering.

Grouped business projections may use a dedicated response when the grouping is itself the consumer contract. Match-day
grouping is the accepted example. A grouped projection still documents continuation and ordering explicitly.

Migration does not silently standardize current behavior. Current empty responses, `nextPage`, inconsistent ordering,
partial omissions, fallbacks, and null semantics are captured as compatibility behavior. Any correction receives a
separate approved task.

## 6. Event Architecture

RabbitMQ contracts are independent from OpenAPI. [MRG-315](../decisions/mrg-315-rabbitmq-event-contracts.md) selects
AsyncAPI `3.0.0` JSON, parser `3.6.0`, Modelina `5.10.1`, and committed Java 21 records. The architecture is fixed:

- every v2 event has the required event ID, event-contract-owned type, semantic schema version, UTC occurrence time,
  stable producer, ordering key, optional correlation/aggregate version, and generated typed payload;
- the owning service maps application facts to the event payload at the messaging adapter;
- producers use a transactional outbox introduced progressively per service;
- an outbox publisher retries idempotently and records publication state without changing the business transaction;
- consumers deduplicate by event ID, validate the supported schema version, and preserve current acknowledgement,
  requeue, retry, and DLQ behavior until separately approved;
- event payloads do not double as REST DTOs, cache snapshots, index documents, or application views;
- a missing current listener is not activated by contract migration alone.

V2 reuses the current exchanges, appends `.v2` to approved routes, uses distinct queues/DLQs, and never relies on
`__TypeId__`. The rollout families are catalog lifecycle events, favorite/follow events, and match/live events. Each
family migrates and rolls back independently under MRG-304.

## 7. Cross-Service Sources Of Truth

### 7.1 User Identity

The positive numeric local Blockout user identifier is the canonical business and persistence identifier. Auth0 subjects, linked identities,
tokens, roles, and provider profiles are vendor-owned inputs resolved in an identity adapter. Auth0 subjects do not
become general domain IDs or appear in unrelated contracts when the local identifier is sufficient.

Identity migration preserves current authentication and authorization behavior. Account linking, deletion ordering,
retention, and post-link token behavior require their existing evidence or a separately approved product/security
decision before changing.

### 7.2 Favorites And Followers

`users-service` favorites are the canonical source. Team and pool follower counts and notification follower stores are
derived projections. Target projection updates are idempotent, rebuildable, observable, and reconciled against the
canonical favorite set. Existing synchronous counter behavior stays active until event/outbox and reconciliation
parity are proven.

### 7.3 Search Indices

`search-worker` owns Elasticsearch write projections; `search-service` owns search reads. Search documents are store
projections, not API DTOs.

Full rebuilds create a versioned index, populate and validate it, atomically switch a stable alias, retain the previous
index for a bounded rollback window, and delete it only after observation. Incremental events and full snapshots carry
enough identity/version evidence to avoid stale overwrites once MRG-302, MRG-315, and MRG-350 define it.

## 8. Service Target Matrix

| Deployable           | Application ownership                                                                                                               | Persistence/infrastructure ownership                                            | Boundary disposition                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| config-service       | app-status commands/views, division commands/views, legal commands/views, raw-mapping commands/views, scraper-status commands/views | dedicated entities, repositories, division image storage                        | split all entity exposure; preserve operation-specific null behavior            |
| clubs-service        | create/update commands with explicit logo intent, ClubView, location state                                                          | ClubEntity, S3 storage, Mapbox adapter, outbox                                  | BFF owns public phone filtering; vendor casing stays in Mapbox                  |
| teams-service        | create/update/logo commands, TeamView, follower projection inputs                                                                   | TeamEntity, S3 storage, event/outbox adapters                                   | no embedded Club object as a general business model                             |
| pools-service        | create/update/reactivation commands, PoolView, follower projection inputs                                                           | PoolEntity, event/outbox adapters                                               | BFF ranking/summary views remain separate                                       |
| competition-service  | association/statistics snapshots, ranking views/policy, lifecycle and cascade commands                                              | association entities, repositories, outbox                                      | one ranking policy/projector owns ordering; full stats stay owner data          |
| matches-service      | match/day views, match commands, live policies/views, moderation/report commands/views                                              | match/live/report entities, repositories, event/outbox adapters                 | matches owns live decisions; BFF only enriches                                  |
| users-service        | account/profile commands/views, image intent, favorites, identity resolution, deletion orchestration                                | user/favorite entities, Auth0 and S3 adapters, outbox                           | positive numeric local ID canonical; Auth0 remains vendor-owned                 |
| reports-service      | Blockout report command/result and attachment inputs                                                                                | S3, GitHub, and Discord adapters                                                | vendor request/results never define Blockout API types                          |
| notification-service | inbox/page views, token command, follower projection, delivery decisions                                                            | inbox/token/ledger entities, Rabbit adapters, Expo provider adapter             | favorites are upstream truth; provider payloads stay contained                  |
| search-service       | search query input and result views                                                                                                 | Elasticsearch read adapter                                                      | store documents never leave infrastructure                                      |
| search-worker        | immutable source snapshots, projection commands, scheduler/reconciliation inputs                                                    | generated HTTP clients, Rabbit adapters, caches, versioned index/alias adapters | no REST server contract; transport/event/cache/document shapes stay separate    |
| mobile-gateway       | facade commands/views, orchestration, projectors, authorization and compatibility policy by mobile workflow                         | generated downstream clients, cache adapters, FFVB/LNV adapters                 | generated DTOs mapped immediately; caches store immutable application snapshots |

## 9. Mobile-Gateway Workflows

`mobile-gateway` is organized by frontend workflow, not by a mirror of downstream services. The approved workflow
families are:

- configuration and legal;
- clubs;
- teams;
- pools;
- match list and detail;
- live submission, history, and moderation;
- user account and favorites;
- reports;
- search;
- notifications.

Inbound generated BFF models map to application commands. Outbound generated client models map immediately to
workflow-owned views or inputs inside the owning infrastructure adapter. Application projectors own fan-out,
deduplication, stable ordering, enrichment, cache use, missing-data handling, and partial-result behavior. API mappers
perform no network, repository, authorization, or cache work.

Current fan-out and failure behavior remains the compatibility baseline. Batching or concurrency is permitted only
after fixtures prove equivalent ordering, omissions, errors, authorization, and results. Caches hold immutable
application snapshots with explicit keys, TTLs, and invalidation; generated mutable DTOs are never cached or mutated.

Competition ranking is ultimately owned by `competition-service`. Signed federation PDF links remain a BFF
infrastructure concern and enter views only as derived values.

## 10. Expo And Scraper Boundaries

Expo owns Orval-generated DTOs, transport operations, validation schemas, query keys, TanStack hooks, query client, and
the auth/error mutator. Simple generated hooks may be consumed directly. A handwritten domain hook is introduced only
when it owns real cache, invalidation, pagination, orchestration, or view-model policy. The approved form target is
React Hook Form with handwritten Zod schemas; Formik and Yup remain transition-only for unmigrated forms. Generated
wire validation does not replace user-facing form semantics.

No generated transport type becomes route state, form state, persisted state, or a broad screen model. Deterministic
view/form transforms remain mobile-owned when the UI needs a different shape. Every migrated form separates its
generated wire schema, handwritten form schema, and generated request type, with an explicit typed submission
transform. The mobile-owned stack, output paths, mutator, form API, migration order, and parity gates are fixed by
[MRG-313](../decisions/mrg-313-expo-contract-generation.md). MRG-329 activates React Hook Form and Zod through the
central mobile form API while retaining Formik and Yup only for the explicit migration allowlist.

Each Python scraper keeps parsing, scheduling, proxy, authentication, federation, and domain values separate from its
Blockout adapter. Python identifiers may remain snake_case. The fully generated asynchronous clients selected by
[MRG-314](../decisions/mrg-314-python-contract-clients.md) own the canonical camelCase wire aliases; thin scraper-owned
adapters map immediately to and from application values. Generated types do not escape into parsing, caches,
schedulers, or provider rules. Blockout and provider sessions remain separate, Auth0 remains scraper-owned, and
federation/provider payload casing is unchanged.

## 11. Migration Slice Rule

Every vertical migration task follows this exact lifecycle:

1. capture deployed/current parity and supported callers;
2. define or update the authoritative source contract;
3. generate all configured impacted artifacts and prove deterministic output;
4. introduce the minimum role-owned application contracts and mappers required for isolation;
5. migrate persistence and infrastructure adapters while keeping entities, vendor adapters, event adapters, and
   generated clients at their owning edges;
6. migrate downstream BFF, Expo, scraper, worker, or event callers in the task's declared set;
7. prove request, response, error, auth, null, ordering, pagination, multipart, partial-result, event, and rollback parity
   applicable to the slice;
8. remove only the legacy types, annotations, and conversions whose MRG-267 gates are closed;
9. compile/build the impacted deployables and run existing behavior tests;
10. record compatibility removal and rollback evidence before declaring the boundary authoritative.

The first complete slice is `config-service` legal-document read and update. It proves generated server interfaces and
models, application command/view records, entity mapping, BFF generated client/projection, Expo generated client/hooks,
Problem Details compatibility, canonical camelCase, and rollback without involving multipart, events, or scrapers.
Its owner-side implementation and rollback evidence are recorded in the
[MRG-331 runtime migration](../migration/mrg-331-legal-document-runtime-migration.md).
The BFF generated-client boundary, retained v1 adapter, and consumer rollback are recorded in the
[MRG-332 BFF migration](../migration/mrg-332-mobile-legal-document-generated-client.md).
The generated Expo consumer, mobile view projection, and first React Hook Form/Zod migration are recorded in the
[MRG-333 Expo migration](../migration/mrg-333-expo-legal-document-client-form.md).
The remaining configuration Expo clients, wire validation, handwritten projections, Auth0 mutator continuity, and
deferred-form boundary are recorded in the
[MRG-344 Expo configuration migration](../migration/mrg-344-expo-configuration-client-migration.md).
The club, team, and pool Expo clients, catalog projections, cache continuity, privacy boundary, multipart policy, and
deferred-form ownership are recorded in the
[MRG-345 Expo catalog migration](../migration/mrg-345-expo-catalog-client-migration.md).
The match, live-link, and moderation Expo clients, page aggregation, cache and mutation continuity, signed-document
boundary, and deferred-form ownership are recorded in the
[MRG-346 Expo match migration](../migration/mrg-346-expo-match-client-migration.md).
The user, search, notification, and report Expo clients, optimistic and cache continuity, push and multipart policy,
and deferred-form ownership are recorded in the
[MRG-347 Expo relay migration](../migration/mrg-347-expo-relay-client-migration.md).
The source-syntax cleanup and complete REST regeneration are recorded in the
[MRG-377 OpenAPI normalization](../migration/mrg-377-openapi-standard-syntax-normalization.md).
The remaining config-service owner boundaries and the first search-worker generated snapshot client are recorded in
the [MRG-376 config runtime migration](../migration/mrg-376-config-runtime-migration.md).
The clubs-service owner boundaries, explicit logo intent, isolated v1 adapter, and generated worker snapshot client
are recorded in the [MRG-334 clubs runtime migration](../migration/mrg-334-clubs-runtime-migration.md).
The teams-service owner boundaries, follower projection, isolated v1 adapter, and generated worker, notification, and
users clients are recorded in the [MRG-335 teams runtime migration](../migration/mrg-335-teams-runtime-migration.md).
The matches-service core and day-page boundaries, Paris-local grouping, stable pagination, isolated v1 adapter, and
deferred BFF/scraper callers are recorded in the
[MRG-338 matches migration](../migration/mrg-338-matches-core-day-runtime-migration.md).
The live-link command/history boundary, generated users-service adapter, quota and transition parity, and isolated v1
transport are recorded in the
[MRG-361 matches live migration](../migration/mrg-361-matches-live-history-runtime-migration.md).
The separate moderation projection/actions, live-link report command, generated v2 boundaries, legacy adapter parity,
and retained concurrency behavior are recorded in the
[MRG-362 matches moderation migration](../migration/mrg-362-matches-moderation-report-runtime-migration.md).
The users-service account/profile boundary, explicit image intent, corrected positive numeric local identity,
isolated legacy adapter, and activated matches-service generated user client are recorded in the
[MRG-339 users migration](../migration/mrg-339-users-account-profile-runtime-migration.md).
The favorite command/page boundary, canonical local authority, generated team/pool projection clients, retained event
sequence, isolated legacy adapter, and deferred consistency work are recorded in the
[MRG-363 favorites migration](../migration/mrg-363-users-favorites-runtime-migration.md).
The Auth0 identity port, provider-first deletion orchestration, generated internal identity boundary, S3 profile-image
adapter, retained security behavior, and deferred retention work are recorded in the
[MRG-364 identity and storage migration](../migration/mrg-364-users-identity-storage-runtime-migration.md).
The generated report boundary, Blockout command/result and attachment roles, isolated legacy multipart adapter,
provider ports, preserved partial failures, and absence of an in-scope internal Blockout client are recorded in the
[MRG-340 reports migration](../migration/mrg-340-reports-runtime-migration.md).
The generated notification inbox page, stable canonical ordering, explicit enrichment identity, isolated legacy
continuation/casing adapter, and generated current-user client are recorded in the
[MRG-341 notification migration](../migration/mrg-341-notification-inbox-runtime-migration.md).
The current-user mutation boundary, state-sensitive result parity, validated generated push-token command, preserved
device lifecycle, and explicit caller-selected identity debt are recorded in the
[MRG-365 notification mutation migration](../migration/mrg-365-notification-mutation-token-runtime-migration.md).
The provider-neutral delivery records and ports, isolated Expo SDK adapter, token and ledger persistence adapters, and
preserved incomplete-ticket behavior are recorded in the
[MRG-366 notification delivery migration](../migration/mrg-366-notification-delivery-provider-runtime-migration.md).
The generated search owner boundary, isolated raw-array legacy adapter, application result records, strict store
mappers, and Elasticsearch document/query confinement are recorded in the
[MRG-342 search migration](../migration/mrg-342-search-runtime-migration.md).
The generated mobile-gateway configuration, report, search, notification, user, and favorite server/client boundaries,
workflow-owned records, multipart bridge, compatibility telemetry, and explicit v1 source-retirement gates are
recorded in the [MRG-343 BFF migration](../migration/mrg-343-mobile-gateway-relay-runtime-migration.md).
The generated club, team, and pool BFF interfaces, multi-owner projections, cache namespace coexistence, privacy,
ordering, fan-out, and missing-data policies are recorded in the
[MRG-367 catalog BFF migration](../migration/mrg-367-mobile-gateway-catalog-runtime-migration.md).
The generated match, live-link, history, moderation, and signed-document BFF interfaces, distinct workflow
projections, partial-result policies, ranking order, downstream authentication, and v1 coexistence gates are recorded
in the [MRG-368 match and live BFF migration](../migration/mrg-368-mobile-gateway-match-live-runtime-migration.md).

## 12. Approved Roadmap Sequence

1. MRG-301 through MRG-304 capture deployed REST, event, handwritten-client, casing, coexistence, and rollback truth.
2. MRG-305 through MRG-316 establish fragments, deterministic bundling, lint, backend generation, shared models, and
   the separately approved Expo, Python, and event generators.
3. MRG-317 through MRG-330 define owner REST contracts, the BFF workflow contracts, Expo generation, and scraper
   generation.
4. MRG-331 through MRG-333 deliver the legal-document pilot across service, BFF, and Expo.
5. MRG-377 removes non-standard scalar and authorization metadata after the generator pilot, regenerates all outputs,
   and aligns the remaining OpenAPI sources with Maaatch-style standard syntax without changing approved behavior.
6. The remaining service, BFF, Expo, and scraper boundaries migrate in dependency order with the detailed roadmap
   splits approved by MRG-268.
7. Event families and service outboxes migrate independently after the event source is approved.
8. Jackson naming, legacy annotations, Expo transforms, and case-conversion packages retire in service waves only after
   all callers are canonical.
9. Repository guards, generation/no-diff verification, and boundary-authority evidence close Phase MRG-300.
10. Phase MRG-400 completes deep service restructuring in a second controlled pass.

The [MRG-401 implementation slice rule](../migration/mrg-401-backend-implementation-slice-rule.md) governs that second
pass. Every Phase MRG-400 roadmap item remains one independently validated service-feature change; generated object
models stay adapter-local, behavioral parity precedes removal, and MRG-267/MRG-304 gates remain mandatory.

## 13. Generator Decisions

This architecture fixes ownership while the three decision tasks select tools within those boundaries:

- [MRG-313](../decisions/mrg-313-expo-contract-generation.md) selects Orval `8.22.0`, Zod `4.4.3`, React Hook Form
  `7.72.0`, the React Query/Axios outputs, mobile-owned mutator, central form API, migration sequence, cache invariants,
  and generated-file policy;
- [MRG-314](../decisions/mrg-314-python-contract-clients.md) selects OpenAPI Generator `7.23.0` through CLI `2.39.1`,
  six fully generated Python 3.12 asynchronous `httpx` clients in one local wheel, thin scraper-owned adapters,
  generated aliases, separate Blockout `httpx` and provider aiohttp ownership, scraper-owned Auth0, generated
  multipart signatures, and no Blockout retry; MRG-330's `asyncio` output is an interim baseline replaced by MRG-378
  before scraper call migration;
- [MRG-315](../decisions/mrg-315-rabbitmq-event-contracts.md) selects AsyncAPI `3.0.0` JSON, parser `3.6.0`, Modelina
  `5.10.1`, event-specific envelopes, Java 21 records in `com.blockout.events.v2.model`, hermetic Maven ownership, AMQP
  metadata without `__TypeId__`, and the unchanged MRG-304 v2 topology.
- [MRG-369](../migration/mrg-369-favorite-follow-event-contract-migration.md) adds the team/pool followed and
  unfollowed contracts, positive numeric identity, isolated publisher/consumer mappings, notification-owned Q-18/Q-19
  v2 declarations, and an idempotent rebuild boundary without activating dual publication or v2 side effects.

The generator decisions may be implemented only within the ownership and casing rules above. Later tasks may not
reopen the architectural decisions approved by MRG-268 or MRG-313 through MRG-315 without a new Plan-mode decision.

## 14. Completion Evidence For Later Boundaries

A REST or event boundary becomes contract-authoritative only when all of the following are proven:

- source contract and generated artifacts are deterministic;
- generated server/client models remain adapter-owned;
- application and persistence mappings are explicit;
- BFF, Expo, scraper, worker, event, and known external consumers are migrated;
- canonical camelCase is emitted and temporary legacy reads are removed;
- current behavior or an explicitly approved replacement is covered by parity evidence;
- the deployment and rollback order is executable;
- MRG-267 compatibility/removal gates are closed for every removed field or type;
- relevant generation, compilation, build, existing tests, and CI pass;
- standalone production authority remains unchanged until the later cutover phase.
