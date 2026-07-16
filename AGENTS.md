# Blockout Repository Instructions

Repository documentation, source comments, commits, issues, and pull requests are written in English. User-facing
conversation may follow the user's language.

Before changing this repository, read:

1. `.agents/skills/blockout-best-practices/SKILL.md`
2. `docs/current/blockout-agent-brief.md`
3. The scope-specific references routed by the Blockout skill

Production safety is the primary constraint. The standalone repositories remain the production source until each
deployable is explicitly cut over. Never change image publication, Dokploy configuration, environment contracts,
service ports, or deployment webhooks by inference.

Preserve unrelated work. Prefer focused changes and existing Nx, Maven, Expo, Python, Docker, and Spring Boot
conventions. Never commit secrets or real credentials.
