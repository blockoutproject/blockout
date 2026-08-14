# Java 25 And Spring Boot 4 Migration Baseline

Date: 2026-07-30. Finalized: 2026-08-03.

Document role: durable, evidence-backed version-pin, compatibility-ownership, migration, and rollback record for the
delivered Blockout Java 25 and Spring Boot 4 baseline.

GitHub issues: [FND-012 / #116](https://github.com/blockoutproject/blockout/issues/116) and
[FND-017 / #121](https://github.com/blockoutproject/blockout/issues/121).

Source gate: `OK`. Maaatch is used only as a read-only structural and version reference. The staged issues,
not this decision alone, authorized the delivered Maven, Java, CI, generation, and runtime changes. No Maaatch business
code, configuration, contract, domain model, or product behavior was copied.

## Decision

Blockout uses the backend toolchain and framework versions originally selected from Maaatch commit
[`f1b59a6e`](https://github.com/maaatch/maaatch/commit/f1b59a6ea248d54815207b66e13b1f3a337083de) and revalidated against Maaatch `develop` commit
[`bd7da207`](https://github.com/maaatch/maaatch/commit/bd7da2073758f654d3917c1b2c264bf9edd968ec):

- Java 25 in Maven and Eclipse Temurin 25 in every Java CI job;
- Spring Boot 4.1.0 and its Spring Framework 7 dependency baseline;
- Jackson 3 as the application and generated-code JSON boundary, while leaving Jackson versions under Spring Boot;
- springdoc 3.0.3;
- Lombok 1.18.42;
- MapStruct 1.6.3;
- OpenAPI Generator 7.23.0;
- build-helper-maven-plugin 3.6.1;
- maven-compiler-plugin 3.15.0;
- Maven 3.9.14 through Maven Wrapper 3.3.4 and in every backend builder image; and
- Nx Maven 0.0.17.

The common Spring Boot parent is the single version authority for every dependency that it manages. Blockout must not
add a child-module version for a Boot-managed dependency to force parity. Blockout-only libraries remain explicit
where they are not managed by Boot and require the compatibility evidence assigned below.

## Evidence Snapshot

The Blockout baseline was read from commit
[`142df591`](https://github.com/blockoutproject/blockout/commit/142df591dbc5589923ad9744a2bb64d650528166):

- [`pom.xml`](../../../pom.xml) pins Nx Maven 0.0.17.
- [`apps/backend/pom.xml`](../../../apps/backend/pom.xml) owns Spring Boot 3.4.5, Java 21, springdoc 2.6.0,
  MapStruct 1.6.3, OpenAPI Generator 7.22.0, build-helper 3.6.1, Spotless 3.8.0, and google-java-format 1.35.0.
- Twelve service POMs repeat Java 21 and Lombok 1.18.38. The parent does not yet own Lombok or an explicit
  maven-compiler-plugin version.
- Pull-request, push, and formatting workflows select Temurin 21.
- Thirty Spring generator executions inherit `useSpringBoot3=true` from the parent, with one shared-models execution
  repeating that option.
- Forty handwritten Java source or test files import Jackson 2 core or databind packages.
- Twelve service `application.yaml` files require configuration-property migration inspection.
- Twelve pairs of service-local `mvnw` and `mvnw.cmd` scripts are tracked, but their required `.mvn` metadata is
  absent. [PLT-033 / #113](https://github.com/blockoutproject/blockout/issues/113) exclusively owns replacement with
  one complete root wrapper.

The delivered Maaatch evidence is:

- the [root POM](https://github.com/maaatch/maaatch/blob/f1b59a6ea248d54815207b66e13b1f3a337083de/pom.xml),
  which pins Nx Maven 0.0.17;
- the
  [backend parent POM](https://github.com/maaatch/maaatch/blob/f1b59a6ea248d54815207b66e13b1f3a337083de/apps/backend/pom.xml),
  which pins every shared Maven target below;
- the
  [wrapper metadata](https://github.com/maaatch/maaatch/blob/f1b59a6ea248d54815207b66e13b1f3a337083de/apps/backend/.mvn/wrapper/maven-wrapper.properties),
  which selects Wrapper 3.3.4 and Maven 3.9.14; and
- the
  [pull-request](https://github.com/maaatch/maaatch/blob/f1b59a6ea248d54815207b66e13b1f3a337083de/.github/workflows/ci-pr.yml)
  and
  [push](https://github.com/maaatch/maaatch/blob/f1b59a6ea248d54815207b66e13b1f3a337083de/.github/workflows/ci-push.yml)
  workflows, which select Eclipse Temurin 25.

The delivered Maaatch POM is authoritative for delivered parity. In particular, its Lombok value is 1.18.42 even
though an earlier Maaatch planning decision discussed a later candidate.

## Shared Version Pin Table

| Component                 | Blockout baseline                                    | Delivered Maaatch target        | Ownership                                                                          |
| ------------------------- | ---------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| Java                      | 21                                                   | 25                              | FND-013 sets the parent release and all three Java CI jobs.                        |
| Java distribution         | Eclipse Temurin 21 in CI                             | Eclipse Temurin 25              | FND-013 changes only the major-version input.                                      |
| Spring Boot parent        | 3.4.5                                                | 4.1.0                           | FND-014 changes the common parent once Java 25 is proven.                          |
| Spring Framework          | Boot 3.4.5 managed                                   | 7.x, Boot 4.1.0 managed         | FND-014 accepts only the version resolved by the common Boot parent.               |
| Jackson core/databind     | 2.x, Boot-managed                                    | 3.x, Boot-managed               | FND-015 migrates code and generation; no Jackson version property is added.        |
| `jackson-annotations`     | 2.x coordinate/package                               | Remains `com.fasterxml.jackson` | FND-015 preserves this documented Jackson 3 exception.                             |
| springdoc                 | 2.6.0, partly repeated in children                   | 3.0.3                           | FND-015 centralizes the explicit parent-owned version.                             |
| Lombok                    | 1.18.38 repeated in children                         | 1.18.42                         | FND-013 centralizes the explicit version for Java 25 annotation processing.        |
| MapStruct                 | 1.6.3                                                | 1.6.3                           | FND-013 proves the unchanged processor; FND-014 removes child configuration drift. |
| OpenAPI Generator         | 7.22.0                                               | 7.23.0                          | FND-015 owns the bump with Boot 4 and Jackson 3 generation options.                |
| build-helper-maven-plugin | 3.6.1                                                | 3.6.1                           | FND-014 keeps the unchanged parent-owned version.                                  |
| maven-compiler-plugin     | Boot-managed; child configurations repeat processors | 3.15.0                          | FND-013 centralizes the plugin and Java 25 processor paths.                        |
| Maven Wrapper             | Incomplete service-local scripts                     | Wrapper 3.3.4                   | PLT-033 owns consolidation; FND-017 only verifies parity.                          |
| Maven distribution        | No usable checked-in wrapper metadata                | 3.9.14                          | PLT-033 owns the pin; FND-017 only verifies parity.                                |
| Nx Maven                  | 0.0.17                                               | 0.0.17                          | Keep unchanged; PLT-033 proves wrapper discovery and FND-017 rechecks it.          |
| Spotless                  | 3.8.0                                                | Blockout-only                   | FND-013 validates it under Java 25; no parity-driven change is authorized.         |
| google-java-format        | 1.35.0                                               | Blockout-only                   | FND-013 validates it under Java 25; no parity-driven change is authorized.         |

## Boot-Managed Ownership Rule

The Spring Boot 4.1.0 parent owns versions for common Spring modules and starters, Jackson 3, PostgreSQL,
Testcontainers, Hibernate Validator, Caffeine, and every other coordinate present in its dependency management.
Blockout keeps those dependencies versionless and verifies their effective versions rather than copying resolved
versions into child POMs.

This rule applies to the shared boundaries currently used by Blockout:

- Web MVC, validation, Spring Data JPA, Spring Security resource-server, AMQP, caching, and test support;
- PostgreSQL, Caffeine, and Hibernate Validator;
- Spring Boot Testcontainers plus PostgreSQL, RabbitMQ, and Elasticsearch Testcontainers modules when their Boot 4
  coordinates are managed; and
- Jackson 3 core and databind, with no Jackson 2 core/databind default or migration bridge.

springdoc, Lombok, MapStruct, OpenAPI Generator, build-helper, and maven-compiler remain explicit because the delivered
Maaatch parent explicitly owns those versions. Blockout-only libraries that are outside Boot dependency management
remain explicit and follow the compatibility matrix below.

## Spring Boot 4 Modularization Inventory

FND-014 delivered compile-level modularization by applying the
[official Spring Boot 4 migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
to the reactor rather than relying on the broader Boot 3 classpath.

| Current Blockout boundary                                                            | Spring Boot 4 disposition                                                                                                                                                  |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spring-boot-starter-web`                                                            | Replace with `spring-boot-starter-webmvc`.                                                                                                                                 |
| `spring-boot-starter-oauth2-resource-server`                                         | Replace with `spring-boot-starter-security-oauth2-resource-server`.                                                                                                        |
| Manual `RestTemplate` and Apache HttpClient integrations                             | Add the focused `spring-boot-starter-restclient` support where Boot infrastructure is used; retain behavior tests for manual clients.                                      |
| Direct Flyway PostgreSQL support                                                     | Introduce `spring-boot-starter-flyway`; keep a versionless database-specific module only when the effective Boot 4 graph requires it.                                      |
| Broad test support plus direct framework test imports                                | Add the focused Web MVC, security, JPA, AMQP, Elasticsearch, Flyway, and validation test starters required by imports; do not retain a classic starter as the final state. |
| Testcontainers `junit-jupiter` and `postgresql` coordinates                          | Move to the Boot 4/Testcontainers coordinates resolved by the delivered parent, including `testcontainers-junit-jupiter` and `testcontainers-postgresql`.                  |
| Direct Boot auto-configuration imports in messaging tests and application exclusions | Move imports to their Boot 4 module packages while preserving the same selected/excluded auto-configuration behavior.                                                      |

FND-014 migrated the direct AMQP `RabbitAutoConfiguration` imports and the JDBC/JPA auto-configuration exclusions in
mobile-gateway, search-service, and search-worker. FND-016 then proved that the resulting classpath has neither missing
nor accidental auto-configuration.

## OpenAPI And Jackson Boundary

FND-015 delivered the complete generator and JSON transition:

1. Upgrade OpenAPI Generator to 7.23.0 and springdoc to 3.0.3.
2. Set `useSpringBoot4=true` and `useJackson3=true` in the parent configuration used by all applicable Spring
   generator executions.
3. Remove every `useSpringBoot3` setting, including the shared-models override.
4. Migrate handwritten and generated core/databind imports from `com.fasterxml.jackson` to `tools.jackson`.
5. Keep Jackson annotations on their `com.fasterxml.jackson` coordinate and package.
6. Regenerate from authoritative OpenAPI sources and prove that generated interfaces, models, `JsonNode` mappings,
   multipart bodies, error payloads, persisted notification metadata, and serialization semantics do not drift.

Spring Boot 4 makes Jackson 3 the default while retaining a bounded Jackson 2 compatibility path. The migration follows
the [Spring Jackson 3 guidance](https://spring.io/blog/2025/10/07/introducing-jackson-3-support-in-spring/) and may use
Jackson 2 only as temporary scaffolding under the rule below.

## Blockout-Specific Compatibility Matrix

| Boundary and current form                                                | Disposition                                                                    | Implementation owner              | Required evidence                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------- |
| Flyway PostgreSQL, versionless                                           | `MIGRATE` to Boot 4 Flyway starter ownership                                   | FND-014; runtime proof in FND-016 | Effective graph, migration chain, service startup             |
| PostgreSQL driver, Boot-managed                                          | `KEEP` Boot-managed                                                            | FND-014; FND-016                  | Effective graph, JPA/Flyway integration                       |
| Testcontainers base, PostgreSQL, RabbitMQ, Elasticsearch                 | `MIGRATE` coordinates and focused test starters                                | FND-014; FND-016                  | Existing container tests plus full verify                     |
| Spring AMQP and RabbitMQ                                                 | `KEEP` Boot-managed; migrate module/test imports                               | FND-014; FND-016                  | Topology, publish/consume, failure behavior                   |
| Spring Data Elasticsearch and Elasticsearch Testcontainers               | `KEEP` Boot-managed; adapt Boot 4 client/module APIs                           | FND-014; FND-016                  | Index projection, search, retry/idempotency tests             |
| Spring Security resource server and direct `spring-security-oauth2-jose` | `RENAME` starter and keep both Boot-managed                                    | FND-014; FND-016                  | Issuer, audience, JWT decoding, authorization, negative cases |
| Auth0 SDK 2.20.0, parent-managed                                         | `KEEP` the centralized explicit Blockout version                               | FND-017                           | Token acquisition and provider failure tests                  |
| Logstash Logback Encoder 8.0, parent-managed                             | `KEEP` the centralized explicit Blockout version                               | FND-017                           | Structured-log startup and representative fields              |
| Apache HttpClient 5.6.1 and manual `RestTemplate` clients                | `KEEP` Boot-managed; use focused Boot rest-client support                      | FND-017                           | Internal/external HTTP success, error, timeout behavior       |
| AWS SDK S3 2.31.76, parent-managed                                       | `KEEP` the centralized explicit Blockout version                               | FND-017                           | Client construction, upload/link path, failure behavior       |
| Expo SDK 3.1.5                                                           | `KEEP` explicit Blockout version and verify                                    | FND-014; FND-016                  | Client startup, batching, provider error mapping              |
| Caffeine, Boot-managed                                                   | `KEEP` Boot-managed                                                            | FND-014; FND-016                  | Cache hit/miss and invalidation behavior                      |
| Hibernate Validator, Boot-managed; Jakarta EL 6.0.1 parent-managed       | `KEEP` validator managed and the centralized explicit EL version               | FND-017                           | Validation startup and representative constraints             |
| JJWT 0.13.0, parent-managed                                              | `KEEP` the centralized explicit Blockout version and verified Jackson coupling | FND-017                           | PDF-link token sign/verify and failure cases                  |
| GitHub API 1.330                                                         | `KEEP` explicit Blockout version after Java 25/Boot 4 runtime proof            | FND-016                           | Configuration GitHub client startup and error path            |
| Commons Lang 3.20.0, Boot-managed                                        | `KEEP` Boot-managed                                                            | FND-017                           | Compilation and owning tests                                  |
| Spotless 3.8.0 and google-java-format 1.35.0                             | `KEEP` explicit Blockout plugins if Java 25 compatible                         | FND-013; FND-017                  | Repository format check under Java 25                         |
| Docker Compose service graph                                             | `KEEP` topology and values                                                     | FND-016                           | Compose config plus representative full-stack smokes          |

No row authorizes a provider redesign, queue/index topology change, persistence business migration, OpenAPI semantic
change, or product behavior change. An incompatible Blockout-only library requires an explicit issue scope expansion
or a separate accepted task before replacement.

## Configuration And Removed-API Migration

FND-014 resolved compilation failures caused by removed Spring Boot 3/Spring Framework 6 APIs, package moves,
Jakarta EE 11, Servlet 6.1, Spring Security 7, Spring Data, AMQP, and modular auto-configuration without changing
behavior to hide a failure.

FND-016 inspected the twelve service configuration files. It ran every service with
`spring-boot-properties-migrator`, recorded each renamed or removed property, updated only the equivalent Boot 4 key,
and proved that no migration diagnostic remained. It also validated
configuration binding, health, logging,
scheduled work, security, persistence, messaging, search, cache, S3, Expo, and internal HTTP clients through the
compose-backed flows in its issue.

FND-017 removed the migrator and every other migration-only bridge before clean validation.

## Retired Temporary Scaffolding

The migration temporarily allowed only the following mechanisms before FND-017:

1. `spring-boot-properties-migrator` while FND-016 identifies and replaces configuration keys.
2. `spring-boot-starter-classic` or `spring-boot-starter-test-classic` inside FND-014 only when needed to isolate a
   missing focused module; each occurrence must be named in that PR and replaced before FND-017 completes.
3. Jackson 2 coexistence or `spring.jackson.use-jackson2-defaults` inside FND-015 only for one named incompatible
   third-party boundary; the owning dependency and removal condition must be recorded.
4. One temporary explicit transitive-version override only when the Boot 4 effective graph proves a Blockout-only
   integration cannot compile or start otherwise; the introducing PR must name the upstream incompatibility and
   FND-017 removal condition.

FND-017 removed every temporary mechanism and transitive-version override. Deprecated starters, disabled generator
options, suppressed nullability checks, skipped service contexts, Jackson 2 core/databind defaults, and unrecorded
version overrides are prohibited in the delivered baseline. Any future compatibility bridge requires a separately
accepted issue and an explicit removal condition.

## Staged Sequence And Rollback Gates

| Stage   | Entry condition            | Exit evidence                                                                                                                                   | Independent rollback gate                                                                                                                        |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| FND-013 | This decision is delivered | Java 25 generation, compilation, tests, packaging, and CI configuration pass on the retained Spring Boot 3.x baseline                           | On failure, revert only FND-013. Do not start Boot 4. A successful Java 25 stage remains independently valuable.                                 |
| FND-014 | FND-013 is complete        | Spring Boot 4.1.0, Spring Framework 7, modular starters, centralized processors, generation, and compilation pass                               | On framework failure, revert FND-014 and retain the proven Java 25/Boot 3 state.                                                                 |
| FND-015 | FND-014 is complete        | OpenAPI 7.23.0, springdoc 3.0.3, Boot 4/Jackson 3 generation, application JSON migration, and characterization tests pass                       | On codegen/JSON failure, revert FND-015 and retain the compile-proven Boot 4 stage only while its bounded Jackson 2 compatibility remains valid. |
| FND-016 | FND-015 is complete        | Full Maven verify and compose-backed security, persistence, messaging, search, cache, HTTP, S3, Expo, config, health, and logging evidence pass | A runtime failure blocks finalization. Revert the smallest owning stage in reverse dependency order when a bounded fix cannot preserve behavior. |
| FND-017 | FND-016 is complete        | No scaffolding remains; clean generation, verify, packaging, formatting, compose smoke, CI, guidance, and exact parity checks pass              | Revert FND-017 if cleanup or documentation is wrong; never claim the migration complete while an earlier gate is failing.                        |

Every stage is one reviewable pull request. Later stages never weaken an earlier gate, and a rollback occurs in reverse
dependency order so no retained commit depends on a reverted migration boundary.

## Final Maaatch/Blockout Parity Check

FND-017 compares the effective dependency and plugin models for the delivered Maaatch `develop` head and the Blockout
candidate head. For every shared group/artifact coordinate it requires either:

- the same explicit version in the common parent; or
- no explicit version in either reactor and the same version resolved through Spring Boot 4.1.0 dependency
  management.

It separately verifies Java/Temurin CI inputs, Spring Boot, springdoc, Lombok, MapStruct, OpenAPI Generator,
build-helper, maven-compiler, Maven Wrapper, Maven distribution, and Nx Maven pins. The check compares coordinates and
resolved versions only. It does not copy Maaatch modules, configuration, source, tests, contracts, domain models, or
business behavior.

Blockout-only coordinates are checked against the compatibility matrix and FND-016 runtime evidence rather than being
forced to match an unrelated Maaatch dependency.

The final FND-017 comparison generated the effective POM for every backend module in both repositories. Against
Maaatch `develop` at `bd7da207`, all 1,881 common dependency coordinates and all 35 common plugin coordinates resolve
to identical version sets. In particular, Byte Buddy resolves through Spring Boot to 1.18.10 and Apache HttpClient 5
resolves through Spring Boot to 5.6.1, with no Blockout override.

Blockout-only shared versions are centralized in the backend parent: Auth0 2.20.0, AWS SDK S3 2.31.76, Jakarta EL
6.0.1, JJWT 0.13.0, and Logstash Logback Encoder 8.0. Expo Server SDK 3.1.5 and GitHub API 1.330 remain explicit in
their sole owning modules. Spotless 3.8.0 and google-java-format 1.35.0 remain explicit parent-owned build pins.

## Invariants

- No Maven, Java, generated artifact, CI, compose, environment, runtime, contract, or product behavior changes in
  FND-012.
- The generated V1 contracts remain the transport authority; FND-015 changes generation mechanics, not source
  semantics.
- Maaatch remains a read-only structural and version reference.
- PLT-033 exclusively owns Maven wrapper consolidation. This migration only consumes and later verifies that result.
- Every shared Boot-managed dependency remains versionless in child modules.
- No temporary compatibility mechanism remains in the delivered baseline.
