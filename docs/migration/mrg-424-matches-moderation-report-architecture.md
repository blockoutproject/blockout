# MRG-424 Matches Moderation And Report Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `matches-service`
- Scope: moderation projection and decisions, report policy and persistence adapters
- Production effect: none

## Purpose

MRG-424 completes the approved Phase MRG-400 restructuring of matches-service moderation and live-report internals.
Application services now coordinate role-owned immutable snapshots, policies, projectors, and store ports. JPA
entities, repositories, persistence enums, Spring Data types, and mapping details remain inside persistence adapters.

This is a structure and ownership slice. It preserves the shipped MRG-362 behavior and the live-link state established
by MRG-423. It does not silently correct filter semantics, concurrent state races, report validation, identity, or
materialized-count drift without the missing product and production-data evidence.

## Ownership

| Concern                         | Owner                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Moderation orchestration        | `MatchLiveModerationApplicationService`                                                |
| Moderation selection and states | `MatchLiveModerationPolicy`                                                            |
| Moderation projection           | `MatchLiveModerationProjector`                                                         |
| Moderation state port           | `MatchLiveModerationStore`                                                             |
| Moderation JPA adapter          | `JpaMatchLiveModerationStore` and `MatchLiveModerationPersistenceMapper`               |
| Report orchestration            | `MatchLiveLinkReportApplicationService`                                                |
| Auto-hide decision              | `MatchLiveLinkReportPolicy`                                                            |
| Report state port               | `MatchLiveLinkReportStore`                                                             |
| Report JPA adapter              | `JpaMatchLiveLinkReportStore`, mapper, entity, and repository under report persistence |

The canonical and legacy REST adapters remain unchanged and continue mapping their own generated camelCase and
isolated snake_case contracts. Enrichment stays owned by the BFF.

## Moderation Read Parity

The JPA adapter retains the exact `findAllWithLiveLinks` query and converts each loaded match and its historical links
to moderation-owned snapshots. The application policy deliberately preserves the existing two-stage meaning:

1. an optional status filter includes a match when any historical link has that status;
2. the displayed representative is then selected independently from all historical links;
3. priority remains `ACTIVE`, `PENDING`, `BANNED`, `DEACTIVATED`, `REJECTED`, then `EXPIRED`;
4. within the same status, the existing `createdAt` comparator is retained, including its `nullsLast` behavior;
5. matches remain ordered by match date descending before the canonical page is sliced.

Consequently a `REJECTED` filter can still display an `ACTIVE` representative. Legacy reads remain one unpaged array;
canonical reads remain zero-based bounded pages. No alternate tie-breaker, time window, query pushdown, or enrichment
is introduced.

## Moderation Mutation Parity

The application service keeps one transaction and one injected instant per action. The JPA adapter owns entity
references and writes while the policy owns accepted source states.

| Decision   | Accepted source state                             | Retained ordered effects                                                                |
| ---------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| approve    | `PENDING`                                         | newest active becomes `EXPIRED`, candidate becomes `ACTIVE`, match timestamp is touched |
| reject     | `PENDING`                                         | candidate becomes `REJECTED`; match timestamp is not touched                            |
| reactivate | `REJECTED`, `EXPIRED`, `DEACTIVATED`, or `BANNED` | different active becomes `DEACTIVATED`, candidate becomes `ACTIVE`, match is touched    |

Missing links, missing match associations, invalid states, messages, logs, and no-event behavior remain unchanged.
Only the newest discovered active row is transitioned, preserving the known multiple-`ACTIVE` compatibility risk.

## Report And Auto-Hide Parity

Only the newest `ACTIVE` link can be reported. The report store preserves the pre-insert existence check for
`(live_link_id, reporter_auth0_id)`, the successful duplicate no-op, report insertion, exact recount, integer cast,
materialized `report_count` update, and link timestamp update. The moved entity retains table
`match_live_link_reports`, its unique constraint, fields, relation, and `@PrePersist` timestamp callback.

The report policy retains the existing thresholds: three reports for a non-finished or unresolved match and ten for a
finished match. Reaching the threshold changes an `ACTIVE` target to `BANNED`; the submitted reason remains stored
unchanged. Self-reporting, null or blank legacy reasons, the canonical 10-to-500 boundary validation, and the exact
v1/v2 error split remain untouched.

A concurrent duplicate can still fail after the existence check and roll back the transaction. No retry, lock,
optimistic version, idempotency key, counter reconciliation, identity foreign key, or state constraint is added.

## Compatibility And Retained Unknowns

Flyway V1 through V5, `match_live_links`, `match_live_link_reports`, columns, indexes, checks, foreign keys, repository
queries, REST and event contracts, generated artifacts, Auth0 subjects, scopes, routes, Rabbit topology, callers,
deployment, and production are unchanged. MRG-304 coexistence and retirement gates remain open.

The audit still lacks safe production inventory for multiple active rows and report-count drift, plus product authority
for filter-versus-representative semantics, self-reporting, stronger reason validation, identity correction, and state
transition normalization. Those remain explicit future decisions rather than behavior hidden inside this restructure.

## Validation And Rollback

Fifty-three focused matches-service tests cover match core, live behavior, moderation selection and state changes,
report duplicate and threshold behavior, transaction ownership, persistence placement, generated/legacy boundaries,
events, and outbox behavior. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl matches-service -am -Dtest='!MatchesApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only matches-service image revert. Database rows, Flyway history, both REST versions, events,
generated clients, routes, queues, scopes, environment values, and production authority remain compatible with the
previous image.
