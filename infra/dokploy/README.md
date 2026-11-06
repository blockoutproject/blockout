# Manual application delivery

[F13](../../specs/003-shared-quality/plan.md#manual-delivery-and-operations) owns delivery policy. This guide describes native configuration; it grants no production deployment, signing, store-publication or provider permission. Environment qualification remains under F13 T053/T058. Database backup redaction remains separate under T047/T054/T055; do not supply real V2 S3 credentials before it passes.

## Images and configuration

Build from the repository root. Each application Dockerfile regenerates canonical contracts and uses the committed Maven wrapper and dependency management. Runtime images contain the executable JAR and Temurin 25 JRE, run as UID 10001 and receive termination signals directly.

```sh
docker build -f apps/backend/Dockerfile -t blockout-backend:local .
docker build -f apps/collector/Dockerfile -t blockout-collector:local .
```

Local application development runs on the host. Liquibase runs through Spring Boot when the backend starts, before Hibernate validation and HTTP readiness. Its XML changelog is packaged in the backend image. The backend image owns its complete schema initialization.

## Native applications

Create a separate Dokploy project `blockout-v2`, with `preproduction` and `production` environments. Use lowercase names with hyphens, such as `blockout-v2-preproduction-backend`. Declare PostgreSQL as a native database, and backend/collector as two native **Application → Docker** services per environment. PostgreSQL owns its volume independently of application replacement. Production and preproduction have separate database instances, credentials, volumes and private database networks. Collector has no database credentials or database-network attachment. Keep V1 declarations, volumes and deployment automation intact.

Configure Docker source with registry `ghcr.io` and these routing images:

| Application | Preproduction                                              | Production                                              |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| Backend     | `ghcr.io/blockoutproject/blockout/backend:preproduction`   | `ghcr.io/blockoutproject/blockout/backend:production`   |
| Collector   | `ghcr.io/blockoutproject/blockout/collector:preproduction` | `ghcr.io/blockoutproject/blockout/collector:production` |

GitHub publishes SHA-addressed images and retains their immutable digest references. Environment tags route that exact content to Dokploy; they are not the qualification record. Public GHCR packages need no registry password. A private package requires a separately authorized read-only registry credential in Dokploy. Do not build source on the VPS.

Supply each application's own inputs through its native environment panel, using [backend](../../apps/backend/.env.example) and [collector](../../apps/collector/.env.example) examples as field references. Hosted values are private and environment-specific; localhost database/API values are local examples. Spring does not load dotenv files itself. Backend uses `SPRING_DATASOURCE_*` for the restricted DML role and native `SPRING_LIQUIBASE_URL`, `SPRING_LIQUIBASE_USER`, `SPRING_LIQUIBASE_PASSWORD` for the schema owner. The backend process therefore holds the migration credential; its normal persistence datasource still cannot perform DDL. Use the [role boundary](../postgres/init-roles.sql) as a disposable example, never as a reset command on an existing database.

For **both applications**, use one replica and explicit **Swarm Settings → Update Config**: parallelism `1`, order **Stop First**, failure action **Pause**, maximum failure ratio `0`. Leave the image's entrypoint/command intact. Set Stop Grace Period to `40000000000` nanoseconds. Do not enable automatic image rollback. Native restart attempts are separate from rollback and may retry a failed startup. Temporary downtime is accepted: the old backend stops before the new one migrates. A failed migration prevents that new backend becoming ready; it does not keep the previous backend serving.

For the backend, configure native Health Check commands `CMD-SHELL` and `curl --fail --silent --max-time 5 --output /dev/null http://localhost:8080/health`, interval `10000000000`, timeout `6000000000`, start period `30000000000` nanoseconds, retries `6`. Configure its domain/HTTPS and container port `8080` through the native domain UI. Collector is non-web, uses the environment's HTTPS API origin and can remain running while the backend is unavailable; process start alone does not prove acquisition. Do not publish PostgreSQL or search ports. A shared VPS remains a shared host-failure boundary; distinct Dokploy environments are not separate machines.

Use the [observability setup](../observability/README.md) for private telemetry network attachments, container labels and receiver settings. Metrics export defaults to disabled. An Alloy receiver and its privacy prerequisites need separate qualification before enabling export.

## Private search infrastructure

F04's optional [OpenSearch Compose](opensearch.compose.yaml) runs only external OpenSearch 3.9.0 infrastructure, in separate `blockout-production-search` and `blockout-preproduction-search` projects. Each environment has its own internal network, named volume, private configuration directory, CA/certificates and backend password. No engine port is published; collector does not join the search network. Both instances still share the VPS host-failure boundary. There is no Dashboards, replica/HA promise or independent index backup chain. PostgreSQL remains authoritative.

Use [the infrastructure input names](opensearch/.env.example) in each private Dokploy Compose environment. Compose reads interpolation through Dokploy's generated `.env` or an explicit `--env-file`. Attach only the native backend to that environment's attachable search overlay. In its native environment panel, configure:

```dotenv
BLOCKOUT_SEARCH_ENABLED=true
BLOCKOUT_SEARCH_ENDPOINT=https://opensearch:9200
BLOCKOUT_SEARCH_INDEX_PREFIX=blockout-preproduction-search
BLOCKOUT_SEARCH_USERNAME=blockout_search
BLOCKOUT_SEARCH_PASSWORD=replace-privately
SPRING_SSL_BUNDLE_PEM_OPENSEARCH_TRUSTSTORE_CERTIFICATE=file:/run/opensearch/ca.pem
```

Use `blockout-production-search` for production. Mount that environment's CA read-only at `/run/opensearch/ca.pem` through native Dokploy mounts. Boot's PEM SSL bundle supplies verified trust; do not mount the operator key in the backend. Search is disabled without opt-in configuration. The full-run delay defaults to `1h`, overridable through `BLOCKOUT_SEARCH_PROJECTION_FULL_REBUILD_DELAY`. Only the serving web backend schedules writes; one replica and stop-first replacement prevent overlapping serving writers.

Before any separately authorized deployment:

1. Confirm [official Docker prerequisites](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/), including `vm.max_map_count=262144`, resources and readable mount ownership. The declared 512 MiB heap is initial configuration, not capacity qualification. This task changes no host settings.
2. Supply a separate CA, node certificate/private PKCS#8 key and distinct operator certificate/key per environment. The node certificate must cover DNS `opensearch` for verified TLS. Set exact node/operator DNs from those certificates. Put only `ca.pem`, `node.pem` and `node-key.pem` in `BLOCKOUT_SEARCH_TLS_DIRECTORY`; keep operator keys in a separate private directory. Never reuse test certificates or disable trust/hostname verification.
3. Populate `BLOCKOUT_SEARCH_SECURITY_DIRECTORY` privately with [config.yml](opensearch/config.yml), [roles_mapping.yml](opensearch/roles_mapping.yml), [action_groups.yml](opensearch/action_groups.yml), [tenants.yml](opensearch/tenants.yml) and that environment's [production roles](opensearch/production/roles.yml) or [preproduction roles](opensearch/preproduction/roles.yml) as `roles.yml`. Generate private `internal_users.yml` with OpenSearch's native `hash.sh`: `_meta: {type: internalusers, config_version: 2}` and `blockout_search.hash` holding the BCrypt password hash. Keep hashes/passwords outside Git. Roles grant only required search/bulk, generation, refresh and alias operations within the selected namespace, without security-admin permission.
4. Validate each infrastructure configuration with `docker compose --env-file <private-environment-file> -f infra/dokploy/opensearch.compose.yaml config --quiet`. Do not print resolved values. Dokploy Raw source must also provide the relative `opensearch/opensearch.yml` file from the same revision through native file mounts, or use its exact content in a private absolute bind mount. Pasting Compose YAML alone does not create the referenced file.
5. Demo installation/default security initialization are disabled. After environment authorization, start only `opensearch`. Initialize its fresh security index with the image's native `plugins/opensearch-security/tools/securityadmin.sh`, using one-off Compose `run --rm --no-deps`, that entrypoint and a read-only operator directory mounted at `/run/operator`. Pass `-h opensearch -p 9200 -cn blockout-<environment>-search -cd /usr/share/opensearch/config/opensearch-security -cacert /run/operator/ca.pem -cert /run/operator/admin.pem -key /run/operator/admin-key.pem`. Keep trust/hostname checks enabled. On an existing instance, inspect and back up native security configuration first: `-cd` overwrites it. Follow [official security-admin guidance](https://docs.opensearch.org/latest/security/configuration/security-admin/). The long-running service never mounts the operator key.
6. Attach and start the native serving backend after security initialization. Its startup full run creates generations and aliases. F04 T041/#351 retains actual namespace permissions, cross-environment rejection and reconstruction qualification. Static validation establishes no deployment evidence.

## Preparation and qualification

GitHub exposes `workflow_dispatch` only after the workflow exists on the default branch. Deliver through the ordinary authorized develop-to-main PR before first use. The merge starts CI, not a release.

Enable each native Docker application's deploy webhook. Store the complete secret URLs directly in GitHub Actions secrets, never in repository variables or logs:

| Secret                                        | Scope                           |
| --------------------------------------------- | ------------------------------- |
| `DOKPLOY_PREPRODUCTION_BACKEND_WEBHOOK_URL`   | Repository                      |
| `DOKPLOY_PREPRODUCTION_COLLECTOR_WEBHOOK_URL` | Repository                      |
| `DOKPLOY_PRODUCTION_BACKEND_WEBHOOK_URL`      | GitHub `production` environment |
| `DOKPLOY_PRODUCTION_COLLECTOR_WEBHOOK_URL`    | GitHub `production` environment |

Do not register an additional package-push webhook: these workflows send the native POST explicitly after routing images. No Owner API key is needed for release execution. Confirm the native deployment webhook settings for the installed Dokploy version before activation.

Configure GitHub `preproduction` and `production` environments with required human review and appropriate branch policies (`develop` and `main`). Keep prevention of self-review disabled for this single-owner workflow. Referencing an environment in YAML does not establish protection. Preproduction approval records qualification **after** deployment, so its webhook secrets are repository secrets. Production's approval occurs **before** dispatch and can protect its secrets.

Pushes and PRs run **CI** only. Run **Prepare release** manually from `develop`, selecting Server, Mobile or Both. Its selected revision is verified by CI; a newer develop revision before dispatch requires a fresh run. For server releases, the optional `previous_preparation_run_id` selects an existing qualified server candidate as the Nx comparison base. Leave it empty to build both images for the first release or when no reusable artifact remains. Nx includes shared dependencies; it is not a last-commit path check.

The workflow builds only affected backend/collector images and retains unchanged digest references from that candidate. It assembles the complete two-image set, routes changed digests to the `preproduction` tags and calls their native webhooks. An unchanged routing digest is skipped. A successful dispatch is not proof of a healthy rollout: check the actual running image identity, backend health and owner outcomes in Dokploy and the application. Complete the [qualification scenarios](../../specs/003-shared-quality/quickstart.md#delivery-and-operations), then approve the pending `preproduction` job. Its `server-candidate` artifact retains the complete digest set and source SHA for promotion. Normal GitHub artifact retention applies; expired candidates cannot be reused or promoted.

GitHub concurrency queues these workflows without cancelling an active preparation. It does not lock an asynchronous Dokploy rollout. Before starting another release, confirm the preceding native rollout and any migration have finished. Do not cancel migrations or edit application configuration while they run. If publication succeeds but a webhook fails, the routing tag may already point at the candidate: a plain workflow retry can skip it. Inspect the native record and use the application's native Deploy action for that explicit recovery after checking image/schema compatibility. No automatic recovery or SQL rollback runs.

Mobile preparation preserves the separate EAS lifecycle: preview and production builds for both platforms, with only build IDs/platforms retained. `preview` is **Blockout Preprod** with distinct package/bundle IDs; `production` retains F14's `com.blockoutproject.blockout` and existing EAS project. Set `EXPO_PROJECT_SLUG` to its actual slug in GitHub repository variables and as a plain-text variable in the EAS environments. Supply `EXPO_TOKEN` privately. F14 owns the marketing version, signing, existing remote counters and store-test qualification; do not initialize/reset counters from local defaults. Configure API/provider inputs in their corresponding EAS environments. The [native EAS lifecycle hooks](https://docs.expo.dev/build-reference/npm-hooks/) install workspace npm and regenerate ignored consumers. No OTA is configured. Qualify selected native binaries, including production identity through the native store-test channel, before preproduction approval.

## Promotion and native deployment

After the human-authorized develop-to-main PR, run **Promote release** manually from `main` with the successful qualified preparation run ID. It verifies the workflow identity/result and identical complete source trees, allowing a different merge-commit SHA only when content matches. A successful Mobile-only preparation promotes no server images. The production environment approval releases the selected operation.

Server promotion routes the complete validated backend/collector digest set to production without rebuilding. It compares against production's routing tags, so a collector unchanged in the last preproduction release is still updated if production has an older collector. Changed routing digests trigger their native webhooks. The same trigger-only status and manual runtime verification apply. Use F12 maintenance with an already usable authorized operator session when required; a green infrastructure probe is not business acceptance. Store release remains a separate explicit action in the native store consoles using the qualified production build IDs. Server and store publication are not atomic.

Liquibase transactions apply per changeSet. Earlier successful changeSets can remain when a later one fails. Inspect the actual schema/history and native logs before correction; never assume a failed release restored the previous schema. An older image can be selected only after checking its compatibility with the current schema/data. Exceptional database restoration follows the [owning restoration procedure](../operations/README.md#restore-and-rollback-scope), with compatible application images, and can lose writes after the backup. Application replacement never removes the database volume.

References: [Dokploy Docker registry](https://docs.dokploy.com/docs/core/Docker), [native Swarm settings](https://docs.dokploy.com/docs/core/applications/advanced), [GHCR webhook support in Dokploy 0.31.0](https://github.com/Dokploy/dokploy/pull/5682), [Spring Boot Liquibase startup](https://docs.spring.io/spring-boot/how-to/data-initialization.html#howto.data-initialization.migration-tool.liquibase), [GitHub environment protection](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [digest-addressed GHCR images](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
