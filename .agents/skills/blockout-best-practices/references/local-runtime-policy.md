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

For ordinary task smokes, start only the required dependencies. The Merge Train Runbook is the release exception: for
every candidate, start and reverify both Compose definitions, every third-party container, every Java application and
worker, both Python scrapers in safe local mode, Metro, the installed development client, and the supported Auth0
login/protected-flow/sign-out path. Missing credentials, provider configuration, simulator support, or another required
prerequisite blocks release; never reduce the topology based on changed paths or agent judgment.

Confirm health before application smokes, use non-production data and credentials, and stop or report any external
write path. Verify effective Compose configuration, application startup, expected port, health endpoint,
representative local flow, and `git diff --check`.

## Visual Session Lifecycle

- Before a Figma or simulator task, inspect Docker, ports, application processes, Metro, the installed development
  client, and simulator state. Do not infer that a rebooted or previously used session is still alive.
- Derive the required dependency set from the exact route and state. A successful process start is not sufficient:
  verify required health endpoints before login, navigation, scraper execution, or visual capture.
- Start one runtime session and keep it healthy until the complete capture, Figma correction, focused review, and final
  full-screen comparison finish. Do not stop services after the first screenshot or restart healthy services for each
  correction.
- During a sequential mobile/Figma reconciliation series, start the complete Java application stack, search worker,
  gateway, search service, Metro, and iOS development client once. Reuse that healthy session across task boundaries;
  do not stop task-owned processes at each task closure. Stop it only when the user requests it, the reconciliation
  series ends, or a failed process must be replaced.
- `pools-service` owns application port `8081`. When the complete stack and Metro run together, start Metro with Expo's
  official `--port 8100` option and reconnect the development client to that port. Do not move an application port to
  accommodate a tooling default.
- Track which processes the task started and preserve user-owned processes. Report the retained session and any failed
  component truthfully.
- A normal provider consent dialog may be accepted through its visible simulator action when required for local visual
  testing. Never replace that interaction with a source-level bypass, hidden flag, or committed provider state.
- Report service failures and unavailable downstream dependencies truthfully. Do not represent a partially loaded
  screen as complete runtime evidence.
