# Research: Advertising, privacy and legal

## Native mediation rather than parallel ad integrations

**Decision**: Use `react-native-google-mobile-ads` 17.2.0 with the compatible scoped Facebook mediation plugin and its supported native dependency pins. Google Mobile Ads owns mediation; UMP supplies the consent interface. Select Google and Meta for V2, with one shared interstitial unit per platform.

**Rationale**: The [wrapper mediation guidance](https://docs.page/invertase/react-native-google-mobile-ads/mediation) and [Google Meta adapter guidance](https://developers.google.com/admob/android/mediation/meta) support the ordinary integration. One placement matches the accepted shared counter and one prepared ad. Expo config plugins and native development builds fit F13; Expo Go does not qualify adapters.

**Alternatives considered**: Separate Meta UI/SDK orchestration, Equativ, native pin overrides, Next-Gen ad pools and custom bridges add boundaries without an accepted need.

**Evidence limit**: Published wrapper types/pins and provider documentation were inspected. The reviewed core pins include Android Google Mobile Ads 25.4.0/UMP 4.0 and iOS Google Mobile Ads 13.6/UMP 3.1; compatible Meta package pins must be resolved together at installation. Newer examples on a supplier page do not authorize overriding them. No native compilation or delivery was performed.

## Common advertising age treatment and native consent

**Decision**: EU27 new-store distribution, no geographical access gate. Store only the locally declared category/date: under 16 child/G, 16–17 teen/T, adult unspecified/T. Minors receive no personalization. Adults require the native consent/permission conditions. Minor declarations renew after one year at the next launch; correction reuses the initial form.

**Rationale**: [Google age-restricted treatment](https://support.google.com/admob/answer/6219315?hl=en) exposes child/teen treatment. [European Commission guidance](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en) describes consent-age differences within 13–16. The accepted common under-16 treatment avoids a country matrix, at the cost of more restrictive handling for some 13–15-year-olds. This is an advertising decision, not verification of identity or a general account-age policy.

**Alternatives considered**: No age data with restrictive treatment for everyone prevents eligible adult personalization; a country field/GeoIP service introduces unnecessary collection; date of birth and account synchronization exceed the purpose. Age-signal APIs do not replace a documented advertising-use entitlement.

**Decision**: A European UMP message targets `Everywhere`, using native information updates, form and persistence. UMP's under-age flag and Google Mobile Ads treatment are configured separately. Use supported consent helpers and `canRequestAds`; do not infer agreement solely from consent status.

**Rationale**: [UMP React Native guidance](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent), [Google GDPR integration](https://developers.google.com/admob/android/privacy/gdpr) and [message targeting](https://support.google.com/admob/answer/10114015?hl=en) describe these mechanisms. Meta mediation relies on the documented partner/Additional Consent integration. ATT is a separate native iOS permission, requested through [Expo tracking transparency](https://docs.expo.dev/versions/v57.0.0/sdk/tracking-transparency/) after consent when needed and permitted; no duplicate UMP-managed ATT sequence.

**Evidence limit**: Store country is not physical residence. Existing users and travelers remain supported; an Everywhere message is not worldwide legal certification. Native age-signal forwarding, minor/adult correction, existing consent state and Meta serving still require actual device qualification. No production reset or custom consent parser is a substitute.

**Interaction**: Reuse the ordinary [Expo 57 slider](https://docs.expo.dev/versions/v57.0.0/sdk/slider/) (`@react-native-community/slider` 5.2.0), one-year steps, compact minus/plus buttons and one readable value. A short mandatory access screen remains independent from skippable discovery onboarding, reusing its branded frame and motion. Correction uses the identical control in a dismissible sheet. A plain numeric field and a non-dismissible sheet were considered but did not match the requested experience. The range ends at 100+, without excluding older adults; native screen-reader behavior remains to qualify.

**Neutral selection**: [Google’s age-screen guidance](https://support.google.com/googleplay/android-developer/answer/9867159) identifies presetting an eligibility age as an incorrect neutral-screen setup. Since 16 is a treatment boundary here, no such age is preselected; the initial thumb position is not a declaration. Confirmation needs explicit selection. Short experience-oriented copy avoids repeated labels, while the privacy information still explains advertising use and local category/date retention.

**Unknown age**: Use the same child/G protections for missing, invalid or expired declarations without persisting a fictitious age. [Google Play’s Families advertising rules](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en) explicitly cover users of unknown age: compatible certified sources, no interest-based advertising and child-appropriate content/formats. This fallback preserves advertising opportunities without adult assumptions, at the cost of restricted demand; it does not guarantee fill or establish Meta eligibility. The initial age step remains mandatory. Keeping all unknown users ad-free was considered but does not meet the accepted fallback choice.

**Reopening choices**: [Google’s privacy-options guidance](https://developers.google.com/admob/android/privacy#privacy_options) provides a native entry-point API. The published React Native 17.2.0 package exposes `AdsConsent.showPrivacyOptionsForm()`. Show the advertising-choice row only when UMP reports `privacyOptionsRequirementStatus = REQUIRED`; do not force an unavailable form or reset consent. Refresh the native status after changes. The prototype models applicability with fictional state; it does not establish actual native availability.

## Advertising lifecycle and failure limits

**Decision**: One prepared ad, one current transition and one runtime counter at ten, shared by navigation/live. Use native display/dismissal/failure events. No load wait, automatic catch-up, presentation watchdog or replacement close control.

**Rationale**: The [imperative interstitial API](https://docs.page/invertase/react-native-google-mobile-ads/ad-formats/interstitial) exposes load/show and presentation events. Inspection of the [published 17.2.0 package](https://www.npmjs.com/package/react-native-google-mobile-ads/v/17.2.0) confirms that `show()` can reject separately from `ERROR`, whereas the convenience hook absorbs call failures. The direct API lets the existing pending transition handle both channels without a second recovery mechanism. `CLOSED` permits reloading the same instance; retirement uses `destroy()`. After failure/no-fill, the next eligible action starts one new load instead of an immediate retry loop.

**Freshness**: Google documents one-hour interstitial expiry on [Android](https://developers.google.com/admob/android/interstitial) and [iOS](https://developers.google.com/admob/ios/interstitial). The inspected imperative wrapper exposes loaded state, not an expiry getter. Retain one load timestamp and discard/recreate stale ads when next used; this applies the documented cache limit without hourly background refresh. Native presentation failures still cover ads that become unusable sooner. Published source and documentation establish these API choices; device behavior, mediation and integrated navigation remain unqualified.

**Alternatives considered**: A separate live ad on every link was rejected in favor of the shared ten-action rule. Ad pools, persistent counters and a custom recovery state machine add no accepted benefit. An exceptional missing SDK callback may require restarting; that limitation replaces a guaranteed custom timeout recovery.

**Decision**: Retain high-engagement ads with native child format restrictions.

**Evidence limit**: [High-engagement settings](https://support.google.com/admob/answer/15525707?hl=en) and [child-directed requirements](https://support.google.com/admob/answer/6223431?hl=en) constrain serving; one does not establish complete partner behavior. Native closure, ad format, supported child sources and [Play Families requirements](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en) must be qualified before activation. No custom close timer resolves a supplier incompatibility.

## Public legal pages

**Decision**: Static HTML versioned in the repository, shipped with the backend, opened through [Expo WebBrowser](https://docs.expo.dev/versions/v57.0.0/sdk/webbrowser/). Preserve the existing public privacy/deletion entry; serve all three document types without authentication.

**Rationale**: The native integrated browser is explicitly suitable for privacy-policy reading. HTML serves mobile and ordinary browsers directly without an API/client/rendering chain. Publication remains the existing reviewed backend release. F13 already accepts shared availability.

**Alternatives considered**: A custom mobile reader, JSON document API, Markdown conversion, CMS, separate legal hosting and acceptance history are unnecessary. Missing-page and network handling use ordinary browser/server behavior.

**Evidence limit**: The public privacy URL was readable during inspection; it does not certify its text. Actual controller identity, contact, processing, recipients, transfers and retention must be reviewed before publication. Fictional prototype copy is never deployable legal content.

## Targeted club-contact restriction

**Decision**: Use the [F02 field-restriction mechanism](../002-sporting-data/data-model.md#presentation-and-privacy) so collection and ordinary edits cannot restore restricted data.

**Rationale**: F02 already owns contact modes, source values, locking and revisions. Clearing a displayed override alone would allow the next collection or return-to-source to republish personal data. A durable field restriction is the smallest mechanism preserving the accepted invariant.

**Alternatives considered**: Ordinary `hidden` presentation mode is insufficient for erasure. A generic personal-data registry, person matching, referee-removal system, privacy screen/API and automatic cleanup jobs are not selected. Other individual requests remain manual rather than falsely claiming automatic coverage.

**Evidence limit**: Contract/source review only; collection/edit races and restore handling still need implementation tests. Existing support handling supplies private request context; do not create a second database of removed values.

## Inspected configuration and release limits

**Observed**: Read-only supplier/store inspection found current Google/Meta/Equativ mediation, existing European consent configuration, and a distribution wider than the selected EU27 target. Public privacy and `app-ads.txt` resources responded; the latter includes Google, Meta and Equativ-related sellers. No settings were changed.

**Decision**: Configure V2 separately where necessary to preserve supported V1 clients. Qualify store audience/privacy/ad declarations and EU27 app/Pro availability before release. Preserve old non-EU users and their rights; remove obsolete seller entries only after their actual use ends.

**Rationale**: [Apple availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store) and [Google Play distribution](https://support.google.com/googleplay/android-developer/answer/7550024) distinguish account storefronts and distribution behavior. Removing a country is not remote account deletion or proof that old users disappear.

**Evidence limit**: Console inspection is a snapshot, not a tested native binary or future setting guarantee. Use native provider reporting for impressions/revenue/fill; no custom analytics pipeline. No-fill is an ordinary result, while actual integration errors use the existing filtered diagnostics.
