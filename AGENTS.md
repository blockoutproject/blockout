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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
