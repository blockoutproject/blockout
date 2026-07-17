# MRG-362 Matches Moderation And Report Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `MATCH-07` and `MATCH-11` through `MATCH-14`
- Owner: `matches-service`
- Deferred callers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-362 completes the generated matches-service live boundary by migrating moderation list/actions and live-link
reporting to their approved canonical interfaces. `MatchModerationV2Controller` implements the generated
`MatchModerationApi`; `MatchLiveLinkReportsV2Controller` implements `MatchLiveLinkReportsApi`. Generated camelCase
models stop at those controllers and map immediately to role-owned commands and views. Existing `/api/v1/**` routes
remain isolated snake_case adapters invoking the same application behavior.

No OpenAPI source, route, payload, database schema, RabbitMQ topology, BFF workflow, Expo caller, or scraper caller is
changed by this runtime slice. The authoritative source contract and generated interfaces already existed from
MRG-322 and the role split recorded by MRG-361.

## Boundary Ownership

| Concern                     | Owner and target                                                          |
| --------------------------- | ------------------------------------------------------------------------- |
| Moderation query            | `MatchLiveModerationQuery`                                                |
| Moderation projection/page  | `MatchLiveModerationView` and `MatchLiveModerationPage`                   |
| Moderation intent           | `ModerateMatchLiveLinkCommand` and `MatchLiveLinkDecision`                |
| Report intent               | `ReportMatchLiveLinkCommand`                                              |
| Moderation behavior         | transactional `MatchLiveModerationApplicationService`                     |
| Report behavior             | transactional `MatchLiveLinkReportApplicationService`                     |
| Persistence mapping         | strict moderation and report persistence mappers around retained entities |
| Canonical REST              | generated moderation and report APIs behind two v2 controllers            |
| Generated transport mapping | strict moderation mapper and a report command mapper                      |
| Legacy REST                 | adapter-local records and `LegacyMatchesJson`                             |

The former Lombok/Jackson `MatchLiveSummaryDTO`, request DTO, moderation service, and report service are removed.
Application contracts contain no Spring Web, Jackson, JPA, Lombok, or generated-contract annotations. The retained
generic `MatchService` now serves only the legacy event-test route; its removal belongs to the event-contract slice.

## Moderation Read Parity

The v1 route remains one unpaged JSON array sorted by match date descending. Its adapter-local shape retains
`match_code`, `league_code`, pool/team identifiers, live code, representative live-link fields, and every existing
nullable value. The canonical v2 route returns the approved `PageResponse` shape with zero-based `page`, bounded
`pageSize`, total count, and `hasNext`; it omits the unused match and league codes from the generated projection.

Filtering and representative selection remain deliberately independent:

1. a status filter includes a match when any historical live-link row has that status;
2. the displayed row is selected from all history by status priority;
3. within one status, the newer `createdAt` wins;
4. priorities remain `ACTIVE`, `PENDING`, `BANNED`, `DEACTIVATED`, `REJECTED`, then `EXPIRED`;
5. a filtered `REJECTED` result may therefore display an `ACTIVE` representative.

Pagination is applied only after this full existing filter, representative selection, and match-date ordering. This
keeps v1 behavior intact and gives v2 exact page totals without moving business selection into generated models or a
transport mapper. No unimplemented time window or immutable tie-breaker is introduced.

## Moderation Mutation Parity

| Action     | Accepted source state                             | Preserved effects                                                                                   |
| ---------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| approve    | `PENDING`                                         | newest active link becomes `EXPIRED`; candidate becomes `ACTIVE`; match timestamp is touched        |
| reject     | `PENDING`                                         | candidate becomes `REJECTED`; match is not touched                                                  |
| reactivate | `REJECTED`, `EXPIRED`, `DEACTIVATED`, or `BANNED` | different active link becomes `DEACTIVATED`; candidate becomes `ACTIVE`; match timestamp is touched |

Missing links and invalid states retain their existing bad-request outcomes and messages on v1. A missing match on
approval remains a match-not-found result; a missing match association on reactivation remains an invalid-state
result. All writes for one action stay in one transaction and use one injected instant. No event is emitted and no
absent listener is activated.

## Report And Concurrency Parity

Only the newest `ACTIVE` live link for the requested match can be reported. A missing active link remains match not
found. The `(live_link_id, reporter_auth0_id)` uniqueness rule remains authoritative: a previously stored report from
the same Auth0 subject is a successful `204` no-op, while another reporter creates one report row and updates the
link's materialized report count.

The existing dynamic auto-hide thresholds remain unchanged:

- an upcoming match becomes `BANNED` at three reports;
- a finished match becomes `BANNED` at ten reports;
- the reason remains stored exactly as submitted;
- the v1 adapter retains its historical permissive request handling;
- the generated v2 request enforces the approved 10-to-500-character contract before application mapping.

MRG-362 does not hide, retry, or reinterpret a concurrent unique-constraint failure. A race after the existence check
still rolls the transaction back; the v2 Problem Details boundary maps the database conflict to `409`, while the v1
global handler retains its legacy generic outcome. Lost-update prevention, entity versioning, lock strategy, local
user identity columns, and counter reconciliation remain explicit MRG-424 decisions rather than silent corrections.

## Errors, Authentication, And Compatibility

Canonical operations retain their generated bearer contract and exact method authorities:

- list, approve, reject, and reactivate require `SCOPE_moderate:match_live_link`;
- report requires `SCOPE_report:match_live_link`;
- canonical validation and state failures use matches-service Problem Details with stable codes and request IDs;
- v1 continues to use its legacy error body, Auth0-subject ownership, statuses, and response codes.

Mobile-gateway remains on the unchanged v1 routes. MRG-368 owns its generated downstream clients, enrichment,
canonical BFF controllers, unpaged-v1 aggregation, rollback, and removal of copied moderation DTOs. MRG-346 owns the
Expo client and hooks. No dual call or runtime fallback is introduced.

## Coexistence And Temporary Names

- `controllers/v1`, `LegacyMatchesJson`, adapter-local legacy records, and v1 route handling remain only until every
  caller migrates and the approved evidence gates close.
- `api/v2` packages and `*V2Controller` suffixes are coexistence names, not the final source layout. After authorized
  v1 retirement, the surviving canonical controllers become unqualified.
- The public canonical `/api/v2/**` routes remain stable after source-code coexistence names disappear.
- Generated interfaces/models at adapters, meaningful application records, strict mappers, policies, and persistence
  separation remain part of the target architecture.
- Flyway files named `V2__...` are immutable database history and are unrelated to REST coexistence cleanup.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes production retirement.

## Verification Evidence

- Application tests prove historical filtering versus representative selection, page totals/order, every action's
  accepted and rejected states, prior-active transitions, match timestamp rules, duplicate report no-op, both
  auto-hide thresholds, absent active links, and concurrent uniqueness failure propagation.
- Generated-boundary tests prove role separation, canonical camelCase serialization under the temporary global
  snake_case mapper, omission of legacy-only fields, and generated report-reason validation.
- The legacy boundary test proves the moderation array remains unpaged snake_case with its historical fields.
- Focused and retained matches tests, contract generation tests, source lint, full backend packaging, documentation
  validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-339 owns provider-side users-service migration and activation of the staged generated current-user client.
- MRG-346 and MRG-368 own Expo and mobile-gateway match/live workflows.
- MRG-349 owns scraper use of the official generated Python clients.
- MRG-370 and MRG-372 own generated match events and the transactional outbox.
- MRG-423 owns deeper match/live structure; MRG-424 owns moderation/report locking, reconciliation, and identity
  corrections.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement is outside this active goal.
