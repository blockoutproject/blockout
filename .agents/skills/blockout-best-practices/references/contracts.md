# Contract-First Boundaries

- Edit `libs/shared/contracts/specs/source` first.
- Shared transport schemas belong under `source/shared/schemas`; services reference them by name.
- Run bundling and schema-mapping synchronization before Java, Python, or TypeScript generation.
- Generated bundles, Java sources, Python clients, and Orval clients are outputs and remain ignored.
- Keep transport models separate from domain, persistence, provider, and view models.
- Prove discriminators and mappings through generation, compilation, and focused tests.
