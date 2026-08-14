# Python Scraper Architecture

Apply this policy when changing a Python scraper, provider parser, ingestion flow, dependency, task target, or Blockout API adaptation. Current source and characterization tests are the behavioral reference unless the issue explicitly authorizes a correction.

## Ownership And Structure

Each scraper is an independently deployable application with one importable `scraper` package and these roles only when active behavior needs them:

- `application` owns scrape use cases, orchestration, ports, commands, and run results;
- `domain` owns framework-free typed values, local policies, reconciliation rules, and invariants;
- `infrastructure` owns provider HTTP and parsing, generated Blockout clients, scheduling, and other technical adapters;
- `config` owns immutable typed settings assembled at startup;
- `observability` owns logging and metrics setup without business decisions;
- the root entry point composes dependencies, lifecycle handling, and application startup.

Create no empty role tree. Avoid generic `utils`, `helpers`, `common`, `manager`, `processor`, and `services` packages. Name behavior by its actual role: parser, normalizer, policy, client, source, writer, scheduler, or use case.

Use protocols only at real outbound seams that tests or multiple adapters replace. Do not add a dependency-injection framework or one interface per class.

## Provider And Contract Boundaries

- Separate download, decoding, parsing, normalization, matching, and Blockout writes.
- A parser accepts controlled text, bytes, or a parsed document and returns typed provider records without network I/O.
- Keep FFVB and LNV vocabulary, payload names, markup objects, and quirks inside their provider adapters.
- Generated Python contract models and API classes remain inside the Blockout infrastructure adapter. Map them immediately to domain or application values.
- Application ports and use cases never mention generated packages, HTTPX clients, transport enums, BeautifulSoup nodes, XML elements, CSV rows, or provider dictionaries.
- Do not maintain a handwritten mirror when a generated contract exists. A temporary mirror requires exact owner-parity tests and must be removed when generation covers the boundary.
- Follow `contracts.md` and `mapping.md` when an internal API shape changes.

## Parsing And Reconciliation

- Preserve provider encodings, identifiers, missing-value rules, malformed-record behavior, source priority, aliases, date parsing, score interpretation, and matching fallbacks unless an accepted correction changes them.
- Make non-obvious normalization and reconciliation decisions named pure policies with focused tests.
- Do not create a universal parser or conversion framework across providers with different semantics.
- Express create, update, replace, skip, and no-op decisions explicitly. Repeated identical input must retain its current idempotent outcome.
- Preserve write ordering, batching, concurrency, and partial-failure behavior unless tests prove an intentional change.

## Async And Runtime Discipline

- Keep one application-owned event loop. Do not create nested loops or perform work at import time.
- Every created task has an owner, lifetime, cancellation path, and awaited result or supervised background lifecycle.
- Bound provider concurrency explicitly and prevent overlapping scheduled runs according to current behavior.
- Centralize HTTP session ownership and close sessions during graceful shutdown.
- Keep retry policy at the failing I/O boundary; do not retry an entire scrape implicitly because one operation failed.
- Never mix blocking requests or sleeps into the async path.
- Preserve current schedules, timeouts, retries, backoff, proxy behavior, TLS settings, metrics ports, and startup modes unless the issue changes them.

## Errors, Configuration, And Logging

- Catch specific exceptions near the adapter that can make a recovery decision. Catch unexpected exceptions once at the run or process boundary without losing context.
- Do not turn dependency failure into `None`, an empty collection, or fabricated data unless that fallback is supported behavior.
- Use typed startup configuration and fail clearly when a required value is missing or invalid.
- Follow `logging.md`. Summarize runs and bounded failures; never log credentials, tokens, complete provider payloads, personal data, or per-record success noise.

## Python Simplicity

- Use the repository-pinned Python version, built-in generics, `X | None`, dataclasses or focused value objects, enums, pathlib, context managers, and explicit boundary types.
- Avoid `Any` and untyped dictionaries at stable boundaries. Parse dynamic provider data immediately into typed records.
- Prefer focused functions and immutable values. Avoid hidden globals, mutable module state, boolean mode parameters, broad base classes, factories, registries, plugin systems, and generic serializers.
- Keep dependencies application-specific and minimal. Do not combine behavior work with packaging, Docker, task-runner, type-checker, or unrelated dependency migrations.
- Follow `code-documentation.md` for public contracts and provider quirks.
- Never commit virtual environments, caches, credentials, generated clients, captured private payloads, or runtime logs.

## Refactor Discipline And Verification

Characterize a seam before moving it. Compare legacy and replacement behavior on the same controlled fixture, including normalized records, reconciliation decisions, ordered writes, retries, and failure outcomes. Keep only one production path active and delete legacy code only after parity is proven.

Follow `python-scraper-testing.md`. Run focused tests while iterating, then the owning scraper verification target, relevant contract generation, formatting, and repository diff-hygiene checks. Use only controlled local services for smokes; never call production providers or write production data.
