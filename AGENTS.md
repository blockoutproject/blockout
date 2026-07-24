# Blockout Agent Guidance

Repository skills live under `.agents/skills/*/SKILL.md`.

Start every repository task with `.agents/skills/blockout-best-practices/SKILL.md`. It routes to the detailed policies
needed for the current scope. Load other skills only when their description or the router explicitly triggers them.

Global rules:

- Speak French in chat and write repository files in English.
- Treat the imported standalone applications as the behavioral baseline.
- Use Maaatch as a read-only structural and naming reference; never copy its business code.
- Preserve runtime behavior unless the active task explicitly authorizes a correction.
- Treat the generated V1 contracts as the active transport authority; change them only through an explicit task and keep
  GitFlow/GitHub Project governance dormant until a separate user-authorized task.
- Keep generated output, secrets, local environments, caches, logs, and build artifacts out of Git.
- Before completing a code or configuration change, run `npm run format`, then the relevant lint, typecheck, and tests,
  and finish with `npm run format:check`. Repository formatters are authoritative; do not reproduce their rules
  manually or rely on editor-specific formatting.
