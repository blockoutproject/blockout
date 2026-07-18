# MRG-408 Users Account Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `users-service`
- Scope: account reads, profile mutation, local identity synchronization, Auth0, S3, and account persistence
- REST operations: `USER-01` through `USER-06`
- Production effect: none

## Purpose

MRG-408 completes the approved Phase MRG-400 restructuring of users-service account and profile internals after
MRG-339 established generated account transports and MRG-364 isolated identity-provider and image-storage ports.
Account application services no longer import Spring Data repositories, JPA entities, persistence mappers, or Spring
data-access exceptions. They coordinate role-owned views, creation intent, synchronization/profile changes, a store
port, and one transaction-bound update handle.

The slice preserves current account lookup, ensure, same-email linking, profile update, default-role, and deletion
behavior. It does not change local numeric identity, Auth0 subjects, public contracts, authorization, database schema,
image ordering, deletion compensation, favorite authority, or production state.

## Ownership

| Concern                    | Inbound adapter                                      | Application roles                                                                 | Outbound adapter                                                                  |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Account reads              | isolated v1 and generated v2 account controllers     | `UserAccountService`, `UserAccountView`, and `UserAccountStore`                   | `JpaUserAccountStore`, account entity, repository, and persistence mapper         |
| Profile mutation           | multipart adapters and explicit image intent         | profile service, `UserProfileChange`, store update handle, and image-storage port | same JPA account handle plus `S3ProfileImageStorage`                              |
| Identity synchronization   | current-user ensure endpoints                        | `IdentityProfile`, synchronization intent, identity-provider port, and service    | `Auth0IdentityProvider`, identity-owned token manager, and JPA account handle     |
| Local account creation     | identity ensure workflow                             | `NewUserAccount`, pseudo policy, and account store                                | strict creation mapping and existing `users` table                                |
| Default role               | isolated v1 and generated v2 identity controllers    | `UserIdentityService` and `IdentityProvider`                                      | Auth0 Management API adapter                                                      |
| Retained deletion sequence | account controllers                                  | existing identity service and favorite event port                                 | Auth0 provider, account update handle, existing favorite event/outbox adapter     |
| Compatibility              | v1 snake-case and generated v2 adapters remain split | shared role-owned account commands and views                                      | unchanged MRG-304 telemetry, rollout properties, contracts, routes, and providers |

`UserAccountView` remains a justified account projection because both compatibility transports need the complete
local account plus their operation-specific favorite shapes. `NewUserAccount`, `UserIdentitySynchronization`, and
`UserProfileChange` carry distinct creation, external-refresh, and nullable profile intent rather than mirroring a
transport or JPA entity. The update handle retains one managed entity through the owning application transaction.

## Account And Profile Parity

The account store retains the existing `findByAuth0IdWithFavorites` join-fetch query for transport reads and the
existing case-insensitive email and pseudo queries for mutations. Account creation still derives the pseudo from the
normalized email prefix, probes suffixes `2` through `200`, falls back to the same process-local suffix, copies the
same Auth0 fields, and relies on the existing JPA callbacks for timestamps.

Profile mutation preserves:

- trim, blank no-op, exact-value no-op, and case-insensitive pseudo uniqueness behavior;
- profile-update reactivation;
- explicit keep, remove, and replace image intent;
- old-object deletion before replacement upload;
- the existing `users` storage folder, S3 key and public URL convention, foreign-URL guard, credentials, region, and
  bucket configuration; and
- the same conflict translation when persistence rejects a profile update.

The application now logs changes between immutable before/after views instead of persistence entities. The relevant
account fields and action/entity identifiers are unchanged; no broad entity or vendor object enters an application
contract.

## Identity And Provider Parity

The Auth0 adapter remains the only owner of Management API users, requests, exceptions, provider parsing, role IDs,
and link calls. `Auth0TokenManager` moves beside that adapter because its Management API client and scheduled token
lifecycle are vendor infrastructure, not generic service configuration. Its startup attempt, fixed-delay schedule,
refresh behavior, retained swallowed refresh failures, expiry calculation, and configured properties remain
unchanged.

Ensure still:

1. reads the requested Auth0 profile;
2. synchronizes only email, first name, last name, and phone for an existing subject;
3. attempts same-email linking to the retained primary subject;
4. resynchronizes the primary after a successful link and returns the local primary if that refresh fails; or
5. creates a new local account and copies the existing Auth0 picture URL.

Default-role assignment retains the current wrapper error. Deletion remains provider first, followed by one existing
favorite deletion event per row and then local cascade deletion. MRG-408 exposes persistence through the account
handle but deliberately does not redesign this workflow, add compensation, delete a profile image, change retention,
or alter outbox behavior.

## Persistence, Mappers, And Compatibility

The account JPA type is now `UserAccountEntity` under `account/persistence`, while its JPA entity name remains
`CustomUser` and its table remains `users`. The repository and `UserAccountPersistenceMapper` move beside that entity.
The mapper from `UserFavorite` to `FavoriteView` moves to `favorite/persistence` because its source is a persistence
entity and its target is an application view; its mapping is unchanged.

Flyway V1 through V5, the `users` and `user_favorites` tables, columns, constraints, indexes, callbacks, cascades,
relations, numeric identifiers, and timestamps are unchanged. There is no migration or data rewrite. Generated REST
and event models remain confined to their existing adapters, and no generated artifact changes.

The favorite application service still uses account/favorite JPA types for its current canonical favorite workflow.
That known coupling is retained explicitly for MRG-425 rather than being absorbed into this slice. MRG-426 remains the
exclusive owner of deletion and object-storage plans, retention, compensation, transaction redesign, and related
event/outbox adapter changes. Legacy v1 account transports remain until the MRG-267 lineage and MRG-304 traffic,
observation, rollback, and retirement gates authorize removal.

## Verification And Rollback

Focused users-service tests cover account and favorite transport shapes, generated mappings, identity synchronization,
creation and linking, provider-first deletion order, default-role errors, profile keep/remove/replace behavior, Auth0
and S3 adapter semantics, persistence mapping, and architecture ownership. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl users-service -am -Dtest='!UsersApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only users-service image revert. Both REST versions, generated clients, Auth0 tenant and token
configuration, S3 objects and keys, Rabbit topology, outbox rows, Flyway history, database rows, environment values,
callers, and production authority remain compatible with the previous image.
