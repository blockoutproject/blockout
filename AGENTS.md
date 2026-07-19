# Blockout Agent Guidance

- Speak French in chat and write repository files in English.
- Treat the recorded standalone repository commits as the behavioral baseline.
- Use Maaatch as a read-only reference for repository structure, naming, and application boundaries. Do not copy Maaatch business code.
- Preserve business behavior unless the active roadmap task explicitly scopes a change.
- Application-owned JSON fields use camelCase. Java DTOs use their native field names; do not use Jackson annotations or naming strategies to translate snake_case to camelCase or back. Do not rename database columns, environment variables, headers, URLs, or provider-owned payloads to enforce that rule.
- Keep handwritten DTOs until contract-first and code generation are explicitly authorized. When a DTO is refactored, follow the Maaatch naming semantics such as `InternalRequest`, `InternalResponse`, and command-oriented application types.
- Keep generated output, secrets, local environments, caches, and build artifacts out of Git.
- Work directly on `main` during the temporary refactor phase.
- Do not add GitFlow, pull requests, CI pipelines, deployment workflows, or production changes.
