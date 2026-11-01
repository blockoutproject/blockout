# Research: V1-to-V2 transition

## Current V1 evidence

The scoped read-only observations establish source/configuration facts, not successful native migration or a complete production-data audit. They authorize no further repository or provider inspection. Credentials and customer payloads remain private.

EAS/store observations identify Android 1.3.5 (84) and iOS 1.3.5 (122). Upgrade qualification requires installed store binaries; expired EAS artifacts are unavailable test binaries. Both platforms use `com.blockoutproject.blockout`. Preserve EAS project `10cdf86a-a81e-496a-bcaa-07c132678f6d`, Firebase project `blockoutproject-39658`, valid signing/push associations and the actual application's Google services entry. Console presence alone qualifies no new build, token or push.

The observed iOS build permits iOS 15.1; Play targets API 36 and lists France, Belgium, Germany and Switzerland. V2 uses F13's iOS 16.4 and Android 10 / API 29 floors. Native dependencies and F11 EU27 new-download settings require qualification, including continuity for existing users outside those storefronts.

The observed Auth0 `assign-default-role` Action calls V1 for a principal without a role. The existing directory, linked identities and creation dates remain authoritative. [Default-role isolation](quickstart.md#auth0-default-role-isolation--t019) qualifies only its stated sample; retire the dependency with V1 instead of recreating its role endpoint. Console observation is not a successful login test.

Existing `Blockout Pro` and monthly products remain. Apple shows the monthly EUR subscription at 2.99 EUR; Google `monthly:monthly` is active with a legacy price cohort and country-dependent prices. [F09 continuity](../006-pro-subscriptions/spec.md) and the pricing decision below own the change. No customer association, receipt transfer or billing result was changed or qualified by these observations.

V1 stores the FFVB club reference as a string and a logo URL; the inspected scraper clones existing club data before updating source fields and retains the logo. Manual replacement can remove the previous S3 object. Freeze manual changes and settle relevant in-flight work before copying associations and bytes. Confirm deployed behavior; mutable image tags alone prove neither preservation nor a usable copy. [Protected-logo rehearsal](quickstart.md#protected-logo-rehearsal--t027t028t030) remains separate from actual preservation.

The old gateway declares snake_case JSON fields and the mobile client converts them to camelCase; session guards are false without configuration and maintenance takes priority over the update screen. The [legacy contract](contracts/README.md#legacy-mobile-access) preserves those wire names and requires maintenance false at retirement. Qualify success/failure with and without retained configuration on store binaries; a failed read guarantees neither blocking nor the update action. Stop old business APIs independently.

Apple's Paid Applications agreement requires owner action before the intended release. F13 also retains the Dokploy S3-secret-masking correction as a prerequisite before activating V2 backups with real credentials. Neither prerequisite is satisfied by this documentation.

## Common discovery and local credentials

**Decision**: Present common, skippable V2 onboarding on all installations, with short former-user information. Clear local Auth0 credentials once before mounting the provider, then retain normal SDK session restoration. Keep V2 initialization separate from onboarding completion and from F11 age declaration.

**Rationale**: There is no useful need to identify whether an installation came from V1. One stable marker prevents repeated sign-in on later releases; separate completion prevents an interrupted discovery from being marked finished. The [Auth0 5.11.1 provider](https://github.com/auth0/react-native-auth0/blob/v5.11.1/src/hooks/Auth0Provider.tsx) attempts credential restoration on mount, so initialization must precede it. The [SDK client](https://github.com/auth0/react-native-auth0/blob/v5.11.1/src/Auth0.ts) exposes Credentials Manager before provider mounting; use its `clearCredentials`, not direct Keychain/Keystore manipulation. Ordinary [Expo-compatible AsyncStorage](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/) holds only non-sensitive installation flags.

**Alternatives considered**: V1 detection, a second welcome, a marker per app release and browser-wide logout add state or disruption without a continuity benefit. Restoring purchases silently would violate the explicit F09 journey.

**Evidence limits**: SDK source establishes the methods and mounting behavior. Interrupted initialization, credential absence, reinstall and an actual upgrade still require native testing. The prototype qualifies neither secure storage nor session renewal.

## Subscription price and purchase continuity

**Decision**: Keep the existing store products, RevenueCat project and entitlement. Use the new business UUID with explicit native restoration and manual assistance for exceptions. Lower the existing monthly EUR price to 1.99 EUR at V2 launch for new and existing subscribers; coordinate country prices and existing cohorts in the native consoles.

**Rationale**: [Apple](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/) applies a subscription decrease to existing subscribers at renewal. [Google Play](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en) distinguishes the base-plan price from legacy subscriber cohorts: changing the base price alone does not move all existing subscribers. Ending the relevant cohorts applies the decrease under native renewal timing, without an application-managed refund or consent flow. [RevenueCat pricing guidance](https://www.revenuecat.com/docs/subscription-guidance/price-changes) leaves price changes to the stores. Keep localized native prices authoritative, including currency/tax effects.

**Alternatives considered**: New products create unnecessary subscription migration. An automatic Auth0-to-RevenueCat alias engine adds identity ownership and recovery; F09's native restoration and verified manual handling meet the accepted need. A price hardcoded in the mobile can disagree with the actual offer.

**Evidence limits**: Store review, propagation and renewal dates do not form an atomic release. Qualify both stores and the actual historical association categories before destroying indispensable evidence. A successful sample does not prove population completeness. The owner reports no V1 gifts; verify that this remains true rather than building a gift-migration subsystem.

## Native application and provider configuration

**Decision**: Retain production app identities, EAS project, valid signing/push credentials and monotonically increasing remote build counters. Adapt configuration to the selected V2 dependencies; do not copy V1 `eas.json`, Google JSON files or OTA channels blindly. F13 selects no EAS Update delivery.

**Rationale**: Expo documents [remote version management](https://docs.expo.dev/build-reference/app-versions/), [existing credentials](https://docs.expo.dev/app-signing/existing-credentials/) and [FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/). These are ordinary continuity mechanisms. `google-services.json` describes the Firebase application; it is distinct from a service-account private key, the Android upload key, APNs key and store-submission credentials. They have different owners and validation paths.

**Alternatives considered**: Recreating apps/projects would break update or provider continuity without a need. Retaining unsupported devices through a second runtime or compensation programme is outside the accepted scope; iOS 16.4 remains the V2 minimum.

**Evidence limits**: Existing credentials may expire or require adaptation. Actual signed upgrade builds, provider callbacks and push tests establish usability. Refresh an expired credential through its normal provider procedure; this dossier authorizes no rotation or configuration change.

## Preservation with a manual freeze

**Decision**: The sole administrator freezes V1 manual changes before an advance copy of club-logo references and bytes. Re-copy an affected association only if an exceptional change is made. Preserve exact FFVB identifiers, including leading zeros. Reapply only certain matches through F02.

**Rationale**: The owner controls these writes and the inspected scraper preserves existing logos. A verified copy can therefore remain valid for several days; a final full copy or incremental synchronization is not inherently necessary. Stop or settle relevant in-flight work before the copy and verify the deployed scraper's behavior. Copying a URL alone loses protection when its object is removed.

**Alternatives considered**: Change-data capture, mirrored image stores and repeated full exports add operations without a current need. Name-based matching risks incorrect ownership. Unknown associations remain privately retained; they do not justify invented clubs.

**Evidence limits**: Purchases, new principals, revocations and privacy obligations are not frozen by this administrative pause. Check their current provider state and retain only indispensable private references before destruction. No complete user-profile export, erasure ledger or universal retention period is added.

## Controlled release and retirement

**Decision**: Prepare and qualify V2 while V1 still serves users, publish manually after review, and retire ordinary V1 only once both stores actually distribute the compatible update. Serve its single legacy status read from the V2 backend; stop old writers, jobs and direct business access before public V2 opening. Recover through V2 repair/restoration afterward.

**Rationale**: [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/) require usable review access and backend services. The owner confirms reviewers already use Google/Apple; retain those production methods with ordinary review instructions, not a demo authorization bypass. Prepare the owner's usable production account and grants before maintenance. A store update screen alone cannot stop an already authenticated old client or worker.

**Alternatives considered**: A lasting V1 facade, dual writes, a generic migration coordinator and a promised rollback to incompatible V1 data add substantial complexity. One frozen public read is sufficient for the installed client; it is not a second backend deployment.

**Evidence limits**: Actual availability, qualified continuity, current protected copies and effective writer retirement are future release gates. [Apple availability rules](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store/) and [Play country distribution](https://support.google.com/googleplay/android-developer/answer/7550024?hl=en) require checking existing-user update/redownload and offer access when moving new downloads to EU27. No automatic store monitor, arbitrary maintenance duration or guaranteed rollback is inferred.
