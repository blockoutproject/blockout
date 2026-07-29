# Agent Delivery Autonomy Decision

## Decision

Bounded Codex release autonomy is deferred. Manual merge remains the default, and every release continues to require
explicit authorization from the current human release owner.

No pilot is pre-authorized. A future experiment may be considered only when all reconsideration conditions below are
met and a new `PLAN_REQUIRED` implementation issue is separately approved. That issue must define the exact eligible
change class, controls, maintenance owner, failure handling, and rollback before it changes any repository setting or
adds automation.

## Evidence

### Contributor Workflow

Blockout has multiple contributors and uses visible Roadmap claims and frozen Worksets to coordinate concurrent work.
Draft publication creates review evidence but does not authorize release. The current Merge train binds validation,
review, and the release decision to one exact pull-request head and stops on drift or conflict.

This workflow already separates implementation, review, and release responsibilities. Removing the final explicit
human decision would save only one bounded action while adding another privileged control surface that contributors
would need to understand, monitor, and recover.

### Repository Visibility And GitHub Plan

Blockout is a private organization repository on GitHub Free. GitHub documents protected branches and rulesets for
private repositories as features of paid organization plans, not GitHub Free:

- [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
- [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

GitHub also limits auto-merge for private repositories to paid plans and limits merge queues for private repositories
to GitHub Enterprise Cloud:

- [Automatically merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)

Consequently, the current hosting posture cannot enforce the complete branch, review, check, and exact-head invariants
that a safe autonomous release path would require. A clean check result or a paid-plan feature by itself would not
replace those combined controls.

### Failure History

[Pull request #93](https://github.com/blockoutproject/blockout/pull/93) attempted a ruleset, `CODEOWNERS`, and a
repository workflow based on capabilities that did not match the required private GitHub Free posture. It was closed
without merge.

[Pull request #94](https://github.com/blockoutproject/blockout/pull/94) replaced that approach with portable
private-Free guardrails, independent review when available, a documented solo fallback, and no repository setting or
hosted policy-code mutation. [Pull request #88](https://github.com/blockoutproject/blockout/pull/88) established the
explicit Merge train used for head-bound integration.

The failure mode was not a missing automation implementation. It was a mismatch between assumed enforcement and the
repository's actual capabilities. Autonomy must therefore remain fail-closed until enforcement and operational need
are both demonstrated.

### Maintenance Cost

Autonomous release would require privileged configuration or code, eligibility classification, exact-head
coordination, review and check invalidation, observability, incident response, rollback, and ongoing adaptation to
hosting changes. Those costs exist even for documentation-only or apparently low-risk changes. No recurring release
bottleneck or failure evidence currently justifies that permanent maintenance surface.

## Reconsideration Gate

A future autonomy proposal may enter planning only when every condition below is evidenced:

1. A recurring operational need is demonstrated with contributor-flow measurements or failure history; convenience or
   one slow release is insufficient.
2. The active hosting plan can enforce the required pull-request-only integration, current-head review, required
   checks, branch integrity, and bounded release permissions.
3. The eligible change class is narrow, mechanically classifiable, and excludes every permanent human-release
   boundary below.
4. The proposal names a maintenance owner, monitoring evidence, a fail-closed recovery path, and a reversible rollback.
5. A new `PLAN_REQUIRED` implementation issue is independently reviewed and explicitly approved before any pilot,
   setting, workflow, bot, application, or policy code is introduced.

A hosting-plan upgrade without demonstrated need does not open the gate. Demonstrated need without enforceable
controls does not open it either. Satisfying the gate authorizes planning only; it does not authorize a pilot or merge.

## Permanent Human-Release Boundaries

The following changes remain human-release-only even if a future bounded experiment is approved:

- security, authentication, authorization, secrets, access, or permissions;
- dependencies, build systems, runtime configuration, or supply-chain inputs;
- contracts, generated interfaces, public APIs, or shared models;
- persistence schemas, migrations, data transformations, or data-retention behavior;
- product behavior, user experience, routes, visual decisions, or externally observable semantics; and
- ambiguous, mixed-scope, unclassifiable, failing, waived, stale, or conflict-resolved changes.

Human-release-only means that passing checks, review approval, self-review, or an automation eligibility rule cannot
substitute for an explicit current human release decision on the exact head.

## Scenario Review

| Scenario                                                          | Outcome                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Recurring release delay, but no enforceable hosting controls      | Defer; improve evidence or the manual workflow without autonomous release.        |
| Enforceable controls become available, but no demonstrated need   | Defer; capability alone does not justify maintenance and risk.                    |
| Demonstrated need and enforceable controls both exist             | Create a separate `PLAN_REQUIRED` issue; do not start a pilot from this decision. |
| Documentation-only change appears mechanically low risk           | Keep manual release; no change class is pre-authorized.                           |
| A change touches any permanent human-release boundary             | Require explicit human release regardless of future automation.                   |
| Classification, head, review, check, or scope evidence is unclear | Fail closed and return the candidate to human review.                             |

## Current Postcondition

Manual merge remains the default. This decision changes no repository setting and introduces no auto-merge setting,
workflow, bot, application, pilot cohort, or policy code.
