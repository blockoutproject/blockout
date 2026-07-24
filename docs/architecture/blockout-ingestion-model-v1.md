# Blockout Ingestion Model V1

This model defines the current Python scraper responsibilities and provider-safety boundaries.

## Applications

- `club-scraper` ingests FFVB club address-book data.
- `competition-scraper` ingests FFVB regional, departmental, national, and professional competition data, with LNV
  and DataProject enrichment where supported.
- Each application owns one local `scraper` package, a small composition root, offline tests, and source-derived
  sanitized fixtures.

## Internal Layers

- `application` owns orchestration, owner lookups, create/update/no-op decisions, and safe reconciliation.
- `domain` owns provider-independent rules only when a real rule exists.
- `infrastructure/blockout` owns generated Blockout clients, authentication, and owner-facing mappings.
- Provider adapters own HTTP, decoding, parsing, retries, throttling, and immutable provider records.
- Scheduling, configuration, and observability remain process adapters.

## Provider Safety

- Status checks fail closed.
- Provider timeouts, malformed documents, partial crawls, and isolated pool or club failures do not authorize
  destructive reconciliation.
- Missing-resource cleanup runs only after complete, structurally valid observations for the selected source.
- Provider-specific encodings, identifiers, source priorities, and parsing rules remain inside the provider boundary.
- Source-derived fixtures retain the structural evidence needed by parsers while replacing personal or sensitive
  values with deterministic test data.

## Ownership And Contracts

- Scrapers never own clubs, teams, pools, matches, associations, configuration, or scraper status.
- Shared generated Python models and HTTPX clients own Blockout transport shape.
- Provider records are mapped explicitly to purpose-specific owner requests.
- Application policies such as provider priority remain local and must not be mistaken for contract enums.

## Validation

Ruff owns Python formatting and linting, pytest owns application behavior, and syntax checks protect importable runtime
code. Nx exposes the owning targets while uv remains authoritative for dependency and interpreter execution.
