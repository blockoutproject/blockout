# Competition Service

`competition-service` owns pool-team associations, complete statistics snapshots, rankings, bulk lifecycle commands,
cascade decisions, and lifecycle events.

## Boundaries

- `association/api/v1` retains the legacy snake-case compatibility API.
- `association/api/v2` implements the generated canonical association and statistics interfaces.
- `association/application` owns association commands, views, pages, statistics snapshots, use cases, and store ports.
- `association/persistence` owns the JPA entity, queries, structural mapping, and transaction-bound update handles.
- `lifecycle` owns the three defensive bulk commands and the retained cascade behavior.
- `ranking` owns the current ranking views and ordering policy.

MRG-406 isolates association and statistics persistence without changing the ranking, cascade, or event algorithms.
Those deeper internals remain assigned to MRG-422.

See [`../../../docs/migration/mrg-406-competition-service-association-architecture.md`](../../../docs/migration/mrg-406-competition-service-association-architecture.md)
for parity, persistence, compatibility, rollback, and validation evidence.
