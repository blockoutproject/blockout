---
name: blockout-best-practices
description: Route Blockout work to the smallest repository policy for Spec Kit SDD, GitHub issues and GitFlow, Figma gates, contract-first APIs, Java/JPA/Lombok/MapStruct, Expo or Next.js code, Liquibase, logging, documentation, and tests.
---

# Blockout Best Practices

Read `AGENTS.md`, then select only the rows needed for the current request or confirmed issue. Apply
`karpathy-guidelines` whenever writing, reviewing, or refactoring code.

Technical references contain reusable development choices. Their detailed rules are intentional: do not replace
selected libraries or boundary conventions with a shorter generic interpretation. Repository-specific paths, commands
and design-file names live in this entry point or the owning build/runtime configuration, not in copied overlays.
When reusing these references in another repository, adapt those inputs without importing product behavior, roadmap
state, framework versions or deployment topology. Load a framework reference only when that framework is in scope.

For any handwritten code creation, modification, or review, also read `references/code-documentation.md` alongside
the owning language policy. Apply its documentation requirements as part of the code change, not as an optional
follow-up. A documentation audit uses the full scope requested by the human.

| Signal                                                                      | Read                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Specification, plan, tasks, Spec Kit, or product behavior                   | The applicable official `speckit-*` skill, constitution, and feature artifacts    |
| Issue, branch, commit, pull request, or release                             | `references/git-and-issues.md`                                                    |
| OpenAPI, DTO, generated server/client, or shared enum                       | `references/contracts.md`                                                         |
| Spring Boot, Maven, Java, JPA entities/repositories, or persistence queries | `references/backend-java.md`                                                      |
| Liquibase changelog or replacement schema evolution                         | `references/liquibase.md`                                                         |
| Mapping between transport, application, and domain                          | `references/mapping.md`                                                           |
| REST route, controller, HTTP semantics, or errors                           | `references/rest.md` and `references/contracts.md`                                |
| Application logging or operational diagnostics                              | `references/logging.md`                                                           |
| Javadoc, docstrings, TSDoc, comments, or exported contracts                 | `references/code-documentation.md`                                                |
| Expo, React Native, mobile routing, forms, or UI                            | `references/mobile-expo.md`, then the applicable technical skill                  |
| Mobile test or component behavior                                           | `references/mobile-testing.md` and `references/testing-and-validation.md`         |
| Next.js routes, React web components, server actions, or web data           | `references/frontend-web.md`                                                      |
| Python scraper, provider parser, or ingestion flow                          | `references/python-scrapers.md`                                                   |
| Python scraper test or provider fixture                                     | `references/python-scraper-testing.md` and `references/testing-and-validation.md` |
| Java test, Spring test, or Testcontainers                                   | `references/java-testing.md` and `references/testing-and-validation.md`           |
| Validation scope, CI, Docker/Compose, local runtime, or smoke proof         | `references/testing-and-validation.md`                                            |
| Nx projects, task graph, caching, or workspace boundaries                   | `nx-workspace-patterns` and the owning language reference                         |
| Figma design or visual evidence                                             | `references/figma.md`, then the applicable Figma skill                            |

## Spec Kit Authority

Use the applicable official `speckit-*` skill for specification, clarification, planning, task derivation, analysis
and implementation. The constitution governs accepted product intent; `spec.md` owns behavior, `plan.md` derives
technical decisions, and `tasks.md` derives verifiable work. Keep those artifacts coherent when intent changes.
An existing endpoint, entity, historical implementation or generated client does not authorize new product behavior.

Follow `.specify/memory/constitution.md` and `references/git-and-issues.md` for applicability and execution ownership.
Keep issue state and delivery evidence in GitHub. Do not import legacy roadmap schemas, claim scripts, immutable-pin
protocols, merge trains or a second Spec Kit workflow. Maintenance remains governed by the current repository rules.

## Repository Map

- Product sources: `specs`, `docs/product`, and `docs/architecture`.
- Mobile: `apps/frontend/mobile`; supported native platforms: iOS and Android.
- Backend reactor: `apps/backend`.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`.
- Contracts: `libs/shared/contracts/specs/source`; shared transport schemas: its `shared/schemas` directory.
- Generated clients: configured Java outputs under `target`, `libs/shared/python-contract-clients`, and the mobile
  Orval configuration. Read the owning manifests for exact generated paths and supported targets.
- Mobile routing: `apps/frontend/mobile/src/app`; feature/shared locations follow the application's current structure.
- Visual authorities: Blockout UI Library for foundations/components; Blockout Product Design for product patterns
  and representative screens. Follow `references/figma.md` for the portable design rules.
- Versions, runtime topology and migration posture: the owning manifests, Compose configuration and accepted plan.
  Loading a technical reference does not select a new framework, application or deployment topology.

## Workspace Commands

Use the root `package.json` and owning Nx/Maven targets as executable authority. Select the commands required by
`references/testing-and-validation.md`; this list does not require a full workspace build for prose-only changes.

- Contracts: `npm run contracts:test`, `npm run contracts:generate`, `npm run contracts:check-mappings`.
- Backend: `./mvnw -f apps/backend/pom.xml` with the affected modules/goals; full verification: `npm run backend:verify`.
- Python: `npm run python-clients:verify`, `npm run scrapers:verify`, or the owning scraper's focused Nx target.
- Mobile: `npm run mobile:codegen`, `npm run mobile:lint`, `npm run mobile:typecheck`, `npm run mobile:test`,
  `npm run mobile:export` as required by the changed boundary.
- Workspace: `npm run verify`; formatting: the `format:*` and `format:*:check` scripts; diff hygiene: `git diff --check`.
- Documentation: run Prettier on the changed Markdown files and validate routing and local reference links.
