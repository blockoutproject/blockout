# Local Roadmap Task Execution

Use this runbook during Blockout migration to execute exactly one task from
`docs/current/blockout-active-roadmap.md`, validate it, record its evidence, commit it, and push it directly to
`origin/main`.

This is the only active task runbook until Phase MRG-1000 activates the Maaatch GitHub Roadmap and GitFlow. It does not
create an issue, branch, pull request, claim, or merge operation.

## Authorization Boundary

Invoking this runbook authorizes the repository changes, Git commit, and direct `main` push required for one roadmap
task. It never authorizes:

- production image publication or a Dokploy webhook;
- disabling a standalone repository workflow;
- destructive Git, history rewriting, force-push, or discarding unrelated work;
- product behavior or architecture decisions not already resolved by current sources;
- execution of a second roadmap task.

## Read-Only Selection

Before any repository or Git mutation:

1. Run `git status --short --branch` and require a clean worktree on local `main` tracking `origin/main`.
2. Read `docs/current/blockout-active-roadmap.md` from top to bottom.
3. Select the first unchecked item matching `- [ ] MRG-...`. Do not skip it for a more convenient later task.
4. Read its indented metadata and dependencies.
5. Treat the task as `DEFAULT_EXECUTION` unless it has the exact metadata line
   `- Execution mode: PLAN_REQUIRED`.
6. Stop without mutation when the task is blocked, depends on incomplete work, is already implemented, or cannot be
   scoped from current repository evidence.

## PLAN_REQUIRED Gate

Evaluate this gate immediately after selection and before fetching, synchronizing `main`, editing files, or changing
the roadmap.

- If the selected task is `DEFAULT_EXECUTION`, continue.
- If it is `PLAN_REQUIRED`, continue only when the current Codex collaboration mode is explicitly `Plan`.
- If Plan mode is absent, inactive, or cannot be proven, fail closed with this result:

```text
PLAN_REQUIRED: Codex Plan mode is not active. No repository or Git mutation was performed.
```

When Plan mode is active, follow its planning and approval lifecycle. Do not edit implementation files, mark the task
complete, commit, or push until the plan has been approved and execution is authorized.

## Main Preflight

After the execution-mode gate passes:

1. Fetch `origin/main`.
2. Require local `main` to equal `origin/main`; fast-forward it when it is only behind.
3. Stop on divergence, an unexpected upstream, a dirty worktree, or any unrelated local change.
4. Read `blockout-best-practices`, the current runtime context, the selected task's sources, and only the references
   required by its scope.
5. Derive a bounded implementation and validation set from the task. If a meaningful product, UX, architecture,
   ownership, deployment, or source decision remains unresolved, stop and change the task to `PLAN_REQUIRED` in a
   separate explicitly authorized roadmap-editing operation.

## Execution

1. Implement only the selected task.
2. Preserve current production behavior and deployable boundaries unless the task and user explicitly authorize a
   later cutover phase.
3. Add newly discovered follow-up work to the appropriate future roadmap phase only when it is necessary to keep the
   roadmap accurate; do not execute that follow-up now.
4. Run every scope-appropriate generation, validation, compile, build, or existing test required by
   `blockout-best-practices`.
5. Inspect the final diff and rerun invalidated checks after the last relevant edit.
6. If implementation or validation fails, leave the task unchecked and do not commit or push.

## Completion And Publication

Only after the implementation and all required validations succeed:

1. Change the selected checkbox from `[ ]` to `[x]`.
2. Add one indented `Evidence:` line naming the durable source and successful checks.
3. Run `npm run validate:docs`, `npm run validate:agents`, and `git diff --check` in addition to task-specific checks.
4. Stage only the intended task files and the roadmap evidence.
5. Inspect `git diff --cached --check`, the staged file list, and the staged diff.
6. Commit in English with a focused message containing the roadmap ID.
7. Fetch `origin/main` again and require the remote head to remain the preflight head. Stop on remote movement; never
   force-push or silently rebase a completed task.
8. Push the commit with `git push origin main`.
9. Monitor the resulting shadow CI run to completion. Report a failed CI without rewriting history or triggering
   production actions.
10. Stop after this single task.

## Final Report

Report the roadmap ID and title, execution mode, changed areas, validations and skipped checks, roadmap evidence,
commit, push result, CI result, and any real blocker. State explicitly that no production deployment occurred.
