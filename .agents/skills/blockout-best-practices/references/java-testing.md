# Java Testing

Apply this policy when adding or changing backend Java behavior or tests.

## Goal And Timing

Tests protect supported behavior and important boundaries without freezing implementation details. Every feature ships
with the proportionate tests needed to prove its accepted behavior and risks; tests are part of the same delivery, not
a deferred stabilization phase. The policy does not require test-first development, but a regression fix starts with a
failing reproduction whenever practical.

Prefer the cheapest test that can fail for the meaningful regression. More tests are not automatically better.
Coverage is evidence for review, never a target that justifies low-value assertions.

## Consistent Shape

- Mirror the production package under `src/test/java`.
- Name plain unit tests `*Test`, infrastructure-backed tests `*IntegrationTest`, and small runtime proofs `*SmokeTest`.
- The Maven build must bind every adopted suffix to the correct `test` or `verify` phase; a test that CI does not
  discover is not evidence.
- Name methods after observable behavior in present tense. Avoid `and` unless the assertions form one outcome.
- Structure each test as arrange, act, assert, separated clearly by blank lines. Use comments only when the phases or
  reason are not obvious.
- Keep one behavior per test and group a coherent scenario family with shallow `@Nested` classes when that improves
  navigation.
- Use JUnit Jupiter and AssertJ consistently. Prefer explicit meaningful fixtures and deterministic identifiers.
- Keep one-off data and doubles inside the owning test. Extract a builder, fixture, fake, or container support class only
  after several tests share the same stable need.

## Choosing The Test Level

### Unit Tests

Directly construct domain policies, validators, mappers, parsers, factories, and application services when Spring or
infrastructure semantics are not part of the behavior.

Use Mockito only for true collaborator boundaries. Stub only what the scenario needs and verify an interaction only
when the interaction is observable behavior, such as a write, publication, or forbidden call. Never mock records,
enums, generated DTOs, value objects, collections, or the class under test.

### Spring Tests

Use a focused Spring MVC slice only when controller wiring, deserialization, Bean Validation, security, status,
headers, or `ProblemDetail` translation is the behavior. Do not add a slice test merely because a controller exists.
Use the current Spring replacement annotation for external collaborators and import only required configuration.

Use a full Spring context only when startup wiring, transactions, migrations, security integration, or real
infrastructure is part of the contract. Pure behavior never needs a Spring context.

### Testcontainers

Use Testcontainers when correctness depends on the real infrastructure engine: database migrations, constraints,
locking, transactions, database-specific queries or types, brokers, caches, or other supported services. Do not replace
those semantics with an in-memory substitute.

- Use the same engine family and a compatible version with production.
- Let the real migration mechanism initialize database schemas.
- Bind the module's `*IntegrationTest` suite to Maven Failsafe before adding its first infrastructure test.
- Reuse one maintained container setup within the owning module when several test classes need it; do not start a new
  container per test method.
- Keep dynamic properties explicit, data isolated, cleanup deterministic, and tests independent of local services,
  secrets, or execution order.
- Do not introduce a cross-module testkit until several modules share a stable infrastructure contract.
- Report infrastructure tests that could not run because Docker is unavailable; never silently replace them with a
  weaker proof.

## Boundary Guidance

- Application services: test decisions, orchestration, rejection, and no-write behavior. Use integration tests when
  atomicity, repositories, locks, or retry semantics are the behavior.
- Controllers: test only owned validation, security, mapping, status, headers, and error translation.
- Repositories: use Testcontainers for migrations, constraints, ordering, structured values, locks, and custom queries.
- Mappers: assert concrete values, ignored owner-managed fields, nested reuse, branches, enum conversion, and
  polymorphic or error behavior.
- Generated contracts: test handwritten implementations and mappings, then rely on deterministic regeneration and
  compilation for generated source.
- HTTP or messaging adapters: use controlled dependencies or containers for serialization, status/failure mapping,
  routing, acknowledgement, retry, and rejection. Never call an uncontrolled external system.

## Maintainability Rules

- Assert observable results, persisted state, emitted messages, adapter operations, status, and stable error codes.
- Avoid private-method tests, broad snapshots, source scans, framework internals, incidental call order, sleeps, random
  object graphs, and universal fixture DSLs.
- Do not change production design only to satisfy an incidental test.
- Fix nondeterminism at its source; never hide it with retries or broader timeouts.
- Keep tests readable before making them abstract. Small duplication is preferable to a shared helper that conceals
  the scenario.
- Split a test class when it covers unrelated behaviors or navigation becomes difficult, not at a fixed line count.

## Verification

- Run the narrowest relevant test while developing.
- Run the owning module suite before completion.
- Run the complete backend reactor when a shared contract, parent build, generated boundary, persistence, or runtime
  integration changes.
- Run every applicable Testcontainers suite when infrastructure semantics are in scope.
- Report intentionally skipped tests and the reason, then run formatting and repository diff-hygiene checks.
