# MRG-366 Notification Delivery Provider Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Owner: `notification-service`
- REST and event contract effect: none
- Production effect: none

## Purpose

MRG-366 separates notification delivery intent and ledger transitions from Expo SDK messages and immediate ticket
models. The notification orchestrator now works only with application-owned records and ports. Expo request creation,
SDK invocation, and immediate ticket interpretation are confined to one provider adapter, while token lookup and
delivery-ledger persistence are explicit JPA adapters.

This slice preserves the current observable send behavior. It does not add retries, receipt polling, reconciliation,
new events, database migrations, or a production cutover.

## Boundary Ownership

| Concern                              | Owner and target                                                     |
| ------------------------------------ | -------------------------------------------------------------------- |
| Provider-neutral send request        | immutable `DeliveryMessage`                                          |
| Immediate batch outcome              | immutable `DeliveryBatchResult`                                      |
| Token resolution result              | immutable `DeliveryTokenPage`                                        |
| Provider invocation port             | `PushDeliveryProvider`                                               |
| Token catalog port                   | `DeliveryTokenCatalog`                                               |
| Reservation and ledger port          | `DeliveryLedger`                                                     |
| Expo SDK messages and tickets        | `delivery.provider.ExpoPushDeliveryProvider`                         |
| Push-token persistence               | `delivery.persistence.JpaDeliveryTokenCatalog`                       |
| Delivery-ledger persistence          | `delivery.persistence.JpaDeliveryLedger`                             |
| Inbox creation and workflow ordering | existing `NotificationOrchestratorService` and inbox application API |

The former `ExpoMessageDTO`, `ExpoBatchResultDTO`, `ResolvePageDTO`, `ExpoPushService`, `PushTokenService`, and
`NotificationSendService` are removed. They are replaced by role-owned application records and ports rather than by
new DTO/entity mirrors.

## Preserved Delivery Behavior

The migrated workflow retains the deployed sequence and limits:

1. reserve recipients by match and notification type;
2. create all inbox notifications before resolving push tokens;
3. resolve recipients in pages of at most 2,000 user IDs;
4. mark recipients without an active token as `SENT_NO_TOKEN`;
5. create one provider-neutral message per distinct active token;
6. send batches of at most 100 messages;
7. treat a user as successful when at least one immediate ticket is `OK`;
8. treat a user as failed only when it has at least one immediate error and no successful ticket;
9. deactivate distinct tokens whose ticket message contains the existing invalid-registration phrases;
10. persist successful and failed immediate outcomes in the same order as before.

The Expo adapter keeps the existing title, body, single-token `to` list, and `blockout://match/{matchId}` data URL.
A provider exception is converted to a failed result for every user represented in that bounded batch. The
orchestrator's existing defensive exception branch remains in place even though the adapter normally returns a
failed result.

## Explicitly Preserved Incomplete Outcome Semantics

The legacy implementation correlated only `min(messageCount, ticketCount)` entries. MRG-366 deliberately preserves
that behavior:

- a null ticket marks its corresponding user as failed;
- when Expo returns fewer tickets than messages, messages without a corresponding ticket are neither successful nor
  failed;
- a null ticket list therefore leaves all users in that batch unclassified;
- no receipt lookup, timeout transition, replay, or retry is invented;
- no `DELIVERED` transition is activated.

These semantics are weak and can leave `PENDING` rows, but correcting them requires an explicit later delivery and
reconciliation task with operational evidence.

## Explicitly Retained Data Debt

Ledger update queries remain scoped by `matchId` and user IDs rather than by notification type. A later state update
can therefore affect rows for more than one notification type on the same match. MRG-366 does not silently correct
that behavior because it could change production-visible state and retry eligibility.

The existing `expo_ticket_id`, delivery timestamp, and error columns remain unchanged. There is no attempt counter or
active receipt processor, and the unused repository receipt transition is not treated as implemented behavior.
Flyway history and the `notification_send` schema remain untouched.

## Provider Isolation

Only `delivery.provider.ExpoPushDeliveryProvider` imports Expo server SDK request, ticket, status, or client types.
Application records, orchestration, token persistence, ledger persistence, inbox code, controllers, generated REST
models, and RabbitMQ listeners do not depend on those types.

`ExpoPushDeliveryProvider` is target vendor-adapter architecture, not legacy coexistence scaffolding. It remains while
Expo is the selected provider. Its provider-specific name may change only if a later provider abstraction task needs
multiple implementations; the application port remains provider-neutral.

## Verification Evidence

- Provider tests prove empty-batch handling, global provider failure, null tickets, incomplete ticket lists, mixed
  success/error aggregation for one user, invalid-token extraction, preserved wire values, and the 100-message cap.
- Application-value tests prove defensive immutable copies at the delivery and token-page boundaries.
- Existing notification tests continue to prove inbox, current-user mutations, push registration, and downstream
  generated-client behavior.
- Source inspection proves Expo SDK types are confined to the provider adapter.
- Focused notification tests, generated compilation, contract tests, full backend packaging, documentation validation,
  Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-410, MRG-427, and MRG-428 own deeper notification package, provider, ledger, retry, receipt, and event-projection
  restructuring.
- MRG-350, MRG-369, MRG-370, MRG-371, and MRG-372 own generated event records, event families, outboxes, and consumer
  deduplication.
- The cross-notification-type ledger update defect, pending-outcome reconciliation, delivery receipts, retry policy,
  attempt limits, and inactive-token cleanup need separately approved behavior tasks.
- REST contracts, generated artifacts, databases, RabbitMQ, BFF, Expo mobile code, scrapers, standalone repositories,
  production, Maaatch, Orval, and Python generation are unchanged.

The active goal stops before Phase MRG-900 and performs no deployment or production activation.
