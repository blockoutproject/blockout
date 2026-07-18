# MRG-411 Search Query And Adapter Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `search-service`
- Scope: raw search queries, exact filters, application search views, Elasticsearch request construction, document
  mapping, ordering, and empty-result fallback
- Production effect: none

## Purpose

MRG-411 completes the approved Phase MRG-400 restructuring of `search-service` after MRG-342 established generated
v2 boundaries and isolated v1 compatibility. It separates the raw text query from the optional exact-filter set,
names the returned projections as application views, and moves Elasticsearch request construction out of the
store-execution adapters.

This is a structural slice. It does not change search fields, boosts, matching, limits, termination, timeout, source
projection, ordering, fallback, REST contracts, index ownership, or caller behavior.

## Ownership

| Concern                        | Application owner                                 | Elasticsearch adapter owner                        |
| ------------------------------ | ------------------------------------------------- | -------------------------------------------------- |
| Raw search text                | `SearchQuery`                                     | read without trimming or normalization             |
| Optional exact filters         | `SearchFilters`                                   | exact `term` clauses                               |
| Combined filtered operation    | `FilteredSearchQuery`                             | request factory input                              |
| Club, team, and pool responses | immutable `ClubSearchView`, `TeamSearchView`, and | adapter-local mutable source documents and mappers |
|                                | `PoolSearchView`                                  |                                                    |
| Fallback policy                | feature search services                           | exceptions escape the store boundary               |
| Query shape and source fields  | no Elasticsearch dependency                       | feature-owned request factories                    |
| Search execution               | feature store ports returning ordered application | `Elasticsearch*SearchStore` execution and hit      |
|                                | views                                             | mapping                                            |
| Shared query mechanics         | no vendor types                                   | `ElasticsearchSearchQueryFactory`                  |

Generated REST models remain confined to the canonical v2 API edge. Legacy v1 response records remain confined to
the v1 adapter. Elasticsearch `SearchRequest`, query DSL types, hits, and mutable source documents remain confined to
outbound packages. No generated transport or Elasticsearch document crosses an application port.

## Retained Query And Filter Semantics

Null, empty, and whitespace-only text still select an unseeded random-score `match_all` query with size 5,
`terminate_after` 1,000, timeout 150 ms, and disabled total-hit tracking. Nonblank text still passes byte-for-byte to
the `bool_prefix` `multi_match` query with `AND`, size 20, `terminate_after` 5,000, timeout 150 ms, and disabled
total-hit tracking.

The retained text fields and boosts are unchanged:

- clubs: name x4, city x2, and `all`;
- teams: short name x4, name x3, club name, club city, and division name x2, then `all`;
- pools: short name x4, name x3, division name and league name x2, then `all`.

Team and pool season, division ID, format, and gender remain optional exact `term` filters. Null or blank string
filters remain absent rather than normalized. Nonblank filter values retain surrounding whitespace and casing.
`divisionId` remains an adapter-only source field required by the index query even though it is not exposed in the
application views.

Source field lists, field order, index names (`clubs`, `teams`, and `pools`), and document mapping are unchanged. No
fuzzy matching, trimming, case conversion, pagination, retry, deterministic random seed, query expansion, or index
change is introduced.

## Ordering And Empty-Result Compatibility

No Elasticsearch sort clause is added. Blank searches therefore retain their unseeded random order, while nonblank
searches retain Elasticsearch score order and the existing unspecified tie order. Store adapters stream hits and map
them one-for-one in response order. Application services and both REST adapters preserve that list order without
sorting, grouping, deduplicating, or filtering it.

Every exception raised while building or executing an Elasticsearch request, deserializing a source document, or
mapping a document still crosses the store port and is caught by the owning application service. Club, team, and pool
searches all return an empty immutable list for those failures, exactly like a genuine no-match result. The canonical
v2 routes still return 200 wrappers with empty `items`; the legacy v1 routes still return 200 raw empty arrays.

## Compatibility And Closed Scope

The generated v2 operations, legacy v1 routes, required-but-blank-compatible query parameters, snake-case v1
`division_id`, permissive v1 format and gender strings, canonical shared enums, wrappers, raw arrays, status codes,
Problem Details, authentication, scopes, callers, environment values, and credentials are unchanged. Contracts and
generated artifacts are unchanged.

`search-worker` remains the exclusive index writer. MRG-412 owns worker bootstrap, schedules, generated clients, and
cache snapshots. MRG-429 and MRG-430 own event projection, idempotency, index versioning, alias swaps, rebuild, and
reconciliation. MRG-413 through MRG-416 own mobile-gateway client and facade restructuring. There is no index write,
alias operation, cache mutation, event operation, deployment, production activation, or data migration here.
Production v1 retirement, cutover, deployment, and every MRG-9xx/MRG-1000 action remain outside this active goal.

## Verification And Rollback

Focused tests cover raw query pass-through, separate exact filters, random and text request shapes, boosts, limits,
timeouts, source fields, absence of explicit sorting, application-view mapping, stable store order, v1/v2 boundary
mapping, and the all-exception empty-list fallback for every feature. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl search-service -am -Dtest='!SearchApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only `search-service` image revert. Existing indices, documents, mappings, aliases, worker state,
contracts, routes, callers, environment values, deployment, and production authority remain compatible with the
previous image.
