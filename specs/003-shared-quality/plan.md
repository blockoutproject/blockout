# Implementation Plan: F13 shared foundation, operations and quality

**Planning branch**: `develop` under the documentation-only initialization policy; Spec Kit context `003-shared-quality`.
**Date**: 2026-10-05. **Specification**: [spec.md](spec.md). **Issue**: [#18](https://github.com/blockoutproject/blockout/issues/18).

## Summary

Define the shared foundation for the approved Spring, Python and Expo rebuild: reproducible contracts, bounded requests, authorization/session isolation, useful diagnostics and standard manual operations. Protect PostgreSQL through Dokploy and irreplaceable S3 images through AWS Backup. Preserve domain-owned freshness, identity, privacy and recovery rules.

This delivery contains documentation and future implementation tasks only. It does not initialize applications, install dependencies, access production, configure providers, generate implementation issues or execute the transition. Owner acceptance of this dossier and the global planning gate under [#9](https://github.com/blockoutproject/blockout/issues/9) precede runtime implementation.

## Technical context

| Boundary          | Selected baseline                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace         | Nx 23, Node.js 24 LTS, npm; explicit native-tool targets, no Nx Cloud or experimental Maven plugin                                         |
| Backend           | Java 25 LTS, Spring Boot 4.1, MVC/Security; Spring Modulith 2.1 verification only                                                          |
| Data              | PostgreSQL 18, Spring Data JPA; Liquibase Community 5 XML in a separate deployment step                                                    |
| Search            | OpenSearch 3.9; rebuildable projection, never sporting authority                                                                           |
| Collector         | Python 3.14, uv, HTTPX, lxml, CSV, APScheduler 3; no direct SQL                                                                            |
| Mobile            | Expo 57, React Native 0.86, React 19.2, Expo Router, TanStack Query, React state/Context, React Hook Form/Zod                              |
| Contracts         | OpenAPI 3.0.3; OpenAPI Generator Java/Python, Orval/Zod TypeScript                                                                         |
| Tests             | JUnit/Spring, Testcontainers PostgreSQL/OpenSearch, pytest, Jest Expo/React Native Testing Library, targeted native checks                 |
| Operations        | Hostinger/Dokploy, GHCR, AWS S3/Backup, Alloy/Grafana Cloud Free/IRM, Discord, Sentry Free, EAS Build/Submit initially Free                |
| Platforms         | iOS/Android phones; selected minimum iOS 16.4/Android 7 subject to native qualification; no web or dedicated tablet experience             |
| Scope             | One backend and collector per environment; shared VPS, separate preproduction/production containers, volumes, databases and secrets        |
| Performance goals | None: no load tests, benchmarks, capacity studies, latency/concurrency targets or monthly availability accounting, including deferred work |

These are selected generations, not installed or qualified versions. Initialization locks compatible stable patches, npm/uv lockfiles, Maven Wrapper/plugins and image digests. A failed compatibility qualification blocks the boundary; generation changes require a decision. Auth0 and RevenueCat remain selected; no Logto migration is planned.

## Constitution check

| Principle                     | Before/after-design application                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification-led intent  | [Cross-feature inputs](cross-feature-inputs.md) assign consumed rules to accepted owners; no V1 runtime/model copied as target authority     |
| II — Domain integrity         | One resource owner, explicit module APIs and mappings; no universal job, receipt or identity database                                        |
| III — Design-ready interfaces | No new screen/journey here; exact approved designs remain binding, material changes require revalidation                                     |
| IV — Source-first contracts   | [API contract](contracts/api.md) specifies reproducible generation and all-consumer validation; generated outputs stay outside Git           |
| V — Verifiable simplicity     | [Research](research.md) records need, choice, simpler alternative, consequences and verification; standard tools/manual intervention suffice |

No constitutional exception is requested. Apply constitution 5.0.0; preserve skills and official Spec Kit imports byte-for-byte. This dossier does not authorize further constitutional changes. Follow [repository guidance](../../AGENTS.md#planning-only-initialization-history), removing the planning bypass before executable changes.

## Project structure

### Documentary feature

```text
specs/003-shared-quality/
  spec.md
  plan.md
  research.md
  cross-feature-inputs.md
  data-model.md
  contracts/{api,mobile,delivery,operations}.md
  quickstart.md
  checklists/foundation-design.md
  tasks.md
```

### Future implementation destinations

```text
package.json, package-lock.json, nx.json
apps/backend/         # one Maven project; com.blockout module ownership
apps/ingestion/       # uv project; blockout_ingestion package
apps/mobile/          # Expo src/app, owned features and shared boundaries
contracts/public/    # public OpenAPI sources
contracts/internal/  # collector OpenAPI sources
contracts/shared/    # only genuinely shared technical schemas
contracts/tooling/   # generator configs and synthetic qualification fixtures
infra/local/         # one PostgreSQL/OpenSearch Compose file
infra/dokploy/       # executable deployment, migration and protection configuration
infra/observability/ # Alloy/Grafana and sanitized provider instructions
docs/development.md # shared setup and local verification, once executable entry points exist
docs/operations/    # concrete shared operator procedures required by tasks
.github/workflows/   # verification, server delivery, manual EAS action
```

These are task destinations, not directories to create under #18. Create shared packages only for identical reused meaning with a concrete owner; no empty business modules. Shared procedures use `operate-environments.md`, `configure-database-backups.md`, `configure-image-backups.md` and `restore-service.md` under `docs/operations/`, following `project-documentation` only when concrete maintained instructions exist. Executable truth stays in configuration/scripts; feature qualification remains in this dossier's quickstart and owning contracts. Local READMEs may orient readers without duplicating these shared instructions.

## Design and ownership

### Workspace and contracts

Nx wraps Maven Wrapper, uv and npm with explicit source/configuration/lockfile inputs, generated outputs and dependency edges. Consumer builds/tests depend on generation. Deterministic builds/generation may use local cache; deployment, provider checks, publication and stateful integration tests do not. No remote cache service.

Every code change verifies all applications/contracts. Documentation-only classification uses an explicit prose-path allowlist; lockfiles, workflows, contracts, build configuration and unknown paths trigger full verification. The required `verify` job always reports a result. The [delivery contract](contracts/delivery.md) defines future commands and ordering.

Public `/api/v1` and private `/internal/v1` version APIs independently of the V2 product name. Feature plans own operations, pagination, business codes and schemas. F13 owns problem format, authentication transport, generated validation and compatibility. Use synthetic qualification fixtures outside production sources until real features provide operations; do not invent a product endpoint to demonstrate a client.

### Correctness and isolation

Spring modules retain approved ownership. Cross-module workflows use explicit application coordination and one coherent local transaction; no provider HTTP inside SQL transactions. SQL uniqueness protects identity; intent versions and targeted locks belong to the affected operation. Python only uses authenticated internal HTTP and has no database credential.

F13 supplies security defaults, safe errors and session-safe transport. F05 owns actual accounts/Auth0 lifecycle; F09 owns RevenueCat correspondence and rights. Email and client-provided RevenueCat IDs are not identity/right proofs. Resource/action checks run server-side; UI hiding is insufficient.

F02/F04 own indexing and complete replacement publication; F13 requires failure visibility, retained usable results and current visibility enforcement. No generic workflow engine, event bus, receipt/retry ledger or distributed transaction framework. Tasks requiring domain behavior explicitly depend on that owner's approved implementation.

### Mobile

The [mobile contract](contracts/mobile.md) fixes read attempts at 10 seconds, one eligible retry after one second, mutations at 30 seconds and uploads at 60 seconds. Exactly one retry layer. Uncertain actions remain uncertain; offline is not empty/success. Account changes invalidate private cache and delayed responses. No persisted query cache, offline action queue or full offline mode.

Use French Blockout text, faithful source names and domain date semantics. Shared controls expose name/role/state, 44-logical-point touch targets, readable scaled text, coherent focus and reduced motion. Feature-specific approved states remain authoritative; no replacement screens are designed here.

### Environments and delivery

Applications run natively on developer machines; Compose supplies PostgreSQL/OpenSearch. SaaS integrations use separate test configuration, not local clones. Secrets stay outside Git and mobile public configuration.

Validated `develop` builds immutable server images and starts preproduction; the operator may stop it with targeted alert silencing. An explicitly authorized merge to `main` promotes the same qualified images after source/digest verification, without rebuild or a second deployment approval button. Liquibase failure stops rollout. Stop the previous task-running instance before activating its replacement; short interruptions are accepted. Rollback is manual and schema-compatible only.

Mobile preview uses a distinct app identity/preproduction API with on-demand Android APK/iOS ad hoc distribution to the owner's devices. Production candidates use a manual GitHub EAS Build/Submit action from validated `main`, into TestFlight/Play internal testing. Public release is manual, with no OTA. F12 owns separately chosen platform minimum versions after actual store availability is verified.

### Operations and recovery

The [operations contract](contracts/operations.md) owns safe fields, signal semantics, retention, thresholds and manual procedures. Group important incidents by environment/problem/stable scope. Only positive same-scope recovery closes them; pause, telemetry disappearance or another scope's success never does.

External HTTPS checks run every minute with a five-minute failure condition. Native tools signal confirmed backup-job problems; there are no backup absence-of-success thresholds and silent scheduling stops may go unalerted. Integration/reconstruction failures alert on confirmation; F01 opens on the first failed competition cycle. Separate Discord channels, one grouped opening and positive-evidence recovery via IRM, no reminders. Otherwise resolve manually in existing tools; exceptional transport duplicates remain possible.

Dokploy backs up PostgreSQL every 30 minutes into private S3, with age-based expiry at 30 days even without a newer copy. Failed new jobs never delete older copies early. AWS Backup hourly periodic jobs protect retained S3 images for 30 days without changing public URLs. Verify regional price, object count, versions and operations before activation; reported active volume below 10 GB is not a cost cap.

Restore in a closed environment from independent copies with original storage unavailable. Check file bytes/associations, current identity/rights/erasure and F07 purge obligations before access or sends. GitHub attachments stay under F10. F14 owns the real logo inventory/transition; no reset, name-only association or missing-file report counts as preservation.

## Sequence and qualification gates

1. After implementation authorization/global planning acceptance, freeze initialization history and initialize locked builds/Nx, infrastructure and contract tooling.
2. Deliver bounded transport, security/session integration points and diagnostics; qualify synthetic fixtures without creating artificial domain APIs.
3. Deliver deployment configuration, operator signals, backups and native build configuration. Provider mutations need the owning implementation's authorized operational scope.
4. Integrate checks with each domain when its implementation is available. Exercise restore and provider/native journeys before enabling dependent capabilities.
5. Complete acceptance evidence without representing documentary review as runtime success.

| Gate                | Required evidence                                                                                                                                                                 | Failure behavior                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Generators/versions | Locked stable versions; request/response/enum/date/error cases through all consumers                                                                                              | Block the boundary; no generated-client fork or silent generation change                                                             |
| Dokploy outcomes    | Complete dump/upload success and failure through native job signals/history; document whether a silently stopped schedule produces any signal, without requiring an absence alert | Protection unqualified if completed protection cannot be established; silent scheduling stops may go unalerted, no custom supervisor |
| Grafana/IRM         | External failure, missing telemetry, grouping, recovery, maintenance and transport limits within Free quotas                                                                      | Correct standard configuration or return for a decision; no paid upgrade                                                             |
| AWS images          | Actual restored bytes, hourly periodic job notifications/history, retention/erasure and cost                                                                                      | Do not rely on protection or execute destructive transition                                                                          |
| Native/providers    | Both platform builds and required auth/purchase/push/consent/accessibility journeys                                                                                               | Block the affected capability; browser/Jest evidence is insufficient                                                                 |
| Restore/rollback    | Schema compatibility, files and present obligations before reopening                                                                                                              | Stay closed; repair/compatible restore, no automatic SQL reversal                                                                    |

## Validation strategy

[Quickstart](quickstart.md) separates current documentary checks from future runnable scenarios. Tests protect behavior/boundaries, not code spelling or arbitrary coverage percentages. [Tasks](tasks.md) retain all seven story identifiers; US7 precedes US6 because US7 is P1 and US6 is P2.

Apply the official requirements-quality checklist and read-only cross-artifact analysis after task generation. Checklist state is reviewer-owned, distinct from implementation completion. Future evidence identifies artifact, environment/platform, passed/failed/skipped/unavailable result and limits in owning GitHub work, not a parallel repository status log.

## Complexity tracking

No exception. Standard services, explicit adapters and useful domain state suffice. No performance/capacity program, monthly availability accounting, recovery platform, extra identity provider or speculative shared framework.
