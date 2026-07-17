---
name: blockout-best-practices
description: 'Use when working in the Blockout monorepo: local migration roadmap, contracts, OpenAPI/codegen, Expo mobile, Spring Boot backend, Python scrapers, production cutover, Git/GitHub workflow, or project architecture.'
---

# Blockout Best Practices

Use this skill as the Blockout router. It follows the Maaatch skill structure: universal repository guardrails stay
here and detailed domain or framework rules live in references.

## Discipline

- Inspect Git, current sources, and the active migration roadmap before acting when more than one interpretation is
  possible.
- Load only the references required by the current operation and scope.
- Apply `karpathy-guidelines` when writing, reviewing, or refactoring code.
- Make the smallest change that fits the target architecture; do not add speculative abstractions or adjacent cleanup.
- Treat uncommitted changes as user-owned until the diff proves otherwise.
- State assumptions before relying on ambiguous product, architecture, deployment, or workflow decisions.
- Do not add unit tests unless the user explicitly requests them. Prefer generation, typecheck, compile/build, existing
  tests, targeted inspection, and honest skipped-check reporting.
- If the user asks for local-only work, do not create an issue, remote branch, push, or pull request.

## Migration Authority

Until the migration is complete, [`docs/current/blockout-active-roadmap.md`](../../../docs/current/blockout-active-roadmap.md)
is the task source of truth. GitHub Project discovery, acquisition, claims, and GitFlow are intentionally dormant.
This temporary local-roadmap mode ends only at the explicit GitFlow activation phase.

The roadmap may authorize structural migration. It does not authorize product behavior changes, production deployment,
credential mutation, or retirement of standalone repositories.

## Source Router

| Task signal                                                        | Read                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Current migration task, phase, dependency, or completion evidence  | `docs/current/blockout-active-roadmap.md`                                                         |
| Execute the next local migration task and push it to `main`        | `docs/runbooks/tasks/execution.md`                                                                |
| Current product/runtime posture and closed boundaries              | `docs/current/blockout-product-runtime-context.md`                                                |
| Approved backend contract, data, mapper, and service architecture  | `docs/architecture/blockout-backend-contract-data-architecture.md`                                |
| Product behavior or runtime change                                 | `references/baseline-v1-policy.md`                                                                |
| OpenAPI contract, DTO, endpoint, or future generated client/server | `references/contract-first.md`, then the endpoint or pagination policy                            |
| Backend Java structure, Maven ownership, or documentation          | `references/backend-java-policy.md` and `references/code-documentation-policy.md`                 |
| Persistence or mapping                                             | `references/jpa-persistence-policy.md`, `references/flyway.md`, or `references/mapping-policy.md` |
| Backend tests                                                      | `references/java-testing-policy.md`                                                               |
| Expo, React Native, EAS, or mobile configuration                   | `references/frontend-mobile-policy.md` plus the applicable React skill                            |
| Python scraper, scheduler, proxy, or scraper image                 | `references/python-scraper-policy.md`                                                             |
| Environment variable, secret, or public Expo configuration         | `references/environment-configuration-policy.md`                                                  |
| Nx project, workspace layout, target, or dependency                | `references/nx-workspace-policy.md`                                                               |
| Docker image, Dokploy, cutover, or rollback                        | `references/production-migration-policy.md`                                                       |
| Logging                                                            | `references/logging-policy.md`                                                                    |
| Issue, branch, commit, push, pull request, or merge                | `references/git-workflow.md`                                                                      |
| Future GitHub Roadmap activation                                   | `references/github-roadmap-policy.md`; do not activate it before the roadmap phase                |

## Generic Skill Router

Use these generic Maaatch-aligned skills only within Blockout's technology and product boundaries:

| Skill                         | Blockout status       | Scope                                                                                                 |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `karpathy-guidelines`         | Applicable            | Planning, implementation discipline, and code review                                                  |
| `no-use-effect`               | Adapted               | React Native effects; direct effects remain valid for real external synchronization                   |
| `nx-workspace-patterns`       | Applicable            | Nx structure, subject to `references/nx-workspace-policy.md` and Expo variants                        |
| `vercel-composition-patterns` | Adapted               | Framework-neutral React composition translated to native primitives                                   |
| `vercel-react-best-practices` | Adapted               | Allowlisted React and JavaScript rules only; its Next.js, server, DOM, and browser rules are inactive |
| `next-best-practices`         | Non-applicable        | Next.js runtime and App Router are not present                                                        |
| `shadcn`                      | Non-applicable        | shadcn, Tailwind, and DOM component registries are not part of the mobile stack                       |
| `web-design-guidelines`       | Non-applicable        | Browser interface checks do not replace React Native accessibility and platform validation            |
| `zod`                         | Planned until MRG-329 | MRG-313 approves mobile-owned Zod with React Hook Form; do not import it before activation            |

Do not create placeholder copies of non-applicable skills. Reassess a classification only when an authoritative
roadmap task changes the stack; MRG-505 owns the later mobile skill audit after the architecture is defined.

If current sources do not justify proposed behavior, stop runtime implementation and request product or architecture
revalidation. Generated output, history, and the migration roadmap never activate product behavior by continuity.

## Universal Guardrails

- Blockout is migrating to contract-first. Source fragments will live under `libs/shared/contracts/specs/source/**`.
- Until a service's contract migration phase is complete, its current production source remains authoritative and new
  contract changes must not invent a parallel generated boundary.
- Never hand-edit generated contract bundles, frontend generated clients, backend generated sources, or future
  `schemaMappings`.
- Keep OpenAPI DTOs, backend domain models, persistence models, and frontend view/form models at their documented
  boundaries.
- Use Nx targets for JS/TS work and the backend parent Maven build unless a narrower documented target is sufficient.
- Preserve runtime ports, environment contracts, Docker image behavior, and deployable boundaries during structural
  migration.
- Every deployable that reads environment variables owns a safe `.env.example`.
- Use the root npm lockfile. Do not create nested JavaScript lockfiles.
- Backend Dockerfiles use `apps/backend` as their context.
- Scrapers are explicit Nx projects without a Python Nx plugin.
- Local Compose consists only of the two Maaatch-shaped files and pgAdmin registration under `infra/compose`.
- Standalone repositories remain production authority until each deployable completes its cutover.

## Roadmap Workflow

- Work one roadmap item or one explicitly compatible batch at a time.
- During local-roadmap mode, `docs/runbooks/tasks/execution.md` is the only active task runbook and overrides the
  dormant GitHub branch/PR workflow for its single direct-to-`main` publication.
- Revalidate the item against current source before editing.
- Update the item's checkbox and short evidence only after validation succeeds.
- Add newly discovered work to the correct future phase instead of expanding the current item silently.
- Keep product decisions out of structural migration items. Mark missing product evidence as blocked.
- Do not mirror this temporary migration roadmap into GitHub.

## Repo Map

- Workspace: Nx and npm workspaces.
- Mobile: `apps/frontend/mobile` with Expo and React Native.
- Contracts target: `libs/shared/contracts`.
- Backend: `apps/backend` Maven multi-module, Java 21, Spring Boot, JPA, and Flyway.
- Scrapers: `apps/scrapers` explicit Nx Python deployables.
- Shared React libraries: `libs/react`.
- Empty package reservation: `packages`.
- Repository scripts: `scripts`.
- Local Compose: `infra/compose/docker-compose.third-party.yml` and `infra/compose/docker-compose.app.yml`.

## Common Commands

```bash
npm exec nx show projects
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:export --platform=android
mvn -f apps/backend/pom.xml -DskipTests compile
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/club-scraper:syntax-check
docker compose --file infra/compose/docker-compose.third-party.yml --file infra/compose/docker-compose.app.yml config --quiet
scripts/verify-ci-pr-local.sh --skip-install
```

The contracts package is currently a reserved source boundary. Do not claim contract generation until its roadmap phase
adds source fragments, bundling, backend generation, and mobile client generation.

## Final Verification

- Contracts changed: run the contract targets that exist after contract infrastructure activation and regenerate every
  impacted consumer.
- Backend changed: run targeted generation/compile or broader existing tests according to risk.
- Mobile changed: run typecheck and usually an Expo export; validate both platforms for native configuration changes.
- Scraper changed: run syntax validation and build the owning image for packaging changes.
- Environment or Compose changed: validate examples and Compose interpolation without real secrets.
- Documentation or skill only: inspect the reference graph, validate local links and terminology, and run
  `git diff --check`.
- Deployment changes require shadow validation plus an explicit cutover and rollback decision.
- Final report: changed areas, commands run, checks intentionally skipped and why, Git artifacts, and roadmap state.
