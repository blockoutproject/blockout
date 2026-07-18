# Teams Service

`teams-service` owns the team catalog, logo lifecycle, soft deactivation, club-deactivation cascade, follower-count
projection, and team upsert events.

## Boundaries

- `team/api/v1` retains the legacy snake-case compatibility API.
- `team/api/v2` implements the generated canonical OpenAPI server interfaces.
- `team/application` owns commands, views, use cases, and persistence/storage/event ports.
- `team/domain` contains only the immutable logo upload value and its MIME/size invariants.
- `team/persistence` owns JPA entities, queries, mapping, update handles, follower projection, and lifecycle writes.
- `team/infrastructure/storage` owns the AWS S3 adapter.
- `team/event/inbound` owns Rabbit lifecycle decoding and listeners.
- `team/event/outbox` maps minimal team facts to retained v1 and generated v2 event records.

The service keeps both REST and event compatibility versions until the MRG-304 observation and retirement gates are
satisfied. `users-service` remains the favorite authority; the local follower count is a derived projection pending
MRG-425.

See [`../../../docs/migration/mrg-404-teams-service-architecture.md`](../../../docs/migration/mrg-404-teams-service-architecture.md)
for parity, compatibility, rollback, and validation evidence.
