# MRG-378 Python HTTPX Transport Migration

- Status: implemented in the monorepo shadow baseline
- Owner: shared contracts and scraper Blockout client foundations
- Generated packages: config, clubs, teams, pools, competition, and matches
- Production effect: none

## Purpose

MRG-378 replaces the temporary OpenAPI Generator `asyncio`/aiohttp output established by MRG-330 with the pinned
generator's standard asynchronous `httpx` library before either scraper migrates a Blockout operation. The six
service packages remain one internal Python 3.12 wheel, and every model, operation, serializer, authentication rule,
and transport implementation remains generator-owned.

This task does not migrate the club scraper's six calls or the competition scraper's eighteen calls. MRG-348 and
MRG-349 retain that ownership. Provider and federation requests remain on the scrapers' existing aiohttp sessions.

## Generated Transport Boundary

All six generator configs now select `library: "httpx"`. Two direct clean generations through the pinned OpenAPI
Generator CLI produce the same complete source diff. No custom template directory, Mustache override, handwritten
generated source, or semantic post-processing is present.

The generated REST clients use `httpx.AsyncClient` with `trust_env=True`, an optional generated proxy, the configured
connection limit, per-call timeout forwarding, multipart JSON and file encoding, and asynchronous close. The common
wheel declares `httpx>=0.28.1,<1` and no longer declares aiohttp or aiohttp-retry. The standard generated
`Configuration` still exposes a generic unused `retries` field, but the HTTPX transport does not consume it and the
scraper factories no longer configure it; Blockout calls therefore have no automatic retry layer.

## Scraper Factory Policy

Both scraper-owned Blockout factories retain one explicit generated client per run or status probe, a connection
limit of 20, their existing operation-family timeout, per-call Auth0 token refresh, deterministic asynchronous close,
safe generated-exception mapping, and cancellation propagation. The club run timeout remains 60 seconds; club status,
competition status, and competition run timeouts remain 10 seconds.

The factory boundary accepts generated configuration and client types without importing service packages into the
scraper foundation. Generated types still cannot escape that boundary. Existing scraper `requirements.txt` files
continue to declare aiohttp for provider traffic, and no provider request, retry loop, scheduler, or federation client
changes in this task.

## Verification Evidence

- Python 3.12-compatible tests import all six packages from the common distribution and resolve all 24 audited
  operation IDs to generated coroutine methods.
- Model and serializer fixtures prove snake_case application attributes, canonical camelCase wire aliases, list/query
  and path serialization, empty pages, and `204` response semantics.
- A generated Clubs multipart request passes canonical JSON and image bytes through an actual `httpx.MockTransport`,
  including the per-call timeout, and releases the source file handle before deletion.
- Transport fixtures prove `trust_env=True`, explicit proxy construction, a connection limit of 20, per-call timeout
  support, asynchronous close, and absence of a retry wrapper across all six generated REST packages.
- Factory fixtures prove a fresh Bearer token before every call, both scraper timeout profiles, cancellation
  propagation, deterministic close, and sanitized generated-error mapping.
- The wheel metadata contains all six packages and only the supported HTTPX transport dependency. Both root-context
  scraper images build, import their required generated packages, and contain both aiohttp `3.14.1` for provider
  traffic and httpx `0.28.1` for Blockout traffic.
- Generated-source isolation, standard-generator markers, absence of custom templates, scraper syntax checks,
  documentation validation, Maaatch comparison, and whitespace checks remain publication gates.

## Closed Scope

- No scraper Blockout call, provider/federation call, route, payload, scheduling rule, retry loop, standalone
  repository, production service, deployment, database, event, Expo source, backend source, or Maaatch file changes.
- No MRG-348 or MRG-349 caller migration is pulled forward.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
