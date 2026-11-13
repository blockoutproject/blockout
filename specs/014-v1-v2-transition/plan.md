# Implementation Plan: V1-to-V2 transition

**Branch**: `tech/55-v1-v2-transition` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md), [F01 acquisition](../001-source-acquisition/plan.md), [F04 discovery](../008-search-discovery/plan.md), [F07 notifications](../011-notifications-delivery/plan.md) and [F10 support](../012-reports-feature-suggestions/plan.md).

**Status**: Transition and implementation decisions. The common discovery prototype is approved and its faithfully reconciled Figma scope is covered by the owner's explicit advance approval. [Tasks](tasks.md) track implementation and qualification; [quickstart](quickstart.md) separates independent local checks from existing native signed-upgrade, provider and mobile-store qualifications. Server deployment and infrastructure recovery are outside the current plan.

## Summary

Implement and verify common skippable discovery, explicit first V2 sign-in, ordinary F05/F09 owner composition, protected-logo reassociation and the single read-only legacy status boundary. Preserve existing mobile build/signing identities, production-identity upgrades, native provider qualification, accepted pricing and mobile store-publication/availability conditions. Local controlled development proceeds independently; server deployment and infrastructure recovery remain outside this plan.

## Technical Context

**Language/Version**: Java 25 / Spring Boot 4.1.1, TypeScript / Expo SDK 58 / React Native 0.88 / React 19.3.0, from [F13](../003-shared-quality/plan.md).

**Primary Dependencies**: Existing Auth0 native SDK from [F05](../005-accounts-identity/plan.md), RevenueCat/store integration from [F09](../006-pro-subscriptions/plan.md), Expo-compatible AsyncStorage for non-sensitive installation flags, EAS native build/signing and F07 Expo Push configuration. Executable versions are pinned in `apps/mobile/package.json`. Existing PostgreSQL/JPA, F01 acquisition and F04 projection. No new service or migration framework.

**Storage**: V2 PostgreSQL under the owning models; private temporary preservation of indispensable V1 references and club-logo files. Providers retain identities and purchases. No replicated business database, generic migration table or persistent application cache.

**Testing**: Existing JUnit/Spring MVC/Testcontainers and Jest Expo/React Native Testing Library; actual signed iOS/Android upgrade and provider qualification. Repository verification covers the actual application and contract targets; signed upgrades, providers and release operations retain separate qualification.

**Target Platform**: Existing production app identities on iOS 16.4+ and Android 10 / API 29+ subject to the selected dependencies' native qualification; host-run backend and local native development clients. Older iOS support and a dedicated compensation process are outside scope.

**Project Type**: Existing modular backend, collector and native mobile, with a one-time manually controlled transition.

**Performance Goals**: No added throughput, capacity, availability or maintenance-duration objective. Preserve actual source-cycle, transaction and provider timing constraints.

**Constraints**: No loss of indispensable continuity evidence; no email identity matching; no import notification burst; no old writers after cutover; current privacy obligations before restoration.

**Scale/Scope**: One transition, the current sporting season and three completed seasons, both stores and the actual existing subscriber/identity categories.

## Constitution Check

The approved initial product baseline permits this scoped planning feedback loop. Post-design review confirms the following boundaries. The owner's explicit approval timing instruction is recorded in [Design approval](#design-approval).

| Principle         | Application                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — Specification | F14 owns transition outcomes. F05 onboarding and session references, F09 pricing, F11 onboarding dependency and F12 admission are reconciled in their current texts.                                                                                                                                                                                                                                            |
| II — Ownership    | Identity, entitlement, sport, push and access remain with F05/F09/F02/F07/F12. F14 coordinates their transition without duplicating their models.                                                                                                                                                                                                                                                               |
| III — Design      | Prototype approved; faithful Figma translation verified within the owner's explicit advance approval. Existing approvals remain valid for unchanged journeys. See the scoped timing instruction below.                                                                                                                                                                                                          |
| IV — Contracts    | One canonical legacy status root preserves the already distributed wire contract; existing V2 roots remain authoritative for ordinary use. Server generation and actual V1 compatibility remain to qualify.                                                                                                                                                                                                     |
| V — Simplicity    | Native providers, exact protected-logo association and one compatibility read. Controlled permutations complement one real update/store-opening observation per supported installed V1 binary, with exact-build evidence reused only at its observed boundary. No identity migration engine, incremental image synchronization, dual writes or automatic rollback.                                              |
| Prerequisites     | The accepted [F01](../001-source-acquisition/plan.md), [F04](../008-search-discovery/plan.md), [F07](../011-notifications-delivery/plan.md) and [F10](../012-reports-feature-suggestions/plan.md) plans supply the prerequisite boundaries. Local prerequisite boundaries are explicit below; actual continuity constraints remain in the owning specification and are not satisfied by documentary completion. |

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

### Source code

```text
apps/backend/                         # existing owners and legacy status adapter
apps/collector/                       # existing controlled reconstruction
apps/mobile/                          # installation initialization and common discovery
contracts/http/legacy-mobile/openapi.yaml
```

The legacy root describes one boundary of the same backend. It creates no deployable, editable contract copy or generated client for V1 binaries that are already distributed. F13's Redocly/OpenAPI Generator chain produces the server interface/DTO; active V2 clients continue to use their existing roots. No migration application is scaffolded.

## Installation initialization

Before mounting Auth0Provider, read a stable V2-initialized marker from ordinary Expo-compatible AsyncStorage. If absent, call the native Auth0 Credentials Manager's `clearCredentials`, then persist successful initialization. Mount the provider only after both operations succeed. Absence of credentials is a normal case; an interruption before marker persistence safely repeats initialization. Native navigation waits for this local step. A rejected clear/write does not mount the provider; guest navigation and explicit retry remain available under F12. A successful initialization retry replaces that exceptional guest tree and may discard its unsaved local state. The public F12 check is independent and can run in parallel.

The initialization function accepts the application's SDK client and shares an in-flight promise across repeated mount attempts. Trust completion of `clearCredentials()` without a follow-up credential read. The owner accepts silent native deletion failures as an SDK limitation; initialization does not add a Keychain/Keystore check or compensation. Temporary Keychain unavailability and recovery remain observations for T012's native qualification, not a promise stronger than the SDK's result.

This security marker is not the app version and is not reset on each release, sign-out or account recreation. Reinstall follows the installation lifecycle and clears any surviving SDK credentials before personal access. Qualify actual platform backup/restore behavior; the marker contains no profile, credential or entitlement.

The separate optional discovery flag uses ordinary AsyncStorage. Its initial read keeps the ordinary startup wait; rejection presents normal discovery rather than an error/retry screen. Explicit skip or finish marks the mounted session complete immediately and starts a best-effort write without a saving state, feedback loop or automatic retry. Failed persistence may repeat discovery at the next launch. Successful persistence survives ordinary account changes and later releases; interruption before skip/finish remains incomplete, and V1 discovery never substitutes for first V2 discovery. This local owner stays outside HTTP Query and does not share the secure initialization protocol.

The common discovery includes brief former-user information, then uses ordinary guest/sign-in routes. There is no V1-origin detection, separate migration welcome, follow-selection requirement or automatic purchase restoration. F11's mandatory age declaration remains independent. Existing OS permissions and provider choices are not reset as a migration side effect.

## Identity and purchase continuity

Preserve the Auth0 tenant, principals, existing linked identities and actual principal creation date. F05 establishes a fresh V2 business UUID after explicit authentication; never match by email or carry V1 roles into business grants. During preparation, restrict the existing default-role post-login Action to the exact V1 client. V2 uses its own current PostgreSQL permissions. Remove the old dependency when retiring V1, after qualifying sign-in with and without an old role.

RevenueCat uses that new business UUID. Read rights already applicable to it through the SDK; historical purchases use explicit restoration with the paying store account. Apply F09's accepted transfer scope and manual assistance for cross-store or unresolved cases. Do not delete RevenueCat customers, relink Auth0 principals or run automatic alias/restore/sync operations merely for migration.

Before destroying an indispensable source, verify that all necessary historical principal/customer/beneficiary references remain discoverable or privately preserved. Cover linked identities, historical identifiers and anonymous aliases actually present, rather than assuming all customer IDs follow one pattern. Retain only references needed for continuity or current erasure obligations, not a full profile export. The owner reports no gifts in V1; verify that population at cutover. Provider purchases, identity changes and deletions continue during logo preparation and require a current check before retirement.

## Subscription price and provider configuration

F09 owns the single ad-free benefit and 1.99 EUR monthly price at V2 launch for new and existing subscribers. Keep Apple `monthly`, Google `monthly` / base plan `monthly`, and the `Blockout Pro` entitlement. The separate V2 offering presents only the current benefit; remove old sporting/premium-support claims from the affected store/provider presentation.

Use native pricing: schedule the Apple decrease and change the Google base-plan country prices, then end the relevant legacy-price cohorts so existing subscribers also receive the decrease under store renewal rules. Review localized amounts, taxes and availability before activation; do not assume one country update sets all EUR territories correctly. Coordinate these changes with manual V2 publication, without promising simultaneous cross-store propagation or retroactive refunds. The mobile displays the actual native offer price.

Preserve the production package/bundle identifier, store listings, EAS project and valid signing/APNs/FCM associations identified in [research](research.md#current-v1-evidence). Keep remote build counters increasing above all submitted builds, including later V1 submissions. Adapt V2 build profiles, environment values, native entitlements and Google application configuration; remove unused V1 OTA assumptions because F13 selects no EAS Update. Do not rotate credentials or create new Firebase/store projects merely because the source repository changes. Preproduction keeps F13's separate application variant and environment.

Expo's Firebase application JSON, FCM service-account key, Android upload key, Apple signing/APNs credentials and submission credentials are distinct. Keep private credentials outside the repository and use the existing EAS profiles/provider setup; no server deployment workflow is a prerequisite to generating mobile candidates. Qualify signed upgrades, Google/Apple callbacks, purchases and push with the actual production identity. Owner acceptance of the outstanding Apple agreement remain necessary before the corresponding mobile/store activation.

## Protected logos and sporting reconstruction

The sole administrator may freeze V1 manual club-logo edits several days before cutover. Settle relevant in-flight writes, then privately copy the associations and actual files from the old state, verify readability/completeness, and retain exact FFVB identifiers as strings. Confirm the deployed scraper preserves logos before allowing it to continue during the freeze. An exceptional manual change requires refreshing only its affected preserved association/file; no incremental synchronization or second full export is required solely because time passed.

Reapply logos only to exact, unambiguous FFVB club matches through F02's accepted image rules; the V2 association and bytes live together in PostgreSQL. Preserve unmatched associations privately for manual resolution. Missing/unusable files block destruction; a missing rebuilt club does not justify a fabricated identity. This covers club logos only, not other V1 presentation customizations or guessed professional-team relationships. Ordinary LNV team-logo acquisition remains independent of this preservation. Before definitive closure, a failed team image may be recovered through F01’s explicitly selected eligible historical parent pool, whose authorized sporting facts and other team images may also be integrated under F02; it changes neither this private preservation obligation nor F07’s initial-import suppression.

Use the existing F01 preparation/reconstruction and F02 acceptance paths for the current season plus three completed seasons, followed by F04's existing projection replacement. Keep source absence, partial recovery and implementation defects distinct. No manual approval per pool, global success percentage or parallel import engine is added. Preserve applicable restrictions before publication. Initial/reconstructed results and links create no F07 personal announcements or push, and V1 follows/inbox/contributions are not imported.

## Cutover and recovery

The existing mobile preparation uses `apps/mobile/eas.json` and its separate preview and production identities. Preserve exact source/build identifiers, valid signing/push associations and remote counters. Preview builds do not replace the signed production-identity binary needed to establish upgrade and store behavior. No GitHub server deployment workflow or hosted topology is selected here.

1. Qualify signed production-identity upgrades against supported installed V1 binaries on iOS/Android, including credential initialization, current Google/Apple callbacks, native purchases and push under their actual owners. Controlled local tests remain independent and prove only their tested boundary.
2. Prepare functional store review with the existing Google/Apple methods and usable authorized review accounts/backend access. Introduce no production password method or hidden demo authorization.
3. Prepare the already usable owner session/current grants required by F12 before maintenance or deferred public opening; native store testing alone does not establish those business permissions.
4. After explicit authorization, publish the qualified mobile candidates and native pricing/presentation changes, then verify actual download/update/redownload availability in both stores for supported devices and applicable storefronts. This actual required-version availability is also a prerequisite to any authorized F12 minimum increase; local store opening does not establish it. Preserve existing-user identity/rights outside new-download countries under F11.
5. Actual V1 retirement and ordinary V2 opening remain conditional on the specification’s protected evidence, current obligations, effective old-writer cessation, compatible legacy read and owner acceptance. These functional continuity conditions select no server delivery, backup or infrastructure-recovery mechanism.

The legacy read retains its historical snake_case representation, qualified first-V2 version inputs, existing store links and `maintenance: false`. Its fixed thresholds remain independent of F12 edits; missing inputs return unavailable without granting business access. Fictional versions/listing fixtures suffice for local HTTP tests; installed-client and real mobile-upgrade qualification retain their actual native prerequisites.

### Qualification boundaries

Follow [F13's proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification). Reuse the existing generated-provider MVC and actual F12 integration tests for flat JSON, required nulls, `no-store`, fixed thresholds/listings, `maintenance: false` and HTTP refusals. Existing V2 client version-comparison tests cover multi-digit numeric ordering; they do not execute a distributed V1 binary. The [legacy qualification guide](quickstart.md#legacy-status-qualification) separates those controlled checks from the real contract/update/store-opening observation required for each supported installed V1 binary. Confirm that population through current authorized evidence; the two observed builds in [research](research.md#current-v1-evidence) are starting inputs, not an invented exhaustive version matrix. Missing native execution remains in [T043](tasks.md#phase-6-user-story-4--cut-over-without-letting-v1-alter-the-new-state-priority-p1).

State the accepted unavailable-configuration limit directly: without configuration, V1's guards do not guarantee blocking or an update action; after a failed read, retained configuration may still govern display. Do not repeat every network/configuration history on every old runtime. Independently demonstrate that direct authenticated old business calls and delayed writers cannot affect V2, including when the status read fails. T049/T050 retain this actual operational evidence; neither an update capture nor a controlled fixture establishes retirement.

Reuse an observation of an exact candidate across T012/T021/T022/T042 and final acceptance only for its demonstrated outcome, with applicable source/configuration, package, signature, SDK graph and store identity. Recheck changed boundaries; do not repeat unchanged observations merely for a different task. Development clients and preview identities do not qualify signed production binaries. Store submission and actual download/update/redownload evidence remain distinct, as do population reconciliation, launch prices/cohorts for new and existing subscribers, retained identity/purchase references and the actual independent logo association-and-byte copy.

Representative development-client observations cover ordinary discovery and immediate entry; controlled storage inputs cover flag read/write failure, retained session admission and a later launch. Reuse still-applicable native initialization evidence at its demonstrated boundary. These checks do not qualify a signed upgrade, actual Keychain/Keystore failure or platform backup/restore.

Final acceptance remains in [F14's cross-cutting qualification tasks](tasks.md#phase-8-polish--cross-cutting-concerns), including the outstanding implementation and native/mobile review obligations. Reusing evidence or transferring review scope is not a passed qualification. Operational permissions remain separate from this artifact amendment.

Reusing older data must respect current erasure, permissions, entitlements, privacy, F07 expiry and actual schema/code compatibility. No infrastructure backup schedule, restoration programme, release orchestrator or functional return to V1 is selected.

## Design approval

The owner approved the common discovery prototype and explicitly approved its faithful Figma translation in advance. This owner instruction changes only the timing of the second validation for this scope; it is not a standing exception or an approval of new design choices.

Common discovery includes former-user information in its last step. Existing sign-in, Pro, age and global-gate journeys remain in place. The corresponding Figma [light](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=804-148), [dark](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=831-382) and [320 px](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=6705-5025) states retain the approved prototype’s editable text, Outfit typography, library instances and existing tokens. The journey uses the existing UI library and excludes provider interfaces.

The approved scope covers completion, skipping, the independent age gate and 320 px with 150% text. Native accessibility, secure storage, signed upgrade and provider continuity require their own qualification.

## Verification and evidence limits

[Research](research.md) separates current source/console observations from provider capabilities and unqualified outcomes. [Data model](data-model.md) identifies retained/reset data without inventing migration tables. [Contracts](contracts/README.md) owns the legacy wire boundary and generation implications. [Quickstart](quickstart.md) specifies local interruption/owner cases and existing native signed-upgrade, provider and store qualification.

Local checks establish no signed V1-to-V2 upgrade, population completeness, price activation, actual protected-source preservation or retirement. The native/mobile cases retain those actual prerequisites and evidence limits without restoring a server-deployment programme.

## Complexity Tracking

No technical complexity exception is required. The local initialization marker and single legacy read serve specific continuity requirements. A second welcome, alias migration engine, incremental image sync, lasting dual runtime and automatic rollback are unnecessary under the accepted behavior. The scoped owner instruction about Figma approval timing is recorded above.
