# Python Over-Engineering Audit

Use this runbook to inspect both Python scrapers for unnecessary abstraction without changing code, fixtures, schedules,
providers, or Blockout data.

## Authority

Read the Python scraper architecture and testing policies, logging policy, contract-first policy, and
`karpathy-guidelines`. Characterized scraper behavior remains the executable oracle.

## Procedure

1. Inventory composition roots, application use cases, protocols, domain values, provider adapters, Blockout adapters,
   scheduling, observability, configuration, tests, and generated clients.
2. Search for:
   - protocols with one concrete use and no meaningful test seam;
   - managers, processors, services, repositories, factories, registries, plugin systems, or base classes without an
     active variability boundary;
   - generic serializers or universal parsers across providers with different semantics;
   - wrappers that only rename generated models, HTTPX clients, records, enums, or primitives;
   - boolean mode parameters, hidden globals, import-time work, nested event loops, or unowned background tasks;
   - caching or memoization of cheap parsing/configuration without lifetime and invalidation evidence;
   - typed aliases, generics, dataclasses, or helpers that add indirection without an invariant;
   - duplicated provider normalization that should be one named local policy;
   - tests that freeze implementation shape instead of parsing, decisions, writes, lifecycle, or failure behavior.
3. Trace each candidate across imports, scheduled paths, retries, writes, tests, and generated boundaries.
4. Compare controlled input/output behavior and discard candidates that cannot be simplified safely.
5. Deduplicate active work and separate correctness defects from optional cleanup.

## Publication And Result

Publish findings only in a separate authorized phase with exact files, characterized behavior, simpler target,
provider-specific risks, Workset, and validation. Never call production providers or Blockout APIs. A no-op is valid.
