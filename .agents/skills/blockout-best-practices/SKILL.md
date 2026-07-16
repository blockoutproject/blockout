---
name: blockout-best-practices
description: 'Use when working in the Blockout monorepo: Nx workspace structure, Spring Boot and Maven services, Expo mobile, Python scrapers, environment configuration, Docker, production migration, GitHub workflow, or project documentation.'
---

# Blockout Best Practices

Use this skill as the Blockout repository router. It owns universal guardrails and points each task to the smallest
authoritative read set.

## Discipline

- Start with `git status --short --branch` and preserve unrelated changes.
- Inspect current source and runtime configuration before changing behavior.
- Apply `karpathy-guidelines` when writing, reviewing, or refactoring code.
- Make the smallest change compatible with the existing production architecture.
- Do not introduce speculative abstractions, broad dependency upgrades, or adjacent cleanup.
- Keep repository files in English.
- Never commit credentials, tokens, private keys, Firebase files, or production environment values.
- Report validations that ran, validations skipped, and the exact reason for each skip.

## Source Router

| Task signal                                                     | Read                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| Production migration, Docker image, Dokploy, cutover, rollback  | `references/production-migration-policy.md`                         |
| Environment variable, Spring config, Expo public config, secret | `references/environment-configuration-policy.md`                    |
| Java, Spring Boot, Maven module, REST endpoint                  | `references/backend-java-policy.md`                                 |
| Database, JPA, Flyway migration                                 | `references/persistence-policy.md`                                  |
| Backend test                                                    | `references/java-testing-policy.md`                                 |
| Expo, React Native, EAS, mobile configuration                   | `references/frontend-mobile-policy.md`                              |
| React component state or effects                                | `no-use-effect` with its Blockout compatibility note                |
| Python scraper, scheduler, proxy, scraper Docker image          | `references/python-scraper-policy.md`                               |
| Nx project, workspace layout, target, dependency                | `references/nx-workspace-policy.md`                                 |
| Logging or observability                                        | `references/logging-policy.md`                                      |
| Issue, branch, commit, push, pull request, merge                | `references/git-workflow.md`                                        |
| Roadmap discovery, acquisition, lifecycle                       | `references/github-roadmap-policy.md` and the matching task runbook |

## Universal Guardrails

- The standalone repositories remain production authority until a deployable has completed its documented cutover.
- A monorepo import must preserve runtime code, service ports, image behavior, required environment variables, and
  deployable boundaries unless an explicit task changes one of them.
- Never reconnect a production Dokploy deployment, change an image tag, or remove a legacy workflow as part of an
  unrelated monorepo cleanup.
- Every deployable that reads environment variables owns a committed `.env.example` containing safe non-production
  values for every referenced variable.
- `EXPO_PUBLIC_*` values are public bundle configuration, never private secrets.
- Use the root npm lockfile. Do not create nested JavaScript lockfiles.
- Use the backend Maven reactor at `apps/backend/pom.xml`; do not restore independent Spring Boot parent POMs.
- Backend Dockerfiles build with `apps/backend` as their context.
- Scrapers are explicit Nx projects without a Python Nx plugin unless a dedicated architecture decision changes that.
- Local Compose files mirror Maaatch and are not represented as an Nx project.
- Generated output, local caches, build directories, secrets, and real environment files stay untracked.

## Repository Map

- Spring Boot services: `apps/backend/*`
- Expo application: `apps/frontend/mobile`
- Python scrapers: `apps/scrapers/*`
- Local infrastructure: `infra/compose`
- Migration runbook: `docs/migration/monorepo-cutover.md`
- Current agent context: `docs/current/blockout-agent-brief.md`

## Common Commands

```bash
NX_DAEMON=false npm exec -- nx show projects
mvn -f apps/backend/pom.xml -DskipTests clean compile
NX_DAEMON=false npm exec -- nx run @blockout/mobile:typecheck
NX_DAEMON=false npm exec -- nx run @blockout/mobile:export -- --platform android
NX_DAEMON=false npm exec -- nx run @blockout/competition-scraper:syntax-check
NX_DAEMON=false npm exec -- nx run @blockout/club-scraper:syntax-check
docker compose --file infra/compose/docker-compose.third-party.yml --file infra/compose/docker-compose.app.yml config --quiet
```

## Final Verification

- Environment/config changed: validate example coverage and Compose interpolation without real secrets.
- Backend changed: run reactor compile and the narrowest relevant existing tests.
- Mobile changed: run typecheck and export for configuration or bundling changes.
- Scraper changed: run the syntax-check target and Docker build when packaging changed.
- Workspace changed: inspect the Nx graph and affected project targets.
- Documentation or skills only: validate links, terminology, formatting, and `git diff --check`.
- Deployment changes require shadow validation plus an explicit cutover and rollback decision.
