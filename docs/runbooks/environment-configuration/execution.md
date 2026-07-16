# Environment Configuration Execution

Revalidate accepted findings, then update only the owning source, example, Compose/workflow wiring, and documentation.

- Use safe local-shaped values.
- Do not rename production variables during migration without an explicit compatibility plan.
- Run `npm run validate:env`.
- Run Compose config for centralized infrastructure.
- Compile or export the owning runtime when configuration semantics changed.
- Scan the final Git history and diff for secret file paths and accidental credential content.
