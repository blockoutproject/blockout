# MRG-339 Users Account And Profile Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `USER-01` through `USER-05`
- Owner: `users-service`
- Activated consumer: `matches-service`
- Deferred callers: mobile-gateway, Expo, and notification-service
- Production effect: none

## Purpose

MRG-339 migrates the users-service account and profile boundary to the generated canonical contract while preserving
the existing `/api/v1/**` behavior. `UserAccountV2Controller` implements the generated `UserAccountsApi`; generated
camelCase request and response models map immediately to role-owned commands, views, and explicit profile-image
intent. The isolated v1 controller invokes the same application behavior through adapter-local legacy records and a
dedicated snake_case mapper.

This slice also closes the provider-first gate introduced by MRG-361. Matches-service now uses its generated
`UserAccountsClient` as the only current-user provider and immediately projects the response to its minimal local
snapshot. The temporary `LegacyCurrentUserAdapter` and its handwritten `JsonNode` parsing are removed. No dual call,
fallback, retry, or consumer-visible behavior change is introduced.

## Identity Correction

Repository and database evidence contradict the earlier architecture assumption that Blockout already had a local
user UUID. The authoritative local identifier is an identity-backed PostgreSQL `BIGINT`, represented by `Long` in
users, favorites, notification foreign keys, event payloads, and downstream callers. MRG-339 therefore preserves the
positive numeric identity and corrects every currently declared user-ID wire surface to standard inline OpenAPI
`integer`/`int64` syntax with `minimum: 1`.

No UUID column, translation table, compatibility mapper, custom `NumericIdentifier` schema, `x-java-type`, or data
migration is invented. Auth0 subjects remain external string identities resolved only at authentication and identity
adapter boundaries. A future local-identity redesign would require a separate approved migration and cannot be hidden
inside contract-first restructuring.

## Boundary Ownership

| Concern                     | Owner and target                                                              |
| --------------------------- | ----------------------------------------------------------------------------- |
| Account query               | `UserAccountService`                                                          |
| Account/profile projection  | `UserAccountView` and favorite-owned `FavoriteView`                           |
| Profile mutation intent     | `UpdateUserProfileCommand` and `UserProfileImageChange`                       |
| Account orchestration       | `UserAccountApplicationService`                                               |
| Profile mutation behavior   | transactional `UserProfileMutationService`                                    |
| Entity projection           | strict `UserAccountViewMapper`                                                |
| Generated transport mapping | strict `UserAccountApiMapper`                                                 |
| Canonical REST              | generated `UserAccountsApi` behind `UserAccountV2Controller`                  |
| Legacy REST                 | `LegacyUserController`, adapter records, and `LegacyUsersJson`                |
| Authenticated subject       | `AuthenticatedUserSubject`                                                    |
| Object storage              | `S3StorageClientService`, receiving application-owned upload bytes            |
| Auth0 management            | then-retained `UserService` internals, replaced by the MRG-364 identity split |

Generated models never enter application, persistence, Auth0, or S3 code. JPA entities never leave the application
boundary. The former handwritten account/update/favorite DTOs, their mappers, the multipart image utility, and the
mixed v1 controller are removed.

## Operation And Behavior Parity

| Operation | Canonical behavior                                         | Retained v1 behavior                                             |
| --------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `USER-01` | Read one account by Auth0 subject                          | Same lookup, fields, nulls, status, and legacy snake_case JSON   |
| `USER-02` | Read the authenticated account                             | Same subject resolution, fields, favorites, and failure behavior |
| `USER-03` | Update a profile selected by Auth0 subject                 | Same pseudo and image effects through the legacy multipart shape |
| `USER-04` | Ensure/update the authenticated user from Auth0            | Same Auth0 synchronization, linking, reactivation, and conflicts |
| `USER-05` | Delete the authenticated account through retained behavior | Same Auth0-first deletion, favorite events, and local deletion   |

The account projection deliberately retains every current field required by legacy callers. Canonical generated
responses expose only the approved v2 contract. Favorites remain users-service-owned and use the positive numeric
local user identifier.

Legacy response projections remain operation specific: account reads preserve the historical reduced favorite shape,
while update and ensure responses preserve the former entity-shaped favorites with row ID and creation timestamp.
Those compatibility-only fields do not enter the canonical generated response.

Profile mutation now expresses image intent without using a nullable transport field as hidden policy:

- `KEEP` leaves the current picture unchanged;
- `REMOVE` deletes the current object and clears its URL;
- `REPLACE` deletes the previous object before uploading the supplied bytes;
- a canonical request containing both a replacement image and `removePicture: true` is rejected;
- the v1 adapter translates its historical multipart convention to the same three intents.

Pseudo trimming, case-insensitive uniqueness, blank-value handling, reactivation, timestamps, S3 ordering, conflict
mapping, and successful response bodies remain unchanged. The later MRG-364 slice owns the deeper Auth0 identity-link,
account-deletion, storage, and orchestration restructuring; MRG-339 does not silently correct those workflows.

## Authentication, Errors, And Compatibility

Canonical operations retain their generated bearer contract and exact authorities:

- account lookup requires `SCOPE_read:users`;
- current-account lookup requires `SCOPE_read:current_user`;
- selected profile update requires `SCOPE_update:current_user`;
- current-user ensure requires `SCOPE_create:current_user`;
- current-user deletion requires `SCOPE_delete:current_user`.

Canonical validation, identity-provider, not-found, and conflict failures use users-service Problem Details with stable
codes and request IDs. Security entry-point and access-denied responses are version aware. The dedicated v1 adapter
continues to emit its historical snake_case payloads, nulls, status codes, errors, and API-key behavior without a
global compatibility conversion or annotations on handwritten models.

Compatibility telemetry records the operation ID, API version, status, latency, and request ID without request or
response payloads. Mobile-gateway, Expo, and notification-service remain on their existing routes until their declared
consumer tasks. No production authority changes in this slice.

## Provider-First Activation And Rollback

The deployable order for an eventual authorized release is:

1. deploy and validate a users-service image exposing both unchanged v1 and canonical v2 account routes;
2. retain that dual-route image as the provider rollback baseline;
3. deploy matches-service with the generated v2 users client;
4. validate current-user resolution and live-link creation parity before increasing authority.

If consumer validation fails, roll matches-service back to its last v1-adapter image while leaving users-service on
the retained dual-route baseline. Returning users-service to a v1-only image first requires reverting matches-service
to v1. The active goal performs neither deployment nor production cutover.

## Coexistence And Temporary Names

- `api/v1`, `LegacyUserController`, `LegacyUsersJson`, and adapter-local records remain only until all callers migrate
  and the approved zero-traffic evidence gates close.
- `api/v2` and the `UserAccountV2Controller` suffix are coexistence names. After authorized v1 retirement, the
  surviving canonical controller becomes unqualified.
- The public canonical `/api/v2/**` route remains stable after source-code coexistence names disappear.
- Generated interfaces/models at adapters, meaningful application records, strict mappers, explicit image intent,
  and persistence separation remain part of the target architecture.
- Flyway files named `V2__...` remain immutable database history and are unrelated to REST coexistence cleanup.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes legacy production removal.

## Verification Evidence

- Application tests prove pseudo trim and reactivation, image keep/remove/replace behavior, and delete-before-upload
  ordering.
- Transport tests prove canonical mapping, numeric local IDs, legacy snake_case serialization, nullable values, and
  generated current-user projection in matches-service.
- Source lint and contract tests prove standard inline numeric identifier syntax across users, reports,
  notifications, and mobile-gateway and deterministic generated bundles.
- Focused and retained service tests, generated server/client compilation, mobile code generation and type checking,
  full backend packaging, documentation validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- [MRG-363](mrg-363-users-favorites-runtime-migration.md) owns the generated favorite boundary and canonical
  favorite authority; BFF and Expo caller migration remains deferred.
- [MRG-364](mrg-364-users-identity-storage-runtime-migration.md) completes the Auth0 identity-link, deletion, storage,
  and orchestration split while retaining current behavior.
- MRG-341, MRG-343, MRG-347, and MRG-365 own notification, BFF, and Expo consumers.
- MRG-369 and MRG-372 own favorite/follow event contracts and the users-service outbox.
- MRG-408, MRG-425, and MRG-426 own deeper users-service restructuring.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement is outside this active goal.
