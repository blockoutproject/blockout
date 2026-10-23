# Research: administration and application access

## Authority and evidence

The [specification](spec.md), accepted F13/F05/F02/F11 plans and owner decisions recorded below govern this dossier. Research is documentary; no native build, provider change, database experiment or generated consumer compilation was performed. The installed [Spec Kit 1.1.3 planning procedure](https://github.com/github/spec-kit/blob/v1.1.3/templates/commands/plan.md) defines the artifacts. Withdrawn technical dossiers are not inputs.

## Current business permissions

**Decision:** Store explicit account–permission associations in PostgreSQL, globally scoped by action. Ordinary capabilities follow usable-account and domain rules; privileged grants have no role hierarchy. Only the product owner assigns/removes them manually with ordinary PostgreSQL tools. F12 management, version management and personal bypass remain distinct. Existing F02 action permissions retain their meaning; other owners add only their actual actions in their own plans.

**Rationale:** A few trusted operators need current authorization, not a delegation platform. Account deletion removes grants; a new business UUID inherits none. Spring Security's ordinary request and method authorization can invoke a business authorization bean. Its authenticated principal is not a second authority for business grants. The official Boot 4.1.1 dependency catalogue observed during research manages Spring Security 7.1.1 and Hibernate 7.4.5.Final; these documentation URLs are moving references, not immutable patch snapshots. [Spring authorization](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html), [method security](https://docs.spring.io/spring-security/reference/servlet/authorization/method-security.html), [Boot dependencies](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html).

**Concurrency limit:** An authorization annotation alone does not serialize a grant withdrawal with a write. Protected account mutations and manual grant changes use F05's existing account-row lock before checking/changing grants. PostgreSQL READ COMMITTED takes a new snapshot per statement, so lock then read current grants. No provider call stays inside this transaction. [PostgreSQL isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [locks](https://www.postgresql.org/docs/18/explicit-locking.html).

**Alternatives:** JWT-carried grants become stale; Auth0 RBAC would move/duplicate the accepted business authority. Resource-scoped delegation, an assignment API, custom command and generic role engine add maintenance without an accepted need. No such system is selected.

## Startup, account and native session

**Decision:** Public access configuration is independent of Auth0. Extend the existing account read with a permission projection instead of adding a separate permissions endpoint. Permit the narrow current-account read during maintenance for identification; keep profile navigation, photo reads and ordinary account commands blocked without personal bypass. Client guards use Expo Router; backend authorization remains authoritative.

**Evidence:** Auth0's native Credentials Manager owns secure persistence and automatic token renewal. Expo documents asynchronous initial session loading and `Stack.Protected`, while explicitly identifying its example session provider as a mock. React Native documents native OAuth/PKCE, not a universal application-startup API. None of these sources requires a combined public/private startup endpoint. The endpoint separation is a project decision derived from public access and current database-owned permissions. [Auth0 SDK](https://github.com/auth0/react-native-auth0#credentials-manager), [Expo authentication](https://docs.expo.dev/router/advanced/authentication/), [protected routes](https://docs.expo.dev/router/advanced/protected/), [React Native security](https://reactnative.dev/docs/security).

**Decision:** Allow the SDK's silent token renewal during maintenance. Expiration of an access token differs from needing a new interactive sign-in. If interactive authentication is necessary, no sign-in entry is offered at the gate. A network error does not itself erase credentials or revoke the account.

**Explicit retry:** Reuse the existing button, native credential retrieval and the account query's supported `refetch`. TanStack documents this user-triggered fetch independently of automatic retries; Expo supports separate route guards for ordinary and operational access. These mechanisms cover identification recovery and a manager without personal bypass, without another retry controller or navigation system. [TanStack manual refetch](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries), [Expo protected routes](https://docs.expo.dev/router/advanced/protected/). Native integration remains to be qualified.

**Alternatives:** A combined optionally authenticated endpoint couples public admission to token failure handling. An additional permission endpoint duplicates a read already needed for the account. A second credential store or handwritten renewal scheduler duplicates the SDK. All are unnecessary here.

## Temporary maintenance bypass

**Decision:** Keep explicit bypass intent only in memory for the current account session. Send it on concerned requests, and require the current database grant on the server. Clear it on cold start, sign-out/account change, observed grant loss or a successful check showing maintenance inactive. No bypass row, special token or session endpoint is introduced.

**Rationale and limit:** This preserves explicit personal choice without persistent preference synchronization. It cannot bypass a minimum version, confer a business action or restore another account's rights. Without another interaction, the app need not learn that maintenance was disabled and enabled again; no maintenance-episode registry is added.

## Settings and concurrent edits

**Decision:** Two singleton settings aggregates, maintenance and application versions, each with its own JPA version. Use body revisions and 409 conflicts consistently with F02. Separate content PATCH from activation-state PUT. PATCH is atomic; absent means unchanged, nullable fields can be explicitly removed. Reread after uncertain results, with no automatic retry or merging.

**Rationale:** Ordinary JPA optimistic locking protects writes after the submitted revision check. One complete public SQL projection reads both aggregates in one statement snapshot. Monotonic revisions also prevent older responses from replacing current-process observations. [Hibernate optimistic locking](https://docs.hibernate.org/orm/7.4/userguide/html_single/#locking-optimistic), [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [atomic PATCH](https://www.rfc-editor.org/rfc/rfc5789.html).

**Alternatives:** One global editing revision creates unrelated maintenance/version conflicts. Per-field revisions and automatic merge avoid rare simultaneous iOS/Android conflicts at extra cost; the owner accepted those conflicts. No additional ETag protocol, event history, distributed cache or settings service is selected.

**Implementation binding:** The two fixed identities share `access_settings` with independent `@Version` values. A scalar JPQL constructor projection reads both in one statement, avoiding later entity hydration. The selected generator groups all six public/private operations into `ApplicationAccessApi`; `AdministrationSettingsController` implements that interface once, rather than adding two controllers with duplicate generated mappings. This preserves the public/private authorization boundary in the use cases.

## Native versions, stores and optional media

**Decision:** Compare three numeric components of the published native version, without build numbers, suffixes or version ranges. `expo-application.nativeApplicationVersion` supplies Android versionName and iOS CFBundleShortVersionString. Use ordinary parsing/comparison of validated numeric components; no version-range library is needed. Use native Linking for approved HTTPS store URLs. The operator checks actual download availability manually before raising a threshold. [Expo Application SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/application/), [Expo Linking SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/linking/).

**Limit:** Metadata may be null; with an applicable threshold, use the existing unavailable-access presentation. URL syntax and a successful open do not prove version availability or installation. Native/store qualification remains future work. The rule selects no OTA or build-number compatibility policy.

**Decision:** Maintenance media remains an optional HTTPS image URL, with no backend fetch/proxy or image-upload subsystem. Invalid URL input is refused; actual display failure leaves message and retry usable. Use a controlled, non-personalized asset URL consistent with F11, not a tracking or expiring credential-bearing URL.

## Admission and existing operations

**Decision:** Check current maintenance in PostgreSQL before admitting a new ordinary server operation. An operation admitted before activation may complete. Collection, accepted provider outcomes, inbox creation and purge keep their domain semantics. F07 checks maintenance immediately before handing a new sporting push to its provider and skips it without replay when active.

**Rationale and limit:** No cancellation, distributed barrier or polling is needed. Concurrent activation and a send are ordered at the send's admission check; already admitted handoffs may finish, and provider recall is not promised. Routine logs follow F13 without a new incident ledger.

## First production preparation

**Decision:** Initialize maintenance inactive with a usable message, no image and no minimum thresholds. Before public V2 publication, use the production binary in its test channel to establish the owner's account normally, manually grant rights, verify administration, then activate maintenance if public opening is deferred. Later restarts/deployments preserve stored settings.

**Rationale:** Technical preparation precedes public distribution; a new environment need not trap its first operator behind a sign-in-free maintenance gate. This does not claim that a test-channel binary alone makes the backend private: the operator must retain the pre-public preparation boundary and coordinate actual exposure under F14.

**Alternatives:** Initially active maintenance plus temporary SQL opening adds a step without a current benefit. Seeded privileged users, a hidden login, a bootstrap endpoint and an emergency console introduce special security behavior. Ordinary manual correction remains available for exceptional operational mistakes, preserving settings invariants and advancing the edited revision.

## Qualification boundary

TanStack supports passing an AbortSignal to fetch and cancelling queries; cancellation is not proof that a server mutation was cancelled. Reuse F05's session generation and explicit access revisions to reject stale results, without inventing a generic event-ordering engine. [Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).

The [quickstart](quickstart.md) defines the future evidence required. Documentary feasibility does not waive generator, database, native or design gates; failed qualification must be resolved before the affected implementation is adopted.
