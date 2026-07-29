# GitHub Roadmap Operations

Read this reference for issue discovery, acquisition, claims, resume, scope expansion, and the Project evidence used
during draft publication. Use the Git workflow for publication mechanics, lifecycle for transitions or release
decisions, and governance for Project structure.

## Local Execution Profile

Use one authenticated `gh` identity for Roadmap issue, Project, and PR operations. In a managed checkout, route network
operations and `.git` writes through the environment's authorized path on the first attempt.

| Operation                                                | Primary transport              | Fallback                                                 | Stop condition                                                    |
| -------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Repository reads, edits, validation, Git status/diff/log | Local command                  | None                                                     | Local precondition or command failure                             |
| Complete Project index                                   | Read-only compact helper       | Targeted GraphQL for a missing capability                | Incomplete pagination, invalid shape, auth, or permission failure |
| Issue or PR read                                         | `gh issue view` / `gh pr view` | Targeted REST/GraphQL                                    | Auth, permission, or ambiguous evidence                           |
| Project mutation                                         | `gh api graphql`               | None                                                     | Mixed state not uniquely reconcilable                             |
| Issue or PR mutation                                     | Dedicated `gh`/REST            | Connector for a real capability gap with identical login | Auth, permission, identity mismatch, ambiguity                    |
| Git network or `.git` write                              | Git                            | Same command after one transient network failure         | Divergence, permission, or unsafe worktree                        |
| Completed check diagnosis                                | PR/check summary               | One annotation; logs only if steps ran                   | Terminal failure classified                                       |
| Unexposed Project configuration                          | Authenticated browser          | None                                                     | State or identity cannot be verified                              |

Do not use `gh auth status` as identity evidence and never start interactive login. On authentication failure, stop for
user-managed login. Quote URLs containing shell metacharacters.

## Compact Project Evidence

Use `../scripts/read-roadmap-project.sh` for the complete paginated index. The helper is read-only. It may authenticate,
paginate, validate bounded nested connections, and normalize JSON. It may not rank, claim, transition, cache hidden
state, or mutate GitHub.

Its `authenticatedLogin` is the workflow identity. Do not issue a redundant user lookup unless the helper failed before
returning a login or a fallback transport must be compared.

After the compact index:

1. Collect non-Epic `Ready` candidates.
2. Collect active claims: `In Progress`, `In Review`, and assigned `Blocked`.
3. Quarantine `Ready` with assignees, active non-Epics without exactly one assignee, closed non-terminal items, and
   active claims with invalid Worksets or mismatched `area:*` labels.
4. Fetch bodies, dependencies, PRs, timelines, and Worksets only for targets, candidates, active claims, and quarantined
   claims.
5. Fetch closed or delivered history only for the candidate currently challenged.

If any nested compact connection needs pagination, extend the validated query before using the evidence.

## Fresh IDs And Evidence

Resolve Project, field, option, item, repository, issue-type, and relationship IDs live by name at the start of an
authenticated workflow. Reuse them only while:

- login, repository, Project number, and target are unchanged;
- the Project schema signature is unchanged;
- only expected mutations changed relevant `updatedAt` values; and
- no mutation failed or became ambiguous.

Re-resolve on another task/session, schema or identity change, unexpected drift, failed mutation, or partial recovery.
Never hard-code ephemeral IDs in reusable files.

Entry profiles:

- `FRESH`: read the complete Project index, target, active/quarantined claims, current Git, issue references, and
  scope-specific sources.
- `ACQUIRED_SAME_TASK`: reuse stable acquisition evidence and revalidate only drift-sensitive target, claim, Workset,
  conflicts, branch, and PR.
- `RESUME`: on a new or interrupted session, read a fresh compact index plus target, Workset/conflicts, assignment
  event, branch, PR, and drifted sources; continue at the first incomplete postcondition.

Working IDs, source reads, and validation results exist only in the current task context. Bind validation to the exact
tree. They never replace fresh pre-claim, pre-merge, post-mutation, or scope-expansion evidence.

## Ready Contract

Every accepted non-Epic outside `Triage` retains native Issue Type, Track, Priority, and Execution Mode. Repair missing
accepted metadata from unique evidence before selection or lifecycle reporting; use governance's explicit `Normal`
Priority fallback when required.

Before `Ready`, every non-Epic must have:

- native Issue Type;
- Track, Priority, and Execution Mode;
- at least one independently verifiable checkbox under `## Acceptance criteria`;
- `## Dependencies`, using `None.` when empty, and no open native blocker;
- no equivalent open/closed issue, merged PR, delivered Git history, or current implementation;
- at least one `area:*` label exactly matching `Workset.Areas`; and
- a valid frozen `## Workset` with at least one real write or external lock.

Do not claim an issue that fails any requirement.

## Roadmap Intake

Intake has five explicit phases. Never collapse them into one mutation or treat a prompt, local note, or hidden state as
an accepted task.

| Phase           | Mutation boundary                                           | Required visible postcondition                                                                                  |
| --------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Discovery       | Read-only                                                   | Relevant open and closed issues, merged PRs, Git history, and current sources have been challenged              |
| Proposal        | Read-only                                                   | One reviewable title, type, fields, criteria, dependencies, Workset, labels, and recommended status are shown   |
| Creation        | Requires explicit current-user creation approval            | One unassigned issue exists in the Project as `Triage`; a last duplicate and delivered-state check was negative |
| Acceptance      | Mutates only the accepted issue contract and visible fields | The issue is unassigned in `Triage`, `Backlog`, or `Blocked`, with every deficiency or blocker explicit         |
| Ready promotion | Requires the complete Ready contract                        | The issue is unassigned `Ready` and can enter the separate acquisition protocol                                 |

The proposal must make every required field and section testable before creation. Use native Issue Type, Track,
Priority, Execution Mode, `## Acceptance criteria`, `## Dependencies`, and `## Workset`; align every `area:*` label
with `Workset.Areas`. Use `None.` only where the relevant contract permits it.

Immediately before creation and again before Ready promotion, repeat the equivalent and delivered-work challenge.
Reuse an existing issue when one owns the outcome. Do not create or promote a duplicate merely because its wording,
Track, or proposed implementation differs.

Creation never assigns the issue. Acceptance keeps incomplete evidence in `Triage`, retains a valid accepted task in
`Backlog` when it is not promoted, and uses lifecycle's `Blocked` guard for an open dependency or missing evidence.
An explicit unresolved product, UX, architecture, ownership, source-gate, or priority decision uses
`PLAN_REQUIRED`; missing evidence that prevents a well-formed planning contract remains `Blocked`.

Ready promotion rereads the complete issue, native blockers, current sources, equivalents, delivered history, labels,
and Workset, then applies the Ready contract. A request to create or accept an issue does not imply promotion, claim,
branch creation, or execution.

## Workset Contract

Use exactly:

```md
## Workset

Areas:

- <repository-area-label>

Write locks:

- <repository-relative-directory>/**

External locks:

- None.
```

The complete allowed area catalog and ownership mapping are frozen in
[`github-taxonomy.md`](github-taxonomy.md). Any other area is invalid.

- A write lock is one normalized, case-preserving, POSIX repository-relative file or a directory ending in `/**`.
- Wildcards other than terminal `/**`, absolute paths, empty segments, and `.` or `..` segments are invalid.
- Declare every generated output that will change. Reads reserve nothing.
- External locks are exact canonical resource identifiers. `None.` is not a lock.
- Identical locks conflict. A directory lock conflicts with every descendant. External locks conflict by exact value.
- Area labels and read-only scope never create conflicts.

## Read-Only Discovery

1. Read the compact Project index and relevant issue detail.
2. Validate every candidate and active/quarantined claim.
3. Remove invalid, blocked, delivered, or conflicting candidates and name exact reasons and locks.
4. Apply a requested Track filter.
5. Sort by Priority (`High`, `Normal`, `Low`), live Track order, then issue number.
6. Challenge the first candidate against equivalents, merged PRs, Git history, and current source; repeat if excluded.
7. Propose the first valid candidate without mutation.

Discovery never assigns or reserves work.

Also detect reconciliation drift: a `Blocked` issue whose native blockers are all closed or a `Done` Epic that remains
open. Read-only discovery reports it and stops that issue from selection. Acquisition must repair it through lifecycle
before ranking it.

## Acquisition And Claim

Acquisition performs discovery without announcing the candidate, then claims the highest-ranked compatible task.
Attempt at most three candidates when concurrent state invalidates a selection.

A coherent review reservation is `In Review` with exactly one assignee, a valid Workset, matching areas, and a
structurally linked open PR. A coherent implementation claim is `In Progress` with exactly one assignee, valid matching
Workset, an active assignment event, and two stable post-claim snapshots.

Ordinary acquisition allows at most one same-login implementation claim. Ready-drain may retain multiple compatible
claims only when each is explicitly targeted to a distinct worker. No acquisition proceeds while the login owns an
assigned `Blocked` issue or an incoherent active claim whose locks cannot be isolated.

### Read phase

1. Reread target and compact active-claim index immediately before mutation.
2. Validate Ready, Worksets, native dependencies, labels, source gate, and every overlap.
3. Require the target to be unassigned and the intended assignee to equal the authenticated login.
4. For ordinary acquisition, stop on a same-login `In Progress`, assigned `Blocked`, or incoherent `In Review`.
   Compatible review reservations do not block.
5. For Ready-drain, existing coherent compatible implementation/review claims do not block the explicitly named target.

### Mutation phase

1. Add exactly the authenticated login as assignee.
2. Set Project `Status` to `In Progress`.
3. Immediately obtain two consecutive matching snapshots covering target status, assignees, assignment event, active
   and quarantined claims, Worksets, and conflicts.

Success requires `In Progress`, exactly one intended assignee, an active `AssignedEvent`, no conflict, and stable
snapshots. A stable claim never overrides lifecycle's `PLAN_REQUIRED` gate.

On failed or ambiguous mutation, reread and complete only a uniquely missing step, or remove the assignee and restore
`Ready`. Never leave a partial claim discoverable.

### Simultaneous arbitration

1. Oldest active assignment event wins.
2. Equal timestamps use lower issue number.
3. Same-issue ties use lexicographically lower login.
4. A loser releases only its assignment and, across different issues, only its Project item to `Ready`.
5. Reread once; only the unique conflict-free winner continues.

Track never decides conflict.

## Resume And Planning

Resume active or assigned-Blocked work only when exactly the authenticated login owns it. Multiple active claims
require an explicit issue number; `In Review` also requires its structural PR. Revalidate drift-sensitive Workset,
conflict, assignment, branch, PR, and source evidence, then continue from the first incomplete step without assigning
again.

For `PLAN_REQUIRED`, the stable claim reserves the Workset but does not authorize editing. If planning is abandoned,
remove the assignee, restore `Ready`, and reread. A real blocker follows lifecycle and explicitly retains or releases
the reservation.

## Scope Expansion

Before touching a new path or external resource:

1. Preserve the previous valid body and labels.
2. Expand only for an accepted criterion; otherwise split the issue or request a decision.
3. Update the issue Workset before touching the new lock.
4. Rerun the compact index and conflict calculation.
5. Align `area:*` labels, add one reason comment, and reread the target.
6. Continue only when the expanded Workset remains valid and conflict-free.

Expansion always yields to an incumbent. On conflict restore the former body/labels; partial restoration quarantines
the task.

## Issue And Draft-PR Sequencing

- Search open and closed equivalents before issue creation.
- Use the intake phases above for issue state, the Git workflow for mechanics, and lifecycle for transitions,
  rejection, and terminal guards.
- Correct the body and areas before fields; preserve the unassigned visible intake postcondition before any separate
  acquisition.
- Batch independent field mutations after one fresh schema read and batch labels in one REST update.
- After implementation, follow the execution runbook and Git workflow through one draft PR.
- Apply two to four PR labels as a separate operation, then verify labels and structural issue link.
- After the link exists, load lifecycle, apply its `In Progress → In Review` guard, and reread target, PR, assignee,
  Workset, and changed field.
- Lifecycle's separate release authorization remains required after draft publication.

## Delivery Evidence And Recovery

The claim-to-draft path uses only visible repository, Git, issue, Project, and pull-request state. A conversation,
thread ID, local plan, worker name, or hidden token is never delivery state.

Bind validation to the exact intended tree. After staging explicit Workset paths, require no unintended staged,
unstaged, or untracked change; bind the commit to that tree, verify the remote branch at the commit SHA after push, and
verify the draft PR at the same head. The structural issue link and `In Review` transition are separate visible
postconditions.

| Situation                  | Preserved state                                                                   | Recovery                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Workset conflict           | Candidate remains unassigned `Ready`; incumbent claim is unchanged                | Recalculate from fresh Project evidence and select another compatible issue                           |
| Partial or ambiguous claim | Mixed state is reserved but invalid                                               | Complete only the uniquely missing mutation or remove the assignee and restore `Ready`                |
| `PLAN_REQUIRED`            | Stable `In Progress` claim reserves the Workset; no task-file edit exists         | Continue only after current-user approval; otherwise release or apply lifecycle's `Blocked` guard     |
| Scope expansion            | Existing claim and former valid Workset remain authoritative                      | Update the visible Workset first, recalculate conflicts, then continue or restore the former contract |
| Interruption               | Existing GitHub and Git artifacts remain authoritative                            | Enter `RESUME` and continue from the first incomplete postcondition without duplicating an artifact   |
| Commit or push failure     | Issue remains `In Progress`; verified local or remote artifacts are preserved     | Fix only the failed boundary, then revalidate the resulting tree or remote head                       |
| PR publication failure     | Issue remains `In Progress` unless one structurally linked open PR already exists | Reuse the existing branch/PR, complete the missing link or metadata, and never open a duplicate       |
| Review-transition failure  | Structurally linked PR remains open; claim stays reserved                         | Reread PR and issue, then complete only the uniquely missing `In Review` postcondition                |

No delivery step grants merge, waiver, rejection, or completion authority. Those remain separate lifecycle decisions.

## Completion Reconciliation

Lifecycle owns completion, dependency reconciliation, and Epic rollup. Operations supplies its fresh Project,
Workset, source-gate, delivered-state, and conflict evidence. Do not begin another acquisition while lifecycle's
affected state remains incoherent.

## User Progress Gates

Update the user at meaningful boundaries: start and assumptions, live Project result, stable claim or fail-closed
reason, validation, draft publication, and release/blocker. Add an update for a wait over about one minute or a material
diagnosis change, not every command.
