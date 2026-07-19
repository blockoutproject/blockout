# Blockout Java Testing Policy

Read this before adding or changing backend Java tests.

## Goal

Protect supported behavior, service boundaries, and persistence contracts without freezing implementation details.
Every test must fail for a meaningful regression.

## Test Kinds And Names

- `*UnitTest`: plain JUnit without Spring context.
- `*WebMvcTest`: Spring MVC slice for controller, security, validation, status, and error behavior.
- `*JpaTest`: intentional JPA slice.
- `*IntegrationTest`: full Spring, real database, transaction, repository, or infrastructure behavior.
- `*SmokeTest`: small startup/runtime entrypoint proof.

Mirror production packages. Use suffixes rather than `unit` or `integration` directories. Name methods in the present
tense and add `@DisplayName` to touched classes and methods.

## Selection

- Construct pure services, mappers, parsers, validators, and policies directly.
- Use Mockito only for true collaborators when isolation clarifies behavior. Do not mock records, enums, DTOs, or value
  objects.
- Use `@MockitoBean`, not deprecated `@MockBean`, when a Spring context must replace a bean.
- Use integration tests when transactions, Flyway, PostgreSQL behavior, repository ordering, locks, or constraints are
  part of the contract.
- Do not use a full Spring context for code that a direct unit test can prove.
- Do not add source-scan architecture tests when targeted inspection is clearer.
- Do not change production behavior only to satisfy an obsolete or incidental test.

Use deterministic explicit test data for values that prove an invariant. Seed any random data. Keep one-off doubles
inside the test; introduce `testkit` only for genuinely reused support.

## Verification

Run narrow tests while developing, the owning module suite before completion, and the full backend reactor when a
shared transport or runtime boundary changes. Report any skipped test and its reason. Always run `git diff --check`.
