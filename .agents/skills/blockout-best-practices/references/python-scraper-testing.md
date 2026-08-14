# Python Scraper Testing

Apply this policy when adding or changing scraper behavior, tests, fixtures, provider parsing, scheduling, or Blockout API adaptation.

## Goal And Timing

Tests protect supported ingestion behavior and important boundaries without freezing implementation structure. Every change ships with proportionate proof; a regression fix starts with a failing reproduction whenever practical, and a refactor characterizes the affected seam before moving it.

Prefer the cheapest test that can fail for the meaningful regression. Coverage and test count are not goals by themselves.

## Consistent Shape

- Name files `test_<boundary>.py` and tests `test_<observable_behavior>`.
- Organize tests by feature or provider boundary. Keep characterization tests and sanitized provider fixtures explicit.
- Structure each test as arrange, act, assert, separated clearly by blank lines.
- Use deterministic identifiers and meaningful values. Keep one-off data and doubles inside the owning test.
- Extract shared fixtures, builders, fakes, or async support only after several tests share the same stable need.

## Choosing What To Test

### Pure Parsing And Policy

Feed controlled HTML, XML, CSV, or JSON into pure parsers and assert typed provider records. Test normalization, aliases, matching, source priority, dates, scores, statistics, and write decisions through direct inputs and outputs.

Cover observed malformed or missing provider data without inventing equivalent permutations merely to increase coverage.

### Application Scenarios

Use small fake provider sources and fake Blockout ports. Assert semantic decisions, ordered writes, batching, partial failure, idempotence, and forbidden writes. Do not assert incidental private call order.

### HTTP, Contracts, And Lifecycle

Use controlled HTTP responses to protect method, path, query, headers, multipart parts, field naming, decoding, timeout, and error translation. Generated contract compatibility is primarily proved by generation, package verification, and typed adaptation; do not retest the generator.

Test enabled and disabled startup, overlap prevention, scheduler registration, token refresh ownership, cancellation, and graceful shutdown when those behaviors change. Replace sleeps with controlled events or sleepers and assert outcomes rather than wall-clock duration.

## Fixture Rules

- Store sanitized deterministic fixtures under the owning scraper's `tests/fixtures` directory.
- Use the smallest source-derived response that preserves the real structure under test; retain a complete page only when cross-section markup affects parsing.
- Remove tokens, cookies, personal data, private URLs, request identifiers, and unrelated content.
- Record provider family, encoding, and scenario in the filename or adjacent documentation.
- Never refresh fixtures automatically from the network. A fixture update is a reviewed behavior change.

## Differential Parity

Before replacing a legacy seam, run old and new logic against the same fixtures and compare semantic outputs:

- normalized provider records and identifiers;
- source-priority, alias, matching, and conflict decisions;
- generated request values and serialized bodies;
- ordered create, update, replace, skip, or no-op operations;
- retry, partial-failure, cancellation, and terminal outcomes.

Compare typed values or compact normalized traces, not log lines, object identities, or scheduler ordering that is not a contract. A difference blocks the replacement unless the issue explicitly authorizes and tests the correction. Never run two implementations as active writers.

## Maintainability Rules

- Prefer small handwritten fakes over broad mocks. Do not mock dataclasses, enums, generated values, or pure objects.
- Avoid large snapshots, source scans, private-function access, arbitrary sleeps, real provider calls, production data, and universal fixture DSLs.
- Assert logs only when the log is supported behavior; otherwise assert state, result, or adapter operation.
- Seed randomness and freeze or inject time only when they influence the result.
- Keep async tasks owned and completed inside the test. No task may survive the test that created it.
- Small duplication is preferable to a helper that hides the scenario.

## Verification

- Run the narrowest relevant test while developing.
- Run the owning scraper verification target before completion.
- Run generated Python client verification when contracts or API adaptation change.
- Run controlled local smokes only when the changed boundary requires real service integration; never use production endpoints or credentials.
- Run formatting and repository diff-hygiene checks, and report unavailable fixtures, smokes, or intentionally skipped checks with the reason.
