# Blockout Agent Guidance

- Speak French in chat and write repository files in English.
- Treat the recorded standalone repository commits as the source of truth during `BOOT-001`.
- Preserve application behavior. Do not refactor business code, contracts, DTOs, messages, database schemas, or scrapers during the bootstrap.
- Keep generated output, secrets, local environments, caches, and build artifacts out of Git.
- Work directly on `main` during the temporary bootstrap phase.
- Do not add GitFlow, pull requests, CI pipelines, deployment workflows, or production changes.
