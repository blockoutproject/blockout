# GitHub Roadmap Operations

> Migration status: dormant until Phase MRG-1000 in `docs/current/blockout-active-roadmap.md`. The local roadmap remains authoritative and these GitHub rules must not be activated early.

Read this reference for issue discovery, acquisition, claims, scope expansion, and GitFlow through a draft pull
request. Read [`github-roadmap-lifecycle.md`](github-roadmap-lifecycle.md) only when making a lifecycle, release,
completion, rejection, or Epic decision. Read [`github-roadmap-governance.md`](github-roadmap-governance.md) only for
Project structure, fields, views, workflows, or migration.

## Local Execution Profile

For a managed local Codex checkout, use one authenticated `gh` identity for Roadmap issue, Project, and pull-request
operations. Project V2 already requires GraphQL, so do not begin with the connector or browser.

Route every operation correctly on its first attempt and apply this bounded recovery matrix:

| Operation                                                              | Primary transport                                    | Environment     | Fallback                                                                   |                             Maximum retry | Stop condition                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------- | --------------- | -------------------------------------------------------------------------- | ----------------------------------------: | --------------------------------------------------------------------------- |
| Repository read, edit, validation, `git status`, `git diff`, `git log` | Local command                                        | Sandbox         | None                                                                       |                                         0 | Local precondition or command failure                                       |
| Authentication for a compact Project workflow                          | Helper `authenticatedLogin`                          | Outside sandbox | `gh api user --jq .login` only when the helper is not used                 |                               1 transient | Authentication or permission failure                                        |
| Complete Project index                                                 | Compact read-only helper                             | Outside sandbox | Targeted `gh api graphql` only for a capability the helper does not expose |                               1 transient | Incomplete pagination, invalid shape, authentication, or permission failure |
| Issue or PR read                                                       | `gh issue view` / `gh pr view`                       | Outside sandbox | Targeted REST or GraphQL for a missing field                               |  1 transient plus one capability fallback | Authentication, permission, or ambiguous evidence                           |
| Project mutation                                                       | `gh api graphql`                                     | Outside sandbox | None                                                                       | 1 missing-step retry after a fresh reread | Mixed state that cannot be uniquely reconciled                              |
| Issue or PR mutation                                                   | `gh api` or dedicated `gh` command                   | Outside sandbox | Connector only for a real CLI capability gap and identical login           |                               1 transient | Authentication, permission, identity mismatch, or ambiguous state           |
| Git network operation                                                  | `git`                                                | Outside sandbox | Same command only                                                          |                               1 transient | Divergence, permission failure, or unexpected remote                        |
| `.git` write                                                           | `git switch`, `git add`, `git commit`, or equivalent | Outside sandbox | None                                                                       |                                         0 | Dirty/worktree state is not safe                                            |
| Completed check diagnosis                                              | PR/check summary                                     | Outside sandbox | One check-run annotation; logs only when steps started                     |                      1 per evidence level | Terminal failure is classified                                              |
| Project configuration not exposed by GraphQL                           | Authenticated browser                                | Outside sandbox | None                                                                       |                                         0 | State or identity cannot be verified                                        |

Do not use `gh auth status` as identity evidence and never start interactive `gh auth login` from an agent PTY. On
authentication failure, stop and request a user-managed login. A connector or browser is not an authentication
fallback. Quote URLs containing `?`, `*`, brackets, or other zsh metacharacters.

## Compact Project Evidence

Use `../scripts/read-roadmap-project.sh` for the complete paginated Project index. The helper is strictly read-only and
returns Project/field IDs plus compact item state without issue bodies. It may authenticate, paginate, validate nested
connection bounds, and normalize JSON; it may not rank, claim, transition, cache hidden state, or mutate GitHub.

The returned `authenticatedLogin` is the workflow's effective CLI identity. Do not precede or follow the helper with a
standalone identity read unless it failed before returning a login or a different transport must be compared.

After the compact index:

1. collect non-Epic `Ready` candidates;
2. collect active claims: `In Progress`, `In Review`, and assigned `Blocked` issues;
3. quarantine `Ready` with an assignee, active non-Epics without exactly one assignee, closed non-terminal items, and
   active claims with invalid worksets or mismatched `area:*` labels;
4. fetch issue bodies, dependencies, linked PRs, timelines, and worksets only for the target, candidates, active
   claims, and quarantined claims;
5. fetch closed or delivered-history detail only for the candidate currently being challenged.

Do not put issue bodies or unrelated closed-item detail into claim snapshots. If a nested compact connection reports
`hasNextPage`, the helper stops; extend the validated query before using incomplete evidence.

## Fresh IDs And Evidence

Resolve the Project, field, option, item, repository, issue-type, and relationship IDs live by name at the start of an
authenticated workflow. They may be reused during the same uninterrupted operation when:

- the authenticated login, repository, Project number, and target issue are unchanged;
- the Project schema signature (field and option IDs) is unchanged;
- only mutations expected by that operation changed Project or issue `updatedAt` values; and
- no mutation failed or returned ambiguous evidence.

Re-resolve on another task or session, a schema change, unexpected drift, failed/ambiguous mutation, or partial
recovery. Never hard-code IDs in reusable documentation, queries, scripts, or prompts.

A stable acquisition claim may pass directly into execution in the same uninterrupted task without repeating
selection or assignment. Revalidate only drift-sensitive target, claim, branch, and PR state. A new task/session or
unexpected Project change requires a fresh compact index and claim preflight.

Use these execution-entry profiles:

- `FRESH`: no reusable evidence exists. Read the complete Project index, target, active/quarantined claims, current
  context, issue references, and scope sources.
- `ACQUIRED_SAME_TASK`: acquisition just produced stable evidence in the same uninterrupted task. Continue from branch
  creation after revalidating only target, claim, workset/conflicts, branch, and PR state; do not select, assign, or
  reload unchanged sources again.
- `RESUME`: a new session or interrupted task targets an existing coherent claim owned by the authenticated login.
  Read a fresh compact index plus target, workset/conflicts, assignment event, branch, PR, and sources that may have
  drifted; continue at the first incomplete step without assigning again.

## Working Evidence

IDs, schema signatures, issue/workset detail, source-gate decisions, loaded references, and validation results may be
kept only in the current task's working context. They are evidence reuse, not a source of truth or hidden claim state.

- Invalidate Project evidence on login/repository/target/schema change, unexpected `updatedAt` drift, failed or
  ambiguous mutation, task/session change, or partial recovery.
- Invalidate source reads when the relevant file, issue reference, or decision changed.
- Bind a local validation result to the exact tree it validated. Any relevant tree change invalidates it.
- Working evidence never replaces fresh pre-claim, pre-merge, post-mutation, or scope-expansion reads.

## Ready Contract

Every accepted non-Epic item outside `Triage` must retain native Issue Type, Track, Priority, and Execution Mode.
Repair missing accepted metadata before selection, claim, blocker reconciliation, or lifecycle reporting. Use unique
authoritative issue, parent, sibling, and Roadmap evidence; when Priority alone has no unique source value, apply the
governance `Normal` fallback. Never overwrite an existing value by inference.

Every non-Epic issue must have before `Ready`:

- native Issue Type;
- Track, Priority, and Execution Mode;
- at least one independently verifiable checkbox under `## Acceptance criteria`;
- `## Dependencies`, using `None.` when empty, and no open native blocker;
- no equivalent open/closed issue, merged PR, delivered Git history, or current source;
- at least one `area:*` label exactly matching `Workset.Areas`; and
- a valid frozen `## Workset` with at least one real write or external lock.

Do not claim an issue that fails any requirement.

## Workset Contract

Use this exact structure:

```md
## Workset

Areas:

- area:users-service
- area:mobile-gateway

Write locks:

- apps/backend/users-service/\*\*
- apps/backend/mobile-gateway/src/main/java/com/blockout/mobilegateway/user/\*\*

External locks:

- None.
```

The final Blockout Project configuration defines the authoritative allowed area labels. Its initial migration target is
`area:contracts`, `area:backend-shared`, one label per backend deployable, `area:mobile`, `area:mobile-shared`,
`area:scrapers`, `area:infra`, `area:workspace`, `area:docs`, `area:figma`, and `area:github`. Do not enforce or create
these labels before Phase MRG-1000 confirms the live Project schema.

- A write lock is one normalized case-preserving POSIX repository-relative file or a directory ending in `/**`.
- Wildcards other than the terminal `/**`, absolute paths, empty segments, and `.` or `..` segments are invalid.
- Declare every generated output that will change. Reads reserve nothing.
- External locks are exact canonical identifiers. `None.` is not a lock.
- Identical locks conflict. A directory lock conflicts with every descendant. External locks conflict by exact value.
- Area labels and read-only scope never create conflicts.

## Read-only Discovery

1. Read the compact Project index and relevant detailed issues.
2. Validate every candidate and active/quarantined claim.
3. Remove invalid, blocked, or conflicting candidates, naming exact reasons and overlapping locks.
4. Apply any requested Track filter.
5. Sort by Priority (`High`, `Normal`, `Low`), then live Track option order, then issue number.
6. Challenge the first remaining candidate against equivalents, merged PRs, Git history, and current source. Exclude
   delivered, duplicated, or replaced scope and repeat.
7. Propose the first valid candidate without mutating GitHub.

Discovery never assigns or reserves work.

## Acquisition And Claim

Acquisition performs discovery without announcing a candidate, then immediately claims the highest-ranked compatible
task. Attempt at most three candidates when concurrent changes invalidate the current candidate.

A coherent review reservation is an `In Review` issue with exactly one assignee, a valid workset and matching area
labels, and a structurally linked open PR. It retains every write and external lock until merge, rejection, or explicit
claim release. A coherent implementation claim is an `In Progress` issue with exactly one assignee, a valid workset and
matching area labels, an active assignment event, and two stable post-claim snapshots. Ordinary acquisition permits at
most one same-login implementation claim. The Ready-drain path may retain multiple compatible same-login
implementation claims only when each issue was explicitly targeted by a distinct one-issue worker. No new work may be
acquired while the login owns an assigned `Blocked` issue or an incoherent active claim whose locks cannot be safely
isolated.

### Read phase

1. Recheck the target and compact active-claim index immediately before mutation.
2. Validate the Ready contract, parse relevant worksets, and reject every overlap.
3. Confirm the target is unassigned and the intended assignee is the authenticated GitHub user.
4. For ordinary fresh acquisition, stop when the authenticated login owns an `In Progress` issue, an assigned
   `Blocked` issue, or an incoherent `In Review` issue. Coherent review reservations do not block a fresh acquisition
   when the candidate is compatible with every active and quarantined workset.
5. For an explicitly issue-targeted Ready-drain acquisition, existing coherent implementation claims do not block the
   target when it remains compatible with every active and quarantined workset. The controller performs the canonical
   claim before task creation, and the named worker resumes only that claim. If the target is no longer unassigned
   `Ready`, the controller skips dispatch instead of selecting a replacement.

### Mutation phase

1. Add exactly the authenticated login as assignee through `gh api`.
2. Set the live Project `Status` to `In Progress` through GraphQL.
3. Immediately obtain two consecutive compact decision-bearing snapshots covering the target, active and quarantined
   claims, parsed worksets, assignees, and assignment events.

Success requires `In Progress`, exactly one intended assignee, an active `AssignedEvent`, no workset conflict, and two
matching snapshots. `PLAN_REQUIRED` still needs current-user plan approval before branch creation or task-file edits.

If a mutation fails or is ambiguous, reread before retrying. Complete only the missing step after a fresh conflict
calculation, or remove the assignee and restore `Ready`. Never leave a partial claim discoverable.

### Simultaneous arbitration

1. The oldest active assignment event wins.
2. Equal timestamps use lower issue number.
3. Same-issue ties use lexicographically lower login.
4. A loser releases only its own assignment and, for different issues, returns only its own item to `Ready`.
5. Reread once; only the unique conflict-free winner continues.

Track never decides conflicts. Ordinary collaborators use distinct GitHub accounts and one account runs at most one
ordinary acquisition workflow at a time. The Ready-drain exception is limited to controller-selected, issue-specific
claims whose candidate worksets were pairwise compatible at dispatch and are freshly revalidated before claim. The
controller claims each target before task creation so GitHub is the idempotency key. A worker only resumes that stable
claim and never falls through to another candidate.

## User Progress Gates

Keep the user informed at workflow boundaries, not after every command. The normal updates are: start and assumptions,
live Project result, stable claim or fail-closed reason, validation result, draft publication, and release/blocker.
Add an update for a wait longer than about one minute or when the diagnosis changes materially.

## Resume And Planning

Resume an `In Progress`, `In Review`, or assigned `Blocked` task only when exactly the authenticated user owns it.
When that login owns multiple active claims, the issue number must identify exactly one target; an `In Review` target
also requires its structurally linked PR. Revalidate its workset, conflicts, branch, PR when applicable, assignment
event, and drift-sensitive evidence, then continue at the first incomplete step without assigning again.

For `PLAN_REQUIRED`, the stable claim reserves the workset but does not authorize branch creation or editing. If the
user abandons, rejects, or hands back the plan, remove the assignee, restore `Ready`, and reread both postconditions. A
real blocker follows the lifecycle `Blocked` guard and explicitly retains or releases the reservation.

## Scope Expansion

Before touching a new path or external resource:

1. preserve the previous valid issue body and labels;
2. expand only when necessary for an existing accepted criterion, otherwise request a decision or split an issue;
3. update the issue workset so new locks become visible;
4. rerun the compact index and detailed conflict calculation;
5. align `area:*` labels, add one traceable reason comment, and reread the target;
6. continue only when the expanded workset is valid and conflict-free.

An expansion always yields to an incumbent. On conflict, restore the former body/labels and stop; partial restoration
quarantines the expanding task.

## Issue And Draft-PR Operations

- Search open and closed equivalents before issue creation.
- Create issues unassigned; set native type, add to the Project, and set `Triage`, then reread the issue and item.
- Accept into `Backlog` or `Blocked` only when deterministic retention is justified and the accepted metadata contract
  passes. Correct the body and `area:*` labels before setting fields, and make `Ready` the last mutation only when its
  complete contract passes.
- Reject or replace with one factual comment and surviving issue link when applicable; set the terminal status, remove
  assignees, close not planned, and recalculate any parent Epic.
- Before any transition, evaluate its guard without mutation. On success update only the required state, recalculate
  any parent Epic, and reread the affected postconditions.
- Batch independent GraphQL field mutations in one document after one fresh schema resolution.
- Batch labels in one REST update rather than one call per label.
- After implementation, validate, stage explicit paths, commit, push, and create or update one draft PR to `develop`.
- Verify the structural closing/cross-reference link with a targeted issue/PR query.
- Move the issue to `In Review` only after that link exists, then reread only the target issue, PR, assignee, workset,
  and changed Project field. A complete Project-body reread is not required for this transition.
- A valid `In Review` transition converts the implementation claim into a coherent review reservation. It may coexist
  with other compatible review reservations owned by the same login, but it never releases its locks.
- Draft publication does not authorize merge.

## Completion Dependency Reconciliation

Whenever an issue is merged, completed, rejected, closed, reopened, or gains or loses a native blocker, run lifecycle's
Dependency Unlock Reconciliation before ending the workflow.

1. Resolve direct native dependents from GitHub after the triggering state change; do not reuse a pre-mutation list.
2. Fetch each dependent's current body, fields, labels, assignees, linked PRs, workset, and complete native blocker set.
3. Keep or move a dependent to `Blocked` while any blocker is open. If all blockers are closed, promote it from
   `Blocked` to `Ready` only after the complete Ready contract, delivered-state challenge, source gate, and workset
   conflict calculation pass.
4. Repair missing accepted metadata before deciding the dependent's final state. Resolve unique values from live
   evidence and apply the governance Priority fallback when needed. Leave an otherwise unblocked dependent `Blocked`
   only when another Ready requirement remains incomplete, and report each exact deficiency.
5. Recalculate affected parent Epics from the dependents' final states, then obtain two consecutive matching snapshots
   of the triggering issue, direct dependents, relevant successors, and parent Epics.

Do not batch a dependent's `Ready` transition before its fresh validation. A merge or terminal mutation is partial and
must be reconciled before another acquisition starts when any affected dependent or Epic remains incoherent.
