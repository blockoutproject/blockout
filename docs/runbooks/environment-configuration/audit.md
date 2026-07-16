# Environment Configuration Audit

This audit is read-only.

Inventory Spring placeholders, Python environment access, Expo `process.env`, Compose interpolation, Docker build
arguments, and workflow environment values. Compare each deployable with its `.env.example`, ignored files, legacy
production key names, and deployment documentation.

Flag missing examples, undocumented variables, committed secrets, unsafe public Expo values, stale Compose variables,
and production/local naming drift. Never print secret values.
