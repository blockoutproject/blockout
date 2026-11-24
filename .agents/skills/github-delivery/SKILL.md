---
name: github-delivery
description: "Triage GitHub issues and deliver draft PRs in repositories that use issue-linked feature/, bugfix/ or tech/ branches and merge commits. Merge only on an explicit human request."
---

# GitHub delivery

Read repository instructions, Git state, remotes, branch model and the authorized scope. If the repository requires a different branch or merge convention, follow its delivery workflow. Publishing, assigning, merging and contacting others require authorization within the user's task. Existing explicit authorization remains valid.

## Current authority and useful history

Start from the current user request and the project's applicable specifications, approved plans and decision sources. Consult issue history to answer a concrete question about approval, rationale, a blocker or prior evidence; do not reconstruct current intent from every past comment. A detailed report, delivered artifact, passing check or closed issue is not by itself approval of a decision. Distinguish proposed, approved and superseded choices, and verify the scope of the actual approval.

An approved decision is the current baseline, not proof that it remains the best solution. Challenge it when new evidence or requirements warrant reconsideration, explain the consequences and obtain any required agreement before changing it.

Keep routine progress, experiments, intermediate screenshots and full intermediate analyses in the conversation. Publish representative visual review evidence in a PR Conversation comment as specified below. Before approval, a concise issue or PR update is useful for a concrete review handoff, a blocker requiring a decision or material evidence that invalidates an assumption. Label the result as a proposal or observation, state what remains undecided and link the reviewable artifact/revision. Do not publish every iteration or treat permission to publish as acceptance. Existing authorization and any stricter design-evidence gates still apply.

When reporting an approval in an issue or pull request, identify the accepted scope, exact artifact/revision where applicable, approval source and material reservations concisely. Distinguish completed checks from future qualification. Link detailed reports, coverage matrices and validation artifacts instead of copying them into comments; when no durable report exists, summarize the evidence needed to assess the result rather than creating a duplicate record just for a link.

Keep the issue's current scope, dependencies and acceptance criteria readable; comments retain only useful milestones and decisions. Prefer a few sentences or short bullets, expanding when unresolved risks or a requested audit need it. Do not erase historical evidence or rewrite earlier approvals merely to tidy the discussion. Approval, issue closure, merge and deployment remain separate decisions under the authorized workflow.

## Triage and claim

Read-only investigation and recommending a next issue do not claim it. An eligible issue is open, unassigned, has no open native blocker and no obvious overlapping delivery PR. Compare assigned work, PRs and relevant branches/worktrees; favor clear prerequisites and low overlap. Recommend one with reasons, then await authorization to execute if it has not already been given.

Before repository content implementation, use an existing authorized issue or create the tracking issue when the task authorizes doing so. This includes small documentation and maintenance changes; an explicit implementation request covers their ordinary tracking workflow. For a standalone prototype, use the [design-only delivery](#design-only-delivery) guidance. Do not request the same authorization again. State the objective, scope and acceptance criteria. Link the project decisions or requirements that govern the change.

Re-read native blockers, assignee and overlapping work before claiming. Do not overwrite another assignee or begin blocked work. Self-assign the authenticated GitHub user. GitHub assignment is the claim; do not invent local locks or a second status system.

## Branch and deliver

Identify the PR base from the repository's branch policy and synchronize it without losing local work.

Delivery topic branches MUST use `feature/<issue>-<slug>`, `bugfix/<issue>-<slug>` or `tech/<issue>-<slug>`. These are the only permitted topic-branch formats. Keep changes bounded, commits coherent and verification tied to the exact final tree. Push and open a **draft** PR when delivery is authorized. Use `Closes #N` only for complete delivery, `Refs #N` for intentional partial work and explain why.

Report the draft PR and evidence. Readiness and merge remain human-directed; an instruction to implement is not an instruction to merge. Direct integration-branch pushes require explicit direction for small nonfunctional maintenance; never use them to bypass a behavior/contract/dependency/migration/security/CI review.

## Visual evidence in pull requests

When a PR changes visible UI, upload representative screenshots of the running PR revision as GitHub attachments in a top-level comment in the PR’s Conversation tab. Prefer the supported `gh pr comment --attach` flow with a current official GitHub CLI to publish the comment and attachments together. Verify the returned comment and attachment URLs before delivery. Show the affected screens and relevant states, including changed responsive layouts or themes where applicable. Use before/after captures when they clarify the change, and add a short recording when motion or interaction needs it.

Identify the captured commit/build, scenario or state, and platform: browser/device and viewport where relevant. Keep review captures and recordings out of Git, including specification folders. Use GitHub attachment URLs in the comment; the PR description may link to that comment. Local paths and chat-only images do not preserve PR evidence. Use demonstration data and exclude private information, credentials and private diagnostics.

If execution, capture or attachment upload is unavailable, state the missing evidence, reason and unverified scope in the PR; do not commit captures as a workaround. Existing stricter project evidence gates still apply. Captures establish the observed rendering or interaction; they do not replace functional checks or constitute design, native, provider or production approval. Nonvisual changes require no unrelated screenshots.

## Explicitly requested merge

Read [merge verification and cleanup](references/merge.md) only after a human explicitly asks to merge. That request also authorizes leaving draft unless the human separates those decisions. Use a merge commit, not squash or GitHub rebase merge.

## Design-only delivery

Use the project's accepted design scope and approval requirements. Link directly to the design artifact and revision under review. A tracking issue is useful when it clarifies ownership, dependencies or review scope.

Label proposals, observations and actual approvals accurately. Keep current issue content concise and link detailed evidence when useful. Approval records identify the accepted scope, revision and reservations; issue closure and Git delivery do not certify unreviewed design.

When abandoning claimed work, unassign and report remaining work. Completing or unblocking one issue never authorizes claiming the next automatically.
