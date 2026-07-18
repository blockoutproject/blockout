# MRG-314 — Generated Python Async Contract Clients

- Status: approved
- Decision date: 2026-07-17
- Transport amendment: 2026-07-17; generated `httpx` supersedes the interim generated `asyncio` transport before
  scraper call migration
- Runtime effect: none; MRG-314 changes documentation and future task structure only
- Applies to: `apps/scrapers/club-scraper`, `apps/scrapers/competition-scraper`, and their Blockout REST adapters

## Decision

Blockout scrapers use fully generated asynchronous OpenAPI clients for Blockout-owned REST calls. Generated models
without generated operations and a handwritten generic HTTP transport are rejected because either option would retain
manual endpoint, serialization, authentication, multipart, and error-contract duplication.

The selected toolchain is exact:

| Tool or runtime                       | Version or value            | Purpose                                 |
| ------------------------------------- | --------------------------- | --------------------------------------- |
| `@openapitools/openapi-generator-cli` | `2.39.1`                    | pinned workspace generation entry point |
| OpenAPI Generator                     | `7.23.0`                    | pinned generator binary                 |
| generator                             | `python`                    | typed Python operations and models      |
| library                               | `httpx`                     | asynchronous Blockout transport         |
| generated Python target               | `3.12`                      | common scraper runtime floor            |
| distribution                          | `blockout-contract-clients` | one internal wheel for six clients      |

No Mustache template is owned by Blockout. The standard generator output is adapted only through supported generator
configuration and handwritten scraper adapters outside generated source.

The generated `httpx` library is selected over the generated `asyncio`/aiohttp library and over
`openapi-python-client`. A generation proof against the Clubs contract shows that OpenAPI Generator's standard
`httpx` output provides async operations, `httpx.AsyncClient`, `trust_env=True`, connection limits, proxy support,
per-call timeouts, explicit async close, Bearer authentication, and multipart files. It also avoids coupling the
Blockout transport to `aiohttp-retry`. Provider and federation traffic remains on the scrapers' existing aiohttp
sessions, making the required ownership split explicit.

`openapi-python-client` is not selected because its own project still documents incomplete OpenAPI feature coverage.
Introducing a second generator would also discard the already-proven operation and multipart coverage without a
Blockout requirement it solves better. The small workspace Node entry point is orchestration only: it invokes the
official pinned generator for six configs and may normalize formatting, but it may not synthesize models, operations,
transport, authentication, or serialization.

## 1. Ownership And Package Layout

MRG-330 creates the handwritten distribution boundary at `libs/shared/contracts/clients/python`:

```text
libs/shared/contracts/clients/python/
├── pyproject.toml
├── README.md
├── config/
│   ├── clubs-service.json
│   ├── competition-service.json
│   ├── config-service.json
│   ├── matches-service.json
│   ├── pools-service.json
│   └── teams-service.json
└── src/
    └── blockout_contract_clients/
        ├── clubs_service/
        ├── competition_service/
        ├── config_service/
        ├── matches_service/
        ├── pools_service/
        └── teams_service/
```

`pyproject.toml`, the package README, generator configuration, wheel commands, and repository guards are handwritten.
Everything under `src/**` is generated, ignored by Git, deterministically formatted, and forbidden to manual editing.
Each service package has a distinct Python namespace but all six ship in the one private wheel
`blockout_contract_clients`/`blockout-contract-clients`.

The authoritative inputs are the generated v2 bundles produced from committed source fragments:

| Generated package     | OpenAPI input                                            |
| --------------------- | -------------------------------------------------------- |
| `config_service`      | `libs/shared/contracts/generated/specs/config.json`      |
| `clubs_service`       | `libs/shared/contracts/generated/specs/clubs.json`       |
| `teams_service`       | `libs/shared/contracts/generated/specs/teams.json`       |
| `pools_service`       | `libs/shared/contracts/generated/specs/pools.json`       |
| `competition_service` | `libs/shared/contracts/generated/specs/competition.json` |
| `matches_service`     | `libs/shared/contracts/generated/specs/matches.json`     |

Reports, users, notifications, search, and mobile-gateway packages are not generated for scrapers because the audited
scraper call graph does not consume them. Provider/federation clients are never generated from Blockout contracts.

## 2. Generator Configuration

Every service configuration fixes:

- `generatorName: "python"`;
- `library: "httpx"`;
- `packageName: "blockout_contract_clients.<service_package>"`;
- `packageVersion` equal across all six outputs and owned by the internal distribution;
- `pythonVersion: "3.12"`;
- `hideGenerationTimestamp: true`;
- `generateSourceCodeOnly: true`;
- `disallowAdditionalPropertiesIfNotPresent: false`;
- the service-specific output directory under `src/blockout_contract_clients/**`;
- no generated tests, documentation site, package metadata, or standalone distribution;
- no custom template directory or post-generation semantic rewrite.

The root workspace pins CLI `2.39.1`; its committed version-manager configuration pins OpenAPI Generator `7.23.0`.
MRG-330 exposes `@blockout/contracts:generate-python-clients`, makes it depend on all six generated REST bundles, and
runs the six configurations in a stable service order. Two clean executions must leave the worktree unchanged.

Generated code is an adapter artifact, not application or product authority. A generator limitation must be resolved
through an upstream-supported option, source-contract correction, or an explicit revision to this decision; it must
not produce a handwritten fork of generated transport code.

## 3. Casing And Model Boundary

Python application identifiers remain idiomatic `snake_case`. Canonical Blockout v2 JSON, query, path, and multipart
JSON keys remain `camelCase`. The generator's field aliases are the sole translation between those forms.

The following are forbidden after the owning operation migrates:

- recursive snake/camel dictionary converters;
- handwritten wire-name maps;
- direct `dataclasses.asdict()` serialization onto a Blockout wire;
- response dictionaries hydrated by exact application dataclass field names;
- generated model instances escaping into scraper parsing, caches, schedulers, provider adapters, or business rules.

Each scraper owns a thin Blockout adapter per service family. The adapter converts application values to generated
operation arguments/models immediately before the call, invokes the generated operation, and maps the generated result
back to scraper-owned application models immediately after it. Create/update/null/omission distinctions remain
explicit in those two directional mappings.

## 4. Sessions, Timeouts, Proxies, And Lifecycle

Blockout service traffic and provider/federation traffic use separate session ownership. Generated Blockout clients
must not reuse the provider session whose retries, TLS exceptions, cookies, or payload behavior belong to FFVB/LNV.

The scraper-owned Blockout client factory preserves:

- `trust_env=True` so the current environment proxy contract remains effective;
- the current bounded connector limit of 20 unless a later parity task approves another value;
- the operation-family total timeouts captured from current behavior, including the short status probe and each
  scraper's established main Blockout timeout;
- one explicit generated API-client lifecycle per scraper run or status probe;
- deterministic asynchronous close in normal completion, error, cancellation, and scheduler shutdown paths;
- no global singleton session and no session construction inside generated operation calls owned by application code.

MRG-378 must prove how the standard generated `httpx` library exposes client lifecycle, connection limits, proxy,
timeout, multipart, and close controls before either scraper migrates. The proof may use the generator's supported
configuration and client lifecycle only; it may not replace the generated transport with a generic handwritten HTTP
client.

No automatic retry is configured for Blockout calls. Current provider page/CSV retry loops remain provider-owned and
unchanged. A later operation may add an explicit idempotent Blockout retry only through a separate behavior decision.

## 5. Auth0 Boundary

Auth0 client-credentials ownership remains in each scraper. Auth0 SDK models, audience, client ID/secret, refresh
scheduling, and token failures never enter generated packages.

Immediately before a generated Blockout call, the adapter obtains the current M2M access token from the scraper-owned
token supplier and installs it into the generated client's Bearer security configuration. An expired or missing token
is refreshed through the existing Auth0 owner before the call. Generated configuration is not a long-lived source of
token truth, and tokens are never logged or included in mapped error bodies.

## 6. Multipart And File Ownership

Club create/update and team update use the generated multipart operation signatures. Canonical JSON parts and image
parts are represented by the source OpenAPI contract; the adapter does not construct an untyped generic multipart
request or serialize a snake_case dictionary into `data`.

The owning scraper adapter:

- converts application values to the generated multipart JSON model;
- opens image handles as late as possible;
- supplies filenames and content types required by the generated signature;
- closes every handle deterministically after success, failure, or cancellation;
- preserves absence versus empty-file and create versus update behavior;
- never places provider download handles or response streams in generated application models.

## 7. Error Translation

Generated exceptions are caught only at the Blockout adapter. They map to a scraper-owned `BlockoutApiError` carrying:

- HTTP status when available;
- stable Problem Details `code` when safely parseable;
- request identifier from the canonical response/header contract when available;
- a bounded, sanitized body or fallback reason suitable for operational handling;
- the original exception as an internal cause without serializing credentials or raw sensitive content.

Application and scheduler code branch only on the scraper-owned error. They do not import generated exception classes,
parse generator-specific fields, or log raw response bodies. Transport failures without an HTTP response map to the
same boundary with no invented status or code.

## 8. Docker And Wheel Installation

MRG-330 changes both scraper Docker builds to use the monorepo root as build context. Each image builds or copies the
local `blockout-contract-clients` wheel in a deterministic build stage, installs that wheel with the scraper's pinned
requirements, then copies only its owning scraper source and required runtime artifacts.

The wheel is local and immutable within the image build. It is not published to PyPI or another external package
registry. Docker cache boundaries must invalidate when the Python client source, wheel metadata, REST bundle, generator
configuration, or scraper requirements change. Standalone scraper repositories remain untouched.

## 9. Migration Ownership

| Task    | Responsibility                                                                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MRG-330 | activate pinned six-client generation, common wheel, root-context image installation, lifecycle factory, deterministic checks, and fixtures for all 24 audited Blockout operations |
| MRG-378 | replace the interim generated `asyncio` output and factories with standard generated `httpx` clients, then re-prove the complete MRG-330 transport gate                            |
| MRG-348 | replace the club scraper's six Blockout operations with thin generated `httpx` client adapters; delete only their legacy request/response conversion paths                         |
| MRG-349 | replace the competition scraper's eighteen Blockout operations with thin generated `httpx` client adapters; delete only their legacy request/response conversion paths             |
| MRG-601 | audit post-migration boundaries, shared adapter reuse, session ownership, scheduler/proxy behavior, and separation of the eleven provider/federation calls                         |
| MRG-802 | enforce pinned generation, wheel build, ignored-output determinism, syntax, adapter isolation, and both root-context scraper image builds in CI                                    |

MRG-431 amends only output ownership: Python sources and REST bundles are regenerated from authoritative sources in
local, CI, image, and packaging boundaries and never tracked by Git, matching Maaatch.

The 24-operation total is the MRG-303 baseline: six club-scraper Blockout operations and eighteen competition-scraper
Blockout operations. The eleven provider/federation calls stay outside generation.

## 10. MRG-330 And MRG-378 Proof Gate

MRG-330 established the first generated-client baseline with the standard `asyncio` library. Before a scraper call
migrates, MRG-378 replaces that interim transport with the standard `httpx` library and re-proves with Python 3.12
fixtures and generated code:

- all six packages import from the one installed wheel;
- two clean generations produce no diff and generated-source guards pass;
- all 24 audited operation IDs resolve to generated asynchronous methods;
- camelCase JSON request/response aliases map to snake_case generated attributes;
- lists, query/path values, empty bodies, and `204` responses preserve current semantics;
- generated multipart signatures send the required JSON and image parts and close handles;
- the scraper-owned Auth0 token supplier configures Bearer auth immediately before calls;
- `trust_env=True`, connector limits, timeouts, cancellation, and explicit close work as documented;
- Blockout calls have no implicit retry while provider retries remain untouched;
- generated exceptions map to status, safe code, request identifier, and sanitized body;
- generated types do not escape the adapter boundary;
- both root-context scraper images install the local wheel and start their existing entry points.

MRG-314 does not add a dependency, generator configuration, wheel, Docker change, Python model, adapter, network call,
or runtime behavior.

## References

- [OpenAPI Generator Python generator](https://openapi-generator.tech/docs/generators/python/)
- [OpenAPI Generator CLI package](https://github.com/OpenAPITools/openapi-generator-cli)
- [OpenAPI Generator release adding async httpx support](https://github.com/OpenAPITools/openapi-generator/releases/tag/v7.16.0)
- [openapi-python-client feature and coverage statement](https://github.com/openapi-generators/openapi-python-client)
