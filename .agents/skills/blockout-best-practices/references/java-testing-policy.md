# Blockout Java Testing Policy

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

Mirror production packages. Use suffixes rather than `unit`, `slice`, or `integration` package directories. Name test
methods as present-tense behavior. If a name needs `and`, split the test unless both assertions form one observable
outcome. Add `@DisplayName` to touched classes, nested groups, and test methods.

Handwritten test classes and non-obvious shared test helpers follow `code-documentation-policy.md`. Keep one-off test
data and doubles inside the owning test. Add `testkit/data`, `testkit/doubles`, `testkit/spring`, or
`testkit/containers` only when several tests genuinely reuse that support.

## Selection

- Construct pure services, mappers, parsers, validators, policies, factories, and small adapters directly.
- Use Mockito only for true collaborators when isolation clarifies behavior. Do not mock records, enums, DTOs, value
  objects, generated models, or simple data containers.
- Use `@MockitoBean`, not deprecated `@MockBean`, when a Spring context must replace a bean.
- Use integration tests when transactions, Flyway, PostgreSQL behavior, repository queries, ordering, locks,
  constraints, JSON columns, or entity lifecycle are part of the contract.
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

### Repositories

- Use PostgreSQL/Testcontainers for Flyway, JSON, enum strings, constraints, locks, or database-specific queries.
- Do not parse Flyway SQL in unit tests as a schema oracle. Prefer startup/repository integration and focused source
  inspection.
- Do not add test-only production mappings or eager loading to make assertions easier.

### Mappers

- Verify concrete target values, nested mapper reuse, ignored owner-managed fields, conditional branches, enum
  conversion, and polymorphic/error behavior.
- Do not add source-scan tests that only prove a mapper method or generated DTO name exists.

### Validators

- Unit-test accepted and rejected shapes directly.
- Use Bean Validation integration only when annotation wiring, lifecycle validation, or validation groups are the
  behavior.

## Deterministic Data

Use explicit values when a value proves an invariant. Seed any random generator, keep UUIDs stable when asserted or
persisted, and never share mutable random state across unrelated tests. Do not add a test-data dependency merely to
avoid writing a few meaningful values.

## Assertions And Anti-Patterns

- Assert observable results, persisted state, emitted messages, adapter operations, status, and error codes.
- Avoid broad snapshots, private method invocation, incidental call order, framework internals, or assertions that
  duplicate the implementation.
- Do not put unrelated scenarios in one test.
- Do not stabilize deleted behavior because an old test mentioned it.
- Coverage is evidence, not the goal. Add coverage tooling only after measuring a baseline and agreeing on exclusions
  for generated code.

## Verification

- Run the narrowest targeted test while developing.
- Run the owning module suite before completion.
- Run the complete backend reactor when a shared transport, parent build, persistence, or runtime boundary changes.
- Report tests intentionally skipped and why, especially when Docker/Testcontainers is unavailable.
- Always run `git diff --check`.
