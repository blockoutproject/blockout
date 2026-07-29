# Blockout Agent Guidance

Start every repository task with `.agents/skills/blockout-best-practices/SKILL.md`. It maps Blockout task signals to
the smallest authoritative set of focused policies, project overlays, and task runbooks.

## Repository Scope

This file owns repository-wide Blockout constraints and routing context. The router owns the repository map and source
selection. Its `overlays/**` files own Blockout coordinates and commands; its `references/**` files remain portable.
Task runbooks sequence operations without redefining policy. The live issue supplies task scope and evidence but does
not override these repository constraints.

## Repository Invariants

- Speak French in chat and write repository files in English.
- Treat the imported standalone applications as the behavioral baseline.
- Use Maaatch as a read-only structural and naming reference; never copy its business code.
- Preserve runtime behavior unless the active task explicitly authorizes a correction.
- Treat generated V1 contracts as the active transport authority and change them only through an explicit task.
- Treat the organization [Roadmap Project](https://github.com/orgs/blockoutproject/projects/4) as the only operational
  task and claim authority for `blockoutproject/blockout`.
- Keep generated output, secrets, local environments, caches, logs, and build artifacts out of Git.
