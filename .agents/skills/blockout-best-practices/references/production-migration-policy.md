# Production Migration Policy

## Authority

Before cutover, each standalone repository and its live Dokploy configuration remain the production authority for that
deployable. The monorepo is a shadow source until production is explicitly switched.

## Invariants

- Preserve the application entrypoint, listening port, Java/Python/Node runtime, image contents, and required
  environment contract.
- Keep Docker image names and tags unchanged until the owning deployment is deliberately migrated.
- Do not add production image pushes or Dokploy webhooks to validation-only workflows.
- Do not migrate several deployables as one irreversible operation.
- Keep the legacy repository deployable until the new source has passed production smoke validation.

## Cutover Sequence

1. Build the monorepo image from the exact candidate commit.
2. Compare startup command, exposed port, health behavior, environment variables, and external dependencies with the
   standalone deployment.
3. Deploy to a shadow or non-routing target.
4. Run service-specific smoke checks.
5. Change one Dokploy source or image reference.
6. Validate logs, health, and one representative business flow.
7. Keep rollback instructions and the previous known-good image or repository revision available.
8. Only then retire the matching standalone deployment workflow.

Never infer cutover authorization from a merge, a successful build, or the presence of a monorepo Dockerfile.
