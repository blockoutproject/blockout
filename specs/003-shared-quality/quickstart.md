# Quickstart: validate the F13 foundation

**Scope**: [plan](plan.md), [contracts](contracts/README.md), [data ownership](data-model.md).

## Prerequisites

These scenarios validate the future implementation. The production workspace and run commands do not exist yet; use the actual Maven/npm/Nx targets when the authorized implementation provides them. Documentary checks are listed in the [README](../../README.md#verification).

Use the selected dependency versions, isolated test data and the required test environments/devices. Record resolved versions, image digests, build IDs and actual results in the relevant test or delivery tools. [Research](research.md) identifies documented capabilities and remaining qualification limits; the owning [F05](../005-accounts-identity/spec.md) and [F12](../013-administration-app-configuration/spec.md) specifications reference the approved experience.

## Contract boundary

With the canonical roots and selected generator configuration present, lint and bundle each root using Redocly; generate backend interfaces/DTOs, collector RestClient and mobile Query/Zod output at the same revision. Run owning Maven compile/tests and mobile typecheck/Jest targets; regenerate from a clean output directory and compare normalized results. Expected: reproducible output, no generated source committed, no template patch and all actual consumers compile.

Exercise the actual HTTP entry/decoding path, not only schemas in isolation: required/optional/nullable/empty values; nested unknown request rejection; additional response tolerance; wrong types, unknown enums and dates; safe Problem Details; malformed/partial JSON; 204/non-JSON; cancellation and bounded timeout. Expected: malformed business responses never resolve as success or enter Query cache, and valid response validation runs once. Inspect Orval schema passing and Java Bean Validation/Jackson behavior. A required unsupported shape blocks adoption until a supported path is proven; never replace this with a cast or silent weakening.

## Authorization and session

Use controlled visitor, ordinary, authorized and different-owner identities across both environments. Call protected operations directly with missing/expired/wrong-issuer/wrong-audience/wrong-client/scope-limited tokens. Expected: missing or invalid credentials return 401 with a Bearer challenge; authenticated client/scope/permission refusals return 403, with no prohibited business effect or disclosure. Keep F05's explicitly accepted token-validity limits and F09 SDK entitlement authority; do not test invented instantaneous global revocation.

Delay account A's response; sign out or switch to B; deliver the old result after attempted cancellation. Expected: A's private state cannot enter B's cache or become usable. Fail remote logout and verify local cleanup. Lose a mutation response, renew credentials or reconnect network: no automatic mutation replay. F03 accepted explicit/navigation/foreground refresh still works, and F07 expiration applies without network.

## Native mobile and approved design

Build native iOS/Android development and release variants with the selected SDKs. Run Jest Expo/React Native Testing Library for behavior and the [F05 native authentication qualifications](../005-accounts-identity/quickstart.md#authentication-and-isolation) for the selected environment connections, token isolation and session lifecycle. Verify the actual Android floor and all native dependencies; iOS 16.4 is the accepted minimum, not proof every dependency builds.

At cold start and explicit retry, fail admission and verify each gate stays closed without persistent fallback. Maintenance/unavailable show approved bands, provisional local placeholder before title and token-sized Lucide retry. Required update keeps the store action/minimum; failed handoff permits explicit retry using ordinary feedback. No sheet/help/legal/login route or direct bypass on any gate. Only an already usable authorized administrator sees the maintenance text link; a session requiring interactive authentication prevents entry, while native silent renewal remains allowed. Maintenance does not stop collection; notification creation/purge continues, new push is suspended and not replayed on reopening.

Qualify VoiceOver/TalkBack, reading/focus order, names/roles/states, large text and scrolling, contrast, 44-point targets and reduced-motion static bands in both themes. Expected: complete readable essential content/actions; no clipped retry glyph. Browser/Figma evidence does not replace native testing or supplier qualification.

## Data and schema

Use Testcontainers PostgreSQL 18.6 and synthetic fixtures to create the initial baseline, exercise constraints/mappings and prove backend validation-only startup. Collector has no database write credentials; backend has no schema-change privilege. Demonstrate that a slow external call is outside the SQL transaction and stale work cannot bypass owner restrictions.

Exercise the [schema lifecycle](plan.md#runtime-data-and-consistency): initial creation from the baseline, then data-preserving migrations once it is frozen. Verify recovery and compatible previous images without resetting retained data. Exercise owner-defined interrupted rebuilds and partial success: prior usable state survives until full replacement; current restrictions always apply; normal reruns preserve accepted results without a new recovery ledger.

## Delivery and operations

In isolated preproduction, prepare an exact server candidate, enable maintenance using an already usable authorized operator session, pull its images, stop both writers, run Liquibase once and start/wait for health. Deliberately fail a harmless migration fixture: startup must remain blocked, database volume unchanged and no cancellation/automatic rollback. Prove deployment serialization. Promote identical digests after source-content matching and required human/environment approval; never rebuild for promotion.

Qualify the actual production mobile build in store testing and release the same build only with explicit authorization. Preproduction variant evidence is not production-binary proof. Demonstrate compatibility with admitted older mobile clients while store distribution is incomplete.

From outside the VPS, verify API/database loss and missing data are detected at the configured cadence, while minimal public health reveals no diagnostics. Exercise native private Discord firing, grouped reminder policy and resolution. Expected: resolution is not reported as business recovery without useful stage/scope outcomes. Check never-run, paused, partial, failed and unknown execution states. Inspect harmless telemetry fixtures against the narrow [F05 private cleanup-reference exception](../005-accounts-identity/quickstart.md#erasure-and-return) and all remaining secret/PII/raw-payload exclusions in logs, labels, URLs, breadcrumbs and JS/native Sentry events. Verify sourcemap symbolication with replay/tracing/profiling disabled. No test establishes a monthly availability guarantee.

## Initial restore and activation condition

Before real V2 S3 credentials, verify a Dokploy release that fixes the known command/error/log masking paths. The inspected 0.30.8 implementation is not acceptable proof. Use safe dummy values for verification; no fork, custom sanitizer or notification-only workaround is selected.

After authorized configuration, inspect native 30-minute scheduling, environment separation, private access, SSE-S3 and 30-day S3 lifecycle; count-based cleanup remains disabled. Perform the one initial manual restore into isolation. Compare representative business accounts, permission associations, application settings, PNG/JPEG bytes and associations; verify separately required database access/provider configuration; rebuild derivatives and document gaps/observed duration. A listed object or active schedule alone fails this proof.

For every actual restore that will reopen access/sends, reconcile current erasure, rights, expiration and F07 announcement rules first; unavailable evidence keeps affected capabilities closed. F14 additionally requires retained logo files/associations and certain matches before any separately authorized transition reset. No recurring restoration drill, backup alert/dashboard or periodic verification is added.
