---
name: blockout-best-practices
description: Use when working in the Blockout monorepo on GitHub Roadmap governance, task claims, GitFlow, Nx workspace structure, contracts, OpenAPI/code generation, Spring Boot or Maven backend code, JPA or Flyway persistence, REST APIs, RabbitMQ messaging, Python scrapers, Expo mobile code, logging, tests, local runtime, documentation, or repository architecture.
---

# Blockout Best Practices

Use this skill as the Blockout router. Match the task to the smallest row below, read every source named by that row,
and follow links only when the selected source requires them.

## Guidance Boundaries

- `AGENTS.md` owns repository-wide constraints and routing context.
- This router owns source selection, the repository map, and common validation commands.
- `overlays/**` owns Blockout coordinates, taxonomy, architecture, commands, versions, and provider values.
- `references/**` owns portable decisions and must contain no repository identity, coordinate, command, version,
  provider selection, port, branch, design identifier, or domain value.
- `docs/runbooks/tasks/**` sequences operations without owning their policy.
- Apply `karpathy-guidelines` whenever writing, reviewing, or refactoring code.

A technology-specific reference may name the technology whose reusable policy it owns. The router and overlays decide
whether that technology applies and supply every repository-specific value.

## Source Router

| Task signal                                                                   | Read                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Product behavior, V1 scope, source authority, or implementation gate          | `references/baseline-v1-policy.md`, `overlays/repository-profile.md`, then the applicable current source                        |
| Java package structure, Spring service, Maven module, or application boundary | `references/backend-java-policy.md` and `overlays/repository-profile.md`                                                        |
| Javadoc, source comments, or a handwritten public/local contract              | `references/code-documentation-policy.md`                                                                                       |
| Mapping between transport, application, domain, provider, and persistence     | `references/mapping-policy.md` and `overlays/repository-profile.md`                                                             |
| Backend Java tests                                                            | `references/java-testing-policy.md` and `overlays/repository-profile.md`                                                        |
| JPA entity, repository, relationship, query, or persistence mapping           | `references/jpa-persistence-policy.md` and `overlays/repository-profile.md`                                                     |
| Flyway migration or database schema evolution                                 | `references/flyway.md`, `overlays/repository-profile.md`, then the JPA policy when entity alignment is relevant                 |
| Request, response, controller, mapping, error, collection, or HTTP boundary   | `references/rest-endpoint-policy.md` and `overlays/repository-profile.md`                                                       |
| OpenAPI contract, DTO, endpoint, generated client/server, or transport enum   | `references/contract-first.md`, `overlays/repository-profile.md`, then the REST policy when relevant                            |
| Java, Python, or mobile logging                                               | `references/logging-policy.md` and `overlays/repository-profile.md`                                                             |
| Python scraper code, model, dependency, or fixture                            | both scraper references and `overlays/repository-profile.md`                                                                    |
| Expo, React Native, Formik, Yup, or mobile HTTP boundary                      | both mobile references, `overlays/repository-profile.md`, `overlays/figma-profile.md`, and `vercel-react-native-skills`         |
| Figma read/write, mobile visual design, design tokens, or visual comparison   | `references/figma-policy.md`, `overlays/figma-profile.md`, `overlays/local-runtime-profile.md`, then the applicable Figma skill |
| Mobile Jest or React Native Testing Library test                              | `references/mobile-testing-policy.md`                                                                                           |
| React component API, provider composition, or reusable mobile UI architecture | `vercel-composition-patterns` in addition to the applicable mobile policy                                                       |
| Docker Compose, `.env.example`, local services, or runtime smoke              | `references/local-runtime-policy.md` and `overlays/local-runtime-profile.md`                                                    |
| Nx projects, targets, tags, graph, or cache                                   | the `nx-workspace-patterns` skill                                                                                               |
| Business model ownership or delivered runtime posture                         | `references/baseline-v1-policy.md`, `docs/current/blockout-product-runtime-context.md`, and owning sources                      |
| Roadmap discovery, acquisition, claim, resume, scope, or draft publication    | `references/github-roadmap-operations.md`, `overlays/github-roadmap-profile.md`, and the applicable task runbook                |
| Drain compatible Ready issues                                                 | Roadmap operations, `overlays/github-roadmap-profile.md`, and `docs/runbooks/tasks/ready-drain.md`                              |
| Pull-request review, review evidence, or review-state transition              | `references/github-roadmap-lifecycle.md`, `references/git-workflow.md`, and `overlays/git-profile.md`                           |
| Release, integration, or drain an approved PR snapshot                        | Lifecycle, Git workflow, Git and runtime profiles, and `docs/runbooks/tasks/merge.md`                                           |
| Validation plan, risk classification, skipped check, or fallback              | `references/risk-based-validation-policy.md`, then every focused policy selected for the changed boundaries                     |
| Issue type, execution mode, lifecycle, release, dependency, or Epic decision  | `references/github-roadmap-lifecycle.md`                                                                                        |
| Project fields, options, tracks, views, workflows, or migration               | `references/github-roadmap-governance.md` and `overlays/github-roadmap-profile.md`                                              |
| Track, issue identifier, label, or Workset area taxonomy                      | `references/github-taxonomy.md` and `overlays/github-taxonomy.md`                                                               |
| Issue, branch, commit, push, pull request, label, title, or local Git sync    | `references/git-workflow.md` and `overlays/git-profile.md`                                                                      |
| Agent guidance ownership, precedence, duplication, or portability audit       | `docs/runbooks/tasks/guidance-audit.md`, then the instruction tree it selects                                                   |

For Figma work that starts a simulator or service, also read the local runtime policy and overlay. Apply the V1 source
gate before changing product behavior. Load only the two Vercel companion skills named in the table.

## Repository Guardrails

- Organize deployable applications under `apps`; reserve `libs/shared` for stable cross-application assets when a real
  shared boundary exists.
- Use Nx targets for JavaScript/TypeScript and scraper task orchestration. Use the backend Maven reactor for
  cross-module
  Java validation.
- Remove obsolete and accidentally empty directories. Keep an otherwise empty directory with `.gitkeep` only when the
  current architecture explicitly requires that location before its first implementation; never preserve speculative
  package skeletons.
- Follow `references/figma-policy.md` for every task that reads, changes, compares against, or makes a decision in
  Figma. Never create a parallel canonical Blockout design file.

## Repository Map

- Workspace: Nx 23 and npm workspaces.
- Mobile: `apps/frontend/mobile`, Expo and React Native.
- Backend: `apps/backend`, Maven reactor, Java 21, Spring Boot, JPA, Flyway, PostgreSQL, and RabbitMQ.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`, Python 3.12 applications.
- Local runtime: `infra/compose/docker-compose.third-party.yml` and `infra/compose/docker-compose.app.yml`.

## Common Verification

Use `references/risk-based-validation-policy.md` to select from these repository commands. This is a command inventory,
not a mandatory blanket suite; focused policies and the release profile may require a broader set.

```bash
npm run format
npm exec nx show projects
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/club-scraper:test
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:test
mvn -f apps/backend/pom.xml test
npm run format:check
git diff --check
```

Finish by reporting changed boundaries, checks run, intentional skips, commit SHA, push result, and worktree state.
