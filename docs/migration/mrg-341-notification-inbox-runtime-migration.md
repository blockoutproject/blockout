# MRG-341 Notification Inbox Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operation: `NOTIF-01`
- Owner: `notification-service`
- Downstream owner: `users-service`
- Deferred consumers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-341 activates the generated canonical `GET /api/v2/notifications` page boundary while preserving the deployed
`GET /api/v1/notifications` response, caller, authorization, continuation, and failure behavior. The canonical route
uses application-owned immutable inbox snapshots, strict persistence and API mapping, stable pagination, progressive
Problem Details, and payload-free compatibility telemetry.

The operation-family tags in the notification OpenAPI source are split into `NotificationInboxPages`,
`NotificationInboxMutations`, and `NotificationPushTokens`. This is transport metadata only: paths, fields, statuses,
security requirements, and payloads are unchanged. The split lets MRG-341 implement only the generated page interface
without accidentally exposing generated default handlers for the unread, read, opened, delete, or push-token
operations owned by MRG-365.

## Boundary Ownership

| Concern                        | Owner and target                                                             |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Inbox application item         | immutable `NotificationInboxSnapshot`                                        |
| Page and continuation policy   | immutable `NotificationInboxPage` and `NotificationInboxQuery`               |
| Current local user resolution  | `CurrentUserResolver` behind `CurrentUserProvider`                           |
| Stable and compatibility reads | `NotificationInboxStore`                                                     |
| Entity-to-application mapping  | strict `NotificationInboxPersistenceMapper`                                  |
| Canonical API mapping          | strict `NotificationInboxApiMapper`                                          |
| Canonical REST                 | generated `NotificationInboxPagesApi` behind `NotificationInboxV2Controller` |
| Legacy REST and casing         | `LegacyUserNotificationController`, records, mapper, and JSON adapter        |
| Users-service transport        | generated `UserAccountsClient` inside `GeneratedCurrentUserProvider`         |
| Compatibility evidence         | `NotificationsCompatibilityTelemetry`                                        |

The generated users-service response is reduced immediately to `CurrentUserSnapshot(id)`. The removed generic
`ApiClientService`, handwritten `UsersClientService`, copied user DTOs, entity-shaped page DTO, and controller-owned
pagination no longer form an application boundary. The current bearer-forwarding `RestTemplate`, configured service
URL, and exact missing-user error remain unchanged.

## Canonical And Legacy Contract Parity

| Area                  | Canonical v2                                               | Retained v1                                                      |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Wrapper               | generated `items` and `pageInfo`                           | `notifications`, `has_next`, and nullable `next_page`            |
| Item projection       | nine contract-approved fields                              | all fourteen historically entity-exposed fields                  |
| Casing                | generated camelCase                                        | adapter-local snake_case                                         |
| Pagination inputs     | zero-based `page`; `pageSize` from 1 through 100           | zero-based `page`; historical unbounded `size` handling          |
| Ordering              | `createdAt DESC, id DESC`                                  | historical `createdAt DESC` behavior                             |
| Enrichment identity   | nullable explicit `divisionId` derived from metadata       | full metadata tree remains exposed; no added `division_id` field |
| Current-user identity | generated `/api/v2/users/me`, reduced to positive local ID | same local user resolution outcome                               |
| Authorization         | bearer token plus `SCOPE_read:current_user`                | unchanged bearer token and scope                                 |
| Errors                | notification Problem Details with request identifier       | retained Spring/controller error behavior                        |

Canonical ordering is deliberately stable for equal timestamps because the v2 contract requires deterministic page
boundaries. The v1 repository call keeps its prior created-at-only ordering, including its existing equal-timestamp
ambiguity. The canonical page size is bounded before user resolution or persistence access; no new validation is
inserted into the compatibility path.

`divisionId` accepts only a positive integral JSON value or positive numeric text at `metadata.divisionId`. Missing,
null, non-integral, malformed, or non-positive values map to null. The metadata tree is defensively copied in the
application snapshot and never appears in v2. This supplies the explicit input required by the current BFF logo
enrichment without making the BFF consume persistence metadata. MRG-343 still owns the generated BFF notification
client and must preserve its observable enrichment, ordering, fallback, and failure behavior.

## Casing Isolation And Deferred Mutations

The notification-service global Jackson snake-case strategy is removed. Canonical generated models now serialize
camelCase without handwritten `@JsonProperty`, `@JsonAlias`, a recursive converter, or a global naming policy.

The retained v1 list response is serialized by a copied, adapter-local snake-case `ObjectMapper`. Removing the global
policy would also have changed the still-deferred push-token request, so its controller temporarily passes the raw JSON
body to the same local adapter before reconstructing the existing service request. That isolation is not a canonical
push-token migration: status, scope, identity path, service behavior, and response remain unchanged, and MRG-365 still
owns its generated request, validation, ownership, device lifecycle, and compatibility evidence.

Unread count, read, opened, delete, notification creation, follower projection, RabbitMQ handling, delivery/provider
state, Expo tickets and receipts, and database structure are not redesigned here. Existing mutation controllers
delegate through the shared current-user resolver only to remove the deleted handwritten users client; MRG-365 and
MRG-366 retain their complete runtime ownership.

## Provider-First Activation And Rollback

An eventual authorized deployment follows this order:

1. deploy notification-service with the unchanged v1 routes and generated v2 inbox page;
2. validate v1 item fields, snake_case, continuation, ordering, scope, missing-user failure, and push-token decoding;
3. validate v2 camelCase, stable ordering, bounded page size, minimal projection, nullable `divisionId`, and Problem
   Details;
4. retain that dual-route image as the provider rollback baseline;
5. migrate the mobile-gateway notification workflow only in MRG-343, then Expo only in MRG-347.

Before a v2 consumer is active, the standalone v1 notification image remains the rollback target. After a v2 consumer
is active, rollback uses the last-known-good dual-route image; returning the provider to v1-only first requires
reverting all v2 consumers. This active goal performs no deployment, broker operation, production snapshot, or
cutover.

## Coexistence And Temporary Names

- `api/v1`, every `Legacy*` type, and the local snake-case mapper are temporary compatibility scaffolding. They are
  removed only after every production caller migrates and the approved zero-traffic and authorization gates close.
- `api/v2` and `NotificationInboxV2Controller` are temporary source-code qualifiers used while both versions coexist.
  After authorized v1 retirement, the surviving canonical source names become unqualified.
- The public canonical `/api/v2/notifications` route remains stable after source-code coexistence names disappear.
- Generated API/client boundaries, meaningful application records and ports, strict mappers, persistence entities,
  Flyway history, and provider adapters remain part of the target architecture.
- A filename such as a Flyway `V2__*.sql` migration is immutable database history, not REST-v2 scaffolding, and must
  not be renamed or deleted for cosmetic convergence.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes production legacy removal.

## Verification Evidence

- Application tests prove local-user resolution, canonical page bounds, stable-store delegation, untouched legacy
  delegation, and the exact missing-user failure.
- Persistence tests prove `createdAt DESC, id DESC` canonical ordering, historical v1 ordering, complete snapshot
  mapping, defensive metadata, and strict `divisionId` extraction.
- Boundary tests prove canonical minimal projection, exact legacy snake-case fields and continuation, local push-token
  decoding, and that the v2 controller implements only `NotificationInboxPagesApi`.
- Users-client tests prove immediate generated-model reduction, null-body behavior, and versioned URL normalization.
- Contract tests prove the three generated API families and prevent MRG-341 from activating mutation defaults.
- Focused notification tests, generated server/client compilation, deterministic contracts, full backend packaging,
  documentation validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-365 owns unread count, read/open/delete, push-token validation and device lifecycle, plus final compatibility.
- MRG-366 owns delivery-state inputs, Expo provider tickets/receipts, retries, invalid-token behavior, and reconciliation.
- MRG-343 owns the generated BFF notification client, workflow projection, enrichment, and public BFF boundary.
- MRG-347 owns the Expo generated notification client and handwritten cache/view-model policy.
- MRG-410, MRG-427, and MRG-428 own the deeper notification package, delivery/provider, and event-projection pass.
- MRG-374, MRG-375, MRG-352, and MRG-353 own remaining casing/conversion retirement after caller gates close.
- RabbitMQ contracts/topology, databases, standalone repositories, production, Maaatch, Blockout Orval settings, and
  Python generator settings are unchanged.
