# Blockout Agent Guidance

- Speak French in chat. Write repository files and GitHub content in English.
- Current source, tests, contracts, architecture, and the designated issue define accepted behavior. Preserve runtime behavior unless the issue explicitly authorizes a correction.
- Use Maaatch only as a read-only structural and naming reference when a human explicitly asks. Never copy its business code.
- When a human asks what to work on next, inspect repository issues and recommend the best eligible issue using native blockers, assignments, active pull requests, likely overlap, and downstream value. A recommendation is not a claim: wait for human confirmation of the issue number before assignment or execution.
- Before starting, read the issue, its native blockers and sources; refuse work assigned to someone else; check open pull requests for obvious overlap; then self-assign.
- Use `feature/<issue>-<slug>`, `bugfix/<issue>-<slug>`, or `tech/<issue>-<slug>`. Organize commits intentionally, then open a draft pull request targeting `develop`; use `Closes #N` for complete delivery and `Refs #N` only for explicitly non-closing work.
- Never consult an archived or external repository unless a human explicitly asks.
- Edit OpenAPI source fragments first. Generated bundles, Java sources, Python clients, and TypeScript clients are reproducible outputs and must stay out of Git.
- Keep Nx as a thin local orchestrator behind stable `npm run` entry points. Nx uses local caching only; GitHub Actions runs `npm run verify`, GitHub provides CI evidence, and Docker builds and delivers containers directly.
- Never merge without an explicit human request. Before merging, verify available review and CI evidence, then use a merge commit only. After a successful merge, verify issue closure, unassign it, delete the merged topic branch locally and remotely, and synchronize local `develop` without overwriting unrelated work.
- For Figma-only delivery, record evidence and obtain explicit human approval, then close and unassign the issue without opening a documentation pull request.
- Run the validations selected by `.agents/skills/blockout-best-practices/SKILL.md` and report evidence.
