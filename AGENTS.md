# Blockout Agent Guidance

- Speak French in chat. Write repository files and GitHub content in English.
- Apply `.specify/memory/constitution.md` to product intent and Spec Kit artifacts. Use the applicable official `speckit-*` procedure; do not duplicate it locally.
- V2 is a complete backend, ingestion and mobile rebuild, including mobile internals. V1 code, technical models, contracts and architecture are historical discovery/transition evidence, not the target or a default to preserve. Derive technical choices from accepted V2 specs and approved plans; retain accepted semantics, design and continuity constraints. Existing paths, tools and platform skills describe how to work on the current tree, not a preselection of V2 architecture.
- Load only relevant standalone skills from `.agents/skills`. Apply `karpathy-guidelines` to changed handwritten code and `code-documentation` throughout each touched handwritten code file, alongside its language and testing skills.
- Private functions may name a coherent step; a public boundary may have one consumer. Shared helpers require identical meaning and a concrete owner, not speculative reuse.
- Use `project-documentation` for shared technical references and authorized `docs` consolidation. Follow its common catalogue; retain current source routing until an authorized transfer is complete. Spec Kit owns its artifacts and procedures.
- Keep shared technical conventions in the copied personal skills. Product decisions, repository paths, actual versions and executable commands remain in this repository. Installing a skill does not authorize migrating existing code or dependencies.
- Use `github-delivery` for authorized issues, branches and draft PRs, subject to the owner-approved [planning-only initialization exception](#planning-only-initialization-history). During documentation-only planning, amend the single root initialization commit and keep `develop` and `main` aligned. Keep the planning bypass enabled throughout this phase; remove it before the first implementation change. Once implementation starts, applications deliver to `develop`, then promote to `main`; merges require an explicit human request.
- Use `proportionate-design` for consequential requirement and technical design decisions, and when implementation reveals structural friction. Keep routine implementation choices autonomous within accepted behavior and constraints. Use the accepted [architecture](docs/architecture.md) and owning specifications. Ordinary failures may use operator diagnosis and manual correction; a persistent crash does not itself require automatic recovery. Rare exceptional support duplicates are accepted. Product changes return to their specification and affected design authority.
- Validate every changed boundary against the intended final tree. Accumulate contract, language, database, framework/native and visual evidence where applicable; report passed, failed, skipped and unavailable checks with reasons and remaining risk. Policy-only changes require structure, links, formatting and behavior walk-throughs, not unrelated application runtimes.
- Keep official Spec Kit, Karpathy and other retained upstream skills intact. Nx skill availability does not authorize installing Nx Cloud, MCP or upgrading Nx.
- Never consult an archived or external repository unless a human explicitly asks. Historical links identify evidence; they do not grant that permission.

## Select by task

- Java/Spring/JPA: `java-spring`; JVM, database and integration tests: `java-testing`.
- REST, generated DTOs/clients/enums or response validation: `openapi-codegen`; Liquibase changes only: `liquibase-schema`.
- React feature/state/form/effect boundaries: `react-feature-architecture`, plus the owning platform and testing skills.
- Operational logs: `application-logging`; Dockerfile/Compose edits: `docker-conventions`. Identity, session and authorization work must read [the architecture](docs/architecture.md).
- SDD design workflow and dependency-based prototype planning: `design-workflow`; explicitly requested standalone prototypes: `design-prototyping`.
- Design authority and evidence: `figma-design-governance`, plus the available Figma tool skill for the requested operation.
- Nx: select the relevant official workspace, generation, task, linking, plugin, import or CI skill. Do not provision missing services implicitly.

- Native application: `react-native-expo` and `expo-testing`. Python: `python-development` and `python-testing`, loading ingestion references only for ingestion work.

## Repository inputs

- This dedicated `blockoutproject/blockout` repository has independent history. The [README](README.md#provenance) records its foundation and the distinction from deployed V1 repositories. New work uses this repository's issues; historical links retain explicit `blockout-legacy` identity and exact accepted revisions.
- Accepted [owning specifications](README.md#specifications) carry product vocabulary, identities, relationships and invariants. Feature plans derive coherent technical models/contracts and reference their semantic owners; no shared model or historical inventory remains under `docs`.
- The approved [architecture](docs/architecture.md) governs technical planning. Derive each feature plan, research, model, contracts, validation guide and tasks through official Spec Kit procedures. No performance/load/capacity qualification or monthly availability accounting belongs to the scope or a deferred roadmap item.
- Create only applications, libraries, contracts and infrastructure authorized by approved plans/tasks at their selected locations; do not scaffold empty layers. Existing skills and historical manifests do not select architecture, versions or executable commands.
- [Design references](docs/design.md) route the prototype, UI Library, Product Design and exact approvals. Existing approval covers unchanged journeys; obtain complete affected-prototype approval, then Figma approval, before finalizing a materially changed UI plan. Keep dossier acceptance and runtime/native/provider qualification distinct.
- The legacy monorepo is not deployed. Running V1 instances originate from independent repositories. Neither foundation nor historical links authorize inspecting archived/independent repositories, exporting data, changing production, migrating data, or mutating Auth0, RevenueCat, AWS or Hostinger/Dokploy resources. The separately authorized prototype follows its own instructions.
- Repository/GitHub prose and Blockout-owned example labels are English; preserve exact provider values, proper names and data required by a validation case. This does not alter the French product-language requirement.
- A public application repository does not satisfy F10 private support intake. Never submit private user diagnostics or attachments here; the future adapter requires its separately configured private destination.

## Planning-only initialization history

The owner explicitly requires one evolving root initialization commit during documentation-only planning. Amend it and publish the same revision to `develop` and `main`, without a second or merge commit for each planning iteration. This exception replaces topic-branch/PR publication only for this phase.

Before each rewrite, verify the clean starting state, inspect every remote branch and preserve a recoverable local bundle outside the repository. Preserve all intended local changes for the amendment; never overwrite concurrent work. Publish both branches atomically with explicit `--force-with-lease=<ref>:<observed-sha>` expectations. Stop on any unexpected remote change. Verify both remote revisions and inspect CI on the published revision.

Keep the planning bypass enabled throughout this phase; do not toggle protections at each publication. Both rules retain normal checks/reviews and deletion prevention. Administrator enforcement is disabled (`isAdminEnforced: false`); force-push bypass names only owner `hugoecken` (`bypassForcePushActorIds: ["U_kgDOCe72PA"]`). Unrestricted force pushes remain disabled (`allowsForcePushes: false`). Verify this scoped configuration and never broaden its actors. `main` requires the up-to-date `verify` check, conversation resolution and stale-review dismissal, with zero required approvals. `develop` retains its existing protection settings without new approval/check policy.

The exception covers specifications, architecture, plans and associated governance. It does not authorize production/runtime implementation, workspace dependency installation, executable application/build scaffolding or provider operations, and waives neither validation nor design gates. Amend the constitution only through its official procedure when explicitly authorized; preserve imported upstream skills/templates/scripts byte-for-byte. GitHub owns decisions and acceptance, not a parallel Markdown delivery log.

Before the first executable workspace/build/runtime change in this repository, remove the force-push actor allowance (`bypassForcePushActorIds: []`) and enable administrator enforcement (`isAdminEnforced: true`) on both branches, retaining unrestricted-force-push prohibition and every other protection. Verify before implementation; freeze the initialization commit. Then resume issue-owned topic branches/draft PRs to `develop`, promotion only from `develop` to `main`, explicit human merge authorization, merge commits and automatic deletion of merged topic branches. Never amend the root after implementation starts.

## Executable authority

- The foundation contains documentation and governance, not an initialized Nx runtime. Do not invent package scripts, application checks or installed framework versions.
- The documentation CI uses the pinned formatter command below and enforces `develop` as the only source for promotion PRs to `main`. Runtime CI and reproducible dependency installation belong to the subsequent Nx foundation plan.
- Formatting: `npx --yes prettier@3.9.6 --check README.md AGENTS.md "docs/**/*.md" "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json`.
- Markdown: validate routing, local links and historical source destinations against the intended final tree. Preserve `.agents/skills` and `.specify` imports byte-for-byte; only an explicitly authorized constitution amendment may change `.specify/memory/constitution.md`.
- Final diff: `git diff --check`. Once runtime projects exist, their committed manifests and selected native-tool/Nx targets become authoritative; validate the affected boundaries, including cross-language contract consumers.
