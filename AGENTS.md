# Blockout Agent Guidance

- Speak French in chat. Write repository files and GitHub content in English.
- Apply `.specify/memory/constitution.md` to product intent and Spec Kit artifacts. Use the applicable official `speckit-*` procedure; do not duplicate it locally.
- Load only relevant standalone skills from `.agents/skills`. Apply `karpathy-guidelines` and `code-documentation` to changed handwritten code alongside its language and testing skills.
- Private functions may name a coherent step; a public boundary may have one consumer. Shared helpers require identical meaning and a concrete owner, not speculative reuse.
- Keep shared technical conventions in the copied personal skills. Product decisions, repository paths, actual versions and executable commands remain in this repository. Installing a skill does not authorize migrating existing code or dependencies.
- Use `github-delivery` for authorized issues, branches and draft PRs. Applications deliver to `develop`, then promote to `main`; merges require an explicit human request.
- Validate every changed boundary against the intended final tree. Accumulate contract, language, database, framework/native and visual evidence where applicable; report passed, failed, skipped and unavailable checks with reasons and remaining risk. Policy-only changes require structure, links, formatting and behavior walk-throughs, not unrelated application runtimes.
- Keep official Spec Kit, Karpathy and other retained upstream skills intact. Nx skill availability does not authorize installing Nx Cloud, MCP or upgrading Nx.
- Never consult an archived or external repository unless a human explicitly asks.

## Select by task

- Java/Spring/JPA: `java-spring`; JVM, database and integration tests: `java-testing`.
- REST, generated DTOs/clients/enums or response validation: `openapi-codegen`; Liquibase changes only: `liquibase-schema`.
- React feature/state/form/effect boundaries: `react-feature-architecture`, plus the owning platform and testing skills.
- Operational logs: `application-logging`; Dockerfile/Compose edits: `docker-conventions`. Identity, session and authorization work must read the local architecture identified below.
- Design authority and evidence: `figma-design-governance`, plus the available Figma tool skill for the requested operation.
- Nx: select the relevant official workspace, generation, task, linking, plugin, import or CI skill. Do not provision missing services implicitly.

- Native application: `react-native-expo` and `expo-testing`. Python: `python-development` and `python-testing`, loading ingestion references only for ingestion work.

## Repository inputs

- Product sources: `specs`, `docs/product`, `docs/architecture`. Read `docs/architecture/mobile-and-identity-architecture-v1.md` for authentication, session, PKCE, token handling and authorization decisions.
- Mobile: `apps/frontend/mobile`; routes: `apps/frontend/mobile/src/app`; supported platforms: iOS and Android. Feature/shared locations follow the accepted scope and actual source structure.
- Backend reactor: `apps/backend`. Scrapers: `apps/backend/club-scraper` and `apps/backend/competition-scraper`.
- Contracts: `libs/shared/contracts/specs/source`; shared schemas: its `shared/schemas` directory. Generated clients use configured Java `target` outputs, `libs/shared/python-contract-clients` and the mobile Orval configuration.
- Visual authorities: Blockout UI Library for foundations/components and Blockout Product Design for patterns/screens. Resolve exact approved links from the accepted issue.
- Read owning manifests, Compose files and accepted plans for actual versions, migration tool, deployment posture and generated outputs. A Liquibase skill is not authorization to replace existing Flyway migrations.

## Executable authority

Root `package.json` and owning Nx/Maven targets remain authoritative. Select only checks for changed boundaries:

- Contracts: `npm run contracts:test`, `npm run contracts:generate`, `npm run contracts:check-mappings`.
- Backend: `./mvnw -f apps/backend/pom.xml` with affected modules/goals; full verification: `npm run backend:verify`.
- Python: `npm run python-clients:verify`, `npm run scrapers:verify` or the owning focused target.
- Mobile: `npm run mobile:codegen`, `npm run mobile:lint`, `npm run mobile:typecheck`, `npm run mobile:test`, `npm run mobile:export` as required.
- Workspace: `npm run verify`; formatting: relevant `format:*`/`format:*:check`; final diff: `git diff --check`.
- Markdown: format changed personal guidance and validate routing/local links; preserve upstream imports byte-for-byte.
