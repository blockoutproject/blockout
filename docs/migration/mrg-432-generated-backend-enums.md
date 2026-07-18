# MRG-432 Generated Backend Enums

## Outcome

Every Blockout backend Java enum is now source-owned under
`libs/shared/contracts/specs/source/shared/schemas` and generated into
`com.blockout.shared.model` by the backend `shared-models` module. Service-local standalone enums and nested
application enums were removed. Generated Java remains beneath Maven `target` directories and is never committed.

Blockout-owned event discriminators retain their separate AsyncAPI authority. The generated
`com.blockout.events.v2.model.EventType` in the shared `event-contracts` module remains the canonical event-envelope
type; it is not replaced by a handwritten or REST-owned copy.

## Source And Consumer Inventory

| Shared source enum                                                             | Canonical values                   | Consolidated backend use                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------ |
| `DevicePlatformEnum`                                                           | `IOS`, `ANDROID`, `WEB`, `UNKNOWN` | notification and mobile push-token adapters                                    |
| `EntityTypeEnum`                                                               | `TEAM`, `POOL`                     | favorites, follower projections, legacy events, BFF, matches, teams, and pools |
| `EntityEventActionEnum`                                                        | `CREATED`, `DELETED`               | retained legacy entity lifecycle payload adapters                              |
| `FavoriteEventActionEnum`                                                      | `FOLLOWED`, `UNFOLLOWED`           | users favorite application and outbox boundary                                 |
| `FollowerCountDeltaEnum`                                                       | `INCREMENT`, `DECREMENT`           | team and pool follower commands                                                |
| `FollowerProjectionActionEnum`                                                 | `FOLLOW`, `UNFOLLOW`               | notification follower projection input                                         |
| `FollowerProjectionMutationEnum`                                               | `APPLIED`, `UNCHANGED`             | notification follower projection result                                        |
| `ConsumedEventClaimEnum`                                                       | `CLAIMED`, `DUPLICATE`             | notification event-consumption claim                                           |
| `ConsumedEventResultEnum`                                                      | `APPLIED`, `DUPLICATE`             | notification event-consumption result                                          |
| `ImageChangeModeEnum`                                                          | `KEEP`, `REMOVE`, `REPLACE`        | club, team, and user image mutation plans                                      |
| `MatchLiveLinkDecisionEnum`                                                    | `APPROVE`, `REJECT`, `REACTIVATE`  | match moderation application boundary                                          |
| `FormatEnum`, `GenderEnum`                                                     | deployed catalog values            | teams, pools, search worker, notification, and BFF projections                 |
| `LiveLinkStatusEnum`, `LiveProviderEnum`, `MatchStatusEnum`                    | deployed match/live values         | matches and BFF match/live boundaries                                          |
| `ReportTypeEnum`                                                               | deployed report values             | BFF report boundary                                                            |
| `NotificationStatusEnum`, `NotificationTargetTypeEnum`, `NotificationTypeEnum` | deployed notification values       | notification owner and BFF boundaries                                          |
| `ScraperNameEnum`                                                              | `SCRAPER`, `SCRAPER_CLUBS`         | config scraper-status boundary                                                 |

Each schema is authoritative independently of whether a specific REST bundle references it. The generated shared
bundle is the complete backend model input; deployable bundles resolve only the shared schemas needed by their REST
operations.

## Generation And Clean Checkout

The clean-checkout order is:

1. install root Node dependencies;
2. run `npm exec nx run @blockout/contracts:generate-contracts` to build the ignored shared bundle and synchronize the
   committed backend `schemaMappings` block;
3. run Maven from `apps/backend/pom.xml`; `shared-models` generates the Java enum types below its `target` directory;
4. compile consumers against the generated shared-model dependency.

Only source schemas, generator configuration, and the deterministic `schemaMappings` block are tracked. The MRG-431
generated-output guard continues to reject generated files entering Git.

## Compatibility

All enum names and serialized values remain byte-for-byte equivalent to the removed declarations. JPA fields retain
`EnumType.STRING`, Jackson and Spring continue to use the same symbolic values, legacy adapters keep their deployed
payload values, and application decisions preserve their prior branches. Where source and target now share the same
generated Java type, identity conversion methods were removed instead of adding redundant mappings.

The change does not alter REST paths, schemas visible to callers, event topology, queues, database columns, providers,
dependencies, deployment, or production state.

## Enforcement And Rollback

`npm run validate:backend-enums-generated` strips comments and Java literals, scans all handwritten backend Java, and
rejects standalone or nested `enum` declarations. Maven `target` output and the generated AsyncAPI source directory
are excluded because they are derivative build artifacts. PR CI, Push CI, and the complete local verification run the
guard before compilation.

Rollback restores the previous source commit and its service-local enum types. It requires no data, contract,
deployment, or production rollback because persisted and transported values are unchanged.

No deployment, production action, MRG-9xx work, or MRG-1000 work is performed or authorized.
