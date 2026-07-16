# Blockout Agent Brief

## Required Start

1. Run `git status --short --branch`.
2. Read `blockout-product-runtime-context.md`.
3. Read `.agents/skills/blockout-best-practices/SKILL.md`.
4. Inspect the owning deployable and its `.env.example`.
5. For deployment or migration work, read `blockout-monorepo-readiness.md` and
   `docs/migration/monorepo-cutover.md`.

## Current Posture

- The monorepo contains all imported deployables and their source histories.
- Standalone repositories still own production until individual cutover.
- Monorepo CI is validation-only and must not push images or call Dokploy.
- Local Docker infrastructure is centralized in `infra/compose`.
- Spring services use the shared Maven reactor.
- Expo owns the mobile application under `apps/frontend/mobile`.
- Python scrapers are explicit Nx projects without a Python plugin.

## Execution Rules

- Preserve current runtime contracts during migration work.
- Do not infer product changes from structural cleanup.
- Never commit secrets or real environment values.
- Keep one deployable per cutover and retain a tested rollback.
- Report environmental validation failures separately from source failures.
- If the requested work requires a production credential, Dokploy mutation, store release, or unresolved product
  choice, stop at the explicit human gate.
