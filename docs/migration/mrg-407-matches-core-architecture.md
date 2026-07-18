# MRG-407 Matches Core Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `matches-service`
- Feature family: match catalog, scraper updates, detail enrichment, and day projection
- REST operations: `MATCH-01` through `MATCH-06`
- Persistence: `matches`
- Production effect: none

## Purpose

MRG-407 completes the match-core restructuring after MRG-338 established generated canonical HTTP boundaries and
MRG-372 established the transactional outbox. Match-core application code no longer imports Spring Data, JPA
entities, repositories, persistence mappers, generated models, or live-link entities.

The slice preserves all six core and day operations, both compatibility versions, authorization scopes, create and
update semantics, one-way finish transitions, event-before-save ordering inside the transaction, stable pagination,
day discovery and grouping, active-link enrichment, legacy null behavior, persistence mapping, and Flyway history. It
changes no contract, generated artifact, table, query, event route, queue, caller, configuration, deployment,
production resource, or authority.

## Ownership

| Concern           | Inbound adapter                                  | Application roles                                                                                            | Persistence or deferred owner                                                             |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Match catalog     | isolated v1 and generated v2 controllers/mappers | create/update/deactivate commands, snapshot/page views, `MatchStore`, update plan/change/handle, and service | `JpaMatchStore`, `Match` entity, repository, and strict persistence mapper                |
| Detail enrichment | v1 and generated v2 detail operations            | `MatchLiveProjectionStore`, minimal live projection, and `MatchDetailProjector`                              | `JpaMatchLiveProjectionStore` over the retained live-link repository                      |
| Day projection    | v1 and generated v2 day controllers              | defensive query, `MatchDayStore`, read-only projection service, day projector, and grouped immutable views   | `JpaMatchStore` retains the four audited date/range queries                               |
| Finish event      | create/update application flow                   | immutable finish input through `MatchLifecycleEvents`                                                        | existing dual-wire outbox adapter and mapper remain unchanged                             |
| Live/moderation   | separate generated and legacy adapters           | current live, policy, moderation, and report behavior retained                                               | direct entity/repository coupling remains explicitly deferred to MRG-423 and MRG-424      |
| Compatibility     | v1 snake-case JSON and v2 generated server       | role-owned commands and views shared only after transport mapping                                            | current MRG-304 coexistence, observation, rollback, and retirement gates remain unchanged |

No independent match domain value is introduced. The current match core has no separately proven invariant-bearing
value: its set-driven status transition remains application orchestration over role-owned records. Adding a
field-for-field domain mirror would create a synthetic mapping layer prohibited by MRG-401.

## Catalog, Mutation, And Persistence

`MatchApplicationService` now depends on the application-owned `MatchStore`, live projection port, detail projector,
and lifecycle event port. `JpaMatchStore` owns Spring Data paging, persistence status conversion, entity lookup,
MapStruct conversion, bulk row selection, and the existing repository queries. The `Match` JPA entity and repository
move together under the match persistence owner while retaining the exact JPQL entity name `Match` and table name
`matches`.

A transaction-bound `MatchUpdate` handle retains one loaded entity across prepare, event recording, save, and audit.
The application derives the target state from immutable snapshots: only `UPCOMING` plus a non-null replacement set
becomes `FINISHED`; clearing a finished set never reverses the status; every successful update reactivates the row.
The handle prepares the mutable entity before `MatchLifecycleEvents` records the finish fact, then saves afterward,
preserving the established event-before-repository-save order and transaction rollback behavior.

Canonical create still owns identity and active state, while v1 retains its explicit inactive compatibility value.
Bulk deactivation keeps defensive set semantics, selects only active rows for the pool, saves once, and returns early
without a write when no row matches. The generic entity-facing `MatchService` and reflection utility are removed after
their behavior moves behind the core store and role-owned snapshot/change log.

## Detail And Day Projection

`MatchDetailProjector` is the single application owner for enriched detail views. A minimal
`MatchLiveProjectionStore` hides live-link entities and repository methods from the core; its JPA adapter retains the
same newest-active query and maps only match identifier, URL, provider, owner, and creation time.

`MatchDayProjectionService` owns the read-only transaction, Paris calendar boundaries, page slicing, range selection,
and cursor response. `MatchDayProjector` owns date grouping, ascending pool grouping, immutable nested views, and
newest-active-link selection. The following audited behavior remains unchanged:

- `UPCOMING` discovers Paris dates from today forward; every other status path discovers finished dates backward;
- date discovery still ignores `active`, and empty pool/team filters still discover no dates;
- match instants remain UTC values while day identity uses `Europe/Paris`;
- range rows retain repository ordering by pool, date direction, and identifier;
- an empty filtered range still returns `hasNext=false` while preserving a non-null `nextPage` when another discovered
  day exists; and
- detail and day views still expose only the newest active live link, with null enrichment when none exists.

The PostgreSQL date-cast/session-timezone risk, inactive-only discovered days, set-nullness transition rule, and
scraper midnight conversion remain documented compatibility behavior rather than silent corrections.

## Deferred Live, Moderation, And Report Boundaries

Moving the match entity and repository requires import-only updates in the live, moderation, report, and policy code.
Those packages intentionally retain their existing direct JPA coupling, mutable link state, provider parsing, quota
checks, representative-link selection, report counting, concurrency gaps, Auth0-owned identity columns, and event
internals in this slice.

MRG-423 exclusively owns live-link decision, state, history, provider, and event restructuring. MRG-424 exclusively
owns moderation/report commands, views, policies, entities, projections, adapter mappings, locking, reconciliation,
and identity corrections. MRG-407 neither decides nor anticipates those changes.

## Compatibility, Validation, And Rollback

Flyway V1 through V5, `matches`, all columns/defaults/constraints, the unique match key, live-link foreign keys, every
repository query, REST and event contracts, generated clients, outbox rows, routes, scopes, and callers remain
unchanged. No migration, lock, optimistic version, data rewrite, deployment, or production action is introduced.

Forty-five focused matches-service tests cover core architecture, transactions, create/update/deactivate behavior,
stable page metadata, finish-event order, Paris day grouping, pool ordering, newest active links, the empty-range
cursor oddity, generated and legacy boundaries, live policy/history, moderation, reports, users client mapping, event
mapping, and outbox behavior.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl matches-service -am -Dtest='!MatchesApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only matches-service image revert. Both REST versions, both event versions, Flyway history,
database data, Rabbit topology, generated clients, and environment values remain compatible with the previous image.
Production authority is unchanged.
