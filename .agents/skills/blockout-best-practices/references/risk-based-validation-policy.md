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

The repository router supplies concrete commands and focused policies may add stronger boundary-specific evidence. Their
requirements accumulate; this table never weakens a selected policy.

## Documentation-Only Release Classification

A pull request is documentation-only only when inspection of its complete diff proves that every changed path is
non-executable prose or guidance and that no changed file is consumed by a build, runtime, deployment, security
enforcement, generated boundary, or executable repository automation.

The classification excludes code, tests, contracts, schemas, migrations, generated files, dependency manifests,
lockfiles, environment or runtime configuration, CI or hosting workflow definitions, executable scripts, binary
assets, and mixed-scope diffs. A path extension, label, title, Workset, or author statement is insufficient evidence.
Ambiguity fails closed to the applicable technical profile. This release classification decides only whether local
runtime smoke is applicable; it does not lower the task's risk class or validation of the changed guidance.

For a documentation-only candidate, the repository release proof consists of:

- format, link, rendered or structural, and diff-hygiene checks applicable to the changed material;
- consistency checks across every affected guidance owner and consumer;
- a positive walk-through of the changed rule and its fail-closed path when the guidance changes review, validation,
  or release behavior; and
- all applicable hosting checks, review evidence, head binding, and human release authorization.

The complete local runtime smoke is not applicable to this class. Do not inventory, restart, or require repository
applications, infrastructure, identity-provider flows, simulators, or devices merely to release a documentation-only
candidate. Record the classification evidence and the intentionally skipped runtime profile on the exact candidate
head.

## Non-Reducible Boundaries

Do not choose a documentation-only or isolated-owner profile for contracts, authentication, authorization, security,
schema migrations, dependencies, workflows, release controls, generated output, or shared boundaries. Validate every
affected owner and consumer. When the affected set cannot be established confidently, use the broader repository
profile or stop until ownership is clear.

Documentation that changes a security, workflow, or release rule remains in that higher-risk validation class even
when it passes the documentation-only release classification. Exercise the changed control and its failure path, but
do not add unrelated runtime evidence. For every candidate outside the documentation-only class, run the repository's
complete release profile unchanged unless the current release owner explicitly authorizes a documented waiver.

## Skips And Fallbacks

A skip record names the omitted check, why it could not or should not run, the remaining risk, any replacement evidence,
and the authority for a waiver when one is required. Tool absence, unavailable infrastructure, time pressure, a small
diff, or implementation confidence does not silently downgrade a mandatory check.

Use equivalent evidence only when it proves the same boundary and failure mode. If mandatory evidence has no valid
fallback, leave the validation failed or blocked. Report successful, failed, skipped, and unavailable checks
separately.

## Publication Evidence

Before publication, verify that the intended tree is unchanged since each reusable check, inspect the complete diff and
worktree, and record:

- changed boundaries and selected change classes;
- checks and results;
- explicit skips, fallbacks, residual risk, and waivers; and
- any ambiguity that caused a broader profile.

A new commit or relevant worktree change invalidates affected evidence.
