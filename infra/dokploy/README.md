# Manual application delivery

[F13](../../specs/003-shared-quality/plan.md#manual-delivery-and-operations) owns delivery policy. This guide describes the executable configuration; it grants no deployment, signing, store-publication or provider permission. Native environment qualification remains under F13 T053/T058. The database backup redaction prerequisite remains separate under T047/T054/T055; do not supply real V2 S3 credentials before it passes.

## Images and configuration

Build from the repository root. The application Dockerfiles regenerate canonical contracts, then use the committed Maven wrapper and dependency management. `unzip` is a build prerequisite for the wrapper's checksum-verified ZIP. Application runtimes contain the executable JAR and Temurin 25 JRE, run as UID 10001 and receive termination signals directly. The migration image contains Liquibase 5.0.3, authored changelogs and the Boot-managed PostgreSQL JDBC driver; it retains the publisher's non-root user and entrypoint.

```sh
docker build -f apps/backend/Dockerfile -t blockout-backend:local .
docker build -f apps/collector/Dockerfile -t blockout-collector:local .
docker build -f apps/backend/Dockerfile.migration -t blockout-migration:local .
docker compose --env-file infra/dokploy/.env.example -f infra/dokploy/compose.yaml config --quiet
```

Local application development still runs on the host. Release Compose contains no PostgreSQL service or database volume. Configure independent production/preproduction PostgreSQL instances, volumes and networks in Dokploy. Use the existing [role boundary](../postgres/init-roles.sql) as a disposable test example, not as a command to reset an existing environment. Backend receives only the application role; the one-off migration receives schema-owner credentials. Collector receives neither database credentials nor the database network.

Before application startup, provision the environment's external telemetry network using the [observability setup](../observability/README.md), even if Alloy activation remains pending. Both applications carry Alloy's admission labels and join this private network; migration does neither. Once the receiver and its privacy prerequisites are qualified, set `MANAGEMENT_OTLP_METRICS_EXPORT_ENABLED=true` in the private environment configuration. It defaults to `false`. Starting the authorized Alloy stack admits labelled application logs independently of this metrics switch. No OTLP port is published by application Compose.

For each environment, create a native Dokploy Docker Compose application with **Raw** source. Copy [compose.yaml](compose.yaml) from the exact candidate revision and retain its native deployment record. Enable creation of Dokploy's `.env` file and supply private values using [.env.example](.env.example) as the field list. Set the three image references to qualified `ghcr.io/...@sha256:...` digests. Do not print resolved environment values. Configure the backend domain/HTTPS and port 8080 through Dokploy's native domain UI; collector uses that environment's HTTPS API origin. Keep automatic deployments and image-update hooks disabled.

Backend health uses native Actuator readiness, including PostgreSQL. Collector starts only after backend health passes; it remains a non-web process. Compose reports its process start, which does not establish successful acquisition or integration. Those outcomes remain with F01's observations. The migration profile is excluded from ordinary service startup.

## Preparation and qualification

GitHub only exposes `workflow_dispatch` after the workflow exists on the default branch. Deliver the workflow configuration through the ordinary authorized develop-to-main PR before first use; that merge starts no deployment/build.

Configure the GitHub `preproduction` and `production` environments with the owner's **required review** and appropriate branch policies (`develop` and `main`, respectively) before running the workflows. Merely referencing an environment in YAML does not configure its protection. Neither environment is created or weakened by these files.

Run **Prepare release** from `develop`, selecting Server, Mobile or Both and supplying its exact current SHA. A moved/different ref is refused. The workflow reuses existing CI. Server preparation publishes three images with the native Docker actions and retains their complete image references pinned by digest as GitHub artifacts. Mobile preparation runs EAS for `preview` and `production` on both platforms and retains only native build IDs/platforms, excluding download URLs and credentials. GitHub's normal artifact retention applies; an expired candidate cannot be promoted through this workflow.

Before approving the pending `preproduction` job, deploy the selected exact server images using the procedure below and complete the [prepared qualification](../../specs/003-shared-quality/quickstart.md#delivery-and-operations). Qualify the native mobile candidates when Mobile/Both is selected; the production-identity binary needs its own store-test proof. Record results in the native Dokploy/EAS/store tools and the owning delivery evidence. Approval records the operator's qualification; the workflow does not perform or infer it.

EAS uses standard [build-time variants](https://docs.expo.dev/build-reference/variants/) and [remote build versions](https://docs.expo.dev/build-reference/app-versions/). `preview` is **Blockout Preprod**, with its own package/bundle identifier. `production` retains F14's `com.blockoutproject.blockout` and existing EAS project. Set `EXPO_PROJECT_SLUG` to that project's actual slug both as a GitHub repository variable (for initial CLI resolution) and as a plain-text variable in the EAS environments used by the profiles. Supply private `EXPO_TOKEN` for the authorized build account. F14 must replace the local-only `0.0.0` marketing version in `app.config.ts` with its approved version in the candidate source before a store build, and verify the existing remote counters/signing associations against the latest submitted builds; do not initialize/reset them from stale local values. Configure API/provider inputs in EAS's `preview` and `production` environments, keeping private upload/signing credentials private. No provider SDK or secret is added here.

The [EAS lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks/) install the workspace's npm version and regenerate ignored mobile consumers after dependency installation. There is no generated-source upload or second build pipeline. Native development builds remain available locally; no EAS Update/OTA is configured.

## Promotion and native deployment

After explicit human promotion from `develop` to `main`, run **Promote release** from `main` with the successful, approved preparation run ID. It checks the native workflow's identity/result and compares the complete candidate/main source content, allowing a different merge-commit SHA only when the trees match. The `production` environment approval then releases the **same** digest/build-ID handoff to the operator. It rebuilds nothing and publishes nothing to stores.

The operator enables F12 maintenance with an already usable authorized session, waits for any active Dokploy delivery to finish, sets the exact approved digest references and uses Dokploy's native deployment queue. Keep one delivery in flight per environment and do not cancel a migration. GitHub concurrency serializes approval runs; it does not lock an externally running migration. Do not enqueue a second candidate or edit its live configuration while the first is active.

For **Raw** source, Dokploy writes `docker-compose.yml` and `.env` in its application directory. Set this **literal custom Command** for preproduction (Dokploy prepends the first `docker`):

```text
compose --project-name blockout-preproduction --env-file .env --file docker-compose.yml pull backend collector migration && docker compose --project-name blockout-preproduction --env-file .env --file docker-compose.yml stop backend collector && docker compose --project-name blockout-preproduction --env-file .env --file docker-compose.yml run --rm --no-deps migration && docker compose --project-name blockout-preproduction --env-file .env --file docker-compose.yml up --detach --wait --wait-timeout 180 backend collector
```

For production, use the same literal command with **every** project argument changed to `blockout-production`, with production's separate configuration. The complete command replaces Dokploy's default; retain explicit project/file/env arguments on every member. Native `&&` stops after a failed pull, stop, migration or startup. The command never stops PostgreSQL, removes volumes, invokes a Liquibase rollback or repairs a failed migration automatically; native changeset transactions retain their ordinary behavior.

Wait for the native Dokploy result and actual backend/database health, then check owner outcomes before lifting maintenance. A GitHub handoff, container start or green infrastructure probe is not business acceptance. After a failed/uncertain delivery, inspect its native record before another explicit attempt. Use an older application image only after checking compatibility with the current schema/data; otherwise follow the owning repair/restore procedure. Store release is a separate explicit action in the native store consoles using the qualified production build IDs; preproduction is not a substitute. Server/store publication remains non-atomic.

References: [Dokploy Compose/custom commands](https://docs.dokploy.com/docs/core/docker-compose), [Compose one-off jobs](https://docs.docker.com/reference/cli/docker/compose/run/), [Compose wait](https://docs.docker.com/reference/cli/docker/compose/up/), [GitHub environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [digest-addressed GHCR pulls](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
