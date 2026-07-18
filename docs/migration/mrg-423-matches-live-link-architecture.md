# MRG-423 Matches Live-Link Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `matches-service`
- Feature family: live-link decisions, state, provider validation, history, and created events
- REST operations: `MATCH-08` through `MATCH-10`
- Persistence: `match_live_links` and the retained `matches` touch
- Production effect: none

## Purpose

MRG-423 completes the live-link restructuring after MRG-361 established generated canonical REST boundaries,
MRG-370 established generated match event records, MRG-372 established the transactional outbox, and MRG-407 isolated
the match core. Live application code no longer imports JPA entities, Spring Data repositories, persistence mappers,
generated object models, or the moderation/report persistence boundary.

The slice preserves provider recognition, account and league policy, publication windows, ownership, quotas, state
transitions, no-ops, history ordering, event timing, authorization, compatibility responses, and every known race or
visibility gap. It changes no contract, generated artifact, table, query, route, queue, scope, caller, deployment, or
production resource.

## Ownership

| Concern                | Application owner                                                                                  | Infrastructure owner                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Live commands          | `MatchLiveLinkApplicationService`, command/result roles, store port, and immutable state snapshots | `JpaMatchLiveLinkStore`, the live entity/repository, and persistence mapper          |
| Live decisions         | `MatchLiveLinkPolicy`, authorization port, and current-user port                                   | Security-context scope adapter and generated/legacy users-service adapters           |
| Provider resolution    | `MatchLiveProviderResolver` with exact-domain/subdomain rules                                      | no vendor SDK or network call                                                        |
| State transitions      | `MatchLiveLinkStatePolicy` and explicit upsert plan                                                | persistence adapter applies selected status writes in the existing transaction       |
| History                | read-only `MatchLiveLinkHistoryService`, history store, state page, and projector                  | exact newest-first repository queries and paging                                     |
| Created event          | immutable live-created fact and event port                                                         | dedicated mapper plus `OutboxMatchLiveLinkEvents` dual-wire outbox adapter           |
| Moderation and reports | retained behavior only                                                                             | direct JPA coupling remains exclusively deferred to MRG-424                          |
| Compatibility          | shared role-owned application views                                                                | isolated v1 snake-case and generated v2 API mappers remain under MRG-304 coexistence |

`MatchLiveLinkSnapshot` is an immutable state/history role, not a transport mirror. It carries the exact persisted
facts required for ownership, no-op, transition, result, and history decisions. No separate domain model is added:
the current live rules are application policy over state snapshots, and no independent invariant-bearing value is
proven.

## Decision And State Parity

The application obtains one current-user snapshot, one authorization decision, and one injected-clock instant per
upsert. The same ordering remains authoritative:

1. resolve the current user and moderator scope;
2. validate account age, then provider URL, match existence, and the AALNV restriction;
3. select the newest active link and the state plan;
4. follow either the post-match non-moderator path or the normal/moderator path; and
5. persist status changes and the new version before recording the created event when applicable.

The normal path retains the one-hour Paris publication window, owner protection, unchanged-link no-op before quota
checks, three-version per-match limit, three-distinct-match Paris-day limit, active-to-expired transition, and new
`ACTIVE` version. Only a non-finished creation records `match.live-link-created`.

The finished non-moderator path retains its distinct behavior: an unchanged latest owner version in `ACTIVE` or
`PENDING` is a no-op; otherwise the visible active link and prior owner pending versions expire, a new `PENDING`
version is saved, the match is touched, and no created event is recorded. A moderator still uses the normal path,
bypasses age/window/owner/quota checks, remains subject to the AALNV restriction, creates `ACTIVE`, and records no event
for a finished match. Delete remains a successful no-op when no active link exists and otherwise changes only the
newest active version to `DEACTIVATED` after the unchanged owner/moderator decision.

## Provider And History Parity

The provider resolver keeps the exact accepted host families: YouTube and `youtu.be`, Twitch, and Facebook including
`fb.com` and `fb.watch`. Exact hosts and subdomains remain accepted; lookalike suffixes such as
`youtube.com.evil` remain rejected. URI scheme behavior is deliberately unchanged.

Legacy history remains an unpaged full list. Canonical history remains a bounded zero-based page. Both use the exact
repository order `createdAt DESC, id DESC`, retain successful empty results without a match lookup, and project the
same report count, owner Auth0 subject, and audit timestamps required by their current compatibility contracts.

## Persistence, Events, And Retained Unknowns

The `MatchLiveLink` entity and repository now live together under `match/live/persistence` while retaining table
`match_live_links`, all columns, callbacks, relations, query names, and query text. The JPA store owns entity creation,
enum conversion, match references, status writes, owner/date counts, the post-match touch, and history paging. MRG-423
does not introduce a lock, optimistic version, constraint, migration, retry, or reconciliation path.

`OutboxMatchLiveLinkEvents` owns only `MATCH_LIVE_LINK_CREATED`. It retains the legacy payload class name for pending
outbox rows and rollback readers, maps the generated v2 envelope in its own adapter, reuses the exact exchange,
`match.live-link-created` and `.v2` routes, `match:{id}` ordering key, metadata identity, producer, and schema version.
The general `EventPublisher` now owns only match-finished facts.

The audit cannot safely resolve existing multiple-`ACTIVE` rows, concurrent quota/state races, post-match active-link
visibility, Auth0-owned identity columns, or whether moderators should bypass the professional-league rule. Those
behaviors remain explicit compatibility risks. Database inventory and a separately approved product/data migration
are still required before any correction.

## Deferred Moderation And Report Boundaries

Moving the live entity and repository requires import-only changes in moderation and report code. Their representative
selection, filter mismatch, approval/reactivation transitions, report validation/counting, auto-hide thresholds,
locking, identity correction, and reconciliation remain untouched. MRG-424 exclusively owns those application,
projection, policy, entity, and adapter changes.

## Compatibility, Validation, And Rollback

Flyway V1 through V5, `match_live_links`, `match_live_link_reports`, foreign keys, indexes, checks, all repository
queries, REST and event contracts, generated clients, outbox rows, Rabbit topology, routes, scopes, and callers remain
unchanged. MRG-304 coexistence and retirement gates remain open.

Fifty focused matches-service tests cover core and live architecture, provider/account/league/quota/ownership policy,
active and pending creation, no-op order, deletion, history metadata and order, moderation, reports, generated/legacy
boundaries, users-client reduction, event mapping, dual-wire outbox identity, and match-core behavior.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl matches-service -am -Dtest='!MatchesApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only matches-service image revert. Both REST versions, both event versions, pending outbox rows,
Flyway history, database data, Rabbit topology, generated clients, and environment values remain compatible with the
previous image. Production authority is unchanged.
