# Risk-Based Validation Policy

Read this before selecting, reducing, skipping, or reporting task validation.

## Selection Rules

Bind evidence to the exact intended tree and changed boundaries. Start with the smallest applicable row below, combine
rows when a change crosses boundaries, and expand to the next safer profile when ownership, impact, or evidence is
ambiguous. A narrow diff is not low risk when it changes a shared or privileged boundary.

| Change class                                      | Minimum validation                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation or guidance only                    | Format and link checks for the changed material, rendered or structural inspection when presentation matters, and diff hygiene. Existing repository CI may own unrelated integration checks.        |
| Isolated application logic                        | Focused tests for changed behavior, the owning application's type or compile check, and its formatting or static analysis.                                                                          |
| User interface or mobile behavior                 | Focused component or hook tests, type checking, and a representative interaction or visual comparison when behavior or appearance changes.                                                          |
| Backend service behavior                          | Focused unit or slice tests and compilation for the owning module. Add integration evidence when framework wiring, serialization, transactions, or infrastructure behavior is part of the contract. |
| Persistence or schema migration                   | Migration-chain execution against the supported database, persistence integration tests, and owning-service validation.                                                                             |
| REST or authentication boundary                   | Positive and negative endpoint evidence for status, validation, authorization, and error mapping, plus owning-service validation. Include the contract row when the wire shape changes.             |
| Contract, generated boundary, or shared model     | Regenerate from the owning source, prove a clean deterministic diff, and compile or test every affected consumer.                                                                                   |
| Shared library or cross-application boundary      | Focused owner tests plus compile, type, or contract checks for every affected consumer.                                                                                                             |
| Dependency, build, runtime, or tool configuration | Validate the changed configuration, dependency resolution, and every affected build or runtime owner. Add platform or native build evidence when the dependency crosses that boundary.              |
| Security, release, or workflow control            | Exercise the changed control and its failure path, preserve existing repository enforcement, and run the broad affected validation set.                                                             |

The skill entry point and repository build configuration supply concrete commands. Focused policies may add stronger
boundary-specific evidence; their requirements accumulate, and this table never weakens a selected policy.

## Scope And Documentation-Only Changes

Classify the complete diff, not its title, extension or file count. Prose-only guidance requires formatting, link and
routing checks, consistency review and a practical walk-through of the changed rule. It does not require starting
unrelated applications, databases, identity providers or devices. A policy change does not demonstrate code compliance.

Contracts, migrations, executable scripts, dependency manifests, CI and runtime configuration are not documentation-only.
Validate every affected owner and consumer. If the change alters a control, exercise its meaningful success and failure
paths. Do not import an unrelated release workflow or reduce a mandatory boundary check to unit tests.

## Skips And Fallbacks

A skip record names the omitted check, why it could not or should not run, the remaining risk, any replacement evidence,
and the authority for a waiver when one is required. Tool absence, unavailable infrastructure, time pressure, a small
diff, or implementation confidence does not silently downgrade a mandatory check.

Use equivalent evidence only when it proves the same boundary and failure mode. If mandatory evidence has no valid
fallback, leave the validation failed or blocked. Report successful, failed, skipped, and unavailable checks
separately.

## Reporting Evidence

Before publication, verify that the intended tree is unchanged since each reusable check, inspect the complete diff and
worktree, and record:

- changed boundaries and selected change classes;
- checks and results;
- explicit skips, fallbacks, residual risk, and waivers; and
- any ambiguity that caused a broader profile.

A new commit or relevant worktree change invalidates affected evidence.

## Local Runtime And Containers

- Read the actual Dockerfiles, Compose definitions, environment examples and build targets for the changed owner.
  Preserve the separation between application and infrastructure definitions when the workspace uses it.
- Use stable configured ports and project names. Report actual port conflicts; do not introduce dynamic indirection
  or move application ports to accommodate a tool default.
- Keep Dockerfiles application-owned. Use a builder/runtime split when it removes build tools from the final image.
  Do not install the workspace task runner in runtime images or create generic wrappers around simple Dockerfiles.
- Preserve command, workdir, environment, health behavior and required files unless the task changes them.
- Maintain safe `.env.example` files; local overrides, credentials, private keys, provider state and production data stay
  outside Git. Do not dump resolved environment values into logs or evidence.
- Start only the dependencies required for the scoped smoke. Use controlled data and providers. Identify external
  write paths before running a scraper or scheduled task; do not send uncontrolled writes as a side effect of validation.
- Confirm effective configuration, startup, health, required ports and one representative owned flow. A running process
  alone is not proof that the feature works.
- Preserve user-owned processes. Track processes started for the task, retain a healthy session during iterative visual
  work, and stop or retain task-owned processes according to the requested lifecycle. Report incomplete dependencies.
- Reuse healthy infrastructure where appropriate, but ensure the application under test runs the intended source tree.
  Do not reuse earlier screenshots or startup results as evidence of changed code.

## Generated And Workspace Boundaries

- Regenerate from source in the configured order: bundle contracts, synchronize schema mappings, generate languages,
  compile/import packages, then validate affected consumers. Check deterministic output and ignored generated files.
- Include the owning Python scraper fixtures and verification target for provider parsing or orchestration changes.
  Follow `python-scraper-testing.md`; a backend test does not validate its scraper client.
- Include the configured mobile generation, tests and type checks for client changes; add lint/export and native smoke
  according to `mobile-testing.md`. Use the framework web build for changed web routing or server/client boundaries.
- Run formatting, `git diff --check`, ignored-output checks and the final worktree review. Report a successful Sonar
  analysis only when it actually ran; compilation and manual review do not prove zero Sonar warnings.
