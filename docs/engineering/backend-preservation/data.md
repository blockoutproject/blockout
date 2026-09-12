# Data inputs for the rebuilt capabilities

Companion to the [baseline](../backend-preservation-baseline.md), at the same inspected revision. **All old local business rows may be deleted. No match, favorite, live link, notification, profile or history is to be migrated.** This inventory describes information the replacement must be able to produce and use for new data. It is not a retention plan.

The 18 tables and 198 columns below document the current implementation, not a required target schema. Groups apply the same purpose and classification to each named field. Source links carry types, defaults, nullability and constraints. Fields can be renamed, regrouped, calculated differently or removed once the corresponding future capability is specified. No database contents or personal records were exported.

Classes: **A** owned business state, **P** provider input, **D** derived value/projection, **T** technical metadata. The only mandatory existing-data continuity is outside these tables: **Auth0 accounts and their RevenueCat paid entitlements**. Local users are recreated on login. Divisions/mappings and other startup prerequisites are new bootstrap inputs, not an obligation to retain their old rows.

## Relational data for the replacement

### clubs

Owner: `clubs-service`. [ClubEntity](../../../apps/backend/clubs-service/src/main/java/com/blockout/clubs/club/infrastructure/persistence/entities/ClubEntity.java) · [migration source](../../../apps/backend/clubs-service/src/main/resources/db/migration).

Identity / relationships: String FFVB club identifier is the primary key; teams refer to it across databases.

Consumers: J03 club information, teams/maps, gateway logo fallback, search and ingestion.

| Fields                             | Observed meaning / future functional input                                                                          | Class |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                               | Provider club identity and foreign reference.                                                                       | P/A   |
| `raw_name`                         | Provider label used in parsing/reconciliation.                                                                      | P     |
| `name`                             | Normalized/editor-writable display name.                                                                            | P/A   |
| `address`, `city`, `postal_code`   | Provider/editor location, displayed address and geocoding input.                                                    | P/A   |
| `email`, `phone_number`, `website` | Provider/editor contact actions.                                                                                    | P/A   |
| `latitude`, `longitude`            | Owner geocoding result used by club and pool maps.                                                                  | D     |
| `logo_url`                         | Uploaded club media URL; inherited by teams without their own logo.                                                 | A     |
| `active`                           | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`        | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### teams

Owner: `teams-service`. [TeamEntity](../../../apps/backend/teams-service/src/main/java/com/blockout/teams/team/infrastructure/persistence/entities/TeamEntity.java) · [migration source](../../../apps/backend/teams-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(club_id, division_id, format, gender, raw_name, season)` after V2. League is not in that uniqueness constraint. No cross-database FK.

Consumers: J02–J04 feeds, search, details, favorites, rankings and notification enrichment.

| Fields                                      | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                                        | Internal identity in favorites, matches, associations, events and links.                                            | A     |
| `club_id`, `division_id`                    | Parent club and classification references.                                                                          | A/P   |
| `raw_name`                                  | Provider team label participating in uniqueness.                                                                    | P/A   |
| `name`, `short_name`                        | Normalized/editor display names.                                                                                    | D/A   |
| `league_code`, `season`, `format`, `gender` | Competition context, identity/filter values (SIX/FOUR/TWO and M/F/O).                                               | P/A   |
| `logo_url`                                  | Team-specific uploaded logo, otherwise gateway club fallback.                                                       | A     |
| `followers_count`                           | Denormalized count changed by user follow HTTP commands.                                                            | D     |
| `active`                                    | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`                 | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### pools

Owner: `pools-service`. [PoolEntity](../../../apps/backend/pools-service/src/main/java/com/blockout/pools/pool/infrastructure/persistence/entities/PoolEntity.java) · [migration source](../../../apps/backend/pools-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(pool_code, league_code, season)`. Division reference crosses databases.

Consumers: J02–J04 feeds, ranking, map, favorites, search and FFVB PDF context.

| Fields                               | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                                 | Internal relationship, favorite, event and navigation identity.                                                     | A     |
| `pool_code`, `league_code`, `season` | Provider pool identity and season, used to build provider requests.                                                 | P/A   |
| `division_id`                        | Mapped division classification.                                                                                     | A     |
| `league_name`, `raw_name`            | Provider organization and pool labels.                                                                              | P     |
| `name`, `short_name`                 | Normalized/editor display labels.                                                                                   | D/A   |
| `format`, `gender`                   | Filter/classification values.                                                                                       | A/P   |
| `followers_count`                    | Denormalized follower total.                                                                                        | D     |
| `active`                             | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`          | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### competition_association

Owner: `competition-service`. [CompetitionAssociationEntity](../../../apps/backend/competition-service/src/main/java/com/blockout/competitions/association/infrastructure/persistence/entities/CompetitionAssociationEntity.java) · [migration source](../../../apps/backend/competition-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(pool_id, team_id)`; pool/team/club references cross owner databases. A team may participate in multiple pools.

Consumers: J02–J03 team pool context and rankings; scraper reconciliation; deactivation cascades.

| Fields                                                                                                                               | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                                                                                                                                 | Association row identity.                                                                                           | A     |
| `pool_id`, `team_id`, `club_id`                                                                                                      | Pool participation and denormalized club reference for cascade cleanup.                                             | A/P   |
| `points`, `points_penalty`                                                                                                           | Competition points and penalty affecting ordering.                                                                  | P/D   |
| `played`, `wins`, `losses`                                                                                                           | Participation and win/loss totals.                                                                                  | P/D   |
| `wins_three_to_zero`, `wins_three_to_one`, `wins_three_to_two`, `losses_zero_to_three`, `losses_one_to_three`, `losses_two_to_three` | Detailed match outcome totals in owner/stat contracts; direct rendering of every breakdown is not established.      | P/D   |
| `won_sets`, `lost_sets`, `won_points`, `lost_points`                                                                                 | Set and rally totals underlying ranking and coefficients.                                                           | P/D   |
| `coef_points`, `coef_sets`                                                                                                           | Tie-break ratios; scraper uses 1000 when divisor is zero.                                                           | D     |
| `active`                                                                                                                             | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`                                                                                                          | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### matches

Owner: `matches-service`. [MatchEntity](../../../apps/backend/matches-service/src/main/java/com/blockout/matches/match/infrastructure/persistence/entities/MatchEntity.java) · [migration source](../../../apps/backend/matches-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(match_code, league_code, season)`; pool and both teams are external owner references. V3 converts date/timestamps using Europe/Paris.

Consumers: J02–J03 feeds, details, score/sets, FFVB PDF, live links; notification events.

| Fields                                     | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                                       | Internal match identity in URLs, inbox and delivery deduplication.                                                  | A     |
| `match_code`, `league_code`, `season`      | Provider match identity and competition scope.                                                                      | P/A   |
| `pool_id`, `team_id_a`, `team_id_b`        | Pool and ordered opponents (A/B aligns with scores).                                                                | P/A   |
| `match_date`                               | Scheduled instant; provider date parsing, Paris day grouping and publish window.                                    | P/A   |
| `live_code`                                | Official LNV live identifier, separate from community live links.                                                   | P     |
| `score`, `set`                             | Serialized per-set points and set result; null set drives upcoming status at creation.                              | P     |
| `first_referee`, `second_referee`, `venue` | Official details shown in match information and carried in contracts.                                               | P     |
| `status`                                   | UPCOMING/FINISHED lifecycle; owner infers from set on create and updates forward.                                   | A/D   |
| `active`                                   | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`                | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### match_live_links

Owner: `matches-service`. [MatchLiveLinkEntity](../../../apps/backend/matches-service/src/main/java/com/blockout/matches/match/infrastructure/persistence/entities/MatchLiveLinkEntity.java) · [migration source](../../../apps/backend/matches-service/src/main/resources/db/migration).

Identity / relationships: Generated version ID; local FK match_id with cascade delete. No SQL unique constraint enforcing a single ACTIVE link. Owner is an Auth0 subject.

Consumers: J05 current live, history, quotas, moderation, notification event.

| Fields                      | Observed meaning / future functional input                           | Class |
| --------------------------- | -------------------------------------------------------------------- | ----- |
| `id`, `match_id`            | Link version and target match.                                       | A     |
| `owner_auth0_id`            | Owner permission and quota identity.                                 | A     |
| `provider`, `url`           | Community YouTube/Twitch/Facebook link (not the official live_code). | A     |
| `status`                    | ACTIVE/DEACTIVATED/BANNED/EXPIRED/PENDING/REJECTED workflow.         | A     |
| `report_count`              | Count derived from distinct reporter records; moderation thresholds. | D     |
| `created_at`, `last_update` | Version history and per-match/per-day quota evidence.                | A/T   |

### match_live_link_reports

Owner: `matches-service`. [MatchLiveLinkReportEntity](../../../apps/backend/matches-service/src/main/java/com/blockout/matches/match/infrastructure/persistence/entities/MatchLiveLinkReportEntity.java) · [migration source](../../../apps/backend/matches-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; FK live_link_id with cascade delete; unique `(live_link_id, reporter_auth0_id)`.

Consumers: J05 report deduplication and auto-ban; reason retained even if not rendered.

| Fields               | Observed meaning / future functional input                | Class |
| -------------------- | --------------------------------------------------------- | ----- |
| `id`, `live_link_id` | Report record and precise link version.                   | A     |
| `reporter_auth0_id`  | Distinct reporter identity, prevents duplicate votes.     | A     |
| `reason`             | User-supplied report reason; no direct UI display proven. | A     |
| `created_at`         | Report timing/history.                                    | A/T   |

### users

Owner: `users-service`. [UserEntity](../../../apps/backend/users-service/src/main/java/com/blockout/users/user/infrastructure/persistence/entities/UserEntity.java) · [migration source](../../../apps/backend/users-service/src/main/resources/db/migration).

Identity / relationships: Generated local ID; unique auth0_id, email and pseudo. Runtime case-insensitive checks add behavior to SQL constraints. Current DB stores subject without issuer.

Consumers: J01 session recreation, J04 favorites/inbox/device links, J05 account age, J06 profile and J07 subscription identity boundary.

| Fields                                    | Observed meaning / future functional input                                                                         | Class |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| `id`                                      | Business user identity in favorites, notifications and push registration.                                          | A     |
| `auth0_id`                                | External Auth0 subject; mobile independently passes its Auth0 sub to RevenueCat.                                   | A     |
| `email`                                   | Synchronized Auth0 profile field, local uniqueness and current account-link lookup.                                | A     |
| `first_name`, `last_name`, `phone_number` | Auth0-synchronized profile fields carried by user responses; current editable request exposes pseudo/picture only. | A     |
| `pseudo`                                  | Locally generated/custom display handle, unique.                                                                   | A     |
| `picture_url`                             | Auth0-provided or uploaded profile media URL.                                                                      | A     |
| `active`                                  | Business account lifecycle, independent from subscription entitlement.                                             | A     |
| `created_at`                              | Local account age, checked for seven-day live-link eligibility.                                                    | A/T   |
| `last_update`                             | Local profile synchronization timestamp.                                                                           | T     |

### user_favorites

Owner: `users-service`. [UserFavoriteEntity](../../../apps/backend/users-service/src/main/java/com/blockout/users/user/infrastructure/persistence/entities/UserFavoriteEntity.java) · [migration source](../../../apps/backend/users-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; FK to local users; unique `(user_id, entity_type, entity_id)`; TEAM/POOL target references cross databases.

Consumers: J02 followed feed, J04 followed lists/counters/notification audience.

| Fields                                      | Observed meaning / future functional input                             | Class |
| ------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| `id`, `user_id`, `entity_id`, `entity_type` | Authoritative user-to-team/pool follow relation.                       | A     |
| `created_at`                                | Follow timing; ordering/history evidence, direct rendering not proven. | A/T   |

### followers_projection

Owner: `notification-service`. [FollowersProjectionEntity](../../../apps/backend/notification-service/src/main/java/com/blockout/notifications/notification/infrastructure/persistence/entities/FollowersProjectionEntity.java) · [migration source](../../../apps/backend/notification-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(entity_type, entity_id, user_id)`, no cross-database FK.

Consumers: J04 match-notification recipient lookup from favorite events.

| Fields                                      | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `entity_type`, `entity_id`, `user_id` | Materialized favorite audience.                                                                                     | D     |
| `created_at`, `last_update`                 | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### notification_send

Owner: `notification-service`. [NotificationSendEntity](../../../apps/backend/notification-service/src/main/java/com/blockout/notifications/notification/infrastructure/persistence/entities/NotificationSendEntity.java) · [migration source](../../../apps/backend/notification-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(user_id, match_id, notification_type)` after V5.

Consumers: J04 push deduplication and delivery monitoring, not subscription state.

| Fields                                           | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `user_id`, `match_id`, `notification_type` | Delivery reservation and event-type deduplication key.                                                              | D/T   |
| `status`                                         | PENDING/SENT/DELIVERED/FAILED/SENT_NO_TOKEN.                                                                        | T     |
| `expo_ticket_id`                                 | Expo handoff ticket; not proof that a device received/opened notification.                                          | T     |
| `error_code`, `error_detail`                     | Provider failure diagnostics; may contain sensitive details.                                                        | T     |
| `sent_at`, `delivered_at`, `failed_at`           | Delivery lifecycle timings; receipt/retry path not established.                                                     | T     |
| `created_at`, `last_update`                      | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### user_notifications

Owner: `notification-service`. [UserNotificationEntity](../../../apps/backend/notification-service/src/main/java/com/blockout/notifications/notification/infrastructure/persistence/entities/UserNotificationEntity.java) · [migration source](../../../apps/backend/notification-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; user/target numeric IDs without cross-owner FK. Ordered index `(user_id, created_at DESC)`.

Consumers: J04 inbox, badge, read/open state, deep-link destination.

| Fields                                         | Observed meaning / future functional input                                                                                                               | Class |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `user_id`                                | Inbox item and recipient identity.                                                                                                                       | A/D   |
| `type`, `title`, `body`                        | Rendered notification kind and content snapshot.                                                                                                         | D/A   |
| `deep_link`, `target_type`, `target_id`        | Navigation destination (MATCH/other declared target enum); resource binding.                                                                             | D/A   |
| `metadata`                                     | JSONB enrichment: the inspected match-event producer sets divisionId, used by gateway logo enrichment. Other generic keys are not constrained by the DB. | D     |
| `is_read`, `is_opened`, `read_at`, `opened_at` | Distinct user interaction state and timestamps.                                                                                                          | A     |
| `created_at`                                   | Inbox chronological order.                                                                                                                               | A/T   |

### push_tokens

Owner: `notification-service`. [PushTokenEntity](../../../apps/backend/notification-service/src/main/java/com/blockout/notifications/notification/infrastructure/persistence/entities/PushTokenEntity.java) · [migration source](../../../apps/backend/notification-service/src/main/resources/db/migration).

Identity / relationships: Unique expo_push_token; partial unique `(user_id, device_id)` when device_id exists.

Consumers: J04 Expo delivery and device/account switching.

| Fields                                     | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `user_id`                            | Local device-registration row and owner.                                                                            | A/T   |
| `expo_push_token`, `platform`, `device_id` | Device delivery address, platform and installation identity.                                                        | A/T   |
| `active`                                   | Delivery enablement/invalidation state.                                                                             | A/T   |
| `created_at`, `last_update`                | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### division

Owner: `config-service`. [DivisionEntity](../../../apps/backend/config-service/src/main/java/com/blockout/config/division/infrastructure/persistence/entities/DivisionEntity.java) · [migration source](../../../apps/backend/config-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique name; referenced by mappings, teams and pools.

Consumers: J03 styling/classification, J08 division administration and search enrichment.

| Fields                                                                                | Observed meaning / future functional input                                                                          | Class |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `name`                                                                          | Curated classification identity/display label.                                                                      | A     |
| `main_color`, `first_gradient_color`, `second_gradient_color`, `third_gradient_color` | Curated mobile appearance.                                                                                          | A     |
| `logo_url`                                                                            | Uploaded division asset.                                                                                            | A     |
| `active`                                                                              | Lifecycle filter; reactivation/deactivation affects visibility and downstream projections.                          | A     |
| `created_at`, `last_update`                                                           | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### raw_division_mapping

Owner: `config-service`. [RawDivisionMappingEntity](../../../apps/backend/config-service/src/main/java/com/blockout/config/rawdivisionmapping/infrastructure/persistence/entities/RawDivisionMappingEntity.java) · [migration source](../../../apps/backend/config-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; unique `(raw_division_name, league_code, season)`; division_id nullable pending classification.

Consumers: J08 mapping admin; prerequisite for scraper pool/team creation.

| Fields                                       | Observed meaning / future functional input                                                                          | Class |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`                                         | Mapping row identity.                                                                                               | A     |
| `raw_division_name`, `league_code`, `season` | Observed provider classification key.                                                                               | P     |
| `division_id`, `format`, `gender`            | Manual resolved classification; all three required by scraper is_mapped.                                            | A     |
| `created_at`, `last_update`                  | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### scraper_status

Owner: `config-service`. [ScraperStatusEntity](../../../apps/backend/config-service/src/main/java/com/blockout/config/scraperstatus/infrastructure/persistence/entities/ScraperStatusEntity.java) · [migration source](../../../apps/backend/config-service/src/main/resources/db/migration).

Identity / relationships: Unique name enum SCRAPER/SCRAPER_CLUBS; ID generated.

Consumers: J08 enable/disable controls and scheduler gate.

| Fields        | Observed meaning / future functional input                     | Class |
| ------------- | -------------------------------------------------------------- | ----- |
| `id`, `name`  | Control identity for competition and club ingestion.           | A     |
| `enabled`     | Operator decision to run ingestion.                            | A     |
| `last_update` | Control update time, not per-source successful data freshness. | T     |

### legal_documents

Owner: `config-service`. [LegalDocumentEntity](../../../apps/backend/config-service/src/main/java/com/blockout/config/legaldocument/infrastructure/persistence/entities/LegalDocumentEntity.java) · [migration source](../../../apps/backend/config-service/src/main/resources/db/migration).

Identity / relationships: Generated serial ID; unique type.

Consumers: J06 legal/privacy sheets and administration update route.

| Fields                        | Observed meaning / future functional input                                                                          | Class |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `id`, `type`                  | Legal document identity/type.                                                                                       | A     |
| `title`, `version`, `content` | Curated title/version/Markdown legal content.                                                                       | A     |
| `created_at`, `last_update`   | Owner insertion/update timestamps; response metadata and operational inspection, not an import-completeness ledger. | T     |

### app_status

Owner: `config-service`. [AppStatusEntity](../../../apps/backend/config-service/src/main/java/com/blockout/config/appstatus/infrastructure/persistence/entities/AppStatusEntity.java) · [migration source](../../../apps/backend/config-service/src/main/resources/db/migration).

Identity / relationships: Generated ID; logical current status chosen by application, no single-row SQL constraint.

Consumers: J01 app gates and J08 operator controls.

| Fields                                                                                                 | Observed meaning / future functional input                       | Class |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----- |
| `id`                                                                                                   | Current status row identity.                                     | T     |
| `maintenance`, `message`, `image_url`                                                                  | Maintenance switch, user explanation and image asset.            | A     |
| `min_version_ios`, `min_version_android`, `store_url_ios`, `store_url_android`, `force_update_message` | Platform version gates, store targets and forced-update content. | A     |
| `last_update`                                                                                          | Operator change timestamp (TIMESTAMPTZ).                         | T     |

## Provider observation records

All values below describe newly fetched observations. They are transient provider input, not a requirement to archive or migrate historical payloads. Domain write candidates are covered by the relational field inventory above and [domain records](../../../apps/backend/competition-scraper/scraper/domain/models.py).

| Record               | Fields                                                                                                                                                                                                                                                | Consumer / role                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| FfvbLeagueSource     | code, name, url                                                                                                                                                                                                                                       | Discovery scope and provider navigation.                                                                                                        |
| FfvbPoolSource       | code, name, raw_division_name, season, url                                                                                                                                                                                                            | Mapping resolution, pool identity and calendar fetch.                                                                                           |
| FfvbCalendarMatch    | league_code, match_code, home_club_id, away_club_id, home_team_name, away_team_name, match_date, match_time, set_score, points_score, venue, first_referee, second_referee                                                                            | Normalization to ordered team identities, match instant and sporting details.                                                                   |
| FfvbCalendarSnapshot | matches, complete                                                                                                                                                                                                                                     | Complete-row evidence before dependent writes/deactivation. Empty valid exports and failed/incomplete observations must remain distinguishable. |
| FfvbRanking          | team_name, points, played, wins, losses, wins_three_to_zero, wins_three_to_one, wins_three_to_two, losses_two_to_three, losses_one_to_three, losses_zero_to_three, won_sets, lost_sets, coefficient_sets, won_points, lost_points, coefficient_points | Provider standings matched to participation; ranking totals and coefficients.                                                                   |
| LnvMatch             | code, match_date, set_score, points_score                                                                                                                                                                                                             | Professional schedule/result override.                                                                                                          |
| LnvRanking           | team_name, stats (AssociationStats)                                                                                                                                                                                                                   | Professional standings and all association statistical fields above.                                                                            |
| LnvLiveMatch         | live_code, home_name, guest_name, match_date                                                                                                                                                                                                          | Match reconciliation and official live identifier, separate from community URL.                                                                 |
| FfvbClubRecord       | identifier, raw_name, name, address, city, postal_code, email, phone_number, website                                                                                                                                                                  | Club directory contact/location update, followed by owner enrichment.                                                                           |

Sources: [FFVB records](../../../apps/backend/competition-scraper/scraper/infrastructure/ffvb/models.py), [LNV parsers](../../../apps/backend/competition-scraper/scraper/infrastructure/lnv/parsers.py), [club records](../../../apps/backend/club-scraper/scraper/infrastructure/ffvb/models.py).

## Provider-to-screen lineage

| Stage                   | Current source and transformation                                                                                                                                                                                                                                                                                                            | Stored / displayed result                                                                                                                                                                                                 | Rebuild concern                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FFVB discovery          | [Provider adapters](../../../apps/backend/competition-scraper/scraper/infrastructure/ffvb) parse departmental/regional/national indexes, access pages, CSV calendars and rankings. [Provider records](../../../apps/backend/competition-scraper/scraper/infrastructure/ffvb/models.py) retain source codes, names, season and observations.  | Mapping keys → division/format/gender → pools and teams.                                                                                                                                                                  | Unmapped classification or incomplete observations must not be interpreted as complete absence.                                                                                                                                 |
| Calendar ingestion      | [calendar_ingestion.py](../../../apps/backend/competition-scraper/scraper/application/calendar_ingestion.py) preloads owner state, normalizes names, creates pool/teams/participation, stages matches and calculates stats. [Domain records](../../../apps/backend/competition-scraper/scraper/domain/models.py) mirror all relevant fields. | All match/team/pool/association fields listed above.                                                                                                                                                                      | Preserve opponent order, codes, season, null scores, identity matches and manual overrides; bootstrap requires curated mappings.                                                                                                |
| Professional enrichment | [LNV adapters](../../../apps/backend/competition-scraper/scraper/infrastructure/lnv) process match/rank XML and DataProject live HTML after calendar input.                                                                                                                                                                                  | XML date/set/score and ranking totals; HTML official live code.                                                                                                                                                           | See MatchChangeSet: with priority validation enabled XML replaces date/set/score, HTML only live_code, later FFVB updates only its six relationship/detail fields. Numeric source priority is not a general field merge policy. |
| Owner reconciliation    | [match_changes.py](../../../apps/backend/competition-scraper/scraper/application/match_changes.py), [association_changes.py](../../../apps/backend/competition-scraper/scraper/application/association_changes.py), owner [adapters](../../../apps/backend/competition-scraper/scraper/infrastructure/blockout).                             | Create/update/no-op/reactivate, then completeness-dependent deactivation.                                                                                                                                                 | Match buffer key lacks season; failed writes are logged then discarded. Stats can come from provider rankings as well as calculated matches.                                                                                    |
| Club discovery          | [Club ingestion](../../../apps/backend/club-scraper/scraper/application/club_ingestion.py) gets club IDs from teams and parses FFVB contact pages. [ClubWriter](../../../apps/backend/club-scraper/scraper/application/club_writer.py) compares eight contact/name fields and retains logo.                                                  | Club contact/location and display names; [owner geocoding](../../../apps/backend/clubs-service/src/main/java/com/blockout/clubs/club/infrastructure/geocoding/ClubGeocodingJob.java) supplies coordinates through Mapbox. | Clubs depend on existing teams for discovery; partial contact failures can deactivate a still-valid club.                                                                                                                       |
| Mobile composition      | [Gateway](../../../apps/backend/mobile-gateway/src/main/java/com/blockout/mobilegateway) loads matches/pools/teams/clubs/divisions and assembles rankings, logo fallback and PDF links.                                                                                                                                                      | Day/pool groups, entity cards/details/maps, rankings, live ownership.                                                                                                                                                     | Local caches and missing dependencies affect freshness; field-preserving codegen alone cannot prove equivalent views.                                                                                                           |
| User actions            | [Mobile feature adapters](contracts.md#mobile-adapter-boundaries) call gateway; users/matches/config/notifications own writes.                                                                                                                                                                                                               | Favorites, profile, live moderation, settings and inbox.                                                                                                                                                                  | These inputs are not recoverable from sports scraping.                                                                                                                                                                          |

## External systems and disposable runtime state

| State                                                                                                                                                                                                                                                                                             | Future use                                                | Reset treatment                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 subject, tenant/issuer, linked identities, credentials and role assignments                                                                                                                                                                                                                 | Login and permission identity                             | Keep existing Auth0 accounts. Never run the current account-deletion flow as part of the technical reset. Actual linked-account/role configuration remains unverified.                                                                                                                              |
| RevenueCat customer identity, aliases, entitlement and store purchase association                                                                                                                                                                                                                 | Existing paying users recover paid access                 | Keep the existing association. Mobile currently calls `Purchases.logIn(auth0User.sub)`, independently of the recreated local user ID. Validate actual paid/restore/account-switch cases in the same RevenueCat project.                                                                             |
| Local user profile and favorites                                                                                                                                                                                                                                                                  | New profile at first login; new follows thereafter        | Start fresh. No profile, pseudo, favorite or local account-age migration required. Existing seven-day live-link rule would apply to a newly created local account unless future specifications change the rule.                                                                                     |
| Match/live/moderation/inbox/delivery history                                                                                                                                                                                                                                                      | New season and new user actions                           | Purge. No migration or old-history comparison required.                                                                                                                                                                                                                                             |
| Search documents: club (id, logoUrl, name, city, all); team (id, name, shortName, clubId, clubName, clubCity, logoUrl, divisionId, divisionName, format, gender, season, all); pool (id, name, shortName, divisionId, divisionName, leagueCode, leagueName, season, logoUrl, format, gender, all) | Search results and filters; `all` is combined search text | Rebuild from new owner data. [Document sources](../../../apps/backend/search-worker/src/main/java/com/blockout/workersearch/projection/infrastructure/elasticsearch/documents).                                                                                                                     |
| RabbitMQ events/retries/DLQs, gateway/search caches and device registrations                                                                                                                                                                                                                      | New event processing and push delivery                    | Purge/isolate old runtime state so it cannot write into the fresh database. Re-register devices against recreated users. No old delivery recovery project.                                                                                                                                          |
| Mobile query cache, guest/onboarding flags, secure credentials and SDK state                                                                                                                                                                                                                      | Installed-client startup and account switching            | Server purge does not clear installations. Rebind fresh local IDs and invalidate stale business queries while preserving external login/purchase identity. Old resource links may become unavailable; they must not expose another user's data through ID reuse.                                    |
| Object storage photos/logos/report attachments and their URLs                                                                                                                                                                                                                                     | Newly uploaded/seeded media                               | No old business-media migration required. Provision new assets and handle obsolete objects under the eventual cutover plan.                                                                                                                                                                         |
| Divisions, raw mappings, legal text, app status and scraper enablement                                                                                                                                                                                                                            | Make a fresh installation useful and controllable         | Supply deliberate new seeds/configuration. In particular an unmapped provider division cannot bootstrap teams/pools. This is initialization work, not historical-data retention.                                                                                                                    |
| Reports stored in GitHub, report attachments and Discord notifications                                                                                                                                                                                                                            | Continue accepting application reports                    | No local report table. [Report application](../../../apps/backend/reports-service/src/main/java/com/blockout/reports/report/application/ReportApplicationService.java) creates these external artifacts. Their future flow needs configuration; this documentation task makes no external deletion. |
| Provider catalogue, scheduling, metrics/logs, DB sequences/migration history and environment configuration                                                                                                                                                                                        | Reproducible ingestion and operations                     | Initialize for the replacement; Liquibase replaces the new database migration mechanism. Metrics are operational signals, not recoverable business data.                                                                                                                                            |

## Future field ownership

Provider imports and manual edits can write some of the same display fields. The replacement needs explicit update precedence for new data (names, contacts, locations and logos). Ranking totals/penalties also need a defined authoritative input, because available match rows alone may not explain provider standings. These are future behavior decisions; they do not require keeping the old database.
