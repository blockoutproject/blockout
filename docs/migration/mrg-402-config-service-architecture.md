# MRG-402 Config Service Architecture

- Status: implemented in the monorepo shadow baseline
- Owner: `config-service`
- Feature families: app status, divisions, legal documents, raw division mappings, and scraper status
- REST operations: `CFG-01` through `CFG-16`
- Production effect: none

## Purpose

MRG-402 completes the internal config-service restructuring after Phase MRG-300 established its generated v2 and
isolated v1 transport boundaries. The five application services no longer import Spring Data repositories, JPA
entities, or persistence mappers. Each feature owns an application store port, while a feature-local JPA adapter owns
entity lookup, mutation, persistence mapping, and repository access.

The change preserves all current REST, authorization, validation, error, multipart, S3, transaction, ordering, null,
upsert, soft-deactivation, and compatibility behavior. It does not change a contract, generated model, database
mapping, Flyway migration, configuration key, event, or caller.

## Feature Ownership

| Feature         | API boundary                                      | Application roles                                                                                     | Domain role                                                            | Persistence adapter                                                            |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| App status      | isolated v1 plus generated v2 mappers/controllers | update command, view, change, store, service, not-found error                                         | none; no invariant beyond use-case update intent                       | `JpaAppStatusStore`, entity, repository, mapper                                |
| Divisions       | isolated v1 plus generated v2 multipart adapters  | create/update commands, update plan, view, change, store, service, logo-storage port, not-found error | defensive immutable logo upload with MIME and five-megabyte invariants | `JpaDivisionStore`, entity, repository, mapper, S3 adapter outside persistence |
| Legal documents | isolated v1 plus generated v2 mappers/controllers | update command, snapshot, change, store, service, not-found error                                     | none; document content has no proven domain invariant                  | `JpaLegalDocumentStore`, entity, repository, mapper                            |
| Raw mappings    | isolated v1 plus generated v2 mappers/controllers | canonical create/update commands, legacy seed, view, store, service, not-found error                  | none; shared generated enums are stable contract values                | `JpaRawDivisionMappingStore`, entity, repository, mapper                       |
| Scraper status  | isolated v1 plus generated v2 mappers/controllers | view, change, store, service, not-found error                                                         | none; enabled state has no additional invariant                        | `JpaScraperStatusStore`, entity, repository, mapper                            |

Generated server requests and responses remain inside `api/v2`. Legacy snake-case records and JSON handling remain
inside `api/v1`. Application ports expose only role-owned records and stable shared enums. JPA entities and Spring Data
repositories remain inside each feature's `persistence` package, and the S3 SDK remains inside the division storage
adapter.

No synthetic domain layer was added for simple data. The division logo upload moved to `division/domain` because it
owns real immutable-content, supported-MIME, and maximum-size invariants independently of Spring multipart and S3.

## Preserved Behavior

| Concern         | Preserved behavior                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| App status      | first-row lookup, missing-row error, null-preserving partial update, audit diff                             |
| Division create | case-insensitive duplicate rejection, optional logo upload, active default, created response                |
| Division update | null-preserving fields, delete-before-upload logo replacement, automatic reactivation, audit diff           |
| Division delete | soft deactivation and missing-row error                                                                     |
| Legal documents | exact read lookup, normalized update lookup, null-preserving update, timestamps and audit diff              |
| Raw mappings    | exact optional filters, entity-shaped legacy seed, explicit-null unmapping, missing-row errors              |
| Scraper status  | missing read remains an error, update remains an upsert, repository-defined list order                      |
| Transactions    | the same application service methods remain the read-only or write transaction owners                       |
| Transport       | all 16 v1/v2 paths, generated DTO mappings, snake-case compatibility, statuses, and scopes remain unchanged |

The old reflection helper was renamed and narrowed to the shared application change-log role. It still compares the
same before/after state and emits the existing action and entity identifiers; it no longer describes unrelated entity
families or sit in a generic `utils` package. Feature-specific not-found exceptions now live with their application
owner while the API exception adapters keep the same response behavior.

## Persistence And Flyway

`V1__create_raw_division_mapping_table.sql` through `V6__add_format_TWO.sql` are unchanged. Table names, columns,
constraints, enum storage, identity generation, timestamps, soft-deactivation, seed data, and repository queries are
unchanged. The existing MapStruct mappers remain strict and continue translating between application roles and JPA
entities inside the persistence adapters.

No database schema, migration checksum, data rewrite, repository method, or transaction propagation changes in this
slice.

## Compatibility And Removal

No REST field, generated type, legacy request/response record, v1 route, compatibility telemetry, annotation, or
casing adapter is removed. The v1 adapters remain governed by the MRG-304 traffic, observation, rollback, and
retirement gates. The MRG-267 field lineage remains unchanged.

The deleted files are internal organization artifacts only: the generic `DiffUtils` name and the former shared
feature-exception locations. Their behavior and consumers move in the same atomic service change.

## Verification And Rollback

Focused config-service tests exercise:

- app-status null-preserving updates through the JPA store adapter;
- division logo immutability, MIME and size validation, replacement, reactivation, and persistence mapping;
- raw-mapping explicit-null unmapping;
- scraper-status missing-row upsert;
- legal exact-read and normalized null-preserving update behavior;
- generated v2 API mapping and canonical camelCase;
- legacy snake-case JSON and compatibility telemetry; and
- stable Problem Details behavior.

Validation commands:

```text
mvn -f apps/backend/pom.xml -pl config-service -am test
mvn -f apps/backend/pom.xml -DskipTests clean package
NX_DAEMON=false ./scripts/verify-ci-pr-local.sh --skip-install
```

An additional unconfigured `mvn -f apps/backend/pom.xml clean verify` attempt reached and passed config-service, then
stopped at the pre-existing matches-service context smoke test because `AUTH0_ISSUER` was not supplied. The scoped
config tests above provide the behavioral proof; the complete reactor packaging and local CI gate provide the
cross-module compilation proof without claiming that environment-dependent smoke test as green.

Rollback is a code-only image revert. Both REST versions, Flyway history, data, S3 object naming, contracts, and
environment values remain compatible with the previous config-service image. Production authority is unchanged.
