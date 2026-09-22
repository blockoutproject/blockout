---
name: github-delivery
description: "Triage issues and deliver authorized changes through issue ownership, topic branches, coherent commits and draft pull requests. Merges require an explicit human request; cleanup follows the authorized delivery or prototype lifecycle."
---

# GitHub delivery

Read repository instructions, Git state, remotes, branch model and the authorized scope. This workflow does not grant permission to publish, assign, merge or contact others beyond the user's task. Existing explicit authorization remains valid; do not ask for the same issue confirmation again.

## Triage and claim

Read-only investigation and recommending a next issue do not claim it. An eligible issue is open, unassigned, has no open native blocker and no obvious overlapping delivery PR. Compare assigned work, PRs and relevant branches/worktrees; favor clear prerequisites and low overlap. Recommend one with reasons, then await authorization to execute if it has not already been given.

Before content implementation, use an existing authorized issue or create the tracking issue when the task authorizes doing so. This includes small documentation and maintenance changes; an explicit implementation request covers their ordinary tracking workflow. Do not request the same authorization again. A maintenance issue states objective, scope, acceptance and sources. Product implementation resolves its task to approved specification/plan and constitution; applicable official Spec Kit procedures remain authoritative, not duplicated here.

Re-read native blockers, assignee and overlapping work before claiming. Do not overwrite another assignee or begin blocked work. Self-assign the authenticated GitHub user. GitHub assignment is the claim; do not invent local locks or a second status system.

## Branch and deliver

Synchronize the integration branch without losing local work. Applications normally deliver topic branches to `develop`, then promote `develop` to `main`. A standalone skills repository can deliver topics directly to `main`; no release tag is required. Follow the repository's actual accepted model.

Delivery topic branches MUST use `feature/<issue>-<slug>`, `bugfix/<issue>-<slug>` or `tech/<issue>-<slug>`. The only additional topic-branch format is `prototype/<issue>-<slug>`, exclusively for the disposable workflow below. No other topic-branch format is permitted. Keep changes bounded, commits coherent and verification tied to the exact final tree. Push and open a **draft** PR when delivery is authorized. Use `Closes #N` only for complete delivery, `Refs #N` for intentional partial work and explain why.

Report the draft PR and evidence. Readiness and merge remain human-directed; an instruction to implement is not an instruction to merge. Direct integration-branch pushes require explicit direction for small nonfunctional maintenance; never use them to bypass a behavior/contract/dependency/migration/security/CI review.

## Explicitly requested merge

Read [merge verification and cleanup](references/merge.md) only after a human explicitly asks to merge. That request also authorizes leaving draft unless the human separates those decisions. Use a merge commit, not squash or GitHub rebase merge.

## Design-only and disposable work

For an authorized Figma-only issue, record required evidence and get explicit human design approval before closing/unassigning it; no artificial documentation PR is needed.

A disposable prototype uses an explicitly temporary `prototype/<issue>-<slug>` branch and draft PR to the integration branch with `Refs #N`. Mark it never-to-merge. After explicit prototype approval, record evidence, close without merge, remove only its verified branch and close/unassign the issue. It does not bypass the Figma gate or become production code.

When abandoning claimed work, unassign and report remaining work. Completing or unblocking one issue never authorizes claiming the next automatically.
