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

## Containers

- Keep Dockerfiles simple and application-owned. Use a builder/runtime split only when it removes build tools or artifacts
  from the final image without obscuring the build.
- Do not install Nx in application images. Nx and verification belong to the workspace and CI/local orchestration.
- Preserve runtime command, workdir, port, environment semantics, health behavior, and required files unless the active
  task explicitly changes them.
- Do not introduce generic shared Docker scripts or abstractions for two clear application Dockerfiles.

## Verification

Start only the required dependencies, confirm health before application smokes, use non-production data and credentials,
and stop or report any external write path. Verify effective Compose configuration, application startup, expected port,
health endpoint, representative local flow, and `git diff --check`.
