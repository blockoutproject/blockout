# Configuration, errors and resource ownership

## Startup settings

For a new durable application use Pydantic Settings with an application-owned settings class. Validate before opening clients, starting tasks or scheduling jobs. Required settings have no fictional defaults. Validate positive limits/timeouts and relevant URL/choice constraints. Small scripts may use argparse and direct checks.

Select the local dotenv path explicitly, and keep the safe `.env.example` consistent with the actual loader. Do not assume `.env.local` is discovered by every tool. Retain and document the application's source precedence; use normal supported Pydantic Settings sources rather than a custom loader framework. In a new simple application, environment variables override the explicitly selected dotenv file; constructor overrides may be used for controlled composition/tests. Test this policy with synthetic values.

Environment strings legitimately need declared conversions to numbers/booleans. That does not authorize permissive coercion of unrelated API JSON. Keep secret values out of reprs, logs and user-facing failures. Use secret-aware fields where appropriate, but do not assume they sanitize every raw input in validation errors. Do not print `ValidationError`, its raw input/context, an environment dump or the complete settings object. Render a bounded safe diagnostic identifying the failed setting/constraint without its value, preserving useful causes internally.

Construct settings once in the entry point and pass relevant values/dependencies to their owners. Do not read os.environ inside business functions or create settings as an import-time singleton. Process startup should fail clearly before I/O when required configuration is invalid; a scheduled run failure is a different event.

## Failure contracts

| Outcome                                              | Representation                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| Normal absence explicitly supported by the operation | Optional result (`None`)                                             |
| Business rejection that stops the operation          | A targeted application/domain exception                              |
| Malformed or contract-invalid external data          | A boundary failure translated by that adapter                        |
| Network or dependency failure                        | A typed application-facing exception with original cause retained    |
| Accepted partial batch outcome                       | An explicit use-case result distinguishing completeness and failures |

Do not introduce a universal Result wrapper, exception hierarchy or catch-all error dictionary. Name exceptions only where callers need a meaningful distinction. Translate a library exception once at its owning boundary using `raise ... from error`; do not expose provider messages, URLs or payloads. A method that returns an empty collection on timeout is lying unless that fallback is the accepted contract, and it must never accidentally enable deletion/replacement.

Catch errors where recovery, translation, cleanup or the terminal outcome is owned. A broad catch may serve a process/job boundary with safe diagnostics, not every helper. Logging occurs at one operational owner and does not change retry/business decisions. Keep cancellation separate from ordinary failures; do not suppress it to emit a successful result. Use `finally`/context managers for cleanup rather than catch/log/rethrow chains.

The use case decides whether individual failures can coexist with successful work. Independent items may continue only with a defined partial-result policy; an authoritative replacement needs explicit completeness evidence. No universal “continue every batch” or “abort every item” rule. A reusable application instance must not leak one run's partial state into the next.

## Actionable diagnostics

Use the project's existing logging boundary. An operational failure identifies the operation, dependency and a useful category such as timeout, invalid external data or uncertain publication. Preserve original causes for handling, but their presence does not authorize rendering their messages, nested causes or payloads. Use a stack trace only through the project's safe diagnostic path; otherwise report bounded safe technical context rather than a generic failure. Do not build a common logger or diagnostic framework for this fallback.

| Situation                                    | Required diagnostic meaning                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid configuration                        | Identify the known parameter and violated constraint, such as “request timeout must be positive,” without the received value.                                           |
| Provider read fails before publication       | Identify the read operation, provider and category; report that no publication started only when the control flow proves it.                                            |
| Publication was sent but cannot be confirmed | Identify the publication and dependency, state that the remote result is unknown, and require reconciliation or established safe repeatability before another mutation. |

Do not turn every write failure into “nothing was written.” Distinguish failures known to precede sending from failures after sending where the outcome is uncertain. Unknown exceptions still need an operation and safe exception category; suppressing raw sensitive details must not erase all diagnostic value. Emit each operational failure at one owner.

## HTTP and asynchronous flow

Keep parsing, pure normalization and mapping synchronous. Use async I/O inside an async flow; do not call blocking HTTP/sleep there. Offload a blocking dependency deliberately when necessary, without pretending a thread makes arbitrary CPU-heavy work scalable. Do not add threads/processes or a task platform without the actual workload requiring it.

The executable owns `asyncio.run`; internal functions neither start another loop nor use nested run_until_complete. Use one client per compatible lifecycle scope, with explicit close/async context management, not one client per record. The scope may be an application lifetime or a controlled run. Bind clients to their actual event loop and credentials/configuration; do not share them across incompatible loops.

Set project-owned connect/read/write/pool timeouts and connection limits. HTTP client limits, the number of active tasks and a whole-operation deadline solve different problems. Keep TLS verification enabled by default; an existing explicit environment exception is not a reusable global convention. Respect the actual generated client's lifecycle and supported HTTPX injection hooks; do not patch generated code to take ownership.

Bound both active work and pending work. A semaphore limits active operations but still allows unbounded task allocation if used around a huge gather. For a small known batch, bounded tasks may suffice; for a large/streaming source use a bounded worker/queue or incremental-batch pattern justified by that workload. Avoid implementing a general scheduler framework.

Use `TaskGroup` for a coherent group when sibling cancellation after an unhandled failure is the intended policy. Do not use it blindly for an independent-item batch that is allowed to finish partially; handle only the accepted per-item failures there and retain completeness information. Account for grouped exceptions at the owner. Every task must be awaited or belong to an explicitly supervised lifecycle; no fire-and-forget work that outlives its scope.

Cancellation must stop further work, propagate to the caller and close resources. Await cleanup of started tasks. Do not turn cancellation into a retry, empty result or success. A timeout after sending a write may leave an unknown remote outcome: cancelling the local call does not roll back a remote commit.

## Retries and scheduling

Retry one declared repeatable I/O operation, with bounded attempts/backoff and a stopping condition. Do not retry an entire read-transform-write sequence, malformed input, a business rejection or a non-idempotent write by default. Read HTTP method names alone do not prove an operation's full idempotency semantics. Preserve cancellation during backoff and avoid nested retries across SDK, adapter and use case. Do not install a retry library for a hypothetical future need.

A scheduler triggers an application operation and owns trigger/lifecycle details, not business rules. Preserve existing scheduler versions and supported APIs; no framework upgrade is implied. The project defines cadence, overlap, missed runs and shutdown behavior. Local locks prevent local overlap only. Do not introduce distributed coordination merely because an application runs periodically; determine whether multiple actual writers require it.

A later scheduled run can repeat an uncertain write even if it is called a new run rather than a retry. The project must explicitly decide how to reconcile that outcome or establish safe repeatability before further automatic mutations. Without that decision, stop the affected mutating workflow and surface the uncertainty; do not silently continue because each individual run makes only one attempt. A local scheduler cannot establish exactly-once delivery. Test the failure-to-next-run policy when it is part of the application.

## Evidence and mechanics

Test invalid startup configuration before operations; environment/file precedence; safe failure rendering; client closure; successive-run independence; cancellation; partial-result safety; and bounded concurrency when affected. Use controlled transports and synchronization events rather than real services or arbitrary sleeps.

Mechanics: [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/), [asyncio tasks](https://docs.python.org/3/library/asyncio-task.html), [HTTPX async clients](https://www.python-httpx.org/async/) and [timeouts](https://www.python-httpx.org/advanced/timeouts/). Actual versions, defaults and operational limits remain project-owned.
