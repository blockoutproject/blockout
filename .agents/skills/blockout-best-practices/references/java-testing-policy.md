# Blockout Java Testing Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before adding or changing backend Java tests.

## Goal

Blockout tests protect implemented product behavior, validated service boundaries, and persistence contracts without
freezing incidental implementation details. Prefer many small, readable tests over a few broad tests. Every test must
have a clear reason to exist and must fail for a meaningful regression.

Do not test a surface only because it exists in generated code, deleted implementation code, or project structure
documentation. A
test belongs in the suite only when the behavior is implemented, intentionally supported, and backed by the Blockout
Model
V1, the roadmap, or an explicit product decision.

## Test Kinds

- Unit test: plain JUnit test without a Spring application context. Use it for pure services, mappers, adapters,
  parsers,
  validators, policies, factories, and small collaborators.
- Slice test: Spring test slice such as `@WebMvcTest` or `@DataJpaTest`. Use it when framework wiring is the behavior
  under test, but the full application is unnecessary.
- Integration test: `@SpringBootTest` or a real database/container-backed test. Use it for transactions, repositories,
  Flyway startup, JPA/JSONB behavior, security wiring, or service flows that need real Spring infrastructure.
- Smoke test: a small integration test for an implemented runtime entry point that must start as part of the feature. Do
  not add smoke tests just to prove generated default controllers or non-implemented endpoints are wired.

## Naming

- Use `*UnitTest` for plain JUnit tests with no Spring application context.
- Use `*WebMvcTest` for Spring MVC slice tests.
- Use `*JpaTest` for Spring Data JPA slice tests when a JPA slice is intentionally enough.
- Use `*IntegrationTest` for Spring Boot, Testcontainers, repository, transaction, or full-context tests.
- Use `*SmokeTest` for context startup checks.
- Name methods with the behavior in present tense: `rejectsUnknownActivityKey`, `returnsStoredResultForIdenticalRetry`.
  If the method name needs `and`, split the test unless the two assertions are one observable behavior.
- Add `@DisplayName` on each test class, `@Nested` group, and test method. Keep it as the human sentence explaining why
  the test exists.
- Java handwritten test classes and helper methods still follow `code-documentation-policy.md`: add short Javadocs that
  state the local contract or test support purpose.

## Structure

The test source tree mirrors the production surface first. Use class suffixes, not nested test-kind directories, as the
test-kind signal. This keeps IDE navigation focused on the code surface while still making the runtime weight obvious
from the filename.

In Blockout, `fixture` is a competition-domain word. Do not use `fixtures`, `*Fixture`, or "fixture" to name shared test
infrastructure. Put shared test support under `testkit`, not in production code and not beside the tests that consume
it.

Recommended shape:

```text
src/test/java/com/blockout/<service>/
  controllers/
    CompetitionControllerWebMvcTest.java
  exceptions/
    ApiExceptionHandlerWebMvcTest.java
  mappers/
    CommandEnvelopeMapperUnitTest.java
    CreateCompetitionCommandMapperUnitTest.java
  repositories/
    CorrectionDependencyRefRepositoryIntegrationTest.java
  services/
    <feature>/
      SomePolicyUnitTest.java
      SomeTransactionalServiceIntegrationTest.java
  validators/
    ValidJsonPayloadValidatorUnitTest.java
  testkit/
    data/
    doubles/
    spring/
    containers/
```

Use the class suffix as the test-kind signal:

- `*UnitTest`: plain JUnit tests with no Spring application context.
- `*WebMvcTest`: Spring MVC slice tests such as `@WebMvcTest`.
- `*JpaTest`: Spring Data JPA slice tests such as `@DataJpaTest`.
- `*IntegrationTest`: `@SpringBootTest`, Testcontainers, real database, transaction, repository, or full-context tests.
- `*SmokeTest`: small startup checks for implemented runtime entry points.
- `testkit/data/**`: deterministic builders, object mothers, and seeded fake data.
- `testkit/doubles/**`: handwritten fakes, stubs, or mocks shared by several tests.
- `testkit/spring/**`: shared Spring context bases and any `@MockitoBean` replacements needed by integration contexts.
- `testkit/containers/**`: reusable Testcontainers declarations when they are separated from Spring context setup.

Java package declarations may mirror the production package when package-private collaborators are intentionally under
test. Do not create `unit`, `slice`, or `integration` package directories only to classify tests; use the class suffix
instead.

Keep `testkit` grouped by responsibility:

- `testkit.data.*TestData`: deterministic builders and random-but-seeded values.
- `testkit.spring.*TestContext`: abstract base only when it removes real repeated Spring/Testcontainers setup.
- `testkit.containers.*TestContainer`: container declarations shared by several Spring test contexts.
- `testkit.doubles.*`: shared fakes, stubs, or mocks; prefer local construction inside one test class when the double is
  not reused.
- Keep object mothers/builders small. If a test data helper hides the fields that matter to a test, make the test set
  those fields explicitly.

## Random Test Data

Use random data only when the exact value has no business meaning. If the value proves an invariant, state it explicitly
in the test.

- Use Datafaker for readable random values in Java tests.
- Always seed random generators. Non-deterministic tests are not allowed.
- Prefer a local test data instance per test class or per test method. Do not share mutable random state across
  unrelated
  test classes.
- Keep UUIDs deterministic. A stable UUID derived from a test label is better than `UUID.randomUUID()` when the ID
  appears
  in assertions or persisted rows.
- When a random value is used in a failure-prone assertion, include the seed or test data label in the helper so the
  failure can be reproduced.

## Mockito And Spring Mocks

- Use plain Mockito only in unit tests when replacing a true collaborator makes the behavior easier to isolate.
- Do not mock value objects, generated DTOs, domain records, enums, or simple data containers.
- Prefer constructing the class under test directly for unit tests.
- Use Spring Framework `@MockitoBean` for Spring context tests that must replace a bean. Do not add new Spring Boot
  `@MockBean` usages; it is deprecated in Spring Boot 3.4 and scheduled for removal in Spring Boot 4.
- Keep Spring mocks in `testkit.spring` when they are part of a shared test context, and make the mocked dependency
  visible in the context or field name. Keep one-off mocks local to the test method or class.
- Avoid spies unless the test is explicitly about Spring wiring around a real bean. A spy often signals that the unit is
  too broad.

## Component Patterns

### Controllers

- If a controller has behavior, prefer a WebMvc slice test that verifies status, response body, validation, security,
  and
  expected `ProblemDetail` codes.
- Do not test controllers that only expose generated default responses or non-implemented endpoints. Add controller
  tests
  when a handler exists and returns Blockout-owned behavior.
- Do not test generated OpenAPI examples as product behavior.

### Services

- Unit-test pure services, adapters, parsers, validators, and policies with direct construction.
- Integration-test transactional services when retry semantics, locks, repositories, or database state are part of the
  contract.
- Mock repositories only when the service decision is independent from persistence behavior. Use repository integration
  tests when query filtering, ordering, locks, JSONB, FKs, or transaction semantics matter.

### Repositories

- Use PostgreSQL/Testcontainers for repository tests that rely on Flyway, JSONB, enum strings, locks, ordering, or
  constraints.
- Do not create unit tests that parse Flyway migrations as a schema oracle. A startup/repository integration test plus
  targeted model/contract inspection is the preferred validation.
- Do not use eager loading or test-only production mappings to make assertions easier.

### Mappers

- Mapper tests verify concrete values, union dispatch, nested mapper reuse, ignored client-owned fields, and neutral
  payload conversion.
- Do not add source-scan mapper tests that only check that a method exists or that generated DTO names appear in code.

### Validators

- Unit-test accepted and rejected shapes directly.
- Use Bean Validation integration only when annotation wiring, entity lifecycle validation, or validation groups are the
  behavior under test.

### Activity Adapters And Rules

- Test fixed official adapters against their published metric catalog and supported capabilities.
- Test generic adapters with strict configurable metrics, unknown properties, duplicate keys, unknown metric keys, and
  inactive capability refusal.
- Do not activate a capability in tests unless the runtime engine and public command path are implemented.

## Coverage

Coverage is evidence, not the goal. A covered line without a meaningful assertion does not protect Blockout.

- Cover critical V1 boundaries: command idempotency, correction blocking, activity capability refusal, DTO/domain/entity
  separation, repository query ordering, controller error/status behavior, and generated enum usage across boundaries.
- Prefer branch/behavior coverage over raw line coverage.
- Add JaCoCo only with a baseline. Do not invent a threshold before measuring the current module and agreeing on
  realistic exclusions for generated code.
- When coverage tooling is unavailable, document the decision and list the targeted behavior checks instead.

## Anti-Patterns

- One test method with several unrelated scenarios.
- Random data without a deterministic seed.
- Spring Boot context for a class that can be tested by direct construction.
- Assertions that duplicate the implementation instead of checking observable behavior.
- Snapshot-style tests that fail on harmless representation changes.
- Tests that parse generated files, OpenAPI examples, or Flyway migrations as the source of product truth.
- Tests that assert generated default `501 NOT_IMPLEMENTED` behavior for endpoints Blockout has not implemented yet.
- Tests that enforce package architecture or repository cleanup policy when a targeted inspection or code review is the
  right
  control.
- Production code changed only to make a test easier.
- Behavior stabilized only because an obsolete test used to assert it.
- Any test whose main purpose is to prove deleted behavior did or did not contain something.

## Verification

- Run the narrowest targeted tests while developing.
- Run the impacted module test suite before completion.
- For backend Java changes, compile from `apps/backend/pom.xml` or run the owning module tests with `-pl <module> -am`.
- Run `git diff --check`.
- Report tests intentionally skipped and why, especially when Docker/Testcontainers or coverage tooling is unavailable.
