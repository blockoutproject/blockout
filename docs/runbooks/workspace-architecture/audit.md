# Workspace Architecture Audit

Use this runbook to inspect Blockout's monorepo boundaries without moving projects, changing targets, or editing
configuration.

## Authority

Read the Blockout best-practices router, baseline source gate, backend/mobile/Python policies, contract-first policy,
local-runtime policy, and `nx-workspace-patterns`. Use the current Nx graph, Maven reactor, application roots, and
generated-contract ownership as evidence.

## Procedure

1. Record the clean default-branch state and inventory Nx projects, npm workspaces, backend Maven modules, deployable
   applications, shared libraries, contracts, infrastructure, docs, and ignored generated output.
2. Inspect:
   - project roots, names, tags, implicit dependencies, targets, inputs, outputs, cache, and affected behavior;
   - Maven reactor membership and dependency direction;
   - application code under `apps` and genuinely stable shared assets under `libs/shared`;
   - service ownership, mobile-gateway composition, Python scraper independence, and generated client containment;
   - duplicate orchestration between Nx, npm, Maven, Python, Docker, and CI;
   - tracked build output, native output, virtual environments, caches, logs, secrets, or generated files;
   - obsolete empty directories and speculative package skeletons;
   - documentation or runbook links to removed architecture.
3. Use `nx show projects`, targeted project inspection, and dependency graphs without changing workspace state.
4. Trace every candidate to active consumers and CI. Do not infer a defect from directory style alone.
5. Deduplicate existing issues and distinguish incorrect architecture from an intentional migration seam.

## Publication And Result

Publish only focused, non-overlapping findings in a separate phase. Each issue names the owner, exact project/file
Workset, preserved targets and runtime, dependency impact, migration sequence, and validation. Do not generate projects
or run migrations from this audit. A consistent workspace is a valid no-op.
