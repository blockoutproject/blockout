# Logging

Apply this policy when adding or changing application logs. Logs must help diagnose a real failure, explain an
operationally meaningful state change, or observe an external or scheduled integration.

## Events And Levels

- `INFO`: application lifecycle, important state transition, batch summary, or external integration outcome useful in
  normal operation.
- `WARN`: expected but important degradation, retry, rejected input, partial failure, or recoverable conflict.
- `ERROR`: unexpected technical failure, unavailable dependency, or failure preventing completion.
- `DEBUG`: safe diagnostic detail useful only during investigation.
- Do not commit routine entry/exit tracing, decorative logs, successful per-record noise, or temporary trace output.

## Placement And Ownership

- Log where an outcome becomes operationally meaningful: an application boundary, scheduler, message boundary, or
  external adapter.
- Log one failure once. Do not repeat the same event in controller, application service, and adapter.
- Do not catch only to log and rethrow. Log when the layer adds unique actionable context or deliberately degrades the
  failure.
- Preserve the throwable for unexpected Java failures; do not reduce it to a message string.
- Summarize batches with bounded counts and duration instead of logging every item.

## Safe Structured Context

Write structured logs to stdout through the configured stack. Use stable event names and fields, parameterized SLF4J
messages, and technical identifiers only when necessary. Useful context includes operation, dependency, outcome,
status, duration, retry number, and bounded counts.

Never log:

- authorization headers, tokens, cookies, credentials, secrets, private keys, or signed URLs;
- complete requests, responses, provider payloads, database rows, or configuration dumps;
- names, email addresses, phone numbers, addresses, profile data, notification contents, raw identity claims, or other
  personal data;
- stack traces or dependency details in client-facing responses.

Do not add file appenders, remote sinks, telemetry, correlation middleware, analytics, or monitoring dependencies
without an accepted task and privacy review. Frontend user-visible failures belong in UI error state; do not commit
`console.log` or `console.debug`.

## Verification

- Confirm every new event has an operational consumer and the owning layer is correct.
- Inspect fields and exception messages for secrets, payloads, and personal data.
- Check adjacent layers for duplicate success or failure logs.
- Test a log only when the log itself is supported behavior; otherwise test the outcome.
