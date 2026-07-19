# Blockout Clean Monorepo Bootstrap

## Status

Approved design for the temporary bootstrap repository.

This document defines only the initial import of the currently deployed Blockout applications into a clean Nx monorepo. It does not authorize functional refactoring, contract generation, GitFlow, pull requests, deployment automation, or production changes.

## Objective

Build a simple, public-ready monorepo that reproduces the behavior of the standalone Blockout repositories before any architectural refactoring begins.

The current `blockout` repository is a disposable construction workspace. Its Git history is not part of the deliverable. After the bootstrap is complete and validated, the resulting source tree will become the initial commit of a newly created public repository.

## Source authority

The standalone repositories in `/Users/legel/Documents/Projets/BlockOutProject` are the only source authority for application behavior during the bootstrap.

Each application must be imported from a recorded clean commit. Existing code in the current monorepo, previous migration documents, MRG implementations, generated contracts, and experimental changes must not be treated as source authority.

The standalone repositories remain the production authority until the monorepo has passed its complete parity gate. The bootstrap must not modify or deploy them.

## Target structure

```text
apps/
  backend/
    clubs-service/
    competition-service/
    config-service/
    matches-service/
    notification-service/
    pools-service/
    reports-service/
    search-service/
    teams-service/
    users-service/
    mobile-gateway/
    search-worker/
    club-scraper/
    competition-scraper/
    pom.xml
  frontend/
    mobile/
infra/
  compose/
    docker-compose.app.yml
    docker-compose.third-party.yml
    pgadmin/
docs/
tools/
AGENTS.md
README.md
nx.json
package.json
```

The structure follows Maaatch conventions while preserving Blockout's existing application boundaries. Maaatch is a read-only structural reference; no Maaatch application code is copied.

## Tool ownership

Nx orchestrates projects and tasks but does not replace their native build tools.

- Java services remain Maven modules using their current Spring Boot and Java versions. A root backend Maven reactor lists only Java modules.
- The mobile application remains an Expo application and uses the official `@nx/expo` integration.
- Python scrapers are backend deployables and remain under `apps/backend`. They initially keep their current Python dependency files and Docker behavior. Explicit Nx targets invoke their native commands; no Python Nx plugin or uv workspace is introduced during bootstrap.
- Docker remains responsible only for container images and local infrastructure.

The initial Nx adoption must remain narrow. Caching and project orchestration may be configured where deterministic, but no custom framework, shared execution abstraction, or generated project layer is introduced.

## Behavioral freeze

The bootstrap imports working code without redesigning it.

The following are explicitly out of scope:

- package, endpoint, route, payload, DTO, event, queue, database, or serialization changes;
- OpenAPI or AsyncAPI generation;
- generated clients or generated enums;
- source cleanup or business refactoring;
- dependency upgrades unrelated to monorepo compatibility;
- scraper rewrites or Python packaging migrations;
- removal of legacy or `v2` concepts;
- deployment, broker, database, or production cutover changes.

Only changes strictly required by the new filesystem location, Maven reactor, root JavaScript dependency ownership, Nx discovery, Docker build context, or local startup wiring are allowed.

## Local infrastructure

Local infrastructure follows the simple Maaatch split:

- `docker-compose.app.yml` contains application-owned databases required for local execution.
- `docker-compose.third-party.yml` contains only shared third-party services required by the applications, such as RabbitMQ, Elasticsearch, and pgAdmin.
- Application processes run outside Compose through Maven, Expo, Python, or Nx targets.

Legacy observability, reverse proxy, VPN, administration, and deployment containers are not imported unless a recorded application parity check proves they are required for local application startup.

## Repository governance during bootstrap

The temporary repository continues to publish directly to `main` without GitFlow or pull requests.

No CI pipeline, image publication, Dokploy webhook, deployment workflow, release automation, branch policy, or Nx Cloud integration is added during this task.

Agent guidance is intentionally minimal. It states only the language convention, source authority, behavioral freeze, public-repository hygiene, and prohibition on deployment. Previous migration skills and contract-first instructions are not imported.

Documentation is limited to:

- a concise root README;
- a local development runbook;
- the exact standalone source baseline;
- this bootstrap design;
- one roadmap task named `BOOT-001`.

## Public-repository hygiene

The source tree intended for publication must contain no secrets, credentials, private keys, local machine paths, production webhook tokens, committed generated output, build artifacts, virtual environments, IDE state, or obsolete migration history.

Necessary runtime values are represented with documented environment-variable examples containing non-secret placeholders. Public licensing and third-party attribution must be decided before the new public repository is created.

## Validation and parity gate

`BOOT-001` is complete only when the monorepo can prove that it preserves the imported applications' observable behavior.

The gate includes:

- exact source commit inventory for all standalone repositories;
- discovery of every deployable in the Nx project graph;
- successful Maven reactor compilation and existing Java tests;
- successful mobile dependency installation, type checking, Expo configuration loading, and available local export checks;
- successful Python syntax and import checks using each scraper's declared runtime dependencies;
- successful construction of every existing application image from the monorepo context;
- local startup smokes for services, workers, scrapers, and mobile tooling with non-secret test configuration;
- verification of ports, container commands, working directories, health endpoints, environment-variable names, queues, database migrations, and application identifiers against the recorded standalone baseline;
- local infrastructure startup and connectivity checks;
- repository-wide secret, generated-file, build-artifact, and absolute-path checks;
- a clean Nx project graph and clean working tree.

Where the standalone repositories have no meaningful automated tests, the bootstrap records that limitation and uses characterization smokes. It does not pretend that context-load tests prove business behavior.

## Failure and rollback

The standalone repositories are never modified, so they are the behavioral and production rollback source throughout the bootstrap.

Before replacing the current monorepo tree, its current committed state and uncommitted experimental work must be archived in a recoverable form. A failed import is corrected in the temporary repository; it never triggers a production change.

If parity cannot be established for an application, `BOOT-001` remains incomplete and that application's standalone repository remains authoritative.

## Completion

After `BOOT-001` passes, the validated filesystem tree is exported without the temporary `.git` directory. The user then creates the new public repository and publishes that tree as its first commit.

Architectural refactoring, contract-first adoption, code generation, test expansion, cleanup, GitFlow, CI, and deployment automation begin only as separately designed work after this clean baseline exists.
