# Blockout Agent Guidance

- Speak French in chat. Write repository and GitHub prose in English; preserve exact provider values, proper names and validation data.
- Apply the [constitution](.specify/memory/constitution.md) and the installed official Spec Kit procedure. Check official documentation for the installed version before changing Spec Kit behavior; do not reproduce its procedures here or in issues.
- Use native Spec Kit artifacts for specifications, planning and tasks. Do not create a parallel documentation catalogue for these responsibilities. Ordinary repository maintenance does not need an invented feature specification.
- Keep each native Spec Kit artifact focused on the purpose defined by its official procedure. Present the current applicable state; retain rationale, precise references and evidence limits where they support decisions or verification. Prefer links to owning sources over duplicated content, and keep routine session or delivery narration in the conversation or GitHub. Remove repetition without weakening requirements, decisions or validation.
- Load only relevant skills. Personal skills supply technical expertise and delivery mechanics; their presence selects no stack and authorizes no migration or service installation.
- Apply `karpathy-guidelines` to changed handwritten code and `code-documentation` throughout touched handwritten code files, with the applicable language/testing skills. Keep official upstream imports intact.
- Use `github-delivery` for authorized issues and publication under the Git delivery policy below. Existing authorization remains valid; issue labels do not switch Codex modes.
- Never inspect an archived or independent repository without an explicit human request. Links are references, not permission.

## Repository context

- V2 rebuilds backend, ingestion and mobile internals. Historical V1 technology is not a default; preserve accepted behavior and continuity obligations. The initial executable workspace contains backend, collector and native mobile launchers; owning feature lots implement business behavior.
- This repository has independent history. Historical references retain their `blockout-legacy` identity; they authorize no inspection of other repositories or production/provider changes.
- F10 requires a private support destination. Never put private diagnostics or attachments in this public repository.

## Design inputs

- Prototype: [blockoutproject/product-prototype](https://github.com/blockoutproject/product-prototype).
- Figma: [Blockout UI Library](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library) and [Blockout Product Design](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design).
- Existing design baseline: [global acceptance](https://github.com/blockoutproject/blockout-legacy/issues/298#issuecomment-5969051828), superseded only within the scopes of [October 6](https://github.com/blockoutproject/blockout/issues/34#issuecomment-6021179909), [October 10](https://github.com/blockoutproject/blockout/issues/34#issuecomment-6102118765), [F01](https://github.com/blockoutproject/blockout/issues/21#issuecomment-6076074926), [F12](https://github.com/blockoutproject/blockout/issues/37) and [F14](https://github.com/blockoutproject/blockout/issues/38#issuecomment-6096348752) approvals. These establish design only; technical acceptance is withdrawn.

## Select by task

- Significant requirement/technical tradeoffs or structural friction: `proportionate-design`; keep routine implementation choices autonomous within accepted constraints.
- Prototype construction/review: `design-prototyping`. Figma organization/evidence: `figma-design-governance` plus the applicable Figma tool skill. The constitution owns prerequisites.
- Java/Spring/JPA: `java-spring`; JVM/database tests: `java-testing`.
- HTTP contracts and generation: `openapi-codegen`; Liquibase changes only: `liquibase-schema`.
- React feature/state/form boundaries: `react-feature-architecture` plus the selected platform/testing skills.
- Logging: `application-logging`; apply the explicit F05/F11 exception only to private original-target references needed for manual account cleanup, as defined in their owning specifications. It permits no public identifier, credential or payload disclosure. Container configuration: `docker-conventions`.
- Nx: the relevant official workspace, generation, task, linking, plugin, import or CI skill; do not enable Nx Cloud/MCP or upgrade Nx implicitly.
- If Expo is selected: `react-native-expo` and `expo-testing`. Python: `python-development` and `python-testing`; load ingestion references only for ingestion work.

Identity, session and authorization work reads its owning specifications and applicable approved plans. Concrete paths, versions and executable commands belong to this repository, not portable skills.

## Git delivery

All repository changes, including specifications, decisions, technical planning, documentation and governance, use issue-owned topic branches and draft PRs to `develop`. Promote to `main` only through a PR from `develop`. Follow `github-delivery`; merges require explicit human authorization, use merge commits and automatically delete merged topic branches.

Planning is not an exception to PR review. Direct pushes to integration branches or amendments of the root commit require an explicit owner request for that specific operation. Previous one-off authorization does not create a standing exception.

For an explicitly authorized history rewrite, verify the clean starting state and inspect every remote branch and overlapping work. Preserve all intended local changes and a recoverable Git bundle outside the repository. Never overwrite concurrent work or alter unrelated branches. Publish the requested branch updates atomically with explicit `--force-with-lease=<ref>:<observed-sha>` expectations. Stop on unexpected remote changes; verify the resulting remote revisions and CI.

Keep normal branch protections active; there is no planning bypass. Do not weaken protections without explicit owner authorization. After any authorized temporary exception, restore the normal protections and verify them. Delivery does not widen the issue's scope or waive specification validation and design gates.

On `develop` and `main`, administrator enforcement is enabled (`isAdminEnforced: true`), force-push bypass actors are empty (`bypassForcePushActorIds: []`), unrestricted force pushes remain disabled (`allowsForcePushes: false`) and deletion prevention remains enabled. Preserve every other protection: `main` requires the up-to-date `verify` check, conversation resolution and stale-review dismissal, with zero required approvals; `develop` retains its existing check and review settings.

## Verification

Before delivery, review every added or modified handwritten test against the applicable testing skill and its canonical examples; passing checks alone do not establish compliance.

For native UI checks, prefer the official [agent-device skill](.agents/skills/agent-device/SKILL.md) and [setup](README.md#native-ui-checks). Target the task's device and session explicitly; use desktop automation for host setup or unsupported interactions, and diagnose repeated unchanged failures.

Reuse compatible development builds and task-owned services/devices. Prefer standalone Android Emulator and compact Device Hub windows, and serialize desktop interactions.

Use the actual [README verification commands](README.md#verification), Nx npm/Maven targets and committed [CI](.github/workflows/ci.yml). Check structure, links and formatting for guidance changes, and execute the affected application checks for source/configuration changes. Applications run on the host; local Compose owns PostgreSQL infrastructure. Keep generated outputs ignored and use native development builds for mobile runtime evidence.

Validate affected boundaries proportionately and report passed, failed and unavailable evidence. Documentation checks, application startup and mobile JavaScript exports do not establish design, native or provider approval. Preserve official Spec Kit imports; constitution changes use `speckit-constitution`, and personal skills are copied from their reviewed bank.
