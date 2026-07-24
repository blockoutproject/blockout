# Ingestion Decisions

The following decisions are active:

- Provider evidence is immutable before it reaches application orchestration.
- Status failures, provider outages, malformed sources, and partial observations fail closed for destructive cleanup.
- A scraper maps provider records to generated owner requests and never becomes the resource owner.
- Provider-specific encodings, identifiers, source priorities, parsing, retry behavior, and throttling remain adapter
  concerns.
- Sanitized source-derived fixtures protect parser behavior without retaining personal or sensitive values.

The current boundary model lives in
[`blockout-ingestion-model-v1.md`](../../architecture/blockout-ingestion-model-v1.md). A change to provider priority,
destructive reconciliation, or owner behavior requires an explicit issue and source-backed tests.
