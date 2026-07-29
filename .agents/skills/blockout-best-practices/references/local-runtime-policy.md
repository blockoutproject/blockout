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

Confirm health before application smokes, use non-production data and credentials, and stop or report any external
write path. Verify effective Compose configuration, application startup, expected port, health endpoint,
representative local flow, and `git diff --check`.

For ordinary task smokes, start only the required dependencies. The Merge train is the release exception and uses the
complete profile below for every candidate. Never reduce it based on changed paths, Workset, risk classification, or
agent judgment.

### Merge Release Profile

1. Inspect existing Docker, ports, application processes, Metro, installed development clients, and simulator or
   device state. Preserve user-owned processes and record every process started by the train.
2. Start both Compose definitions under the `blockout` project. Require every declared PostgreSQL, RabbitMQ,
   Elasticsearch, and pgAdmin container to run and pass its configured health check.
3. Start every Java application and worker from the exact candidate tree. Verify every configured health endpoint and
   keep the complete topology alive together.
4. Start both Python scrapers in their safe local mode with uncontrolled external writes disabled. Verify process
   readiness and the configuration-service gates for `SCRAPER` and `SCRAPER_CLUBS`.
5. Start Metro on port `8100`, launch the complete Expo application in an installed supported development client, and
   verify that the application loads from that candidate tree.
6. Use a provider-supported local or test Auth0 identity to log in through the visible application, reach a protected
   surface that exercises the mobile-to-gateway path, and sign out. Never use a bypass, embedded credential, wildcard
   origin, mocked provider state, or production identity.
7. Treat missing credentials, provider configuration, simulator support, port availability, unsafe scraper behavior,
   an unhealthy component, or an incomplete protected flow as a release blocker. Return the pull request to draft,
   record the clearing condition, stop train-owned processes, and stop the train.
8. Record the candidate SHA, component inventory, health evidence, authenticated flow, and cleanup result on the pull
   request without exposing secrets, provider payloads, or personal data.

Healthy infrastructure may be reused for the next candidate only after reverification. Restart every repository
application from the next candidate tree so evidence always binds to the head being merged.

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
