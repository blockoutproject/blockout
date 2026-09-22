---
name: java-testing
description: "Write and select JUnit Jupiter, Spring MVC/JPA, Testcontainers and runtime tests for Java behavior, mapping, transactions and generated contract integration."
---

# Java Testing Policy

Read this reference before adding or changing backend Java tests.

## Goal

Protect supported behavior, service boundaries, generated-contract integration, and persistence contracts without
freezing incidental implementation details. Prefer small readable tests; every test must fail for a meaningful
regression. Do not test a surface only because it exists in generated code, deleted legacy code, or architecture prose.

Tests are part of the same delivery as the behavior they protect. Test-first development is optional; a regression
fix starts with a failing reproduction whenever practical.

## Test Kinds And Names

- `*Test`: plain JUnit without a Spring context; keep an existing `*UnitTest` convention when the module uses it.
- `*WebMvcTest`: Spring MVC slice for controller, security, validation, status, and error behavior.
- `*JpaTest`: intentional Spring Data JPA slice.
- `*IntegrationTest`: full Spring, real database/container, transaction, repository, or infrastructure behavior.
- `*SmokeTest`: small startup or implemented runtime-entrypoint proof.

Bind adopted suffixes explicitly to Maven Surefire or Failsafe so every suite runs in its intended phase. Use
Failsafe for `*IntegrationTest`; a test that the build does not discover is not evidence. Use visible `// Given`, `// When` and `// Then` comments with blank lines between phases.

Mirror production packages under the test source root selected by the repository instructions. Use suffixes rather than
`unit`, `slice`, or `integration` package directories. Name test methods as present-tense behavior. If a name needs
`and`, split the test unless both assertions form one observable outcome. Add `@DisplayName` to touched classes, nested
groups, and test methods.

Document non-obvious test contracts and shared helpers. Descriptive names and `@DisplayName` are sufficient for straightforward scenarios. Keep one-off test
data and doubles inside the owning test. Add the configured shared data, doubles, framework, or container test-support
location only when several tests genuinely reuse that support.

- Shared test data creates meaningful domain, application, transport, or persistence examples.
- Shared doubles contain small reusable fakes or recording adapters, not a second mocking framework.
- Shared framework support contains configuration truly reused by several framework tests.
- The configured testkit location owns reusable database or infrastructure container setup.

Keep support in the owning module. Do not create a cross-module test library before active modules share a stable
testing boundary.

## JUnit And Mockito

- Use JUnit Jupiter and AssertJ consistently with the module.
- Prefer direct construction and real immutable values.
- Use Mockito for observable collaborator boundaries, not to reproduce implementation line by line.
- Stub only interactions needed by the scenario. Avoid lenient global setup and reset-heavy shared mocks.
- Verify an interaction only when it is behavior, such as a write, publication, or forbidden dependency call.
- Use an argument captor only when the delivered value is clearer than exposed internal state.
- Never mock records, enums, generated DTOs, collections, or the class under test.

## Selection

- Construct pure services, mappers, parsers, validators, policies, factories, and small adapters directly.
- Use Mockito only for true collaborators when isolation clarifies behavior. Do not mock records, enums, DTOs, value
  objects, generated models, or simple data containers.
- Use `@MockitoBean` when a supported Spring version must replace a bean in a test context; do not introduce
  deprecated `@MockBean` in that setup. Do not upgrade an older module incidentally to adopt an annotation.
- Use integration tests when transactions, schema migrations, database-specific behavior, repository queries,
  ordering, locks, constraints, structured columns, or entity lifecycle are part of the contract.
- Do not use a full Spring context for code that direct construction can prove.
- A focused architecture test is useful for an important dependency boundary; test actual dependencies rather than source spelling. Do not freeze incidental method names or private layout.
- Do not change production behavior only to satisfy an obsolete or incidental test.

## Component Guidance

### Controllers

- Test controllers with a WebMvc slice when they own validation, security, status, headers, multipart behavior, or
  `ProblemDetail` translation.
- Do not test generated OpenAPI examples or default methods as product behavior.
- A controller implementing a generated interface still needs a test when its implementation owns observable behavior.

### Services And Policies

- Unit-test pure decisions and orchestration with direct construction and narrow collaborators.
- Integration-test transactional services when retry semantics, locks, repositories, or atomic writes are the
  behavior.
- For application orchestration, replace the application-owned persistence port. An infrastructure test may replace its repository collaborator only when the tested decision is independent from persistence semantics.
- Assert emitted commands, writes, and events by meaningful fields rather than brittle whole-object equality when
  owner-managed fields are irrelevant.
- Test failure propagation and no-write behavior where a rejection must remain atomic.

### Repositories

- Use the configured database integration environment for migrations, structured values, enum strings, constraints,
  locks, or database-specific queries.
- Do not parse migration sources in unit tests as a schema oracle. Prefer startup/repository integration and focused
  source inspection.
- Do not add test-only production mappings or eager loading to make assertions easier.
- Use Testcontainers with the supported engine family and a compatible version. Reuse one maintained database
  container setup within the module; do not start a new container for each method. Do not replace supported-database
  semantics with an in-memory database.
- Let the configured migration mechanism initialize the schema; do not hand-create a divergent test schema.

### Mappers

- Verify concrete target values, nested mapper reuse, ignored owner-managed fields, conditional branches, enum
  conversion, and polymorphic/error behavior.
- Do not add source-scan tests that only prove a mapper method or generated DTO name exists.

### Validators

- Unit-test accepted and rejected shapes directly.
- Use Bean Validation integration only when annotation wiring, lifecycle validation, or validation groups are the
  behavior.

### Messaging And HTTP Clients

- Test consumer mapping, delegation, acknowledgement, retry, and rejection at the narrowest meaningful layer.
- Test publisher payload mapping and routing metadata without asserting framework internals.
- Use a controlled HTTP server or adapter fake for serialization, status mapping, timeout, and dependency errors.
- Never call production or uncontrolled external services.

### Generated Contracts

- Test handwritten implementations and mapping at generated boundaries, not generated source syntax.
- Regeneration parity and compilation are stronger evidence than source scans for generated names or methods.
- Ignore generated examples and default interface methods unless the repository explicitly relies on their behavior.

## Deterministic Data

Use explicit values when a value proves an invariant. Seed any random generator, keep UUIDs stable when asserted or
persisted, and never share mutable random state across unrelated tests. Do not add a test-data dependency merely to
avoid writing a few meaningful values.

Builders and fixtures expose meaningful defaults and named overrides. Avoid universal object mothers, reflection-based
population, random object graphs, and fixtures with hidden database writes.

## Spring Context Discipline

- Use the smallest slice that proves the owned behavior and import only the configuration it needs.
- Use `@MockitoBean` only for collaborators outside that slice.
- Use a full context when startup wiring, transactions, migrations, security integration, or real infrastructure is the
  contract.
- Keep profiles and dynamic properties explicit. Tests must not depend on local environments or secrets.
- Use `@DirtiesContext` only when intentional global context mutation cannot be isolated more narrowly.

## Assertions And Anti-Patterns

- Assert observable results, persisted state, emitted messages, adapter operations, status, and error codes.
- Avoid broad snapshots, private method invocation, incidental call order, framework internals, or assertions that
  duplicate the implementation.
- Do not put unrelated scenarios in one test.
- Do not stabilize deleted behavior because an old test mentioned it.
- Coverage is evidence, not the goal. Add coverage tooling only after measuring a baseline and agreeing on exclusions
  for generated code.
- Use an architecture/dependency test when it protects an important boundary; reflection is not categorically forbidden. Avoid source-wording checks that merely mirror implementation.
- Do not weaken assertions, add sleeps, repeat tests, or broaden timeouts to hide nondeterminism.

## Documentation And Size

- Document testkit ownership and non-obvious fixture/invariant contracts; do not narrate every assertion.
- Keep a test focused on one observable behavior. Use nested groups for a coherent family, not deep hierarchy.
- Extract setup when it clarifies intent; do not build a DSL for a handful of values.
- Review unusually large test classes and split by behavior when navigation becomes difficult.

## Verification

- Run the narrowest targeted test while developing.
- Run the owning module suite before completion.
- Run affected consumers and integration suites for changed transport, build, persistence or runtime boundaries. Run the full reactor when impact cannot be bounded or repository checks require it.
- Run configured database-integration evidence when the contract depends on database behavior.
- Run the repository formatting commands declared by the repository build configuration before the final check.
- Report tests intentionally skipped and why, especially when Docker/Testcontainers is unavailable.
- Always run the repository diff-hygiene check.

Use explicit Java types in all handwritten tests, resources and loops; do not use `var`. Qualify enum constants except switch cases. Tests of application orchestration should replace its persistence port, not import a repository into application code. When transaction semantics matter, exercise the real transaction owner and database.

## Readable scenarios and reusable data

The test name, scenario-determining inputs, action and expected result must be visible together. One behavior may need several assertions; do not split one outcome mechanically. Integration tests stay near their boundary owner; reserve transversal locations for truly cross-boundary behavior. Identify which collaborators are real and which are controlled doubles. Helpers must not hide the action, database writes, installed mocks or unrelated setup.

Keep simple values inline. Use targeted typed factories for rich valid objects that are actually reused, with explicit overrides for the scenario's decisive fields. Search existing factories before adding one, and share only identical meaning at the narrowest owner. A private helper may name one coherent step, and a public boundary may have one consumer; neither permits speculative test DSLs, generic object mothers or automatic reflection-based object graphs.

Use Datafaker when generated secondary values are useful, as a test dependency with a project-owned compatible version. Use a native fixed seed per test and explicit construction; never mutable random state shared across parallel tests. Control the clock for time-sensitive data. Assert scenario values, not a hard-coded string tied to a Faker version or call order. Keep boundary cases explicit and parameterized. Small tests do not require a data library, and installing this skill does not add dependencies.

Read [canonical examples](references/examples.md) when adding or substantially restructuring tests or factories. They show a unit test, an integration boundary and a rich typed factory, not a new test framework. For a substantive behavior change run the owning suite, necessary integration proofs and affected consumers; mandatory repository checks still apply. No new E2E infrastructure is introduced by this policy.
