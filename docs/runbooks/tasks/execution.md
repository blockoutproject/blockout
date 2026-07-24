# Task Execution Runbook

Use this only after GIT-009 when the user asks to plan or execute a selected or acquired Blockout issue.

## Rules

- Preserve unrelated work and implement only the claimed issue's frozen Workset.
- Do not hand-edit generated artifacts.
- Do not plan, branch, or edit task files before a stable claim.
- `PLAN_REQUIRED` also needs current-user plan approval before branch or task-file edits.
- Use one authenticated `gh` identity for issue, Project, and PR operations.
- Route network and `.git` writes through the authorized managed-checkout path on their first attempt.
- Read Roadmap operations and load lifecycle/governance only when the operation needs them.

## Entry Profile

Always start with `git status --short --branch`, inspect relevant dirty diffs, and select one profile:

### `FRESH`

1. Read Roadmap operations.
2. Read the complete Project index, target, fields, labels, assignees, dependencies, linked PRs, Workset, and
   active/quarantined claims.
3. Read current scope-specific policies, source, architecture, contract, evidence, and Figma resources.
4. Confirm source gate, Execution Mode, Ready contract, Workset grammar, and conflicts before claim.

### `ACQUIRED_SAME_TASK`

1. Reuse the uninterrupted stable acquisition evidence and loaded sources.
2. Revalidate only target, claim owner/event, Workset/conflicts, branch, PR, and unexpected Project drift.
3. Continue from branch creation without selecting or assigning again.

### `RESUME`

1. Read operations when not already loaded.
2. Obtain a fresh compact index and read target, Workset/conflicts, assignment event, branch, PR, and sources that may
   have drifted.
3. Continue from the first incomplete postcondition without assigning again.

`BLOCK` stops every profile. Connector fallback requires matching authenticated identities.

## Claim Preflight

Resume active work only when exactly the authenticated login owns it. Stop when another user owns it. Quarantine Ready
with an assignee, active status without exactly one assignee, closed non-terminal items, and invalid active Worksets or
areas. Reserve parseable locks; stop all acquisition when active locks cannot be determined.

Without a coherent resumable claim:

1. Read the compact Project and targeted evidence.
2. Compare the target Workset to every active and quarantined claim.
3. Require unassigned target and authenticated intended assignee.
4. Add exactly that assignee and set Status to `In Progress`.
5. Obtain two matching snapshots covering status, assignment event, Worksets, and conflicts.

On ambiguity, use operations' partial recovery and arbitration. Only a unique conflict-free stable winner proceeds.

## Planning Gate

For `PLAN_REQUIRED`:

1. Research the named product, UX, visual, architecture, ownership, source-gate, or priority decision with the current
   user.
2. Keep branch creation and task-file edits closed until plan approval.
3. Expand Workset before touching any newly approved lock.
4. Release back to Ready when planning is abandoned.
5. Apply lifecycle Blocked state when a real blocker remains.

The planning claim reserves scope; it is not implementation approval.

## Scope Expansion

Before a new path or external resource is touched, follow operations' expansion protocol. Update the visible Workset,
recalculate conflicts, align areas, and reread. Expansion yields to incumbents and rolls back fully on conflict.

## GitFlow

Follow `git-workflow.md`:

1. Create or reuse the claimed issue branch from current `develop`.
2. Implement only the Workset.
3. Run scope-appropriate generation and validation.
4. Inspect and stage only intended files.
5. Commit and push.
6. Open or update one draft PR to `develop`.
7. Apply two to four PR labels as a separate step and use the correct `Refs` or `Closes` link mode.
8. Verify labels and structural issue link.
9. Transition to `In Review` and reread target, PR, assignee, Workset, and Status.

A Ready-drain worker stops here and never selects another issue.

This runbook authorizes normal non-destructive Git/GitHub operations for the claimed task. It never authorizes
destructive Git, unrelated staging, generated hand-edits, auto-merge, force pushes outside controlled refresh, check
waivers, or merge.

## Release

Merge always needs separate current-user authorization. Before it:

- make the PR ready;
- reread latest head, base, diff, claim, Workset, criteria, reviews, and checks;
- refresh by rebase when `develop` changed;
- rerun affected validation;
- record any explicit check waiver; and
- use the single-PR merge runbook when requested.

After merge or another terminal/blocker transition, run dependency unlock reconciliation and Epic rollup before
reporting completion or acquiring more work.

## Validation Defaults

Bind validation to the exact tree. Reuse it only while relevant tracked and untracked files remain unchanged.

- Documentation/governance: inspect links and terminology, run the compact read when live state is relevant,
  `npm run format`, `npm run format:check`, and `git diff --check`.
- Contracts: generate contracts and impacted Java/Python/TypeScript clients or servers and prove generated ownership.
- Backend: run targeted Java 21 generation, compile/tests, or the complete Maven reactor according to risk.
- Python: use uv plus owning Nx lint, syntax, and test targets.
- Mobile: codegen, lint, typecheck, Jest, export, and native checks when a native boundary changes.
- CI/runtime: parse workflows, validate Compose/configuration, and execute the closest safe local equivalent.

Report intentionally skipped checks and why.

## Final Report

Include issue, owner, Workset, compatibility, source gate, Execution Mode, changed files, validations, skipped checks,
branch, commit, push, draft PR, Project status, release decision, and dependency/Epic transitions.
