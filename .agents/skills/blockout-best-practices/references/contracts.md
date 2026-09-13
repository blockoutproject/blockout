# Contract-First Boundaries

- Edit `libs/shared/contracts/specs/source` first.
- Reusable Blockout transport enums belong under `source/shared/schemas`; services reference them by name.
- Provider-specific enums may remain named `*Enum` schemas under the owning service, with descriptions and `$ref`
  references. Do not embed enum definitions in properties or change shared enum parsing to accommodate one provider.
- Run bundling and schema-mapping synchronization before Java, Python, or TypeScript generation.
- Generated bundles, Java sources, Python clients, and Orval clients are outputs and remain ignored.
- Keep transport models separate from domain, persistence, provider, and view models.
- Prove discriminators and mappings through generation, compilation, and focused tests.
