# Python Scraper Architecture Policy

Read this before changing a Python scraper, its models, parsing, orchestration, dependencies, task targets, or internal
API calls. Scrapers are critical backend applications: the current implementation is the behavioral reference until
focused tests prove an intentional replacement.

## Structure

Keep each scraper independently deployable in the application location selected by the repository profile. A
refactored scraper uses one importable application package, a small root entrypoint, explicit application, domain,
infrastructure, configuration, and observability roles, and the test roles selected by the repository profile.

Create only directories that own real code. A scraper omits every unused provider boundary. Do not create generic
`utils`, `helpers`, `common`, `manager`, `processor`, or `services` packages. Name reusable behavior by its role:
parser, normalizer, policy, client, source, writer, scheduler, or use case.

Delete empty legacy directories. Keep a `.gitkeep` only when the accepted scraper architecture requires an empty
location before its first implementation; never create a complete provider or test skeleton for hypothetical work.

Each application uses the succinct local package name configured by the repository profile. The owning application
directory supplies the necessary context. Run and test each application from its own root; do not combine sibling
local packages on one Python import path.

## Roles

- The root entrypoint is composition only. Load configuration, construct adapters and use cases, install lifecycle
  handling, and start the application.
- The application role owns scrape use cases, orchestration, ports, explicit commands, and run results. It decides what
  should be read or written but does not parse HTTP payloads or construct transport requests inline.
- The domain role owns pure typed values, local policies, comparison rules, and invariants. Keep normalized scraper
  working models there when they have lifecycle or reconciliation semantics distinct from HTTP transport. It has no
  application, generated-client, HTTP-client, scheduler, file, environment, metrics, or provider dependency.
- The internal infrastructure adapter owns authentication and clients for repository service APIs, including
  handwritten transport mirrors until contract generation is activated. After adoption, generated imports and
  transport mappings stay in this adapter; application code depends on domain-shaped ports instead.
- Each provider infrastructure adapter owns provider HTTP access and parsing. Provider vocabulary and payload names
  remain confined there.
- The scheduling infrastructure adapter owns scheduler and process-lifecycle integration, never scrape rules.
- The configuration role owns immutable typed settings assembled from environment variables at startup.
- The observability role owns metrics and logging setup, without business decisions.

Use protocols at real outbound seams that tests or multiple adapters must replace. Do not introduce an interface for a
pure local helper or add a dependency-injection framework.

Scrapers keep the domain independent and keep generated/internal transport inside the configured internal adapter.
Application workflows depend on a domain-shaped internal port, never on generated packages or adapter functions. A
provider-specific workflow may consume a typed provider record or parser directly when adding another protocol would
only hide a single concrete source behind indirection. Provider vocabulary must not leak into domain models or the
internal adapter. Prefer one cohesive internal port per scraper over one protocol per endpoint when that keeps the
workflow readable.

## Internal Contract Ownership

Scrapers consume the owner endpoints declared by the repository profile. Their internal HTTP types are transport
contracts, not scraper-owned domain models.

- OpenAPI transport types use explicit names such as `ResourceInternalResponse`, `CreateResourceInternalRequest`, and
  `UpdateResourceInternalRequest` according to the actual owner endpoint.
- Match the owner service exactly for field names, types, enum values, nullability, nesting, and request semantics.
- Never add scraper-only fields to an internal transport type or maintain a second almost-identical resource model.
- Purpose-specific requests may be smaller than the complete resource when the owning endpoint defines that shape.
- Keep provider records explicit, for example `ProviderResourceRecord`; they are not internal contracts.
- Use a distinct domain value only when it expresses different semantics, such as mutable candidate state,
  reconciliation state, provider-normalized values, or calculated ranking totals. A pure owner resource with no local
  semantics remains a generated transport type inside the repository adapter rather than another copy.

Before an owning vertical is adopted, an exact handwritten mirror may exist only as a temporary characterized seam.
The vertical then generates every consumer from the same internal OpenAPI source using the locations and commands
declared by the repository profile; generated sources remain untracked, and the scraper deletes the temporary mirror.

Once a contract is adopted:

- no handwritten `*InternalRequest` or `*InternalResponse` mirror remains in a scraper;
- generated models and API classes are imported only inside the configured internal adapter;
- the adapter maps generated responses immediately to domain values and maps domain values to generated requests;
- application ports and use cases never mention generated packages, HTTP clients, or transport enums;
- an available generated operation replaces a manual repository HTTP call instead of wrapping the same route again.

Contract-owned enums follow the owner service. Application-only policy remains local to the owning scraper.
Provider-owned enums remain provider-specific.

## Provider Parsing And Normalization

- Separate download, decoding, parsing, normalization, matching, and repository writes.
- A parser accepts controlled text, bytes, or a parsed document and returns typed provider records without network I/O.
- Preserve provider encodings, identifiers, missing-value rules, and malformed-record behavior unless a task explicitly
  authorizes a correction.
- Make name aliases, division mappings, source priority, score interpretation, date parsing, and matching fallbacks
  named
  policies with focused tests.
- Do not pass BeautifulSoup nodes, XML elements, CSV rows, or provider dictionaries into application or repository client
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
- Preserve the order, batching, concurrency, and failure isolation of repository writes until tests prove an intentional
  change.
- Express create/update/no-op decisions explicitly. Repeated identical input must retain the current idempotent outcome.
- Do not compensate, delete, deactivate, or overwrite data unless the current characterized flow performs that action.

## Python Code And Documentation

- Use the Python version pinned by the repository profile, modern built-in generics, `X | None`, dataclasses or focused
  value objects, enums, pathlib, context managers, and explicit return types where they improve the boundary.
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

## Simplicity And Over-Engineering Guardrails

- Prefer a direct typed expression, loop, comprehension, dataclass, protocol, or focused function over a framework.
- Let inference handle obvious locals. Add aliases and generic parameters only when they clarify a stable boundary.
- Do not wrap a provider record, generated model, HTTPX client, enum, or primitive only to rename it.
- Create a helper when it gives one invariant or repeated transformation a meaningful owner, not merely to shorten a
  caller.
- Do not add generic serializers, universal parsers, service locators, dependency-injection containers, managers,
  registries, factories, plugin systems, broad base classes, or repositories for hypothetical providers.
- Use a protocol only when tests or multiple active implementations need the behavioral boundary.
- Prefer composition over inheritance. A provider adapter should expose its actual behavior rather than inherit empty
  hooks from a universal scraper template.
- Do not cache inexpensive parsing, mapping, or configuration reads without measured need and an explicit lifetime and
  invalidation design.
- Avoid boolean mode arguments. Use two focused operations or a small owned enum when modes are distinct behavior.
- Keep configuration declarative but local to the owning adapter. Do not build a configuration language for control
  flow.
- Delete an obsolete abstraction when its final consumer is removed and parity evidence proves it is no longer needed.

## Dependencies And Tooling

- Preserve the current application-specific dependency mechanism until a dedicated task authorizes packaging changes.
- The workspace task runner remains a thin command orchestrator. Python owns execution, tests, syntax checks, and
  dependency resolution.
- Use the repository-pinned formatter and linter as the only style authority; do not hand-maintain overlapping tool
  configurations.
- Keep formatting and lint tools in development dependencies and expose them through the task runner selected by the
  repository profile. Never install them in a production image solely to verify source style.
- Do not combine source refactoring with workspace packaging adoption, a task-runner plugin, Docker redesign, unrelated
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
internal-request serialization, offline fixtures, import/startup behavior, relevant task targets, and the repository
diff-hygiene check. Run controlled local API smokes when production code changes; never call production services or
write to external providers.
