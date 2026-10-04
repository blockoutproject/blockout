---
name: application-logging
description: "Add or review useful operational logging and failure ownership in Java, Python, web and native code, preserving the existing logging stack and excluding sensitive payloads."
---

# Application logging

Apply this policy when adding, reviewing or changing operational logs in Java, Python or React applications.

## Core Rule

Every committed log must help diagnose a real failure, explain an operational state change, or operate a scheduled or
external integration. Do not add decorative entry/exit tracing, payload dumps, or routine per-record success noise.

The repository instructions own output format, sinks, framework adapters, structured-field conventions, and application
boundaries. Do not introduce another logging backend during ordinary feature work.

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
- Preserve useful exception type, cause and stack context for unexpected Java/Python failures only through the existing safe logging path. Secret/payload exclusion takes precedence: raw exception messages, nested causes and request URLs may be sensitive. If no safe renderer exists, log the safe exception type, operation and bounded context without rendering the raw throwable; retain the original cause internally for handling. Do not create a generic logging framework just for this fallback.
- Avoid successful per-resource `INFO` logs. Summarize the batch or use `DEBUG` for targeted diagnosis.

## Java

- Use SLF4J through the configured Java logging stack, normally Lombok `@Slf4j` in handwritten classes.
- Keep structured output on stdout. For Spring Boot applications using ECS, use native structured logging support
  instead of a custom JSON encoder. Use Micrometer for metrics and observations through the existing registry;
  do not build a parallel telemetry facade. Preserve the configured format and sinks.
- Metric tags use bounded dimensions such as operation, outcome and dependency. Never use user, resource, event or
  customer identifiers as metric labels. Reuse the configured Prometheus/Grafana integration when present.
- Use parameterized messages and the configured structured-field API. Do not concatenate values into messages.
- Keep stable machine field names and operation values consistent within a service. Existing snake_case log field names
  are observability protocol fields, not API JSON, and remain valid.
- Preserve the configured output and sink contract. Do not add local files, telemetry, remote sinks, appenders,
  correlation middleware, or monitoring dependencies without a dedicated task.

## Python applications

- Emit logs through the application's existing logging configuration boundary. Application and adapters must not configure the
  root logger independently.
- Include application or job name, provider or dependency, operation, outcome, counts, and duration when useful.
- Serialize known typed values safely; do not turn arbitrary objects or provider payloads into log dictionaries.
- Logging failure must never alter application decisions or retry semantics.

## Web and native clients

- User-visible failures belong in the established error, toast, alert, or screen state rather than a console statement.
- Do not commit `console.log` or `console.debug`.
- Keep `console.warn` or `console.error` only at a native/provider boundary when it records a real failure that is not
  already recorded at its operational owner, uses no personal/sensitive data, and does not duplicate an adjacent layer.
- User feedback and operational diagnosis have different purposes. A visible error does not automatically make a safe diagnostic redundant; it must still identify a useful boundary and avoid duplicate recording.
- Do not add analytics, crash reporting, browser log capture, or a generic logger without an explicit product and
  privacy task.

## Verification

- Inspect new and retained log fields for secrets and personal data.
- Confirm the chosen layer owns the outcome and no adjacent duplicate exists.
- Assert logs only when the log itself is supported behavior; otherwise test the state, result, or adapter operation.
- Run impacted tests, format/type checks, and the repository diff-hygiene check.

Official references: [Spring Boot logging](https://docs.spring.io/spring-boot/reference/features/logging.html) and
[observability](https://docs.spring.io/spring-boot/reference/actuator/observability.html).
