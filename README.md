# Blockout

Blockout is a French mobile application for following volleyball teams, calendars and results, with community live links and an optional ad-free Pro offer.

Blockout is a complete V2 rebuild of backend, ingestion and the iOS/Android application, including mobile internals. This repository contains accepted functional specifications, design references, governance and the initial executable workspace. The [F13 technical plan](specs/003-shared-quality/plan.md) records the shared stack, boundaries, contract generation, delivery and operations decisions. Backend, collector and mobile launchers are initialized; domain behavior and contract generation remain with the next owning lots.

Start with the [constitution](.specify/memory/constitution.md), [agent guidance](AGENTS.md) and [design inputs](AGENTS.md#design-inputs). [GitHub issues](https://github.com/blockoutproject/blockout/issues) own planning requests, dependencies and acceptance. The official Spec Kit planning step decides the stack, architecture and shared contract/codegen approach within the relevant feature scope; dependent plans reference the agreed decisions.

## Specifications

Specifications own functional vocabulary, requirements and invariants. Directory numbers are stable references, not F-number mappings or implementation order. The standard requirements checklists assess specification quality, not delivered software. Future plans derive from these owners through official Spec Kit procedures; API ownership is independent of feature-plan numbering. User-story priorities distinguish relative product value within the accepted V2 scope; a lower priority does not remove launch obligations or relax security and continuity requirements.

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

`verify` checks formatting, lints/bundles all three OpenAPI roots, regenerates their real Java/mobile consumers and verifies the three applications through ordinary Nx npm/Maven targets. Generated bundles and code stay under ignored `.generated/` and `target/generated-sources/` directories. Generator or generation-configuration changes also require the [targeted reproducibility qualification](specs/003-shared-quality/quickstart.md#contract-boundary). Java runs Checkstyle, Spotless, compilation, startup tests and packaging. Surefire discovers `*Test` (including `*UnitTest`, `*WebMvcTest`, `*JpaTest` and `*SmokeTest`); Failsafe alone discovers `*IntegrationTest` during `verify`. Testcontainers JUnit/PostgreSQL support uses the Spring Boot BOM. The database integration suite uses disposable PostgreSQL 18.6, the local role script and test-only mappings to prove explicit Liquibase execution, validation-only startup and denied application DDL. It requires a running Docker engine. No domain table is introduced.

Root verification runs Prettier once for the whole repository, including mobile. `mobile:verify` runs ESLint, TypeScript, Jest Expo, native-platform JavaScript exports and Expo Doctor. Jest discovers co-located `__tests__/*.test.ts(x)` suites. The generated consumer suite exercises schema validation, error profiles, binary/204 responses, cancellation and timeout at the Fetch boundary; it does not qualify a native networking stack or a business screen. React Native Testing Library is available for meaningful feature tests. Exports prove bundling, not an installed native build.

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
npm run generate
./mvnw -B -ntp verify
./mvnw -B -ntp spotless:apply
```

Validate local links, anchors and source ownership against the final tree. [CI](.github/workflows/ci.yml) retains the `verify` gate and develop-only promotion to main; it starts no deployment or EAS build. These checks establish no provider, device, visual or production qualification. Personal skills are copied from their authoritative bank; official Spec Kit imports remain unchanged except for authorized constitution amendments through the official procedure. Publication follows [the Git delivery policy](AGENTS.md#git-delivery).

## Local development

Compose runs only local PostgreSQL 18.6 infrastructure, bound to loopback on port 5432. Applications run on the host. Start the database explicitly:

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

The [XML entry point](apps/backend/src/main/resources/db/changelog/db.changelog-master.xml) is intentionally empty until domain owners add their real tables. Backend startup disables SQL initialization and uses Hibernate validation; Liquibase is confined to the migration plugin and integration tests, outside the application runtime. Freeze the mutable baseline at the first preproduction/production version; later changes are immutable migrations.

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

Backend starts on port 8080 with no business endpoints. Collector starts a non-web process and remains alive until stopped; it performs no source acquisition yet and has no database credentials. Backend requires the configured PostgreSQL connection. The collector has a configured, bounded generated ingestion client; acquisition and credential ownership remain with their feature lots.

Expo automatically reads `apps/mobile/.env.local`. Use a separate JDK 21 for Android Gradle/CMake in the mobile terminal; keep Temurin 25 for Maven. Build and launch with the Android SDK/emulator or Xcode 26.4+/iOS simulator:

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
npx nx run mobile:android
# Or, on a Mac with Xcode:
npx nx run mobile:ios
# Start Metro for an already installed development build:
npx nx run mobile:serve
```

Native projects are generated and ignored. After changing native dependencies or configuration, regenerate them with `npm exec --workspace=@blockout/mobile -- expo prebuild --clean` before launching. The `expo-build-properties` plugin enables the [UIKit scene lifecycle required by Xcode 27](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/#pluginconfigtypeios) while retaining Expo SDK 57.

`Blockout Local` uses development-only `com.blockout.local` identifiers and a blank route. F14 owns retained store identities and production candidates. There is no web target or mock identity provider. Android emulators reach a host API through `10.0.2.2`; physical phones need the host's LAN address. `EXPO_PUBLIC_*` values are public bundle configuration, never secrets.

The [F02 plan](specs/002-sporting-data/plan.md) introduces the [HTTP contract roots](specs/002-sporting-data/contracts/README.md) under the shared F13 conventions. The [F05 plan](specs/005-accounts-identity/plan.md) extends the mobile root with account lifecycle operations. The [F12 plan](specs/013-administration-app-configuration/plan.md) adds application-access settings and current account permissions. The [F01 plan](specs/001-source-acquisition/plan.md) extends both roots with source qualification, collection controls and current collector admission. The [F03 plan](specs/007-sporting-consultation/plan.md) adds public sporting reads, complete-day calendars and qualified document/image delivery. The [F04 plan](specs/008-search-discovery/plan.md) adds public discovery collections and current search choices. The [F14 plan](specs/014-v1-v2-transition/plan.md) adds the [legacy status root](contracts/http/legacy-mobile/openapi.yaml), preserving only the installed V1 update read. Redocly's minimal ruleset checks source structure and references without inferring a product license. Runtime generation, compilation and consumer behavior remain future qualifications.
