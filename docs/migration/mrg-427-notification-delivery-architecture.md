# MRG-427 Notification Delivery Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `notification-service`
- Scope: delivery decisions, typed send-ledger transitions, retryable immediate outcomes, and Expo provider isolation
- Production effect: none

## Purpose

MRG-427 completes the approved Phase MRG-400 restructuring of notification delivery after MRG-366 established the
generated runtime boundary and MRG-410 isolated inbox and push-token persistence. It moves the retained multi-system
workflow into a dedicated application service, makes ledger identity explicit, and classifies incomplete Expo ticket
lists without exposing provider SDK models to application code.

This is a structural and correctness slice. It does not invent a retry schedule, attempt limit, receipt poller,
delivery guarantee, compensation, or provider reconciliation policy. Incomplete immediate outcomes are represented
explicitly and remain `PENDING` until a separately approved operation can decide how and when to retry them.

## Ownership

| Concern                        | Application owner                                    | Adapter owner                                           |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------- |
| Resolved delivery command      | immutable `NotificationDeliveryCommand`              | event orchestrator remains content-only                 |
| Delivery workflow and ordering | `NotificationDeliveryApplicationService`             | role-owned inbox, token, ledger, and provider ports     |
| Delivery-attempt identity      | `DeliveryAttemptKey(matchId, notificationType)`      | typed repository predicates                             |
| Recipient reservation          | immutable `DeliveryReservation` and `DeliveryLedger` | `JpaDeliveryLedger` and native reservation query        |
| Immediate provider outcome     | provider-neutral `DeliveryBatchResult`               | `ExpoPushDeliveryProvider` ticket interpretation        |
| Retryable incomplete outcome   | `retryableUserIds` retained as `PENDING`             | missing-ticket detection in the Expo adapter            |
| Send-ledger rows               | no entity exposure                                   | `DeliveryAttemptEntity` and `DeliveryAttemptRepository` |
| Invalid-token deactivation     | delivery application order                           | existing push-token-owned catalog adapter               |
| Expo SDK requests and tickets  | no application dependency                            | `delivery.provider` only                                |

`NotificationOrchestratorService` now resolves pool and team copy and submits one provider-neutral command. It no
longer owns reservation, inbox writes, token pages, provider batches, ticket aggregation, ledger transitions, or
token deactivation.

## Retained Delivery Order And Bounds

The dedicated delivery service preserves the proven order:

1. reserve recipients for one match and notification type;
2. create the complete ordered inbox batch;
3. resolve active tokens in recipient pages of at most 2,000 users;
4. mark recipients without active tokens `SENT_NO_TOKEN`;
5. build one provider-neutral message per distinct active token;
6. call the provider in batches of at most 100 messages;
7. aggregate all immediate outcomes for the page;
8. persist `SENT` and `FAILED` decisions, then deactivate distinct rejected tokens.

An empty reservation still stops before inbox or provider work. Provider exceptions still classify every user in the
bounded batch as failed. Null tickets remain explicit errors. Device-not-registered phrases retain the existing
case-insensitive token invalidation behavior and prefer the token returned in ticket details when present.

Outcome precedence is now explicit across the complete token-resolution page: any success wins for that user; absent
success, any missing ticket makes the user retryable; only fully classified errors make the user failed. Successful
users become `SENT`, failed users become `FAILED`, and retryable users remain `PENDING`. This prevents partial ticket
lists from silently looking complete without claiming that a retry executor exists.

## Typed Ledger And Persistence

Every state transition now carries `DeliveryAttemptKey` and filters by both `match_id` and `notification_type`, in
addition to the selected users. `SENT`, `SENT_NO_TOKEN`, and `FAILED` updates apply only to rows still in `PENDING`, so
a later transition cannot overwrite a resolved attempt. This closes the audited cross-notification-type mutation
defect while retaining the existing reservation key and state strings.

`DeliveryAttemptEntity` now maps the V5 `notification_type` column and the deployed three-column unique constraint.
It retains JPA entity name `NotificationSend`, table `notification_send`, generated identity, columns, indexes,
callbacks, timestamps, and the shared notification status enum. The entity and repository live beside the ledger
adapter rather than in generic model and repository packages. The unused `DELIVERED` update and generic existence
query were removed because no proven runtime caller or receipt processor exists.

The database still contains `expo_ticket_id`, `delivered_at`, and error columns. Their presence is not treated as
evidence of ticket persistence or receipt processing. No attempt counter, next-attempt timestamp, lease, scheduler,
dead-letter policy, receipt storage, or terminal retry state was added.

## Provider Isolation And Closed Scope

Only `ExpoPushDeliveryProvider` imports Expo server SDK client, request, status, or ticket types. Application
contracts contain tokens, copy, routing data, user IDs, match IDs, provider-neutral outcome sets, and invalid token
strings. They do not contain Expo tickets, receipts, SDK status values, or provider exceptions.

Flyway V1 through V7 and the physical `notification_send` schema are unchanged. There is no migration, data rewrite,
retry execution, receipt call, broker operation, provider call, token mutation, deployment, or production authority.
REST and event contracts, generated artifacts, routes, scopes, Rabbit topology, inbox behavior, token registration,
caller-selected token identity, callers, environment values, and credentials remain compatible.

MRG-428 exclusively owns event consumers, follower projections, deduplication, acknowledgement, rebuild, and
reconciliation. Production v1 retirement, live traffic changes, cutover, deployment, and every MRG-9xx/MRG-1000
action remain outside this active goal.

## Verification And Rollback

Focused notification tests cover typed reservation and state transitions, empty-transition no-ops, retained workflow
order, inbox and token decisions, page-wide success/retry/failure precedence, incomplete ticket lists, null tickets,
provider exceptions, invalid-token detection, immutable application outcomes, batch caps, JPA identity/table names,
and absence of persistence dependencies from application orchestration. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl notification-service -am -Dtest='!NotificationsApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only `notification-service` image revert. Existing ledger, inbox, and token rows, Flyway history,
broker and Expo state, generated contracts, routes, callers, environment values, deployment, and production authority
remain compatible with the previous image.
