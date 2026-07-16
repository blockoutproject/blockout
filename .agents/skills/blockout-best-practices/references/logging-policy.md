# Logging Policy

- Use the existing SLF4J/Logback stack for Java and the existing structured logger for Python.
- Log at operational boundaries: startup, scheduled jobs, external integrations, message handling, and translated
  failures.
- Prefer stable identifiers, dependency names, status, count, and duration.
- Never log tokens, secrets, credentials, private keys, raw JWTs, full payloads, or personal data.
- Avoid duplicate exception logging at every layer and blanket method entry/exit traces.
- Preserve current production log formats during migration unless observability changes are explicitly scoped.
