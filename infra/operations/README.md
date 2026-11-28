# Manual operations

This guide covers application diagnosis, hosted V2 delivery and authorized business operations under the owning specifications. Use environment-owned resources and existing private provider/support tools. Each external or destructive action retains its own authorization and evidence requirements; these instructions perform none of them.

## Hosted V2 environments

[F13](../../specs/003-shared-quality/plan.md#hosted-packaging-and-delivery) owns packaging, delivery and schema lifecycle; [F14](../../specs/014-v1-v2-transition/plan.md) owns coexistence and production readiness. Use the existing Dokploy instance at `https://monitoring.blockoutproject.com`; these instructions use its v0.31.0 API contract. Recheck the installed version before configuration, without an upgrade as part of routine V2 deployment.

Use the Blockout V2 project with independent `preproduction` and `production` environments. Configure each with four Applications (`backend`, `collector`, `opensearch`, `migrations`), one native PostgreSQL resource and its persistent volumes. Production preparation does not start those resources, bind `https://api.blockoutproject.com`, replace V1 routes or activate dedicated integrations. The preproduction API is `https://api-preproduction.blockoutproject.com`.

### Configure native resources

Before provisioning or deploying, inspect current VPS memory/disk and the existing V1 service/route state. Preserve unrelated resources, volumes and intentionally stopped services. Image compilation runs away from the VPS. A prior capacity observation does not reserve resources.

Use [native Dokploy networks](https://docs.dokploy.com/docs/core/networks): an overlay per environment, attached to all five resources. The API also stays on `dokploy-network` for Traefik. Detach PostgreSQL, OpenSearch, collector and migrations from that shared network. Use their environment-owned service names for private DNS; publish no PostgreSQL/OpenSearch port. Collector still requires outbound access to Auth0 and approved source origins, so its overlay is not Docker's `internal` network mode.

Create native PostgreSQL with `postgres:18.6`, bootstrap database `postgres`, an environment-specific admin password and a named volume mounted at `/var/lib/postgresql` from the outset (PostgreSQL 18 image layout). Before first startup, mount [init-roles.sql](../postgres/init-roles.sql) through a native File Mount at `/docker-entrypoint-initdb.d/10-blockout-roles.sql`. Supply independent hosted `BLOCKOUT_MIGRATION_PASSWORD` and `BLOCKOUT_APP_PASSWORD`; local example passwords are never hosting inputs. The script creates `blockout`, its migration owner and its restricted application role. Initialization runs only on an empty volume; changing the file does not update existing roles.

OpenSearch uses `opensearchproject/opensearch:3.9.0`, one instance and an independent volume at `/usr/share/opensearch/data`. Reuse [the verified configuration](../opensearch/opensearch.yml) and [scoped roles](../opensearch/security/roles.yml), adapting cluster/node names, service DNS, certificate SAN/DN and paths to the environment. Supply certificates, private keys and native security configuration through File Mounts; keep their contents private. Preserve HTTPS verification and the backend's PEM trust bundle. Check native file/volume ownership and the documented host `vm.max_map_count` prerequisite before startup; do not weaken TLS or change unrelated services to make it start.

Backend, collector and OpenSearch each use one replica, with native `UpdateConfig.Order` and `RollbackConfig.Order` set to `stop-first` and `Parallelism: 1`. Set collector `RestartPolicy` to `Condition: on-failure`, `Delay: 10000000000` (nanoseconds), `MaxAttempts: 3`. Each process attempts registration once before scheduling; exhausted native restarts require explicit operator intervention. Migrations use one ordinary replica and `RestartPolicy.Condition: none`, with no domain or published port. Do not use `ReplicatedJob` for the current configuration contract.

Set application sources to Docker images, disable Auto Deploy and Preview Deployments, and create no webhooks or schedules. Keep a native GHCR Registry credential record with a `read:packages` classic token for the three Blockout images. For v0.31.0 Docker-source Applications, set native Docker provider `username`, `password` and `registryUrl` to that same read-only credential, and leave `registryId`, `buildRegistryId` and `rollbackRegistryId` null. Those Registry associations select output publication and would attempt a push with pull-only access; the record is an administration reference, not an Application output target. Keep credentials in Dokploy, never in image layers or Docker build arguments. Backend receives only its application-role connection and existing authorized provider inputs; migrations alone receive schema credentials. Collector receives its existing ingestion identity and environment-owned API URL, with no SQL credentials. Preserve push, external support and reporting activation state.

Configure account cleanup per backend Application using the [backend inputs](../../apps/backend/.env.example). Use the configured Auth0 Management client with `read:users` for account establishment and `delete:users` for erasure of the exact original Auth0 principal. For RevenueCat, supply the existing shared project ID and the server-only v2 customer-write key on the backend. The [Test Store SDK key](#preview-mobile) stays with the preproduction Debug preview.

After verifying erasure on the upgraded backend image, remove its obsolete cleanup-mode, Auth0 connection filter and RevenueCat customer allowlist entries. Keep the earlier settings privately for rollback to images that require them. Prepare production settings while the V2 Application remains stopped until its separately authorized startup.

For [match PDF delivery](../../specs/007-sporting-consultation/quickstart.md#match-document-cases), set the following variable once in the backend Application's existing **Environment**, preserving its other entries and build settings. For a configuration-only change, verify that the configured image matches the running revision, then save and redeploy that image. The relay checks the exact origin of the initial request and every redirect.

```dotenv
BLOCKOUT_CONSULTATION_DOCUMENTS_ALLOWEDORIGINS=https://www.ffvbbeach.org,https://dataprojectstoragewe.blob.core.windows.net
```

Verify DNS and the certificate before binding the unused preproduction host. Configure its native Dokploy domain with HTTPS/Let's Encrypt and backend port 8080. Keep the production V2 host unbound until the separately authorized first production startup. The existing V1 host and path switch at the later F14 cutover.

Preproduction collector uses the existing `BLOCKOUT_INGESTION_TIMEOUT=60s` for finite backend exchanges during calendar integration. A timeout can leave independently accepted facts with an unconfirmed passage outcome; inspect that outcome before another explicit collection. Preserve the local and prepared production values until their own qualification.

### Images and delivery

Build from the repository root with the committed lockfile, contract inputs and Maven wrapper:

```sh
docker build --platform linux/amd64 -f apps/backend/Dockerfile --target runtime \
  -t ghcr.io/blockoutproject/blockout-backend:<commit-sha> .
docker build --platform linux/amd64 -f apps/collector/Dockerfile --target runtime \
  -t ghcr.io/blockoutproject/blockout-collector:<commit-sha> .
docker build --platform linux/amd64 -f apps/backend/Dockerfile --target migrations \
  -t ghcr.io/blockoutproject/blockout-backend-migrations:<commit-sha> .
```

Replace `<commit-sha>` with the complete source commit before running. The monorepo `.dockerignore` excludes local/private files, caches and generated results; builds install locked npm inputs, bundle contracts and package Java 25 from source. API runtime contains no migration tool or migration credentials. Its existing GitHub CLI dependency does not activate external support.

[CI](../../.github/workflows/ci.yml) keeps `verify` as the checks gate. PRs run checks only. Successful pushes to `develop` and `main` publish the three private SHA-tagged images using native `GITHUB_TOKEN`, without deploying either environment. Keep GHCR package visibility private and grant the source repository Actions access when associating initially operator-published packages.

Configure GitHub environments `preproduction` and `production` with `DOKPLOY_URL`, `DOKPLOY_BACKEND_ID` and `DOKPLOY_COLLECTOR_ID` variables and a private `DOKPLOY_TOKEN` secret. IDs identify only the corresponding V2 Applications. The workflow sends native `application.update` with only `applicationId` and `dockerImage`, then `application.deploy`, preserving stored environment, Registry, mounts and domains. Responses are discarded; never print resolved configurations or secrets. An HTTP success acknowledges a queued request, not readiness or the running revision. Backend then collector requests provide no readiness barrier; the collector's native restart policy handles an ordinary initial startup failure.

Open the [Deploy workflow](../../.github/workflows/deploy.yml) in GitHub Actions and select **Run workflow**. Choose `develop` for preproduction or `main` for production. The selected branch revision must have successful push CI and all three existing SHA images. Environment branch policies enforce the same mapping; other branches and tags cannot deploy. It performs no rebuild or implicit migration/infrastructure startup. Starting production or switching V1 routes still requires the owner's separate authorization. Backend deployment never rebuilds mobile.

### First startup and explicit migration

Use the steps below for the selected V2 environment. For production, receive the preproduction qualification evidence and separate owner authorization before startup. Use the verified production revision and environment-owned resources. Verify and bind the V2 production API for the controlled candidate and reviewer checks under [F14](../../specs/014-v1-v2-transition/plan.md#cutover-and-recovery), while preserving the existing V1 service and routes.

1. Start only the selected environment’s PostgreSQL resource and verify initialization and role separation privately.
2. Set the migrations Application to the intended SHA image. Supply `LIQUIBASE_URL`, `LIQUIBASE_USERNAME` and `LIQUIBASE_PASSWORD` for the migration owner only. Deploy it once and inspect the actual task exit code: require 0 before proceeding. The image runs the existing `./mvnw -B -ntp -pl apps/backend liquibase:update` command.
3. Start OpenSearch and verify native security/TLS privately.
4. Deploy backend and verify anonymous HTTPS `GET /health` returns 200. Confirm the actual running SHA and private database/search connectivity; a deployment queue entry proves neither.
5. Deploy collector, verify its one registration and scheduler, and use the existing F01 administration/qualification mechanisms at the authorized scope. Keep preproduction to real current-season collection. Production reconstruction and the V1 transition use their separate F14 operations.

For fresh initialization and compatible incremental changes, run the matching Liquibase revision explicitly. Backend remains Hibernate validation-only. Keep preproduction data across ordinary image updates and rollbacks. The current initial Liquibase definitions create a fresh compatible database under [F13's schema lifecycle](../../specs/003-shared-quality/plan.md#runtime-data-and-consistency). When preproduction uses an earlier schema, defer image qualification until the owner decides how to prepare a compatible database and retain the data they need.

After deployment, verify current-season consultation, search, collection and internal inbox with authorized test accounts. Verify one running process per Application and data persistence through a real redeployment. A controlled collector startup failure belongs only to preproduction; inspect task attempts and ten-second spacing, then restore the valid configuration and relaunch manually. Do not inject failures into V1 or production.

After deploying a change to match document acquisition or delivery in preproduction, including a relay-origin change, use eligible matches with published references. Check the FFVB information sheet and scoresheet, and the LNV scoresheet and professional statistics. Verify that each `getMatchDocument` response is HTTP 200 with `Content-Type: application/pdf` and that each opens in a compatible mobile client. Keep response evidence private.

Before deploying a collector change that makes retained FFVB scores definitive, assess the active FFVB matches affected by [F07's result announcement rule](../../specs/011-notifications-delivery/spec.md#functional-requirements). An ordinary collection can create a first inbox entry for an existing followed match even when push delivery is disabled.

### Application image storage

Use the verified existing AWS account. V2 preproduction uses the dedicated private `blockout-preproduction-assets` bucket with Block Public Access, Bucket owner enforced, S3-managed encryption and versioning disabled. Production V1 and V2 share `blockout-assets` and `blockout-backups`. [The shared production S3 lot](https://github.com/blockoutproject/blockout/issues/1031) owns approval and verification of live policies, V1 URL and writer continuity, V2 object deletion behavior, and the existing backup and restore paths. Backup access uses a separately scoped identity. Production IAM changes and activation require separate authorization under the F14 transition.

Use a dedicated backend identity per V2 environment. Grant `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` on its bucket’s private `images/*` prefix. Before granting production access, verify that `images/` is free of V1-owned keys and that the effective S3 and CDN policies keep the new objects private. Pause the production change for review if there is an overlap or if privacy is unverified. New opaque keys use the `profiles/`, `clubs/`, `teams/` or `divisions/` subprefix. Supplier team logos use `teams/`. Provide exact `s3:GetObject` and `s3:DeleteObject` access to earlier preproduction keys outside this write scope for as long as saved references require it. Historical logos use the exact read-only exception below. Keep bucket listing and IAM administration with authorized operators. [S3 security settings](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html) and the [S3 permissions reference](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html) own the provider mechanics.

Set `BLOCKOUT_IMAGES_BUCKET` to `blockout-preproduction-assets` in preproduction and `blockout-assets` in production. Save the bucket and `AWS_REGION` in the backend Application’s private **Environment**, while the backend is stopped for production setup. For environment-based credentials, set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the authorized identity, plus `AWS_SESSION_TOKEN` for temporary credentials. The [SDK default credential chain](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html) reads those values from the backend process. For historical club-logo reads, follow [legacy club logo references](#legacy-club-logo-references).

For a shared `application_image_cleanup` warning, pause writers and reconcile the owned key inventory with current SQL references across account photos, club and division logos, and both team slots. An explicit `sporting_club.logo_bucket` marks a read-only reference even if it names the configured application bucket. Exclude those objects from V2 cleanup. Confirm the database, bucket and current references before removing a verified unattached object. Preserve uncertain associations. The [private original-account cleanup procedure](#private-account-cleanup) governs account erasure and exact-target evidence.

For the preproduction write-prefix rollout, prepare the scoped `images/*` permissions before deploying the backend. Use the existing bucket and PostgreSQL database with their saved image keys intact. Keep the running revision’s access through deployment verification and retain exact read and delete access for earlier keys still in use. Verify a new upload and read in the expected category and check that any retained fixture stays readable through its saved key. Reconcile earlier permissions after the rollback window and preserve access required by current references.

#### Preproduction image bucket cutover

1. Confirm the running backend revision, its configured source bucket, the compatible PostgreSQL database and the destination `blockout-preproduction-assets`. Retain the previous backend configuration and a compatible PostgreSQL recovery point privately. Pause backend writes and collector ingestion, then let in-flight work finish before reading the selected SQL data.
2. For the selected clean reset, initialize the current schema and verify the destination bucket is empty. Seed only the existing division’s identity and presentation metadata, the three existing accounts and their grants. Leave the division logo and account photos absent. Keep the prior database, S3 bucket and backend configuration as the reversible rollback point through qualification.
   For a cutover that retains images, select the exact owned keys in account photos, club and division logos, and both team slots. Keep explicit legacy references with their existing bucket and key. Use authorized [S3 copy operations](https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html) to copy each owned object to the identical destination key, including keys under `images/`. Verify readable bytes and media type for each before switching. Keep source objects available for recovery and keep the exact inventory private.
3. Set the backend’s destination bucket, region and scoped identity. For a clean reset, point `SPRING_DATASOURCE_URL` at the seeded PostgreSQL database. Deploy only the backend in Dokploy so the collector stays stopped during verification. Verify readiness, the selected seed and any image references included in the approved cutover through the existing authorized routes before resuming ordinary writes and collection. After a database reset, verify the ordinary startup [search reconstruction](#search-projection-and-reconstruction). Verify new uploads and reads during hosted qualification. Keep the previous bucket and compatible configuration until verification is complete.
4. To restore the previous configuration before writes resume, use its compatible PostgreSQL and S3 pair. If a reset has already accepted writes, preserve the new pair and resolve those writes before selecting a recovery point. For a bucket-only rollback after writes have resumed, pause them again and keep the current SQL associations. Copy still-referenced objects missing from the rollback bucket under their exact keys. Verify every current reference against the rollback bucket and confirm the rollback identity can serve and clean those keys before switching. Keep obsolete copies within the applicable private retention and erasure handling.

### Diagnose, renew and reset

Use Dokploy Deployments, Logs and native Docker task inspection for queue/build/pull/startup failures, exit codes and current image digest/revision. First check Registry access, environment-owned DNS/network attachments, file ownership, TLS validity and `/health`; a bounded second actual attempt follows correction of a diagnosed cause. Preserve private diagnostics locally. Do not add a readiness controller, remote monitoring stack or automatic recovery service.

For an ordinary rollback, select the prior compatible SHA image through the native Application settings and deploy with `stop-first`. Check schema compatibility first; an image rollback does not reverse schema/data changes. PostgreSQL, OpenSearch and migrations are not redeployed on every code push.

Before Registry token expiry, replace the read-only token in the native Registry record and in each Docker-source Application's provider credentials; v0.31.0 does not propagate the Registry record to those fields. Keep output Registry associations null and verify a private pull without displaying credentials. Renew the Dokploy API token and GitHub environment secret together, keeping permissions limited to the intended operator scope. Dokploy manages the public Let's Encrypt certificate; inspect its validity ordinarily. Renew private OpenSearch certificates with the same verified CA/name/permissions contract, update File Mounts and trust material, then replace only the owned affected Applications explicitly.

An exceptional preproduction reset requires an explicit owner decision naming that environment and its data. Stop only its collector/backend/migrations/OpenSearch as needed, verify the exact owned volume/resource before any deletion, and use native operations with their required confirmations. Reinitialize roles and migrate, then repeat the first-start qualification. Never delete or reset V1, production or another environment's volumes, and never treat a migration failure as reset permission.

### Preview mobile

The `preview` and `preview-test-store` profiles use the dedicated `blockout-preproduction` project (`748a9886-16a9-4166-994b-77fdaf715852`) and its EAS `preview` environment. Configure that environment with the verified hosted HTTPS API URL, the existing preproduction Auth0 inputs and the matching preproduction build inputs. Keep the `Blockout Preprod` app name, native identifier `com.blockoutproject.blockout.preproduction`, internal distribution and compatible signatures. Production uses its historical `blockoutproject` project (`10cdf86a-a81e-496a-bcaa-07c132678f6d`) and EAS `production` environment. Local development does not require an EAS project.

Run EAS commands from `apps/mobile`. `eas build --profile` reads the project selectors from the named profile before fetching remote variables. For commands without a build profile, such as `project:info` and `env:exec`, supply `APP_VARIANT`, `EXPO_PROJECT_SLUG` and `EXPO_PROJECT_ID` in the invoking shell. `env:exec` resolves the project before loading its environment. Check the resolved project with `project:info` before configuring inputs or credentials. Keep any remote project selectors consistent with those used by the shell and build profile.

Before building on the dedicated preview project, associate the existing compatible Android signing credential with the preproduction package. For iOS, use the existing Apple team, valid distribution certificate and ad hoc provisioning for the registered devices. Verify signing and the [push credentials](#sporting-push-inputs-and-failure-limits) separately. For the iOS ad hoc setup, run this command after the EAS `preview` inputs are available:

```sh
APP_VARIANT=preview EXPO_NO_DOTENV=1 \
EXPO_PROJECT_SLUG=blockout-preproduction EXPO_PROJECT_ID=748a9886-16a9-4166-994b-77fdaf715852 \
npx eas-cli@25.1.1 env:exec preview \
'npx eas-cli@25.1.1 credentials:configure-build --platform ios --profile preview'
```

After credentials are ready, use `npx eas-cli@25.1.1 build --profile preview --platform all --freeze-credentials` from a committed revision to request the Android APK and iOS ad hoc builds. EAS's official `--local` build with the same profile is available when its cloud queue delays qualification and the required native tools already exist. Reuse compatible clients and existing tools where they supply the required evidence. Keep the build IDs, exact source and private provisioning evidence in their native records. The owner tests the installed binaries on physical devices and reports sign-in, profile, consultation, search, collection and inbox results. Agents prepare builds and run automated emulator or simulator checks. Record unsupported cases and the exact build used for each native observation. Production candidates, store submission and V1 cutover follow their own procedures.

Ordinary Mac builds use the local backend from the [application setup](../../README.md#application-processes). Local sign-in currently reuses the preproduction Auth0 test registration. Deleting the local Blockout account also deletes that shared test identity in Auth0. The default local launch leaves RevenueCat unconfigured.

For end-to-end provider erasure and RevenueCat Test Store checks from the Mac, select the hosted preproduction API and its preview inputs explicitly. Build the internal `preview-test-store` development client from the same revision. It uses Debug builds, the `preview` EAS environment and the same preproduction app identity, so use a separate test device or emulator if the installed Release app must stay in place. The installed Android Debug artifact may have a different signing certificate, which needs its own verified Maps restriction if that circuit uses Maps.

```sh
npx eas-cli@25.1.1 build --profile preview-test-store --platform all --non-interactive --freeze-credentials
```

Keep `REVENUECAT_OFFERING_ID=default` in EAS `preview` and use its existing Test Store product under the [F09 setup](../../specs/006-pro-subscriptions/quickstart.md#prerequisites-and-setup). Supply the existing authorized `REVENUECAT_TEST_STORE_API_KEY` to the Metro process running the `preview-test-store` profile. Use the same source revision from `apps/mobile` and open the Metro session in the installed Debug client. With `preview-test-store` selected, Pro stays unavailable until the Test Store key is supplied.

Load the four public preproduction inputs (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_AUTH0_DOMAIN`, `EXPO_PUBLIC_AUTH0_CLIENT_ID` and `EXPO_PUBLIC_AUTH0_AUDIENCE`) from the same EAS `preview` configuration. Run hosted preview from a separate worktree with the preview values in its ignored `apps/mobile/.env.local`. Expo development bundles can read this file even when the launch sets `EXPO_NO_DOTENV=1`. Start a fresh Metro session and verify that the Debug app opens against the hosted preproduction API.

```sh
APP_VARIANT=preview-test-store EXPO_NO_DOTENV=1 \
EXPO_PROJECT_SLUG=blockout-preproduction EXPO_PROJECT_ID=748a9886-16a9-4166-994b-77fdaf715852 \
npx eas-cli@25.1.1 env:exec preview 'APP_VARIANT=preview-test-store npx expo start --dev-client' --non-interactive
```

## Owner-only action grants

Only the product owner may assign or withdraw privileged actions, through an independently authorized database connection. A delegated operator receives application capabilities only: no SQL credentials, assignment endpoint or right to redistribute grants. Confirm the environment and current deployment, verify the target privately through F05, and use its **current business UUID** (`account.id`), never an email, Auth0 subject, old UUID or inferred replacement. Keep identifiers, connection material and results private; there is no public grant ledger.

The current [backend action definitions](../../apps/backend/src/main/java/com/blockout/backend/access/domain/Permission.java) and [migration](../../apps/backend/src/main/resources/db/changelog/access.xml) own these exact values:

| Persisted `account_permission.permission` | Scope                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `maintenance.manage`                      | F12 maintenance content and activation                                    |
| `application-versions.manage`             | F12 minimum versions, messages and store links                            |
| `maintenance.bypass`                      | F12 explicit personal maintenance bypass                                  |
| `collection.manage`                       | F01 source, season and collection commands                                |
| `sporting-presentation.manage`            | F02 sporting presentation and club contacts                               |
| `sporting-classification.manage`          | F02 classification                                                        |
| `division-lifecycle.manage`               | F02 division creation and activity                                        |
| `stream-links.moderate`                   | F08 complete stream-link moderation, including publication and withdrawal |

Each grant is independent. None delegates F09 provider-console powers or F11 legal publication, which remain owner-only through their existing operations. Ordinary capabilities need no grant row and retain resource, ownership, time and quota conditions, including F08's publication window and moderation exception. No role, `isAdmin`, startup grant, owner table, grant history or delegation mechanism is involved.

Prepare one of the following short scripts in a private temporary file, then run it with native `psql`. The operator must identify an already authorized libpq connection/service; `owner_connection` below is a fictitious service name, not a provisioned account or connection string. Use protected libpq credential handling without shell tracing or credentials in arguments. The UUID and permission are fictitious examples: replace them privately after verification and choose exactly one supported value above. Preparing this runbook authorizes no real assignment.

```sh
psql -X 'service=owner_connection' -v ON_ERROR_STOP=1 \
  -v account_id=00000000-0000-4000-8000-000000000287 \
  -v permission=maintenance.manage -f /private/path/grant.sql
```

Grant (`grant.sql`):

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT id AS locked_account_id FROM account
WHERE id = :'account_id'::uuid FOR UPDATE
\gset
INSERT INTO account_permission(account_id, permission)
VALUES (:'locked_account_id'::uuid, :'permission')
ON CONFLICT (account_id, permission) DO NOTHING;
COMMIT;
SELECT EXISTS (SELECT 1 FROM account_permission
  WHERE account_id = :'account_id'::uuid AND permission = :'permission') AS granted;
```

For withdrawal, run the same `psql` invocation with `-f /private/path/revoke.sql`:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT id AS locked_account_id FROM account
WHERE id = :'account_id'::uuid FOR UPDATE
\gset
DELETE FROM account_permission
WHERE account_id = :'locked_account_id'::uuid AND permission = :'permission';
COMMIT;
SELECT EXISTS (SELECT 1 FROM account_permission
  WHERE account_id = :'account_id'::uuid AND permission = :'permission') AS granted;
```

Execute each file as one batch; do not leave a transaction open while inspecting identity or calling a provider. Native [`\gset`](https://www.postgresql.org/docs/18/app-psql.html#APP-PSQL-META-COMMAND-GSET) requires exactly one row: an absent account stops the noninteractive `ON_ERROR_STOP` script and disconnect rolls back its transaction. This also refuses a missing revoke target, rather than silently targeting a replacement. The primary key makes a repeated grant a no-op; deleting an absent association on an existing account is also a no-op. After commit, reread the association (`granted=true` for grant, `false` for withdrawal) and the current `/accounts/me` capability. An uncertain result requires this read before any explicit repeat; a prior projection or visible button authorizes no later effect.

Grant-only transactions take only the target account lock. Protected commands take domain roots first in their owner's order, then all concerned accounts in UUID order, and read grants **after** those locks; they acquire no sporting root afterward. Under [READ COMMITTED](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED), the post-lock grant statement sees a withdrawal that committed while the command waited. An admitted short transaction may finish before a waiting withdrawal; a command ordered after withdrawal is refused without effects. No remote cancellation or immediate invalidation of an already returned response is promised.

[F05 erasure](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) removes the original account and its grants, while global `access_settings` survive. Explicit recreation gets a fresh UUID with no inherited grants. An old UUID-targeted command cannot act on it; an otherwise valid same-subject token may identify the replacement only under its current rights. See [F12 T011 qualification](../../specs/013-administration-app-configuration/quickstart.md#direct-authorization-and-manual-grant-lifecycle) for the disposable-data proof and its provider/native limits.

### Prepare an operator and correct blocked settings

While ordinary access is available, have the designated operator sign in normally through Auth0 and establish the business account. Verify its current UUID through `/accounts/me`, apply only the authorized grants above, and reread the current capabilities. Verify that the operator can open the intended administration screens before activating maintenance. Use the designated test identities and isolated migrated PostgreSQL for the [local rehearsal](../../specs/013-administration-app-configuration/quickstart.md#first-environment-rehearsal). Before public exposure, follow [F14's production preparation](../../specs/014-v1-v2-transition/plan.md#cutover-and-recovery) with separate authorization and the exact production binary in its native test channel.

When mobile administration is blocked by a wrong setting, use an independently authorized connection to the confirmed environment. Inspect the current rows privately and agree the correction with the owner. Check the complete resulting group against the [maintenance](../../specs/013-administration-app-configuration/data-model.md#maintenance-settings) or [application version](../../specs/013-administration-app-configuration/data-model.md#application-version-settings) invariants before updating it. Keep the other group and unrelated fields intact. An unchanged value requires no update.

For example, to remove an erroneous iOS minimum while retaining its valid store link, review the `versions` row and pass its observed `revision` as `expected_revision` to a private `psql -X -v ON_ERROR_STOP=1` batch on the authorized connection.

```sql
BEGIN;
UPDATE access_settings
SET ios_minimum_version = NULL, revision = revision + 1
WHERE id = 'versions' AND revision = :'expected_revision'::bigint
  AND ios_minimum_version IS NOT NULL
RETURNING revision AS corrected_revision
\gset
COMMIT;
SELECT revision, ios_minimum_version, ios_store_url,
       android_minimum_version, android_store_url, message
FROM access_settings WHERE id = 'versions';
```

An absent or stale row stops the batch before commit. Reread it before any new attempt. Verify the committed correction and the single JPA revision advance, and compare the other group's state with the prior read. With a compatible client, complete a normal `/application-access` read and confirm the resulting access or remaining restriction and the operator's current allowed actions.

## Ordinary owner recovery

Use these existing owner paths after interrupted processing without resetting retained data. Confirm the local target, running revision, affected source/control/resource and current authorization. Keep original command/cycle identities and private evidence; a lost response does not prove cancellation and a cleared technical error does not prove business recovery. The [A11–A13 qualification](../../specs/003-shared-quality/quickstart.md#ordinary-owner-recovery) separates tested application behavior from native/provider evidence.

1. **Inspect acquisition and integration separately.** Follow [collection inspection and explicit recovery](#collection-inspection-and-explicit-recovery) to read the original cycle, control, source and current incarnation. Read the exact scope/stage/phase outcomes, accepted/rejected counts and latest useful success through the [F01 application diagnostics](../../specs/001-source-acquisition/quickstart.md). A successful supplier read does not prove F02 accepted it; a completed passage can contain partial failures. Retain committed items, previous values/freshness for rejected or unreadable items, and current identities. Missing terminal evidence stays uncertain. Never resend an ingestion payload merely because its response was lost.
2. **Choose an eligible ordinary pass.** The next normal F01 opportunity rereads current sources and F02 truth. An operator with current `collection.manage` may use the existing `requestCollection` action for an enabled provider control in an ACTIVE season, for that exact control under current eligibility. It returns existing running work or one pending request, not a promise of successful completion. Pause/resume does not clear an uncertain operation. If inspection requires incarnation replacement, use only the collector restart and follow-up checks in the [existing procedure](#collection-inspection-and-explicit-recovery). Closed seasons remain closed; no old observation, source edit or restart unlocks accepted bindings, restores removed classification or overrides inactive divisions. Manual corrections use the owning F02 administration action with current grants and domain validation, never a broad SQL rewrite. Inspect the subsequent affected outcome before calling the scope recovered.
3. **Catch up derivatives without rewriting truth.** Use [search projection and reconstruction](#search-projection-and-reconstruction): the serving backend's after-commit work and ordinary full run reread current PostgreSQL. A separately authorized restart of that same serving backend triggers its normal startup reconstruction. Operations expose no public rebuild endpoint or standalone reconstruction command. Preserve all usable aliases during incomplete/uncertain preparation; current SQL hydration still filters hidden, unclassified or inactive resources. Without a usable generation, search is unavailable rather than successfully empty. Observe a complete published generation and actual current searches; a targeted update, bulk envelope or reachable API is insufficient.
4. **Preserve consumed effects.** F02/F08 producers and F07's ordinary due-link pass retain `match_announcement` facts independently of personal inbox rows. Search reconstruction changes derivatives only: it neither resets those facts nor replays notification/push handoff. Keep original personal UUIDs, read state and creation times; [ordinary retention](#notification-retention-failure) removes expired rows without making announcements eligible again. Do not clear facts to repair a projection or recreate an inbox from sporting history. An ordinary rerun retains facts; F07 permits an exceptional duplicate only when a restoration genuinely lost match-level facts. Any reuse of retained data must first satisfy [current privacy, rights and expiry checks](#reconcile-before-access-or-sends), and that exception never permits expired/erased personal rows or an invented delivery confirmation. A committed announcement with a failed transient push handoff is not a pending push retry.

The owners' current state and existing private diagnostics provide the recovery evidence. There is no additional checkpoint, ledger, recovery service or lock/job protocol. Bounded initial-reconstruction launchers remain with [F01 T064–T069](../../specs/001-source-acquisition/tasks.md#phase-9-user-story-7--reconstruct-obtainable-history-through-a-bounded-operation-priority-p2); [F13 retained-data checks](../../specs/003-shared-quality/quickstart.md#current-restrictions-and-compatible-data) apply current restrictions and code/schema compatibility.

## Sporting acceptance and technical corrections

Inspect acquisition separately from the F02 response. Calendar responses retain per-reference `accepted`, `unchanged`, `stale` and `rejected` outcomes, their bounded counts and `absenceReconciled`. A partial response preserves independently committed matches; neither HTTP success nor a successful acquisition proves complete integration. `stale` means the logical observation order refused the whole item, not that its fields may fill gaps. A lost response proves no rollback and authorizes no automatic resend. Use the [ordinary owner recovery](#ordinary-owner-recovery) path.

Backend diagnostics `operation=sporting_match_acceptance`, `sporting_calendar_completion` and `sporting_fact_acceptance` retain safe scope IDs and bounded reasons. The ingestion response supplies attributable source references and item outcomes; classification Problem Details identifies current conflicting sporting scopes and may identify `conflictingResourceIds`. Keep these values and observation times in the existing private operational evidence. Never copy provider documents, contact values or raw exception messages into diagnostics. A conflict requires inspection of its actual original target; rereading cannot make an identity collision safe.

Verified aliases, division search terms and optional professional-club associations have no operator HTTP endpoint or installed CLI. Their existing storage is `sporting_club_alias`, `sporting_team_alias`, `sporting_pool_alias`, `sporting_division_term` and `sporting_team.club_id`. Use a separately reviewed, target-specific technical transaction on the already authorized environment rather than inventing a generic alias or merge command:

1. Establish exact existing UUIDs, provider, season, organizer and competition context privately. Team alias comparison follows [TeamName](../../apps/backend/src/main/java/com/blockout/backend/sporting/domain/TeamName.java): case, excess spaces and typographic apostrophes only; accents, digits, dots and hyphens remain significant. Preserve original source labels. Division terms improve search without changing classification or identity.
2. Apply the [F02 lock and integrity boundary](../../specs/002-sporting-data/plan.md#acceptance-and-concurrency) to the affected rows and check canonical-name/alias collisions before writing. Keep UUIDs, matches, participations and follows intact. An ambiguous mapping or required split/merge remains unresolved until a specific reconciliation is reviewed; do not approximate a join or apply a conflict-free subset.
3. An optional LNV team-to-club attachment changes only the verified team's `club_id` to an existing club. Preserve its native reference, season/classification, matches and follows; do not propagate the relationship to another season or infer it from names or logos. Ingestion does not own this association. Protected V1-logo recovery retains its [separate private procedure](#protected-club-logo-preservation-and-reassociation).
4. Direct database corrections emit no application projection event. After commit, use the existing [ordinary search rebuild](#search-projection-and-reconstruction) and verify current public presentation, filtered reads and unchanged identities/relationships. Do not rewrite index documents, clear announcement facts or replay ingestion to repair derivatives.

## Search projection and reconstruction

F04 uses one web-backend scheduler for after-commit scopes and full rebuilds: startup, then a configurable one-hour delay after completion. Failed/lost transient work waits for the next full run. Non-web operators never start a second writer. There is no durable queue, checkpoint, retry operation or rebuild endpoint. An authorized restart of this environment's serving backend starts the same ordinary reconstruction path; stop the old instance before starting its replacement.

Inspect private ECS `operation=search_projection`, `stage=targeted|submission|rebuild|cleanup`, `outcome`, bounded `affected_count`, safe exception `reason` and `last_success_at`. Failed bulk diagnostics use `affected_count` for submitted items and `partial_count` for explicitly successful returned items. The last-success epoch is zero before this process confirms a complete refreshed generation; targeted success never advances it. Native Micrometer `search.projection.last.success.time` exposes that epoch in seconds; `search.projection.runs` counts outcomes by bounded `action`/`outcome` through F13's ordinary application instrumentation. No query text, city/contact, credentials, raw engine error or document is collected.

Before any separately authorized cleanup or recovery, read the three current aliases using native `GET /<environment-prefix>-*/_alias`. Every club/team/pool alias must resolve to its usable generation. A response lost during `POST /_aliases` leaves an uncertain outcome: reread aliases, but an old-state read cannot prove that the switch is no longer in flight. If all three candidates are not confirmed active, retain every temporary generation until the next confirmed full run. The writer cleans only after a confirmed complete publication and a fresh metadata read, at most twelve unaliased UUID generation indexes per run in its owned namespace. If metadata cannot be read, it deletes nothing. Any index with an alias is preserved. Cleanup failure does not invalidate a confirmed generation or claim successful deletion. Never clear active indexes or delete by a broad environment wildcard.

After authoritative data changes or reconstruction, use the same ordinary search rebuild path. Verify actual current filtered searches and alias targets; an HTTP bulk envelope, scheduler run or reachable API alone does not establish usable search. Keep an affected capability unavailable where current visibility or a complete usable generation cannot be established.

## Private account cleanup

This is F05 T034's manual handling of observed private cleanup failures under the [accepted erasure boundary](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution). Use safe backend logs and existing private database, S3, Auth0, RevenueCat and support tools. Obtain authorization for the exact environment and original targets before acting. Missing access, original-target evidence or a qualified private support destination leaves the action pending. Keep diagnostics and attachments in the authorized private workflow.

1. **Locate the original failure privately.** Inspect backend `operation=account_cleanup`, `outcome=manual_attention` in the task-owned process output or its authorized private log destination. Read the original business UUID, original provider reference if present, safe reason and event time. Identify the environment from the verified private log source, then compare the original runtime configuration and revision with the private evidence. The backend still attempts deletion of the original S3 photo. Keep each provider/target outcome separate; one failure proves nothing about another attempt. Logs are not an exhaustive deletion inventory.
2. **Establish targets before any mutation.** Use the captured reference and trusted private continuity/support evidence, never an email search, identifier-format guess, alias expansion or current principal-to-account mapping as a replacement target. This schema captures the V2 UUID customer only; [F14's private inventory](#private-continuity-inventory) owns necessary historical customers, including records left after purchase transfer. A missing reference requires that owner's evidence before cleanup; do not reconstruct a deleted profile or create a mapping registry. Confirm the original issuer/tenant and RevenueCat project from the event's runtime configuration and verified evidence, rather than assuming today's defaults still describe that event.
3. **Check present use on the actual environment.** With authorized read-only database access, verify the original row is absent and whether its established principal now has another business UUID. On the verified private connection, use `psql -X --set=ON_ERROR_STOP=1`, supplying the three variables privately from established evidence:

   ```sql
   SELECT EXISTS (
            SELECT 1 FROM account WHERE id = :'original_account_id'::uuid
          ) AS original_present,
          EXISTS (
            SELECT 1 FROM account
            WHERE issuer = :'original_issuer' AND subject = :'original_subject'
              AND id <> :'original_account_id'::uuid
          ) AS principal_reused;
   ```

   If the original row exists, investigate the account/runtime inconsistency before external deletion. If a new account uses the principal, or a provider target/alias is currently used by another account, do not delete it on the old failure's authority: resolve the current situation privately with the account/provider owner. Check current provider evidence as well; an absent SQL row alone does not establish safe external ownership. If the issuer/subject is missing, leave that check unavailable until trustworthy evidence exists. These reads are observations, not locks against sign-in or provider reuse.

4. **Resolve the safe reason without replaying business erasure.** `missing_configuration` requires the environment owner to verify the intended integration, credentials/access and exact project or tenant configuration through the [existing backend inputs](../../apps/backend/.env.example). RevenueCat is skipped when neither its project nor its key is configured. `missing_target` requires established original evidence. `unsafe_scope` means that the captured Auth0 issuer differs from the configured issuer. `unavailable_or_uncertain` requires a current non-creating exact-target provider read before deciding on an explicit manual action. Keep an unavailable read or lost acknowledgment uncertain; never resend the original account DELETE to repair providers, since an absent-original DELETE has no external effects.
5. **Inspect and, only when authorized and safe, clean Auth0.** Read the exact original principal through [Management API](https://auth0.com/docs/api/management/v2/users/get-users-by-id) `GET /api/v2/users/{id}` with `fields=user_id` and `include_fields=true`, URL-encoding the established ID. Verify the returned ID and issuer/tenant. After the current-use check and specific authorization, use [Management API DELETE](https://auth0.com/docs/api/management/v2/users/delete-users-by-id) for that same original ID. HTTP **204** acknowledges removal; exact-target **404** establishes absence without another deletion. Auth0's [Apple revocation behavior](https://support.auth0.com/center/s/article/deleted-apple-users-receive-email-service-id-has-revoked-your-sign-in-with-apple-account) covers associated Apple refresh tokens; record applicable revocation evidence or its remaining uncertainty privately, without collecting tokens. Do not delete a global Google/Apple account or promise immediate invalidation of every signed token or other device's SDK state.
6. **Inspect and, only when authorized and safe, clean RevenueCat.** Use the non-creating [v2 customer read](https://www.revenuecat.com/docs/api-v2/customer#get-a-customer), `GET /v2/projects/{project_id}/customers/{customer_id}`, on the verified project and exact established original reference. Do not use SDK login or a create-if-missing read for inspection. Check current use and relevant transfer/alias evidence privately; historical records after transfer remain separate original targets only when established by F14. The backend targets the captured original business UUID directly in the shared project. Before a manual preproduction action, verify that the exact original customer belongs to the authorized test account and confirm its current use. Sandbox receipts can coexist with production receipts on a customer. Preserve replacement and otherwise current customer records. After authorization and verification, [v2 DELETE](https://www.revenuecat.com/docs/api-v2/customer#delete-a-customer) of that exact reference returning **200** acknowledges queued removal; **404** establishes absence. Trust queued acceptance without polling or repeated DELETE. Customer removal does not cancel store subscriptions, refund purchases or restore/transfer paid rights; [F09 recovery](#pro-restoration-and-assisted-recovery) owns those separate actions.
7. **Inspect the exact original photo.** For `provider=s3`, verify the recorded bucket and key against the original backend environment, the absence of the original account and the absence of any current SQL reference to the object. Use authorized AWS CLI `s3api head-object` for that exact key in the verified V2 bucket. A confirmed absence resolves this target. For a confirmed present and unreferenced object, authorize and issue `s3api delete-object` on that exact key, then verify absence. Keep access errors and uncertain acknowledgments pending. An Auth0/RevenueCat cleanup setting does not govern the V2 bucket object.
8. **Keep outcomes and necessary evidence privately.** Record only original references still required, environment/provider, verification source/time, authorized action and acknowledged/absent/uncertain result in the existing private support case. Retain minimum unresolved evidence only while its purpose remains justified under the [rights procedure](#manual-rights-and-club-contact-restrictions). Keep profiles, photos, credentials, tokens and raw provider payloads out of this record.

An interruption after local commit but before diagnostic emission can leave cleanup unreported. Handle independently discovered obligations through the same private verification, without declaring log silence complete coverage or adding an outbox, ledger, polling, replay or automated repair. Concurrent return during an in-flight provider delete retains ordinary errors and manual assistance; provider reads offer no atomic incarnation guarantee. Do not roll back business deletion, restore old data/rights or block new registration pending cleanup. Actual provider/private-case execution remains [F05 T036](../../specs/005-accounts-identity/quickstart.md#erasure-and-return); this procedure is preparation, not that qualification.

## Bounded initial sporting reconstruction

F01's `initial-reconstruction` backend profile executes one explicit operator action, then exits without HTTP adapters, provider reads or F04 scheduling. It reuses the existing F01/F02 services and collector; it adds no second writer, bootstrap permission, CLI framework or reconstruction scheduler. Use the [bounded command and isolated rehearsal](../../specs/001-source-acquisition/quickstart.md#bounded-initial-reconstruction) for exact options and evidence limits.

1. Verify the separately authorized destination, migrated database, deployed JAR, single collector and operator's current `collection.manage`. Keep connection/operator values and output private. Export the backend environment through the [existing local setup](../../README.md#local-development); do not alter reference dotenv files for isolation.
2. Run `action=prepare` for each explicitly supplied sporting start year and official provider/root/candidate URL. Reuse canonical seasons and labels. Obtain ordinary collector validation, exact seasonal confirmation when needed, and the existing F02 classification. An unavailable or unqualified archive remains a gap; no current-feed substitution or archive crawler is available.
3. Run `action=request` with exact season/source-binding UUIDs under current authorization and eligibility. Optionally supply nonempty `scopes` for an identified narrower failure. For a failed LNV team logo, select an eligible parent pool UUID under the same selected source binding; its failed LOGO coverage qualifies that pool even if calendar/standings succeeded. The ordinary pool passage may update authorized sporting facts and team images, with no discovery or unrelated-pool selection, single-image isolation or whole-source rerun requirement. Unknown options and blank retry lists are refused. After uncertainty, ordinary reads may show current pending or running work; a later explicit same-target request requires no verification read. Never assume start, replay automatically or allocate a replacement cycle blindly. First admission locks qualified references, freezes only that selection and keeps history PREPARING without activating the season. Discovery alone schedules no follow-up.
4. Read `action=report`, including every bounded coverage page. Preserve requested, obtained, rejected and unavailable outcomes independently by source/scope/stage/phase. Missing counts remain unknown; completion does not imply integration success. Targeted retry refreshes only results actually observed inside its frozen selected scope; unrelated scopes retain their gaps and successes; periodic results do not overwrite the initial report. Inspect current source qualification, original cycle and control state alongside it.
5. Have F14 review remaining gaps before any separately authorized transition decision. `action=close` requires the exact canonical label and current authorization/eligibility, is definitive, preserves history and locks, cancels unstarted work and permits only already admitted work to finish once. It changes no other season or seasonless control. An uncertain acknowledgement retains ordinary failure feedback for a later explicit same-target command without a verification-read prerequisite.

The serving backend's [ordinary complete F04 rebuild](#search-projection-and-reconstruction) covers these PostgreSQL changes; verify the resulting current filtered searches and aliases there. This command never starts an index writer. Production reconstruction, resets, source/provider changes, logo reassociation and cutover remain separately authorized F14 operations.

## Auth0 V1 default-role isolation

[F14's identity boundary](../../specs/014-v1-v2-transition/plan.md#identity-and-purchase-continuity) retains the existing `assign-default-role` client guard and exempts the V2 production mobile audience when the native registration is shared. Obtain authorization for this exact tenant/Action operation before editing or deploying it. V2 permissions remain PostgreSQL-owned; no replacement role endpoint, identity linking, credential rotation or V1 retirement is included.

1. Confirm the V1 native application's exact client ID from its current Auth0 registration and production callback identities. Record the bound Action's deployed version, runtime and dependencies, and keep a recoverable source copy privately outside this public repository. Do not open or copy secret values. Stop if another draft or concurrent revision differs from the reviewed source.
2. Confirm the new production Mobile API uses the exact audience below. Add its early return before the existing client guard, leaving the configured `V1_CLIENT_ID` reference unchanged. The retained native client is `L3AotVuEqikyNrCQexkf6S3D1LZjk69E`; reverify the target without copying secret values. Match neither a display name nor an identifier prefix.

   ```js
   if (
     event.resource_server?.identifier === "urn:blockout:v2:production:mobile"
   )
     return;
   if (event.client.client_id !== event.secrets.V1_CLIENT_ID) return;
   ```

3. Keep V1's remaining executable body unchanged. With synthetic data and controlled HTTP, verify its existing-role claim, encoded assignment request, five-second timeout, claims after assignment and login-blocking assignment failure, including absent `resource_server`. Verify the V2 audience returns with and without roles before any legacy secret, HTTP or claim access. Preserve the existing other-client guard. Auth0 documents the trusted [initiating client and resource server](https://auth0.com/docs/actions/reference/post-login/post-login-event-object) and [controlled Action tests](https://auth0.com/docs/customize/actions/unit-test).
4. In Auth0's native tester, exercise the V2 audience and retained client with and without roles, and V1 with an already assigned synthetic role. Do not send a synthetic roleless V1 identity to the real assignment endpoint: that test can perform a production write. Controlled tests establish their own boundaries, not real mobile login, renewal or population continuity. Actual V2 login and refresh must expose the expected audience boundary under F05; an absent resource server retains V1 behavior and is not proof of V2 isolation.
5. Deploy the reviewed version of the already-bound Action and verify its published version and unchanged post-login binding. Have the owner perform a real V1 sign-in with the existing application/account, then inspect the corresponding Auth0 outcome privately. Record safe version/results and remaining limits in the owning [qualification guide](../../specs/014-v1-v2-transition/quickstart.md). Full V2 native sign-in and prior-role categories remain T021-owned.
6. If the scoped change breaks V1, use Auth0's native [Version History / Revert](https://auth0.com/docs/customize/actions/manage-versions) for the recorded prior version, verify its deployed binding and repeat the affected check. Reread uncertain deployment results before repeating an operation; create no retry service or extra Action.

## Manual rights and club-contact restrictions

This is the bounded F11 [rights procedure](../../specs/004-advertising-privacy-legal/spec.md#user-story-6--exercise-my-rights-without-depending-on-an-account-priority-p1), prepared for separately authorized operations. The controller must designate an authorized operator and supply a real monitored email contact before legal publication. This repository establishes neither that contact nor access to a qualified private support destination or provider tools. If any required contact, evidence, permission or invocation tool is unavailable, keep that action pending and identify its owner; never substitute a public issue or claim execution. [T038/T039](../../specs/004-advertising-privacy-legal/tasks.md#phase-8-user-story-6--exercise-rights-without-depending-on-an-account-priority-p1) own contact/rights qualification and actual legal-content review.

1. **Receive and bound the request privately.** Accept requests without a session, including inaccessible or erased accounts. Use the operational email and the existing authorized private support process, recording receipt date, requested right, affected scope and operator. Clarify only what is needed; the [category matrix](../../specs/004-advertising-privacy-legal/spec.md#categories-purposes-and-responsibilities) owns purposes and recipients. Do not copy contact values, attachments, provider documents or personal references into this public repository, diagnostic logs or Discord.
2. **Verify proportionately before disclosure or mutation.** Establish that the requester concerns the specified data or has authority to act. Use the existing owner's verified account/provider context or necessary private supporting evidence appropriate to the request. A supplied reply address, name, club reference, account UUID or purchase claim alone proves no ownership. Do not match accounts by email, transfer identity or systematically collect identity documents. For reasonable doubt, request the minimum additional evidence and protect third parties; unavailable proof keeps disclosure/destructive action pending, without requiring a new account.
3. **Identify the actual copies and owners.** Record necessary data, purpose, authorized recipients, active/local/provider copies, applicable retention criterion and the requested operation in the existing private case. Route account/profile erasure and original Auth0/RevenueCat targets to [F05](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution), paid/gifted entitlement evidence and decisions to [F09](../../specs/006-pro-subscriptions/plan.md), and club fields to F02 below. Include F06 follows, F07 destinations/inbox, F08 contributions/moderation, F03 location, F11 local choices and F13 application diagnostics when affected. Other individuals, including match referees, receive manual review through their owner; there is no generic person suppression or directory.
4. **Execute only the authorized owner action.** Keep per-copy confirmed, pending and limited outcomes distinct. Follow [F05's erasure sequence and provider acknowledgments](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for business-account deletion and original-target cleanup; a failed recipient action remains pending. Verify original targets and current use before any separately authorized provider deletion; a replacement business UUID is never the old cleanup target. Use the safe owner diagnostics and [private cleanup procedure](#private-account-cleanup) for uncertainty. A data request neither cancels store billing nor grants a refund, subscription transfer or gift; F09 retains those decisions.
5. **Respond and retain only justified evidence.** Communicate confirmed actions, pending recipients, reasons for any limitation and next owner action through the authorized private reply channel. For GDPR requests, respond without undue delay and within one month of receipt; if complexity/number of requests justifies up to two further months, explain the extension and reasons within that first month. A refusal also explains reasons and available complaint/judicial remedies. Use the [CNIL rights guidance](https://www.cnil.fr/fr/repondre-une-demande-de-droit-dacces) and [GDPR Article 12](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) for the applicable case; these legal deadlines create no technical on-call or general ticket-response guarantee. Review necessary request/verification evidence against its purpose and remove it when no longer justified. F05 original-target references belong only in protected cleanup logs or still-justified private support handling. Notification expiry sets no other category's lifetime; this guide prescribes no hosted log-retention policy.

### Support destination configuration

Local qualification and hosted preproduction may use the same dedicated **private test repository** and private Discord channel for fictional requests. Production uses a separate private V2 support repository and its own private Discord channel and webhook. The two channels can be on the same Discord server. Verify effective repository access, including inherited organization permissions, and the channel recipients for each destination. Each repository has two pre-created, case-insensitively distinct intake labels.

Set the five Spring properties under `blockout.support.destination` in the private backend launch environment for local runs. On Dokploy, set them only on the backend application for the corresponding environment. Set `BLOCKOUT_SUPPORT_DESTINATION_REPOSITORY`, `BLOCKOUT_SUPPORT_DESTINATION_INCOMPLETELABEL`, `BLOCKOUT_SUPPORT_DESTINATION_COMPLETELABEL`, `BLOCKOUT_SUPPORT_DESTINATION_GITHUBTOKEN` and `BLOCKOUT_SUPPORT_DESTINATION_DISCORDWEBHOOK` together. The fixed settings select the case destination and private Discord webhook. The request-list link derives from the repository.

Apply the five settings to the shared preproduction backend in Dokploy only after T041 passes against the isolated local backend and private test destination. Keep environments accepting real requests unconfigured until qualification passes and activation is separately authorized. The [local CLI setup](#local-support-attachment-cli) owns binary and credential delivery.

Use a fine-grained PAT restricted to that repository. GitHub documents **Issues: read and write** for [issue creation/update/read](https://docs.github.com/en/rest/issues/issues) and [intake-label changes](https://docs.github.com/en/rest/issues/labels). Uploads additionally require the token's user to have repository push access: the [CLI documentation](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli) and [2.102.0 attachment client](https://github.com/cli/cli/blob/v2.102.0/internal/attachments/client.go) accept `WRITE`, `MAINTAIN` or `ADMIN`, rejecting `READ` and `TRIAGE`. GitHub App installation tokens are unsupported for this selected upload path even though the REST issue API accepts them. Issue creation alone proves neither attachment rights nor complete intake; establish the minimum effective PAT permissions with actual uploads in the [private-provider matrix](../../specs/012-reports-feature-suggestions/quickstart.md#private-provider-qualification-matrix), without broadening repository selection or asserting an untested permission set works.

The responsible repository owner controls handler access and the server credential; the controller designates personnel for the support purpose under the rights procedure above. Verify the private Discord channel's recipients separately. Application administration grants no repository or webhook access, and support access delegates no sporting, identity or Pro operation. This guide configures no destination and activates no real support service.

### Private support intake and replies

Use [F10's existing private intake](../../specs/012-reports-feature-suggestions/plan.md#complete-submission-and-provider-boundary) and the [F11 support privacy cases](../../specs/004-advertising-privacy-legal/quickstart.md#support-privacy-cases). Before real use, qualify access to the private destination and its attachments through the [F10 prerequisite checks](../../specs/012-reports-feature-suggestions/quickstart.md#prerequisites).

1. **Check access and purpose.** Use only the configured private support repository and personnel authorized to handle the request. Verify both GitHub repository access and access to actual attachment bytes; a rendered image or file URL is no authorization proof. Application administration grants no GitHub/file permission, and repository access grants no F02/F05/F09 intervention rights. Consult only the content/files needed to understand and answer the case. Keep requests, addresses, private case/file URLs, attachments and credentials out of public issues, this repository, diagnostics and Discord. Discord contains only the configured generic signal and private request-list link. Do not export request data to a parallel case store or independent backup.
2. **Distinguish intake from handling.** Inspect the current case, its configured intake labels and every selected attachment through the authorized private tools. Text-only intake may be complete directly; image intake is complete only after all files and complete marking succeed. An incomplete label, both intake labels, absent marking or uncertain/missing files is not a finalized request. GitHub labels distinguish incomplete and complete intake from the ordinary open/closed handling lifecycle. Do not infer receipt from a Discord message, issue creation or a submitter's screenshot of confirmation.
3. **Handle incomplete or exceptional duplicate attempts manually.** Leave incomplete attempts recognizable and private; preserve their successful attachment references without overwriting the body. Do not mark them complete, replay uploads, silently omit a file or treat them as accepted work. Inspect available evidence in the existing private cases and close an incomplete attempt as such when appropriate. A response can be lost after real acceptance; a later explicit send can therefore leave another case, possibly with corrected content and a different request UUID. Compare only necessary content/context/files to establish an exceptional duplicate, preserve distinct or corrected information in its existing case, and close only the redundant case manually. Shared email alone proves neither duplication nor ownership. Do not add automatic matching, a receipt search service, retry worker or recovery ledger.
4. **Reply to the supplied address.** Use the request's `replyEmail` for necessary handling and response, not marketing or advertising. Format validation and prefill prove neither mailbox possession nor deliverability. Limit the reply to the request and withhold third-party/private account information until the proportionate verification above permits disclosure. Account and entitlement actions require their own verified authority. Continue necessary exchanges through the authorized email channel; no automatic acknowledgement, application dialogue/status, guaranteed ordinary response time or promise to implement a suggestion is added. Close the issue manually after handling. If only the generic secondary alert failed after complete receipt, investigate the safe operational signal without requesting another submission.

### Local support attachment CLI

The host-run backend resolves `gh` through the `PATH` inherited when its JVM starts. Use the [official GitHub CLI 2.102.0 release](https://github.com/cli/cli/releases/tag/v2.102.0), without replacing another task's global CLI. From this worktree's repository root, this macOS arm64 example installs an isolated copy in ignored `local/` and verifies its published checksum:

```sh
support_cli_dir="$PWD/local/tools/gh-2.102.0"
mkdir -p "$support_cli_dir"
curl --fail --location --connect-timeout 10 --max-time 120 \
  https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_macOS_arm64.zip \
  --output "$support_cli_dir/gh_2.102.0_macOS_arm64.zip"
curl --fail --location --connect-timeout 10 --max-time 60 \
  https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_checksums.txt \
  --output "$support_cli_dir/gh_2.102.0_checksums.txt"
(
  cd "$support_cli_dir" || exit 1
  awk '$2 == "gh_2.102.0_macOS_arm64.zip" {print}' gh_2.102.0_checksums.txt > selected-checksum.txt
  test -s selected-checksum.txt && shasum -a 256 --check selected-checksum.txt && \
    unzip -oq gh_2.102.0_macOS_arm64.zip
)
export PATH="$support_cli_dir/gh_2.102.0_macOS_arm64/bin:$PATH"
command -v gh
gh --version
gh issue edit --help
```

For another host, select that host's archive from the same official release and verify its matching checksum before extraction. Check that the resolved executable is the isolated copy, `gh --version` reports `2.102.0`, and `gh issue edit --help` exposes `--attach`. Start the task-owned backend or its Maven checks from this same environment; changing a later shell's `PATH` does not update an already-running JVM. The [local backend workflow](../../README.md#local-development) remains the launcher, with no support service, deployment image or durable upload volume added.

Supply the isolated qualification destination and its repository-scoped token through private Spring external configuration only under T041’s separate authorization. Follow the [destination configuration boundary](#support-destination-configuration) before accepting real requests. `GitHubAttachmentProcess` passes the token as `GH_TOKEN`, fixes `GH_HOST=github.com` and disables prompts; the [official environment documentation](https://cli.github.com/manual/gh_help_environment) describes credential precedence. Never put credentials in arguments or a shell command history, or print the process environment. Controlled checks use fictional credentials and do not contact a real support destination.

The committed support settings bound HTTP connection/read waits to 3/5 seconds and the CLI completion wait to 30 seconds. The adapter then allows one second for normal child termination and five for forced exit before allowing temporary-input cleanup. These process limits also bound a stalled CLI network operation; the REST client uses its own HTTP waits, disables automatic retries and refuses redirects. A nonzero result, timeout or interruption refuses complete receipt even when private partial effects may exist. The CLI's documented partial-upload behavior is not a rollback guarantee.

Run the [F10 controlled qualification](../../specs/012-reports-feature-suggestions/quickstart.md#complete-receipt-backend) before delivery. Existing `GitHubAttachmentProcessTest` exercises a real controlled Java child, environment credentials, separate arguments, all five private originals, bounded wait/termination and cleanup; `GitHubSupportClientTest` exercises real loopback HTTP waits and refusal of redirects. A `--version`/`--help` check verifies the installed official binary and attachment command availability only. Neither those checks nor the controlled child establish actual CLI uploads, repository permissions or attachment confidentiality; those remain the separately authorized private-provider qualification.

### Apply an authorized club-field restriction

The existing [F02 application operation](../../apps/backend/src/main/java/com/blockout/backend/sporting/application/service/RestrictClubContacts.java) is `RestrictClubContacts.restrict(UUID, Set<ContactField>)`. It is a trusted Spring transactional bean method, **not an HTTP endpoint or an installed operator CLI**. Prepare a separately reviewed, environment-specific invocation of this existing bean with the authorized backend operator; this guide supplies no production launcher. Without a safe approved invocation, leave execution pending. Do not instantiate the service directly, bypass its Spring transaction with SQL, or use ordinary contact editing as erasure.

1. Confirm the private request's exact established club UUID and affected fields: `ADDRESS`, `CITY`, `POSTAL_CODE`, `EMAIL`, `PHONE`, `WEBSITE`. Resolve ambiguity privately; preserve the club, teams, matches, other fields and their history. Read current contact state with `GET /administration/clubs/{clubId}/contacts` under the existing `sporting-presentation.manage` grant. Keep the response private and retain exact-scope evidence rather than an archive of forbidden values.
2. Invoke the existing bean once for the approved set, for example `contacts.restrict(verifiedClubId, Set.of(ContactField.EMAIL))`, where `contacts` is the Spring-managed bean and `verifiedClubId` comes from the verified case. F02 locks the club before reading current values, clears both source and manual columns, retains the durable field restriction and current mode. Repeating an already applied restriction is a no-op. Effective municipality/postcode changes also invalidate coordinates and advance locality revision through F02; do not reimplement those rules. Its existing after-commit change event covers affected projections.
3. Confirm commit and reread **current** state. Verify restricted source/manual/effective values are absent in the administrative response and `GET /clubs/{clubId}` public projection; unrelated fields and sporting identities remain intact. With authorized database read access, verify physical clearing as well, selecting only the necessary booleans. For the email example, on the verified environment's private connection, `psql -X --set=ON_ERROR_STOP=1` can execute:

   ```sql
   SELECT email IS NULL AS source_cleared,
          email_manual IS NULL AS manual_cleared,
          email_restricted AS restriction_retained
   FROM sporting_club WHERE id = :'club_id'::uuid;
   ```

   Set `club_id` privately to the verified UUID. Require exactly the expected club and all three booleans true. Check the equivalent mapped columns for the actual affected fields. A failed/uncertain write requires current inspection, never an assumed rollback or blind replay. If projections or derivatives cannot be verified, keep affected exposure unavailable for owner resolution.

4. Recollect and exercise ordinary editors only with synthetic cases in an authorized test environment. An older manual correction cannot restore a currently restricted value: a prohibited manual value returns the existing conflict atomically, including any accompanying unrelated edit. `source`/`hidden` mode changes cannot lift the restriction. Source unavailability, renewed collection, reidentification or priority-source publication never restores permission. [F11's prepared cases](../../specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes) identify the automated boundary and remaining real-consumer qualification.
5. Record only the necessary decision, field set and verified current outcomes privately. Do not lift flags through ordinary editing. A later lifting decision needs separate manual authorization and owner review; this operation implements no lifting path. After a restore/reconstruction, use the [current-state reconciliation](#reconcile-before-access-or-sends) before access, derivatives or sends; a copy predating the flag requires reapplication, and uncertainty keeps affected resources closed.

## Reconcile before access or sends

Apply current business restrictions whenever retained or reconstructed values are considered for use. The [F13 application checks](../../specs/003-shared-quality/quickstart.md#current-restrictions-and-compatible-data) use disposable data and current owner operations; no infrastructure restoration procedure is defined here. Row counts, image URLs and successful `/health` alone establish neither current rights nor usable reconstructed content.

- **F05/F06/F12:** reconcile current accounts, subject-to-UUID associations, follows, erasures and distinct application grants/settings. An older revoked permission or erased account must not regain access. Follow [F05 erasure and return](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution): a replacement account receives no deleted profile, follows, grants or gifts; do not merge by email or target a replacement UUID for original-account cleanup. Preserve accepted token-validity and private-log evidence limits; there is no exhaustive deletion ledger.
- **F09/F11:** verify current identity and RevenueCat rights through their [owning rules](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity), including gift expiry/revocation. A database value does not restore a purchase, cancel billing or prove entitlement. Unknown current-account rights remain unknown under the SDK's accepted behavior. Current [privacy restrictions](../../specs/004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy), including suppressed sporting contacts and affected images/attribution, still apply.
- **F07:** before affected reads/counts/sends, exclude inbox entries aged at least **29 elapsed days**, preserving original creation times and available nonpersonal match-announcement facts. Physical purge and current erasure/privacy/rights reconciliation follow the [owning retention rules](../../specs/011-notifications-delivery/spec.md). Missing current evidence keeps affected access/sends unavailable. Apply current account/destination/follow restrictions. The exceptional duplicate allowed by F07 if old match facts are unavailable permits neither erased/expired personal rows nor replay of uncertain or maintenance-suppressed pushes.
- **F04:** rebuild derivatives from current authoritative PostgreSQL through the [owning startup/full-rebuild path](../../specs/008-search-discovery/plan.md#projection-lifecycle). Verify complete alias replacement and current visibility before using search; incomplete work retains usable prior results or an explicit unavailable state. Collection reconstructs only what suppliers still publish, not missing customizations, image bytes or history.

Application code must remain compatible with its current schema and data. Replacing a binary does not reverse data changes. Use the existing schema-validation and explicit Liquibase boundaries under [F13’s current schema posture](../../specs/003-shared-quality/plan.md#runtime-data-and-consistency); neither an incompatible version nor an unresolved right may bypass current checks.

Use existing private provider/support tools for authorized manual resolution. Missing current evidence keeps the affected capability unavailable without introducing a recovery service, effect ledger or automatic replay.

## Notification retention failure

For `operation=notification_retention`, inspect safe stage, outcome, count and reason fields in the local backend's structured output. A missed, interrupted or `incomplete` pass is a retention failure, including physical rows remaining beyond age 30; it grants no longer lifetime. Preserve committed removals. Reads/counts continue excluding age 29 while physical removal is pending.

Verify the exact local target/backend revision, actual UTC daily cron, task-owned process, database connectivity, application DELETE permission and relevant lock/resource failures. Retain only necessary safe type, time and counts. Correct the demonstrated cause through its owner while preserving nonpersonal match facts, original dates and independently necessary installation/follow associations. Do not recreate personal rows or replay announcements/pushes.

The next ordinary daily pass starts again from due rows; there is no immediate retry timer or user-facing purge endpoint. Persistent failures use authorized manual handling. The existing Spring-managed `PurgeNotifications.run()` is an internal operation, not an HTTP route or installed operator CLI. Any earlier explicit corrective invocation needs a reviewed target-specific invocation of that bean; do not instantiate it directly or replace its transactional boundary with ad hoc SQL. Verify completed cleanup and [current restrictions](#reconcile-before-access-or-sends) for the affected data; a completed process or silence alone proves no recovery.

## Protected club-logo preservation and reassociation

This is F14 T028's preparation and T030's local rehearsal procedure. [F14 T029](../../specs/014-v1-v2-transition/tasks.md#phase-5-user-story-3--rebuild-data-without-losing-protected-elements-priority-p1) owns actual private preservation and F02 A39 reassociation qualification. Actual V1 access, administrator freeze, source copy, reconstruction and live reassociation require separate operation-specific authorization under F14. This procedure authorizes none of those operations. Use only a verified isolated target and synthetic files for a rehearsal. The [F14 model](../../specs/014-v1-v2-transition/data-model.md#protected-club-logo-association) owns preservation outcomes; [F02](../../specs/002-sporting-data/plan.md#presentation-administration-and-locality) owns image validation, storage and inheritance.

### Prepare the private preservation copy

The private preservation copy contains the exact FFVB club identifier string, original logo reference and its usable bytes. Do not convert identifiers to numbers, trim meaningful leading zeros or infer identity from club names. For example, synthetic `000339`, `339` and `0000339` are different references. Do not use a spreadsheet import that changes those strings. Other V1 names, contacts, team/division artwork and presentation customizations are outside this copy.

1. Before an authorized source copy, identify the exact source/environment and all affected manual club-logo associations. The sole administrator freezes manual logo edits, settles relevant in-flight writes and verifies that the **deployed** collector preserves the protected associations before collection continues. A repository test cannot establish that deployed behavior. Keep the source intact while any prerequisite is unresolved.
2. Through the authorized source's ordinary read/export and file-download tools, copy every affected original association and actual file to the existing private operational location, independently of the source to be destroyed. Retain its exact string club reference, original logo reference, corresponding file path and source/observation time together. Use private access and restrictive file permissions (`umask 077`); keep identifiers, files and diagnostics out of Git, issues and PR attachments. No generic exporter, migration ledger or second application image store is needed.
3. Reconcile **every** source association with its preserved record and readable file, and every copied file with its association. Compare byte lengths and SHA-256 digests against the original read, then actually decode each copied image; a matching checksum, URL, HTTP success or file extension alone does not prove usability. F02 accepts actual PNG/JPEG content up to 5,242,880 bytes and 4,194,304 decoded pixels, preserving accepted original bytes. Missing, empty, corrupt, unsupported or oversized content is not ready for F02 reassociation; retain the original and resolve the affected case privately instead of silently transcoding, replacing or dropping it.
4. Lost/missing associations or unusable bytes mean **preservation is incomplete; block the destructive action affecting that source**. A complete usable association with no certain rebuilt target stays private and identifiable for manual resolution. If two preserved associations conflict for one exact reference, retain both and resolve their provenance before applying either; do not choose by name, list order, latest file timestamp or numeric conversion. Record the affected blocked operation privately, with only safe scope/outcomes in F14 quickstart.
5. Confirm the freeze still holds before using the copy. An exceptional edit refreshes and reverifies only its affected association/file. Elapsed time alone requires no full recopy. This freeze does not freeze purchases, erasures or privacy obligations: apply the [final current-state reconciliation](#final-current-state-reconciliation) before the separately authorized destructive/opening action. Retaining artwork does not permit republication against a current restriction.

### Reassociate through the current F02 owner

Use the authorized target's existing private database connection and current operator token. Verify host, port, database and user before reads or writes. The `blockout-logo-target` libpq service below is an explicitly prepared **isolated** connection for rehearsal, not an instruction to reuse a live service. Keep output private and shell tracing disabled. Select one preserved reference without normalizing it; use its corresponding verified file, never an arbitrary URL fetch by the backend.

1. Resolve **only** the exact FFVB reference using the existing database read tools. For example, with `FFVB_CLUB_REFERENCE` supplied as a string:

   ```sh
   PGSERVICE=blockout-logo-target psql -X --set=ON_ERROR_STOP=1 \
     --set=ffvb_reference="$FFVB_CLUB_REFERENCE" <<'SQL'
   SELECT id, provider, reference
   FROM sporting_club
   WHERE provider = 'FFVB' AND reference = :'ffvb_reference';
   SQL
   ```

   Proceed only with exactly one certain target and one resolved preserved association. Zero matches: retain the association/file privately; do not create a club. Multiple or contradictory candidates: stop the affected reassociation and resolve privately. The normal V2 schema prevents duplicate `(provider, reference)` clubs through `uk_club_identity`; do not drop that constraint to import ambiguous data. A similar name, another provider's native ID or a matching seasonal team label supplies no club identity.

2. With that UUID in `CLUB_ID`, read `GET /administration/clubs/{clubId}/presentation` using the current operator's `sporting-presentation.manage` grant. Prepare metadata from the **target's current** manual name, including explicit null. This preserves current V2 naming and transfers only the protected club logo. Use fresh absolute private paths for `CURRENT_PRESENTATION`, `LOGO_METADATA`, `SAVED_PRESENTATION` and `VERIFIED_LOGO`; `PRESERVED_LOGO` is the corresponding verified original file. `BACKEND_URL` and `OPERATOR_ACCESS_TOKEN` must belong to that same authorized target.

   ```sh
   curl --fail-with-body --silent --show-error \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --output "$CURRENT_PRESENTATION" \
     "${BACKEND_URL}/administration/clubs/${CLUB_ID}/presentation" &&
   jq --exit-status '{manualName: .names.manualName, logoAction: "replace"}' \
     "$CURRENT_PRESENTATION" > "$LOGO_METADATA"
   ```

   Inspect each native command's exit status and the read identity before continuing; never submit an error body or metadata for another target. The [canonical F02 editor](../../contracts/http/mobile/sporting/paths.yaml) requires all metadata fields and an image part for `replace`. Current account permissions still govern the operation, including under maintenance; a former V1 role or M2M token grants no permission.

3. Submit the existing atomic multipart editor operation, then reread the effective club image. The public image read is subject to F12 maintenance admission: the explicit bypass header below requires the current `maintenance.bypass` grant while maintenance is active. Presentation-management permission alone supplies no bypass; keep access closed if that read cannot be authorized:

   ```sh
   curl --fail-with-body --silent --show-error --request PATCH \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --form "metadata=@${LOGO_METADATA};type=application/json" \
     --form "image=@${PRESERVED_LOGO}" \
     --output "$SAVED_PRESENTATION" \
     "${BACKEND_URL}/administration/clubs/${CLUB_ID}/presentation" &&
   curl --fail-with-body --silent --show-error \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --header "Blockout-Maintenance-Bypass: true" \
     --output "$VERIFIED_LOGO" \
     "${BACKEND_URL}/clubs/${CLUB_ID}/logo" &&
   cmp "$PRESERVED_LOGO" "$VERIFIED_LOGO"
   ```

   F02 checks current grants before decoding and again in the write transaction, validates actual bytes, uploads them to the environment’s private S3 namespace and commits their reference with the presentation in PostgreSQL. A refusal leaves the previous presentation intact. A failed/lost write keeps its original target and prepared file for a later explicit action, without a verification-read prerequisite or automatic replay. Current domain conflicts still refuse without partial effects; a normal read proves only current state, not which historical request ran.

4. Verify the returned target/manual-logo association, unchanged names and byte-for-byte content; decode the downloaded image too. Check dependent FFVB teams through the ordinary read operations: they inherit current club artwork across seasons without copied team bytes, while an independent manual team image retains precedence. Professional teams use their existing contextual LNV identity and optional controlled club relationship; **never create or propagate a club relationship** during logo reassociation. A clubless professional team with a similar name/native reference stays clubless and receives no recovered club logo.
5. Keep unmatched/conflicting associations and files privately attributable until their owning resolution. Report exact-match success, pending association and incomplete preservation separately. This rehearsal does not authorize source destruction or prove a live inventory/freeze, actual deployed collector safety, full reconstruction, native rendering or release acceptance. F14 retains those business-continuity and qualification conditions.

### Legacy club logo references

For a protected original in `blockout-assets`, [#345](https://github.com/blockoutproject/blockout/issues/345) associates its verified original bucket and key with the exact rebuilt FFVB club and preserves the V1 URL. The private preservation copy and full decoded-byte verification above still apply. [The shared production S3 lot](https://github.com/blockoutproject/blockout/issues/1031) owns separately authorized `s3:GetObject` access on the selected legacy object ARNs. The production backend’s writes and deletes are scoped to `images/`. Reuse an isolated preproduction-owned synthetic fixture with exact-object read-only access. A fixture may share the preproduction application bucket when its key is outside the backend’s owned namespace.

After confirming the file's media type, digest, exact target and current restrictions, pause target writes and use the authorized private PostgreSQL connection. Publish only the verified association. The conditions below protect a newer V2 logo and require the already resolved UUID and exact string reference. Treat a zero-row update as unresolved.

```sql
UPDATE sporting_club
SET logo_bucket = :'verified_bucket', logo_key = :'verified_key',
    logo_media_type = :'verified_media_type', logo_sha256 = :'verified_sha256'
WHERE id = :'club_id'::uuid AND provider = 'FFVB' AND reference = :'ffvb_reference'
  AND logo_key IS NULL
RETURNING id;
```

Bind those values with native `psql` variables. Reread the club and an inheriting team through the existing APIs and compare the returned bytes with the verified original file. Keep `logo_bucket` explicit for the protected association, even when it matches the configured bucket. Replacing or removing the association in F02 leaves the original object intact. Keep any disagreement, missing object or previous target logo private for resolution under F14.

### F13 protection handoff to F14

F13 T059–T061 supply the [controlled A22 verification](../../specs/003-shared-quality/quickstart.md#protected-logo-handoff); F14 retains ownership of the actual protected population, preservation and transition. Follow [private-copy preparation](#prepare-the-private-preservation-copy) and [F02 reassociation](#reassociate-through-the-current-f02-owner) above rather than creating another export/import path.

The operator handing over the set records its source/environment and observation time, exact expected association scope, private copy location, every association/file comparison and decoded usability, certain target matches, unresolved associations/conflicts and missing/unusable files. The receiving F14 operator checks that this evidence covers the operation's actual source and every protected association, that the copy remains usable independently of that source, and that freeze/deployed-collector and current-obligation prerequisites still hold. Keep exact references, files and diagnostics private; publish only safe scope, outcomes and limits.

A certain target may receive only its corresponding verified original through the F02 editor or the scoped [read-only reference](#legacy-club-logo-references), under current permissions and domain validation. Unmatched or contradictory associations and their usable files stay private for manual resolution without an invented club, name-based match or professional-team link. Missing/unusable bytes or associations mean incomplete preservation and block the destructive action affecting that source; a URL, storage availability, test success or completed handoff cannot waive this refusal. This transfers verification evidence, not authorization: F14's live copy and later reconstruction/reassociation remain separately authorized operations. The local synthetic A22 rehearsal establishes only its controlled set; actual V1 logo preservation still requires the authorized F14 operation and its own evidence.

## Private continuity inventory

This section implements [F14 T018](../../specs/014-v1-v2-transition/tasks.md) continuity preparation. Actual population reconciliation and final current-state checks require operation-specific authorization under F14. Neither this guide nor completion of its preparation authorizes source/provider access, a population export, reset or retirement. The [recorded V1 observations](../../specs/014-v1-v2-transition/research.md#current-v1-evidence) are dated inputs, not a current inventory or new qualification.

### Establish scope and private evidence

1. Before inspection, obtain specific authorization for the source environments, provider accounts, operator and private destination. Identify the proposed destructive operation and the sources it would remove. Keep all personal references, association evidence and unresolved cases outside this public repository, issues, PRs and public logs; use existing restricted operational/support handling under F10/F11. Do not copy credentials, receipts, complete provider payloads or profiles into the inventory.
2. Establish the complete affected population from the authorized current sources and provider records. Include subscribers and the identities needed for access, historical customers relevant to erasure, anonymous aliases and any manual beneficiaries; do not limit discovery to active subscriptions or familiar identifier formats. Follow the available source/provider enumeration through its complete scope, including pagination where applicable, and reconcile references in both directions. For each category below, establish whether it is present, demonstrably absent or unresolved. A sample, dashboard total or unexamined page is insufficient to declare coverage; inaccessible scope remains a gap.
3. For each indispensable association, verify its actual beneficiary and how it will remain discoverable after the proposed destruction. Prefer reliable retained provider records. Demonstrate reconstruction while the original source remains available; merely expecting a provider to retain a reference is insufficient. Privately preserve only indispensable historical references not reliably retained by providers: original principal/customer references, beneficiary evidence and current scoped erasure obligations. Keep only the minimum attribution needed to resolve ambiguities, with the source, observation time, purpose and affected operation. This is no mandatory full-population mapping export, second identity store or durable erasure ledger.

| Category to reconcile                                 | Required determination before its source can be destroyed                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 principal and linked secondary identities       | Existing Google/Apple methods, including linked methods with different addresses, still resolve to their retained principal. Verify necessary address-resolution evidence under F05. Distinct unlinked principals sharing an email remain distinct; missing usable email follows F05 retry/assistance and cannot be repaired by inventing a link.     |
| Original, current and historical RevenueCat customers | Explain necessary principal/customer/purchase relationships and the recognized beneficiary, including historical records left after a transfer. Do not infer ownership from an identifier's format or assume a one-to-one mapping. Retain the existing project/products/entitlement; the new V2 business UUID does not erase old customer references. |
| Relevant anonymous aliases                            | Explain their association with actual purchases and beneficiaries, or identify the unresolved dependency privately. Anonymous references are neither automatically disposable nor sufficient proof of a beneficiary. No automatic alias rewrite, receipt replay or restoration is introduced.                                                         |
| Paid and manual beneficiaries                         | Establish current validity and restrictions for independent rights under F09. Recheck the owner's reported absence of V1 gifts against the actual population. If gifts exist, preserve their recognized beneficiary and validity; purchase transfer does not transfer a gift. An absent population needs no gift-migration mechanism.                 |
| Scoped erasure and privacy obligations                | Use available authorized original-account/customer references, including historical targets and existing private support cases. Identify current restrictions and unresolved original-target cleanup under F05/F11; a reset does not erase those obligations or permit old personal data to return.                                                   |

[F05](../../specs/005-accounts-identity/plan.md#continuity-operations-and-limits) owns identity-preserving recreation: retain principals and links, establish a fresh V2 business UUID, and copy no old profile, follows, inbox or permissions. [F09](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity) owns applicable rights, explicit paying-store restoration, accepted receipt-wide transfer and verified assisted cross-store recovery. The inventory is evidence for those owners, never a grant, identity merge or automatic restore. Migration alone neither deletes a RevenueCat customer nor ends a valid gift.

Voluntary deletion follows [F05 erasure and manual resolution](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution). For this inventory, retain only justified original-target references and verify their environment and current use before any separately authorized cleanup; never target a replacement UUID or match by email. Available private diagnostics cannot establish exhaustive erasure coverage: interruption after local commit but before logging can leave cleanup unreported. Apply F05's cleanup and concurrent-return rules without restoring deleted personal data, grants or gifts.

Keep evidence only while needed for its authorized purpose under [F11](../../specs/004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy); use [F05's retention and private-support rules](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for cleanup diagnostics and unresolved cases. This adds no universal retention period or public copy of a private case. Preservation never authorizes restoring erased data or extending expired rights.

### Destruction gates and handoff

Before each affected destruction, the authorized operator must establish all of the following:

- Complete coverage of every category actually present, with each indispensable association retained or its reliable reconstruction demonstrated. Identify any missing/contradictory reference, uncertain beneficiary or inaccessible source privately and name the exact destructive operation it blocks. Preserve that source until resolved; later restoration promises and onboarding help do not lift the block.
- Actual continuity qualification for the affected categories, separately on Apple and Google, under T021/T022 and [A07–A15](../../specs/014-v1-v2-transition/spec.md#user-story-2--recover-entitlements-and-preserve-continuity-evidence-priority-p1). Population coverage does not prove sign-in, native restoration/transfer or assisted recovery; successful sampled native cases do not prove population coverage. Unqualified necessary outcomes remain blocking.
- Protection of any club logos affected by the same operation under the [logo-preservation owner](../../specs/014-v1-v2-transition/plan.md#protected-logos-and-sporting-reconstruction). Every association needs its exact FFVB string reference, original URL and independently usable file. Missing/unusable bytes block destruction; a preserved association without a certain rebuilt club match remains private for resolution, with no name-based or guessed professional-team match.
- The current-state check below, including accepted effects and current privacy restrictions. Retained evidence is not permission to reintroduce prohibited data.

Record coverage, supporting evidence and unresolved cases in the existing private operational process. Report only public-safe scope, outcomes, evidence limits and the affected blocked operation in [F14 quickstart](../../specs/014-v1-v2-transition/quickstart.md) without claiming that preparation executed the live operation. Do not attach identifiers or private diagnostics. A cleared preservation gate permits consideration of the separately authorized action; it does not establish both-store availability, effective V1 retirement or authorization to open V2. Those remain in the [release sequence](../../specs/014-v1-v2-transition/plan.md#cutover-and-recovery).

## Final current-state reconciliation

This is the T024 preparation required **immediately before separately authorized retirement**, and before any destructive operation could lose protected evidence. Check current purchases/revocations at cutover; the logo-edit freeze does not freeze provider state. Use the initial inventory/copy's source and observation time to review changes through the contemplated transition, not merely through the last rehearsal.

1. Reconfirm operation-specific authorization, private evidence access and the inventory's coverage. Add newly present categories or associations and resolve changed dependencies using the inventory method above. If evidence cannot cover the interval since preparation, keep the affected source intact and action blocked; do not infer absence of change from absent events or logs.
2. Before separately authorized retirement of V1 collection, workers, scheduled sends/retries and business/identity-writing paths, settle accepted work or identify unresolved effects with its F01/F05/F09/F11 owner. Maintenance and the logo freeze stop none of those processes by themselves. An accepted payment or erasure is not cancelled by retirement. This section defines reconciliation inputs; the actual retirement and its proof remain separate F14 operations.
3. Read current authoritative state and reconcile the following changes against the initial evidence. Use event/history evidence only to explain changes; an older event, copy or delayed response cannot override a newer decision. Do not add replay, synchronization or migration state machinery.

| Changes since preparation              | Required final check                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identities and associations            | Cover new/changed principals, linked methods, necessary address evidence and current beneficiaries. Preserve valid existing links; introduce no email matching, old-profile import or privilege inheritance. Distinguish identity-preserving recreation from voluntary deletion and a replacement business UUID.                                                                                                                                           |
| Purchases, renewals and transfers      | Check both stores' current applicable rights and customer/beneficiary associations, including historical references still needed after a transfer. Apply F09's accepted native transfer scope and assisted exceptions without merging profiles or moving gifts. Native renewal/propagation timing is not an atomic cutover guarantee.                                                                                                                      |
| Expiration and revocation              | Apply current paid/manual validity and restrictions. Old receipts, successful rehearsals or retained gift evidence cannot extend expiry or undo revocation. Unavailable/uncertain verification remains distinct from confirmed expiry or absence; follow F09's unknown-rights behavior without ads or a repurchase invitation.                                                                                                                             |
| Erasure and other privacy restrictions | Apply current F05/F11 obligations, including known original-target cleanup and restrictions affecting retained content, images or attribution. Never restore an erased business account from an old copy. Keep missing current evidence explicit and affected access suspended, without imposing a cleanup-pending gate on new registration or ordinary native restoration.                                                                                |
| Exceptional manual logo edits          | Confirm the sole administrator's freeze, settled in-flight writes and the actual scraper's preservation behavior under F14. Check for exceptions since the initial copy; refresh and verify each affected association and usable file, retaining exact FFVB strings. A verified unchanged copy needs no repeat full export solely because time passed. Missing files remain blocking; an unmatched but preserved logo remains identifiable for resolution. |

4. Record the actual check times, covered sources/interval, current outcomes, remaining uncertainty and owner of accepted unresolved effects privately. Provider activity can continue: if a later accepted change or delay makes the checked state stale before the dependent action, refresh the affected current checks and evidence. No manual freeze or timestamp guarantees a global provider snapshot. Do not proceed when necessary continuity or accepted-effect evidence remains unavailable.
5. Reassess the destruction gates above and hand the result to the authorized release operator. A failed check permits correction or retry while sources remain protected, never automatic destructive continuation or partial opening. Whenever retained values are reused, apply the [current business reconciliation](#reconcile-before-access-or-sends); F05/F09/F11 restrictions take precedence and unresolved affected access stays closed. Code remains compatible with current data; no infrastructure recovery procedure is selected here.

## Collection inspection and explicit recovery

Use the [F01 application diagnostics](../../specs/001-source-acquisition/quickstart.md) to distinguish failures, administration needs and uncertain terminal operations. Inspect dated `collection_evidence` and `collection_operator_report` events in the task-owned backend process output or its already authorized private destination. They describe facts and available bounded operation counts with the original observation time; a delayed event does not assert current state. Source preparation reports one actual creation, omitting repeated proposals. Catalog reports carry available obtained/rejected counts, not a count of pending classification. Inspect current administration for outstanding preparation/classification needs. Compare the exact control/scope/stage/phase current result, observation time and its own latest usable success through the existing result reads. Diagnostic emission takes no fresh transaction, season/control lock or projection reread and cannot change the committed business outcome. There is no diagnostic-log API, log-order coordinator or required hosted dashboard. Pause, closure, log absence and success elsewhere prove no affected-scope recovery. A usable acquisition result leaves failed integration independent; a qualified empty or ambiguous municipal result is not a provider outage. Every failed, partial or unconfirmed key remains inspectable, including clubs/geocoding. Exact outage-start/duration is not retained; ordinary next-attempt eligibility is unchanged.

F01 retains current intent, cycles and scope results, not an execution history. The backend is the sole database writer. A lost response is not proof that the write failed. Keep the original control/cycle/source identity in the private operational case; never paste credentials, provider documents, locality or private diagnostics into this repository or a public issue. [F01's ordered cases](../../specs/001-source-acquisition/quickstart.md#ordered-uncertainty-cases) distinguish response loss before and after acceptance.

Use the authorized environment's existing private token process. With `BACKEND_URL`, `COLLECTION_CYCLE_ID`, `COLLECTION_CONTROL_ID` and `SOURCE_BINDING_ID` explicitly set to the affected environment/scope, the actual read routes are:

```sh
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${COLLECTOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/ingestion/collector-runtime"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${COLLECTOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/ingestion/collection-cycles/${COLLECTION_CYCLE_ID}"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/administration/collection-controls/${COLLECTION_CONTROL_ID}"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/administration/source-bindings/${SOURCE_BINDING_ID}"
```

The first two reads require the collector's current ingestion audience/client and `sporting:ingest` scope. The last two require a usable current operator account with `collection.manage`; they remain individually authorized under maintenance and confer no minimum-mobile-version bypass. Use private shell handling without tracing; keep output private. Read failure is unresolved evidence, never permission to replay a sporting mutation. The collector sends startup, admission and terminal operations once without confirmation GETs or process-local acknowledgement ownership. Inspect current runtime/work and control/candidate state: if admission did not commit, later ordinary polling may attempt fresh admission; if admission committed but its response was lost, no provider read starts and backend RUNNING excludes new work until explicit restart. A committed terminal write may permit later collection despite response loss. If terminal submission did not commit, RUNNING remains blocked and needs inspection/restart. Preserve accepted independent sporting facts and do not resend their writes. Pause/resume creates no automatic repair or catch-up.

For a local task-owned collector, use `npx nx run collector:serve` from that worktree after its private environment is loaded through [local development](../../README.md#local-development). If unresolved unfinished work requires incarnation replacement, stop only that original foreground process with Ctrl-C and relaunch explicitly against the authorized local target. Never start a second collector for that target or stop another worktree’s process. Registration waits for admitted transactions, preserves their commits and marks unfinished old cycles interrupted; it does not replay their work. Completed cycles and accepted source qualifications survive. An interrupted candidate needs a new explicit validation request for its current candidate if still applicable; ordinary collection uses its next eligible opportunity. Confirm the new runtime incarnation and affected cycle/source reads before calling the scope recovered. The launcher enables scheduled reads after registration: do not point it at live FFVB/LNV/IGN merely to inspect or test a build. Host applications do not run through Compose.

Inspect the canonical season, accepted source reference, latest catalogue read, last complete read and affected result. Ordinary discovery reuses retained qualified entries after an incomplete or unavailable read and continues at its next eligible opportunity. The [controlled historical preparation command](#bounded-initial-sporting-reconstruction) can supply a missing verified archive reference. A demonstrated defect in a locked binding requires an individually authorized, narrowly scoped technical change under the [review and delivery policy](../../AGENTS.md#git-delivery). Preserve accepted facts and terminal closure.

## Native participant map configuration

F03 uses `react-native-maps` 1.27.2 with Apple Maps on iOS and Google Maps on Android. `GOOGLE_MAPS_ANDROID_API_KEY` is a native build input consumed by the package's Expo config plugin; it is not an `EXPO_PUBLIC_` runtime value. Rebuild the development/release client after changing it. No iOS Google key, location permission request, GPS, custom tile service or persistent geographic cache is configured.

Before authorized Android map use, supply a separate appropriately scoped key for the intended environment. Restrict it to **Android applications**, with the exact application package and SHA-1 signing-certificate fingerprint of each authorized build. The configured packages are `com.blockoutproject.blockout.local`, `com.blockoutproject.blockout.preproduction` and `com.blockoutproject.blockout`; release verification must use the certificate that signs the installed artifact (including Play App Signing where applicable), not an assumed local/upload certificate. Restrict the key's APIs to **Maps SDK for Android**. Keep real key values and private provider evidence outside this repository; a mobile key is embedded in its native artifact and relies on verified restrictions.

F03 T040 owns provider configuration, verification of actual credentials and restrictions, and native observations on compatible clients. Android activation remains on owner hold. F13 tracks the remaining physical-device observations. [F03 native map cases](../../specs/007-sporting-consultation/quickstart.md#native-map-cases) · [Android hold](https://github.com/blockoutproject/blockout/issues/218) · [F13 physical-device qualification](https://github.com/blockoutproject/blockout/issues/833)

## Sporting push inputs and failure limits

F07 uses an explicitly configured Expo project, with **one enabled backend sender per project**.
Its single Spring worker paces batches of at most 100 by 200 ms (at most 500 messages/second,
within Expo's 600/project/second limit). Do not enable independent replicas or another sender
against that same project without revisiting the aggregate rate boundary. Inbox/facts remain in
PostgreSQL regardless of transport activation. No production/provider activation is established
by this configuration.

- Backend: `BLOCKOUT_NOTIFICATIONS_PUSH_ENABLED` defaults to `false`;
  `BLOCKOUT_NOTIFICATIONS_PUSH_PROJECT_ID` must match the project's UUID for the same environment and
  `BLOCKOUT_NOTIFICATIONS_PUSH_ACCESS_TOKEN` is its private server bearer credential. Enabling
  requires both inputs. Store them in the corresponding backend application's private
  Dokploy environment with transport disabled during preparation. Enable Expo's enhanced push
  security with authorization after verifying any existing senders on that project can still send.
  Keep the bearer credential out of mobile, Git and diagnostics.
- Native `apps/mobile/app.config.ts`: `EXPO_PROJECT_ID` supplies the public build-time project UUID
  consumed by the existing `getExpoPushTokenAsync({ projectId })` lifecycle. The EAS profiles
  select the dedicated preproduction project for both preview builds and the historical project
  for production. An ordinary local build has no project UUID and does not register. The Expo
  project configured by Dokploy must match the one embedded in the corresponding build.
  The Expo address itself does not prove its project to the backend. Mixed-project rejection is
  dropped, never split/retried. Preserve F14's existing production application/project identity.
- Android: `FCM_GOOGLE_SERVICES_FILE` is the environment-owned absolute path to the matching
  `google-services.json`; keep the file outside Git. The matching private FCM v1 service-account
  credential belongs to the isolated Expo/EAS project's service credentials, never the bundle or
  backend token field. The existing SDK creates channel `default` (label `Notifications`, default
  importance) before permission/token acquisition. The `expo-notifications` config plugin uses
  that channel. User/channel settings still control presentation.
- iOS: associate the APNs credential with the exact bundle identifier in the corresponding Expo
  project and check the Apple team, key scope and provisioning entitlement in the signed artifact.
  Preserve credentials that still serve V1. Keep the APNs key in the authorized Apple/Expo credentials.
  The SDK plugin supplies ordinary native notification configuration; background remote
  notifications remain disabled. Adding the plugin changes future native binaries and does not
  update an already installed development client.

The [official Expo send/receipt API](https://docs.expo.dev/push-notifications/sending-notifications/)
was checked on 2026-10-30: 100 messages/request in one project, 600 messages/second/project,
4 KiB payloads and 1,000 IDs/receipt request. Payload-size admission belongs to Expo; the sender no longer serializes each message a second time to pre-certify its byte size. The Expo-listed Java SDK uses the existing 3-second connect and
5-second read bounds, with redirects and native Apache automatic retries disabled. Neither the SDK nor the underlying transport resends a request. Only safe sporting title/body and
`ownerAccountId`/`notificationId`/`matchId` routing data accompany the destination. No badge, old
video URL, profile, live-specific TTL, image extension, interactive action or background sync is
added. Omitted TTL/expiration retain the provider default, possibly four weeks. A late notice
makes no current-stream promise.

The worker queue holds at most 100 batches; up to 100 delayed receipt callbacks retain at most
100 ticket IDs each. Both are memory only and disappear on shutdown/restart. Each accepted ticket
is observed once around fifteen minutes later. A refusal, uncertain response, missing receipt,
overload or maintenance skip produces no resend, replay or catch-up. `DeviceNotRegistered` removes
only the matching private row identity/revision/address, so a late receipt cannot remove a newer
registration. A last current-maintenance check prevents each new handoff including operators;
changes after that check cannot atomically stop or recall an external message.

An empty or non-JSON HTTP refusal, including 401/403, can remain UNKNOWN under the native Java SDK rather than producing a dedicated HTTP-configuration diagnostic. Native ticket/receipt `InvalidCredentials` retains its safe configuration diagnostic. Never parse private SDK exception text to recover a status.

Keep `logging.level.com.niamedtech.expo.exposerversdk=OFF`: the upstream SDK has a raw response-body DEBUG log, which must not expose private provider evidence. Do not enable that logger; do not parse/log SDK exception messages.

Inspect existing structured stdout fields `operation=sporting_push` (worker reason/count),
`operation=expo_push_evidence` (acceptance/rejection/unknown counts) and
`operation=sporting_push_configuration` (disabled/enabled or credential/project diagnostic).
For `sporting_push`, `stage=preparation` with `outcome=failed` counts captured device attempts in a
batch that never called transport. An unexpected exception from the provider boundary uses
`outcome=unknown`. `stage=transport` counts eligible messages passed to the send call.
`stage=receipt` counts ticket IDs passed to the receipt lookup. These stages record invocation
with HTTP transmission still unconfirmed. `expo_push_evidence` reports returned ticket and receipt
outcomes. These logs contain no account/destination/ticket identities, content, raw provider error
or secret.
Acceptance at Expo/APNs/FCM is not phone receipt. Correct credentials/project settings only in an
authorized environment; do not repair lost transient work by replaying announcements. Follow the
[physical preparation](../../specs/011-notifications-delivery/quickstart.md#physical-push-preparation)
for the separately owned device/provider qualification. No EAS/store build or provider mutation
is authorized by this runbook.

## Pro restoration and assisted recovery

This is the bounded F09 procedure for separately authorized owner operations, using the existing [F10 private complete-receipt process](../../specs/012-reports-feature-suggestions/plan.md) and [F11 rights handling](#manual-rights-and-club-contact-restrictions). The [F09 preparation cases](../../specs/006-pro-subscriptions/quickstart.md#restoration-and-assisted-recovery) and T034 own actual Apple/Google qualification. Writing this procedure grants no console, provider, support-send or production authorization.

1. **Receive and bound the request privately.** Use the existing authorized private support destination. Retain the request reference, operator, reason, date, requested scope, necessary corroborating evidence and actual outcome there. Verify destination access and operator authority before handling evidence; never substitute a public issue, repository attachment or diagnostic log. Review retention against the case purpose and delete evidence when no longer justified.
2. **Establish the requester and recipient.** Verify purchase ownership proportionately and identify the authenticated, usable recipient business account through F05. An email match, supplied UUID, isolated transaction number or uncorroborated screenshot is insufficient. Do not merge profiles, link identities by email or systematically request identity documents. Contradictory evidence keeps intervention pending; explain what is missing or why it is refused without disclosing another customer's information.
3. **Inspect the current purchase and full effects.** Corroborate the actual original-store purchase, current validity and historical association using authorized provider tools and F14's retained references. Inspect both beneficiaries and their independent paid/gifted entitlements before acting. Native restoration can affect a receipt's purchases together; no individual-purchase transfer guarantee is offered. An Apple receipt cannot be natively restored through Google Play or conversely. Same-account cross-platform rights and unsupported cross-store recovery require their own evidence.
4. **Use only a supported, bounded owner intervention.** Check that the provider's supported operation preserves independent rights. If scope is unsupported or effects cannot be established safely, contact provider support and retain the unresolved request. Never add an automatic compensatory gift, cancel billing implicitly, use a Blockout moderator role as console authority or promise that manual transfer changes the paying store account. Its later explicit restoration may transfer purchases again.
5. **Verify before confirmation or repetition.** Read the provider's actual result and refresh native state for source and recipient; compare paid and independent gift validity with the pre-intervention evidence. Distinguish a successful operation from active Pro rights. On failure or an unknown outcome, reread before deciding whether to repeat; never replay blindly. Communicate confirmed effects, uncertainty, any refusal and the next owner action privately.
6. **Preserve erasure and rights safeguards.** Follow [F05 original-target cleanup](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for failed/concurrent cleanup and [current F11 restrictions](../../specs/004-advertising-privacy-legal/plan.md) before exposing restored data. A fresh account can recover paid rights only: no old profile, follows, attribution, personal grants or gifts return. Deletion does not cancel store billing and creates no cleanup-pending registration/restoration gate. Keep necessary cleanup references under the existing private retention limits, without creating a second ledger or indefinite evidence archive.

## Pro gifts in the owner console

Use the [private recovery procedure above](#pro-restoration-and-assisted-recovery) for recipient verification, evidence, retention and uncertainty. **Owner-only, verified recipient/scope, reread uncertain outcomes before repeating. No Blockout gift ledger; no sensitive evidence in public artifacts.** RevenueCat's [Customer Support role](https://www.revenuecat.com/docs/projects/collaborators#customer-support) also permits refunds and customer deletion. A Blockout moderation grant or access to a support record delegates none of these operations; only the owner intervenes at launch.

1. **Bind the request to its original recipient.** Confirm the authorized environment/project, authenticated usable F05 business UUID and corroborating request through the private process. Inspect the exact RevenueCat customer and relevant aliases; an email or supplied identifier alone is insufficient. Record the intended `Blockout Pro` gift and explicit final expiry (including time zone), or no expiry, alongside the request/operator/reason/date. Ambiguous identity or scope keeps the request pending without mutation.
2. **Read before acting.** Record current promotional grants, independent paid validity and store renewal/billing information privately. Gifts affect neither store charges nor renewal; inspect both before and after. Granted entitlements also apply to sandbox clients but are production transactions in RevenueCat: a sandbox account is not an isolated customer namespace. Use only dedicated authorized accounts for qualification.
3. **Perform the supported promotional action.** Follow RevenueCat's [Granted Entitlements instructions](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile#granted-entitlements), checked on 2026-10-31:
   - Grant: customer profile → **Entitlements** → **Grant** → `Blockout Pro`; choose **Until date** for the agreed end, or the no-expiry/lifetime option. Review before submitting.
   - Lengthen: grant again with the intended later end. Shorten: revoke promotional access, then grant the agreed end. Revocation affects **all active promotional grants for this entitlement**; verify that scope first. These are separate operations: if replacement fails, record the actual intermediate state. Never add durations or use paid-subscription **Extend Subscription**/Google deferral.
   - Revoke: use the menu beside the **granted** entitlement, not a paid subscription. RevenueCat documents **Sandbox data** unchecked for promotional removal. Verify the customer and scope again; never cancel/refund/delete a customer to withdraw a gift.
4. **Establish the final result.** Reread provider history and final promotional validity, then observe ordinary SDK refresh on the affected native clients. Distinguish requested, provider-confirmed, failed and uncertain outcomes in the same private case. A console confirmation establishes no immediate mobile propagation. Preserve any independently active subscription; gift-only expiry/revocation permits F11 eligibility only when the SDK supplies inactivity. No usable SDK state means no ads or repurchase invitation. If the result is uncertain, inspect before any repeat; if the supported scope cannot preserve rights or the intended validity cannot be established, use provider support.
5. **Keep recovery bounded.** Purchase transfer leaves a gift with its original beneficiary; it is not a purchased receipt item. Reuse the restoration procedure for paid recovery and compare both recipients. After business deletion, failed provider cleanup remains an original-target manual obligation; never revoke against a replacement UUID or copy a gift to it. Any new gift needs its own explicit assignment. There is no automatic compensation, application gifting API or additional administration screen.

The [T036 cases](../../specs/006-pro-subscriptions/quickstart.md#owner-console-gifts) prepare supported operator checks and focused SDK reflection on iOS/Android, reusing transfer/erasure evidence rather than a console-failure matrix on each platform. T038 retains actual provider outcomes and paid/gift coexistence; these instructions and controlled SDK tests do not establish unchanged billing, a live grant or native promotional rendering.
