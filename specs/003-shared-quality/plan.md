# Implementation Plan: F13 shared quality, operations and delivery

**Branch**: `develop` (Spec Kit feature `003-shared-quality`) | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-shared-quality/spec.md`; authorized [issue #42](https://github.com/blockoutproject/blockout/issues/42).

## Summary

Provide a small shared foundation for the V2 mobile app, ingestion and backend: one modular backend owns business writes, a separately deployed collector uses its HTTPS ingestion surface, and a native Expo app consumes its mobile surface. PostgreSQL holds authoritative relational data and accepted images together. Standard identity, contract generation, manual delivery, diagnostics and backup mechanisms preserve domain integrity without a generic recovery platform.

This plan defines the common technical foundation. F05/F12 own the reconciled identity and access behavior and its design approvals. The executable workspace provides launchers, generated HTTP boundaries, the mobile query foundation, readiness checks and prepared telemetry. The [README](../../README.md#verification) describes current checks; [tasks](tasks.md) track implementation and remaining domain, native/provider and operational qualifications.

## Technical Context

**Language/Version**: Java 25 LTS (Temurin); TypeScript/JavaScript under Node 24 LTS; Expo SDK 57, React Native 0.86 and React 19.2.3.

**Primary Dependencies**: Spring Boot 4.1.1, Spring Data JPA/Hibernate managed by its BOM, MapStruct for useful mechanical object mappings; Nx 23.3, npm workspaces and Maven; Auth0 native SDK; TanStack Query and generated Zod validators; Redocly CLI 2.62.1, OpenAPI Generator 7.26.0 and Orval 8.41.0. Resolve compatible unpinned library patch versions through the selected platforms and lockfiles during authorized executable work; do not implicitly upgrade this baseline.

**Storage**: PostgreSQL 18.6 with separate production/preproduction instances and volumes; image bytes and their associations in the same database. [F04](../008-search-discovery/plan.md) adds separate production/preproduction OpenSearch instances and volumes as reconstructible search derivatives on the same VPS; PostgreSQL remains authoritative. Mobile private business cache is in memory; Auth0 secure credentials and F09 RevenueCat SDK cache have their distinct accepted purposes. Private F10 cases and GitHub-native attachments stay exclusively in GitHub, outside PostgreSQL backups and without an independent Blockout backup. Recovery depends on GitHub; [F10](../012-reports-feature-suggestions/spec.md) owns this limit.

**Testing**: JUnit, Spring MVC and Testcontainers PostgreSQL for Java; Jest Expo and React Native Testing Library for mobile; reproducible physical iOS/Android qualifications. No additional E2E framework.

**Target Platform**: Native iOS (minimum 16.4) and Android phones, French Blockout-owned content; native development builds. Existing Hostinger VPS, Dokploy/Traefik; Grafana Cloud Free with Alloy, Sentry Free. Expo Go is not supplier-compatibility evidence. Final Android/native-dependency compatibility is qualified in the actual builds and F14 device matrix.

**Project Type**: Mobile app plus one modular business backend and one independently deployed ingestion application, with two HTTP surfaces served by the same backend.

**Performance Goals**: None beyond accepted domain timing, ordinary bounded waits and correct behavior. No concurrency, latency-percentile, load, capacity or monthly availability programme.

**Constraints**: One backend business writer; no provider call held inside a SQL transaction; current authorization before effects; no automatic ordinary mobile business retries/reconnection replay; single Auth0 tenant with explicit shared-directory limits; manual release; initial mutable Liquibase baseline then data-preserving migrations; 30-minute backups/30-day retention with no backup alerts or recurring verification.

**Scale/Scope**: F13 common foundation and explicit F01/F05/F10/F11/F12/F14 reconciliation. Feature boundaries are semantic responsibilities, not separate services. The shared workspace is implemented; domain modules are added by their owning features.

## Constitution Check

The [constitution](../../.specify/memory/constitution.md) applies. The planning checks passed after the scoped design approvals. These gates remain applicable to implementation; completed checks and remaining qualifications are tracked in the owning tasks.

| Gate                         | Before research / after design                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent | Corrections reside in owners and consumers; this dossier derives from them. No silent change to rights, expiry, provider tolerances or continuity.                                                                                                                                                                        |
| II — Domain integrity        | Responsibility table below and [data model](data-model.md) preserve ownership. No per-feature service split or second entitlement authority.                                                                                                                                                                              |
| III — Design                 | Scoped prototype and Figma approvals are recorded in [F05](../005-accounts-identity/spec.md) and [F12](../013-administration-app-configuration/spec.md), with provisional artwork explicitly retained. Existing approvals remain valid outside the changed scope.                                                         |
| IV — Contract-first          | Canonical roots generate server interfaces and active V2 clients where used; the F14 installed legacy consumer remains unchanged. Shared primitives have no editable plan-local copies. Native `/health` has the owner-approved, narrowly scoped exception below. Runtime qualification remains required before adoption. |
| V — Proportionality          | Ordinary library/platform mechanisms, targeted transport adapter, manual operations; [research](research.md) records alternatives and costs. No speculative infrastructure or performance commitments.                                                                                                                    |
| Inputs and prerequisites     | Current owning specifications, applicable design approvals and official technology sources support this plan. No unresolved upstream prerequisite prevents this scope.                                                                                                                                                    |

Known limits do not waive gates: the Dokploy S3 masking fix must be verified before real V2 credential use; local generated-contract checks are implemented, while provider activation, isolated deployment and restoration still require their owning qualifications. A failed qualification blocks affected adoption rather than permitting an invented fallback.

## Project Structure

### Documentation (this feature)

```text
specs/003-shared-quality/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
├── tasks.md
└── checklists/requirements.md
```

These native Spec Kit artifacts describe the current feature. [Tasks](tasks.md) decompose the plan into dependency-ordered user stories.

### Source Code (repository root)

Current workspace boundaries; feature owners add their domain packages:

```text
apps/
├── backend/                  # Maven application; domain modules and HTTP adapters
├── collector/                # Maven application; source adapters and ingestion client
└── mobile/                   # Expo app and feature-local components/state
contracts/http/
├── mobile/openapi.yaml       # Authoritative mobile surface
├── ingestion/openapi.yaml    # Authoritative collector surface
├── legacy-mobile/openapi.yaml # Historical update read
└── common/                   # Referenced identical technical primitives
```

**Structure Decision**: Maven owns Java modules and builds; npm workspaces own JavaScript packages; Nx invokes ordinary Maven/npm commands. No Nx Expo/Maven plugin or Nx Cloud. Introduce no empty shared package merely for hypothetical reuse. Generated code/bundles go into ignored build outputs; authored contracts/configuration remain tracked.

## Ownership and reconciled dependencies

| Owner                                                                                                                              | Common decision and effect on consumers                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F01](../001-source-acquisition/spec.md) / [F02](../002-sporting-data/spec.md)                                                     | Observation, acquisition, accepted integration and projection remain distinct. Collector submits to backend; never writes SQL. Owners define ingestion identities, outcomes, bounded operations and safe repetition.                                                                                           |
| [F03](../007-sporting-consultation/spec.md), [F04](../008-search-discovery/spec.md), [F06](../009-following-personal-feed/spec.md) | Current visibility applies even to retained/derived data. Preserve accepted navigation/foreground refresh; no global polling. Rebuild keeps usable prior results until complete replacement.                                                                                                                   |
| [F05](../005-accounts-identity/spec.md) / [F09](../006-pro-subscriptions/spec.md)                                                  | Auth0 owns identity; PostgreSQL owns application permissions; RevenueCat SDK retains entitlement authority/cache. No email-based account merge or backend entitlement mirror.                                                                                                                                  |
| [F07](../011-notifications-delivery/spec.md) / [F08](../010-live-contributions-moderation/spec.md)                                 | Owner-defined expiry, authorization and duplicate limits survive retries/restores. Maintenance keeps personal notification creation/purge, suspends new push and does not replay it on reopening.                                                                                                              |
| [F10](../012-reports-feature-suggestions/spec.md)                                                                                  | Private support destination and bounded uncertainty/manual exceptional duplicate handling remain; public repo receives no diagnostics/attachments.                                                                                                                                                             |
| [F11](../004-advertising-privacy-legal/spec.md)                                                                                    | Version legal documents with backend delivery. Backend availability governs access; failed release preserves valid content without independent availability. External public privacy/deletion obligations remain.                                                                                              |
| [F12](../013-administration-app-configuration/spec.md)                                                                             | Complete cold-start access check and explicit retry; no persisted fallback. Three gates suppress in-app legal/support/login routes. Only already usable authorized administrators see the maintenance text entry. Distinct permissions and minimum-version protection remain.                                  |
| [F14](../014-v1-v2-transition/spec.md)                                                                                             | Preserve identities/seniority, purchase continuity, required historical references, certain club-logo associations/bytes and compatible devices under the owning transition specification. V2 requires the accepted new sign-in. Isolate V1 tenant behavior before retirement; no global user/config deletion. |

F13 sets mechanics and qualification obligations; dependent plans choose their actual operations and data shapes within this shared foundation. Reopen a common choice only for a concrete contradiction and reconcile its real consumers before relying on it.

## Runtime, data and consistency

The backend exposes HTTP adapters around application use cases and domain-owned modules. Generated DTOs stay at transport boundaries; JPA entities are not public contracts. Database constraints enforce structural uniqueness/references; application services verify current rights and own transaction boundaries. MapStruct is used for mechanical mappings where useful, not an obligatory model layer.

The collector acquires/parses supplier material independently, then calls the ingestion API. It has no database credentials. PostgreSQL commits backend business changes atomically within the owning use case. Slow supplier/Auth0 calls occur outside SQL transactions; any result applied later must recheck the relevant current state and ownership. Domain plans choose concrete concurrency/version checks and duplicate semantics where required; F13 adds no universal operation ledger, lock service or recovery engine.

Store accepted PNG/JPEG image bytes, metadata and associations in PostgreSQL, with the accepted 5 MiB bound and owner access/erasure rules. Preserve previous usable projections until their replacement completes. Current restrictions still filter retained results; stale or interrupted work cannot overwrite a newer accepted state. Keep useful partial success and use ordinary next runs/manual corrections. No broker, distributed cache, exact-step checkpoint engine or generic job framework. The accepted [F04 search plan](../008-search-discovery/plan.md#projection-lifecycle) uses native OpenSearch generations and a single Spring scheduler for after-commit indexing plus startup/hourly catch-up. It adds no durable recovery queue; one backend instance per environment owns those writes. Search infrastructure is private with verified TLS and native scoped permissions, and is rebuilt from PostgreSQL after restoration rather than independently backed up.

Liquibase XML runs once as a dedicated release job with separate schema credentials. Backend startup uses Hibernate validation and disables SQL initialization; Liquibase is confined to the migration plugin and integration tests, outside the application runtime. While every database is disposable and no version has run in preproduction or production, maintain an evolving initial creation baseline, without an incremental migration file per edit. The first version in either environment freezes it. Subsequent changes are immutable migrations preserving retained data. Editing an already applied baseline does not magically update that database: this task authorizes no reset, volume erasure or checksum clearing.

## HTTP generation, errors and compatibility

The backend provides mobile and ingestion surfaces from canonical OpenAPI YAML 3.0.4 roots. Redocly validates/bundles them; OpenAPI Generator produces Java interfaces, DTOs and the collector client; Orval produces mobile Query functions/types and Zod schemas. A focused Fetch adapter validates business responses before cache admission.

[Interface decisions](contracts/README.md) define the source locations, generation configuration, RFC 9457 errors, request/response validation and compatibility policy. [Research](research.md) explains the selected tools and their concrete limits; [quickstart](quickstart.md#contract-boundary) defines the integrated proof required before adoption.

## Identity, session and mobile lifecycle

Keep the existing Auth0 tenant, with separate production/preproduction applications and environment-specific audiences; ingestion uses its own M2M client/audience/scopes. [F05](../005-accounts-identity/plan.md#identity-and-account-establishment) owns hosted sign-in methods, signup and destructive-operation isolation. No provider secret is embedded in the mobile.

Validate issuer, audience, expiry, allowed client and necessary scopes; authorize every protected operation from current owner rules. Respect F05 token-validity and same-subject return limits instead of promising instantaneous revocation. The shared tenant still has common directory/administrative powers. Test identities must be controlled. The collector reuses its 24-hour M2M token in memory via standard OAuth client machinery; actual expiry is authoritative, with no distributed token store. Observed Free quotas are not future guarantees.

Use the native SDK secure credentials manager and renewal, after the one-time [F14 initialization](../014-v1-v2-transition/plan.md#installation-initialization) on first V2 use. At sign-out/account change, invalidate the session generation, cancel active requests, remove private query data and reject late results from the prior session; local cleanup must remain possible after failed remote logout. Set ordinary business queries/mutations to TanStack Query `networkMode: 'always'` with retries off and the shared bounded transport, so an offline attempt fails rather than waiting to execute on reconnection. Disable implicit focus/reconnection refreshes and remount retries/refreshes; use only domain-approved explicit/navigation/foreground triggers. No offline mutation queue or reconnect replay. Token renewal does not authorize replay of a mutation whose outcome is uncertain.

Retain authorized usable data where permitted, while applying F07 expiry and non-resurrection even offline. F09 SDK cache remains its own accepted entitlement mechanism. F12 always completes the cold-start check or explicit retry before admission; no persistent gate fallback. Its administrative entry starts no interactive authentication; standard native silent renewal remains allowed for an established renewable session. Operators need a usable authorized session before entering maintenance; this accepted limit does not create an emergency console.

## Native UI and approved design

F13 owns the shared native UI foundation under `apps/mobile/src/shared/`; it is not a separate package or a second design catalogue. [FR-034/FR-035 and US6](spec.md#user-story-6--use-the-application-with-the-phones-capabilities-priority-p2) own observable fidelity and system appearance. The approved UI Library supplies foundations and reusable controls; Product Design supplies domain patterns and screen compositions. Exact comparison sources and expected outcomes belong to [quickstart](quickstart.md#native-mobile-and-approved-design), while [research](research.md#native-ui-projection-and-system-appearance) records the technical rationale and native limits.

### Tokens and appearance

Project approved Figma variables, aliases, modes and text styles into typed values in `apps/mobile/src/shared/theme/tokens.ts`, with concise source references beside the implementation. Expose a narrow semantic API with the same role keys in light/dark; keep reference palettes private. Reuse the approved Outfit weights, dimensions, spacing, radii, typography and effects rather than deriving new values from screenshots or exploratory CSS. Bundle Outfit assets under `apps/mobile/assets/fonts/` through Expo's font configuration; qualify actual native family/weight resolution before consumers rely on it.

One `theme-provider.tsx`, composed by `apps/mobile/src/app/_layout.tsx`, resolves system appearance through React Native `useColorScheme`; Expo native appearance is automatic. Use light only if the native scheme is unavailable, without storing a preference or adding a selector. Consumers obtain current semantic values from this one owner, including open sheets and foreground return; avoid remounting forms/navigation to change appearance. Platform and reduced-motion values retain their separate native inputs. F02 owns effective sporting colors and their approved light/dark derivation; Figma Context Color modes illustrate representative divisions, not an exhaustive runtime division palette. F09 alone supplies current Pro eligibility; shared UI receives the needed presentation inputs without importing feature internals or caching entitlement. Unknown, inactive or obsolete-session eligibility supplies no Pro accent. Changing appearance does not change any of these inputs.

### Components, patterns and screens

Use `StyleSheet.create` for stable semantic styles and narrow dynamic token properties where needed, following the existing [React Native skill](../../.agents/skills/react-native-expo/SKILL.md). Keep comparable components structurally consistent, explicit props limited to real approved variants, and ordinary composition visible. No NativeWind, alternative styling engine, duplicated theme resolution, systematic wrappers or generic screen-state engine. Figma's useful component relationships guide reuse; documentation frames, sample content and every visual layer do not become React components.

Shared buttons, fields, sheets, image selection and reused request feedback live in `src/shared/components/`. Implement only the variants needed by active consumers, extending these same components as later slices need approved variants. Feature-local patterns and screens remain under `src/features/`, with thin Expo Router routes: sporting rows/cards/standings belong to F03, guest sign-in composition to F05, notification items to F07 and the support form to F10. Owners compose shared controls and keep their business state, data access and validation. Reuse an identical cross-feature composition through its owner instead of copying it or extracting a speculative universal pattern.

Use one shared in-app image selection/preview/replacement/removal control, corresponding to [UI Library — Structure / Image Field](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=230-489). Feature owners supply labels, multiplicity, validation and removal/restoration meaning. Native selection and provider-owned interfaces retain the [F05 design scope](../005-accounts-identity/spec.md#design-evidence) and [F09 provider presentation](../006-pro-subscriptions/plan.md#entry-offers-and-assistance); URL-only maintenance media remains URL-only.

### Delivery dependencies and qualification

After F13's existing Setup and Foundational tasks, deliver US6 tokens/fonts and theme before their shared component consumers. Build the controls needed for each functional slice, then its owning patterns and screens after their UI and business prerequisites. Keep this work in US6: it does not block unrelated F13 stories and need not wait for backups, observability or final cutover. Neither the entire library nor every native integration proof must finish before the first ready screen. [US6 tasks and dependencies](tasks.md#dependencies--execution-order) express those concrete prerequisites.

Qualify exact Figma states on native iOS/Android builds, including both themes, small screens, text scaling, VoiceOver/TalkBack, reduced motion, reading/focus order, keyboard/safe areas and at least 44 logical-point targets. Reproduce the approved [F12 gate composition](../013-administration-app-configuration/spec.md#session-2026-10-12--f13-planning-reconciliation), including its provisional artwork and retry/store behavior. Record necessary native adaptations with the source node, documented constraint and actual evidence; a material design change returns to the existing approval process. Accessibility is not traded away to force a reference screenshot match. JavaScript behavior tests, visual comparisons and native interaction evidence establish different things.

## Manual delivery and operations

PRs and `develop` run CI only. A merge triggers neither deployment nor EAS builds. A manual “Prepare release” action selects Server, Mobile or Both at an exact revision. Server preparation publishes backend, collector and dedicated migration images to GHCR and qualifies them in preproduction; mobile preparation explicitly builds EAS binaries in addition to local native development. Native workflow results retain source revisions, image digests and build IDs.

After human promotion from `develop` to `main`, verify that source content matches the qualified candidate, then require GitHub production-environment approval. Promote the same image digests without rebuilding. Test the actual production mobile binary in the stores' test circuits and explicitly release that same build. “Blockout Preprod” is a separate native variant, without a runtime environment selector. Server/store releases are non-atomic: backend compatibility lasts throughout distribution. No OTA/EAS Update.

Keep production/preproduction databases, volumes, secrets and configuration separate on the existing VPS. The common host is still a shared failure boundary. PostgreSQL runs independently of the release Compose application. Use Dokploy's custom Compose command to pull candidate images, stop backend/collector writers, run one migration job, then start services and wait for real health checks. Repeat project/file/env arguments on each command member; ordinary `&&` prevents startup after migration failure. Serialize deliveries without cancelling an active migration. Manually enable maintenance before delivery and lift it after checks; CI has no F12 administration rights. First-environment preparation follows [F12](../013-administration-app-configuration/plan.md#production-preparation): establish the owner normally and grant permissions before public V2 publication, then enable maintenance if opening is deferred. This is not a startup reset of existing settings.

A failed migration leaves the planned restart blocked; no automatic SQL rollback or volume deletion. An older image may be restored only if compatible with current schema/data, otherwise use documented repair or restoration. F14 does not require return to V1 after V2 opens.

Structured Spring/SLF4J logs and ordinary HTTP/JVM/PostgreSQL-pool metrics flow through Alloy to Grafana Cloud Free; logs retain 14 days. Exclude personal data, tokens, secrets, attachments and raw supplier documents, including URLs, labels and error messages. The sole exception is [F05 manual cleanup](../005-accounts-identity/plan.md#erasure-and-manual-resolution): necessary original-target references in protected logs, never metric labels or Discord notifications. Native log alerting observes recorded failures; interruption after local commit but before logging may remain undetected, without a durable deletion record. Domain observations expose useful scope/stage/outcomes and latest successes without treating acquisition as complete integration. Never-run, awaiting eligibility, paused, active, completed, failed and uncertain outcomes remain distinguishable through owner data/ordinary telemetry, not a universal incident table.

One external European Grafana probe per environment checks minimal API-and-database health: production every minute, preproduction every five minutes. Use the native Spring Boot Actuator readiness group on the main API port at `/health`, combining application readiness and the database check, with only the aggregate status exposed. The [health boundary](contracts/README.md#native-health-boundary) owns the native configuration and public access limits. Expected maintenance does not mask application/database failure. Alert evaluation distinguishes expected pauses/maintenance from actual failure; no-data is not healthy. Native alerts reach private Discord with useful grouping and five-day reminders for unchanged conditions; group changes can notify sooner. Resolved means the condition ended, not proven business recovery. The operator checks affected results and latest successes, intervening according to availability.

Sentry Free captures JavaScript errors/native crashes with sourcemaps. Disable replay, tracing and profiling; scrub native/JS events, URLs, query strings, messages and breadcrumbs. Free plan limits are current constraints, not an authorization to buy or enable paid capabilities.

## Backups and recovery

Native Dokploy PostgreSQL logical backups run every 30 minutes to a private V2 S3 destination outside the VPS, separated by environment. Store required image bytes with the same database copy. Use SSE-S3 and scoped access; S3 lifecycle expires copies after 30 days, asynchronously. Disable count-based Dokploy retention. No versioning, replication, custom cleanup, backup notifications, Grafana tracking or scheduled verification.

The operator may inspect Dokploy/S3 manually when in doubt. Schedule/file presence proves no restorability. A failed schedule can remain unnoticed. Perform one initial isolated manual restoration before relying on V2 protection; recover data, image bytes/associations and intended roles/grants (logical dumps do not preserve all ownership/ACLs), identify gaps and record observed duration without an SLA.

Before any real restoration reopens access or sends, apply current erasure, rights and expiration obligations; absent evidence keeps affected capabilities unavailable. Reconstruction only recovers what current suppliers still expose. F14 must separately preserve club-logo bytes/associations before any authorized reset, resolve only certain identities and retain unmatched cases. No export or reset is executed here.

Dokploy 0.30.8 has a statically verified S3 credential-redaction defect across command/error paths. Disabling notifications does not fix internal logs. Verify a corrected version before using real V2 credentials; no fork or workaround is selected. This blocks affected activation, not this dossier.

## Coverage and validation boundary

| Applicable requirement / outcome             | Plan coverage and future proof                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-004–005, FR-008; SC-002                   | Owner transactions, preserved usable projections, honest stage outcomes, bounded waits; domain freshness/rebuild/uncertainty scenarios.          |
| FR-009–014; SC-004                           | External probe, ordinary diagnostics, native alerts, privacy filtering and manual intervention; failed stage/host/no-data and recovery checks.   |
| FR-015–019; SC-005                           | Token and business checks, session isolation, no replay; refusal without side effects, old-session and wrong-environment tests.                  |
| FR-020–021                                   | Domain rebuild replacement/partial success/current restrictions; interrupted and stale-work scenarios.                                           |
| FR-022–028; SC-006                           | Native independent backups, retention, initial isolated restore and compatible rollback; restore bytes/associations/rights and failed migration. |
| FR-029–031; SC-007                           | French native phones, accessible approved states and explicit business retries; device/accessibility/lifecycle checks.                           |
| FR-032; SC-008                               | F14 logo retention and certain-identity reassociation; no missing file treated as retention proof.                                               |
| FR-033                                       | Shared image control across profile, sporting editors and support; verify selection, replacement and removal with each owner’s constraints.      |
| FR-034–035; SC-009                           | Native UI projection, system appearance and owner composition; A23/A24 compare exact approved states and live theme changes on both platforms.   |
| Withdrawn FR-001–003, FR-006–007, SC-001/003 | Excluded; no performance/capacity or monthly availability qualification is reintroduced.                                                         |

[Quickstart](quickstart.md) defines the validation scenarios. Delivery follows [AGENTS.md](../../AGENTS.md#git-delivery).

## Complexity Tracking

The owner approved one exception to constitution IV's generated HTTP server-interface requirement: read-only operational `GET /health` uses Spring Boot Actuator directly. Its native group configuration satisfies application/database readiness without a custom controller, DTO, adapter or unused generated mobile client. Spring Boot remains the contract authority; Grafana consumes the native status. The exception covers only this supervision endpoint, with public details disabled and qualification in [quickstart](quickstart.md#delivery-and-operations). All domain APIs and the historical compatibility API retain their canonical OpenAPI generation requirements.

The two deployments, generated domain contract chain and focused Fetch adapter have concrete current responsibilities; research records the simpler alternatives and their limitations. No additional architectural layer is justified by hypothetical growth.
