# Research: F13 shared technical foundation

**Date**: 2026-10-16 | **Request**: [#42](https://github.com/blockoutproject/blockout/issues/42) | **Plan**: [plan.md](plan.md)

The decisions below preserve the accepted direction and explain the relevant alternatives. Evidence comes from official documentation, bounded upstream source inspection and the authorized read-only Auth0 account inspection. Documented support and observed source behavior do not establish integrated Blockout runtime compatibility. No production-stack compilation, provider change, deployment or restoration was performed.

[Quickstart](quickstart.md) defines future validation. A failed qualification blocks affected adoption rather than weakening an invariant. Rejected alternatives are not a roadmap; no load/capacity or monthly-availability programme is introduced.

## Backend, collector and workspace

**Decision**: One modular Java backend; separate Java collector through HTTPS.

**Rationale**: One writer owns transactions and permissions; acquisition has its own execution lifecycle. Standard Spring/JPA mechanisms meet the need.

**Alternatives and tradeoffs**: Collector SQL access removes an HTTP call but duplicates write ownership and bypasses backend invariants. Services per feature add deployment and contract coordination without a current requirement.

**Evidence and limits**:

- **Java / Spring**: Spring Boot's current documentation identifies **4.1.1**, requires Java 17+, supports Java through 26 and Maven 3.6.3+. Java 25 is within its documented range. [Spring requirements](https://docs.spring.io/spring-boot/system-requirements.html). Temurin 25 is published and categorized as LTS; no patch/image digest was selected by this research. [Temurin releases](https://adoptium.net/temurin/releases/?arch=any&mode=filter&version=25).

- **Managed persistence dependencies**: the Boot 4.1.1 dependency table currently lists Hibernate ORM **7.4.5.Final**, PostgreSQL JDBC **42.7.13**, Liquibase **5.0.3**. These are observed BOM values, not independently approved overrides. Prefer the selected Boot BOM; lock the actual resolved graph when executable work is authorized. [Managed coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html).

- **PostgreSQL 18.6** is an official release dated August 13, 2026; its notes mention security-related configuration/data cleanup considerations for upgrades. This foundation has no retained database to upgrade. The release's existence does not prove the planned image, driver, mappings or backup integration. [Release notes](https://www.postgresql.org/docs/release/18.6/).

[Nx ordinary targets](https://nx.dev/docs/kb/executors-and-configurations) can run shell commands with `nx:run-commands`, supporting the accepted orchestration of npm/Maven without new platform plugins. The [Nx 23.3.0 release](https://github.com/nrwl/nx/releases/tag/23.3.0) is published (2026-10-07); the [official Node compatibility matrix](https://nx.dev/docs/technologies/node/introduction) lists Node 24 for Nx 23. This establishes release availability and supported major pairing, not a qualified Blockout workspace.

## Authoritative images

**Decision**: PostgreSQL stores accepted image bytes and associations together.

**Rationale**: A database transaction and a single logical backup preserve the association. PNG/JPEG and 5 MiB limits bound individual accepted uploads.

**Alternatives and tradeoffs**: External image storage requires consistency, deletion and restore coordination. Keeping bytes in PostgreSQL increases backup size; accepted without a speculative capacity programme. Private F10 GitHub attachments retain their own authority.

## Schema lifecycle

**Decision**: Mutable initial XML baseline, then immutable migrations at first preproduction/production version.

**Rationale**: Keep few files while every database is disposable; preserve data once an environment has a real release. Separate migration credentials keep the application from altering its schema.

**Alternatives and tradeoffs**: Incremental migrations before any retained version add history with no current preservation benefit. Hibernate schema updates surrender controlled delivery. No reset or checksum clearing is authorized.

**Evidence and limits**:

- **Schema execution**: Boot documents `spring.jpa.hibernate.ddl-auto=validate`, `spring.sql.init.mode=never`, and control of automatic Liquibase startup through `spring.liquibase.enabled`. XML is supported. Thus a separate migration job with application startup limited to validation uses standard configuration; omit the Liquibase starter from the business runtime or explicitly disable its auto-execution. [Database initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html).

- **Liquibase baseline**: changesets carry execution history/checksums and normally run once; changing an applied definition can stop validation. The mutable disposable baseline is a project posture, not a provider feature that updates an existing retained schema. Initial creation changesets can remain in one evolving baseline before the first preproduction/production version; this never authorizes reset or checksum clearing. Freeze the baseline at that first version, then append immutable evolution. [Changesets](https://docs.liquibase.com/concepts/changelogs/changeset.html), [checksum behavior](https://docs.liquibase.com/secure/user-guide-5-2/what-is-a-changeset-checksum). The latter documentation is labeled Secure 5.2: it supports the conceptual explanation, not qualification of the precise chosen CLI edition/version.

## HTTP contracts and validation

**Decision**: YAML OpenAPI 3.0.4, Redocly, OpenAPI Generator and Orval.

**Rationale**: A direct authored format feeds the actual Java and mobile consumers and their validators. Two roots belong to one backend and reference shared primitives.

**Alternatives and tradeoffs**: A schema-language export or custom assembly stage adds an additional authority/transform without an accepted need. No editable per-plan contract copies or template forks.

**Decision**: One targeted Fetch adapter with generated Zod validation.

**Rationale**: Validate business JSON once before Query success/cache; centralize credentials, cancellation, bounded waiting and safe errors.

**Alternatives and tradeoffs**: Unchecked casts do not satisfy integrity. Validation in every screen duplicates logic; a universal middleware framework is unnecessary. Actual supported response shapes must pass integrated qualification.

**Evidence and limits**:

- [OpenAPI 3.0.4](https://spec.openapis.org/oas/v3.0.4.html) defines YAML/JSON descriptions, references and the selected schema subset. Do not write 3.1 JSON Schema syntax into this dialect. Nullability uses `nullable` with explicit `type`; requiredness remains separate. Extra object properties default to allowed. Formats are not universally validated by tools; date/time acceptance must be exercised.

- [Redocly CLI 2.62.1 release](https://github.com/Redocly/redocly-cli/releases/tag/@redocly%2Fcli@2.62.1) is published. Its [official lint-then-bundle guide](https://redocly.com/docs/cli/guides/lint-and-bundle) explicitly supports failing validation before resolving references into a single downstream input. Two roots and shared technical references need no custom join stage; each root is independently bundled.

- [OpenAPI Generator 7.26.0 release](https://github.com/OpenAPITools/openapi-generator/releases/tag/v7.26.0) is published. Version-pinned [Spring documentation](https://raw.githubusercontent.com/OpenAPITools/openapi-generator/v7.26.0/docs/generators/spring.md) includes `interfaceOnly`, model package configuration, `useSpringBoot4`, Jakarta, `useJackson3`, `useBeanValidation`, and explicit null setter controls. Choose interface/model output; do not treat a generated server project, SpringDoc export or generated persistence model as the contract authority. `disallowAdditionalPropertiesIfNotPresent` defaults to legacy restrictive behavior; set it false so explicit contract request/response policies govern. Supported options are not proof that unknown request fields are rejected at runtime.

- Version-pinned [Java client documentation](https://raw.githubusercontent.com/OpenAPITools/openapi-generator/v7.26.0/docs/generators/java.md) includes `library=restclient`, Spring 7 with `useSpringBoot4`, and Jackson 3 with `useJackson3`. `failOnUnknownProperties=false` supports additive-response tolerance; known-field validity still needs actual decoding tests. Unknown enum fallback is opt-in and must not be enabled merely to claim compatibility. Client Bean Validation defaults false; generated constraints do not establish invocation. Use the selected Boot dependency management rather than assuming a generated standalone POM matches the application.

- [Orval 8.41.0 release](https://github.com/orval-labs/orval/releases/tag/v8.41.0) is published. The [official output configuration](https://orval.dev/docs/reference/configuration/output/) documents `client: 'react-query'`, `httpClient: 'fetch'`, `schemas: {type: 'zod'}`, `override.fetch.runtimeValidation: true`, a custom mutator and `override.includeZodSchemaInArguments: true`. The native validation call is skipped when a mutator owns transport; the passed schema lets that mutator parse once. Simply turning on runtimeValidation without the schema argument does not validate custom-mutator responses. Do not use its logging validation mode for private payloads.

- The option also exists in the [8.41.0 configuration types](https://raw.githubusercontent.com/orval-labs/orval/v8.41.0/packages/core/src/types.ts), not merely unversioned documentation. Configurations expose optional-vs-null handling, schema output and status-envelope switches. A custom mutator must match the selected return shape; do not assume generated status/header wrapping is executed inside a handwritten transport.

The [8.41.0 fetch implementation](https://raw.githubusercontent.com/orval-labs/orval/v8.41.0/packages/fetch/src/index.ts) passes the schema only for eligible generated response shapes. Primitive/void responses and NDJSON streams skip the generated parse/schema path; named schema objects and eligible arrays use it. Query clients reuse this fetch path. Therefore the accepted statement means consumed JSON business object responses with a generated schema; it must not claim blanket coverage for every possible OpenAPI shape. If a feature actually needs primitive JSON, streams, or complex unions, it must qualify an appropriate generated schema invocation before adoption, not silently bypass validation. No current F13 operation requires those shapes. Preserve explicit 204/non-JSON handling and safe error parsing in the small transport adapter. A missing schema on an expected business JSON response is a qualification failure, never a successful unchecked cast.

The [7.26.0 Spring implementation](https://raw.githubusercontent.com/OpenAPITools/openapi-generator/v7.26.0/modules/openapi-generator/src/main/java/org/openapitools/codegen/languages/SpringCodegen.java) has explicit Boot 4/Jackson 3 branches; enabling Boot 4 disables Boot 3 generation. Its null-annotation path warns about defaults and does not universally reject optional non-null fields under defaults. Explicit supported configuration and actual boundary tests must establish absent/null/empty distinctions. This is not evidence for a custom template fork.

## Native UI projection and system appearance

**Decision**: Use a small typed projection of the approved Figma variables/styles with React Native `StyleSheet`, native system appearance and bundled Outfit. The [plan](plan.md#native-ui-and-approved-design) owns module responsibilities and dependencies; this adds no UI HTTP contract or persisted model.

**Rationale**: The live [UI Library Color guidance](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=7-3) separates semantic light/dark, sporting context and membership. Its Context Color modes are representative fixtures; production uses the approved derivation from effective sporting inputs, not a hard-coded palette per division. Separate Core, Typography, Motion and Platform collections supply other values. [Product Design Patterns](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/?node-id=253-2) composes library instances. Existing light/dark modes are observed; automatic system following is the explicit requirement in [FR-035](spec.md#platforms-accessibility-and-bounded-continuity), not an inferred prior implementation.

React Native's [useColorScheme](https://reactnative.dev/docs/0.86/usecolorscheme) subscribes to appearance changes; [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/) requires automatic native appearance and `expo-system-ui` for Android development builds. [StyleSheet](https://reactnative.dev/docs/0.86/stylesheet) retains typed native style properties without another styling runtime. [Expo SDK 57 fonts](https://docs.expo.dev/versions/v57.0.0/sdk/font/) supports bundled font configuration; native family/weight resolution must be checked on each platform rather than assuming a Figma label maps directly to an installed face.

**Native limits and evidence**: [React Native text styles](https://reactnative.dev/docs/0.86/text-style-props) documents Android font padding and closest-weight substitution when a face is absent. Bundle the actual Outfit faces and qualify baseline, wrapping, line height and enlarged text; do not compensate for an unloaded font with arbitrary spacing. [Shadow APIs](https://reactnative.dev/docs/0.86/shadow-props) differ by platform and API support, so a documented design effect is not automatically an identical supported native effect. Safe areas, keyboard, text scaling and system/provider controls also require actual native evidence. These are qualification points, not established Blockout rendering defects or permission to simplify the design. Material adaptations keep the existing design gate; [quickstart](quickstart.md#native-mobile-and-approved-design) defines the proof. No native build or visual fidelity test has run.

**Alternatives and tradeoffs**: An automatic token/code generator, runtime styling engine or universal component factory would add maintenance without an established consumer need. A manual typed projection keeps aliases and source references reviewable but must be reconciled when its owning Figma values change. Screenshots and exploratory CSS cannot replace those values. Mapping every documentation layer to React would obscure useful composition; feature-owned patterns preserve business responsibilities while reusing shared controls.

## Native identity and session

**Decision**: Single existing Auth0 tenant, separate clients/audiences and a preproduction-only Database connection.

**Rationale**: Preserve V1 identities and avoid another tenant expense. [F05](../005-accounts-identity/research.md#native-authentication-and-environment-boundary) owns the hosted-login connection and signup decisions.

**Alternatives and tradeoffs**: Separate tenants offer stronger isolation but require additional identity/configuration/continuity work and were rejected by the owner. Shared directory and tenant-wide administration remain an explicit limitation.

**Decision**: Standard Auth0 secure credentials; memory-only business cache; explicit business retry.

**Rationale**: Preserve session privacy and avoid uncertain mutation replay. F03 accepted refreshes and F09 SDK entitlement/cache rules remain distinct.

**Alternatives and tradeoffs**: Persistent private cache, offline queues and generalized automatic recovery create stale-rights and replay concerns without accepted offline requirements. Users may need explicit retry and a fresh login after local cleanup.

**Evidence and limits**:

- **Expo matrix** explicitly maps **SDK 57 → React Native 0.86 → React 19.2.3**, minimum Node 22.13.x, iOS **16.4+**, Xcode **26.4+**, Android 7+, compile/target SDK 36. Node 24 meets Expo's listed minimum. These platform floors are framework capability, not the final Blockout dependency/device matrix. [Expo version table](https://docs.expo.dev/versions/latest/), [SDK 57 release](https://expo.dev/sdk/57).

The official React Native SDK documents React 19 / RN 0.78+ / Expo 53+ support, New Architecture support, native development/EAS builds, and incompatibility with Expo Go. Its credentials manager stores encrypted credentials on Android and in iOS Keychain, retrieves and refreshes expired credentials using refresh tokens, and persists renewal. Hosted Universal Login uses system browser authentication. Callback/logout configuration must match each native application. These statements support using standard SDK mechanisms, not a second custom credential store. No precise SDK patch was selected or compiled here. The README's Android minimum table is ambiguous ("35"); do not turn it into a final device floor. [Auth0 SDK](https://github.com/auth0/react-native-auth0). Its current Android source obtains min/compile/target SDK values from Gradle properties, so qualification must inspect the selected release's resolved native requirements. [Android build source](https://raw.githubusercontent.com/auth0/react-native-auth0/master/android/build.gradle).

- Per-application database connections are documented. [Auth0 application connection example](https://github.com/auth0/docs/blob/master/articles/api-auth/tutorials/represent-multiple-apis.md). F05 owns the connection-wide signup setting and its environment restrictions, with [provider evidence](../005-accounts-identity/research.md#native-authentication-and-environment-boundary).

- Tenants contain applications, connections and users. Separate applications in one tenant do **not** isolate the directory or tenant-wide administrative capabilities. Auth0 recommends environment tenants for stronger isolation; the accepted single-tenant cost/continuity tradeoff remains explicit. [Tenant model](https://auth0.com/docs/get-started/auth0-overview/create-tenants).

- Auth0 documents a default **86400-second (24-hour)** custom API access-token lifetime. Actual token `expires_in` remains authoritative and the chosen API setting must be checked at later configuration. Reusing an M2M token in process memory does not need a distributed cache and does not promise any free-tier quota. [Access tokens](https://auth0.com/docs/secure/tokens/access-tokens/get-access-tokens).

## Application observability

The scoped [F05 cleanup decision](../005-accounts-identity/research.md#synchronous-business-deletion-and-manual-external-cleanup) uses native log alerting and private original-target references for manual handling. It accepts interruption before logging without a durable recovery record; the exception does not broaden other telemetry.

**Decision**: Native Grafana alerts and manual investigation.

**Rationale**: Scope, latest successful stages and partial outcomes support intervention without a custom incident system.

**Alternatives and tradeoffs**: An incident ledger/custom notifier adds state and maintenance. Native closure only means the condition stopped; the operator still assesses business recovery.

**Evidence and limits**:

[Alloy Docker logging](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/) supports ordinary Docker discovery/log consumption and preserves read offsets. An Alloy healthy-component flag is not proof of current incoming telemetry. [Synthetic monitoring](https://grafana.com/docs/grafana-cloud/observe-and-act/testing/synthetic-monitoring/introduction/) executes each probe independently outside the monitored host. Public API health must test the DB and return minimal state while private diagnostics retain detail.

[Spring Boot 4.1 health groups](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.health.groups) support native readiness and database contributors, aggregate-only output and an additional path on the main application port. Use this native boundary rather than add a generated controller that delegates to the same check: the latter adds a duplicate representation and wiring without a business consumer. The approved generation exception is limited to `/health`. Explicitly map unknown health to failure and retain DOWN/OUT_OF_SERVICE mappings when overriding defaults; native defaults otherwise map unknown to 200. Configuration capability is documented, not exercised here. Main-port routing, security, bounded database failure and diagnostic non-disclosure remain implementation qualifications.

[Current Grafana pricing](https://grafana.com/pricing/) gives Free 14-day logs retention, 50 GB monthly log ingest, 10k active metric series and 100k API test executions/month. Using [documented calculation](https://grafana.com/docs/grafana-cloud/platform/pricing-and-usage/synthetic-monitoring/), two checks at the retained frequencies and one probe each consume approximately 51,840 executions/30 days (53,568/31 days). This arithmetic is a provider-quota check, not a capacity programme; other account use and emitted telemetry consume shared allowances. No automatic paid upgrade is authorized.

[Notification grouping](https://grafana.com/docs/grafana-cloud/observe-and-act/alert-and-measure-reliability/alerting/fundamentals/notifications/group-alert-notifications/) supports a repeat interval up to five days, aligned to group interval; choose a divisor such as native five minutes. Group changes can notify between reminders, so five days is not a universal suppression interval. [Discord contact point](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-discord/) natively emits firing/resolved notifications. Resolution establishes only rule-condition change, not F01 observation/acquisition/integration/projection recovery. Missing data needs an explicit non-healthy treatment. Group by useful low-cardinality operational scope; domain owners supply latest useful success and partial outcomes.

**Decision:** Sentry Free for JS errors/native crashes and source maps; no replay, tracing or profiling. [Expo Sentry integration](https://docs.expo.dev/guides/using-sentry/) documents `@sentry/react-native`, EAS source-map support and an actual release test. [Sentry Free pricing](https://sentry.io/pricing/) documents a single-user Developer plan; do not promise paid third-party integrations. [Filtering](https://docs.sentry.io/platforms/react-native/configuration/filtering/) supplies `beforeSend` and breadcrumb hooks. [Collected data](https://docs.sentry.io/platforms/react-native/data-management/data-collected/) explicitly warns that outgoing URLs/query strings and console breadcrumbs can contain PII; disabling default PII alone is insufficient. Native event filtering, symbol/source-map upload and representative redaction must be qualified in native builds, with intentionally harmless fixtures.

## Backups and restoration

**Decision**: Native Dokploy logical backups, S3 lifecycle, one initial isolated restore.

**Rationale**: Protect authoritative data/images with supported scheduling and retention; ordinary manual inspection matches the accepted requirement.

**Alternatives and tradeoffs**: No recurring verification, backup alerts, count purge, versioning, replication or cleanup service. Failures may remain unnoticed; one successful drill does not prove every future dump.

**Evidence and limits**:

[Dokploy database backup](https://docs.dokploy.com/docs/core/databases/backups) supports S3 destination, database, cron, prefix and enablement. [Restore](https://docs.dokploy.com/docs/core/databases/restore) documents its PostgreSQL `pg_dump -Fc --no-acl --no-owner` format and restoring its own backups. This is a database logical backup, not Dokploy's whole-server backup and not a live-volume copy. The missing owners/ACLs imply explicit recreation of intended identities/grants from configuration during recovery; no preservation of grants may be inferred. All application image bytes stored in ordinary PostgreSQL values are included in that database dump; qualification must prove their associations and integrity.

[Dokploy API](https://docs.dokploy.com/docs/api/reference-backup) exposes nullable `keepLatestCount`; qualify disabled/null count cleanup in the retained release and leave retention to S3. [S3 lifecycle expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html) is asynchronous; a 30-day rule is not physical deletion exactly at 720 hours. [SSE-S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html) encrypts stored objects with S3-managed keys; this does not encrypt a downloaded dump or remove access-control obligations. Schedule activity or file existence is not successful restoration.

**Known activation blocker, statically reconfirmed:** [v0.30.8 backup utility](https://github.com/Dokploy/dokploy/blob/v0.30.8/packages/server/src/utils/backups/utils.ts#L66-L85) generates S3 flags with shell-quote, whereas [redactor](https://github.com/Dokploy/dokploy/blob/v0.30.8/packages/server/src/utils/backups/redact.ts) matches only double-quoted flag values. [Execution wrapper](https://github.com/Dokploy/dokploy/blob/v0.30.8/packages/server/src/utils/process/execAsync.ts#L23-L47) retains raw command/error details; [PostgreSQL runner](https://github.com/Dokploy/dokploy/blob/v0.30.8/packages/server/src/utils/backups/postgres.ts) forwards error messages and rethrows errors. Disabling backup notifications does not fix the command/log path. Preserve the accepted requirement to select and verify a release fixing all relevant paths before using real V2 S3 credentials. This research neither identifies a qualified fixed release nor reproduces exposure with credentials. No fork or workaround selected. This condition blocks activation, not documentation finalization.

## Manual delivery and promotion

**Decision**: Manual release qualification and promotion of identical artefacts.

**Rationale**: Human-controlled production and store release; digests/build IDs avoid a different reconstruction after qualification.

**Alternatives and tradeoffs**: Automatic deployment on merge is outside accepted control. A custom release ledger or orchestrator duplicates native tool records. Server/mobile promotion is not atomic and requires compatibility.

**Evidence and limits**:

**Documented:** [Dokploy Compose](https://docs.dokploy.com/docs/core/docker-compose) permits replacing its complete deployment command (Dokploy prepends `docker`). It documents queued-deployment cancellation but not cancellation of a running deployment. [Dokploy v0.30.8 builder](https://github.com/Dokploy/dokploy/blob/v0.30.8/packages/server/src/utils/builders/compose.ts#L72-L118) statically permits `&&` chains, requiring subsequent members to start with `docker compose` or `docker-compose`, and rejects shell substitution, pipes, semicolons and newlines. Therefore use explicit literal Compose arguments for each member, including the same project, env-file and compose-file arguments; do not assume defaults are appended. The accepted pull → stop writers → one-off migration → start/wait chain fits that mechanism. A failed member prevents the following member through ordinary shell `&&`. The exact assembled command still needs the isolated deployment qualification.

[Compose run](https://docs.docker.com/reference/cli/docker/compose/run/) supports a one-off `--rm --no-deps` migration container; [Compose up](https://docs.docker.com/reference/cli/docker/compose/up/) supports `--wait` and a bounded wait timeout. The future Compose file must actually declare service health checks; a running process alone is not application health. Explicitly select backend and collector when stopping/starting so PostgreSQL is not included. There is no evidence that Dokploy coordinates business maintenance, SQL compatibility or cross-store delivery; those remain operator/application responsibilities.

[GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) supports digest-addressed pulls. Source revision plus image digests and native CI/deployment records suffice; no editable release ledger or rebuild for promotion is needed. A source-matching candidate is a project gate, not a guarantee GHCR provides.

[Expo TestFlight](https://docs.expo.dev/submit/testflight/) documents submitting an existing production/store build without rebuilding and a separate explicit App Store release. Internal distribution is not TestFlight internal testing. [Expo submission](https://docs.expo.dev/deploy/submit-to-app-stores/) distinguishes uploaded binaries, testing tracks and store release. Preserve build IDs through qualification and publication; Blockout Préprod is a separate variant and cannot substitute for qualification of the production binary. No EAS Update/OTA follows from these capabilities.

## Legal publication

**Decision**: Legal documents versioned and served with backend.

**Rationale**: Ordinary repository versioning and deployment preserve valid content across failed releases.

**Alternatives and tradeoffs**: Separate document hosting adds deployment/coordination and was rejected. Backend failure may also make legal content unavailable; blocked in-app routes stay hidden while external public URLs remain obligations.

**Evidence and limits**:

The observable availability and public-reading obligations remain owned by [F11](../004-advertising-privacy-legal/spec.md).

## Blocking screens

**Decision**: Shared gate composition and official Lucide retry icon.

**Rationale**: Explicit retry, familiar layout, provisional offline artwork and accessible actions satisfy the reviewed experience.

**Alternatives and tradeoffs**: Dedicated error/help sheets add navigation without a need and were explicitly removed from all three gates. Signed-out operators cannot log in from maintenance; this limit is accepted, not hidden by an emergency console.

**Evidence and limits**:

The final behavior, scoped approvals and exact design references are owned by [F12](../013-administration-app-configuration/spec.md#session-2026-10-12--f13-planning-reconciliation); F05 owns hosted sign-in.

## Derived search infrastructure

**Decision**: [F04 research](../008-search-discovery/research.md) owns OpenSearch/client selection, native matching and automatic reconstruction. Separate private instances isolate production/preproduction on the existing VPS without changing its common host-loss limit. PostgreSQL remains the authoritative backup source.

**Rationale and limits**: Native indexing replaces application-built matching; after-commit work plus full reconstruction avoids a durable recovery platform. No extra business service, search backup chain or public operator UI. The Java 25/client combination and actual deployment/security/rebuild behavior require F04 qualification before adoption. Other F13 stack decisions remain unchanged.
