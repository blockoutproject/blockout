# MRG-364 Users Identity And Storage Runtime Migration

- Status: implemented in the monorepo shadow baseline
- Operations: `USER-04` through `USER-06`, plus the account image-storage edge
- Owner: `users-service`
- External providers: Auth0 Management API and AWS S3
- Deferred consumers: mobile-gateway and Expo
- Production effect: none

## Purpose

MRG-364 removes Auth0 SDK, account-linking, deletion, persistence, favorite-event, and S3 transport responsibilities
from the former mixed `UserService` and `S3StorageClientService`. Identity workflows now cross an application-owned
`IdentityProvider` port, profile images cross a `ProfileImageStorage` port, and the provider implementations are
confined to dedicated Auth0 and S3 infrastructure adapters.

`UserIdentityV2Controller` activates the generated `UserIdentityApi` for the internal default-role operation. The
account controller continues to own ensure and delete operations through the generated `UserAccountsApi`. Both
controllers delegate immediately to application-owned services and never expose Auth0, AWS, JPA, or generated models
beyond their owning adapters.

This is a structural migration. It does not change account creation, synchronization, linking, deletion, image,
retention, authentication, authorization, event, database, or production behavior.

## Boundary Ownership

| Concern                          | Owner and target                                                      |
| -------------------------------- | --------------------------------------------------------------------- |
| External identity snapshot       | immutable `IdentityProfile`                                           |
| Identity-provider operations     | `IdentityProvider`                                                    |
| Auth0 Management SDK             | `Auth0IdentityProvider` and the retained `Auth0TokenManager`          |
| Identity use cases               | `UserIdentityService`                                                 |
| Transactional identity workflow  | `UserIdentityApplicationService`                                      |
| Account/profile use cases        | `UserAccountService` and `UserAccountApplicationService`              |
| Profile-image operations         | `ProfileImageStorage`                                                 |
| AWS S3 SDK                       | `S3ProfileImageStorage`                                               |
| Canonical identity REST          | generated `UserIdentityApi` behind `UserIdentityV2Controller`         |
| Canonical account REST           | generated `UserAccountsApi` behind `UserAccountV2Controller`          |
| Legacy identity and account REST | `LegacyUserController`                                                |
| Favorite deletion events         | existing application-owned `FavoriteEventPublisher`                   |
| Local account persistence        | existing `UserRepository` and `CustomUser` entity at persistence edge |

Auth0 SDK users become `IdentityProfile` records inside the provider adapter. AWS requests are created only inside
the storage adapter. Generated request and response models remain transport-only. Neither vendor SDK type enters an
application service, controller, persistence entity, event port, or test fake.

## Identity And Account Parity

| Operation | Retained behavior                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `USER-04` | Resolve the JWT subject in Auth0; update only email, first name, last name, and phone; otherwise create or link |
| `USER-05` | Resolve the local account; delete Auth0 first; publish one legacy delete event per favorite; delete locally     |
| `USER-06` | Require the exact configured API key and assign the configured default Auth0 role                               |

The ensure workflow retains the existing same-email policy:

1. read the requested Auth0 identity;
2. synchronize the existing local account when its Auth0 subject already matches;
3. when the email belongs to another local account, derive the secondary provider from the Auth0 subject and attempt
   provider linking;
4. after a successful link, re-read the primary identity and synchronize the primary local account;
5. if that post-link read fails, return the already-linked local primary account;
6. if linking fails, preserve the existing email-conflict result;
7. otherwise create an active local account with the retained normalized email-prefix pseudo and collision sequence.

Synchronization still excludes pseudo, picture, active state, creation time, favorites, and local numeric identity.
New account creation still copies the Auth0 picture once. The migration removes the former whole-entity debug log so
credentials, personal data, favorites, and internal state cannot be emitted as one payload; this does not affect the
wire or persistence result.

## Deletion, Retention, And Failure Windows

Deletion remains provider-first and intentionally non-atomic across systems:

1. load the local account or return the established not-found response;
2. delete the Auth0 identity;
3. publish one existing unversioned `DELETED` favorite event per local favorite;
4. delete the local account in the current transaction.

An Auth0 failure prevents favorite publication and local deletion. A favorite publication or local persistence
failure may still occur after the Auth0 identity has been deleted. MRG-364 does not add compensation, an outbox,
retry, reconciliation, or provider restore behavior. MRG-372 owns the users outbox and consumer deduplication;
MRG-426 owns deeper deletion/storage orchestration and any future corrective policy.

Account deletion still does not delete the current profile image, notification tokens, reports, provider audit data,
or other externally retained data. No retention period or ownership decision changes in this slice. Any cleanup of
those resources requires a separate audited task and explicit product/production evidence.

## Profile Image Storage Parity

The profile mutation workflow now calls `ProfileImageStorage`, but retains the exact image intent introduced by
MRG-339:

- `KEEP` leaves the stored URL untouched;
- `REMOVE` deletes a configured-bucket object before clearing the URL;
- `REPLACE` deletes the current configured-bucket object before uploading the replacement;
- a foreign or vendor-owned URL is ignored by S3 deletion;
- uploads keep the `users` folder, UUID-prefixed key, submitted content type, configured bucket and region, and
  deployed regional public URL shape.

The adapter keeps the existing static credentials and synchronous AWS client. Lifecycle, presigned URLs, private
objects, orphan cleanup, retry, and client shutdown policy are not silently introduced by this structural task.

## Authentication, Errors, And Compatibility

The v1 internal operation retains its dedicated `/api/v1/users/internal/**` security chain. Missing and invalid API
keys still return `401` with the exact plain-text bodies `Missing API Key` and `Invalid API Key`; only the exact
configured `X-API-KEY` reaches the controller.

The canonical `/api/v2/users/internal/**` chain applies the same exact-key rule and returns Problem Details with stable
code `invalid_api_key` and a request identifier. `USER-06` is now implemented by the generated v2 interface. Bearer
authentication and method scopes for ensure and delete remain unchanged. Auth0 failures preserve the existing v1
status and original provider message while v2 returns canonical `identity_provider_error` Problem Details.

The existing `Auth0TokenManager` remains responsible for the configured management client, token refresh schedule,
and retained startup/failure behavior. MRG-364 neither changes Auth0 tenant configuration nor adds token, provider, or
network retries.

## Provider-First Activation And Rollback

An eventual authorized deployment follows the coexistence rules from MRG-304:

1. deploy one users-service image exposing unchanged v1 and canonical v2 account/identity routes;
2. validate v1 API-key bodies, bearer scopes, ensure/link parity, provider-first deletion, favorite events, and S3
   image intent;
3. retain that dual-route image as the provider rollback baseline;
4. migrate mobile-gateway and Expo callers only in MRG-343 and MRG-347.

Before any v2 consumer is active, the standalone v1 users image remains a valid rollback target. After the first v2
consumer is active, rollback uses the last-known-good dual-route image; returning to v1-only first requires reverting
every v2 consumer. This active goal performs no deployment, live Auth0/S3 action, production snapshot, or cutover.

## Coexistence And Temporary Names

- `api/v1`, `LegacyUserController`, and the retained v1 filter exist only until every caller migrates and approved
  zero-traffic evidence gates close.
- `api/v2`, `UserAccountV2Controller`, `UserIdentityV2Controller`, and similar `V2` source qualifiers are coexistence
  names. After authorized v1 retirement, the surviving canonical source names become unqualified.
- The public canonical `/api/v2/**` routes remain stable after source-code coexistence names disappear.
- Application records, ports, use cases, generated boundaries, strict mappers, infrastructure adapters, and entity
  isolation remain part of the target architecture.
- Flyway files named `V2__...` remain immutable database history and are unrelated to REST coexistence cleanup.

The active goal stops before Phase MRG-900 and therefore neither performs nor authorizes legacy production removal.

## Verification Evidence

- Identity application tests prove field-limited synchronization, account creation, pseudo generation, same-email
  linking, post-link fallback, provider-first deletion, favorite-event/local ordering, stop-on-provider-failure, and
  role failure isolation.
- Boundary tests prove generated interface ownership, canonical API-key Problem Details, exact-key acceptance, and the
  exact retained v1 missing/invalid plain-text responses.
- Adapter tests prove invalid and identical Auth0 link inputs do not call the provider and foreign profile URLs do not
  call S3 deletion.
- Profile tests prove keep/remove/replace intent and delete-before-upload ordering through the application port.
- Source confinement, focused and retained users tests, generated compilation, contract tests, full backend package,
  documentation validation, Maaatch comparison, Prettier, and whitespace checks pass.

## Closed Scope

- MRG-343 and MRG-347 own mobile-gateway and Expo account/favorite consumers.
- MRG-369 and MRG-372 own generated favorite events, users-service outbox publication, and deduplication.
- MRG-408, MRG-425, and MRG-426 own deeper account, identity, favorite, deletion, and storage restructuring.
- MRG-373 and MRG-352 own canonical casing cleanup while isolated v1 adapters remain.
- Production v1 retirement and live provider/storage policy changes are outside this active goal.
