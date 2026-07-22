# Blockout Logging Policy

Read this reference before adding, changing, or keeping logs in Java, Python, or Expo code.

## Core Rule

Every committed log must help diagnose a real failure, explain an operational state change, or operate a scheduled or
external integration. Do not add decorative entry/exit tracing, payload dumps, or routine per-record success noise.

Blockout currently writes structured JSON to standard output. Java uses Logback with the Logstash encoder and structured
arguments; both scrapers use their `observability` logging boundary. The mobile application has no shared production
logging backend and must not invent one during ordinary feature work.

## Levels

- `INFO`: application startup or shutdown, scheduled-run outcome, important state transition, batch summary, or external
  integration outcome useful in normal operation.
- `WARN`: expected but important degradation, retry, skipped malformed provider state, translated downstream failure,
  partial batch failure, or recoverable conflict.
- `ERROR`: unexpected technical failure, dependency unavailability, or failure preventing an operation from completing.
- `DEBUG`: safe diagnostic context for reads, orchestration choices, cache decisions, and per-record detail needed only
  during investigation.
- `TRACE`: temporary local investigation only; remove it before publication unless a module explicitly owns trace
  semantics.

## Safe Context

Prefer stable technical identifiers, operation names, dependency names, bounded counts, statuses, durations, retry
numbers, and provider families. Never log:

- authorization headers, access or refresh tokens, cookies, credentials, client secrets, private keys, or signed URLs;
- complete request/response bodies, raw provider pages, CSV/XML/HTML payloads, database rows, or exception messages that
  embed those payloads;
- names, email addresses, phone numbers, postal addresses, notification contents, profile data, device tokens, raw JWT
  claims, or other personal data;
- environment dumps or complete configuration objects.

## Placement And Failure Ownership

- Log where an event becomes operationally meaningful: application boundary, scheduler, message listener/publisher, or
  external adapter.
- Do not log the same success or failure in controller, application service, and adapter.
- Do not catch an exception only to log and rethrow it. Add a log only when the layer contributes unique actionable
  context or intentionally absorbs/degrades the failure.
- Preserve the throwable for unexpected Java and Python failures. Do not reduce it to a string-only message.
- Avoid successful per-resource `INFO` logs. Summarize the batch or use `DEBUG` for targeted diagnosis.

## Java

- Use SLF4J through the existing Logback stack.
- Use parameterized messages and the existing `StructuredArguments.keyValue(...)` fields. Do not concatenate values into
  messages.
- Keep stable machine field names and operation values consistent within a service. Existing snake_case log field names
  are observability protocol fields, not API JSON, and remain valid.
- JSON console output is the current runtime contract. Do not add local files, OpenTelemetry, remote sinks, appenders,
  correlation middleware, or monitoring dependencies without a dedicated task.

## Python Scrapers

- Emit structured JSON through the scraper's `observability` boundary. Application and adapters must not configure the
  root logger independently.
- Include scraper name, provider or dependency, operation, outcome, counts, and duration when useful.
- Serialize known typed values safely; do not turn arbitrary objects or provider payloads into log dictionaries.
- Logging failure must never alter scrape decisions or retry semantics.

## Expo Mobile

- User-visible failures belong in the established error, toast, alert, or screen state rather than a console statement.
- Do not commit `console.log` or `console.debug`.
- Keep `console.warn` or `console.error` only at a native/provider boundary when it records a real failure that is not
  already presented or handled elsewhere, uses no personal/sensitive data, and does not duplicate an adjacent layer.
- Do not add analytics, crash reporting, browser log capture, or a generic logger without an explicit product and
  privacy task.

## Verification

- Inspect new and retained log fields for secrets and personal data.
- Confirm the chosen layer owns the outcome and no adjacent duplicate exists.
- Assert logs only when the log itself is supported behavior; otherwise test the state, result, or adapter operation.
- Run impacted tests, format/type checks, and `git diff --check`.
