# Agent Guidance Audit Runbook

Use this checklist to audit instruction ownership, precedence, duplication, and portability without creating another
policy layer.

## Verification Checklist

- [ ] Map session guidance, `AGENTS.md`, repository router, focused policies, overlays, task runbooks, and the active
      issue in precedence order.
- [ ] Assign every decision-bearing statement to one focused owner; replace lower-layer copies with direct links.
- [ ] Keep repository coordinates and concrete values in repository guidance or overlays, portable decisions in focused
      references, and operation order in runbooks.
- [ ] Walk discovery, claim, `PLAN_REQUIRED`, scope expansion, draft publication, review, release, dependency
      reconciliation, and Epic rollup through one unbroken owner path.
- [ ] Search portable references for repository names, paths, branches, commands, versions, providers, ports, design
      files, and taxonomy values.
- [ ] Inventory every focused reference and record one compatibility-matrix row with its boundary, repository route,
      counterpart or adoption target, and portability classification.
- [ ] Compare counterpart references in any read-only structural repository. A boundary adopted by both repositories
      requires word-for-word and byte-for-byte equality; record every mismatch as an adoption gap rather than merging a
      partial copy or creating a repository-specific fork.
- [ ] Keep repository-only technologies in their owning route. A portable technology policy may remain available as an
      exact adoption target without forcing another repository to route it.
- [ ] Perform every structural-repository comparison read-only and never mutate or copy its business code.
- [ ] Confirm the audit adds no workflow, bot, policy engine, fixture framework, scheduled job, manifest, or hidden
      claim state.
- [ ] Validate changed links and terminology, run repository formatting, and finish with `git diff --check`.

Report corrected owners, remaining gaps, checks run, and intentional skips.
