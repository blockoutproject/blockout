# Blockout Python Scraper Architecture Policy

Read this before changing either Python scraper, its models, parsing, orchestration, dependencies, Nx targets, or
Blockout API calls. Scrapers are critical backend applications: the current implementation is the behavioral reference
until focused tests prove an intentional replacement.

## Structure

Keep each scraper independently deployable under `apps/backend`. A refactored scraper uses one importable application
package and a small root entrypoint:

```text
scraper-root/
├── main.py
├── scraper/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   │   ├── blockout/
│   │   ├── ffvb/
│   │   ├── lnv/
│   │   └── scheduling/
│   ├── config/
│   └── observability/
└── tests/
    ├── characterization/
    ├── unit/
    ├── integration/
    └── fixtures/
```

Create only directories that own real code. The club scraper may omit LNV and other unused boundaries. Do not create
generic `utils`, `helpers`, `common`, `manager`, `processor`, or `services` packages. Name reusable behavior by its
role:
parser, normalizer, policy, client, source, writer, scheduler, or use case.

Each application uses the succinct local package name `scraper`. The owning application directory already supplies the
necessary context: both `club-scraper` and `competition-scraper` therefore contain their own sibling `scraper` and
`tests` directories. Run and test each application from its own root; do not combine both local `scraper` packages on
one
Python import path.

## Roles

- `main.py`: composition root only. Load configuration, construct adapters and use cases, install lifecycle handling,
  and start the application.
- `application`: scrape use cases, orchestration, ports, explicit commands, and run results. It decides what should be
  read or written but does not parse HTTP payloads or construct transport requests inline.
- `domain`: pure typed values, local policies, comparison rules, and invariants. Keep normalized scraper working models
  here when they have lifecycle or reconciliation semantics distinct from HTTP transport. It has no application,
  generated-client, aiohttp, scheduler, file, environment, metrics, or provider dependency.
- `infrastructure/blockout`: authentication and clients for internal Blockout service APIs, including handwritten
  transport mirrors until contract generation is activated. After adoption, generated imports and transport mappings
  stay in this adapter; application code depends on domain-shaped ports instead.
- `infrastructure/ffvb` and `infrastructure/lnv`: provider HTTP access and parsing. Provider vocabulary and payload
  names remain confined here.
- `infrastructure/scheduling`: APScheduler and process-lifecycle adapters. Scheduling never owns scrape rules.
- `config`: immutable typed settings assembled from environment variables at startup.
- `observability`: metrics and logging setup, without business decisions.

Use protocols at real outbound seams that tests or multiple adapters must replace. Do not introduce an interface for a
pure local helper or add a dependency-injection framework.

Both scrapers keep `domain` independent and keep generated/internal Blockout transport below
`infrastructure/blockout`. Application workflows depend on a domain-shaped Blockout port, never on generated packages
or Blockout adapter functions. A provider-specific workflow may consume a typed provider record or parser directly
when adding another protocol would only hide a single concrete source behind indirection. Provider vocabulary must not
leak into domain models or the Blockout adapter. Prefer one cohesive Blockout port per scraper over one protocol per
endpoint when that keeps the workflow readable.

## Internal Contract Ownership

Scrapers bypass the mobile gateway and consume the owning Java services directly. Their Blockout HTTP types are internal
transport contracts, not scraper-owned domain models.

- OpenAPI transport types use explicit names such as `ClubInternalResponse`, `CreateClubInternalRequest`,
  `UpdateTeamInternalRequest`, and `MatchInternalResponse` according to the actual owner endpoint.
- Match the owner service exactly for field names, types, enum values, nullability, nesting, and request semantics.
- Never add scraper-only fields to an internal transport type or maintain a second almost-identical resource model.
- Purpose-specific requests may be smaller than the complete resource when the owning endpoint defines that shape.
- Keep provider records explicit, for example `FfvbClubRecord` or `LnvMatchRecord`; they are not Blockout contracts.
- Use a distinct domain value only when it expresses different semantics, such as mutable candidate state,
  reconciliation state, provider-normalized values, or calculated ranking totals. A pure owner resource with no local
  semantics remains a generated transport type inside the Blockout adapter rather than another copy.

Before an owning vertical is adopted, an exact handwritten mirror may exist only as a temporary characterized seam.
The vertical then generates Java and Python types and clients from the same internal OpenAPI source under
`libs/shared`; generated sources remain untracked, and the scraper deletes the temporary mirror.

Once a contract is adopted:

- no handwritten `*InternalRequest` or `*InternalResponse` mirror remains in a scraper;
- generated models and API classes are imported only below `infrastructure/blockout`;
- the adapter maps generated responses immediately to domain values and maps domain values to generated requests;
- application ports and use cases never mention generated packages, HTTP clients, or transport enums;
- an available generated operation replaces a manual Blockout HTTP call instead of wrapping the same route again.

Contract-owned enums such as Format, Gender, and MatchStatus follow the owner service. Application-only policy such as
`DataSourcePriority` remains local to the competition scraper. Provider-owned enums remain provider-specific.

## Provider Parsing And Normalization

- Separate download, decoding, parsing, normalization, matching, and Blockout writes.
- A parser accepts controlled text, bytes, or a parsed document and returns typed provider records without network I/O.
- Preserve provider encodings, identifiers, missing-value rules, and malformed-record behavior unless a task explicitly
  authorizes a correction.
- Make name aliases, division mappings, source priority, score interpretation, date parsing, and matching fallbacks
  named
  policies with focused tests.
- Do not pass BeautifulSoup nodes, XML elements, CSV rows, or provider dictionaries into application or Blockout client
  code.
- Do not create a universal parser or conversion framework across providers with different semantics.

## Async And Runtime Discipline

- Keep one application-owned event loop. Do not create nested loops or perform work at import time.
- Prefer structured task ownership. Every created task has a documented owner, lifetime, cancellation path, and awaited
  result or supervised background lifecycle.
- Bound provider concurrency explicitly and preserve existing limits during behavior-preserving refactors.
- Keep overlap prevention explicit. A scheduled run must not silently overlap when the current application rejects or
  skips overlap.
- Inject clocks and sleep functions only where retry, scheduling, or time-dependent behavior needs deterministic tests.
- Centralize HTTP session ownership and close sessions during graceful shutdown.
- Preserve current timeouts, retry counts, backoff, proxy use, TLS behavior, schedules, metrics ports, and startup modes
  until a dedicated task changes them with evidence.
- Never mix blocking requests or sleeps into the async path. Legacy blocking utilities remain isolated until separately
  characterized or removed.

## Errors, Writes, And Idempotency

- Catch specific exceptions near the adapter that can add a recovery decision. Catch unexpected exceptions once at the
  run or process boundary to record failure without losing context.
- Do not catch an exception only to log and continue unless partial progress is an established supported behavior.
- Never return `None`, an empty collection, or a fabricated resource for a dependency failure unless that exact fallback
  is characterized.
- Keep retry policy at the failing I/O boundary; never retry an entire scrape implicitly because one write failed.
- Preserve the order, batching, concurrency, and failure isolation of Blockout writes until tests prove an intentional
  change.
- Express create/update/no-op decisions explicitly. Repeated identical input must retain the current idempotent outcome.
- Do not compensate, delete, deactivate, or overwrite data unless the current characterized flow performs that action.

## Python Code And Documentation

- Target Python 3.12 and use modern built-in generics, `X | None`, dataclasses or focused value objects, enums, pathlib,
  context managers, and explicit return types where they improve the boundary.
- Type every public function, method, protocol, dataclass field, and I/O boundary. Avoid `Any` and untyped dictionaries
  at
  stable boundaries; allow provider-local dynamic data only while parsing it immediately into typed records.
- Prefer focused functions and immutable values. Avoid hidden globals, mutable module state, boolean mode parameters,
  and
  inheritance used only for code reuse.
- Use a concise PEP 257 docstring on every touched public module boundary, class, function, method, protocol, and
  non-obvious algorithm. Document intent, invariant, provider quirk, or failure semantics, not syntax. Trivial private
  helpers do not require ceremonial docstrings.
- Keep files in English. Provider terms may retain their official spelling.
- Review a module above 250 lines, a function above 40 lines, or an object coordinating more than five collaborators;
  split by responsibility when that makes behavior clearer, never only to satisfy a number.

## Dependencies And Tooling

- Preserve the current application-specific dependency mechanism until a dedicated task authorizes packaging changes.
- Nx remains a thin command orchestrator. Python owns execution, tests, syntax checks, and dependency resolution.
- Use the repository-pinned Ruff release as the only Python formatter, import sorter, and baseline linter. Let
  `ruff check --fix` and `ruff format` apply their stable Python 3.12 rules; do not hand-maintain an overlapping style,
  Black, isort, or Flake8 configuration.
- Keep Ruff in development dependencies and expose `lint`, `format`, and `format-check` through thin Nx targets. Never
  install it in a production image solely to verify source style.
- Do not combine source refactoring with uv workspace adoption, an Nx Python plugin, Docker redesign, unrelated
  dependency upgrades, type-check tool adoption, or generated clients.
- Never commit virtual environments, caches, credentials, generated files, captured private payloads, or runtime logs.

## Refactor Discipline

- Never rewrite a scraper from a blank design. Treat legacy behavior as an executable oracle.
- Characterize a seam before moving it: controlled provider input, normalized records, decisions, ordered writes,
  retries, failure outcome, and observable lifecycle behavior.
- Run legacy and replacement logic on the same controlled inputs and compare semantic outputs before switching the path.
- Keep only one production path active. Differential execution belongs to tests or a no-write local harness.
- Move one behavioral seam at a time. Do not mix provider parsing, write semantics, scheduling, and packaging in one
  task.
- Delete legacy code only after focused parity, the scraper suite, import/startup checks, and the required local smoke
  pass.

## Verification

Follow `python-scraper-testing-policy.md`. At minimum run syntax checks, the owning scraper suite, exact
internal-request
serialization, offline fixtures, import/startup behavior, relevant Nx targets, and `git diff --check`. Run controlled
local API smokes when production code changes; never call production services or write to external providers.
