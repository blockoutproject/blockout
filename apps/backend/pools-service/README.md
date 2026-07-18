# Pools Service

`pools-service` owns the pool catalog, soft deactivation, follower-count projection, and pool upsert events.

## Boundaries

- `pool/api/v1` retains the legacy snake-case compatibility API.
- `pool/api/v2` implements the generated canonical OpenAPI server interfaces.
- `pool/application` owns commands, views, use cases, and persistence/event ports.
- `pool/persistence` owns JPA entities, queries, mapping, update handles, follower projection, and lifecycle writes.
- `pool/event/inbound` owns Rabbit lifecycle decoding and listeners.
- `pool/event/outbox` maps minimal pool facts to retained v1 and generated v2 event records.

The service keeps both REST and event compatibility versions until the MRG-304 observation and retirement gates are
satisfied. `users-service` remains the favorite authority; the local follower count is a derived projection pending
MRG-425.

See [`../../../docs/migration/mrg-405-pools-service-architecture.md`](../../../docs/migration/mrg-405-pools-service-architecture.md)
for parity, compatibility, rollback, and validation evidence.
