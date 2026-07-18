# Clubs Service

`clubs-service` owns the club catalog, club-logo lifecycle, derived club coordinates, and club lifecycle event
adapters.

## Internal Boundaries

- `club/api/v1` keeps the legacy snake-case compatibility surface used during the MRG-304 coexistence window.
- `club/api/v2` implements the generated canonical server and maps generated models at the HTTP adapter.
- `club/application` owns commands, views, update plans, store and storage ports, and the minimal upsert fact.
- `club/domain` owns immutable validated logo content.
- `club/persistence` owns JPA entities, repositories, MapStruct persistence mapping, and `JpaClubStore`.
- `club/infrastructure/storage` is the AWS S3 adapter for the logo-storage port.
- `club/geocoding` separates scheduled execution, application orchestration, JPA candidate storage, and Mapbox HTTP.
- `club/event` separates legacy and generated inbound Rabbit adapters from the dual-wire outbox adapter.

Generated REST and event models, Spring Data types, JPA entities, AWS SDK types, Mapbox response shapes, and Rabbit
messages do not enter application contracts. Flyway migrations remain the database authority.

## Verification

```text
mvn -f apps/backend/pom.xml -pl clubs-service -am test
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

See [`docs/migration/mrg-403-clubs-service-architecture.md`](../../../docs/migration/mrg-403-clubs-service-architecture.md)
for ownership, compatibility, rollback, and validation details.
