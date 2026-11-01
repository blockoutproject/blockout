# Blockout

Blockout is a French mobile application for following volleyball teams, calendars and results, with community live links and an optional ad-free Pro offer.

Blockout is a complete V2 rebuild of backend, ingestion and the iOS/Android application, including mobile internals. This repository contains accepted functional specifications, design references, governance and the executable V2 workspace. The [F13 technical plan](specs/003-shared-quality/plan.md) records the shared stack, boundaries, contract generation, delivery and operations decisions. Domain implementation and remaining qualification belong to their owning feature lots.

Start with the [constitution](.specify/memory/constitution.md), [agent guidance](AGENTS.md) and [design inputs](AGENTS.md#design-inputs). [GitHub issues](https://github.com/blockoutproject/blockout/issues) own planning requests, dependencies and acceptance. The official Spec Kit planning step decides the stack, architecture and shared contract/codegen approach within the relevant feature scope; dependent plans reference the agreed decisions.

## Specifications

Specifications own functional vocabulary, requirements and invariants. Directory numbers are stable references, not F-number mappings or implementation order. The standard requirements checklists assess specification quality, not delivered software. Plans derive from these owners through official Spec Kit procedures; API ownership is independent of feature-plan numbering. User-story priorities distinguish relative product value within the accepted V2 scope; a lower priority does not remove launch obligations or relax security and continuity requirements.

| Scope | Owning specification                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------- |
| F01   | [Source acquisition and observation reliability](specs/001-source-acquisition/spec.md)               |
| F02   | [Sporting data, identity and lifecycle](specs/002-sporting-data/spec.md)                             |
| F03   | [Sporting consultation](specs/007-sporting-consultation/spec.md)                                     |
| F04   | [Search and discovery](specs/008-search-discovery/spec.md)                                           |
| F05   | [Accounts and identity](specs/005-accounts-identity/spec.md)                                         |
| F06   | [Following and personal feed](specs/009-following-personal-feed/spec.md)                             |
| F07   | [Notifications and delivery](specs/011-notifications-delivery/spec.md)                               |
| F08   | [Live contributions and moderation](specs/010-live-contributions-moderation/spec.md)                 |
| F09   | [Pro subscriptions](specs/006-pro-subscriptions/spec.md)                                             |
| F10   | [Reports and feature suggestions](specs/012-reports-feature-suggestions/spec.md)                     |
| F11   | [Advertising, privacy and legal](specs/004-advertising-privacy-legal/spec.md)                        |
| F12   | [Shared administration and access configuration](specs/013-administration-app-configuration/spec.md) |
| F13   | [Shared quality and operations](specs/003-shared-quality/spec.md)                                    |
| F14   | [V1-to-V2 transition](specs/014-v1-v2-transition/spec.md)                                            |

## Provenance

This dedicated repository has independent history and contains no V1 runtime implementation. The legacy monorepo is not deployed; running V1 instances originate from independent repositories. Factual historical references inside the specifications support discovery and continuity only. They do not select the V2 stack or grant permission to inspect other repositories, export data or change production.

Accepted product/design decisions and V1/V2 continuity remain applicable. Withdrawn technical dossiers, former stack decisions, backups and historical technical discussions are not planning inputs unless the owner explicitly requests their consultation. Technical decisions belong in the official Spec Kit artifacts that own them. The existing agent guidance links the design inputs; no parallel architecture or design dossier is required.

## Verification

Use Node 24, npm 12, Temurin Java 25 and Docker Compose v2. The committed Maven wrapper downloads and verifies Maven 3.9.16; no global Maven is needed. Install the npm lockfile, then run the same verification as CI:

```sh
npm ci --no-audit --no-fund
npm run verify
git diff --check
```

`verify` checks formatting, lints/bundles all three OpenAPI roots, regenerates their real Java/mobile consumers and verifies the three applications through ordinary Nx npm/Maven targets. Generated bundles and code stay under ignored `.generated/` and `target/generated-sources/` directories. Generator or generation-configuration changes also require the [targeted reproducibility qualification](specs/003-shared-quality/quickstart.md#contract-boundary). Java runs Checkstyle, Spotless, compilation, startup tests and packaging. Surefire discovers `*Test` (including `*UnitTest`, `*WebMvcTest`, `*JsonTest` and `*SmokeTest`); Failsafe alone discovers `*IntegrationTest` and `*JpaTest` during `verify`. Testcontainers JUnit/PostgreSQL support uses the Spring Boot BOM. The database integration suite uses disposable PostgreSQL 18.6, the local role script and test-only mappings to prove explicit Liquibase execution, validation-only startup and denied application DDL. It requires a running Docker engine. The sporting suite also verifies contextual identities, native uniqueness and item rollback against the migrated F02 tables. Spring-backed database suites import `PostgresTestConfiguration`: the Spring context owns the container, migrations precede application beans and the datasource uses the restricted application role. Use `clean` when moving or renaming test classes; a forced JVM exit after a shutdown timeout remains an unresolved lifecycle failure even if assertions passed.

Root verification runs Prettier once for the whole repository, including mobile. `mobile:verify` runs ESLint, TypeScript, Jest Expo, native-platform JavaScript exports and Expo Doctor. Jest discovers co-located `__tests__/*.test.ts(x)` suites. The generated consumer suite exercises schema validation, error profiles, binary/204 responses, cancellation and timeout at the Fetch boundary; it does not qualify a native networking stack or a business screen. The installed RNTL 14 APIs are asynchronous, including `fireEvent`; await native test stimuli and cleanup. React Native Testing Library is available for meaningful feature tests. Exports prove bundling, not an installed native build.

CI gives backend, collector and mobile separate GitHub-hosted runners. Pull requests use [Nx affected](https://nx.dev/docs/features/ci-features/affected), with `NX_BASE` set to GitHub's PR base revision and `NX_HEAD` to its checked-out merge commit; integration pushes and reusable release verification run every application. These native event values require no revision-selection action or Actions API permission. `nx.json` declares shared configuration inputs, including the parent Maven build, database roles and Redocly configuration, so those changes select their consumers. Repository formatting and Alloy validation always run. The final `verify` job requires both quality and all application jobs to succeed, including when a PR has no affected application. Native GitHub concurrency cancels superseded revisions of the same PR without cancelling integration pushes or release calls.

Nx owns the mobile verification dependency graph: generation precedes TypeScript, tests and export, while independent checks can run concurrently within its ordinary process limit. Jest uses two workers by default; an explicit `--runInBand` remains available for focused or cross-process qualification. When inspecting warnings from Codex, append `--reporters=default` to the Jest command: Jest 30.5's automatic agent reporter hides console output from passing suites. npm and Maven dependency caches remain enabled; CI shares no local Nx result cache and connects to no Nx Cloud service.

The shared Query suites exercise read recovery, non-retrying writes, retained authorized data after failed refresh and private-cache separation under [F05's session ownership](specs/005-accounts-identity/plan.md#mobile-session-and-shared-consumers) and [F13's server-read conventions](specs/003-shared-quality/plan.md#frontend-server-read-conventions). The [state decisions](specs/003-shared-quality/research.md#frontend-state-ownership) record the current native lifetimes and accepted limits; F07 owns its independent 29-day exclusion. Earlier dated native qualifications retain their original scope, and application tests do not establish provider/device acceptance.

Backend exposes anonymous `GET /health` on its application port through the native Actuator readiness group. Only the aggregate status is public: application/database ready returns 200; down, out-of-service or unknown returns 503. Other Actuator paths, component reads and other probe methods are denied. Native Hikari/JDBC settings bound database waiting; their application-wide effects are described in the [health decision](specs/003-shared-quality/research.md#application-observability). The health suites cover native mappings/security and real unresponsive PostgreSQL. External monitoring and [F12 access qualification](specs/013-administration-app-configuration/quickstart.md) retain their own evidence boundaries.

JWT checks use Spring Security's native resource server, with separate mobile/ingestion audiences and allowed Auth0 clients. Missing or invalid credentials return a safe Problem Details 401 and Bearer challenge; authenticated client/scope refusals return 403. Public contract reads, support submission, health and legal documents keep their intended access. The security suite verifies real signatures against an isolated JWKS server; contract-binding tests isolate authentication filters. Current account, resource, grant and maintenance checks remain with their owning implementations.

Useful focused commands:

```sh
npm run format:check
npm run lint:contracts
npx nx show projects
npx nx show project mobile --json
npx nx run backend:test
npx nx run collector:test
npx nx run mobile:verify
npx nx run mobile:format-check
./mvnw -B -ntp -pl apps/backend,apps/collector test -Dtest='Sporting*Test,!*IntegrationTest'
npm run test --workspace=@blockout/mobile -- --runInBand src/features/sporting-administration/__tests__/sporting-contract.test.ts
npm run generate
./mvnw -B -ntp verify
./mvnw -B -ntp spotless:apply
```

Validate local links, anchors and source ownership against the final tree. [CI](.github/workflows/ci.yml) retains the `verify` gate and develop-only promotion to main; it starts no deployment or EAS build. These checks establish no provider, device, visual or production qualification. Personal skills are copied from their authoritative bank; official Spec Kit imports remain unchanged except for authorized constitution amendments through the official procedure. Publication follows [the Git delivery policy](AGENTS.md#git-delivery).

### Collector-to-sporting qualification

`CollectorSportingBoundaryIntegrationTest` is an opt-in Failsafe suite spanning the actual collector clients and a separately launched backend JAR. It requires an explicitly selected **disposable migrated PostgreSQL database**: its fixture truncates sporting/source data between cases. Use an isolated Compose project and free ports; never point it at a retained or shared database. The backend uses the restricted application role. The migration role is used only for fixture reset and scoped failure injection. The suite owns its backend process and ephemeral local signing-key endpoint, and closes both. Provider interpretation is synthetic; no provider or Auth0 request is made.

The suites share that runtime and fixture. Their owning quickstarts define the cases, executed results and limits for [F01 partial commits, contextual identities and absence](specs/001-source-acquisition/quickstart.md#collector-partial-success-and-absence-t032) and [F02 generated facts through F03 public reads](specs/002-sporting-data/quickstart.md#generated-facts-and-public-reads-t034).

For example, from the repository root, with ports 5484 and 8184 available:

```sh
POSTGRES_PORT=5484 docker compose -p blockout-collector-sporting up -d --wait postgres
npm run bundle:contracts
./mvnw -B -ntp -pl apps/backend package -DskipTests
LIQUIBASE_URL=jdbc:postgresql://127.0.0.1:5484/blockout \
LIQUIBASE_USERNAME=blockout_migration LIQUIBASE_PASSWORD=local-migration-only \
./mvnw -B -ntp -pl apps/backend liquibase:update
./mvnw -B -ntp -pl apps/collector verify \
  -Dit.test='CollectorSportingBoundaryIntegrationTest,CollectorPartialSuccessIntegrationTest,CollectorContextIdentityIntegrationTest,CollectorSportingReadIntegrationTest' \
  -Dblockout.qualify-collector-sporting=true \
  -Dqualification.backend-jar="$PWD/apps/backend/target/backend-0.0.0-SNAPSHOT.jar" \
  -Dqualification.backend-port=8184 \
  -Dqualification.database-url=jdbc:postgresql://127.0.0.1:5484/blockout \
  -Dqualification.database-user=blockout_app \
  -Dqualification.database-password=local-app-only \
  -Dqualification.migration-user=blockout_migration \
  -Dqualification.migration-password=local-migration-only
docker compose -p blockout-collector-sporting stop postgres
```

Repackage the backend after every backend source change; the suite executes that supplied JAR. Its ignored backend log is `apps/collector/target/collector-sporting-backend.log`. Ordinary module/CI verification compiles the suite but skips execution unless explicitly enabled. [F02's quickstart](specs/002-sporting-data/quickstart.md#collector-to-sporting-boundary) records its evidence and limits.

## Local development

The [manual delivery guide](infra/dokploy/README.md) owns source-built images, separate release Compose configuration and the manual preparation/promotion workflows. Merges run CI only. Actual Dokploy deployments, EAS builds and store release require their explicit manual steps and environment qualification.

Server telemetry uses native ECS logging and opt-in Micrometer OTLP export. See the [telemetry setup and investigation guide](infra/observability/README.md) for the permitted fields, private environment wiring and pending activation qualifications. CI validates the Alloy/Compose configuration without granting it Docker-engine access.

Mobile crash reporting follows the [official Expo/Sentry integration](https://docs.sentry.io/platforms/react-native/guides/expo/): one JavaScript initialization configures the native SDKs, including Android C/C++ crash handling. Reporting is currently disabled in all builds, even when `EXPO_PUBLIC_SENTRY_DSN` is supplied. The public DSN and `EXPO_PUBLIC_SENTRY_ENVIRONMENT` remain build inputs in the [mobile environment file](apps/mobile/.env.example); they cannot bypass the pending T033 privacy/symbolication qualification and subsequent activation authorization. The JavaScript `beforeSend` filter retains standard error categories, packaged source coordinates and symbolication metadata while excluding free-form context and attachments. Breadcrumbs, replay, tracing, profiling and Sentry Logs are disabled. Native events bypass that JavaScript filter: their [standard Sentry scrubbing controls and limitations](specs/003-shared-quality/research.md#application-observability) must be qualified before activation.

Sentry's Metro/config plugins own source maps and native build integration. Authorized uploads use private build variables `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN`; never expose the token through `EXPO_PUBLIC_` or app configuration. Set `SENTRY_DISABLE_AUTO_UPLOAD=true` for local unsigned builds. Native/provider activation, actual emitted crash data and symbolication remain subject to [T033 qualification](specs/003-shared-quality/tasks.md) and the [prepared mobile cases](specs/003-shared-quality/quickstart.md#delivery-and-operations). No project, credential, paid capability or remote setting is created by repository verification.

Compose runs local PostgreSQL 18.6 infrastructure, bound to loopback on port 5432, and an optional OpenSearch service. Applications run on the host. Start the database explicitly:

```sh
docker compose config --quiet
docker compose up -d --wait
```

If port 5432 is occupied, set `POSTGRES_PORT=55432` for the Compose command and use that port in the backend's local JDBC URL.

The named volume retains local data. [Initialization SQL](infra/postgres/init-roles.sql) runs only on an empty volume: `blockout_migration` owns the database/schema, and `blockout_app` has data access without schema creation rights. Compose's fixed passwords are disposable local examples; never reuse them for hosted environments. Configuration edits do not update existing roles. No command here resets volumes. Run migrations separately, supplying the migration role only to that command:

```sh
LIQUIBASE_URL=jdbc:postgresql://localhost:5432/blockout \
LIQUIBASE_USERNAME=blockout_migration \
LIQUIBASE_PASSWORD=local-migration-only \
npx nx run backend:migrate
```

The [XML entry point](apps/backend/src/main/resources/db/changelog/db.changelog-master.xml) includes the domain creation chain and appended owner migrations. Backend startup disables SQL initialization and uses Hibernate validation; Liquibase is confined to the migration plugin and integration tests, outside the application runtime. Preserve applied changeSets and retained data. The [schema lifecycle](specs/003-shared-quality/plan.md#runtime-data-and-consistency) owns compatibility and manual migration/restart limits; no reset is implied.

### Local search infrastructure

The optional `search` profile runs OpenSearch 3.9.0 on loopback port 9200. With Docker and OpenSSL available, prepare fresh disposable TLS and a random backend credential, then start only this service:

```sh
bash infra/opensearch/prepare-local.sh
docker compose --profile search config --quiet
docker compose --profile search up -d --wait opensearch
set -a
. apps/backend/.env.local
. local/opensearch/backend.env
set +a
```

Create `apps/backend/.env.local` from its example first. Spring reads the exported values; it does not read either file automatically. The generated private files remain under ignored `local/opensearch/`. Preparation refuses to overwrite that directory. Certificates expire after seven days and are only for disposable local use; hosted TLS, rotation and provisioning remain with the operations owners. The OpenSearch volume retains its security index and derived data: editing initial YAML does not change an initialized security index.

Set `OPENSEARCH_PORT` on Compose and `BLOCKOUT_SEARCH_ENDPOINT` in the backend shell when using another port. Separate worktrees should use their own Compose project (`-p <project>`) and port. No mobile or collector credential is configured. The native backend role is limited to `blockout-local-search-*`; no demo installer or trust-all client is used. Search connection creation is opt-in with `BLOCKOUT_SEARCH_ENABLED=true`; it makes no engine request and installs no search endpoint or scheduler.

The official `opensearch-java` 3.10.0 client uses Apache HttpClient 5, a native Spring SSL bundle and positive connection/request deadlines (defaults 3/5 seconds). After contract generation, run the actual isolated engine qualification under Temurin Java 25:

```sh
npm run generate
./mvnw -B -ntp -pl apps/backend verify -Dtest='Discovery*Test' -Dit.test='OpenSearchClientIntegrationTest,OpenSearchPropertiesIntegrationTest'
```

The integration suite creates its own TLS, credential, mapped port and disposable Testcontainers engine; it requires Docker and OpenSSL but does not require the Compose instance. It checks trust refusal, namespace refusal, native serialization/query, bulk item failures, explicit refresh and atomic aliases. See the [F04 qualification limits](specs/008-search-discovery/quickstart.md#contracts-and-access). Named-search behavior is qualified with the current F02/F03 reads by the `SearchMatchingIntegrationTest`, `SearchCurrentDataIntegrationTest` and `SearchTraversalIntegrationTest` suites. They include native analyzer bounds, current visibility/city checks and generated HTTP traversal beyond 10,000 results. Run the focused suites after contract generation:

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest='ReadSearchTest,SearchDocumentsTest,Discovery*Test,OpenSearchEngineTest,Consultation*Test,!*IntegrationTest' -Dit.test='SearchCurrentDataIntegrationTest,SearchMatchingIntegrationTest,SearchTraversalIntegrationTest,OpenSearchClientIntegrationTest,OpenSearchPropertiesIntegrationTest'
```

Full backend verification remains `npx nx run backend:test`.

### Application processes

Each application owns a safe `.env.example`. Copy it to `.env.local` when local values are needed. Spring does not read dotenv files: export the chosen application's file in its launching shell. From the repository root, in separate terminals:

```sh
cp apps/backend/.env.example apps/backend/.env.local
set -a
. apps/backend/.env.local
set +a
npx nx run backend:serve
```

```sh
cp apps/collector/.env.example apps/collector/.env.local
set -a
. apps/collector/.env.local
set +a
npx nx run collector:serve
```

Backend starts on port 8080 and requires the configured PostgreSQL connection. Collector starts a non-web process, registers its startup incarnation with the backend once and remains alive until stopped. Start the authenticated backend first: an unconfirmed or refused registration fails collector startup. Provider HTTP clients share bounded capacity per provider; provider adapters and scheduling remain with their owning feature tasks. The collector has no database credentials.

The backend and collector environment examples contain reserved, unconfigured identity inputs. These required inputs must be supplied explicitly; the application has no fallback identity configuration. For an authorized environment, replace the examples with its issuer, distinct audiences/client IDs, token endpoint and private collector secret. The collector uses Boot's client registration and in-memory authorized-client service, with Spring's non-web client-credentials manager/interceptor. It requests `sporting:ingest` and the configured audience, reuses the provider's actual expiry with Spring's normal renewal skew, and bounds token requests through the existing no-retry/no-redirect transport. A refusal or lost business response is not replayed; later explicit calls may obtain new credentials. Actual Auth0 and native sign-in qualification remains with [T042](specs/003-shared-quality/tasks.md).

Expo automatically reads `apps/mobile/.env.local`. Use a separate JDK 21 for Android Gradle/CMake in the mobile terminal; keep Temurin 25 for Maven. Build and launch with the Android SDK/emulator or Xcode 26.4+/iOS simulator:

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
npx nx run mobile:android
# Or, on a Mac with Xcode:
npx nx run mobile:ios
# Start Metro for an already installed development build:
npx nx run mobile:serve
```

Native projects are generated and ignored. After changing native dependencies or configuration, regenerate them with `npm exec --workspace=@blockout/mobile -- expo prebuild --clean` before launching. Expo SDK 58 generates the [UIKit scene lifecycle required by Xcode 27](https://expo.dev/changelog/sdk-58) by default; no scene-support opt-in or custom Kotlin compiler plugin is needed. Keep Xcode’s default local signing enabled for runnable simulator builds so its Keychain entitlements are generated.

### Native UI checks

Install [agent-device](https://oss.callstack.com/agent-device/docs/installation) once on each execution host with the platform tools above:

```sh
npm install --global agent-device@0.21.31
agent-device doctor
```

The [official skill](.agents/skills/agent-device/SKILL.md) is copied unchanged from [Callstack v0.21.31](https://github.com/callstack/agent-device/tree/v0.21.31/skills/agent-device), with its [MIT license](.agents/skills/agent-device/LICENSE).

Shared native UI follows the [F13 theme and component boundaries](specs/003-shared-quality/plan.md#native-ui-and-approved-design). The [native validation guide](specs/003-shared-quality/quickstart.md#native-ui-and-approved-design) owns Figma comparison and accessibility scenarios.

Bundled Outfit files come unchanged from [`@expo-google-fonts/outfit` 0.4.3](https://www.npmjs.com/package/@expo-google-fonts/outfit/v/0.4.3), under the included [OFL license](apps/mobile/assets/fonts/OFL.txt). Interface icons use named components from [`lucide-react-native`](https://lucide.dev/guide/react-native), rendered through the Expo-compatible `react-native-svg`; sizes and colors follow the shared theme. The Blockout logo, photography and outlined artwork remain image assets, independently of interface icons.

Android builds require Android 10 / API 29 through Expo BuildProperties. Native qualification uses this minimum and the latest stable runtime with the real Auth0 browser handoff.

`Blockout Local` uses development-only `com.blockout.local` identifiers for the current V2 routes. F14 owns retained store identities and production candidates. There is no web target or mock identity provider. Android emulators reach a host API through `10.0.2.2`; physical phones need the host's LAN address. `EXPO_PUBLIC_*` values are public bundle configuration, never secrets.

The [canonical HTTP roots](specs/003-shared-quality/contracts/README.md) cover mobile, ingestion and the legacy update read. Redocly's minimal ruleset checks source structure and references without inferring a product license; generation and current consumer checks run through [verification](#verification). Integrated business and provider qualifications remain with the owning feature tasks.
