---
name: github-delivery
description: "Triage issues and deliver authorized changes through issue ownership, topic branches, coherent commits and draft pull requests. Merges require an explicit human request; cleanup follows the authorized delivery lifecycle."
---

# GitHub delivery

Read repository instructions, Git state, remotes, branch model and the authorized scope. This workflow does not grant permission to publish, assign, merge or contact others beyond the user's task. Existing explicit authorization remains valid; do not ask for the same issue confirmation again.

## Current authority and useful history

Start from the current user request and the project's applicable specifications, approved plans and decision sources. Consult issue history to answer a concrete question about approval, rationale, a blocker or prior evidence; do not reconstruct current intent from every past comment. A detailed report, delivered artifact, passing check or closed issue is not by itself approval of a decision. Distinguish proposed, approved and superseded choices, and verify the scope of the actual approval.

An approved decision is the current baseline, not proof that it remains the best solution. Challenge it when new evidence or requirements warrant reconsideration, explain the consequences and obtain any required agreement before changing it. Within authorized changes, update the owning authoritative artifact and mark the previous decision superseded with a link to its replacement; preserve useful rationale without leaving competing instructions.

Keep routine progress, experiments, screenshots and full intermediate analyses in the conversation. Before approval, a concise issue or PR update is useful for a concrete review handoff, a blocker requiring a decision or material evidence that invalidates an assumption. Label the result as a proposal or observation, state what remains undecided and link the reviewable artifact/revision. Do not publish every iteration or treat permission to publish as acceptance. Existing authorization and any stricter design-evidence gates still apply.

After approval, record the accepted scope, exact artifact/revision where applicable, approval source and material reservations concisely. Distinguish completed checks from future qualification. Link detailed reports, coverage matrices and validation artifacts instead of copying them into comments; when no durable report exists, summarize the evidence needed to assess the result rather than creating a duplicate record just for a link. Official procedures still run as required; their full conversational output need not be republished in the tracker.

Keep the issue's current scope, dependencies and acceptance criteria readable; comments retain only useful milestones and decisions. Prefer a few sentences or short bullets, expanding when unresolved risks or a requested audit need it. Do not erase historical evidence or rewrite earlier approvals merely to tidy the discussion. Approval, issue closure, merge and deployment remain separate decisions under the authorized workflow.

## Triage and claim

Read-only investigation and recommending a next issue do not claim it. An eligible issue is open, unassigned, has no open native blocker and no obvious overlapping delivery PR. Compare assigned work, PRs and relevant branches/worktrees; favor clear prerequisites and low overlap. Recommend one with reasons, then await authorization to execute if it has not already been given.

Before repository content implementation, use an existing authorized issue or create the tracking issue when the task authorizes doing so. This includes small documentation and maintenance changes; an explicit implementation request covers their ordinary tracking workflow. Standalone prototype exploration follows the dedicated section below. Do not request the same authorization again. A maintenance issue states objective, scope, acceptance and sources. Product implementation resolves its task to approved specification/plan and constitution; applicable official Spec Kit procedures remain authoritative, not duplicated here.

Re-read native blockers, assignee and overlapping work before claiming. Do not overwrite another assignee or begin blocked work. Self-assign the authenticated GitHub user. GitHub assignment is the claim; do not invent local locks or a second status system.

## Branch and deliver

Synchronize the integration branch without losing local work. Applications normally deliver topic branches to `develop`, then promote `develop` to `main`. A standalone skills repository can deliver topics directly to `main`; no release tag is required. Follow the repository's actual accepted model.

Delivery topic branches MUST use `feature/<issue>-<slug>`, `bugfix/<issue>-<slug>` or `tech/<issue>-<slug>`. These are the only permitted topic-branch formats. Keep changes bounded, commits coherent and verification tied to the exact final tree. Push and open a **draft** PR when delivery is authorized. Use `Closes #N` only for complete delivery, `Refs #N` for intentional partial work and explain why.

Report the draft PR and evidence. Readiness and merge remain human-directed; an instruction to implement is not an instruction to merge. Direct integration-branch pushes require explicit direction for small nonfunctional maintenance; never use them to bypass a behavior/contract/dependency/migration/security/CI review.

## Explicitly requested merge

Read [merge verification and cleanup](references/merge.md) only after a human explicitly asks to merge. That request also authorizes leaving draft unless the human separates those decisions. Use a merge commit, not squash or GitHub rebase merge.

## Design-only work and standalone prototypes

For an authorized Figma-only issue, record required evidence and get explicit human design approval before closing/unassigning it; no artificial documentation PR is needed.

Build an authorized prototype as a separate project outside the application repository. Review it directly, using screenshots when useful; do not create an application branch or PR just for this exploration, or impose a PR as its validation gate. When organization is authorized, reuse or create useful issues for foundations and independent lots, with dependencies, file ownership and integration criteria. Do not create issues solely to satisfy a delivery ceremony. Organizing issues does not authorize repository documentation or specification changes.

Keep iteration evidence in the conversation; attach evidence to its owning issue only after explicit approval of the corresponding work, without representing a partial approval as whole-scope completion. Retain the prototype for further review and remove it only on explicit request. Prototype approval does not bypass the Figma gate or turn its code into production implementation. Follow the design-workflow skill when available for the complete design lifecycle; Git delivery does not replace its approval gates.

When abandoning claimed work, unassign and report remaining work. Completing or unblocking one issue never authorizes claiming the next automatically.
