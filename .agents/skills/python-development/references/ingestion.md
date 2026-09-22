# Provider ingestion

## Scope and ownership

Use this reference only for provider parsing, synchronization, reconciliation and scheduled ingestion. General feature, model and dependency decisions follow [architecture](architecture.md); conversions follow [mapping](mapping.md); client/task and failure lifecycle follows [runtime](runtime.md). Read those only for the responsibilities being changed.

Provider raw models, HTTP/HTML/CSV parsing and vocabulary stay in the provider adapter. The application's source port returns an application-owned normalized observation, not an infrastructure model, HTML string or parser node. Do not create empty layers or a universal provider abstraction.

## Parsing, contracts and writes

Separate download, decode, parse, normalize, match and internal writes. A parser takes controlled text/bytes/document input and returns typed provider records without network calls. Keep provider encodings, vocabulary, quirks and markup inside the provider adapter.

Generated internal clients and object models remain in the internal API adapter. Exact contract-owned enums may be reused in the application; provider vocabularies and pure domain values keep their own owner. Apply the explicit boundary conversions from the mapping reference; do not create transport mirrors or import a provider mapper into application code.

Preserve source priority, aliases, missing values, malformed-record treatment, dates, identifiers and matching fallbacks unless the task accepts a correction. Name pure policies for decisions. Do not create a universal parser for unrelated providers.

Represent create/update/replace/skip/no-op and authoritative-completeness decisions explicitly. An unavailable or partial provider response is not an authoritative empty dataset: never convert a failure into emptiness that drives deletion or replacement. Keep idempotence, write order, batching and partial-failure semantics visible.

## Authoritative catalogue replacement

Recording selected observations and replacing an authoritative catalogue have different write semantics. Replacement needs explicit completeness evidence; a successful partial read does not establish that evidence.

| Step                 | Catalogue-specific responsibility                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider adapter     | Validate the supplied completeness marker and every consumed record; return an immutable normalized application observation with its completeness.                       |
| Application          | Reject an incomplete observation before invoking replacement. A valid authoritative empty catalogue can still be published when the accepted behavior permits it.        |
| Mapping              | Convert accepted application values to the generated publication request; preserve zero/absence semantics chosen by the use case.                                        |
| Internal API adapter | Perform the documented write once. An unusable response leaves its outcome uncertain; no implicit whole-run retry.                                                       |
| Tests                | Distinguish complete data, complete empty data, partial data, malformed input, read failure and cancellation before write. Assert replacement calls and forbidden calls. |

Do not infer completeness from a nonempty list, successful HTTP status or successful parsing alone. The meaning of “available,” zero-quantity records, duplicate identifiers and replacement/deletion effects requires the provider and product contract. State unresolved semantics before a destructive operation rather than inventing them. The scheduler calls the same application operation; schedule and overlap policy remain project-owned.

## Runtime

Bound concurrency and prevent overlapping scheduled runs according to accepted behavior. Share and close HTTP clients. Own and await every task; test cancellation and shutdown. Retry idempotent I/O, not the entire reconciliation/writing sequence. Preserve actual schedules, timeouts, backoff, TLS, proxy and startup settings unless explicitly changed.

Catch unexpected failures once at the run/process boundary with safe context. Summarize outcomes and bounded failures; no per-record success noise or raw provider data. Logging cannot change decisions.

## Refactoring evidence

Characterize the old seam before replacement. Feed old and new implementations the same sanitized fixtures and compare typed normalized records, reconciliation decisions, request values, ordered writes and failure/cancellation outcomes. Differences block replacement unless they are accepted and tested corrections. Never run two production implementations as active writers.

Fixtures are reviewed controlled inputs, never silently refreshed from live providers. Run the owning tests and configured verification target, affected client generation and controlled local integration only where needed.
