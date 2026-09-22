---
name: docker-conventions
description: "Create or review Dockerfiles and Compose configuration for source-built application images and local infrastructure. Use for container configuration changes, not merely because a task starts a runtime."
---

# Docker conventions

These are personal development and packaging conventions. Read the owning application's build, lockfiles, configuration examples and current Compose topology. Keep versions, commands, ports and paths in the project. Installing this skill does not authorize migrating its runtime or changing production orchestration.

## Local development

Use Compose for infrastructure such as databases and brokers. Run application processes on the host for normal development and debugging, including Expo Metro and platform tools. Preserve an existing topology until an accepted task changes it. Application images remain useful for packaging and explicit container checks; do not require every developer process to run in a container.

Each deployable application owns a safe versioned `.env.example` and ignored local values, conventionally `.env.local`. Never include secrets in examples. Compose owns infrastructure settings, not a repository-wide bag of application credentials. Document the actual loading mechanism: `.env.local` is not automatically read by every tool. Compose interpolation and container environment injection are different operations; select `--env-file`, `env_file` or `environment` deliberately and verify precedence without printing resolved secrets.

## Application images

- Build from source with the owning build and lockfiles. Include required generated-contract steps or declared upstream build inputs; do not rely silently on developer-built artifacts.
- Use multiple stages when they separate compilation/dependency installation from runtime. Interpreted applications need no fictional compile stage.
- Keep only required application artifacts, runtime dependencies and configuration entry points in the final image. Never copy local environments, credentials, VCS history or caches into it.
- Choose compatible, deliberate base-image versions using the project's update policy. Add a `.dockerignore` appropriate to the selected build context; do not exclude required workspace packages or contract inputs.
- Run as a non-root user where compatible, with deliberate writable paths. Let the application receive termination signals and shut down its resources.
- Keep Dockerfiles with the owning application unless the repository already has a justified packaging owner. Reuse real build inputs; no new launch framework or universal Dockerfile abstraction.

Schema migration jobs follow the application's accepted migration tool and lifecycle. This skill neither replaces Flyway nor changes Liquibase policy.

## Verification

For Compose edits, validate the affected configuration without exposing interpolated secrets. For image changes, build the affected image from the declared context and run a controlled smoke when entrypoint, permissions or runtime content changes. Verify configuration loading, startup/shutdown and required generated inputs where affected. Use disposable owned resources, not production data. Do not restart unrelated services, kill user processes or remove volumes to validate a documentation-only edit. Report missing runtime evidence explicitly.

Mechanics: [Docker build practices](https://docs.docker.com/build/building/best-practices/) and [Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/). The local host/Compose split is a personal convention.
