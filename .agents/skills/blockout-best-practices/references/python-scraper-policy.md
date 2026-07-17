# Python Scraper Policy

The competition and club scrapers are standalone Python deployables represented by explicit Nx projects.

- Do not add a Python Nx plugin by default.
- Keep requirements, Dockerfile, scheduler, Auth0 client-credentials flow, proxy behavior, and Prometheus port owned
  by the scraper.
- Preserve scheduler frequency and enabled/disabled gating unless an explicit runtime task changes them.
- Use async HTTP clients consistently and keep bounded timeouts and concurrency.
- Never log tokens, credentials, proxy passwords, or raw sensitive responses.
- Keep proxy credentials in environment files or deployment secrets.
- No scraper test suite is currently collected. Run the Nx syntax check and build the owning Docker image after
  packaging changes; do not report pytest as passing until real tests exist.

## Blockout Contract Clients

Follow [MRG-314](../../../../docs/decisions/mrg-314-python-contract-clients.md) for Blockout-owned REST traffic. The
approved target is OpenAPI Generator `7.23.0` through `@openapitools/openapi-generator-cli` `2.39.1`, using the Python
generator with its `asyncio` library and Python 3.12.

- Generate all six service clients into the committed `blockout-contract-clients` wheel under
  `libs/shared/contracts/clients/python`; everything below that package's `src/**` is generated and must not be edited.
- Keep Python application identifiers snake_case. Generated aliases alone map them to camelCase Blockout v2 wire keys;
  do not add a recursive case converter or serialize application dataclasses directly onto a Blockout wire.
- Put each generated service client behind a thin scraper-owned Blockout adapter. Map application values to generated
  inputs immediately before a call and map generated results back immediately after it.
- Do not let generated models or exceptions enter parsing, scheduler, cache, federation, or business-rule code.
- Keep Blockout sessions separate from FFVB/LNV/provider sessions. Preserve `trust_env=True`, bounded connector limits,
  operation-family timeouts, cancellation, and explicit asynchronous close.
- Keep Auth0 client-credentials and refresh ownership in the scraper. Supply the current token to generated Bearer
  configuration immediately before Blockout calls; never persist or log it from generated configuration.
- Use generated multipart signatures for Blockout JSON and image parts. The adapter owns file open/close, filename,
  content type, absence/empty semantics, and application-to-generated mapping.
- Configure no automatic retry for Blockout calls. Existing provider page and CSV retries remain provider-owned.
- Translate generated failures at the adapter into a scraper-owned error with status, safe stable code, request ID,
  bounded sanitized body, and internal cause.

Provider and federation traffic is outside the Blockout generator. Preserve its native casing, retry, TLS, cookie,
form, CSV, and SignalR behavior until the owning scraper architecture task changes it explicitly.

## Generation And Packaging Gates

MRG-330 owns generation activation, the common local wheel, root-context Docker builds, and fixtures for all 24 audited
Blockout operations. MRG-348 and MRG-349 own the two runtime migrations. Until those tasks complete:

- current handwritten calls remain authoritative for their operation slices;
- do not mix generated and handwritten serialization within one operation;
- do not delete legacy converters used by an unmigrated operation;
- do not publish the internal wheel externally;
- do not modify standalone scraper repositories.

After packaging or generated-client changes, prove Python 3.12 syntax/imports, deterministic no-diff generation, wheel
installation, adapter isolation, both root-context Docker image builds, and the behavior fixtures required by MRG-314.
