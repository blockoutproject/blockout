# Nx CI And Container Delivery

## Decision

Nx owns project discovery, dependency propagation, task ordering, and affected selection. Maven, uv, Expo, and Docker
remain the native executors for their ecosystems. GitHub Actions owns event trust, credentials, the publication matrix,
and status reporting. Docker Hub stores images, and each Dokploy application owns its deployment after its webhook is
called.

The repository deliberately uses no Nx Cloud, Nx Agents, Nx Release, EAS delivery, GHCR, reusable workflow, or custom
scheduler. `@nx/docker` is installed at the workspace's Nx version and supplies the inferred `docker:build` targets. Its
23.1.0 initializer still labels Docker support as experimental, so its role is deliberately limited to local inferred
build targets. Registry authentication, commit-scoped tags, and publication remain delegated to Docker's official
GitHub Actions.

## Workflow Boundaries

| Workflow   | Events                                                 | Authority                                                                                    |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `CI`       | Pull requests to `develop` or `main`; `develop` pushes | Format, verify, and build only affected projects and images. It has no delivery credentials. |
| `Delivery` | `main` pushes only                                     | Revalidate, publish affected images, then call only their Dokploy webhooks.                  |

Both workflows check out full Git history and use `nrwl/nx-set-shas`. Pull requests compare against their target branch,
while branch pushes compare against the last successful workflow run. CI names `develop` explicitly as its main branch;
Delivery retains `main`. Actions are pinned to immutable commit SHAs and the workflows grant only `actions: read` and
`contents: read`.

Pull requests never log in to Docker Hub, push an image, read a Dokploy webhook, or call a deployment endpoint. The
delivery job checks that all three credentials required by its selected matrix entry exist before it publishes.

## Nx Graph And Container Inputs

Every deployable Dockerfile is discovered by `@nx/docker` and exposes `docker:build`. The inferred target runs from the
repository root because all current Dockerfiles use the monorepo root as their build context.

The target inputs model the files outside each project root that Docker actually consumes:

- `.dockerignore` affects every image;
- OpenAPI contract sources affect Java images and their other real consumers;
- Maven project dependencies propagate backend parent and shared-model changes;
- root uv files and all Python workspace manifests affect the two scraper images;
- documentation is not a container input.

Nx preserves the `build` and `^build` dependencies inferred by `@nx/docker`, then prepares the ignored OpenAPI bundles.
For Python images, the dependency build generates and packages the shared Python contract clients before Docker runs.
For Maven projects, the contract preparation dependency is attached to the inferred `generate-sources` phase, so the
ordering is contracts, generated clients and models, then application compilation. Each Dockerfile still owns its
reproducible Maven or uv image build. The two former explicit scraper `docker-build` targets were removed so one target
owns local container builds.

Delivery transfers ignored generated inputs between its validation and publication jobs. Every selected image receives
the OpenAPI bundles, while only Python matrix entries receive the generated Python clients. A clean publication checkout
therefore contains the same generated inputs as a local `docker:build` task without committing generated files.

## Docker Hub And Dokploy Contract

Delivery publishes two tags for each selected image:

- the full Git commit SHA for commit-scoped traceability and rollback;
- mutable `latest`, which is the tag followed by the existing Dokploy applications.

A publication job first verifies that its event SHA is still the current `main` head. An already stale queued run fails
before reading delivery secrets or updating `latest`, and the workflow concurrency group prevents delivery runs from
executing simultaneously. This check is not an atomic lock against a future push that arrives after publication starts;
the next serialized run restores `latest` to the newest successfully delivered commit. Docker Hub tag immutability is
not assumed.

The exact repositories and webhook secrets are:

| Nx project                       | Docker Hub repository                        | Dokploy secret                         |
| -------------------------------- | -------------------------------------------- | -------------------------------------- |
| `@blockout/club-scraper`         | `blockoutproject/blockout-scraper-clubs`     | `DOKPLOY_WEBHOOK_CLUB_SCRAPER`         |
| `@blockout/clubs-service`        | `blockoutproject/blockout-api-clubs`         | `DOKPLOY_WEBHOOK_CLUBS_SERVICE`        |
| `@blockout/competition-scraper`  | `blockoutproject/blockout-scraper`           | `DOKPLOY_WEBHOOK_COMPETITION_SCRAPER`  |
| `@blockout/competition-service`  | `blockoutproject/blockout-api-competitions`  | `DOKPLOY_WEBHOOK_COMPETITION_SERVICE`  |
| `@blockout/config-service`       | `blockoutproject/blockout-api-config`        | `DOKPLOY_WEBHOOK_CONFIG_SERVICE`       |
| `@blockout/matches-service`      | `blockoutproject/blockout-api-matches`       | `DOKPLOY_WEBHOOK_MATCHES_SERVICE`      |
| `@blockout/mobile-gateway`       | `blockoutproject/blockout-mobile-gateway`    | `DOKPLOY_WEBHOOK_MOBILE_GATEWAY`       |
| `@blockout/notification-service` | `blockoutproject/blockout-api-notifications` | `DOKPLOY_WEBHOOK_NOTIFICATION_SERVICE` |
| `@blockout/pools-service`        | `blockoutproject/blockout-api-pools`         | `DOKPLOY_WEBHOOK_POOLS_SERVICE`        |
| `@blockout/reports-service`      | `blockoutproject/blockout-api-reports`       | `DOKPLOY_WEBHOOK_REPORTS_SERVICE`      |
| `@blockout/search-service`       | `blockoutproject/blockout-api-search`        | `DOKPLOY_WEBHOOK_SEARCH_SERVICE`       |
| `@blockout/search-worker`        | `blockoutproject/blockout-worker-search`     | `DOKPLOY_WEBHOOK_SEARCH_WORKER`        |
| `@blockout/teams-service`        | `blockoutproject/blockout-api-teams`         | `DOKPLOY_WEBHOOK_TEAMS_SERVICE`        |
| `@blockout/users-service`        | `blockoutproject/blockout-api-users`         | `DOKPLOY_WEBHOOK_USERS_SERVICE`        |

Docker Hub authentication uses `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. A publication failure prevents that
application's webhook step. A webhook failure remains a visible failed matrix job and can be retried without changing
which image corresponds to the commit.

To roll back one application, retag its known-good full-SHA image as `latest`, trigger the corresponding Dokploy
webhook, and verify that the deployed digest matches the known-good image. This changes only the selected application;
the immutable identity is the image digest, not the mutable Docker tag.

## Local And CI Verification

`npm run verify` remains the complete clean-workspace gate and the single source of truth for full local verification.
CI does not rerun that workspace-wide aggregator: it calls the existing project targets through `nx affected`, excludes
the workspace gate and the two Maven aggregator nodes, and checks formatting only across the selected Git range. The
general project verifications use Nx's default bounded parallelism. Maven uses the inferred `mvn-verify-ci` target
recommended by the official `@nx/maven` CI generator. The default batch path is retained because it materially reduces
CI duration, but `@nx/maven` 23.1.0 has an unresolved result-transport race when its resident runner uses several
workers. A version-guarded postinstall workaround limits only that runner JVM to one reported processor; Nx task
parallelism and forked test JVMs remain unchanged. Remove the workaround only after a published `@nx/maven` version is
validated by a clean install and the complete affected Maven checks.

Both workflows explicitly run the small native Node regression test for affected container selection. The test invokes
the public `npm exec nx` interface and covers application-only, shared Maven model, contract, Docker-context, and
documentation changes plus the resolved Docker task ordering. A separate script or dependency-graph implementation is
not maintained.

Useful focused commands are:

```bash
npm exec -- nx show projects --with-target docker:build
npm exec -- nx show projects --affected --with-target docker:build
npm exec -- nx run @blockout/workspace:test-affected-containers
npm exec -- nx affected -t docker:build
```

## Alternatives Not Selected

- Keeping separate contract, Java, Python, Expo, and formatting jobs would continue to duplicate the graph in YAML.
- Nx Release would add release groups, version plans, changelogs, and Git tags that this `main`-driven deployment does
  not require.
- A custom affected-image script or scheduler would duplicate Nx project selection and create a second graph owner.
- Nx Cloud and distributed agents are unnecessary for correctness and can be reconsidered only from measured CI cost.
- Publishing from `develop`, pull requests, or a manual dispatch would broaden trusted delivery authority without a
  product requirement.

## Official References

- [Nx Docker](https://nx.dev/docs/technologies/build-tools/docker/introduction)
- [Nx configuration and target defaults](https://nx.dev/docs/reference/nx-json)
- [Nx GitHub Actions integration](https://nx.dev/docs/features/ci-features/github-integration)
- [Nx affected](https://nx.dev/ci/features/affected)
- [Nx Maven](https://nx.dev/docs/technologies/java/maven/introduction)
- [Nx Maven batch result transport fix](https://github.com/nrwl/nx/pull/34046)
- [Maven build lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
- [Nx Expo](https://nx.dev/docs/technologies/react/expo/introduction)
- [GitHub Actions contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/)
- [uv with GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/)
- [uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)
- [Dokploy auto deploy](https://docs.dokploy.com/docs/core/auto-deploy)
