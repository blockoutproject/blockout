# Java Testing Policy

Read this reference before adding or changing backend Java tests.

## Goal

Protect supported behavior, service boundaries, generated-contract integration, and persistence contracts without
freezing incidental implementation details. Prefer small readable tests; every test must fail for a meaningful
regression. Do not test a surface only because it exists in generated code, deleted legacy code, or architecture prose.

## Test Kinds And Names

- `*UnitTest`: plain JUnit without a Spring context.
- `*WebMvcTest`: Spring MVC slice for controller, security, validation, status, and error behavior.
- `*JpaTest`: intentional Spring Data JPA slice.
- `*IntegrationTest`: full Spring, real database/container, transaction, repository, or infrastructure behavior.
- `*SmokeTest`: small startup or implemented runtime-entrypoint proof.

Mirror production packages under the test source root selected by the repository profile. Use suffixes rather than
`unit`, `slice`, or `integration` package directories. Name test methods as present-tense behavior. If a name needs
`and`, split the test unless both assertions form one observable outcome. Add `@DisplayName` to touched classes, nested
groups, and test methods.

Handwritten test classes and non-obvious shared test helpers follow `code-documentation-policy.md`. Keep one-off test
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
- Use `@MockitoBean`, not deprecated `@MockBean`, when a Spring context must replace a bean.
- Use integration tests when transactions, schema migrations, database-specific behavior, repository queries,
  ordering, locks, constraints, structured columns, or entity lifecycle are part of the contract.
- Do not use a full Spring context for code that direct construction can prove.
- Do not add source-scan architecture tests when targeted inspection is clearer.
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
- Mock a repository only when the service decision is independent from persistence semantics.
- Assert emitted commands, writes, and events by meaningful fields rather than brittle whole-object equality when
  owner-managed fields are irrelevant.
- Test failure propagation and no-write behavior where a rejection must remain atomic.

### Repositories

- Use the configured database integration environment for migrations, structured values, enum strings, constraints,
  locks, or database-specific queries.
- Do not parse migration sources in unit tests as a schema oracle. Prefer startup/repository integration and focused
  source inspection.
- Do not add test-only production mappings or eager loading to make assertions easier.
- Reuse one maintained database container setup where the module already has it. Do not replace supported-database
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
- Do not create architecture, reflection, or source-scanning tests where behavior tests or static inspection are
  clearer.
- Do not weaken assertions, add sleeps, repeat tests, or broaden timeouts to hide nondeterminism.

## Documentation And Size

- Follow `code-documentation-policy.md` for testkits and non-obvious test contracts.
- Keep a test focused on one observable behavior. Use nested groups for a coherent family, not deep hierarchy.
- Extract setup when it clarifies intent; do not build a DSL for a handful of values.
- Review unusually large test classes and split by behavior when navigation becomes difficult.

## Verification

- Run the narrowest targeted test while developing.
- Run the owning module suite before completion.
- Run the complete backend reactor selected by the repository router when a shared transport, parent build,
  persistence, or runtime boundary changes.
- Run configured database-integration evidence when the contract depends on database behavior.
- Run the repository formatting commands selected by the router before the final check.
- Report tests intentionally skipped and why, especially when Docker/Testcontainers is unavailable.
- Always run the repository diff-hygiene check.
