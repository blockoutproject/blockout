# MRG-426 Users Deletion And Storage Architecture

- Status: implemented in the monorepo shadow baseline
- Runtime owner: `users-service`
- Scope: account-deletion planning, profile-image storage planning, transaction ownership, identity, S3, and outbox
  adapters
- Production effect: none

## Purpose

MRG-426 completes the approved Phase MRG-400 restructuring of users-service deletion and profile-image storage after
MRG-408 isolated account persistence and provider ports and MRG-425 made favorite state and its projections explicit.
It turns the already-proven workflows into immutable application plans with named executors while retaining every
known cross-system order and failure window.

This is a structural slice. It does not claim a new privacy policy, complete erasure, distributed atomicity, repair,
retry, reconciliation, or compensation. The MRG-258 audit still lacks live object inventories and legal retention
evidence, so unknown data ownership remains unknown instead of becoming an invented cleanup rule.

## Ownership

| Concern                        | Application owner                                            | Adapter owner                                     |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- |
| Account-deletion snapshot      | immutable `AccountDeletionPlan`                              | transaction-bound `UserAccountUpdate`             |
| Account-deletion orchestration | `UserAccountDeletionService`                                 | identity, account, and deletion-event ports       |
| External identity deletion     | `IdentityProvider`                                           | `Auth0IdentityProvider`                           |
| Favorite deletion facts        | `AccountDeletionEventPublisher`                              | `FavoriteOutboxEventPublisher`                    |
| Profile-image intent           | immutable `ProfileImageMutationPlan`                         | transport-owned validation remains unchanged      |
| Profile-image execution        | `ProfileImagePlanExecutor`                                   | `ProfileImageStorage` and `S3ProfileImageStorage` |
| Account/profile persistence    | `UserAccountStore` and transaction-bound `UserAccountUpdate` | `JpaUserAccountStore`                             |
| Transaction ownership          | deletion service and profile mutation service                | Spring transaction adapter                        |
| Legacy and canonical REST      | unchanged identity/account application interfaces            | existing isolated v1 and generated v2 controllers |

`UserIdentityApplicationService` now delegates deletion to the dedicated account-deletion application service. The
deletion service owns the local transaction and depends only on account-owned ports. `FavoriteOutboxEventPublisher`
is the named outbound adapter for both effective favorite transitions and account-deletion favorite facts; it retains
the same shared v1/v2 outbox identity and payload mapping previously held by the generic `EventPublisher` class.

## Provider-First Deletion And Retention

`AccountDeletionPlan` snapshots the local account identifier, Auth0 identity, current profile-image URL, and one typed
favorite deletion fact per retained row. The profile URL is deliberately named `retainedProfileImageUrl`: account
deletion still does not call object storage. The unchanged execution order is:

1. lock and load the local account or return the established not-found response;
2. build the immutable local plan;
3. delete the Auth0 identity;
4. record one retained `DELETED` and canonical `UNFOLLOWED` outbox fact per favorite;
5. delete the local account and its favorite rows through the existing cascade.

Auth0 failure still prevents outbox and local work. Outbox or local persistence failure may still happen after the
Auth0 identity is gone. The outbox facts and local deletion remain in one local transaction, but Auth0 does not.
There is no provider restore, compensation, retry, saga, user-deleted event, profile-image cleanup, notification-token
cleanup, report cleanup, or external-retention change.

The nullable legacy favorite snapshot is preserved. No new contract is inferred from it, and no database constraint,
cascade, event volume, event order, routing key, exchange, payload, version, or ordering key changes.

## Profile-Image Storage Plan And Failure Windows

`ProfileImageMutationPlan` captures the current URL and the already-validated `KEEP`, `REMOVE`, or `REPLACE` intent.
`ProfileImagePlanExecutor` crosses only `ProfileImageStorage` and retains the deployed order:

- `KEEP` performs no object-storage operation and leaves persistence untouched;
- `REMOVE` deletes an owned current URL before persisting a nullable replacement;
- `REPLACE` deletes an owned current URL before uploading to the unchanged `users` folder and persisting the new URL;
- a null current URL performs no delete, and the S3 adapter still ignores foreign or vendor-owned URLs.

The executor intentionally adds no compensation. A delete or upload failure prevents the database mutation. A failed
upload may still leave the database pointing at an already-deleted old object, and a later database rollback may still
orphan an uploaded replacement. Resolving either window requires audited product and operational policy that is not
available in this task.

`UserProfileMutationService` continues to own the transaction containing storage effects and the local profile write.
The S3 bucket, region, static credentials, key shape, MIME metadata, public URL, synchronous client, and SDK adapter
remain unchanged.

## Compatibility And Closed Scope

Flyway V1 through V5, `users`, `user_favorites`, and `event_outbox` are unchanged. There is no schema migration, data
rewrite, object move, bucket operation, Auth0 tenant operation, broker operation, or repair. REST routes, scopes,
status/error bodies, generated models, multipart behavior, favorite contracts, Rabbit topology, outbox cleanup,
consumers, callers, environment values, deployment, and production authority remain compatible.

MRG-426 does not authorize complete-erasure claims because S3 objects, notification-owned rows, reports, provider
audit data, and other user-linked stores still lack an approved retention inventory. Production v1 retirement, live
traffic changes, cutover, deployment, and every MRG-9xx/MRG-1000 action remain outside this active goal.

## Verification And Rollback

Focused users-service tests cover immutable deletion snapshots, explicit image retention, provider-first order,
provider and outbox failure windows, transactional ownership, keep/remove/replace execution, delete-before-upload,
absence of upload compensation, S3 foreign-URL handling, and exact shared v1/v2 outbox mapping. Validation commands:

```text
mvn -f apps/backend/pom.xml -pl users-service -am -Dtest='!UsersApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

Rollback is a code-only users-service image revert. The existing database rows, Flyway history, Auth0 identities, S3
objects, outbox rows, Rabbit topology, generated contracts, callers, environment values, deployment, and production
authority remain compatible with the previous image.
