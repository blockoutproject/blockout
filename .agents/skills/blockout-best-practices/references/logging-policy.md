# Blockout Logging Policy

Read this before adding or changing logs in Java, Python, or TypeScript.

## Rules

- Log operational facts at application and adapter boundaries: startup, completion, retry, rejection, dependency
  failure, and state transitions that help diagnose a real incident.
- Use parameterized SLF4J logging or the repository's existing structured arguments in Java. Use native structured
  logging fields in Python and TypeScript where already supported.
- Prefer stable identifiers, operation names, counts, durations, statuses, and dependency names.
- Never log secrets, authorization headers, tokens, credentials, complete request bodies, provider payloads, or personal
  data.
- Avoid duplicate logs across controller, application service, and adapter for the same event.
- Do not catch an exception only to log and rethrow it unless the added context is unique and actionable.
- Keep routine successful per-record work out of `INFO`; use `DEBUG` when detailed local diagnosis genuinely needs it.
- Preserve exception context with the throwable when a failure is unexpected.

Tests should assert logs only when the log itself is a supported behavior. Otherwise validate by focused inspection,
the impacted application checks, and `git diff --check`.
