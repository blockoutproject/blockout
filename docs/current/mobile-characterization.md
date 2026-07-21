# Mobile Application Characterization

## Scope

REF-028 records the current behavior of the Expo application before any product or contract refactor. Android and iOS
remain the supported product surfaces. React Native Web is used only as a local, phone-sized characterization surface;
desktop layout, web deployment, and web product support are out of scope. REF-030 later enabled browser authentication
and tightly scoped local CORS solely as verification infrastructure.

The characterization preserves handwritten transport models and the current mobile gateway. It does not introduce
contract generation, new routes, new product behavior, GitFlow, CI, deployment, or production configuration.

## Application surface

Expo Router currently owns:

- the feed, search, notifications, and profile tabs;
- club, match, pool, team-list, and team detail routes shared by the main tabs;
- sign-in, onboarding, maintenance, mandatory-update, PDF viewer, and native-intent routes.

The application calls the mobile gateway through the existing `ClubApi`, `ConfigApi`, `MatchApi`, `MobileGatewayApi`,
`NotificationApi`, `PoolApi`, `ReportApi`, `SearchApi`, `TeamApi`, and `UserApi` clients. Local persisted state is
limited
to the guest session, onboarding completion, and the cached purchase entitlement.

Native boundaries include Auth0, RevenueCat, Google Mobile Ads consent and interstitials, Expo notifications, secure
storage, haptics, image selection and manipulation, PDF/web views, deep links, and MapLibre/native maps. The local Web
adapter keeps these boundaries explicit: Auth0 uses a dedicated SPA client, ads are no-ops, native maps are replaced by
an unavailable-on-Web placeholder, and browser-safe persistence uses `localStorage`.

## Verification evidence

The following checks passed on 2026-07-21:

- clean root `npm ci`, with React 19.1.0, React DOM 19.1.0, Reanimated 4.1.7, and Safe Area Context 5.6.2 resolved once;
- Nx TypeScript checking, 2 Jest suites with 10 focused tests, and a static Expo Web export;
- Chrome rendering and navigation at an explicit 390 x 844 viewport through sign-in/guest state, search error feedback,
  and the guest profile;
- iOS debug build, installation, JavaScript bundle load, and launch on an iPhone 17 Pro simulator;
- Android debug build, installation, JavaScript bundle load, and launch on a Pixel 7 emulator;
- direct local mobile-gateway search response over HTTP using the existing camel-case payload.

The original REF-028 Web search request reached the expected local flow but was rejected because the mobile gateway did
not advertise CORS headers. REF-030 replaces that limitation with an explicit localhost allowlist; it does not enable a
deployed Web origin.

The native runs exposed and corrected three local integration defects without changing product behavior: missing safe
area ownership at the application root, duplicate native React modules caused by stale lockfile entries, and an
unnecessary RevenueCat logout request when the current user was already anonymous.

## Remaining native evidence

The simulator and emulator prove native compilation, installation, launch, routing, and initial provider setup. They do
not certify external accounts or physical-device behavior. A future product validation still needs development
credentials and, where relevant, physical devices for:

- a complete Auth0 login and logout cycle on native devices;
- RevenueCat purchase, restore, and entitlement transitions;
- ads and consent acceptance rather than consent-screen presentation only;
- push registration and notification delivery;
- native map interaction, deep links, image workflows, and PDF handoff.

RevenueCat and authentication provider warnings caused by test-store state or stale development credentials are not
application crashes. The clean install reported 75 inherited npm audit findings (1 low, 69 moderate, and 5 high); no
automatic dependency rewrite was applied during characterization.
