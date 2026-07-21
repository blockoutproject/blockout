---
name: blockout-best-practices
description: Use when working in the Blockout monorepo on Nx workspace structure, Spring Boot or Maven backend code, JPA or Flyway persistence, REST APIs and handwritten transport models, RabbitMQ messaging, Python scrapers, Expo mobile code, logging, tests, local runtime, documentation, or repository architecture.
---

# Blockout Best Practices

Use this skill as the Blockout router. Apply the universal guardrails below, then read only the references required by
the current task. Detailed rules live in the references rather than in this entrypoint.

## Discipline

- Inspect Git, the current sources, and `docs/current/roadmap.md` before changing code.
- Apply `karpathy-guidelines` whenever writing, reviewing, or refactoring code.
- Make the smallest coherent change that fits the established architecture. Avoid speculative abstractions and adjacent
  cleanup.
- Treat uncommitted changes as user-owned until inspection proves otherwise.
- State assumptions before relying on an ambiguous product, model, or architecture decision.
- Validate proportionally to risk: narrow checks while developing, impacted application checks before completion, and
  the complete local baseline when a shared boundary changes.
- Report checks that were intentionally skipped and why.

## Source Router

| Task signal                                                                   | Read                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Java package structure, Spring service, Maven module, or application boundary | `references/backend-java-policy.md`                                                     |
| Javadoc, source comments, or a handwritten public/local contract              | `references/code-documentation-policy.md`                                               |
| Backend Java tests                                                            | `references/java-testing-policy.md`                                                     |
| JPA entity, repository, migration, or PostgreSQL schema                       | `references/persistence-policy.md`                                                      |
| Request, response, controller, mapping, error, collection, or pagination      | `references/rest-api-policy.md`                                                         |
| OpenAPI source, generated DTO/client, transport enum, or code generation      | `references/contract-first-policy.md`                                                   |
| Java, Python, or mobile logging                                               | `references/logging-policy.md`                                                          |
| Python scraper code, model, dependency, or fixture                            | `references/python-scraper-policy.md` and `references/python-scraper-testing-policy.md` |
| Expo, React Native, Formik, Yup, or mobile HTTP boundary                      | `references/mobile-expo-policy.md`, `references/mobile-testing-policy.md`, and `vercel-react-native-skills` |
| Mobile Jest or React Native Testing Library test                              | `references/mobile-testing-policy.md`                                                   |
| React component API, provider composition, or reusable mobile UI architecture | `vercel-composition-patterns` in addition to the applicable mobile policy               |
| Docker Compose, `.env.example`, local services, or runtime smoke              | `references/local-runtime-policy.md`                                                    |
| Nx projects, targets, tags, graph, or cache                                   | the `nx-workspace-patterns` skill                                                       |
| Business model ownership or current refactor scope                            | `docs/current/refactor-direction.md` and the owning application sources                 |

When current sources do not justify a proposed behavior, stop the runtime change and request a product or architecture
decision. Historical code and deferred plans do not activate work by continuity.

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
- Keep generated output, build artifacts, local environments, caches, logs, and secrets out of Git.
- Preserve existing runtime behavior unless the active roadmap task explicitly authorizes a behavior correction.
- Maaatch is a read-only structural reference. Reuse its policies and vocabulary patterns, never its business code.

## Staged Contract Adoption

REF-041 activates the OpenAPI generation foundation. Contract ownership now follows
`references/contract-first-policy.md`, but each vertical remains handwritten until its ordered roadmap task proves DTO
readiness and adopts the generated boundary. Do not generate or migrate a later vertical by continuity.

Blockout does not use GitFlow or a GitHub Project roadmap yet:

- `docs/current/roadmap.md` is the temporary ordered task source.
- Work directly on `main`; commit and push each completed roadmap task separately.
- Do not create task branches, pull requests, claims, CI workflows, deployment workflows, or GitHub Project state.

These are explicit temporary rules. Only a later user-authorized roadmap task may replace them.

## Repository Map

- Workspace: Nx 23 and npm workspaces.
- Mobile: `apps/frontend/mobile`, Expo and React Native.
- Backend: `apps/backend`, Maven reactor, Java 21, Spring Boot, JPA, Flyway, PostgreSQL, and RabbitMQ.
- Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`, Python 3.12 applications.
- Local runtime: `infra/compose/docker-compose.third-party.yml` and `infra/compose/docker-compose.app.yml`.

## Common Verification

```bash
npm exec nx show projects
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/club-scraper:test
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:test
mvn -f apps/backend/pom.xml test
git diff --check
```

Finish by reporting changed boundaries, checks run, intentional skips, commit SHA, push result, and worktree state.
