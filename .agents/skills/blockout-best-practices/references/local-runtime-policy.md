# Blockout Local Runtime Policy

Read this before changing Dockerfiles, Compose files, local environment examples, runtime ports, or application smoke
checks.

## Compose And Environment

- Keep third-party infrastructure in `infra/compose/docker-compose.third-party.yml` and Blockout applications in
  `infra/compose/docker-compose.app.yml`.
- Keep the Compose project name `blockout`. Container names are descriptive and stable only where the current local
  workflow needs them.
- Two stopped containers may publish the same host port, but Docker cannot run them simultaneously. Prefer predictable
  defaults and document intentional conflicts instead of adding dynamic port indirection.
- Each deployable application owns a committed `.env.example` containing safe names and usable local defaults.
  `.env.local` remains ignored and may contain local secrets or machine-specific overrides.
- Never commit real credentials, production endpoints, tokens, private keys, or copied production data.
- Local authenticated tests must use provider-supported OAuth flows and least-privilege test identities. Never add an
  authentication bypass, wildcard browser origin, embedded credential, or production-data fixture for convenience.

## Containers

- Keep Dockerfiles simple and application-owned. Use a builder/runtime split only when it removes build tools or
  artifacts
  from the final image without obscuring the build.
- Do not install Nx in application images. Nx and verification belong to the workspace and CI/local orchestration.
- Preserve runtime command, workdir, port, environment semantics, health behavior, and required files unless the active
  task explicitly changes them.
- Do not introduce generic shared Docker scripts or abstractions for two clear application Dockerfiles.

## Verification

Start only the required dependencies, confirm health before application smokes, use non-production data and credentials,
and stop or report any external write path. Verify effective Compose configuration, application startup, expected port,
health endpoint, representative local flow, and `git diff --check`.

## Visual Session Lifecycle

- Before a Figma or simulator task, inspect Docker, ports, application processes, Metro, the installed development
  client, and simulator state. Do not infer that a rebooted or previously used session is still alive.
- Derive the required dependency set from the exact route and state. A successful process start is not sufficient:
  verify required health endpoints before login, navigation, scraper execution, or visual capture.
- Start one runtime session and keep it healthy until the complete capture, Figma correction, focused review, and final
  full-screen comparison finish. Do not stop services after the first screenshot or restart healthy services for each
  correction.
- Track which processes the task started. Preserve user-owned processes and stop only task-owned processes at closure,
  unless the user requests a retained session or the next authorized task will reuse it immediately.
- Report service failures and unavailable downstream dependencies truthfully. Do not represent a partially loaded
  screen as complete runtime evidence.
