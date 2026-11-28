# Research: Advertising, privacy and legal

## Native mediation rather than parallel ad integrations

**Decision**: Use `react-native-google-mobile-ads` 17.4.0 with the compatible scoped Facebook mediation plugin and its supported native dependency pins. Google Mobile Ads owns mediation; UMP supplies the consent interface. Select Google and Meta for V2, with one shared interstitial unit per platform.

**Rationale**: The [wrapper mediation guidance](https://docs.page/invertase/react-native-google-mobile-ads/mediation) and [Google Meta adapter guidance](https://developers.google.com/admob/android/mediation/meta) support the ordinary integration. One placement matches the accepted shared counter and one prepared ad. Expo config plugins and native development builds fit F13; Expo Go does not qualify adapters.

**Alternatives considered**: Separate Meta UI/SDK orchestration, Equativ, native pin overrides, Next-Gen ad pools and custom bridges add boundaries without an accepted need.

**Resolved setup**: The lockfile selects `@react-native-google-mobile-ads/facebook` 17.3.1 alongside core 17.4.0. Its supported pins select Meta adapter 6.22.0.1 on Android and 6.22.0.0 on iOS, both with Audience Network 6.22.0. Its [Android POM](https://dl.google.com/dl/android/maven2/com/google/ads/mediation/facebook/6.22.0.1/facebook-6.22.0.1.pom) requests Google Mobile Ads 25.4.0; ordinary Gradle resolution selects the core's 25.5.0. Its [iOS podspec](https://cdn.cocoapods.org/Specs/4/1/b/GoogleMobileAdsMediationFacebook/6.22.0.0/GoogleMobileAdsMediationFacebook.podspec.json) admits the core's 13.10.0 via `~> 13.3`. Core retains UMP 4.0.0 on Android and 3.1.0 on iOS. Expo 58's installed compatibility map selects tracking transparency 58.1.0 and web browser 58.0.8. No native pin override is needed.

**Android autolinking**: The published scoped 17.3.1 package supplies the `ReactPackage` and supported autolinking configuration needed to resolve Meta mediation. It accepts core `>=17.0.0` and preserves the selected Google pins; no library patch, manual native dependency or second Meta integration is needed.

**Android compiler**: Use the Kotlin compiler selected by Expo SDK 58’s generated native project. Google Mobile Ads 25.4.0 requires a compiler compatible with Kotlin 2.3 metadata; verify the full application compilation with the retained advertising SDK pins. No local compiler classpath plugin, metadata-check bypass or dependency patch is selected. [Expo’s upstream compiler correction](../003-shared-quality/plan.md#technical-context) is included in SDK 58. A successful module-only compilation does not establish application compatibility.

**iOS attribution declarations**: The [Google iOS setup guide](https://developers.google.com/admob/ios/quick-start#update_your_infoplist_file) lists 50 SKAdNetwork identifiers, including the two in [Meta's official guide](https://developers.facebook.com/docs/audience-network/guides/SKAdNetwork), checked on 2026-10-21. Supply the complete list once through the core config plugin. The installed Meta config plugin only appends those same identifiers; omitting that duplicate declaration preserves the package's native autolinking. These attribution declarations neither install additional mediation adapters nor activate ad serving. Recheck the supplier lists during T020/T040 qualification.

**ATT language**: Keep app-owned permission text in French under F13 FR-029 in the [shared specification](../003-shared-quality/spec.md#functional-requirements). [Apple's purpose-string guidance](https://developer.apple.com/design/human-interface-guidelines/privacy) calls for a brief, specific explanation. If the product later supports more languages, use [Expo's native permission localization](https://docs.expo.dev/guides/localization/#translating-app-metadata) rather than concatenating translations in one prompt. No translation library is needed for the current scope.

**Evidence limit**: Published pins and resolved native configuration establish dependency compatibility, not serving or consent behavior. [Setup verification](quickstart.md#native-configuration) identifies the executable checks; delivery evidence records actual build/launch outcomes. Newer supplier examples do not authorize overriding these pins. T020/T040 still own real mediation, privacy and release qualification.

**Android release optimization**: Keep Expo SDK 58’s R8 default. The resolved advertising dependency tree includes WorkManager 2.7.0 and Room 2.2.5. Room’s consumer rule preserves `WorkDatabase_Impl` but not its reflected no-argument constructor under full optimization. The reflected constructor is required during `InitializationProvider`; preserving the class name alone does not preserve it. Declare only that constructor through the supported [BuildProperties `extraProguardRules`](https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/) property, following Android’s [narrow keep-rule guidance](https://developer.android.com/topic/performance/app-optimization/keep-rules-overview). This preserves optimization and the selected SDK pins without protecting entire packages, patching dependencies or adding a Gradle plugin. Reassess when the owning dependency supplies a complete consumer rule; a build alone is insufficient, so launch the optimized release. Verify constructor retention and actual optimized application launch at the owning native/release boundary.

## Native advertising choices

**Audience and release**: Remove the Blockout age form and installation age record. [Play Console's target-audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159), [Play Families requirements](https://support.google.com/googleplay/android-developer/answer/9893335) and [CNIL consent guidance](https://www.cnil.fr/fr/les-bases-legales/consentement) distinguish content rating, audience and applicable consent. Verify the actual store declarations, age-free processing and Meta's eligibility before enabling V2 units. Non-personalized ads can still use identifiers, as described in [Google's serving modes](https://developers.google.com/admob/ios/privacy/ad-serving-modes).

**Consent**: Use [UMP's native flow](https://developers.google.com/admob/ios/privacy) through [the existing React Native SDK](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent). Refresh at an applicable launch, request ads only when `canRequestAds` permits it and leave ad-mode selection to the SDKs. UMP owns persistence, including applicable choices after an update error. The old Purpose 2 consent check can suppress otherwise eligible Google demand because [Google accepts legitimate interest for that purpose](https://support.google.com/admob/answer/9760862). Register Meta in the applicable partner lists. Use `showPrivacyOptionsForm()` only when UMP requires the options entry.

**iOS tracking**: Use a single system ATT prompt when applicable. UMP can present it when an [IDFA message](https://developers.google.com/admob/ios/privacy/idfa) is configured. Respect the system result and applicable privacy choices before initialization. The existing Meta adapter uses native ATT status on iOS 17 and later. For supported earlier iOS versions, forward the actual ATT status through its documented tracking setting before initialization.

## Advertising lifecycle and failure limits

**Decision**: One in-memory counter, one prepared interstitial and one navigation continuation only during presentation. The tenth eligible in-app navigation consumes an opportunity. A missed opportunity still starts a new ten-navigation cycle. System notification taps and external links retain direct navigation.

**Rationale**: [Google's interstitial guidance](https://support.google.com/admob/answer/6201350) locates ads at natural transitions. The [imperative React Native API](https://docs.page/invertase/react-native-google-mobile-ads/ad-formats/interstitial) preserves both failure channels: `show()` can reject separately from an `ERROR` event. The current convenience hook absorbs that rejection. Use the ordinary dismiss/failure path to resume the still-valid destination once. [Google documents one-hour expiry](https://developers.google.com/admob/ios/interstitial). Check age of the prepared ad at use and refresh it when needed.

**Monetization**: Initial price settings follow [Google optimized / All prices](https://support.google.com/admob/answer/3418058). Compare demand by source and platform from [Ads Activity](https://support.google.com/admob/answer/10979428) after qualification. [High engagement](https://support.google.com/admob/answer/15525707) affects exit time and steps on standard ad units. It is an app-level console setting and should be evaluated with the rest of the existing inventory.

## Public legal pages

**Decision**: Static HTML versioned in the repository, shipped with the backend, opened through [Expo WebBrowser](https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/). Preserve the existing public privacy/deletion entry; serve all three document types without authentication.

**Rationale**: The native integrated browser is explicitly suitable for privacy-policy reading. HTML serves mobile and ordinary browsers directly without an API/client/rendering chain. Publication remains the existing reviewed backend release. F13 already accepts shared availability.

**Alternatives considered**: A custom mobile reader, JSON document API, Markdown conversion, CMS, separate legal hosting and acceptance history are unnecessary. Native opening rejection uses brief feedback and another explicit link press at its caller; subsequent missing-page and network handling use ordinary browser/server behavior, without a Blockout read/retry lifecycle.

**Evidence limit**: Public URL availability does not certify legal text. Actual controller identity, contact, processing, recipients, transfers and retention must be reviewed before publication. Fictional prototype copy is never deployable legal content.

## Targeted club-contact restriction

**Decision**: Use the [F02 field-restriction mechanism](../002-sporting-data/data-model.md#presentation-and-privacy) so collection and ordinary edits cannot restore restricted data.

**Rationale**: F02 already owns contact modes, source values, locking and revisions. Clearing a displayed override alone would allow the next collection or return-to-source to republish personal data. A durable field restriction is the smallest mechanism preserving the accepted invariant.

**Alternatives considered**: Ordinary `hidden` presentation mode is insufficient for erasure. A generic personal-data registry, person matching, referee-removal system, privacy screen/API and automatic cleanup jobs are not selected. Other individual requests remain manual rather than falsely claiming automatic coverage.

**Evidence limit**: F02’s owning tests cover collection/edit restrictions; actual consumer and older-data qualification remains in T031/T032. Existing support handling supplies private request context; do not create a second database of removed values.

## Inspected configuration and release limits

**Observed**: Read-only supplier/store inspection found current Google/Meta/Equativ mediation, existing European consent configuration, and a distribution wider than the selected EU27 target. Public privacy and `app-ads.txt` resources responded; the latter includes Google, Meta and Equativ-related sellers. No settings were changed.

**Decision**: Configure V2 separately where necessary to preserve supported V1 clients. Qualify store audience/privacy/ad declarations and EU27 app/Pro availability before release. Preserve old non-EU users and their rights; remove obsolete seller entries only after their actual use ends.

**Rationale**: [Apple availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store) and [Google Play distribution](https://support.google.com/googleplay/android-developer/answer/7550024) distinguish account storefronts and distribution behavior. Removing a country is not remote account deletion or proof that old users disappear.

**Evidence limit**: Console inspection is a snapshot, not a tested native binary or future setting guarantee. Use native provider reporting for impressions/revenue/fill; no custom analytics pipeline. No-fill is an ordinary result, while actual integration errors use the existing filtered diagnostics.
