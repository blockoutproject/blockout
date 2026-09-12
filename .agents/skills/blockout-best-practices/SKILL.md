---
name: blockout-best-practices
description: Route Blockout work to the smallest repository policy for Spec Kit SDD, GitHub issues and GitFlow, Figma gates, contracts, Java, Expo mobile, Python scrapers, tests, and validation.
---

# Blockout Best Practices

Read `AGENTS.md`, then select only the rows needed for the current request or confirmed issue. Apply `karpathy-guidelines` whenever writing, reviewing, or refactoring code.

| Signal                                                      | Read                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Specification, plan, tasks, Spec Kit, or product behavior   | The applicable official `speckit-*` skill, constitution, and feature artifacts    |
| Issue, branch, commit, pull request, or release             | `references/git-and-issues.md`                                                    |
| OpenAPI, DTO, generated server/client, or shared enum       | `references/contracts.md`                                                         |
| Spring Boot, Maven, Java structure, or backend design       | `references/backend-java.md`                                                      |
| Liquibase changelog or replacement schema evolution         | `references/liquibase.md` and `references/liquibase-profile.md`                   |
| Mapping between transport, application, and domain          | `references/mapping.md`                                                           |
| REST route, controller, HTTP semantics, or pagination       | `references/rest.md` and `references/contracts.md`                                |
| Application logging or operational diagnostics              | `references/logging.md`                                                           |
| Javadoc, docstrings, TSDoc, comments, or exported contracts | `references/code-documentation.md`                                                |
| Expo, React Native, Nx, mobile routing, forms, or UI        | `references/mobile-expo.md`, then the applicable technical skill                  |
| OIDC, Auth0, login, token storage, or logout                | `references/authentication.md`                                                    |
| Mobile test or component behavior                           | `references/mobile-testing.md` and `references/testing-and-validation.md`         |
| Python scraper, provider parser, or ingestion flow          | `references/python-scrapers.md`                                                   |
| Python scraper test or provider fixture                     | `references/python-scraper-testing.md` and `references/testing-and-validation.md` |
| Java test, Spring test, or Testcontainers                   | `references/java-testing.md` and `references/testing-and-validation.md`           |
| Validation scope, CI, local runtime, or smoke proof         | `references/testing-and-validation.md`                                            |
| Figma design or visual evidence                             | `references/figma.md`, then the applicable Figma skill                            |

## Repository Map

- Product sources: `specs`, `docs/product`, and `docs/architecture`.
- Mobile: `apps/frontend/mobile`.
- Backend reactor: `apps/backend`.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`.
- Contracts: `libs/shared/contracts` and `libs/shared/python-contract-clients`.
