# MRG-410 Notification Inbox And Token Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `notification-service`
- Scope: inbox queries, mutations and writes, pagination, push-token registration, persistence entities, repositories,
  and mappers
- Production effect: none

## Purpose

MRG-410 completes the approved Phase MRG-400 restructuring of notification inbox and push-token persistence after
MRG-341 and MRG-365 established the generated v2 boundaries and retained v1 compatibility. It removes the remaining
JPA rows and generic repositories from application orchestration, gives inbox creation and token updates immutable
role-owned inputs, and places each database entity, repository, adapter, and mapper beside its owning feature.

This is a structural slice. It does not change REST contracts, pagination policy, token ownership, delivery decisions,
provider behavior, ledger state, event consumption, follower projection, retry, acknowledgement, reconciliation, or
retention. Those behaviors remain with their explicitly assigned later tasks.

## Ownership

| Concern                   | Application owner                                                                  | Persistence owner                                                      |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Canonical inbox query     | `NotificationInboxQuery`, immutable snapshot and page                              | `JpaNotificationInboxStore`                                            |
| Legacy inbox query        | same query role with retained compatibility method                                 | retained created-at-only repository query                              |
| Current-user mutations    | `NotificationInboxMutations` and mutation service                                  | `JpaNotificationInboxMutationStore`                                    |
| Inbox batch creation      | `CreateInboxNotificationCommand`, `NotificationInboxWriter`, and write service     | `JpaNotificationInboxWriteStore`                                       |
| Inbox rows                | no entity exposure                                                                 | `NotificationInboxEntity`, repository, and strict persistence mapper   |
| Token registration policy | command, immutable registration change/target, registration service and store port | `JpaPushTokenRegistrationStore`, entity, repository, and strict mapper |
| Delivery token reads      | unchanged `DeliveryTokenCatalog`                                                   | retained delivery adapter over the token-owned repository              |
| REST coexistence          | retained application roles                                                         | isolated v1 adapters and generated v2 adapters remain unchanged        |

`NotificationOrchestratorService` now constructs provider-neutral inbox commands and crosses
`NotificationInboxWriter`; it no longer builds or passes JPA entities. The write service defensively owns each ordered
batch, retains null and empty input as no-ops, and owns the local transaction and batch log. The JPA write adapter maps
commands to new unread and unopened rows immediately before `saveAll`.

The unused generic single-notification creation branch was removed because no proven caller remained. No replacement
abstraction or speculative notification creation API was added.

## Inbox Pagination And Mutation Parity

Canonical v2 pagination remains zero-based, validates page size from 1 through 100 before current-user resolution,
and orders by `createdAt DESC, id DESC`. Legacy v1 remains deliberately unbounded at this layer and retains its
historical created-at-only ordering and equal-timestamp ambiguity. Both continue to resolve the current local user
through the same generated users client.

Unread count, read, opened, and delete operations retain ownership-scoped repository statements. Read and opened
still return changed only for false-to-true transitions; repeated, missing, and foreign writes remain unchanged
results. Delete still reports changed only when one owned row is removed. The injected clock, transaction ownership,
status mapping, logs, and v1/v2 error behavior are unchanged.

`NotificationInboxEntity` retains JPA entity name `UserNotification`, table `user_notifications`, all columns,
indexes, enum strings, JSON metadata, callbacks, timestamps, and generated identity. The persistence mapper continues
to produce the complete compatibility snapshot, stable canonical view, defensive metadata copy, and positive
`divisionId` projection.

## Push-Token Persistence Parity

Push registration retains the approved three-branch order:

1. an existing Expo token is reattached, reactivated, and optionally given the new non-blank device ID before other
   registrations for that user/device are deleted;
2. otherwise an existing user/device row rotates to the new token and is reactivated before duplicate cleanup;
3. otherwise a new active row is created.

The application service now expresses an existing-row update as immutable `PushTokenRegistrationChange`. The strict
persistence mapper owns create and update conversion, preserves persistence identity and timestamps during updates,
and uses the canonical shared platform enum. The retained enum strings are exactly `IOS`, `ANDROID`, `WEB`, and
`UNKNOWN`.

`PushTokenEntity` retains JPA entity name `PushToken`, table `push_tokens`, columns, unique token constraint, partial
user/device index behavior, callbacks, timestamps, active flag, and generated identity. The token-owned repository
continues to support delivery reads and provider-driven deactivation so MRG-410 does not redesign the MRG-427 delivery
boundary.

The caller-selected `/users/{userId}/push-tokens` identity remains the proven authorization/privacy debt recorded by
MRG-365. There is still no subject comparison, unregister/logout operation, installation-identity redesign,
account-deletion cleanup, token verification, retry, or data migration.

## Compatibility And Closed Scope

Flyway V1 through V7, database structure, generated and legacy REST contracts, routes, scopes, snake-case v1 JSON,
canonical camelCase, statuses, Problem Details, current-user resolution, page wrappers, token masking, provider
credentials, environment values, callers, and deployment are unchanged. There is no database migration, data rewrite,
token mutation, broker operation, provider call, deployment, or production authority.

MRG-427 exclusively owns delivery decisions, the send ledger, retry state, token deactivation policy, Expo tickets and
receipts, and provider adapter restructuring. MRG-428 exclusively owns event consumers, follower projections,
deduplication, acknowledgement, rebuild, and reconciliation. Production v1 retirement, live traffic changes, cutover,
deployment, and every MRG-9xx/MRG-1000 action remain outside this active goal.

## Verification And Rollback

Focused notification tests cover canonical and legacy pagination, current-user ownership, mutation timestamps and
state-sensitive results, defensive inbox commands and pages, batch-write no-op/order, exact JPA identity/table names,
strict inbox and token mappings, token reattachment/rotation/cleanup, delivery token reads, generated boundaries, and
the absence of persistence dependencies from application writers. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl notification-service -am -Dtest='!NotificationsApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only `notification-service` image revert. Existing inbox rows, token rows, Flyway history, broker
state, Expo state, generated contracts, routes, callers, environment values, deployment, and production authority
remain compatible with the previous image.
