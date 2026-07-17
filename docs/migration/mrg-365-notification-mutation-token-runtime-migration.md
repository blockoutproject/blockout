# MRG-365 Notification Mutation And Push-Token Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `NOTIF-02` through `NOTIF-06`
- Owner: `notification-service`
- Deferred consumers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-365 activates the generated canonical unread-count, read, opened, delete, and push-token interfaces. Inbox state
changes now cross an application-owned current-user mutation boundary and a persistence port. Push registration now
crosses a generated request mapper, an application command and lifecycle service, and a JPA adapter without exposing a
generated model or entity outside its owning boundary.

The existing v1 operations delegate to the same application use cases through retained compatibility records and
adapter-local snake-case decoding. No event, delivery provider, database, mobile-gateway, Expo, or production behavior
is activated by this slice.

## Boundary Ownership

| Concern                            | Owner and target                                                         |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Current-user inbox mutations       | `NotificationInboxMutations`                                             |
| Mutation orchestration and logging | `NotificationInboxMutationApplicationService`                            |
| Mutation persistence               | `NotificationInboxMutationStore` and `JpaNotificationInboxMutationStore` |
| Canonical mutation REST            | generated `NotificationInboxMutationsApi`                                |
| Legacy unread response             | `LegacyUnreadNotificationResponse`                                       |
| Push registration intent           | immutable `RegisterPushTokenCommand`                                     |
| Token lifecycle decision           | `PushTokenRegistrationApplicationService`                                |
| Registration persistence           | `PushTokenRegistrationStore` and `JpaPushTokenRegistrationStore`         |
| Canonical push REST                | generated `NotificationPushTokensApi` and strict `PushTokenApiMapper`    |
| Legacy push JSON                   | `LegacyRegisterPushTokenRequest` and `LegacyNotificationsJson`           |
| Application time                   | injected UTC `Clock`                                                     |

The old unread DTO, push registration DTO, mixed inbox mutation methods, and registration branch inside the
delivery-oriented `PushTokenService` are removed. `PushTokenService` remains temporarily responsible only for token
resolution and provider-driven deactivation; MRG-366 owns that delivery boundary.

## Inbox Mutation Parity

| Area                 | Canonical v2                                   | Retained v1                                      |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Unread response      | generated `{ "unreadCount": number }`          | `{ "unread": number }`                           |
| Ownership            | current local user resolved from forwarded JWT | identical resolved local-user constraint         |
| Read/open transition | `204` only when false becomes true             | identical state-sensitive `204`; otherwise `404` |
| Delete transition    | `204` only when an owned row is deleted        | identical `204`; absent/repeated remains `404`   |
| Identifier           | generated positive numeric path validation     | historical framework/repository behavior         |
| Authorization        | `SCOPE_read:current_user`                      | unchanged scope                                  |
| Error body           | notification Problem Details                   | retained Spring/controller error behavior        |

All repository updates remain constrained by the notification identity and the resolved current local user ID. The
application clock supplies the same UTC instant to read/open updates. No idempotent-success correction is made:
already-read, already-opened, missing, foreign, and repeatedly deleted rows remain indistinguishable `404` results.

## Push Registration Parity And Validation

Canonical v2 validates a positive path user ID, a non-blank token no longer than 2048 characters, an approved shared
platform enum, and a non-blank device ID no longer than 255 characters. Validation failures become `invalid_request`
Problem Details before the application use case runs.

The v1 adapter continues to decode `expo_push_token`, `platform`, and `device_id` with its local snake-case mapper. It
does not inherit the new v2 constraints. Null/blank values and malformed enums therefore retain their existing
framework, logging, or persistence failure path instead of receiving retroactive v2 validation.

The application service preserves the deployed lifecycle order:

1. if the Expo token already exists, reattach that row to the requested user, update platform, reactivate it, replace
   device ID only when the input is non-blank, then delete other rows for the resulting user/device;
2. otherwise, when the user/device pair exists, rotate the token on that row, update platform, reactivate it, and
   delete duplicates;
3. otherwise create one active registration.

Token values remain masked in application logs. There is no retry, unregister/logout endpoint, installation-identity
redesign, account-deletion cleanup, provider-token verification, or data migration.

## Explicit Caller-Selected Identity Debt

Both approved coexistence paths retain `/users/{userId}/push-tokens`. The service still does not compare that path ID
with the authenticated subject or the current local user resolved from users-service. Consequently, a scoped caller
can still attempt to reattach its token to another known local user ID.

This is a proven authorization/privacy defect, not approved target behavior. MRG-365 preserves it because the MRG-325
source contract and MRG-304 coexistence matrix explicitly froze the path and current observable behavior. Correcting
it requires a separate authorized contract/security task that migrates the BFF and every deployed Expo caller
together; this slice must not silently reinterpret the path.

## Provider-First Activation And Rollback

An eventual authorized deployment follows this order:

1. deploy notification-service with all six v1 operations and all six generated v2 operations;
2. validate v1 unread fields, state-sensitive statuses, scopes, snake_case token input, and the three registration
   lifecycle branches;
3. validate v2 `unreadCount`, positive identifiers, request constraints, camelCase, statuses, and Problem Details;
4. retain that dual-route image as the notification provider rollback baseline;
5. migrate the mobile-gateway notification workflow only in MRG-343, then Expo only in MRG-347.

Before a v2 consumer is active, the standalone v1 notification image remains the rollback target. After a v2 consumer
is active, rollback uses the last-known-good dual-route image. This active goal performs no deployment, production
snapshot, token mutation, or cutover.

## Coexistence And Temporary Names

- The remaining v1 controllers, `Legacy*` records, and local snake-case mapper are temporary compatibility scaffolding
  removed only after caller migration and approved zero-traffic gates.
- `NotificationInboxV2Controller`, `NotificationInboxMutationsV2Controller`, `PushTokenV2Controller`, and `api/v2`
  source packages are coexistence qualifiers. Their surviving canonical source names become unqualified after
  authorized v1 retirement.
- Public `/api/v2/notifications/**` routes remain stable after source-code qualifiers disappear.
- Generated interfaces/models at transport adapters, application commands/ports, strict mappers, JPA entities,
  repositories, database names, and immutable Flyway history remain target architecture.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes production legacy removal.

## Verification Evidence

- Mutation application tests prove current-user resolution, exact update timestamps, ownership-scoped store calls,
  changed/unchanged results, unread count, and missing-user failure.
- Registration tests prove token reattachment, blank-device preservation, new-device duplicate cleanup, device rotation,
  and new registration order.
- Boundary tests prove generated interface ownership, canonical unread naming, state-sensitive statuses, generated
  request-to-command mapping, and accepted push registration.
- Existing compatibility tests continue to prove v1 page casing/continuation and push-token snake-case decoding.
- Focused notification tests, generated server/client compilation, contract tests, full backend packaging,
  documentation validation, Maaatch comparison, Prettier, source confinement, and whitespace checks pass.

## Closed Scope

- MRG-366 owns delivery-state inputs, token resolution/deactivation, Expo tickets/receipts, retries, invalid-token
  behavior, and incomplete receipt handling.
- MRG-343 owns the generated BFF notification client and all relay/projection behavior; MRG-347 owns the Expo client.
- MRG-410, MRG-427, and MRG-428 own deeper package, provider, delivery-ledger, and event-projection restructuring.
- MRG-374, MRG-375, MRG-352, and MRG-353 own remaining casing and conversion retirement after caller gates close.
- The caller-selected push user ID, installation identity, unregister/logout, and account-deletion retention require
  separate explicit security/product authorization.
- RabbitMQ, Expo provider calls, databases, standalone repositories, production, Maaatch, Orval, and Python generation
  are unchanged.
