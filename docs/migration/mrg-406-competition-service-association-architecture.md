# MRG-406 Competition Service Association Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `competition-service`
- Feature family: association catalog, complete statistics snapshots, and bulk lifecycle commands
- REST operations: `COMP-01` through `COMP-07`
- Persistence: `competition_association`
- Production effect: none

## Purpose

MRG-406 completes the association and statistics persistence restructuring after MRG-337 established generated
canonical HTTP boundaries and MRG-360 established generated bulk lifecycle commands. Association application code no
longer imports Spring Data, JPA entities, repositories, persistence mappers, or generated models.

The slice preserves all association, statistics, and bulk lifecycle routes; v1 and v2 response statuses; scopes;
create, active no-op, and reactivation behavior; complete statistics replacement; legacy null behavior; active
filtering; stable canonical pagination; defensive set semantics; bulk row selection and early returns; cascade/event
decisions; transaction boundaries; persistence mapping; and Flyway history. It changes no contract, generated
artifact, table, query, queue, route, caller, configuration, deployment, production resource, or authority.

## Ownership

| Concern                | Inbound adapter                                  | Application roles                                                                                             | Persistence or deferred owner                                                             |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Association catalog    | isolated v1 and generated v2 controllers/mappers | `AddCompetitionAssociationCommand`, view, page, activation handle, `CompetitionAssociationStore`, and service | `JpaCompetitionAssociationStore`, entity, repository, and strict structural mapper        |
| Statistics replacement | isolated v1 and generated v2 statistics adapters | complete `CompetitionStatisticsSnapshot`, update handle/change, `CompetitionStatisticsStore`, and service     | `JpaCompetitionAssociationStore` transaction-bound update plus structural replacement     |
| Bulk lifecycle         | isolated v1 records and generated v2 mapper      | three defensive deactivation commands                                                                         | current lifecycle/cascade/event implementation retained intact until MRG-422              |
| Ranking                | isolated v1 and generated v2 ranking adapters    | current role-owned ranking pages/views and policy                                                             | direct repository projection retained intact until MRG-422                                |
| Compatibility          | v1 snake-case JSON and v2 generated servers      | role-owned application records after transport validation                                                     | current MRG-304 coexistence, observation, rollback, and retirement gates remain unchanged |

No additional domain model is introduced. Association identity and a statistics snapshot are use-case records, while
the current service has no separately proven invariant-bearing value. A field-for-field domain mirror would add a
synthetic mapping layer prohibited by MRG-401.

## Association And Statistics Persistence

`CompetitionAssociationService` now depends only on `CompetitionAssociationStore`. The store returns a role-owned
activation handle that keeps the loaded entity inside the JPA adapter while allowing the application to own the
active no-op versus reactivation decision and its audit log. New rows still initialize every statistic to zero through
the entity defaults, and existing active or inactive rows retain the stored club identity and historical statistics.

`CompetitionStatisticsService` depends only on `CompetitionStatisticsStore`. Its transaction-bound update handle
captures role-owned before/after views, applies all seventeen fields through the strict persistence mapper, saves once,
and preserves the existing change-log output. Statistics remain a complete replacement: the canonical generated
request validates every field before mapping, while a missing legacy field remains null and reaches the unchanged
non-null persistence failure path rather than becoming a partial merge.

The JPA adapter owns the existing active legacy reads and canonical pages. Pool pages remain ordered by team identifier
ascending; team pages remain ordered by pool identifier ascending. Exact total counts, `hasNext`, empty pages, and
unmodifiable application item snapshots are unchanged.

Flyway V1 and V2, the table, unique `(pool_id, team_id)` key, all statistics columns/defaults, local timestamp
callbacks, repository queries, mapper null behavior, outbox, and audit shape remain unchanged. No migration, lock,
version, cross-service identity validation, or data rewrite is introduced.

## Validated Bulk Commands

The three bulk operations retain the command boundary proven by MRG-360:

- generated v2 requests validate positive pool/team identifiers and bounded club identifiers before mapping;
- both adapters narrow lists immediately to defensive, deduplicated, unmodifiable command sets;
- duplicates retain set semantics and empty sets remain valid no-ops;
- v1 success remains `200`, v2 success remains `204`, and `delete:competitions` remains required; and
- zero-association and mixed-candidate behavior, save order, transaction rollback, event routes, and cascade decisions
  remain unchanged.

MRG-406 deliberately does not replace the repository use inside lifecycle, cascade, or ranking application code. It
also does not correct the historically misleading distinct-query names, early-return behavior, stale club ownership,
concurrency gaps, or event internals. MRG-422 owns that bounded restructuring and its behavioral evidence.

## Compatibility, Removal, And Rollback

The generic reflection utility and cross-feature association exception location are removed after their behavior moves
beside the application owner. Legacy v1 request/response records, snake-case JSON, canonical generated adapters,
ranking projections, bulk commands, repository, entity, cascade services, event publisher, routes, and payloads stay
available. Their MRG-267 lineage and MRG-304 removal gates remain open.

Twenty-eight focused competition reactor tests cover zero-stat creation, active no-op, reactivation, complete and
nullable legacy statistics replacement, stable paging, not-found behavior, canonical casing, all seventeen generated
statistics constraints, defensive bulk commands, identifier validation, lifecycle selection and cascade behavior,
transaction rollback, ranking, legacy JSON, and outbox event behavior.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl competition-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only competition-service image revert. Both REST versions, Flyway history, database data, Rabbit
topology, generated clients, and environment values remain compatible with the previous image. Production authority
is unchanged.
