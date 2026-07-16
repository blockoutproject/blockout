# Blockout — Claude Code Instructions

## Agent Skills

Skills are stored in `.agents/skills/*/SKILL.md` (project convention, shared across tools).

For Blockout repository work, start with:

```text
.agents/skills/blockout-best-practices/SKILL.md
```

Use it as the project entrypoint. Do not bulk-load every skill at conversation start.

Load other skills only when the task clearly touches their trigger area, for example React, Expo, React Native,
Spring Boot, Python, Nx, contracts, code review, debugging, planning, or verification. Blockout-specific rules override
generic technology examples when they conflict.
