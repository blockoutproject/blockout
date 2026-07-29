# Python Scraper Testing Policy

Read this before adding, changing, moving, or deleting scraper behavior. The purpose is to preserve supported ingestion
semantics while allowing implementation structure to change substantially.

## Test Layers

- Characterization tests protect current observable behavior before refactoring. They may encode an awkward outcome when
  that outcome is relied upon; label surprising behavior instead of silently correcting it.
- Parser unit tests feed controlled HTML, XML, CSV, or JSON into a pure parser and assert typed provider records.
- Policy unit tests cover normalization, aliases, matching, source priority, dates, scores, statistics, and update/no-op
  decisions without network or filesystem access.
- Application scenario tests use small fake provider sources and fake repository ports. They assert decisions, ordered
  writes, batching, partial failure, and idempotence.
- Client integration tests use fake HTTP responses to protect method, path, query parameters, headers, multipart parts,
  repository-configured field naming, response decoding, timeout, and error translation.
- Lifecycle tests cover enabled/disabled status, overlap prevention, scheduler registration, token refresh ownership,
  cancellation, and graceful shutdown where those behaviors are touched.
- A controlled local smoke exercises real local repository APIs and disposable data only after source changes pass
  offline.

Do not replace a narrow test with an end-to-end test. Each layer proves a different boundary.

## Fixture Rules

- Store sanitized, deterministic fixtures derived from real provider responses under the owning scraper's configured
  fixture location.
- Parser tests must not invent provider HTML, XML, CSV, or JSON. Preserve the smallest source-derived response that
  keeps
  the real structure under test; retain a complete page when malformed or cross-table markup affects parsing.
- Remove tokens, cookies, personal data, private URLs, request identifiers, and unrelated content.
- Record the provider family, encoding, and scenario in the filename or adjacent test documentation.
- Keep malformed and missing-field samples only when they were observed in a real provider response. Test technical
  exception handling by injecting the failure while reusing a real fixture, rather than constructing fake provider HTML.
- Never refresh fixtures automatically from the network. A fixture update is a reviewed behavior change.

## Differential Parity

Before replacing a legacy seam, run legacy and replacement code against the same fixture and capture a semantic trace:

- normalized provider records;
- selected owner identifiers and aliases;
- source priority and conflict decision;
- internal request type and serialized repository-owned body;
- ordered create, update, replace, or no-op operations;
- retry, skip, partial-failure, or terminal-failure outcome.

Compare typed values or normalized traces rather than log lines, object identities, task scheduling order that is not a
contract, or incidental private calls. A difference blocks the replacement unless the roadmap task explicitly documents
and tests an authorized correction.

Never run both implementations as active production writers. Differential parity is offline or uses recording no-write
adapters.

## Internal Contract Parity

Until generation is activated, every Python `*InternalRequest` and `*InternalResponse` mirror must have an owner-parity
test covering:

- exact repository-configured field names;
- compatible types, nesting, nullability, and enum values;
- accepted request fields without owner-managed response fields leaking into writes;
- representative serialization and deserialization.

Use the owning Java transport source and its tests as authority. Shared JSON examples may prove cross-language
compatibility, but they do not create a second source of truth.

## Async And Failure Tests

- Use async tests or one explicit event-loop runner consistently; do not create background tasks that survive a test.
- Replace real sleeps with a controlled sleeper when testing retries or scheduling.
- Assert retry count and final outcome, not wall-clock duration.
- Exercise bounded concurrency and overlap behavior deterministically with gates or events rather than timing guesses.
- Prove cancellation closes owned sessions and does not publish additional writes.
- Cover provider timeout, malformed response, repository 4xx, repository 5xx, authentication failure, and a partial batch
  failure when the touched flow distinguishes them.

## Doubles And Assertions

- Prefer small handwritten fakes that record semantic operations for application scenarios.
- Use mocks only when call isolation is the behavior under test. Do not mock dataclasses, enums, or pure value objects.
- Avoid snapshots of large raw payloads. Snapshot or compare a compact normalized trace when it is more readable than
  many
  disconnected assertions.
- Assert logs only when the log is an operational contract. Otherwise assert the state, result, or adapter operation.
- Seed randomness and freeze or inject time when those values influence output.

## Names And Documentation

- Name test files `test_<boundary>.py` and tests `test_<observable_behavior>`.
- Organize characterization, unit, and integration directories by production feature or provider, not by implementation
  class name alone.
- Give each touched test a concise docstring when the protected invariant, legacy quirk, or regression is not obvious
  from
  its name. Do not add docstrings that merely repeat the assertion.

## Completion Gate

During development run the narrowest affected test. Before completing a characterization task, run the entire owning
scraper suite and syntax check declared by the repository router. Before completing a runtime refactor, also run:

- legacy-versus-replacement differential tests for every migrated seam;
- all internal contract parity tests;
- import and disabled-startup checks;
- a controlled local API smoke with no production endpoints or credentials;
- the other scraper's contract suite when a handwritten boundary is shared;
- relevant repository task targets and the repository diff-hygiene check.

Report fixtures or live-provider cases that remain unavailable. Never weaken or skip a gate by replacing it with a claim
that the refactor is behavior-preserving.
