# Implementation Plan: V1-to-V2 transition

**Branch**: `tech/55-v1-v2-transition` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [#55](https://github.com/blockoutproject/blockout/issues/55) and the owner-approved preparatory plan. This delivery formalizes transition decisions, the legacy contract and scoped specification/design reconciliation. It executes no migration, product implementation or provider configuration.

**Status**: Prepared for planning review. The common discovery prototype is approved and its faithfully reconciled Figma scope is covered by the owner's explicit advance approval. Native/provider qualifications remain future release prerequisites.

## Summary

Preserve Auth0 identities, applicable Pro rights and manually maintained club logos while rebuilding the V2 business database. Reuse the production store/EAS identities and lower the existing monthly subscription to 1.99 EUR through native store pricing. All installations receive common skippable discovery and explicit first V2 sign-in. Prepare and qualify V2 while V1 remains public, then retire old business operations only after both stores distribute V2. Keep a single compatible old-client status read, without a lasting V1 runtime or automatic migration/recovery system.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1, TypeScript / Expo SDK 57 / React Native 0.86 / React 19.2.3, from [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Auth0 native SDK from [F05](../005-accounts-identity/plan.md), RevenueCat/store integration from [F09](../006-pro-subscriptions/plan.md), Expo-compatible AsyncStorage for non-sensitive installation flags, EAS native build/signing and F07 Expo Push configuration. Executable versions are pinned in `apps/mobile/package.json`. Existing PostgreSQL/JPA, F01 acquisition and F04 projection. No new service or migration framework.

**Storage**: V2 PostgreSQL under the owning models; private temporary preservation of indispensable V1 references and club-logo files. Providers retain identities and purchases. No replicated business database, generic migration table or persistent application cache.

**Testing**: Existing JUnit/Spring MVC/Testcontainers and Jest Expo/React Native Testing Library; actual signed iOS/Android upgrade and provider qualification. Current repository checks cover documentation and OpenAPI only.

**Target Platform**: Existing production app identities on iOS 16.4+ and Android API 24+ subject to the selected dependencies' native qualification; existing VPS/Dokploy deployment under F13. Older iOS support and a dedicated compensation process are outside scope.

**Project Type**: Existing modular backend, collector and native mobile, with a one-time manually controlled transition.

**Performance Goals**: No added throughput, capacity, availability or maintenance-duration objective. Preserve actual source-cycle, transaction and provider timing constraints.

**Constraints**: No loss of indispensable continuity evidence; no email identity matching; no import notification burst; no old writers after cutover; current privacy obligations before restoration. No provider mutation, real-data export, application runtime or tasks in this delivery.

**Scale/Scope**: One transition, the current sporting season and three completed seasons, both stores and the actual existing subscriber/identity categories.

## Constitution Check

The approved initial product baseline permits this scoped planning feedback loop. Post-design review confirms the following boundaries. The owner's explicit approval timing instruction is recorded in [Design reconciliation](#design-reconciliation).

| Principle         | Application                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | F14 owns transition outcomes. F05 onboarding and session references, F09 pricing, F11 onboarding dependency and F12 admission are reconciled in their current texts.                                        |
| II — Ownership    | Identity, entitlement, sport, push and access remain with F05/F09/F02/F07/F12. F14 coordinates their transition without duplicating their models.                                                           |
| III — Design      | Prototype approved; faithful Figma translation verified within the owner's explicit advance approval. Existing approvals remain valid for unchanged journeys. See the scoped timing instruction below.      |
| IV — Contracts    | One canonical legacy status root preserves the already distributed wire contract; existing V2 roots remain authoritative for ordinary use. Server generation and actual V1 compatibility remain to qualify. |
| V — Simplicity    | Native providers, a manual logo freeze, ordinary store release controls and one compatibility read. No identity migration engine, incremental image synchronization, dual writes or automatic rollback.     |
| Prerequisites     | Native issue blockers #47, #50, #53 and #54 are closed. Future release prerequisites are explicit in the sequence below and in quickstart; documentary completion does not satisfy them.                    |

## Project Structure

### Documentation

```text
specs/014-v1-v2-transition/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/README.md
└── quickstart.md
```

### Source code (planned, not initialized)

```text
apps/backend/                         # existing owners and legacy status adapter
apps/collector/                       # existing controlled reconstruction
apps/mobile/                          # installation initialization and common discovery
contracts/http/legacy-mobile/openapi.yaml
```

The legacy root describes one boundary of the same backend. It creates no deployable, editable contract copy or generated client for V1 binaries that are already distributed. F13's Redocly/OpenAPI Generator chain produces the server interface/DTO; active V2 clients continue to use their existing roots. No migration application is scaffolded.

## Installation initialization

Before mounting Auth0Provider, read a stable V2-initialized marker from ordinary Expo-compatible AsyncStorage. If absent, call the native Auth0 Credentials Manager's `clearCredentials`, then persist successful initialization. Mount the provider only after both operations succeed. Absence of credentials is a normal case; an interruption before marker persistence safely repeats initialization. A failed clear/write does not admit the old session; ordinary error/retry and guest access remain available under F12. The public F12 check is independent and can run in parallel.

The initialization function accepts the application's SDK client and shares an in-flight promise across repeated mount attempts. After clearing, it rejects initialization if `hasValidCredentials()` still reports resumable credentials. This is an additional check, not confirmation of deletion: the installed iOS bridge can resolve `clearCredentials()` after a failed deletion and report `false` when reading the Keychain fails. Temporary Keychain unavailability and recovery remain unverified until T012's native qualification. Both calls use the SDK's public API; no token retrieval, renewal, platform storage access or custom native patch is involved.

This marker is not the app version and is not reset on each release, sign-out or account recreation. Keep common V2 onboarding completion separately: complete or skip it explicitly, preserve interruption as incomplete, and present it on first V2 use even if V1 onboarding was completed. Reinstall follows the installation lifecycle and clears any surviving SDK credentials before personal access. Qualify actual platform backup/restore behavior; neither marker contains a profile, credential or entitlement.

The common discovery includes brief former-user information, then uses ordinary guest/sign-in routes. There is no V1-origin detection, separate migration welcome, follow-selection requirement or automatic purchase restoration. F11's mandatory age declaration remains independent. Existing OS permissions and provider choices are not reset as a migration side effect.

## Identity and purchase continuity

Preserve the Auth0 tenant, principals, existing linked identities and actual principal creation date. F05 establishes a fresh V2 business UUID after explicit authentication; never match by email or carry V1 roles into business grants. During preparation, restrict the existing default-role post-login Action to the exact V1 client. V2 uses its own current PostgreSQL permissions. Remove the old dependency when retiring V1, after qualifying sign-in with and without an old role.

RevenueCat uses that new business UUID. Read rights already applicable to it through the SDK; historical purchases use explicit restoration with the paying store account. Apply F09's accepted transfer scope and manual assistance for cross-store or unresolved cases. Do not delete RevenueCat customers, relink Auth0 principals or run automatic alias/restore/sync operations merely for migration.

Before destroying an indispensable source, verify that all necessary historical principal/customer/beneficiary references remain discoverable or privately preserved. Cover linked identities, historical identifiers and anonymous aliases actually present, rather than assuming all customer IDs follow one pattern. Retain only references needed for continuity or current erasure obligations, not a full profile export. The owner reports no gifts in V1; verify that population at cutover. Provider purchases, identity changes and deletions continue during logo preparation and require a current check before retirement.

## Subscription price and provider configuration

F09 owns the single ad-free benefit and 1.99 EUR monthly price at V2 launch for new and existing subscribers. Keep Apple `monthly`, Google `monthly` / base plan `monthly`, and the `Blockout Pro` entitlement. The separate V2 offering presents only the current benefit; remove old sporting/premium-support claims from the affected store/provider presentation.

Use native pricing: schedule the Apple decrease and change the Google base-plan country prices, then end the relevant legacy-price cohorts so existing subscribers also receive the decrease under store renewal rules. Review localized amounts, taxes and availability before activation; do not assume one country update sets all EUR territories correctly. Coordinate these changes with manual V2 publication, without promising simultaneous cross-store propagation or retroactive refunds. The mobile displays the actual native offer price.

Preserve the production package/bundle identifier, store listings, EAS project and valid signing/APNs/FCM associations identified in [research](research.md#current-v1-evidence). Keep remote build counters increasing above all submitted builds, including later V1 submissions. Adapt V2 build profiles, environment values, native entitlements and Google application configuration; remove unused V1 OTA assumptions because F13 selects no EAS Update. Do not rotate credentials or create new Firebase/store projects merely because the source repository changes. Preproduction keeps F13's separate application variant and environment.

Expo's Firebase application JSON, FCM service-account key, Android upload key, Apple signing/APNs credentials and submission credentials are distinct. Keep private credentials outside the repository and use the ordinary EAS/provider setup. Qualify signed upgrades, Google/Apple callbacks, purchases and push with the actual production identity. Owner acceptance of the outstanding Apple agreement and the F13 Dokploy backup prerequisite remain necessary before the corresponding activation.

## Protected logos and sporting reconstruction

The sole administrator may freeze V1 manual club-logo edits several days before cutover. Settle relevant in-flight writes, then privately copy the associations and actual files from the old state, verify readability/completeness, and retain exact FFVB identifiers as strings. Confirm the deployed scraper preserves logos before allowing it to continue during the freeze. An exceptional manual change requires refreshing only its affected preserved association/file; no incremental synchronization or second full export is required solely because time passed.

Reapply logos only to exact, unambiguous FFVB club matches through F02's accepted image rules; the V2 association and bytes live together in PostgreSQL. Preserve unmatched associations privately for manual resolution. Missing/unusable files block destruction; a missing rebuilt club does not justify a fabricated identity. This covers club logos only, not other V1 presentation customizations or guessed professional-team relationships.

Use the existing F01 preparation/reconstruction and F02 acceptance paths for the current season plus three completed seasons, followed by F04's existing projection replacement. Keep source absence, partial recovery and implementation defects distinct. No manual approval per pool, global success percentage or parallel import engine is added. Preserve applicable restrictions before publication. Initial/reconstructed results and links create no F07 personal announcements or push, and V1 follows/inbox/contributions are not imported.

## Cutover and recovery

The later authorized release follows this order:

1. **Prepare** the preserved references/logo copy and target configuration. Qualify V2 in preproduction, then the production-identity binary through the existing store test channels. Verify a valid legacy status response against installed V1 binaries before cutover. Keep V1 public while V2 is available for controlled testing and store review; no synchronization between their business databases is introduced.
2. **Review** a functional V2 backend and ordinary Google/Apple access with the stores. The owner confirms these are the existing reviewer methods; supply usable instructions/accounts through the stores' private review process. Do not introduce a production password connection, hidden demo authorization or a broken maintenance-only review experience.
3. **Prepare operator access** through normal sign-in in the production binary/test channel, manually grant current F12 powers and verify them. Before public publication with opening deferred, activate V2 maintenance. The already authenticated operator must retain a usable session: maintenance offers no new sign-in entry.
4. **Publish manually** and apply the native pricing/presentation changes. Verify actual downloadable availability on both stores for supported devices and applicable storefronts before retiring V1. Reconcile F11's EU27 new-download selection with existing-user update/redownload and Pro access elsewhere. Approval or a live listing alone is insufficient.
5. **Stop V1 interference**: disable old collection, workers, scheduled sends and retries; settle accepted work or identify unresolved effects under their owners. Stop old ordinary APIs and identity-writing paths, including direct authenticated calls. Recheck current provider/erasure obligations and preserved evidence; a manual edit freeze does not freeze purchases. Remove the old Auth0 Action dependency after its qualification.
6. **Serve the legacy update read** from the V2 backend at the existing public host/path. Its historical snake_case representation uses read-only deployment configuration for the qualified first V2 versions and existing store links, with `maintenance: false`, so installed V1 clients can reach their update action. These retirement thresholds remain fixed independently of later F12 minimum-version edits; no additional settings table or administration operation is added. A failed read does not guarantee a V1 blocking screen, as detailed in the [compatibility contract](contracts/README.md#legacy-mobile-access). No other V1 business route remains functional. Verify both old store binaries and direct old calls before ordinary V2 opening.
7. **Open V2** only with qualified identity/Pro continuity, preserved logos, reconstruction outcomes, effective retirement and F13 protections. Remove maintenance through current F12 controls. From this point, recover through V2 repair or compatible restoration; do not plan a functional return to V1.

Manual operations are sufficient; no release orchestrator, store monitor, countdown or persistent migration state machine is added. Stop before the affected destructive/opening action when a prerequisite is unmet. Before opening, failed preparation may be corrected or abandoned while protected sources remain. After opening, apply current erasure, permission, entitlement and privacy restrictions before restored data or sends become available. An older application image is usable only if compatible with the current schema/data.

## Design reconciliation

The owner approved prototype [713b37e](https://github.com/blockoutproject/product-prototype/commit/713b37e) on 2026-10-15 and explicitly approved its faithful Figma translation in advance. This owner instruction changes only the timing of the second validation for this scope; it is not a standing exception or an approval of new design choices.

Common discovery replaces the separate transition welcome and includes former-user information in its last step. Existing sign-in, Pro, age and global-gate journeys remain in place. The corresponding Figma [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=804-148), [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=831-382) and [320 px](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=6705-5025) states were reconciled and visually checked against that prototype, retaining editable text, Outfit typography, library instances and existing tokens. The obsolete separate journey was removed. No new library component or provider interface was introduced.

Prototype build and 209 tests passed. Browser review covered completion, skipping, the independent age gate and 320 px with 150% text; Figma review covered the static states linked above. These checks do not qualify native accessibility, secure storage, signed upgrade or provider continuity.

## Verification and evidence limits

[Research](research.md) separates current source/console observations from provider capabilities and unqualified outcomes. [Data model](data-model.md) identifies retained/reset data without inventing migration tables. [Contracts](contracts/README.md) owns the legacy wire boundary and generation implications. [Quickstart](quickstart.md) specifies the release qualifications, including interruption and direct old-call cases.

No signed V1-to-V2 upgrade, real restoration, price change, reconstructed production season, migrated logo or actual retirement has been executed by this dossier. Those are implementation/release gates; document and schema checks cannot replace them.

## Complexity Tracking

No technical complexity exception is required. The local initialization marker and single legacy read serve specific continuity requirements. A second welcome, alias migration engine, incremental image sync, lasting dual runtime and automatic rollback are unnecessary under the accepted behavior. The scoped owner instruction about Figma approval timing is recorded above.
