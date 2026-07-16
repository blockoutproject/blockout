# MRG-258 — users-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `830dcbbff5b3ca430cc80ae26c63f0b4f4489b4c`
- Scope roots: `apps/backend/users-service`, user/follow slices of `mobile-gateway`, `matches-service`,
  `notification-service`, `teams-service`, `pools-service`, and Expo
- Audited deployable or workflow: users-service account, Auth0, profile image, favorites, follow event, BFF, and mobile
  boundaries plus all proven monorepo consumers
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no Auth0 tenant/action configuration, live S3 objects,
  production users/favorites, Rabbit payloads, access logs, deployed mobile versions, or privacy-retention inventory was
  observed

## Scope

This audit covers all nine REST operations, both JPA entities, three DTOs, the existing two mappers, Auth0 Management
API token/account/role flows, S3 profile-image ownership, favorite counters and events, notification projections,
matches/notification `/me` consumers, BFF pass-through, and Expo session/profile/follow/delete workflows. Current
Spring/Jackson behavior is evidence, not target contract authority.

Canonical Blockout-owned wire names are camelCase. Database columns remain snake_case, while Auth0 and S3 shapes stay
contained in vendor adapters. Target roles are provisional until MRG-268.

## 1. Runtime Boundary Summary

| Boundary         | Current owner / entry                                       | Producers                                             | Consumers / effects                           | Auth                         | Status   |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- | ---------------------------- | -------- |
| account REST     | users-service, six operations                               | BFF, matches, notifications, external internal caller | users DB, Auth0, S3                           | JWT scopes or API key        | `PROVEN` |
| favorite REST    | users-service, three operations                             | BFF/Expo                                              | favorites DB, team/pool counts, follow events | authenticated; scoped writes | `PROVEN` |
| account storage  | `users` entity/table                                        | Auth0 ensure and profile update                       | session/profile, service identity lookup      | internal                     | `PROVEN` |
| favorite storage | `user_favorites` entity/table                               | follow/unfollow                                       | feed filters, counts, notification recipients | internal                     | `PROVEN` |
| Auth0            | Management API                                              | ensure, link, role assignment, delete                 | identity/account lifecycle                    | M2M token                    | `PROVEN` |
| S3               | users-service direct SDK client                             | profile update                                        | public picture URL                            | static AWS credentials       | `PROVEN` |
| downstream HTTP  | teams/pools follower mutations                              | follow/unfollow                                       | denormalized follower counts                  | forwarded user JWT           | `PROVEN` |
| follow events    | `user.follow.exchange`                                      | favorite writes/account deletion                      | notification follower projection              | broker credentials           | `PROVEN` |
| BFF/Expo         | mobile-gateway user facade and mobile-local API/query state | user actions                                          | session/profile/follow UI                     | forwarded JWT                | `PROVEN` |

The service has 37 production Java files, nine operations, zero Rabbit listeners, and one context-load test. It is the
relational owner of users and favorites, but cross-system account/follower state spans Auth0, S3, team/pool services,
RabbitMQ, and notification storage without an atomic boundary.

## 2. REST Operation Inventory

No operation has a source-contract `operationId`.

| Method and path                                             | Controller          | Auth rule                  | Request                                 | Success                     | Proven caller           | Status   |
| ----------------------------------------------------------- | ------------------- | -------------------------- | --------------------------------------- | --------------------------- | ----------------------- | -------- |
| GET `/api/v1/users/{auth0Id}`                               | `getUserByAuth0Id`  | `read:users`               | path identity                           | 200 mapped DTO; 404         | no monorepo caller      | `PROVEN` |
| GET `/api/v1/users/me`                                      | `getCurrentUser`    | `read:current_user`        | JWT subject                             | 200 mapped DTO; 404         | matches, notifications  | `PROVEN` |
| PUT `/api/v1/users/{auth0Id}`                               | `updateUser`        | `update:current_user`      | multipart data + optional image         | 200 direct entity           | BFF/Expo                | `PROVEN` |
| PUT `/api/v1/users/me`                                      | `ensureCurrentUser` | `create:current_user`      | JWT subject                             | 200 direct entity           | BFF/Expo bootstrap      | `PROVEN` |
| DELETE `/api/v1/users/me`                                   | `deleteUser`        | `delete:current_user`      | JWT subject                             | 204                         | BFF/Expo                | `PROVEN` |
| POST `/api/v1/users/internal/{auth0Id}/assign-default-role` | `assignDefaultRole` | exact `X-API-KEY`          | path identity                           | 204                         | external caller unknown | `PROVEN` |
| GET `/api/v1/users/{userId}/favorites`                      | `listFavorites`     | authenticated only         | numeric user ID, optional `entity_type` | 200 direct entity list; 404 | no monorepo caller      | `PROVEN` |
| POST `/api/v1/users/favorites/follow`                       | `follow`            | type-specific follow scope | `entity_type`, `entity_id` query        | 204/no-op                   | BFF/Expo                | `PROVEN` |
| DELETE `/api/v1/users/favorites/follow`                     | `unfollow`          | type-specific follow scope | `entity_type`, `entity_id` query        | 204/no-op                   | BFF/Expo                | `PROVEN` |

### Auth and compatibility observations

- Update uses a path `auth0Id` with a “current user” scope but never compares it to the JWT subject. The BFF exposes the
  same caller-controlled path. Any token with that scope can attempt to update another known Auth0 ID. Account-linking
  may explain why the UI uses the returned local primary ID, but it does not provide authorization enforcement.
- Favorite listing accepts any numeric user ID for any authenticated caller. Whether favorites are public is
  `UNKNOWN`; the mobile app receives its own reduced favorites through the user DTO and does not call this endpoint.
- Internal role assignment is isolated by a first-order security chain and API-key filter. The filter returns plain-text
  401 responses rather than the service error shape and logs masked supplied/expected key fragments.
- All HTTP JSON uses global Jackson `SNAKE_CASE`. Users-service has no explicit `@JsonProperty`; the BFF user DTO family
  adds three annotations, and Expo uses both deep interceptors and a special multipart snake-case helper.

## 3. Account and Favorite Field Lineage

| User field  | Producer / update authority               | Proven consumers                                       | Persistence / validation                     | Class                | Status   |
| ----------- | ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | -------------------- | -------- |
| id          | DB identity                               | favorites, events, push tokens, reports, notifications | generated bigint                             | `REQUIRED`           | `PROVEN` |
| auth0Id     | Auth0 user ID; never changed locally      | lookup, profile update path, live-link ownership       | unique/non-null                              | `REQUIRED`           | `PROVEN` |
| email       | Auth0 ensure/resync                       | profile display, account linking                       | unique/non-null; no format validation        | `REQUIRED`           | `PROVEN` |
| pseudo      | generated locally, profile update         | profile/report display                                 | DB unique; service checks case-insensitively | `REQUIRED`           | `PROVEN` |
| firstName   | Auth0 ensure/resync                       | copied DTOs; no proven Expo use                        | nullable                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| lastName    | Auth0 ensure/resync                       | copied DTOs; no proven Expo use                        | nullable                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| pictureUrl  | Auth0 initial value, then app/S3 update   | profile/tab avatar                                     | nullable text; URL ownership mixed           | `REQUIRED`           | `PROVEN` |
| phoneNumber | Auth0 ensure/resync                       | copied DTOs; no proven Expo use                        | nullable                                     | `COMPATIBILITY_ONLY` | `PROVEN` |
| favorites   | ORM relationship                          | mapped session DTO, feed/follow state                  | lazy cascade/orphan removal                  | `REQUIRED`           | `PROVEN` |
| active      | creation true; profile update reactivates | copied clients; no UI gating                           | non-null default true                        | `COMPATIBILITY_ONLY` | `PROVEN` |
| createdAt   | JPA callback                              | live-link account-age policy                           | non-null entity; migration column nullable   | `REQUIRED`           | `PROVEN` |
| lastUpdate  | JPA callback/Auth0 resync                 | copied DTO only                                        | non-null entity; migration column nullable   | `PERSISTENCE_ONLY`   | `PROVEN` |

| Favorite field | Producer       | Consumer                                     | Persistence / wire            | Class              | Status   |
| -------------- | -------------- | -------------------------------------------- | ----------------------------- | ------------------ | -------- |
| id             | DB identity    | raw list response only                       | generated                     | `PERSISTENCE_ONLY` | `PROVEN` |
| user           | follow service | repository relation                          | non-null FK, JSON ignored     | `PERSISTENCE_ONLY` | `PROVEN` |
| entityType     | request        | filters, counters, event routing, Expo state | TEAM/POOL DB check            | `REQUIRED`         | `PROVEN` |
| entityId       | request        | team/pool identity, events, Expo state       | non-null, no cross-service FK | `REQUIRED`         | `PROVEN` |
| createdAt      | JPA callback   | raw favorite list only                       | nullable local timestamp      | `PERSISTENCE_ONLY` | `PROVEN` |

The unique favorite key is `(userId, entityType, entityId)`. Repository reads have no explicit order. There is no
cross-service entity FK, active check, optimistic version, or source revision.

## 4. DTO, Mapper, and Response Analysis

| Type / boundary       | Fields                                   | Construction                 | Gap                                                    | Status   |
| --------------------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------ | -------- |
| `CustomUserDTO`       | all 11 scalar fields + reduced favorites | `CustomUserMapper`           | broad service-to-service/user view                     | `PROVEN` |
| `UserFavoriteDTO`     | entityType, entityId                     | `UserFavoriteMapper`         | intentional reduced projection                         | `PROVEN` |
| `CustomUserUpdateDTO` | pseudo, pictureUrl                       | multipart JSON               | null pictureUrl doubles as delete command              | `PROVEN` |
| update response       | direct `CustomUser`                      | Jackson entity serialization | bypasses mapper; may include full favorite rows        | `PROVEN` |
| ensure response       | direct `CustomUser`                      | Jackson entity serialization | bypasses mapper; lazy relationship/framework-dependent | `PROVEN` |
| favorite list         | direct `UserFavorite`                    | Jackson entity serialization | exposes id/createdAt beyond session favorites          | `PROVEN` |

The existing mappers are correct boundary evidence but are only used by GET operations. Update/ensure return mutable
entities, so response shape differs by operation. The BFF deserializes all responses into its copied reduced DTO and
silently discards extra favorite fields, masking service drift from Expo.

The BFF update DTO contains id, firstName, and lastName in addition to pseudo/pictureUrl. Users-service ignores those
extra fields when deserializing its narrower DTO. Expo sends `Partial<CustomUser>` rather than a role-owned update type.
Generated contracts must replace this accidental tolerant-read behavior with an explicit profile command.

## 5. Auth0 Ownership and Account Lifecycle

| Workflow        | Current behavior                              | Risk / required decision                                                      | Status   |
| --------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| token startup   | `@PostConstruct` calls refresh                | refresh catches all failures, so startup can continue with null ManagementAPI | `PROVEN` |
| token refresh   | fixed delay 24h; volatile client/expiry       | failure retains previous client; expiry is not checked on access              | `PROVEN` |
| ensure existing | fetch Auth0, sync email/names/phone           | does not sync picture/pseudo or reactivate                                    | `PROVEN` |
| ensure new      | create local row from Auth0; generated pseudo | null email violates DB; concurrent pseudo/email races                         | `PROVEN` |
| same-email link | link secondary identity to local primary      | local auth0Id remains primary while JWT may retain secondary                  | `PROVEN` |
| default role    | add configured role                           | description says “if absent,” code does no prior role check                   | `PROVEN` |
| delete          | delete Auth0 first, then events and local row | later failure leaves remote identity deleted and local data present           | `PROVEN` |

After linking, `/me` performs an exact lookup by JWT subject. Whether Auth0 immediately changes the subject or makes the
secondary Management API user unavailable is tenant/runtime-dependent and `UNKNOWN`. This blocks a clean identity
contract: the target needs a documented canonical local user ID and identity-alias resolution policy, not caller-picked
path IDs.

`CustomUser.toString()` includes every field. Creation logs `newUser.toString()` at INFO under a `DEBUG` message, which
can expose auth0Id, email, names, phone, picture URL, timestamps, and favorites in logs. Contract migration must retain
identity observability without retaining this PII leak.

## 6. Profile Update and S3 Boundary

| Input/state                    | Current behavior                                                 | Compatibility / consistency risk                     | Status   |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------- | -------- |
| pseudo non-null                | trim; ignore empty/unchanged; case-insensitive precheck          | backend has no 3..32/pattern rule used by Expo       | `PROVEN` |
| new image                      | validate declared MIME/size; delete old owned object; upload new | old delete occurs before upload and DB commit        | `PROVEN` |
| no image + pictureUrl null     | delete owned old object and set null                             | omission and explicit deletion are indistinguishable | `PROVEN` |
| no image + pictureUrl non-null | preserve current URL; supplied value otherwise ignored           | client must echo URL to avoid deletion               | `PROVEN` |
| inactive user                  | set active true                                                  | ensure does not perform the same reactivation        | `PROVEN` |

Expo intentionally echoes the current pictureUrl to mean “preserve” and sends null to mean “remove.” That is a
compatibility protocol, not a clean patch model. It also appends an image part even when its argument is undefined;
actual React Native FormData behavior needs a runtime fixture.

S3 deletion before successful upload/commit can leave a DB URL pointing to a removed object. Upload followed by DB
rollback can orphan the new object. Account deletion never deletes the profile image. Validation trusts MIME metadata
without checking bytes, and the public key includes the original filename. A generated multipart contract still needs
an application-level storage transaction/compensation policy.

## 7. Favorites, Counters, and Events

| Workflow stage          | Follow                                      | Unfollow                      | Failure consequence                                           | Status   |
| ----------------------- | ------------------------------------------- | ----------------------------- | ------------------------------------------------------------- | -------- |
| local DB                | check then insert                           | delete row                    | concurrent follow can hit unique constraint                   | `PROVEN` |
| team/pool HTTP          | increment after save                        | decrement after delete        | remote commit is outside local transaction                    | `PROVEN` |
| Rabbit                  | publish CREATED last                        | publish DELETED last          | broker failure rolls back local DB after remote count changed | `PROVEN` |
| notification projection | idempotent insert/delete consumer           | idempotent delete             | has DLQ topology; exact event casing unknown                  | `PROVEN` |
| Expo                    | optimistic count/follow state; refetch user | rollback local cache on error | server-side partial commit can disagree with rollback         | `PROVEN` |

Team and pool services also declare follow queues but have no listeners; their follower counts are updated synchronously
through HTTP. Notification-service is the proven event consumer and uses the projection to select match-notification
recipients. Follow events contain userId, entityType, entityId, eventType and are copied across services without a
version/envelope. Exact broker casing remains `UNKNOWN` until captured.

Deleting a user publishes one DELETED event per favorite inside the database transaction, then deletes the local user.
There is no user-deleted event. Notification inbox rows, push tokens, send records, and other userId-owned data are not
deleted by any proven monorepo flow. S3 content is also retained. This contradicts the Expo message that all account
data will be deleted unless external retention/cleanup exists; privacy ownership requires explicit evidence.

## 8. BFF and Expo Call Graph

| Workflow         | Calls / conversion                                               | State effects                                | Gap                                     | Status                              |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- | ----------------------------------- |
| bootstrap        | Expo PUT BFF `/users/me` → users ensure → Auth0 + DB             | TanStack `current-user`, 5m stale            | broad entity response copied to DTO     | `PROVEN`                            |
| profile update   | snake multipart helper → BFF parse/re-serialize → user multipart | parent refetch/onSuccess                     | double handwritten DTO/case bridge      | `PROVEN`                            |
| follow toggle    | Expo optimistic cache → BFF pass-through → user/target/event     | refetch current user, evict BFF target cache | distributed non-atomic state            | `PROVEN`                            |
| live policy      | matches GET users `/me`                                          | account age and owner identity               | broad copied user DTO; favorites unused | `PROVEN`                            |
| notification API | notifications GET users `/me`                                    | resolves local numeric user ID               | broad copied user DTO; only id needed   | `PROVEN`                            |
| account delete   | Expo signOutSSO, then BFF DELETE, then users Auth0/local delete  | clears onboarding/session                    | token may be unavailable before DELETE  | `PROVEN` order / `INFERRED` failure |

Expo visibly uses id, auth0Id, email, pseudo, pictureUrl, and favorites. `createdAt` is indirectly required by
matches-service rather than the profile UI. No Expo consumer was found for firstName, lastName, phoneNumber, active, or
lastUpdate. They cannot be removed until external raw-user callers and service consumers are resolved.

Account deletion calls `signOutSSO()` before `deleteCurrentUser()`. The session method clears the Auth0 session and
query cache; whether the configured token supplier can still produce a bearer token afterward is runtime-dependent,
but the ordering is provably unsafe and needs an end-to-end deletion fixture.

TanStack remains mobile-owned. Orval should generate the BFF transport and contract schemas locally to Expo; session,
optimistic follow state, image selection, Formik/Yup, haptics, navigation, and cache policy remain handwritten mobile
application concerns.

## 9. Construction, Conversion, and Duplicate Inventory

| ID      | Source → target                | Mechanism                        | Debt / loss                             | Provisional target                    | Status   |
| ------- | ------------------------------ | -------------------------------- | --------------------------------------- | ------------------------------------- | -------- |
| `U-C01` | Auth0 User → CustomUser        | manual builder/setters           | vendor/local ownership mixed in service | Auth0 adapter → account command       | `PROVEN` |
| `U-C02` | entity → read DTO              | two explicit manual mappers      | valid but broad                         | role-owned response mapper            | `PROVEN` |
| `U-C03` | update/ensure entity → REST    | direct Jackson                   | mapper bypass and lazy/full favorites   | generated response mapper             | `PROVEN` |
| `U-C04` | multipart JSON → update DTO    | ObjectMapper string part         | null-as-delete protocol                 | explicit profile patch/commands       | `PROVEN` |
| `U-C05` | favorite entity → raw REST     | direct Jackson                   | persistence fields exposed              | generated favorite response           | `PROVEN` |
| `U-C06` | favorite → counters/events     | HTTP plus copied event builder   | distributed writes in DB transaction    | application workflow + outbox policy  | `PROVEN` |
| `U-C07` | users REST → BFF DTO           | generic client/copied classes    | tolerant field drift                    | generated internal client             | `PROVEN` |
| `U-C08` | Expo multipart → BFF multipart | snake helper + manual rebuilding | double conversion                       | Orval multipart client + view command | `PROVEN` |
| `U-C09` | BFF JSON ↔ Expo               | global deep case interceptors    | implicit casing                         | camelCase Orval client                | `PROVEN` |

`EntityType` and `EventType` are copied across users, teams, pools, notification, BFF, and Expo. `UserGender` exists in
users-service but has no field or consumer and is a removal candidate after MRG-267. Object responses remain
boundary-local even when shared enums come from common contract fragments.

## 10. Validation, Errors, and Tests

| Area             | Current evidence                | Missing parity evidence                                          | Status    |
| ---------------- | ------------------------------- | ---------------------------------------------------------------- | --------- |
| identity auth    | scopes/API key                  | path-subject/link alias authorization matrix                     | `PROVEN`  |
| Auth0            | source only                     | token expiry/failure, linking, role, delete partial failures     | `PROVEN`  |
| pseudo           | trim/case checks plus DB unique | backend pattern/length, Unicode, race, generated collisions      | `PROVEN`  |
| image            | MIME/size checks                | bytes, undefined part, preserve/remove, S3 compensation          | `PROVEN`  |
| favorites        | DB unique and type check        | concurrency, target absence/inactive, ordering, partial commits  | `PROVEN`  |
| events           | notification idempotency/DLQ    | serialization, retries, ordering, outbox, deletion volume        | `UNKNOWN` |
| privacy deletion | Auth0 and local user source     | S3/notifications/tokens/reports complete erasure/retention       | `UNKNOWN` |
| service tests    | one context smoke test          | no controller/mapper/repository/Auth0/S3/event/workflow behavior | `PROVEN`  |
| Expo             | source/forms/hooks only         | account deletion, multipart, linking, optimistic follow E2E      | `PROVEN`  |

Auth0 exceptions map to 401 regardless of whether the cause is authentication, management authorization, rate limit,
not-found, or outage. Conflict maps to 409; file-size handler maps to 413; generic distributed/storage failures map to 500. No Bean Validation is applied to account/favorite requests.

## 11. Findings and Provisional Target Roles

| ID         | Finding / risk                                                                     | Follow-up                          | Status         |
| ---------- | ---------------------------------------------------------------------------------- | ---------------------------------- | -------------- |
| `USER-F01` | update path is not bound to JWT subject despite current-user scope                 | identity authorization redesign    | `PROVEN`       |
| `USER-F02` | GETs use mappers, but update/ensure/favorite list expose entities                  | MRG-268/408                        | `PROVEN`       |
| `USER-F03` | Auth0 link retains primary local ID while current JWT may use secondary ID         | alias/canonical identity decision  | `PROVEN`       |
| `USER-F04` | token refresh can leave a null/stale ManagementAPI without startup/access guard    | Auth0 adapter hardening            | `PROVEN`       |
| `USER-F05` | Auth0 deletion precedes local/event work and has no compensation                   | deletion saga/retention policy     | `PROVEN`       |
| `USER-F06` | account deletion leaves S3 and proven notification-owned user data                 | privacy inventory and cleanup      | `PROVEN`       |
| `USER-F07` | profile image delete/upload/DB update is non-atomic                                | storage compensation policy        | `PROVEN`       |
| `USER-F08` | pictureUrl omission means delete, forcing clients to echo current URL              | explicit multipart command         | `PROVEN`       |
| `USER-F09` | follower DB, target counters, and Rabbit projection can diverge                    | outbox/idempotent counter workflow | `PROVEN`       |
| `USER-F10` | raw user INFO log exposes broad PII through entity toString                        | logging/privacy cleanup            | `PROVEN`       |
| `USER-F11` | Expo signs out before calling authenticated account deletion                       | mobile deletion sequence fixture   | `PROVEN` order |
| `USER-F12` | BFF update DTO carries ignored identity/name fields; Expo sends Partial CustomUser | generated command/view split       | `PROVEN`       |
| `USER-F13` | global snake casing and multipart/deep transforms hide three boundary conversions  | MRG-303/304/351-354                | `PROVEN`       |
| `USER-F14` | public/private intent of arbitrary-user and favorite reads is undocumented         | contract/security decision         | `UNKNOWN`      |
| `USER-F15` | no focused test protects identity, deletion, images, favorites, events, or mappers | MRG-307/355/419/421                | `PROVEN`       |

| Current family    | Provisional target role                                        | Preconditions / owner            |
| ----------------- | -------------------------------------------------------------- | -------------------------------- |
| CustomUser entity | JPA entity behind application account views/commands           | MRG-268, Flyway preserved        |
| Auth0 user/token  | vendor adapter payload/client                                  | identity/linking policy          |
| profile update    | explicit pseudo/image preserve-replace-remove commands         | multipart compatibility fixtures |
| user read         | context-specific generated DTOs/mappers                        | external caller inventory        |
| favorites         | generated commands/responses plus application workflow         | consistency/event decision       |
| follow event      | versioned event contract/outbox candidate                      | MRG-315/350                      |
| BFF copies        | generated users client mapped to BFF response                  | MRG-323/339/413                  |
| Expo              | Orval client/Zod with mobile-local TanStack/session/form state | MRG-313/328/347                  |

## 12. Unknowns and Completion

| Unknown                                         | Required evidence                                            | Blocking                |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------- |
| Auth0 action caller/default-role idempotency    | tenant/action configuration and logs                         | internal contract       |
| post-link JWT/Management API behavior           | safe Auth0 integration fixture                               | canonical identity      |
| external consumers of raw user/favorite reads   | access logs/client inventory                                 | field/privacy reduction |
| live S3 orphans and mixed vendor URLs           | safe bucket/DB inventory                                     | storage migration       |
| complete account-data retention                 | notification/report/token/storage inventory and legal policy | deletion contract       |
| follower divergence                             | cross-service DB/broker comparison                           | reconciliation/cutover  |
| active/inactive user semantics                  | production data/product decision                             | active field role       |
| supported deployed mobile casing/error behavior | version support matrix                                       | compatibility removal   |

- [x] All nine operations, auth mechanisms, request/response variants, and callers are inventoried.
- [x] All user/favorite fields, existing mappers, direct entity responses, and duplicate DTOs are traced.
- [x] Auth0 token, ensure, linking, role, deletion, and canonical-identity gaps are explicit.
- [x] S3 image lifecycle, multipart compatibility, PII logging, and compensation gaps are explicit.
- [x] Favorite storage, synchronous counters, Rabbit events, notification projection, and Expo optimistic state are
      reconciled.
- [x] CamelCase, annotation/conversion removal, Orval, and mobile-local TanStack ownership are explicit.
- [x] Validation, tests, privacy unknowns, provisional roles, and downstream task owners are explicit.
- [x] No runtime, contract, generated artifact, schema, migration, test, configuration, or deployment file changed.

MRG-260 must complete notification retention and user-projection evidence. MRG-263/264 must consolidate BFF auth,
multipart, session, and deletion behavior. MRG-267/268 must approve canonical identity, account/favorite roles,
distributed consistency, storage compensation, privacy deletion, mappers, and event delivery. MRG-301/303/304/315/323
must define authoritative camelCase contracts and rollout. MRG-339/347/350/408/413/414 must migrate service, Expo,
events, and architecture with behavioral and deletion parity. TanStack and Orval remain Expo-owned. Production
deployment did not occur.
