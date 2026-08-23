# Nx Affected Container Delivery

Blockout uses the same delivery shape as the verified Vytruve reference: one GitHub Actions workflow resolves the
official Nx commit range, validates the selected revision, exposes the affected deployable projects as JSON, publishes
immutable images, advances mutable production pointers by digest, and triggers only the corresponding Dokploy
applications.

## Ownership

- Nx owns the project graph, dependency propagation, affected selection, and local container targets.
- `npm run verify` remains the single complete validation contract for contracts, Maven, Python, scrapers, Expo, and
  formatting.
- Maven, uv, Expo, and Docker remain the native executors for their ecosystems.
- GitHub Actions owns event trust, production credentials, GHCR publication, and release sequencing.
- Dokploy owns runtime configuration, retained services, health checks, deployment history, and application restarts.

The complete verification gate is the one intentional difference from Vytruve. Blockout keeps the full Maven reactor
and complete Expo/Python verification because splitting those native gates back into fine-grained affected aliases
previously required a Maven runner workaround. Nx affected is used where the graph is both precise and operationally
valuable: selecting and building deployable images.

## Verification And Selection

The `verify` job runs for pull requests to `develop` or `main` and pushes to either branch. It checks out full Git
history, uses `nrwl/nx-set-shas`, installs locked npm and uv dependencies, and selects projects with:

```bash
npm exec nx -- show projects --affected \
  --base="$NX_BASE" \
  --head="$NX_HEAD" \
  --withTarget=container \
  --json
```

The JSON is allow-listed against the 14 deployable backend projects and becomes the release job input. The job then
runs `npm run verify` and builds only the affected `container` targets. Pull requests cannot publish images, read
Dokploy webhooks, or trigger deployment.

Each container target delegates directly to the application-owned Dockerfile. Java targets depend on generated OpenAPI
bundles. Scraper targets depend on generated Python contract clients, which depend on the OpenAPI sources. Maven parent
and shared-model dependencies come from the live Maven project graph. The root Docker context is an input of every
container target, while the locked Python workspace inputs belong only to the two scraper targets.

Expo mobile remains part of verification but has no `container` target. Native EAS and store delivery are deliberately
outside this pipeline.

## Production Release

Only a successful push to `main` can enter the protected `production` environment. An empty affected-project list
skips release before environment access. The release job:

1. reproduces generated OpenAPI and Python inputs from the locked checkout;
2. publishes every selected image to GHCR with the full Git SHA;
3. records the immutable digest returned by Buildx;
4. after all selected publications succeed, retags each selected digest as `production`;
5. calls only the selected Dokploy Auto Deploy webhooks.

All image build steps precede all deployment steps. A publication failure therefore leaves every production pointer
unchanged. Deployment runs in dependency-aware operational order, ending with the mobile gateway and scrapers.
Production concurrency never cancels an in-progress release.

The immutable digest is the rollback identity. The SHA tag is traceability, and `production` is only the mutable pull
pointer used by Dokploy. Every runtime image also carries `APP_REVISION` and OCI source/revision labels.

## Rollback

The manual `Roll back application` workflow accepts exactly one component, a previously published digest, and its
source revision. It retags only that digest as the component's `production` pointer and calls only that component's
Dokploy webhook. It never rebuilds source, changes databases, or rolls back another application.

Dokploy webhook acceptance proves that a deployment was requested, not that application-specific readiness has passed.
Dokploy must therefore own finite health checks and deployment failure visibility for every application. Adding public
revision-aware health APIs is outside issue #161 and must be handled as a separate runtime contract if required.

## Sources

- [Nx affected](https://nx.dev/ci/features/affected)
- [Nx configuration](https://nx.dev/docs/reference/nx-json)
- [Nx Maven](https://nx.dev/docs/technologies/java/maven/introduction)
- [Nx Expo](https://nx.dev/docs/technologies/react/expo/introduction)
- [Nx Set SHAs](https://github.com/nrwl/nx-set-shas/tree/v5.0.1)
- [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/)
- [Docker image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
- [uv with GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/)
- [Dokploy Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy)
- [Dokploy webhooks](https://docs.dokploy.com/docs/core/webhook)
- [Dokploy rollbacks](https://docs.dokploy.com/docs/core/applications/rollbacks)
- [Expo application deployment](https://docs.expo.dev/deploy/build-project/)
