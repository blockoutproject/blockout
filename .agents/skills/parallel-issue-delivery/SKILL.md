---
name: parallel-issue-delivery
description: "Plan, launch or resume an explicitly requested batch of independent GitHub issues in separate Codex conversations and worktrees, with fresh-context review rounds."
---

# Parallel issue delivery

Use this workflow when the human explicitly requests a parallel issue batch or coordination of an existing batch. Invocation selects this procedure; task selection and external actions still require the applicable human authorization. This personal workflow does not replace repository delivery rules or technical skills.

## Select or resume the batch

- Read repository instructions, delivery policy, owning specifications and relevant skills. Inspect current issues, native blockers, assignees, PRs, branches, worktrees and existing task conversations before proposing work.
- Propose a bounded set of independently deliverable issues. Explain prerequisites, scope, shared files, generated contracts and shared runtime resources. Do not fill a numerical quota or confuse an epic, partially delivered task or pending provider qualification with a ready implementation issue.
- Prefer tasks that can start from the same integration revision. A worktree isolates edits; it does not remove semantic dependencies, shared-port conflicts or integration conflicts.
- Present the proposed batch and material tradeoffs, then await approval unless that exact batch is already authorized. Do not claim issues during read-only selection.
- On resume, reconstruct actual state from GitHub, Git and the existing conversations. Reuse issue/task/PR identities instead of creating duplicates. A sent message, closed issue or unchecked task list alone does not establish completion.

## Launch approved tasks

Use the available native task and worktree tools. Create one separate implementation conversation and managed worktree per approved issue, starting from the intended integration revision. Name the conversation `#<number> — <exact issue title>`. If these capabilities are unavailable, report the limit and supply usable task prompts; do not claim to have launched work or build an orchestration service.

Begin each task conversation with a short, plain-language explanation of the problem, intended outcome and practical benefit. Write for a technically literate reader who is unfamiliar with the project. Introduce only the concepts needed to understand the task, before implementation details, commands or progress reporting.

Give each task a self-contained handoff:

- Repository/worktree, issue, base revision, exact scope and owning spec/plan/tasks.
- Accepted decisions, explicit checklist exceptions and unresolved evidence limits, with their approval source. Do not silently convert proposals into approvals.
- Applicable skills, permitted external actions, expected draft-PR outcome and the review protocol below. Request one goal per task when goals are included in the approved batch; never invent a token budget or mark incomplete work complete.
- Ownership of shared files/resources and any intended integration order. Keep edits within the issue and preserve unrelated work; never stop another task's services or edit its worktree.

Check eligibility again before claiming, using the repository's delivery workflow. Do not overwrite another assignee. Keep model settings at the user's defaults unless explicitly requested otherwise. Carry the actual human authorization into delegated tasks, including any authorization to send coordination messages; delegation itself grants no new authority.

## Allocate shared runtime resources

When tasks need local services or native devices, record each resource's owner, exact device ID, ports and worktree in the conversation before use. Inspect existing allocations instead of choosing the next apparently available default independently. Use native device, port and output selection; keep build outputs local to each worktree. If a resource cannot be isolated, serialize that phase while other work continues. Do not introduce a lock service or committed allocation registry.

For concurrent iOS and Android checks, assign distinct devices and development-server ports: use the iOS simulator UDID or Android ADB serial explicitly. Target devices explicitly rather than using a shared `booted` alias or the most recently opened device. Desktop mouse/keyboard automation shares focus even with separate simulators: serialize those interactive checks unless the available tool demonstrably controls a specific device independently. Bound concurrency to the host's actual capacity, and release only resources owned by the task.

## Review each implementation independently

This workflow uses two rounds of two reviewers as its personal default, not an upstream requirement or a guarantee of defect-free code. Run initial affected checks and review handwritten tests against their applicable testing skill/examples before the first round.

For each round, spawn two new reviewer subagents with fresh contexts, without inheriting the author's conversation. When available, use `fork_turns="none"`; otherwise disclose the context-isolation limit. Give both the same stable revision/tree, diff base, issue scope, raw requirements, applicable guidance and factual evidence limits. Do not supply the author's verdict, earlier findings or another reviewer's conclusions. Keep the tree stable until both reviewers finish.

- Reviewer A examines requirements, behavior, failures, integration boundaries and meaningful test coverage.
- Reviewer B examines KISS, documented native library usage, responsibilities, duplication, naming and skill/convention compliance.

Reviewers do not modify files or launch further agents. They return actionable findings with file/line, concrete scenario and impact, supporting evidence, and the smallest justified correction with its tradeoffs. They may report no findings. Documentation-only reviews examine operational accuracy, applicability and evidence claims rather than inventing runtime tests.

After both reports, the implementation owner verifies every finding. Correct demonstrated defects and justified simplifications; explain rejected substantive suggestions. Preserve accepted requirements and useful tests. Use official documentation for disputed library behavior and the project's installed versions. Do not add speculative guards, duplicate state or custom machinery to anticipate hypothetical library defects; if a required guarantee exceeds native behavior, expose the concrete tradeoff instead of silently weakening it.

Recheck affected behavior after corrections, then run the second round with two entirely new reviewers. Extra focused review is warranted when the final corrections materially alter behavior/structure or leave a concrete concern. Do not seek a finding quota, loop indefinitely or repeatedly run broad checks without changes or unresolved concerns.

## Verify and deliver

Apply repository verification and delivery policy, using an installed delivery skill when available. Test the final tree proportionately and report passed, failed and unavailable evidence. Mocks, exports, startup and synthetic native launches prove only their own boundary. Do not claim actual provider, design or device qualification from narrower evidence.

Deliver one draft PR per scoped task and attach it to its conversation when the native tool is available. Open its description with the same brief explanation of purpose, adjusted to the actual delivered behavior; update it when scope changes. Follow with the relevant implementation, checks, both review rounds and material remaining limits concisely. Use existing conversation/PR records; do not commit a parallel audit catalogue or synchronization manifest.

Merging and starting subsequent issues require the applicable explicit human request. At an authorized merge, fetch the current base, detect integration lag and follow the project's update strategy. Rebase owned topics only where that is the accepted policy, publish rewrites with a safe lease, reassess semantic conflicts and rerun affected verification/required CI on the final revision. Preserve protections and unrelated branches. This workflow grants no integration-branch rewrite or provider-operation permission.

## Coordinate an authorized skill update

When asked to update running tasks, first identify the delivered skill revision and integration commit. Send the existing conversations the exact commit, changed instructions and requested verification. Ask them to integrate at a stable point, preserve local work and reassess reviews affected by the update. Do not duplicate finished review rounds when the update merely codifies the same protocol.

Verify each task's acknowledgment and actual incorporated revision; report sent, pending and confirmed states separately. Preserve the original implementation scope and merge authorization. Explicit invocation of this skill alone does not authorize messaging other conversations, publishing skill changes or rewriting another project's history.
