# Blockout Agent Guidance

Repository skills live under `.agents/skills/*/SKILL.md`. Start every repository task with
`.agents/skills/blockout-best-practices/SKILL.md`; it routes to the smallest authoritative read set for the task.

## Instruction Hierarchy

Apply repository guidance through five shallow layers:

1. session-level system, developer, and current-user instructions;
2. this file for repository-wide Blockout invariants and coordinates;
3. the repository router for source selection, repository structure, and validation defaults;
4. one focused policy for each decision or boundary; and
5. one task runbook for the operation sequence.

Higher layers constrain lower layers. Focused policies own decisions; runbooks orchestrate them and must link instead
of restating their rules. The live issue supplies task scope and evidence but does not override repository invariants.
Every file under `.agents/skills/blockout-best-practices/references/**` is portable and must remain reusable unchanged
by another repository router. Blockout-specific values belong in this file, the router, or `overlays/**`.

## Repository Invariants

- Speak French in chat and write repository files in English.
- Treat the imported standalone applications as the behavioral baseline.
- Use Maaatch as a read-only structural and naming reference; never copy its business code.
- Preserve runtime behavior unless the active task explicitly authorizes a correction.
- Treat generated V1 contracts as the active transport authority and change them only through an explicit task.
- Treat the organization [Roadmap Project](https://github.com/orgs/blockoutproject/projects/4) as the only operational
  task and claim authority for `blockoutproject/blockout`.
- Keep generated output, secrets, local environments, caches, logs, and build artifacts out of Git.

Roadmap operations, GitFlow, release, and validation details belong to the focused policies and task runbooks selected
by the repository router.
