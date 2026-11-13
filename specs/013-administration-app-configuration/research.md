# Research: administration and application access

## Authority and evidence

The [specification](spec.md), accepted F13/F05/F02/F11 plans and owner decisions recorded below govern these technical decisions. Documentation establishes feasibility; [quickstart](quickstart.md) provides boundary/native validation scenarios and prerequisites. Withdrawn technical dossiers are not inputs.

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

**Request ownership:** Generated request options carry explicit maintenance intent, and HTTP refusals or settings saves invalidate the complete Query read. React owns the account-scoped choice. Client availability follows ordinary Query freshness; the server may refuse a request using its current database authorization.

## Settings and concurrent edits

**Decision:** Two singleton settings aggregates, maintenance and application versions, each with its own JPA version. Use body revisions and 409 conflicts consistently with F02. Separate content PATCH from activation-state PUT. PATCH is atomic; absent means unchanged, nullable fields can be explicitly removed. A lost response produces ordinary failure feedback and invalidation; a later explicit attempt remains subject to its original revision. Required account/settings read failures use the [F13 whole-form composition](../003-shared-quality/plan.md#frontend-form-conventions), hiding editable content while preserving the mounted RHF visit and native scroller; Query remains the remote owner. A failed reread does not undo an accepted write. One editable baseline carries the actual group revision; no response snapshot or first-success admission flag is added. No automatic write retry or merge is added.

**Rationale:** Ordinary JPA optimistic locking protects writes after the submitted revision check. One complete public SQL projection reads both aggregates in one statement snapshot. Client admission follows the complete Query read; partial endpoint responses do not establish availability. [Hibernate optimistic locking](https://docs.hibernate.org/orm/7.4/userguide/html_single/#locking-optimistic), [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [atomic PATCH](https://www.rfc-editor.org/rfc/rfc5789.html).

**Alternatives:** One global editing revision creates unrelated maintenance/version conflicts. Per-field revisions and automatic merge avoid rare simultaneous iOS/Android conflicts at extra cost; the owner accepted those conflicts. No additional ETag protocol, event history, distributed cache or settings service is selected.

**Implementation binding:** The two fixed identities share `access_settings` with independent `@Version` values. A scalar JPQL constructor projection reads both in one statement, avoiding later entity hydration. The selected generator groups all six public/private operations into `ApplicationAccessApi`; `AdministrationSettingsController` implements that interface once, rather than adding two controllers with duplicate generated mappings. This preserves the public/private authorization boundary in the use cases.

**Versions editor lifetime:** Route-local RHF owns the draft. Router guard closure discards it, and reentry starts from current server data. A local baseline revision stays coherent while dirty input exists, because RHF keepDirtyValues alone does not preserve optimistic concurrency. An in-flight upload owns its captured file until request settlement even if the route disappears. Same-turn events follow native mutation handling without a stronger client exclusion guarantee; the server checks the submitted revision and current permission.

## Native versions, stores and optional media

The unsaved full-screen update preview gives its native Modal a local `SafeAreaProvider`, as [documented for modal roots](https://appandflow.github.io/react-native-safe-area-context/docs/api/safe-area-provider/). A modal inheriting the ordinary form’s insets can place its close action under the system rail; local modal insets keep the action reachable. It adds no keyboard or viewport calculation.

At enlarged native text size, the versions editor stacks its platform cards and actions using the existing full-width style. The two-column layout can split platform labels and truncate the save label; stacking keeps labels and the final action reachable with the software keyboard open. `useWindowDimensions().fontScale` supplies the native preference; no keyboard measurement or alternate form shell is needed.

**Decision:** Compare three numeric components of the published native version, without build numbers, suffixes or version ranges. `expo-application.nativeApplicationVersion` supplies Android versionName and iOS CFBundleShortVersionString. Use ordinary parsing/comparison of validated numeric components; no version-range library is needed. Use native Linking for approved HTTPS store URLs. The operator checks actual download availability manually before raising a threshold. [Expo Application SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/application/), [Expo Linking SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/linking/).

**Limit:** Metadata may be null; with an applicable threshold, use the existing unavailable-access presentation. URL syntax and a successful open do not prove version availability or installation. Compatible native development clients qualify local metadata access, comparison, gates and store-opening/retry behavior independently of publication. [F13 T058](../003-shared-quality/tasks.md#native-candidate-preparation-and-qualification) qualifies the installed metadata of the exact signed production binaries; [F14 T048](../014-v1-v2-transition/tasks.md#phase-6-user-story-4--cut-over-without-letting-v1-alter-the-new-state-priority-p1) qualifies actual downloadable availability before any authorized minimum increase. The rule selects no OTA or build-number compatibility policy.

**Decision:** Maintenance media remains an optional HTTPS image URL, with no backend fetch/proxy or image-upload subsystem. Invalid URL input is refused; actual display failure uses F13 FR-033’s ordinary inline fallback while the message and applicable configuration actions remain usable, without a dedicated preview Retry. Use a controlled, non-personalized asset URL consistent with F11, not a tracking or expiring credential-bearing URL.

**Design decision:** Retain the approved animated gate backdrop and its measured native coverage, seamless loop and still reduced-motion state. A static composition would change the visible design and requires prototype approval followed by separate Figma approval before adoption; implementation cleanup alone supplies neither approval.

## Admission and existing operations

**Decision:** Check current maintenance in PostgreSQL before admitting a new ordinary server operation. An operation admitted before activation may complete. Collection, accepted provider outcomes, inbox creation and purge keep their domain semantics. F07 checks maintenance immediately before handing a new sporting push to its provider and skips it without replay when active.

**Rationale and limit:** No cancellation, distributed barrier or polling is needed. Concurrent activation and a send are ordered at the send's admission check; already admitted handoffs may finish, and provider recall is not promised. Routine logs follow F13 without a new incident ledger.

**Implementation binding:** The mobile security chain applies admission after native authentication/authorization. Explicit method/resource matches leave operational action checks with their owners; unknown administration routes and F08 moderation remain ordinary. Exact implemented F05 account methods keep their existing `AccountAdmission` binding, so admission is not repeated around provider I/O. One F12 header parser supplies canonical intent to both adapters. The filter delegates failures to the existing MVC Problem Details mapping; ingestion, health and the legacy read keep their separate security chains. [Spring filter placement](https://docs.spring.io/spring-security/reference/servlet/architecture.html), [MVC exception resolution](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/exceptionhandlers.html).

The in-process current-maintenance read uses a short native `REQUIRES_NEW` read transaction. Joining an existing caller transaction can reuse its hydrated settings entity after a separately committed activation. The independent persistence context avoids that stale read without changing the accepted-operation boundary or implementing the F07 handoff consumer.

## First production preparation

**Decision:** Initialize maintenance inactive with a usable message, no image and no minimum thresholds. Before public V2 publication, use the production binary in its test channel to establish the owner's account normally, manually grant rights, verify administration, then activate maintenance if public opening is deferred. Later restarts/deployments preserve stored settings.

**Rationale:** Technical preparation precedes public distribution; a new environment need not trap its first operator behind a sign-in-free maintenance gate. This does not claim that a test-channel binary alone makes the backend private: the operator must retain the pre-public preparation boundary and coordinate actual exposure under F14.

**Alternatives:** Initially active maintenance plus temporary SQL opening adds a step without a current benefit. Seeded privileged users, a hidden login, a bootstrap endpoint and an emergency console introduce special security behavior. Ordinary manual correction remains available for exceptional operational mistakes, preserving settings invariants and advancing the edited revision.

## Qualification boundary

TanStack supports passing an AbortSignal to fetch and cancelling queries; cancellation is not proof that a server mutation was cancelled. F05 binds the private Query cache to the native principal's mounted lifetime. Use ordinary read cancellation and server-side editing revisions; there is no client epoch or cross-endpoint observation ledger. [Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation).

The [quickstart](quickstart.md) provides runnable qualification scenarios, prerequisites and expected outcomes. Documentary feasibility does not waive generator, database, native or design gates; failed qualification must be resolved before the affected implementation is adopted.

**Decision:** Bound the Java-to-Jest settings integration to the distinct generated wire risks: omitted versus explicit-null PATCH values for both maintenance and versions models, decoding the actual successful responses, and a real stale-revision 409 Problem Details response. Invoke Node with the installed Jest entry directly from the mobile workspace, following the existing support-receipt integration pattern. Keep the child-process timeout and termination local to the owning Java test; the direct process requires no npm descendant walker or dedicated descendant tests. F10 multipart has its own risk and remains unchanged.

**Rationale and retained evidence:** PostgreSQL suites own atomic complete-state validation, revision races and current grants; ordinary mobile form suites own dirty values, validation, conflict/reread and uncertain-response behavior. Replaying all those cases through Java-to-Jest adds process coupling without distinct wire evidence. Local admission checks remain executable without real purchases, while T030 retains the actual confirmed native purchase across maintenance using F09's provider qualification. Reducing this suite supplies no native, purchase-provider or release approval.

**Native scope:** Apply [F13 proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification), reusing evidence only for its demonstrated source/mechanism/native graph/runtime. Maintenance has no secret field, so qualify its actual content-editing fields, keyboard, back/confirmation, draft validation and “Enregistrer” reachability without a temporary secure-entry mount. T045's bounded iOS 17 content-editing scope does not qualify the complete activation page or iOS 16.4. Cold-launch maximum-text title/activation truncation remains in F13 T072/T073's general qualification, alongside T077's live text-size limitation. Representative compositions retain both themes, enlarged text, reduced motion and ordinary semantics under FR-030 without an exhaustive cross-product or dedicated screen-reader campaign.

## Direct Profile operational destinations

Profile exposes Collections, Maintenance and Minimum versions as three direct rows under their separate current grants. Collections opens `/collection`; the settings rows retain their existing routes and guards. The maintenance gate opens `/administration` for permitted operations and explicit personal bypass. This navigation grants no sporting operator collection/configuration powers and changes no admission rule.
