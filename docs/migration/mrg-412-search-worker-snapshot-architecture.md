# MRG-412 Search Worker Snapshot Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `search-worker`
- Scope: generated source adapters, service-token transport, cache bootstrap and refresh schedules, immutable cache
  snapshots, and full-rebuild scheduling boundary
- Production effect: none

## Purpose

MRG-412 completes the approved Phase MRG-400 structural slice for the search worker. Generated club, team, pool, and
division clients remain outbound adapters and map their response models immediately to immutable application
snapshots. The worker then maps source snapshots to worker-owned cache snapshots in one application service instead
of converting them into mutable Rabbit event objects.

This task also separates startup and scheduled triggers from cache refresh and full-index rebuild application
operations. It preserves the existing startup order, ten-minute cache cadence, hourly rebuild cadence, source calls,
index names, documents, enrichment fallbacks, and failure behavior.

## Generated Client And Authentication Boundary

The three paginated generated adapters share one transport-only page collector. It starts at page zero, retains the
page size of 100, stops when canonical `pageInfo.hasNext` is not true, keeps source order, tolerates null response or
item collections as an empty remainder, maps every item immediately, and returns an immutable list. The unpaginated
division adapter retains the same immediate mapping rule.

The generated clients share one authenticated `RestTemplate` with a five-second connection timeout and a fifteen-
second read timeout. Auth0 client-credentials acquisition is isolated behind `ServiceTokenProvider`; the scheduled
token manager exposes only `ServiceAccessToken` to HTTP configuration. Startup now fails if no initial nonblank token
can be acquired. A later refresh failure logs the retained expiry and preserves the last known-good token instead of
publishing blank or partially replaced state. The existing domain, client ID, secret, audience, bearer header, and
48-hour refresh cadence are unchanged.

Generated models remain confined to the four outbound catalog adapters. They never enter refresh services, caches,
jobs, index services, documents, or event listeners.

## Atomic Immutable Snapshots

Club, team, and division cache values are records owned by the worker projection application. Each cache publishes a
complete unmodifiable `LinkedHashMap` through one atomic reference. Full refresh builds the replacement away from
readers and swaps it once, so readers see either the complete previous generation or the complete replacement and
never the former clear-then-fill intermediate state.

Incremental writes use copy-on-write compare-and-set updates. Team identity is now its team ID rather than an append-
only list entry under a club ID. Repeating the same team replaces one value, and a changed club ID moves that team
between derived club views without leaving a duplicate. Club removal publishes one filtered team snapshot while
retaining the previous behavior of removing all cached teams owned by that club. Returned collections are immutable
copies and preserve source insertion order.

`ProjectionCacheRefreshService` is the sole source-snapshot-to-cache-snapshot mapper. Startup invokes club, team, and
division refresh in the retained order and still fails if a source cannot initialize. The three scheduled cache jobs
remain independently failure-isolated: a failed fetch is logged and the last complete cache generation remains
visible. Schedule classes contain no generated clients, mapping, or cache replacement mechanics.

## Index Scheduling And Mapping Compatibility

The hourly job delegates to `SearchIndexRebuilder`, which retains the current club, team, and pool order and current
delete-before-fetch behavior. That destructive implementation is intentionally unchanged until MRG-430 introduces
versioned index generations, validation, alias swaps, bounded rollback retention, and failed-rebuild reconciliation.

Index services map inbound event values to immutable cache snapshots before storing them. Team and pool enrichment
now reads immutable club and division snapshots. The retained fallbacks remain unchanged: missing clubs yield null
club fields, a nonblank team logo wins over the club logo, and missing divisions yield `Division inconnue`, null
division ID, and null division logo. A club update reprojects the immutable cached teams for that club without
converting them back into event payloads.

## Compatibility And Closed Scope

REST and event contracts, generated artifacts, Rabbit routes and topology, listener activation, acknowledgement,
retry/requeue and DLQ behavior, event decoding, deduplication, source URLs, source filters, index names, mappings,
documents, aliases, repositories, schedules, credentials, callers, deployment, production, and Maaatch are unchanged.

MRG-429 retains exclusive ownership of event-consumer and incremental-projection restructuring, including versioned
event inputs, stale-write protection, deactivation eviction, idempotency, cache consistency, dependent reprojection,
and reconciliation evidence. MRG-430 retains index generations, validation, alias swaps, rollback-index retention,
cleanup, and failed-rebuild reconciliation. No production activation, cutover, legacy retirement, MRG-9xx, or
MRG-1000 action is authorized.

## Verification And Rollback

Focused tests cover canonical pagination and bearer transport, immutable cache replacement, ID-based team replacement,
club movement and removal, source-to-cache mapping, required initial token acquisition, and last-known-good token
retention. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl search-worker -am -Dtest='!WorkerSearchApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only `search-worker` image revert. Contracts, generated source bundles, Elasticsearch indices and
documents, Rabbit state, source services, environment values, deployment, and production authority remain compatible
with the previous image.
