# F13 build, environment and delivery contract

**Trace**: constitution IV/V, F13 FR-014, FR-017, FR-028–FR-031; approved architecture and owner delivery decisions.

## Future command surface

The following are planned commands to create during implementation, not commands installed by #18.

| Entry point                                          | Required behavior                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm ci`                                             | Reproduce committed JavaScript dependencies without updating the lockfile                                |
| `npm run contracts:verify`                           | Lint/bundle, generate twice reproducibly, compare breaking changes and exercise all generated consumers  |
| `npm run backend:verify`                             | Maven Wrapper verify including targeted Spring/Modulith and PostgreSQL/OpenSearch Testcontainers tests   |
| `npm run ingestion:verify`                           | uv frozen sync, Python lint/type checks and pytest including generated-client import/validation          |
| `npm run mobile:verify`                              | Formatting/lint, TypeScript, Jest Expo and Expo export; Expo Doctor for dependency/configuration changes |
| `npm run verify`                                     | Full contract/backend/ingestion/mobile graph plus documentation checks, not Nx affected                  |
| `npm run infra:up` / `npm run infra:down`            | Start/stop the simple local PostgreSQL/OpenSearch Compose without deleting volumes                       |
| `npm run backend:dev`, `ingestion:dev`, `mobile:dev` | Run applications natively through Maven, uv and Expo respectively                                        |

Root npm scripts delegate to explicitly named Nx projects `contracts`, `backend`, `ingestion`, `mobile`; Nx targets invoke native commands. Generation precedes dependent consumers. Inputs include contracts, generator config/version, source, runtime config and lockfiles; outputs name generated/build directories. Cache deterministic builds/generation locally; never cache deployments, provider checks, restore or stateful integration qualification. No Nx Cloud.

Java uses one Maven project and wrapper; Python one uv project and lockfile; npm owns JavaScript. Do not import V1 manifests, scaffold speculative libraries or install extra services. Local infrastructure versions match selected deployed generations, with persistent local volumes and explicit example configuration without secrets.

## CI classification and permissions

All code-affecting changes run every application and contract check. Only an allowlist of documentation prose paths may take documentation-only verification; unknown files, contracts, skills affecting executable guidance, workflows, lockfiles, build/runtime settings take the full path after initialization. Always expose one completed required `verify` result. Contract diff tests use representative supported release baselines as well as current consumers.

PR workflows have read-only permissions and no provider/deployment credentials. Trusted branch delivery gets minimum GHCR/deployment permissions after verification. Pin third-party actions by full commit SHA and tool versions; preserve the main promotion-source restriction. Never expose secrets to fork PRs or cache/artifact contents. There is no automated publication from a PR.

Before the first executable change, remove the owner's force-push actor bypass and enable administrator enforcement on both branches, preserving other protections; verify settings before implementation. Documentation-only delivery follows the existing single-root policy until then.

## Server artifact promotion

1. Successful full verification on `develop` builds and publishes the backend and collector images once, pinned by digest. Include the migration execution capability with the corresponding backend artifact.
2. Record source revision, complete source-tree identity, both image digests and qualified build configuration as non-secret release metadata. A merge commit SHA need not equal the original build SHA; compare source content and recorded lineage, not just branch names/tags.
3. Deploy those digests to preproduction and check migration outcome/readiness. Preproduction is automatically started and remains on until manual stop. Do not replace a candidate during an active manual test; identify the tested revision and avoid pushing during that test, without a custom test-lock service.
4. A human-authorized same-repository `develop` promotion merge to `main` runs verification, selects the recorded corresponding candidate and confirms exact source/digest correspondence and successful preproduction deployment. If absent, stale or mismatched, stop; never rebuild a different image as an implicit substitute.
5. Automatically deploy the selected digests to production. No second manual deploy button. A manual production promotion PR is the review point; native/store release remains separate.
6. Use a per-environment deployment concurrency group and avoid cancelling a migration already running. Abort a queued obsolete delivery before mutation. Serialize migration/application replacement.
7. Documentation-only changes trigger no application delivery. Each new application delivery builds and qualifies a candidate matching the complete sources to promote on `develop`; promote those same qualified digests on `main` without rebuilding. There is no old-candidate reuse optimization based on a proof that only documentation changed.

Deployments use separate configuration/secrets for preproduction and production on the same VPS. Database/search/management/internal API ports are private. There is no HA claim. Preproduction containers, volumes and technical credentials are separate; stopping it must not stop shared proxy/production operations.

## Database migration and rollback

Use a distinct Liquibase job with migration credentials, never Hibernate schema mutation or application-startup migration. Verify a usable backup/protection state before a risky retained-data change; owning feature plans define compatibility/data transformations. Apply migration before replacing the serving application only if compatible with the still-running version; otherwise stop affected traffic/work first under documented maintenance.

Migration failure stops rollout. Do not launch the new task runners or automatically reverse SQL. Stop the old collector/backend task-running instance before the new one starts; no double scheduling. Readiness is not liveness: do not create container restart storms for a provider outage.

A rollback uses a previously recorded digest and explicitly verified compatibility with the present schema/contracts/configuration. When incompatible, remain in maintenance and repair forward or follow the closed restore procedure. A software rollback never claims to reverse user data.

## Configuration and secrets

| Location                       | Contents                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Versioned examples             | Names, types, safe defaults, purpose and required/optional status; no real host identifiers or credentials |
| Local ignored config           | Developer DB/internal-service/test-provider values                                                         |
| Dokploy environment            | Runtime DB user, private endpoints, Auth0 verification config, domain-specific provider credentials        |
| Migration job                  | Separate database migration identity; not mounted into normal runtime/mobile                               |
| GitHub protected configuration | GHCR/Dokploy and EAS automation credentials available only to trusted delivery                             |
| EAS public app config          | API endpoint, public app/provider identifiers and release environment; never service secrets               |
| Provider consoles              | Alert webhooks, backup/IAM configuration, native signing/store credentials with minimum access             |

Reject missing mandatory startup configuration with a sanitized name/category, not its value. Document rotation/redeployment and effect on in-flight work; no new secret-management platform.

## Mobile delivery

Manual `workflow_dispatch` against validated `main` invokes standard EAS Build with auto-submit for selected platforms, production profile and fixed source revision. Submit to TestFlight/Google Play internal track. If submission alone fails, use standard EAS Submit with the existing build ID, not mandatory rebuild. Do not add custom polling/retry orchestration. Check current Free quotas; paid upgrades require an explicit decision.

Preview builds use the separate configuration in [mobile contract](mobile.md). Store rollout and each platform's minimum-version change are human decisions. F14 owns production app identifier continuity and first V2 cutover; no new store listing assumed.

## Acceptance

Clean checkout and frozen generation/build; full checks for a changed shared contract; no secret on PR; source/digest mismatch rejected; migration failure stops rollout; one task-running instance; old-version schema compatibility checked; preview/prod binary separation; manual native candidate submission; blocked or unavailable checks explicitly reported.
