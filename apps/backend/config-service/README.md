# Blockout Config Service

This service owns app status, divisions, legal documents, raw division mappings, and scraper enablement. It exposes
isolated legacy v1 adapters and generated canonical v2 adapters over the same application behavior.

Each feature is organized by owned role:

- `api` contains generated-model mapping, controllers, and legacy compatibility;
- `application` contains commands, views or snapshots, use-case services, persistence ports, and feature errors;
- `domain` exists only for the division logo value whose content, MIME, and size invariants justify it;
- `persistence` contains JPA entities, Spring Data repositories, strict mappers, and store adapters; and
- `infrastructure` contains the division S3 implementation.

Application services do not depend on generated object models, JPA entities, Spring Data repositories, or vendor SDK
types. See [MRG-402](../../../docs/migration/mrg-402-config-service-architecture.md) for the ownership, parity, Flyway,
compatibility, verification, and rollback record.
