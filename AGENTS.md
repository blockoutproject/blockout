# Blockout Agent Guidance

- Speak French in chat. Write repository files and GitHub content in English.
- Apply `.specify/memory/constitution.md` to product intent and Spec Kit artifacts. Use the applicable official `speckit-*` procedure; do not duplicate it locally.
- V2 is a complete backend, ingestion and mobile rebuild, including mobile internals. V1 code, technical models, contracts and architecture are historical discovery/transition evidence, not the target or a default to preserve. Derive technical choices from accepted V2 specs and approved plans; retain accepted semantics, design and continuity constraints. Existing paths, tools and platform skills describe how to work on the current tree, not a preselection of V2 architecture.
- Load only relevant standalone skills from `.agents/skills`. Apply `karpathy-guidelines` and `code-documentation` to changed handwritten code alongside its language and testing skills.
- Private functions may name a coherent step; a public boundary may have one consumer. Shared helpers require identical meaning and a concrete owner, not speculative reuse.
- Keep shared technical conventions in the copied personal skills. Product decisions, repository paths, actual versions and executable commands remain in this repository. Installing a skill does not authorize migrating existing code or dependencies.
- Use `github-delivery` for authorized issues, branches and draft PRs, subject to the owner-approved [planning-only initialization exception](docs/engineering/repository-boundaries.md#planning-only-initialization-history). During documentation-only planning, amend the single root initialization commit and keep `develop` and `main` aligned. Once implementation starts, applications deliver to `develop`, then promote to `main`; merges require an explicit human request.
- Validate every changed boundary against the intended final tree. Accumulate contract, language, database, framework/native and visual evidence where applicable; report passed, failed, skipped and unavailable checks with reasons and remaining risk. Policy-only changes require structure, links, formatting and behavior walk-throughs, not unrelated application runtimes.
- Keep official Spec Kit, Karpathy and other retained upstream skills intact. Nx skill availability does not authorize installing Nx Cloud, MCP or upgrading Nx.
- Never consult an archived or external repository unless a human explicitly asks. Historical links identify evidence; they do not grant that permission.

## Select by task

- Java/Spring/JPA: `java-spring`; JVM, database and integration tests: `java-testing`.
- REST, generated DTOs/clients/enums or response validation: `openapi-codegen`; Liquibase changes only: `liquibase-schema`.
- React feature/state/form/effect boundaries: `react-feature-architecture`, plus the owning platform and testing skills.
- Operational logs: `application-logging`; Dockerfile/Compose edits: `docker-conventions`. Identity, session and authorization work must read the local architecture identified below.
- SDD design workflow and dependency-based prototype planning: `design-workflow`; explicitly requested standalone prototypes: `design-prototyping`.
- Design authority and evidence: `figma-design-governance`, plus the available Figma tool skill for the requested operation.
- Nx: select the relevant official workspace, generation, task, linking, plugin, import or CI skill. Do not provision missing services implicitly.

- Native application: `react-native-expo` and `expo-testing`. Python: `python-development` and `python-testing`, loading ingestion references only for ingestion work.

## Repository inputs

- This is the dedicated `blockoutproject/blockout` repository. Read [repository boundaries](docs/engineering/repository-boundaries.md) for provenance and production scope.
- Product sources: `specs`, `docs/product`, `docs/architecture`. Accepted specifications remain authoritative; retained historical text is not a new technical recommendation.
- V2 target inputs: `docs/architecture/architecture-v2.md`, `blockout-domain-model-v2.md`, `v1-v2-transition-architecture.md` and `v2-planning-boundaries.md` in that directory. They constrain feature planning; they do not authorize production migration or bypass approved feature plans/tasks.
- `docs/architecture/mobile-and-identity-architecture-v1.md`, `blockout-domain-model-v1.md` and `docs/engineering/contract-pipeline.md` are historical evidence. They do not describe installed V2 projects or executable commands.
- Intended V2 locations are defined in `docs/architecture/v2-planning-boundaries.md`. Create only the applications, libraries, contracts and infrastructure authorized by approved plans/tasks; do not scaffold empty layers to mirror that table.
- Visual authorities: Blockout UI Library for foundations/components and Blockout Product Design for patterns/screens. Resolve exact approved links from the accepted issue and V2 planning boundaries.
- The legacy monorepo is not deployed. Running V1 instances originate from independent repositories; do not infer their live state from legacy files or inspect/change them without explicit authorization.
- Read owning manifests and approved plans for actual versions, targets, migration posture and generated outputs as each is introduced. No V1 manifest, lockfile or deployment workflow is executable authority for V2.

## Executable authority

- The foundation contains documentation and governance, not an initialized Nx runtime. Do not invent package scripts, application checks or installed framework versions.
- The documentation CI uses the pinned formatter command below and enforces `develop` as the only source for promotion PRs to `main`. Runtime CI and reproducible dependency installation belong to the subsequent Nx foundation plan.
- Formatting: `npx --yes prettier@3.9.6 --check README.md AGENTS.md "docs/**/*.md" "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json`.
- Markdown: validate routing, local links and historical source destinations against the intended final tree. Preserve `.agents/skills` and `.specify` imports byte-for-byte.
- Final diff: `git diff --check`. Once runtime projects exist, their committed manifests and Nx/Maven/uv/Expo targets become authoritative; validate the affected boundaries, including cross-language contract consumers.
