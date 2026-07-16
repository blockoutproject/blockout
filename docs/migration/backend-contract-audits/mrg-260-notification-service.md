# MRG-260 — notification-service contract and data-boundary audit

- Audit date: 2026-07-16
- Commit: `0546b07f5ba583c348f09fa66b8bc30571166074`
- Scope roots: `apps/backend/notification-service`, notification and division-enrichment slices of
  `apps/backend/mobile-gateway`, notification/push slices of `apps/frontend/mobile`, and proven event producers in
  `matches-service` and `users-service`
- Audited deployable or workflow: notification inbox, unread/read/open/delete operations, push-token registration,
  follower projections, match event orchestration, Expo delivery, BFF enrichment, and mobile notification workflows
- Runtime mutation: none
- Evidence limitations: committed source/configuration only; no production database rows, RabbitMQ messages or broker
  policy, Auth0 M2M claims, Expo tickets/receipts, device tokens, access logs, deployed mobile versions, or standalone
  repository telemetry was observed

## Scope

This audit covers all six REST operations, ten service DTO classes, four JPA entities and repositories, six Flyway
migrations, four RabbitMQ listeners, three copied event families, token/content resolution, Expo SDK payloads and ticket
aggregation, the copied BFF contract and enrichment fan-out, and every proven Expo caller or field consumer.
Notification-service has 57 production Java files, two controllers, six REST operations, four entities, four
repositories, four listeners, no mapper package, and one context-load test.

Current Springdoc, mutable DTOs, direct entity responses, JPA annotations, global Jackson `SNAKE_CASE`, copied event
classes, and mobile conversions are implementation evidence, not target contract authority. Blockout-owned REST and
event fields target camelCase. Expo provider payloads retain provider names inside an explicit adapter. Database names
remain snake_case. Target roles are provisional until MRG-268; event authority remains a separate MRG-315 decision.

## 1. Runtime Boundary Summary

| Boundary                | Current owner / entry                                              | Producers                                        | Consumers / effects                                   | Auth / data owner                                     | Status   |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------- | -------- |
| notification REST       | notification-service, five inbox operations                        | BFF forwarded JWT                                | users-service identity lookup, inbox DB               | authenticated scopes; current local user              | `PROVEN` |
| push-token REST         | notification-service registration operation                        | BFF/Expo current user ID + Expo token            | push-token DB                                         | `update:current_user`; caller-controlled path user ID | `PROVEN` |
| follower projection     | Rabbit `team.follow` / `pool.follow`                               | users-service follow workflow                    | `followers_projection`                                | broker; notification DB                               | `PROVEN` |
| match-finished pipeline | Rabbit `match.finished`                                            | matches-service                                  | inbox, send ledger, resolved downstream content, Expo | broker + service M2M                                  | `PROVEN` |
| live-link pipeline      | Rabbit `match.live-link-created`                                   | matches-service                                  | inbox, send ledger, Expo                              | broker + service M2M                                  | `PROVEN` |
| content resolution      | teams/pools REST clients                                           | event orchestration                              | notification title/body/division metadata             | Auth0 M2M; remote service data                        | `PROVEN` |
| Expo delivery           | Expo Java SDK                                                      | token-resolved messages                          | provider tickets and token deactivation               | Expo access token; Expo provider                      | `PROVEN` |
| BFF projection          | mobile-gateway secure notification facade                          | notification REST + config division lookup       | enriched mobile page                                  | forwarded user JWT; BFF cache                         | `PROVEN` |
| mobile workflow         | Expo API, TanStack infinite query/mutation, notification listeners | authenticated user/device and provider callbacks | list/delete/deep-link/token registration UI           | mobile-local state                                    | `PROVEN` |

The service owns notification, delivery-attempt, follower-projection, and push-token storage. It does not own users,
teams, pools, matches, Auth0 identities, or Expo delivery. Side effects span separate database transactions, RabbitMQ,
three internal APIs, and Expo without an outbox, resumption worker, or receipt processor.

## 2. REST Operation Inventory

No operation has an authoritative source-contract `operationId`.

| Method and path                                         | Controller method  | Auth                  | Request                         | Success                            | Proven caller                   | Status   |
| ------------------------------------------------------- | ------------------ | --------------------- | ------------------------------- | ---------------------------------- | ------------------------------- | -------- |
| GET `/api/v1/notifications?page={page}&size={size}`     | `getNotifications` | `read:current_user`   | page default 0; size default 20 | 200 direct-entity page             | BFF/Expo infinite list          | `PROVEN` |
| GET `/api/v1/notifications/unread-count`                | `unreadCount`      | `read:current_user`   | none                            | 200 `{unread}`                     | BFF; no proven mobile read      | `PROVEN` |
| POST `/api/v1/notifications/{id}/read`                  | `markRead`         | `read:current_user`   | path notification ID            | 204 changed; 404 unchanged/missing | BFF; no proven mobile call      | `PROVEN` |
| POST `/api/v1/notifications/{id}/opened`                | `markOpened`       | `read:current_user`   | path notification ID            | 204 changed; 404 unchanged/missing | BFF; no proven mobile call      | `PROVEN` |
| DELETE `/api/v1/notifications/{id}`                     | `delete`           | `read:current_user`   | path notification ID            | 204 deleted; 404 missing           | BFF/Expo optimistic delete      | `PROVEN` |
| POST `/api/v1/notifications/users/{userId}/push-tokens` | `register`         | `update:current_user` | JSON token/platform/device      | 202                                | BFF/Expo session and onboarding | `PROVEN` |

### Current operation behavior

- Inbox operations resolve the local numeric user ID by forwarding the current JWT to users-service `/me`. Reads and
  mutations are therefore constrained by `(notificationId, resolved userId)` at the repository boundary.
- Mark-read and mark-opened return 404 when the flag is already true because the conditional update affects zero rows.
  Repeated writes are not idempotent 204s. Delete is idempotent at storage level but exposes 404 on repetition.
- Push-token registration never calls users-service and never compares `{userId}` with the JWT subject or resolved
  current user. The documented 404 “user not found” cannot be produced by current code.
- Neither notification-service nor the BFF request class declares validation constraints. BFF `@Valid` is therefore
  ineffective. Null token/platform and malformed enum values produce framework/database/generic errors; platform null
  can reach `.name()` and return 500.
- Page and size are unbounded. Negative page, non-positive size, or excessive size can produce 500 or expensive reads.
  Ordering is `createdAt DESC` without an immutable ID tie-breaker, so equal timestamps can duplicate or omit rows
  across offset pages.
- The response wrapper is `notifications`, `hasNext`, and `nextPage`; it does not expose current page/size. This powers
  current mobile “load more” behavior but does not match the target `items + pageInfo` policy.

Evidence: notification controllers lines 16-80; `UserNotificationService` lines 35-43 and 100-166;
`PushTokenService` lines 37-108; repositories lines 13-41.

## 3. Event and Scheduled Entry Inventory

| Entry               | Exchange / routing key / queue                                                                          | Payload                     | Failure / retry evidence                                  | Status                              |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------- | ----------------------------------- |
| team follow         | `user.follow.exchange` / `team.follow` / `team.follow.queue.notifications`                              | `UserFollowEvent`           | listener exception policy not configured; DLX exists      | `PROVEN` topology / `UNKNOWN` retry |
| pool follow         | `user.follow.exchange` / `pool.follow` / `pool.follow.queue.notifications`                              | `UserFollowEvent`           | same                                                      | `PROVEN` topology / `UNKNOWN` retry |
| match finished      | `entity.lifecycle.exchange` / `match.finished` / `match.finished.queue.notifications`                   | `MatchFinishedEvent`        | durable queue + DLX; no explicit retry/backoff            | `PROVEN` topology / `UNKNOWN` retry |
| live link created   | `entity.lifecycle.exchange` / `match.live-link-created` / `match.live-link-created.queue.notifications` | `MatchLiveLinkCreatedEvent` | durable queue + DLX; no explicit retry/backoff            | `PROVEN` topology / `UNKNOWN` retry |
| Auth0 token refresh | fixed delay from `tokenRefreshDelay`, configured 24h                                                    | no message                  | failures logged and swallowed; prior/blank token retained | `PROVEN`                            |

All consumers use a no-argument `Jackson2JsonMessageConverter`; no shared event schema, version, envelope, event ID,
timestamp, correlation ID, producer revision, or explicit naming configuration exists. Exact deployed event casing and
headers are `UNKNOWN` without captured messages. Java field names are camelCase, but current broker naming must not be
claimed solely from source.

Follow listeners ignore the payload `entityType` and trust the queue routing key; unknown/null `eventType` is silently
ignored. Match listeners pass every field directly into orchestration without shape validation. Queue DLX declarations
do not prove actual dead-lettering because listener requeue/retry settings are not explicit.

## 4. Type Inventory

| Type ID             | Current role                                       | Serialized / persisted      | Duplicate family        | Status   |
| ------------------- | -------------------------------------------------- | --------------------------- | ----------------------- | -------- |
| `N-REST-TOKEN-REQ`  | handwritten register request                       | REST JSON                   | token command           | `PROVEN` |
| `N-REST-PAGE`       | page DTO containing entities                       | REST JSON                   | notification page       | `PROVEN` |
| `N-REST-UNREAD`     | unread DTO                                         | REST JSON                   | unread projection       | `PROVEN` |
| `N-ENTITY-INBOX`    | `UserNotification` JPA entity and direct REST item | DB + JSON                   | notification item       | `PROVEN` |
| `N-ENTITY-TOKEN`    | `PushToken` JPA entity                             | DB only                     | token state             | `PROVEN` |
| `N-ENTITY-FOLLOW`   | `FollowersProjection` JPA entity                   | DB only                     | follow projection       | `PROVEN` |
| `N-ENTITY-SEND`     | `NotificationSend` JPA entity                      | DB only; incomplete mapping | delivery ledger         | `PROVEN` |
| `N-DB-SEND-TYPE`    | Flyway-only `notification_type` column             | DB/native SQL               | delivery type           | `PROVEN` |
| `N-EVENT-FOLLOW`    | copied `UserFollowEvent`                           | Rabbit JSON                 | follow event            | `PROVEN` |
| `N-EVENT-FINISHED`  | copied `MatchFinishedEvent`                        | Rabbit JSON                 | match event             | `PROVEN` |
| `N-EVENT-LIVE`      | copied `MatchLiveLinkCreatedEvent`                 | Rabbit JSON                 | match event             | `PROVEN` |
| `N-DOWNSTREAM-USER` | broad copied users DTO/favorites                   | internal HTTP response      | user copy               | `PROVEN` |
| `N-DOWNSTREAM-TEAM` | broad copied team DTO                              | internal HTTP response      | team copy               | `PROVEN` |
| `N-DOWNSTREAM-POOL` | broad copied pool DTO                              | internal HTTP response      | pool copy               | `PROVEN` |
| `N-APP-RESOLVE`     | tokens-by-user/no-token result                     | internal application DTO    | none                    | `PROVEN` |
| `N-APP-EXPO-MSG`    | provider command plus correlation fields           | mapped to Expo SDK          | Expo message            | `PROVEN` |
| `N-APP-EXPO-RESULT` | aggregated provider result                         | application only            | none                    | `PROVEN` |
| `N-VENDOR-EXPO`     | SDK `PushNotification` and ticket objects          | Expo transport              | provider shapes         | `PROVEN` |
| `N-BFF-BASE`        | copied notification/page DTOs                      | internal HTTP               | notification/page       | `PROVEN` |
| `N-BFF-ENRICHED`    | mobile-facing enriched notification/page           | BFF REST                    | notification/page       | `PROVEN` |
| `N-MOBILE`          | report types, API calls, TanStack views            | mobile runtime              | notification/page/token | `PROVEN` |

There is no explicit API/application/domain/persistence mapping boundary. `UserNotification` is both the JPA model and
REST response item. Other mutable DTOs cross controllers, clients, orchestration, and provider mapping. Mapper inventory:
`NONE`.

## 5. Field-Lineage Matrix

### 5.1 Push-token request and ownership

| Field      | Java/TS         | Current wire      | Target Blockout wire                          | Producer / consumer                                  | Validation / persistence                        | Class                   | Status   |
| ---------- | --------------- | ----------------- | --------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | ----------------------- | -------- |
| user ID    | path `userId`   | path segment      | current-user resource or `userId` if retained | Expo `customUser.id`; BFF/service                    | no subject comparison; DB owner key             | `REQUIRED`              | `PROVEN` |
| Expo token | `expoPushToken` | `expo_push_token` | `expoPushToken`                               | Expo Notifications API; registration/lookup/delivery | required only by DB; no format/blank validation | `REQUIRED`              | `PROVEN` |
| platform   | `platform`      | `platform`        | `platform`                                    | React Native OS mapping; DB enum                     | no request constraint; IOS/ANDROID/WEB/UNKNOWN  | `REQUIRED`              | `PROVEN` |
| device ID  | `deviceId`      | `device_id`       | `deviceId`                                    | Expo Device OS build identifiers                     | optional; partial unique `(userId, deviceId)`   | `REQUIRED` for rotation | `PROVEN` |

The service deliberately reattaches an existing token to the caller-provided user and deletes other rows for the same
user/device. Because the path ID is not bound to the authenticated subject, a caller with the scope can attach a token
they control to another known local user ID and receive that user's future pushes. This is a proven authorization and
privacy gap. Current mobile uses its own ID, but that caller convention is not server enforcement.

The mobile `deviceId` is `Device.osInternalBuildId ?? Device.osBuildId`, which is OS build metadata rather than a proven
installation identifier. Cross-device collisions and unintended token rotation are `INFERRED`; device fixtures are
required. There is no unregister/logout/delete-user cleanup endpoint. Invalid Expo tokens are only deactivated after a
recognized provider error.

### 5.2 Notification inbox entity and REST/BFF/mobile projection

| Field           | Java name    | Current service/BFF wire | Target wire if retained | Producer                   | Proven consumer / persistence                                  | Class                       | Status   |
| --------------- | ------------ | ------------------------ | ----------------------- | -------------------------- | -------------------------------------------------------------- | --------------------------- | -------- |
| id              | `id`         | `id`                     | `id`                    | DB identity                | mobile list key/delete                                         | `REQUIRED`                  | `PROVEN` |
| userId          | `userId`     | `user_id`                | `userId`                | reserved recipient         | DB ownership; no mobile read                                   | `PERSISTENCE_ONLY` on BFF   | `PROVEN` |
| type            | `type`       | `type`                   | `type`                  | pipeline enum              | DB constraint; no mobile behavior                              | `COMPATIBILITY_ONLY` on BFF | `PROVEN` |
| title           | `title`      | `title`                  | `title`                 | pool/fallback content      | mobile card and push                                           | `REQUIRED`                  | `PROVEN` |
| body            | `body`       | `body`                   | `body`                  | team names/score/live copy | mobile card and push                                           | `REQUIRED`                  | `PROVEN` |
| deepLink        | `deepLink`   | `deep_link`              | `deepLink`              | `/match/{id}`              | mobile router on inbox open                                    | `REQUIRED`                  | `PROVEN` |
| targetType      | `targetType` | `target_type`            | `targetType`            | `MATCH`                    | DB index; no mobile read                                       | `PERSISTENCE_ONLY` on BFF   | `PROVEN` |
| targetId        | `targetId`   | `target_id`              | `targetId`              | match ID                   | DB index; no mobile read                                       | `PERSISTENCE_ONLY` on BFF   | `PROVEN` |
| metadata        | `metadata`   | JSON object              | `metadata`              | pipeline                   | BFF extracts `divisionId`; mobile type incorrectly says string | `REQUIRED` for enrichment   | `PROVEN` |
| isRead          | `isRead`     | `is_read`                | `isRead`                | false; mark-read           | unread count/DB; no current mobile mutation/read               | `COMPATIBILITY_ONLY` on BFF | `PROVEN` |
| isOpened        | `isOpened`   | `is_opened`              | `isOpened`              | false; mark-opened         | DB; no current mobile mutation/read                            | `COMPATIBILITY_ONLY` on BFF | `PROVEN` |
| createdAt       | `createdAt`  | `created_at`             | `createdAt`             | application/PrePersist     | sort and mobile relative time                                  | `REQUIRED`                  | `PROVEN` |
| readAt          | `readAt`     | `read_at`                | `readAt`                | mark-read                  | DB; no current mobile read                                     | `PERSISTENCE_ONLY` on BFF   | `PROVEN` |
| openedAt        | `openedAt`   | `opened_at`              | `openedAt`              | mark-opened                | DB; no current mobile read                                     | `PERSISTENCE_ONLY` on BFF   | `PROVEN` |
| divisionLogoUrl | BFF-only     | `division_logo_url`      | `divisionLogoUrl`       | config-service enrichment  | mobile image                                                   | `DERIVED`                   | `PROVEN` |

The metadata tree writes nested key `divisionId` directly. Jackson naming strategies do not rename a `JsonNode` key,
and the BFF explicitly reads `metadata.get("divisionId")`; this nested Blockout key is already camelCase. The mobile
declares `metadata: string | null`, while the actual response is a JSON object. Current UI does not read metadata, so
the mismatch is masked.

Mobile visibly consumes only `id`, `title`, `body`, `deepLink`, `createdAt`, and `divisionLogoUrl`. It does not call the
read/opened endpoints or unread-count endpoint. Therefore current mobile interactions do not change unread state, and
the API method expects `{count}` while the backend returns `{unread}`. External/deployed callers must be inventoried
before reducing these compatibility fields.

### 5.3 Page and unread fields

| Field / parameter | Current wire    | Target contract direction                  | Consumer                                         | Class                     | Status   |
| ----------------- | --------------- | ------------------------------------------ | ------------------------------------------------ | ------------------------- | -------- |
| page query        | `page`          | zero-based `page`                          | BFF/Expo infinite query                          | `REQUIRED`                | `PROVEN` |
| size query        | `size`          | bounded `pageSize`                         | BFF/Expo passes 20                               | `REQUIRED` compatibility  | `PROVEN` |
| notifications     | `notifications` | provisional `items`                        | BFF copies; mobile flattens                      | `REQUIRED`                | `PROVEN` |
| hasNext           | `has_next`      | provisional `pageInfo.hasNext`             | BFF copies; mobile ignores directly              | `REQUIRED`                | `PROVEN` |
| nextPage          | `next_page`     | `nextPage` compatibility or derivation     | TanStack `getNextPageParam`                      | `REQUIRED`                | `PROVEN` |
| unread            | `unread`        | explicit semantic name pending MRG-268/325 | BFF pass-through; mobile wrongly expects `count` | `REQUIRED` contract drift | `PROVEN` |

The current slice uses `createdAt DESC` twice (repository method plus `PageRequest` sort) but no ID tie-breaker. The
target contract must preserve zero-based load-more behavior while adding bounds and deterministic order. Whether
`nextPage` remains or is derived from `pageInfo.page + 1` is a contract decision, not an audit deletion.

### 5.4 Persistence fields

#### `followers_projection`

| Field      | Producer / consumer                          | Constraint / role    | Class              | Status   |
| ---------- | -------------------------------------------- | -------------------- | ------------------ | -------- |
| id         | DB                                           | generated identity   | `PERSISTENCE_ONLY` | `PROVEN` |
| entityType | follow queue routing translated to TEAM/POOL | check + unique/index | `EVENT_ONLY`       | `PROVEN` |
| entityId   | event entity ID                              | recipient selection  | `EVENT_ONLY`       | `PROVEN` |
| userId     | event user ID                                | recipient selection  | `EVENT_ONLY`       | `PROVEN` |
| createdAt  | JPA callback/service builder                 | audit only           | `PERSISTENCE_ONLY` | `PROVEN` |
| lastUpdate | JPA callback/service builder                 | audit only           | `PERSISTENCE_ONLY` | `PROVEN` |

Follow writes are idempotent through precheck plus database uniqueness; duplicate races are swallowed. Deletes are
idempotent. There is no bootstrap/reconciliation against users-service favorites, so missed/expired events can
permanently diverge the recipient projection.

#### `notification_send`

| Field            | Producer / consumer          | Constraint / issue                                             | Class                 | Status   |
| ---------------- | ---------------------------- | -------------------------------------------------------------- | --------------------- | -------- |
| id               | DB                           | generated; no runtime consumer                                 | `PERSISTENCE_ONLY`    | `PROVEN` |
| userId           | native reservation           | typed unique key and status updates                            | `REQUIRED`            | `PROVEN` |
| matchId          | event/native reservation     | typed unique key and status updates                            | `REQUIRED`            | `PROVEN` |
| notificationType | native SQL/Flyway only       | non-null; unique `(userId, matchId, type)`; absent from entity | `REQUIRED`            | `PROVEN` |
| status           | reservation and bulk updates | PENDING/SENT/DELIVERED/FAILED/SENT_NO_TOKEN                    | `REQUIRED`            | `PROVEN` |
| expoTicketId     | never assigned               | nullable legacy field                                          | `REMOVABLE` candidate | `PROVEN` |
| errorCode        | failed update                | constant `EXPO_SEND_ERROR`                                     | `PERSISTENCE_ONLY`    | `PROVEN` |
| errorDetail      | failed update                | constant “See logs for details”                                | `PERSISTENCE_ONLY`    | `PROVEN` |
| sentAt           | sent update                  | null for no-token                                              | `PERSISTENCE_ONLY`    | `PROVEN` |
| deliveredAt      | unused delivered method      | no receipt caller                                              | `PERSISTENCE_ONLY`    | `PROVEN` |
| failedAt         | failed update                | local timestamp                                                | `PERSISTENCE_ONLY`    | `PROVEN` |
| createdAt        | native insert/JPA callback   | local timestamp                                                | `PERSISTENCE_ONLY`    | `PROVEN` |
| lastUpdate       | native insert/bulk updates   | local timestamp                                                | `PERSISTENCE_ONLY`    | `PROVEN` |

Flyway V5 replaced the old `(userId, matchId)` uniqueness with `(userId, matchId, notificationType)`, but the JPA
entity still declares the old unique constraint and has no `notificationType` field. Native reservation uses the real
column, while every JPQL status update filters only `matchId + userIds`. If both notification types exist for the same
match/user, processing either pipeline updates both ledger rows. This is proven cross-type status corruption.

The entity's stale table annotation is not applied because `ddl-auto` is `none`, but it remains misleading structure.
`existsByUserIdAndMatchId` is unused and also ignores type. Ticket IDs are never stored, Expo receipts are never fetched,
and `markDelivered` has no caller.

#### `push_tokens`

| Field         | Producer / consumer           | Constraint / role                | Class                   | Status   |
| ------------- | ----------------------------- | -------------------------------- | ----------------------- | -------- |
| id            | DB                            | generated; dedup keep ID         | `PERSISTENCE_ONLY`      | `PROVEN` |
| userId        | path request/reattachment     | no FK; token resolution owner    | `REQUIRED`              | `PROVEN` |
| expoPushToken | Expo mobile/provider          | globally unique; delivery target | `VENDOR_OWNED`          | `PROVEN` |
| platform      | mobile OS mapping             | DB check                         | `REQUIRED`              | `PROVEN` |
| deviceId      | OS build-derived mobile value | partial unique per user          | `REQUIRED` for rotation | `PROVEN` |
| active        | registration/provider failure | active query filter              | `REQUIRED`              | `PROVEN` |
| createdAt     | JPA/DB default                | audit only                       | `PERSISTENCE_ONLY`      | `PROVEN` |
| lastUpdate    | JPA/DB default                | audit only                       | `PERSISTENCE_ONLY`      | `PROVEN` |

#### `user_notifications`

The 14 fields are listed in section 5.2. Flyway and JPA agree on columns and nullability, except creation time is set by
both DB default and application/JPA. There is no unique event/recipient key, but inbox creation uses only user IDs newly
returned by the typed delivery-ledger reservation. No user FK, retention policy, cleanup job, or account-deletion
consumer exists.

### 5.5 Event fields

| Event     | Field      | Current meaning / consumer                           | Target Blockout wire                        | Class        | Status   |
| --------- | ---------- | ---------------------------------------------------- | ------------------------------------------- | ------------ | -------- |
| follow    | userId     | projected follower                                   | `userId`                                    | `EVENT_ONLY` | `PROVEN` |
| follow    | entityType | producer concept; ignored by queue-specific listener | `entityType`                                | `EVENT_ONLY` | `PROVEN` |
| follow    | entityId   | team/pool ID                                         | `entityId`                                  | `EVENT_ONLY` | `PROVEN` |
| follow    | eventType  | CREATED/DELETED branch                               | `eventType`                                 | `EVENT_ONLY` | `PROVEN` |
| finished  | id         | match ID                                             | provisional `matchId` or compatibility `id` | `EVENT_ONLY` | `PROVEN` |
| finished  | teamIdA    | recipient/content team                               | `teamIdA`                                   | `EVENT_ONLY` | `PROVEN` |
| finished  | teamIdB    | recipient/content team                               | `teamIdB`                                   | `EVENT_ONLY` | `PROVEN` |
| finished  | poolId     | recipient/title/division source                      | `poolId`                                    | `EVENT_ONLY` | `PROVEN` |
| finished  | set        | final-score text                                     | semantic rename decision pending            | `EVENT_ONLY` | `PROVEN` |
| live link | id         | match ID                                             | provisional `matchId` or compatibility `id` | `EVENT_ONLY` | `PROVEN` |
| live link | teamIdA    | recipient/content team                               | `teamIdA`                                   | `EVENT_ONLY` | `PROVEN` |
| live link | teamIdB    | recipient/content team                               | `teamIdB`                                   | `EVENT_ONLY` | `PROVEN` |
| live link | poolId     | recipient/title/division source                      | `poolId`                                    | `EVENT_ONLY` | `PROVEN` |

All fields are copied in matches/users producer and notification consumer modules. Final names, envelopes, versions,
and rollout belong to MRG-302/315/350. The audit does not treat Rabbit payloads as OpenAPI endpoints.

### 5.6 Downstream copied DTO fields

| Copy              | Fields                                                                                                                                 | Fields actually read | Provisional classification                                    | Status   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------- | -------- |
| `CustomUserDTO`   | id, auth0Id, email, pseudo, firstName, lastName, pictureUrl, phoneNumber, active, createdAt, lastUpdate, favorites                     | id only              | id `REQUIRED`; all others `COMPATIBILITY_ONLY` in this client | `PROVEN` |
| `UserFavoriteDTO` | entityType, entityId                                                                                                                   | none                 | `COMPATIBILITY_ONLY`                                          | `PROVEN` |
| `TeamDTO`         | id, clubId, rawName, name, shortName, season, lastUpdate, leagueCode, divisionId, format, gender, followersCount, active               | shortName only       | shortName `REQUIRED`; others `COMPATIBILITY_ONLY` here        | `PROVEN` |
| `PoolDTO`         | id, poolCode, leagueCode, season, leagueName, rawName, name, shortName, divisionId, format, gender, followersCount, active, lastUpdate | name, divisionId     | those two `REQUIRED`; others `COMPATIBILITY_ONLY` here        | `PROVEN` |

Team and pool reads use M2M; `/me` uses the forwarded user JWT. Their manually created `RestTemplate` instances do not
inject the Spring-managed global ObjectMapper, so explicit `@JsonProperty` annotations bridge snake-case team/pool
fields. The broad user copy has no annotations, but only casing-neutral `id` is consumed.

### 5.7 Expo provider and application fields

| Shape / field                | Provider/application role                    | Sent to Expo             | Class          | Status   |
| ---------------------------- | -------------------------------------------- | ------------------------ | -------------- | -------- |
| message `to`                 | Expo push token                              | singleton recipient list | `VENDOR_OWNED` | `PROVEN` |
| message `title`              | rendered pool/fallback title                 | `title`                  | `VENDOR_OWNED` | `PROVEN` |
| message `body`               | rendered match text                          | `body`                   | `VENDOR_OWNED` | `PROVEN` |
| message `data`               | `{url: blockout://match/{id}}`               | `data`                   | `VENDOR_OWNED` | `PROVEN` |
| message `userId`             | ticket correlation                           | no; internal only        | `DERIVED`      | `PROVEN` |
| message `matchId`            | correlation/log context                      | no; internal only        | `DERIVED`      | `PROVEN` |
| batch result `userIdsOk`     | at least one OK ticket per user              | no                       | `DERIVED`      | `PROVEN` |
| batch result `userIdsFailed` | errors and no OK ticket                      | no                       | `DERIVED`      | `PROVEN` |
| batch result `invalidTokens` | message-matched device-not-registered tokens | no                       | `DERIVED`      | `PROVEN` |
| ticket status                | provider OK/ERROR                            | inbound SDK response     | `VENDOR_OWNED` | `PROVEN` |
| ticket message               | provider error text                          | inbound SDK response     | `VENDOR_OWNED` | `PROVEN` |
| details token                | provider detail used for invalidation        | inbound SDK response     | `VENDOR_OWNED` | `PROVEN` |

The service maps its internal DTO to SDK `PushNotification`; `@JsonIgnore` on correlation fields is not the active
transport mechanism. The provider access token is configuration, not a Blockout contract field.

Ticket correlation assumes returned ticket order matches request order. Fewer tickets than messages leave unmatched
users neither OK nor failed, so ledger rows remain PENDING and are never retried. Provider ticket IDs are not captured,
receipts are not polled, and delivery cannot be proven. Invalid-token detection parses English message text rather than
a stable provider error code.

Mobile also contains an unused debug helper that posts raw Expo fields `to`, `sound`, `title`, `body`, and
`data.someData` directly to the provider. It is vendor-owned and must not influence the Blockout source contract.
Production device callbacks consume `data.url` and open it through Expo Linking.

## 6. Orchestration, Mapping, and Conversion Inventory

| ID      | Source → target                          | Mechanism                                   | Loss / mixed logic                                     | Provisional owner                              | Status   |
| ------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | -------- |
| `N-C01` | follow event → projection entity         | listener + service builder/delete           | queue implies entity type; payload type ignored        | event adapter + projection application service | `PROVEN` |
| `N-C02` | match event → resolved content           | remote calls + fallbacks + string rendering | transport, resilience, copy, and product wording mixed | notification content workflow                  | `PROVEN` |
| `N-C03` | follower rows → send ledger              | native INSERT SELECT RETURNING              | DB-specific reservation/idempotency                    | persistence adapter                            | `PROVEN` |
| `N-C04` | reserved users → inbox entities          | manual loop/builder                         | persistence entity is API response                     | application command + inbox mapper             | `PROVEN` |
| `N-C05` | active tokens → messages                 | grouping/hash maps/manual builders          | order unspecified; one message per token               | delivery application workflow                  | `PROVEN` |
| `N-C06` | internal message → Expo SDK              | manual setters                              | provider command embedded in service                   | Expo adapter                                   | `PROVEN` |
| `N-C07` | Expo tickets → user result               | index maps and message parsing              | ticket ID/code/receipts lost                           | Expo adapter result                            | `PROVEN` |
| `N-C08` | provider result → send/token updates     | bulk JPQL                                   | notification type lost in updates                      | typed delivery persistence port                | `PROVEN` |
| `N-C09` | entity page → BFF copied DTO             | Jackson/global snake + annotations          | direct persistence exposure                            | generated internal client + mapper             | `PROVEN` |
| `N-C10` | BFF base → enriched page                 | manual field copy + division fan-out        | cache/fallback logic mixed with projection             | BFF projector                                  | `PROVEN` |
| `N-C11` | BFF response → Expo                      | global deep camel conversion                | implicit casing and wrong metadata/unread types        | mobile-local generated client                  | `PROVEN` |
| `N-C12` | device/provider token → register request | handwritten Expo utility/hook               | OS build metadata used as device identity              | mobile notification module                     | `PROVEN` |

## 7. Delivery Consistency, Retry, and Pagination

The event pipeline resolves remote content before reservation, reserves recipients in one transaction, saves inbox rows
in another, resolves tokens in 2,000-user pages, sends messages in 100-message batches, and then updates ledger/token
state. This creates several irreversible gaps:

1. a crash after reservation but before inbox/push makes redelivery reserve zero recipients and stop;
2. a crash after inbox creation but before push also cannot resume;
3. per-batch failures mark users failed, but event redelivery cannot retry typed reservations;
4. a partial ticket list leaves PENDING rows with no recovery worker;
5. status updates can overwrite the other notification type for the same user/match;
6. no-token is terminal `SENT_NO_TOKEN`, even if a token is registered later;
7. there is no receipt processing despite DELIVERED fields/methods.

Recipient ordering is not defined: native `RETURNING`, hash-map grouping, token repository reads, and Expo batching have
no stable order. Order is not user-visible, but deterministic batching and retry correlation require explicit later
policy.

Inbox pagination is a separate offset slice. It supplies `hasNext` and `nextPage`, but lacks bounds and stable tie-break.
The BFF performs one config lookup per distinct uncached `divisionId`, sequentially. `ConfigClientService` is already
cacheable, while `NotificationService` adds an unbounded `ConcurrentHashMap` with no expiry/invalidation.

`ConcurrentHashMap` forbids null values. Both the missing-logo path `put(id, null)` and failed-lookup fallback
`putIfAbsent(id, null)` throw `NullPointerException`, so a division without a logo or a config failure can turn an
otherwise valid notification page into 500 instead of returning a null logo. This is proven code behavior; production
frequency is `UNKNOWN`.

## 8. Duplicate-Type Analysis

| Family                 | Members                                           | Difference / drift                                              | Provisional disposition                                          | Status   |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| notification item      | JPA entity, BFF base, BFF enriched, Expo type     | BFF adds logo; Expo metadata type wrong; many unused fields     | generated internal response → BFF projection → mobile view model | `PROVEN` |
| notification page      | service, BFF base/enriched, Expo page             | current wrapper copied three times                              | role-owned generated PageResponses                               | `PROVEN` |
| unread response        | service/BFF `{unread}`, Expo `{count}`            | semantic mismatch hidden by no caller                           | one explicit BFF contract                                        | `PROVEN` |
| token request/platform | service, BFF, Expo copies                         | no validation; same values                                      | generated command/shared enum where justified                    | `PROVEN` |
| match events           | matches producer and notification consumer copies | same current fields                                             | one selected event source, not REST schema                       | `PROVEN` |
| follow event/enums     | users/teams/pools/notification copies             | same current fields; queue listener ignores entity type         | one selected event source                                        | `PROVEN` |
| team/pool/user clients | broad copied service DTOs                         | notification uses only 1-2 fields                               | generated clients mapped to narrow application views             | `PROVEN` |
| status/type enums      | persistence, event, mobile copies                 | mobile type omits `MATCH_LIVE_LINK_CREATED`; field typed string | shared contract enums only after ownership decision              | `PROVEN` |

The mobile `PushToken` interface exposes the full persistence-shaped token record even though no endpoint returns it.
It is a removable local compatibility artifact after MRG-267 confirms no external generator/caller dependency.

## 9. Validation, Error, Auth, and Compatibility Behavior

| Boundary            | Current behavior                                              | Gap / compatibility dependency                          | Status   |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| inbox auth          | scope plus forwarded `/me` lookup                             | one extra service call per operation                    | `PROVEN` |
| inbox ownership     | repository filters resolved user ID                           | repeated mark returns 404                               | `PROVEN` |
| token auth          | scope only; caller controls user ID                           | token/user hijack and privacy risk                      | `PROVEN` |
| token body          | no effective validation                                       | null/blank/invalid values become 500/framework errors   | `PROVEN` |
| pagination          | unbounded page/size; no tie-break                             | unstable/expensive pages                                | `PROVEN` |
| downstream content  | pool/team exceptions use French fallbacks                     | partial content is intentional current behavior         | `PROVEN` |
| M2M startup/refresh | refresh failure swallowed; blank/stale token retained         | event content falls back after downstream 401           | `PROVEN` |
| event validation    | none                                                          | null/mismatched payloads can fail/requeue or be ignored | `PROVEN` |
| Expo batch          | errors converted to failed-user result                        | no stable code/receipt/retry                            | `PROVEN` |
| errors              | five-field ad hoc map                                         | no stable code/Problem Details                          | `PROVEN` |
| casing              | global snake REST, copied annotations, mobile deep transforms | nested metadata already camelCase                       | `PROVEN` |

`Auth0TokenManager.refreshToken` catches its own failure, so `@PostConstruct` cannot fail closed as its outer try/catch
suggests. The fixed 24-hour schedule does not check token expiry before use. Configuration also contains unused
`AUTH0_DEFAULT_ROLE_ID` and an unconfigured `api.expo` endpoint object; Expo delivery actually uses the SDK plus
`EXPO_PUSH_ACCESS_TOKEN`.

No account-deletion event cleans notification inbox rows, delivery ledger rows, follower projections, or push tokens.
This completes the retention gap noted by MRG-258: the current “delete all account data” UX is not proven for
notification-service.

## 10. BFF and Mobile Call Graph

| Workflow       | Calls / fan-out                                                        | State / visible purpose                      | Failure / drift                                         | Status   |
| -------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- | -------- |
| list           | Expo → BFF → notification `/me` lookup + DB; BFF → config per division | TanStack infinite list; title/body/time/logo | unstable page; null-cache NPE; sequential fan-out       | `PROVEN` |
| delete         | Expo optimistic delete → BFF → service `/me` + DB                      | removes card; rollback/refetch on error      | unread query invalidation commented out                 | `PROVEN` |
| open           | local router uses `deepLink`                                           | navigates to match                           | does not call read/opened                               | `PROVEN` |
| unread         | handwritten API exists                                                 | no proven UI purpose                         | client expects wrong field name                         | `PROVEN` |
| token register | session/onboarding → provider permission/token → BFF/service DB        | enables pushes                               | user path not server-bound; errors swallowed by callers | `PROVEN` |
| push receive   | Expo provider callback `data.url` → Linking                            | opens match deep link, optionally after ad   | vendor callback only                                    | `PROVEN` |

The normal session path uses `useRegisterPushToken` correctly. The onboarding utility calls `useApis()` inside a plain
async function invoked from an event callback, violating React hook rules; the caller swallows errors. Device-level
evidence is needed to confirm how often onboarding registration fails. Session registration remains a separate proven
path after authentication/onboarding.

TanStack Query remains mobile-owned. Current list and optimistic-delete behavior, query keys, stale time, UI states,
provider permission prompts, navigation, and haptics remain handwritten mobile concerns. Orval should later generate
mobile-local BFF transport and contract schemas without creating a shared TanStack library.

## 11. Test and Parity Evidence

| Area             | Existing evidence            | Missing parity evidence for migration                                           | Status             |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| service startup  | one context-load test        | real Postgres/Flyway/Rabbit/Auth0/Expo dependencies                             | `PROVEN`           |
| REST             | source only                  | auth, ownership, validation, errors, idempotency, casing, pagination            | `PROVEN`           |
| persistence      | migrations/repositories only | typed ledger mapping, concurrent reservation, cleanup, stable page              | `PROVEN`           |
| events           | topology/listener source     | captured casing/headers, retry/DLQ, duplicates, crash recovery                  | `PROVEN`           |
| Expo             | SDK source integration only  | ticket ordering/partial tickets/codes/receipts/invalid tokens                   | `PROVEN`           |
| BFF              | source only                  | null-logo/config failure, cache invalidation, fan-out, error parity             | `PROVEN`           |
| mobile           | source only                  | Android/iOS permission/token lifecycle, onboarding hook, deep links, read state | `PROVEN`           |
| deletion/privacy | no cleanup path              | account deletion and token/inbox retention fixture                              | `UNKNOWN` behavior |

No tests were added because MRG-260 is a read-only audit. Later migration must add behavioral fixtures before replacing
entities, DTOs, clients, event payloads, casing bridges, or provider adapters.

## 12. Findings and Provisional Target Roles

| ID          | Finding / risk                                                                           | Follow-up                        | Status           |
| ----------- | ---------------------------------------------------------------------------------------- | -------------------------------- | ---------------- |
| `NOTIF-F01` | REST page directly exposes JPA `UserNotification` entities                               | MRG-268/325/410                  | `PROVEN`         |
| `NOTIF-F02` | no mapper separates REST, application, persistence, event, BFF, or Expo roles            | MRG-268/410/414                  | `PROVEN`         |
| `NOTIF-F03` | token registration trusts caller-controlled user ID and can reattach tokens across users | security/current-user contract   | `PROVEN`         |
| `NOTIF-F04` | request validation is absent despite BFF `@Valid`                                        | MRG-325/341/410                  | `PROVEN`         |
| `NOTIF-F05` | notification page is unbounded and lacks stable ID tie-breaker                           | pagination migration             | `PROVEN`         |
| `NOTIF-F06` | mobile never marks read/opened and unread response expects the wrong field               | MRG-264/267/327                  | `PROVEN`         |
| `NOTIF-F07` | Flyway owns `notification_type`, but entity/JPQL updates omit it                         | MRG-268/410/420                  | `PROVEN`         |
| `NOTIF-F08` | status updates for one type overwrite all types for the same match/user                  | urgent typed-ledger parity slice | `PROVEN`         |
| `NOTIF-F09` | reservation idempotency prevents recovery after crash/partial failure                    | delivery/outbox/retry decision   | `PROVEN`         |
| `NOTIF-F10` | partial Expo ticket lists leave PENDING rows without retry                               | Expo adapter parity              | `PROVEN`         |
| `NOTIF-F11` | receipts/ticket IDs/delivery state are modeled but never processed                       | MRG-267/268/410                  | `PROVEN`         |
| `NOTIF-F12` | provider invalid-token detection parses message text                                     | Expo adapter hardening           | `PROVEN`         |
| `NOTIF-F13` | follower projection has no bootstrap/reconciliation                                      | event consistency decision       | `PROVEN`         |
| `NOTIF-F14` | BFF null-logo/error fallback writes null to `ConcurrentHashMap` and throws               | MRG-264/414                      | `PROVEN`         |
| `NOTIF-F15` | BFF performs sequential per-division enrichment with duplicate cache layers              | MRG-264/414                      | `PROVEN`         |
| `NOTIF-F16` | mobile metadata type is string while wire data is an object                              | generated BFF schema/client      | `PROVEN`         |
| `NOTIF-F17` | mobile enum omits live-link type, masked by string typing                                | shared enum/consumer migration   | `PROVEN`         |
| `NOTIF-F18` | onboarding token helper invokes a hook outside React render/hook context                 | MRG-501/502                      | `PROVEN`         |
| `NOTIF-F19` | notification data/tokens survive account deletion; no retention policy exists            | privacy/deletion plan            | `PROVEN` absence |
| `NOTIF-F20` | global snake casing, copied annotations/DTOs, and deep mobile transforms hide boundaries | MRG-303/304/351-354              | `PROVEN`         |

| Current type / behavior | Provisional target role                         | Keep / split / map / retire | Preconditions / owner                  |
| ----------------------- | ----------------------------------------------- | --------------------------- | -------------------------------------- |
| inbox entity            | JPA entity behind application notification view | split/map                   | MRG-268, Flyway unchanged              |
| notification REST       | generated internal PageResponse/commands        | replace boundary only       | MRG-325/341 parity                     |
| token request/state     | current-user command + token persistence entity | split/map                   | auth/token lifecycle decision          |
| follower projection     | event-derived persistence projection            | keep behind event adapter   | bootstrap/reconciliation policy        |
| send ledger             | typed delivery-attempt entity/port              | align/map                   | migration/entity reconciliation        |
| match/follow events     | generated/typed event payloads                  | consolidate separately      | MRG-302/315/350                        |
| team/pool/user copies   | generated clients → narrow application inputs   | retire/map                  | downstream contract migration          |
| Expo message/ticket     | vendor adapter command/result                   | contain/map                 | stable provider error/receipt strategy |
| BFF base copies         | generated notification client                   | retire/map                  | MRG-341/413                            |
| enriched BFF item       | generated BFF projection                        | keep required UI fields     | MRG-264/267/327/414                    |
| Expo transport          | mobile-local Orval client/schema                | replace transport only      | MRG-313/328/347/503                    |
| TanStack/view state     | mobile application module                       | keep mobile-local           | preserve query/UI behavior             |

## 13. Unknowns and Completion

| Unknown                                                                               | Required evidence                                    | Blocking later work     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| exact Rabbit wire casing, headers, requeue, and DLQ behavior                          | captured messages plus broker/listener configuration | MRG-302/315/350         |
| production divergence among favorites, follower projection, ledger, inbox, and tokens | safe cross-store inventory                           | consistency/cutover     |
| deployed external callers of unread/read/opened and response fields                   | access logs and client version inventory             | contract reduction      |
| supported page sizes and same-timestamp behavior                                      | product limits and DB fixture                        | target pagination       |
| Expo ticket ordering, codes, receipts, and partial responses                          | safe provider integration fixture                    | Expo adapter migration  |
| token ownership across login/logout/account switch/delete                             | device/auth lifecycle fixtures and privacy policy    | token contract/security |
| OS-build-derived device ID collision rate                                             | Android/iOS multi-device fixtures                    | token rotation          |
| notification/data retention requirements                                              | product/legal decision and production inventory      | deletion architecture   |
| desired crash retry/idempotency semantics                                             | architecture decision with failure fixtures          | MRG-268/410             |

- [x] All six REST operations, security rules, request/response fields, errors, and callers are inventoried.
- [x] All four entities, Flyway-only fields, repositories, constraints, direct persistence exposure, and lifecycle fields
      are traced.
- [x] All four Rabbit entries and every event field, producer/consumer, topology, retry unknown, and casing limitation are
      explicit.
- [x] Token registration, ownership, rotation, deactivation, device identity, missing cleanup, and privacy risks are
      explicit.
- [x] Expo command/result/vendor fields, batching, ticket aggregation, invalidation, missing receipts, and failure gaps
      are separated from Blockout contracts.
- [x] BFF copying/enrichment, fan-out, cache behavior, null fallback, and every proven mobile field consumer are traced.
- [x] Pagination, TanStack infinite state, optimistic delete, unread/read/opened drift, and future mobile-local Orval
      ownership are explicit.
- [x] Current snake_case, nested camelCase metadata, target camelCase, annotations, and conversion boundaries are
      recorded.
- [x] Existing tests, missing parity evidence, provisional target roles, unknowns, and downstream owners are explicit.
- [x] No runtime, contract, generated artifact, migration, test, configuration, or deployment file changed.

MRG-263/264 must consolidate BFF auth, copied clients, enrichment, unread/read/opened, and token workflows. MRG-267/268
must approve field retention, typed delivery state, token ownership, privacy cleanup, retry, event, persistence, and
mapper roles. MRG-301/302/303/304/315/325 must define authoritative REST/event contracts and rollout. MRG-341/347/350/
410/413/414 must migrate generated clients, mobile transport, events, Java boundaries, and Expo adapters with parity.
MRG-351-354 must remove Blockout-only naming annotations and case transforms only after every caller is cut over.
TanStack and Orval remain Expo-owned. Production deployment did not occur.
