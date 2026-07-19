# Blockout Python Scraper Policy

Read this before changing either Python scraper, its models, fixtures, dependencies, Nx targets, or Blockout API calls.

## Boundaries

- Keep scrapers as deployable backend applications under `apps/backend`.
- Separate provider parsing from Blockout API transport. Provider-owned field names remain provider-specific; Blockout
  request and response models use native camelCase.
- Treat Blockout service models as handwritten transport boundaries until contract-first is explicitly activated.
- Define application-only enums locally. Do not duplicate an enum owned by a Blockout transport contract or by an
  external provider.
- Keep authentication, provider access, parsing, normalization, and Blockout API writes explicit. Do not hide them in a
  generic client or conversion framework.

## Code And Dependencies

- Prefer small typed models and focused functions over dynamic dictionaries at stable boundaries.
- Preserve Python 3.12 compatibility and the current application-specific dependency mechanism until a dedicated task
  changes it.
- Nx remains a thin command orchestrator; Python owns execution, tests, syntax checks, and dependency resolution.
- Never commit virtual environments, caches, credentials, generated files, captured private payloads, or runtime logs.
- Tests use controlled fixtures and fake clients. They never call production services or external providers.

Validate syntax, focused fixtures/tests, representative request serialization, import/startup behavior when dependencies
change, relevant Nx targets, and `git diff --check`.
