# Backend Rebuild Architecture

## Authority and Scope

This document defines the replacement backend architecture. Observable behavior belongs to [the rebuild specification](../../specs/002-backend-rebuild/spec.md), vocabulary and resource ownership to the [domain model](blockout-domain-model-v1.md), and native application boundaries to the [mobile architecture](mobile-and-identity-architecture-v1.md). The target architecture does not certify the deployed runtime.

This is an architectural decision record, not a substitute for feature-specific `plan.md`, generated tasks, detailed OpenAPI contracts, Figma approval, or production evidence. Technical plans must resolve the integration checks below before creating executable implementation issues. The constitution's UI gate must not be bypassed by calling UI implementation an architectural task.

## Decisions, Alternatives, and Verification

| Decision                   | Need and selected solution                                                                                                                 | Simpler alternative and consequence                                                                                                                     | Required verification                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| D01 — Runtime              | One modular Java backend with API and worker executables sharing business modules and a release revision; Python scrapers remain separate. | One JVM is simpler but shares heap, pauses, restart, and background failure impact. Two processes still contend for the same host/database.             | Simultaneous read/import/notification load; bounded pools; independent worker restart; no internal HTTP business fan-out.  |
| D02 — Persistence          | One fresh PostgreSQL database, Liquibase migrations, explicit owners, foreign keys, unique constraints, and new opaque public IDs.         | Recreate old service databases mechanically; retains cross-owner write failures and redundancy.                                                         | Empty-schema bootstrap, next-version upgrade, concurrent writes, identity/season invariants, old-ID rejection.             |
| D03 — Durable work         | Transactional jobs/events in PostgreSQL, leased consumption and idempotent effects; no RabbitMQ in the replacement path.                   | In-memory dispatch loses work; immediate external publishing is not atomic with business writes. Persistent work adds lease/retry/cleanup operations.   | Crash before/after commit, expired lease, duplicate effect, poison work, pool contention.                                  |
| D04 — Ingestion            | Authenticated generated import contract; durable scoped observations followed by per-pool validation/publication.                          | Direct entity-by-entity writes can expose incomplete relationships. Staging adds storage and asynchronous status.                                       | Provider matrix, complete/partial distinction, ordered observations, replay, source priority, overrides.                   |
| D05 — Time                 | Precise instants in UTC, separate source-local schedule and IANA zone, explicit date-only state; device zone for display.                  | A timestamp alone loses source intent; machine-local conversion changes semantics. Explicit values require consistency checks.                          | Python/Java/database/mobile parity, DST gaps/overlaps, device-zone change, date-only and real-midnight cases.              |
| D06 — API/read composition | Source-first `/api/v2`, module-owned resource APIs and in-process mobile composition; bounded reads and safe errors.                       | Preserve old routes/remote joins; retains coupling and old authority assumptions.                                                                       | Generated producer/consumer compilation, authorization/ownership tests, query-count and response-size bounds.              |
| D07 — Feeds                | Bounded match pages with opaque filter/zone/revision-bound cursors; explicit refresh after incompatible mutation.                          | Offset pages silently skip/duplicate; immutable historical feed snapshots cost additional persistence. Selected design can interrupt long continuation. | Equal sort values, changed membership/date, no-op imports, timezone switch, cross-page group continuity.                   |
| D08 — Identity/Pro         | Retain Auth0/RevenueCat identity associations, server-owned access evidence, secure linking and one-time mobile reset.                     | Reuse new local IDs for purchases or merge by email; simpler but breaks continuity/security.                                                            | Real controlled upgrade/restore/account-switch evidence, provider outage, interrupted linking, negative authorization.     |
| D09 — Search               | Retain Elasticsearch with explicit mappings, incremental bulk projections, versioned index generations and alias switching.                | PostgreSQL text/trigram search reduces operations but requires relevance/autocomplete parity work. Existing prefix queries remain supported.            | Labeled relevance corpus, compatible versions, rebuild with concurrent writes, stale events, partial bulk failures.        |
| D10 — Toolchains           | Nx coordinates Maven/uv/Expo; source contracts precede generated artifacts; immutable images and dedicated migration job.                  | Ad hoc builds or a second build system hide dependencies. Existing toolchains already cover the ecosystems.                                             | Clean checkout builds, generation drift checks, dependency graph, image revision and deployment ordering.                  |
| D11 — Diagnostics          | Safe stable API error codes, UTC structured logs, bounded-cardinality metrics, foreground and freshness signals.                           | Catch-and-empty responses conceal incidents. Explicit failures require client recovery states.                                                          | Error mapping tests; logs without secrets/PII; alerts on stalled imports/search/jobs despite healthy processes.            |
| D12 — Cutover              | Prebuild fresh system, mandatory update, one-time local logout, new API only, rehearsed thirty-minute opening.                             | Temporary old API adapters support reverse cutover but are explicitly rejected by the human. After opening, repair the replacement.                     | Actual old/new binaries, controlled paying users, pre-opening failure, restore of replacement state, isolated old writers. |

## Runtime and Module Ownership

Use feature-first modules with API, application, domain, and infrastructure boundaries. Two thin executable Maven modules assemble the same business modules for foreground and background roles. Generated transport models remain at adapters, not in application/domain types.

| Owner                  | Authoritative resources or operations                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sports                 | Clubs, divisions, teams, pools, competition associations, matches, source mappings relevant to sports, official standing snapshots and manual match/catalog corrections |
| Identity/access        | Business profiles, external identity mappings, permissions, account linking, subscription evidence                                                                      |
| Community              | Favorites and live-link moderation, using sports/identity application boundaries for referenced resources                                                               |
| Communications         | Inbox, device registrations, delivery attempts, recipient processing                                                                                                    |
| Administration/support | Application status, legal content, reports, media lifecycle and operational controls; delegates changes to the actual business owner                                    |
| Search adapter         | Derived club/team/pool documents and search reads; never authoritative sporting or authorization state                                                                  |
| Mobile composition     | Client-specific reads/commands through owner application boundaries; no duplicate business rules or HTTP calls to the same backend                                      |

A shared database does not authorize arbitrary cross-module entity access. Owners expose focused read/application operations; composition uses bounded owner-controlled projections. Transactions belong to the operation owning the business write. External HTTP calls are performed outside those transactions.

Configure foreground/background SQL pools, query/statement timeouts, job concurrency and container resources from measured capacity. The sum of connection limits must fit PostgreSQL with administrative headroom. Resource separation is not high availability and cannot compensate for unbounded queries.

## Persistence and Import Contract Constraints

- Liquibase is the only replacement schema migration mechanism. Keep legacy Flyway resources isolated until retirement; do not run both against the replacement schema.
- Seed required divisions, provider mappings, legal content and application-status configuration deterministically. Test restart and repeated seed execution.
- Public IDs must not reuse legacy numerical IDs. Provider identities include source and season where relevant; mutable names do not define identity.
- Enforce unique external identity, favorite relationship, competition association, and active live-link constraints in the database.
- Source values and manual overrides remain separate for owned match/catalog fields. Official standings are source-owned snapshots and accept neither manual overrides nor calculated replacements. Track observation, publication, business modification and correction times distinctly.
- A lot's source/scope/season and idempotency identity are immutable. Same key/same payload returns the existing outcome; same key/different payload is a conflict.
- A `202` response is issued only after durable receipt and includes status-resource location. Clients distinguish receipt from publication.
- Prevent old batches overtaking newer accepted observations using scoped sequencing/version checks; arbitrary client timestamps alone are not ordering authority.
- Calendar validation/publication is per pool. References needed for publication resolve before exposure; a failed calendar retains its last published version. Official standing snapshots are validated and published independently so their absence does not block a valid calendar.
- Source completeness is distinct from successful download. Club/contact failures cannot authorize deactivating unrelated clubs.
- Missing optional enrichment preserves last valid enrichment. Successful whole-pool validation is not a requirement to wait indefinitely for every optional provider.
- Source priorities and supported field coverage derive from the baseline; normalizers/providers remain behind adapters.
- Retry transient failures only. Retain rejected observations and actionable reasons for correction/replay with bounded payload retention; define exact payload limits and retention in the ingestion plan from measured batch sizes.
- Persist business events with the publishing transaction. Completed-match bootstrap is silent. Correction events update dependent views and existing inbox content without another result push.

Jobs require state, attempt count, next attempt, lease owner/expiry, idempotency identity and safe diagnostic code. Reserve with short transactions; perform external work outside locks. A restarted worker recovers expired leases. An event can produce separate idempotent search/inbox/delivery work. Acknowledging one consumer must not discard another consumer's pending effect. Do not claim exactly-once external push delivery.

## Official Standing Snapshots

The sports owner stores official snapshots scoped to source, competition, pool and season. Preserve source positions, row order, ties, points, penalties and statistics. Validate context, complete observation, interpretable rows and resolved team identities; missing optional statistics remain absent. Do not derive standings or their statistics from match scores, calculate tie-breaks, or reorder tied teams by local policy. The gateway and mobile format the supplied values without becoming ranking engines.

An invalid or unavailable source observation leaves the previous usable snapshot for that pool/season in place. If none exists, expose an explicit unavailable state rather than an empty completed ranking. Keep collection time separate from the source's update time when available; do not invent source freshness from download time. New results and manual match corrections never modify this snapshot. Tests cover missing, stale, partial, malformed, wrong-pool/season and tied standings, including valid calendars published while standings are unavailable.

## Temporal Contract

### Precise and Incomplete Schedules

Use a discriminated schedule at boundaries:

- Known instant: `startsAt` as RFC 3339 UTC with `Z`, source civil date/time, source IANA `timeZone`, and known precision.
- Date-only: source `date` in `YYYY-MM-DD`, source `timeZone`, unknown-time precision, no `startsAt` or fabricated local midnight.

This is a contract constraint to realize in source OpenAPI, not a handwritten second client model. PostgreSQL uses `timestamptz` for instants, `date` for civil dates and a separate zone field. Java uses `Instant`/`LocalDate`/`ZoneId`; Python uses aware datetimes and `zoneinfo`. API precision is explicitly documented and preserved across generated clients.

Interpret supplied offsets and IANA rules together. Reject contradictions or unresolved ambiguous/nonexistent local times. Keep provider evidence sufficient to diagnose them without logging full provider payloads. Preserve future source-local schedule intent so timezone-database updates can be checked against the derived instant; do not silently rewrite published schedules on a runtime upgrade.

Establish `00:00` semantics separately for each supported provider/format from controlled evidence. Do not globally classify every midnight as unknown. Missing dates do not become 1970. An incomplete date-only observation is valid only when its civil date is trustworthy; malformed chronology follows per-pool validation rules.

### Display, Filtering, and Rules

- The mobile reads the device IANA zone at startup/resume and sends `timeZone` on day-dependent reads.
- Missing zone defaults explicitly to UTC; invalid zone receives `400` with a stable validation code. Responses identify the effective zone.
- Query keys and cursors include the zone. On zone change, cancel obsolete work and rebuild affected consultations before continuation.
- Known-instant groups use device-local day boundaries. Query UTC instants with a half-open range derived from local start-of-day to next local start-of-day, never `start + 24h`.
- Date-only entries retain their source civil date and explicit unknown-time meaning. Filter them by the announced date rather than UTC bounds. Preserve day then pool grouping; within each day/pool group put unknown-time entries after timed entries, using immutable-ID tie-breaking without a fabricated sort timestamp.
- Upcoming date-only entries use the source business date to decide calendar eligibility. Completed status is based on validated results, not an invented kickoff instant.
- Known-instant relative labels compare civil dates in the selected display zone. Date-only relative labels use the competition calendar and identify the announced date as source-local; do not inherit a device-relative label that would misrepresent that date. Plain dates must not pass through implicit device-local parsing.
- Match eligibility windows and entitlement grace use trusted elapsed time. Daily live quotas retain Europe/Paris business-day boundaries. Unknown kickoff time cannot authorize a time-dependent pre-match write; moderation and post-finish rules remain explicit exceptions.
- Existing busy scraper windows remain Sunday from 14:00 and Saturday from 17:00 Europe/Paris at five-minute cadence, thirty minutes otherwise.
- UTC logs and persisted instants do not depend on container default zone. Synchronize host clocks; use injectable clocks for tests and monotonic durations for latency measurements.
- Notification content must not embed an unqualified server-local kickoff time. Store structured temporal context; render in-app using the device zone and per-device push text only when a trustworthy device zone is available.

## API, Feeds, and Native Integration

Write new source OpenAPI under the existing contract pipeline before changing producers or generated consumers. Use plural resources, owner operations, explicit filters, `201`/`Location` for creation, safe ProblemDetail failures, and idempotency where requests can be retried. URL words such as `secure` are not authorization policy.

The new mobile surface uses `/api/v2`. Preserve `GET /api/v1/mobile/public/config/app-status` at the legacy origin with its existing response shape solely for old-client update/maintenance guidance. Verify the actual installed bootstrap path: a valid status response alone does not prove an old app will escape its splash screen after business calls fail.

Feeds use forty matches by default and at most one hundred. Maintain current scopes and OR-selection semantics between followed team/pool targets; do not expose an unrequested global feed. Upcoming days sort ascending and completed days descending. Within a day use stable pool identity, chronological direction appropriate to the tab, and immutable match ID. Unknown-time ordering is specified above.

An opaque cursor binds selection, direction, effective timezone, limit, authorization context when relevant, and membership/order revision. Validate it again under current authorization. Reject tampered/incompatible cursors with a stable safe error; the mobile retains visible rows and offers refresh. No-op imports must not invalidate continuation. A label/score-only change that cannot affect ordering need not invalidate membership. Exact expiry and revision representation belong in the feed plan, which must test mutation and disclosure boundaries.

Send group context with each bounded page so one large pool may span pages. The mobile flattens to individually virtualized matches and headers without client business sorting or per-match network calls. Prevent repeated headers and unstable row references. Release-mode performance tests are required.

A first-launch reset marker is written only after required cleanup succeeds. Clear credentials, remote caches, previous user/guest identity intent, stale resource navigation and entitlement presentation before silent bootstrap; never call account deletion. Reconnection remains explicit, though the external system browser may retain provider SSO. Re-register push ownership after sign-in. Old deep links must reach unavailable states, not a reused ID.

## Subscription and Linking Boundaries

The current app identifies RevenueCat customers using the Auth0 subject. Recreated local IDs must not replace it. Preserve the existing customer binding and use server-verified access evidence. Authenticate and deduplicate webhooks, then reconcile current provider state; do not assume delivery order or that cancellation implies expiration.

Linking retains the initiating signed-in business profile ID, pseudonym and photo and unions/deduplicates favorites. It requires fresh proof of both accounts and a persisted recoverable operation. The surviving business profile, Auth0 primary identity, and RevenueCat billing identity are separate concerns; do not assume an Auth0 link merges purchases or requires a new billing identity. Preserve the sole existing paid binding even when the initiating business profile was free. Do not union privileged roles.

Two independently active subscriptions block linking before identity/profile mutation. Both accounts remain usable; the app explains the conflict and exposes its existing support contact path without promising refund, cancellation or purchase merge. Verified aliases of one subscription are not two independent subscriptions. After conflict resolution, reverify both identities and current entitlements before merging. The identity plan must define the provider operations, tenant capabilities and interruption recovery implementing these rules; never store proof tokens in ordinary tables or logs.

Grace is measured from a server-positive verification and capped at twenty-four elapsed hours and known expiration. A fresh reset has no historic local proof. Unknown provider state produces retryable indeterminate access, not a false non-subscriber decision or a client-granted entitlement. Pro checks protect the owning operations even if the mobile hides a button.

## Search Design and Compatibility

Retain three resource projections with one versioned mapping source shared by readers/writers. Use exact fields for identifiers/filters and analyzed fields for names/context. Preserve original display values. Keep `search_as_you_type` plus `bool_prefix`, accent/case normalization and explicit field relevance; remove unused completion fields only after consumer verification. Do not add embeddings or synonym rules without a justified corpus.

Empty search returns bounded deterministic eligible suggestions. Nonempty search returns bounded ranked suggestions with immutable-ID tie-breaking. This autocomplete contract is separate from paginated catalog browsing and match feeds. Test accents, punctuation, prefixes, compound names, eligible categories and combined filters with labeled expected results.

Use incremental bulk projection jobs and inspect each item's outcome. Track authoritative resource versions so stale updates/deactivations cannot override newer state. Changes to parent labels schedule affected dependent projections. Elasticsearch is not an authorization source or a business owner.

Rebuild into a fresh generation while the active generation serves reads. Establish a consistent source snapshot/checkpoint, replay intervening committed changes including deletions, verify convergence, and switch aliases only after a safe handoff. A simple alias swap without catch-up is insufficient. Do not delete indexes on worker startup or empty the serving index before refill. Allow normal refresh for routine writes; avoid a forced refresh per document.

Return distinct retryable search failures for transport errors, timed-out queries and unacceptable partial shard responses. Do not convert exceptions to empty success. Inspect or remove early termination settings that silently compromise relevance/completeness. Keep cancellation/debouncing at the mobile boundary and ignore obsolete responses.

Use a private Elasticsearch endpoint with least-privilege runtime/index-management credentials. Start with one primary shard per resource index and zero replicas on the single-node deployment; document the lack of high availability and rebuild/recovery procedure. Set heap/resources from measured data rather than mechanically keeping the current 512 MB example.

The repository currently declares Elasticsearch 9.4.2 and Spring Boot 4.1.0. These are configuration evidence, not confirmation of deployed versions. Resolve the effective Spring Data/client dependencies and actual deployment before pinning a supported stable tuple. At research time the official table associates Spring Data Elasticsearch 6.1.x with Elasticsearch 9.4.5; verify the final tuple with integration tests. Search compatibility updates are within scope; unrelated framework modernization is not.

## Builds, Validation, and Release

Nx coordinates the real Maven/uv/Expo dependency graph. Use source-first contracts, generated outputs outside Git, two Java executable artifacts sharing business modules, explicit source/build dependencies, and immutable image revisions. A dedicated Liquibase job completes before starting compatible API/worker versions. Never couple a normal process restart with a destructive data/index reset.

Compare old/new semantic outputs with the controlled fixtures and fourteen baseline scenarios. Add temporal parity, negative ownership, subscription continuity, import replay and search-generation tests. Native builds are necessary for reset, identity, purchases, push and timezone lifecycle evidence; unit mocks do not prove provider behavior.

Record representative Sunday request mix, volumes, latency/error reference, database contention, processing lag, resource limits and run duration before qualification. Compare old/new at matched workloads and qualify the replacement at twice the observed peak on comparable isolated resources against the recorded reference thresholds, with simultaneous imports and notifications. Do not load-test production as an incidental verification step.

Measure collection cadence separately from receipt-to-publication latency. In fault-free qualification each complete valid observation must publish in less than five minutes after durable receipt. An alert does not turn a latency failure into success. Separately inject source/worker failures and verify incident detection, last-valid-state retention and replay. Monitor actual publication freshness rather than process liveness alone.

Prepare fresh data/indexes and released mobile binaries before the thirty-minute maintenance window. Isolate legacy writers/messages; test the actual old status/update path. If readiness fails, postpone opening. After opening, recover compatible replacement code/data; do not redirect updated clients to the old business backend. Preserve recovery material for the replacement according to the operational release plan, not as a migration requirement for old rows. Production cutover and irreversible retirement require separate human release direction.

## Evidence and Sources

- [Capability baseline and observed defects](../engineering/backend-preservation-baseline.md)
- [Current mobile match date formatting](../../apps/frontend/mobile/src/modules/match/view-models/match-date.ts): mixed UTC-relative labels and device-local date-fns formatting.
- [Current scraper normalization](../../apps/backend/competition-scraper/scraper/domain/normalization.py): midnight-specific UTC exception.
- [Current search reader](../../apps/backend/search-service/src/main/java/com/blockout/search/search/infrastructure/elasticsearch/ElasticsearchSearchReader.java): exception-to-empty behavior and unseeded random suggestions.
- [Current index initializer](../../apps/backend/search-worker/src/main/java/com/blockout/workersearch/projection/infrastructure/elasticsearch/ElasticsearchIndexInitializer.java): deletes/recreates indexes on startup.
- [PostgreSQL temporal types](https://www.postgresql.org/docs/current/datatype-datetime.html): instants do not preserve the original zone name.
- [PostgreSQL queue consumption](https://www.postgresql.org/docs/current/sql-select.html): short reservations using `SKIP LOCKED` can support queue consumers.
- [Spring Data Elasticsearch versions](https://docs.spring.io/spring-data/elasticsearch/reference/elasticsearch/versions.html).
- [Elastic search-as-you-type](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/search-as-you-type), [aliases](https://www.elastic.co/guide/en/elasticsearch/reference/current/aliases.html), [refresh](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/refresh-parameter).
- [RevenueCat identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers) and [Auth0 account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking).

External documentation was consulted during planning on 2026-09-12. No live customer records, provider payload exports, or production runtime changes are part of this decision.
