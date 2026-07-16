# Workspace Architecture Execution

Execute only findings previously validated as FIX or SIMPLIFY.

- Revalidate each finding against current source.
- Preserve deployable boundaries and production runtime contracts.
- Use the shared Maven reactor, Nx Expo project, explicit scraper projects, and centralized `infra/compose`.
- Avoid dependency upgrades unless required by the finding.
- Run the Nx graph, clean Maven compile, mobile typecheck/export, scraper syntax checks/builds, Compose config, environment
  coverage, and diff checks according to touched scope.
