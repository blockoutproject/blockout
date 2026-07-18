# Competition Service

`competition-service` owns pool-team associations, complete statistics snapshots, rankings, bulk lifecycle commands,
cascade decisions, and lifecycle events.

## Boundaries

- `association/api/v1` retains the legacy snake-case compatibility API.
- `association/api/v2` implements the generated canonical association and statistics interfaces.
- `association/application` owns association commands, views, pages, statistics snapshots, use cases, and store ports.
- `association/persistence` owns the JPA entity, queries, structural mapping, and transaction-bound update handles.
- `lifecycle/application` owns the three defensive bulk commands, explicit transactions, and cascade decisions.
- `lifecycle/persistence` owns lifecycle row selection, soft writes, and historical cascade queries.
- `lifecycle/event/outbox` maps lifecycle facts to retained v1 and generated v2 outbox messages.
- `ranking/application` owns snapshots, views, the single projector, and the ordering policy.
- `ranking/persistence` owns ranking reads and entity-to-snapshot mapping.

MRG-406 isolates association and statistics persistence. MRG-422 isolates ranking, lifecycle, cascade, and event
internals without changing their algorithms.

See [`../../../docs/migration/mrg-406-competition-service-association-architecture.md`](../../../docs/migration/mrg-406-competition-service-association-architecture.md)
for parity, persistence, compatibility, rollback, and validation evidence.

See [`../../../docs/migration/mrg-422-competition-ranking-lifecycle-architecture.md`](../../../docs/migration/mrg-422-competition-ranking-lifecycle-architecture.md)
for ranking, lifecycle, cascade, outbox, and deferred-correction evidence.
