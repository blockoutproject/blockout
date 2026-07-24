# Blockout Agent Guidance

Repository skills live under `.agents/skills/*/SKILL.md`.

Start every repository task with `.agents/skills/blockout-best-practices/SKILL.md`. It routes to the detailed policies
needed for the current scope. Load other skills only when their description or the router explicitly triggers them.

Global rules:

- Speak French in chat and write repository files in English.
- Treat the imported standalone applications as the behavioral baseline.
- Use Maaatch as a read-only structural and naming reference; never copy its business code.
- Preserve runtime behavior unless the active task explicitly authorizes a correction.
- Treat the generated V1 contracts as the active transport authority; change them only through an explicit task.
- Treat the organization [Roadmap Project](https://github.com/orgs/blockoutproject/projects/4) as the only operational
  task and claim authority. Read `.agents/skills/blockout-best-practices/references/github-roadmap-policy.md` and the
  applicable task runbook before selecting, claiming, executing, or releasing work.
- Never create a task branch, task-specific plan, or task-file edit before a stable claim. Target `develop` from an
  issue branch, publish a labeled draft pull request, and require separate current-user authorization plus fresh
  release evidence before merge.
- Treat `docs/current/roadmap.md` only as temporary GitFlow migration evidence until GIT-012 removes it; never use it to
  select or claim work.
- Keep generated output, secrets, local environments, caches, logs, and build artifacts out of Git.
- Before completing a code or configuration change, run `npm run format`, then the relevant lint, typecheck, and tests,
  and finish with `npm run format:check`. Repository formatters are authoritative; do not reproduce their rules
  manually or rely on editor-specific formatting.
