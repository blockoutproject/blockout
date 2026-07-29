---
name: blockout-best-practices
description: Use when working in the Blockout monorepo on GitHub Roadmap governance, task claims, GitFlow, Nx workspace structure, contracts, OpenAPI/code generation, Spring Boot or Maven backend code, JPA or Flyway persistence, REST APIs, RabbitMQ messaging, Python scrapers, Expo mobile code, logging, tests, local runtime, documentation, or repository architecture.
---

# Blockout Best Practices

Use this skill as the Blockout router. Apply the universal guardrails below, then read only the references required by
the current task. Detailed rules live in the references rather than in this entrypoint.

## Ownership And Precedence

`AGENTS.md` owns repository-wide invariants and coordinates. This router owns source selection, the repository map,
Blockout overlay selection, and validation defaults. Focused references own portable decisions for their boundary;
`overlays/**` supplies Blockout-specific values without changing those decisions. Task runbooks only sequence them.
When guidance overlaps, follow that order and replace lower-level repetition with a direct route.

Workflow ownership is intentionally narrow:

- `github-roadmap-operations.md`: Project evidence, Ready, Worksets, claims, conflicts, and scope expansion;
- `github-roadmap-lifecycle.md`: statuses, execution modes, transitions, completion, dependencies, and Epic rollup;
- `github-roadmap-governance.md` and `github-taxonomy.md`: portable Project and taxonomy decisions;
- `git-workflow.md`: portable branch, commit, pull-request, review, and integration decisions;
- `local-runtime-policy.md`: portable runtime and release-smoke decisions;
- `overlays/**`: Blockout source, Roadmap, taxonomy, Git, runtime, design, path, version, command, and provider values;
  and
- `docs/runbooks/tasks/**`: discovery, acquisition, execution, drain, and merge sequences without policy ownership.

Every file under `references/**` must remain repository-neutral and reusable unchanged by another repository router.
Never add a Blockout or Maaatch name, coordinate, path, branch, command, version, provider, port, design file, or
taxonomy value there.

## Discipline

- Inspect Git, the current sources, and the live Roadmap before acting when more than one interpretation is possible.
- Apply `karpathy-guidelines` whenever writing, reviewing, or refactoring code.
- Make the smallest coherent change that fits the established architecture. Avoid speculative abstractions and adjacent
  cleanup.
- Treat uncommitted changes as user-owned until inspection proves otherwise.
- State assumptions before relying on an ambiguous product, model, or architecture decision.
- Validate proportionally to risk: narrow checks while developing, impacted application checks before completion, and
  the complete local baseline when a shared boundary changes.
- Before completing a code or configuration change, run `npm run format`, then the relevant validation, and finish with
  `npm run format:check`. Prettier, Spotless, and Ruff are the repository formatting authorities.
- Report checks that were intentionally skipped and why.

## Source Router

| Task signal                                                                   | Read                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Product behavior, V1 scope, source authority, or implementation gate          | `references/baseline-v1-policy.md`, `overlays/repository-profile.md`, then the applicable current source                        |
| Java package structure, Spring service, Maven module, or application boundary | `references/backend-java-policy.md` and `overlays/repository-profile.md`                                                        |
| Javadoc, source comments, or a handwritten public/local contract              | `references/code-documentation-policy.md`                                                                                       |
| Mapping between transport, application, domain, provider, and persistence     | `references/mapping-policy.md`                                                                                                  |
| Backend Java tests                                                            | `references/java-testing-policy.md`                                                                                             |
| JPA entity, repository, relationship, query, or PostgreSQL mapping            | `references/jpa-persistence-policy.md`                                                                                          |
| Flyway migration or database schema evolution                                 | `references/flyway.md`, then `references/jpa-persistence-policy.md` when entity alignment is relevant                           |
| Request, response, controller, mapping, error, collection, or HTTP boundary   | `references/rest-endpoint-policy.md`                                                                                            |
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
| Roadmap discovery, acquisition, claim, resume, scope, or draft publication    | `references/github-roadmap-operations.md` and the applicable task runbook                                                       |
| Drain compatible Ready issues                                                 | `references/github-roadmap-operations.md` and `docs/runbooks/tasks/ready-drain.md`                                              |
| Drain an approved PR snapshot                                                 | `references/github-roadmap-lifecycle.md`, `references/git-workflow.md`, and `docs/runbooks/tasks/merge.md`                      |
| Issue type, execution mode, lifecycle, release, dependency, or Epic decision  | `references/github-roadmap-lifecycle.md`                                                                                        |
| Project fields, options, tracks, views, workflows, or migration               | `references/github-roadmap-governance.md` and `overlays/github-roadmap-profile.md`                                              |
| Track, issue identifier, label, or Workset area taxonomy                      | `references/github-taxonomy.md` and `overlays/github-taxonomy.md`                                                               |
| Issue, branch, commit, push, pull request, label, title, or local Git sync    | `references/git-workflow.md` and `overlays/git-profile.md`                                                                      |

When Figma work requires simulator or service startup, also read `references/local-runtime-policy.md` and
`overlays/local-runtime-profile.md`.

Apply the source gate in `references/baseline-v1-policy.md` before changing product behavior. Historical code and
deferred plans do not activate work by continuity.

The Vercel companion skills are intentionally limited to the two repository-relevant packages above. Do not load or
install their Next.js, deployment, web-design, or writing skills for Blockout mobile work.

## Universal Guardrails

- Organize deployable applications under `apps`; reserve `libs/shared` for stable cross-application assets when a real
  shared boundary exists.
- Keep transport models, application commands/views, persistence entities, provider payloads, and frontend view models
  at explicit boundaries.
- Never expose a JPA entity from a controller or use one as an HTTP response.
- One service owns each complete business resource. Complete mirrors must agree with the owner; purpose-specific events
  and read projections may remain smaller when their names and consumers make that role explicit.
- Blockout-owned HTTP bodies, responses, and query parameters use native camelCase. Database columns, environment
  variables, protocol fields, and provider-owned payloads retain their own naming.
- Use Nx targets for JavaScript/TypeScript and scraper task orchestration. Use the backend Maven reactor for
  cross-module
  Java validation.
- Remove obsolete and accidentally empty directories. Keep an otherwise empty directory with `.gitkeep` only when the
  current architecture explicitly requires that location before its first implementation; never preserve speculative
  package skeletons.
- Follow `references/figma-policy.md` for every task that reads, changes, compares against, or makes a decision in
  Figma. Never create a parallel canonical Blockout design file.

## Contract-First Baseline

The current V1 sources and generated transport boundaries are governed by `references/baseline-v1-policy.md` and
`references/contract-first.md`: OpenAPI sources are authoritative, generated output remains ignored, Java generated
models stay within adapters, Python scrapers use the shared generated models and HTTPX clients, and mobile uses its
generated Orval client. A future contract change requires an explicit task and proportional parity evidence.

## Roadmap And GitFlow

- `references/github-roadmap-policy.md` routes Roadmap operations to their single owner.
- Use `docs/runbooks/tasks/discovery.md` for read-only inspection, `acquisition.md` to reserve work, and `execution.md`
  for selected work through draft publication.
- Use `ready-drain.md` only for an explicitly requested compatible Ready frontier and `merge.md` only for an explicitly
  authorized release.
- Load lifecycle only for lifecycle or release decisions and governance only for Project structure.
- Apply the managed-checkout transport policy from Roadmap operations, the portable Git workflow, and
  `overlays/git-profile.md`.

## Repository Map

- Workspace: Nx 23 and npm workspaces.
- Mobile: `apps/frontend/mobile`, Expo and React Native.
- Backend: `apps/backend`, Maven reactor, Java 21, Spring Boot, JPA, Flyway, PostgreSQL, and RabbitMQ.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`, Python 3.12 applications.
- Local runtime: `infra/compose/docker-compose.third-party.yml` and `infra/compose/docker-compose.app.yml`.

## Common Verification

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
