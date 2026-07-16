# Blockout Documentation

This folder contains current runtime context, architecture, durable migration guidance, and reusable agent runbooks.
Task state belongs in GitHub once the Blockout Roadmap Project is configured.

## Start Here

1. Run `git status --short --branch`.
2. Read `current/blockout-product-runtime-context.md`.
3. Read `current/blockout-agent-brief.md`.
4. Load `.agents/skills/blockout-best-practices/SKILL.md`.
5. Load only the scope-specific references and source files needed by the task.

## Documentation Map

| Layer           | Location        | Purpose                                    |
| --------------- | --------------- | ------------------------------------------ |
| Current context | `current/`      | Live runtime and agent handoff posture     |
| Architecture    | `architecture/` | Current monorepo and deployable boundaries |
| Migration       | `migration/`    | Production-safe migration and cutover      |
| Runbooks        | `runbooks/`     | Reusable audit and execution procedures    |

Current source and live deployment configuration outrank documentation when they disagree. Fix stale documentation,
but never silently change production behavior to match a document.
