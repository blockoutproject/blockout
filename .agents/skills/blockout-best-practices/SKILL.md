---
name: blockout-best-practices
description: Route Blockout work to the smallest repository policy for GitHub issues, contracts, Java, Expo mobile, Python scrapers, tests, validation, and Figma.
---

# Blockout Best Practices

Read `AGENTS.md`, then select only the rows needed for the designated issue. Apply `karpathy-guidelines` whenever writing, reviewing, or refactoring code.

| Signal                                                      | Read                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Product behavior or accepted runtime                        | The designated issue and the applicable source, test, contract, or architecture document |
| Issue, branch, commit, pull request, or release             | `references/git-and-issues.md`                                                           |
| OpenAPI, DTO, generated server/client, or shared enum       | `references/contracts.md`                                                                |
| Spring Boot, Maven, Java structure, or backend design       | `references/backend-java.md`                                                             |
| Mapping between transport, application, and domain          | `references/mapping.md`                                                                  |
| REST route, controller, HTTP semantics, or pagination       | `references/rest.md` and `references/contracts.md`                                       |
| Application logging or operational diagnostics              | `references/logging.md`                                                                  |
| Javadoc, docstrings, TSDoc, comments, or exported contracts | `references/code-documentation.md`                                                       |
| Expo, React Native, mobile routing, forms, or UI            | `references/mobile-expo.md`, then the applicable technical skill                         |
| Nx project, target, dependency graph, or cache              | `nx-workspace-patterns`                                                                  |
| OIDC, Auth0, login, token storage, or logout                | `references/authentication.md`                                                           |
| Mobile test or component behavior                           | `references/mobile-testing.md` and `references/testing-and-validation.md`                |
| Python scraper, provider parser, or ingestion flow          | `references/python-scrapers.md`                                                          |
| Python scraper test or provider fixture                     | `references/python-scraper-testing.md` and `references/testing-and-validation.md`        |
| Java test, Spring test, or Testcontainers                   | `references/java-testing.md` and `references/testing-and-validation.md`                  |
| Validation scope, CI, local runtime, or smoke proof         | `references/testing-and-validation.md`                                                   |
| Figma design or visual evidence                             | `references/figma.md`, then the applicable Figma skill                                   |

Never consult an archived or external repository unless a human explicitly requests it.

## Repository Map

- Product sources: `docs/architecture`, `docs/decisions`, `docs/current`, and `docs/releases`.
- Mobile: `apps/frontend/mobile`.
- Backend reactor: `apps/backend`.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`.
- Contracts: `libs/shared/contracts` and `libs/shared/python-contract-clients`.
- Local runtime: `infra/compose`.

## Core Verification

```bash
npm ci
uv sync --locked --all-packages
npm run verify
git diff --check
git status --short
```

Report changed boundaries, checks run, skipped checks with reasons, commit SHA, push result, and worktree state.
