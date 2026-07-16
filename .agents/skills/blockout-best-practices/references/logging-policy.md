# Blockout Logging Policy

> Migration status: target policy inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md` without changing current product behavior.

Read this reference before adding, changing, or keeping logs in Blockout frontend or backend code.

## Core Rule

Every committed log must help diagnose a real failure, explain an operational state change, or support production
operation. Agents must not add decorative logs, broad tracing, or noise to make code look observable.

Local runtime diagnostics use one Git-ignored application log file by default: `logs/blockout-local.log`. The file is a
local debugging artifact for developers and agents, not a product feature, production retention mechanism, monitoring
backend, or remote log sink.

OpenTelemetry is the official tracing layer for request, fetch, and downstream-call timing when local tracing is
enabled. Logs should complement traces with human-readable operational events and handled failures, not duplicate every
successful HTTP span.

## Why Log

- Make important business or operational events understandable after the fact.
- Preserve enough context to diagnose failures without exposing sensitive data.
- Help operators distinguish expected domain failures from technical dependency failures.

## When To Log

- `INFO`: meaningful lifecycle or operation outcomes at public service boundaries, scheduled jobs, startup wiring, or
  external integration calls.
- `WARN`: expected but important degradation, translated downstream failures, retries, ignored invalid external state,
  or operational conflicts that may need attention.
- `ERROR`: unhandled technical failures, dependency unavailability, or failures that prevent the requested operation
  from completing.
- `DEBUG`: safe local diagnostic envelopes for reads, list reads, create/update/command actions, and orchestration
  decisions that are not already covered by OpenTelemetry spans.
- `TRACE`: temporary local investigation only, unless the module already has an explicit trace policy.

## When Not To Log

- Do not log routine private helper entry or exit.
- Do not log payload dumps, full request or response bodies, authorization tokens, cookies, secrets, credentials,
  private keys, PII, or sensitive user data.
- Do not log the same failure at every layer. Log where the failure is translated, handled, or becomes operationally
  meaningful.
- Do not keep temporary debugging logs in committed React, Next.js, or Java code.
- Do not log display names, profile payload values, notification payloads, contact details, raw JWT claims, raw
  downstream bodies, or raw command bodies even when a value looks harmless in local development.

## Local Diagnostic Envelopes

Use `DEBUG` for local envelopes that help reconstruct a flow without dumping business payloads. Safe fields include:

- operation name, HTTP method, route family, downstream service name, and target path;
- stable identifiers already used as technical keys, such as `requestId`, `principalId`, `accountId`, `profileId`,
  `competitionId`, `stageId`, `fixtureId`, `transitionId`, and `commandId`;
- list metadata such as `page`, `pageSize`, bounded status filters, activity keys, and result counts;
- outcome metadata such as HTTP status, `ProblemDetail.code`, dependency name, cache outcome, and duration in
  milliseconds.

Do not use `DEBUG` as blanket entry/exit tracing or as a duplicate of successful HTTP/fetch spans. Add it at public
service boundaries, frontend server loaders/actions, downstream failure translations, and action orchestration points
where the information answers a concrete debugging question.

## Correlation

- Use the safe internal `X-Request-Id` header to correlate local frontend, BFF, and backend service logs.
- Generate a request id when the inbound request does not provide one, forward it to downstream services, write it to
  the response when possible, and put it in the logging context.
- When OpenTelemetry is enabled, include `traceId` and `spanId` in backend file logs and prefer `traceparent`/OTel spans
  for request and downstream timing.
- Never derive the request id from user data, tokens, cookies, profile fields, or request payloads.

## OpenTelemetry

- Backend services use Spring Boot Actuator, Micrometer Tracing with OpenTelemetry, and OTLP exporter dependencies.
- Backend trace export is local opt-in by default: keep sampling at `0.0` unless a local collector is running and a
  debugging session explicitly sets `MAAATCH_TRACING_SAMPLING_PROBABILITY`.
- Next.js server instrumentation uses `@vercel/otel` and is enabled only when `MAAATCH_OTEL_ENABLED=true`.
- OpenTelemetry must not introduce browser telemetry, analytics, third-party monitoring, or production log shipping
  without a separate source-gated task.
- Do not add custom spans for every method. Use default framework spans first, then add custom spans only around
  meaningful application operations that cannot be diagnosed from existing spans and logs.

## Absorbed Failures

Some Blockout flows intentionally degrade instead of failing the whole request, especially frontend server fallbacks and
BFF account/profile/bootstrap dependencies. When code catches an exception or converts a non-success downstream
response into a fallback state, log the tolerated failure at `WARN` if the user-visible or operational state is degraded
and at `DEBUG` if it is only a local diagnostic branch. Include the dependency, operation, status or problem code, and
duration when available.

## Java And Spring Boot

- Use SLF4J through the existing project logging stack.
- Prefer parameterized messages: `LOGGER.info("Competition {} published", competitionId)`.
- Include stable business identifiers when useful, such as `competitionId`, `stageId`, `fixtureId`, `principalId`, or
  downstream service name.
- Keep logs near service, controller, scheduled job, or integration boundaries. Avoid noise in private helpers unless
  they translate an operational failure.
- Never concatenate sensitive values into log messages.
- Backend services should write local file logs to `logs/blockout-local.log` by default and include the service name,
  level, logger, request id, trace id, span id, and message in the file pattern.

## React And Next.js

- Do not leave permanent `console.log` statements in client code.
- Remove temporary browser logs before delivery.
- Route errors through existing application mechanisms when present: error boundaries, server action handling, route
  handler responses, monitoring hooks, or shared logging helpers.
- Server-side logs must follow the same data-safety rules as Java logs.
- Server-side frontend logs should use the shared server-only logger and write to `logs/blockout-local.log` by default.
- Client-side telemetry, analytics, browser log capture, or third-party monitoring requires a separate source-gated
  task.

## Agent Checklist

- The log answers a concrete diagnostic or operational question.
- The level matches the impact.
- The message uses stable identifiers and omits sensitive data.
- The log is not decorative tracing or a duplicate of an adjacent layer.
