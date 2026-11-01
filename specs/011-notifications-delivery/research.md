# Research: Notifications, inbox and push

## Expo delivery through the existing Java backend

**Decision.** Use the Java SDK currently listed by Expo, `io.github.hlspablo:expo-server-sdk-java:3.1.6`, and SDK-compatible `expo-notifications` on native clients. The owner selected the Expo-listed Java SDK on 2026-10-30. Expo labels this SDK community-maintained; its Node SDK alone is maintained by the Expo team. Keep ordinary system permissions/channels, an explicit SDK handler suppressing foreground presentation and default provider delivery lifetime. The backend sends after commit, without automatic resend. Inspect tickets/receipts once through in-memory work.

**Rationale.** One provider boundary serves the existing Expo application without another deployable or copied provider protocol model. Use the SDK’s public builder, `PushNotification`, ticket/receipt types and serializer. A generated mechanical mapper supplies safe F07 fields; response decisions remain local application evidence, not new SDK DTOs. Expo documents message batches of 100, receipt batches of 1,000, a project rate of 600 messages/second, 4 KiB payloads and receipt inspection around fifteen minutes later. Its recommended receipt window is limited; a ticket/receipt confirms acceptance at a provider boundary, not receipt on a phone. A restart may lose unsent push and receipt work while the database inbox remains available. A native Spring task executor/scheduler is sufficient; no delivery status table is justified by the accepted best-effort behavior.

**Alternatives considered.** The provider-listed Java SDK owns its protocol representation and HTTP transport. Direct APNs/FCM adds two server integrations. A Node sender adds a service only for transport. A persistent outbox, receipt journal and automatic retries improve recovery that the owner explicitly does not require. Short live-specific expiry was rejected in favor of ordinary provider delivery after prolonged offline use; wording must remain factual rather than claim a live stream is currently running.

**Evidence.** [Expo sending](https://docs.expo.dev/push-notifications/sending-notifications/), [FAQ](https://docs.expo.dev/push-notifications/faq/), [native setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [SDK 58 notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [FCM message lifetime](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan). The SDK page lists the compatible package family; resolve its compatible patch through the ordinary Expo installation procedure during implementation, without upgrading the shared stack. These are documented capabilities, not an integrated Java/mobile qualification. Expo Go is not native push evidence.

### Bounded sender construction

The official send/setup/SDK pages were rechecked on 2026-10-30; their request/rate/payload/receipt
limits and enhanced-security bearer header remain consistent with the accepted decision. Expo's
retry recommendations are not delivery requirements: this implementation deliberately retains the
approved single attempt and single delayed receipt observation. Support for some emulators/simulators
does not supersede the accepted physical iOS/Android qualification.

`AfterCommitAnnouncements` captures association row incarnations inside the existing producer
transaction, preventing a later registration from receiving historical work. It publishes one immutable
event; the actual `DeliverPush` consumer uses Spring’s `@TransactionalEventListener(AFTER_COMMIT)`
with highest precedence and its safe handoff failure boundary. No wrapper event or republication
stage is needed. Java 25 `Gatherers.windowFixed` owns ordered send/projection batching. `ReadPushEligibility`
uses the existing current inbox/F03/F08 projection and F06 identity API in a short read-only
transaction. A normal unavailable member uses `ReadInbox.availableMember` instead of catching a
transactional exception that has already marked its enclosing read transaction rollback-only.
No owner repository/entity is imported across feature boundaries.

The [SDK listed by Expo](https://docs.expo.dev/push-notifications/sending-notifications/#send-push-notifications-using-a-server)
is [published on Maven Central](https://github.com/hlspablo/expo-server-sdk-java#installation). Version 3.1.6
accepts a `CloseableHttpClient`, base URI and access token through its public builder. Its native
optional badge/TTL/expiration values remain null and are omitted by its own serializer. Expo owns
payload-size admission; no second application serialization pass measures the 4 KiB provider bound.
The SDK performs synchronous calls with no application retry machinery.

Use Spring Boot’s native `HttpComponentsHttpClientBuilder` with the configured HTTP settings and
Apache’s `disableAutomaticRetries()`: native 429/503 recovery would otherwise replay a JSON POST.
The SDK owns HTTP status/JSON decoding. Its parsed `ErrorResponseException` means refusal; an
empty or non-JSON error body may remain unknown, including a 401/403 without a dedicated
configuration alert. F07 never parses private SDK exception messages. Decoding failures do
not cause resend, reconstructed responses or a replacement parser. Spring owns and closes the
HTTP pool. The SDK declares an annotated `UNKNOWN` receipt-error value but does not enable its
native Jackson fallback; a documented `MismatchSenderId` otherwise rejects an entire mixed response,
including an independent `DeviceNotRegistered`. At SDK startup, enable the standard
`READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE` on its public mapper. This uses the SDK’s own value
without a model/parser patch and preserves the known invalidation signal. Loopback cases exercise the real SDK’s serialization/decoding and the production HTTP
client, including single-attempt refusal. Boot manages the existing Apache/Jackson/logging versions;
no framework upgrade is selected. The SDK’s raw response DEBUG logger is disabled through ordinary
Spring logging configuration, leaving only F07’s safe evidence categories/counts.

One ordinary `ThreadPoolTaskExecutor` worker, 100 queued batches of up to 100 targets and a 200 ms
minimum interval keep a single project's rate at or below 500 messages/second. This conservative
pacing satisfies the 600 limit without a custom token bucket. The environment must have only one
enabled sender for that Expo project; this is no distributed rate guarantee across replicas.
One native scheduler retains at most 100 receipt callbacks (100 tickets each), bounded by a native
semaphore. Each callback runs once around fifteen minutes after acceptance; no SQL transaction
spans either HTTP operation. Shutdown/rejection discards only transient work. These local bounds
are implementation limits, not a capacity promise or recovery mechanism. Exact input names and
safe operational handling remain in the [operations guide](../../infra/operations/README.md#sporting-push-inputs-and-failure-limits).

## Transactional inbox and approximate start-time announcements

**Decision.** Invoke required F07 writes in the producer's local database transaction, under existing match/account locking. After commit, submit only best-effort external work. Use one ordinary scheduled eligibility pass every minute for links published before H; process later publications and results through accepted transitions.

**Rationale.** Match facts prevent duplicates even with no recipient and after inbox purge. Current follows at actual processing avoid an exact-H subscription history. Short per-match transactions preserve independently accepted matches. A correction affects derived content and never creates another notification. The match lock fixes result/link composition once.

Construction uses JPA `EntityManager.persist` for application-assigned UUIDs and dirty checking for existing match facts. Spring Data's [default new-state detection](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html) treats these non-null, unversioned IDs as existing and calls `merge`; the PostgreSQL regression demonstrates that re-creating a retained entry would then reset its read state. Direct JPA insertion preserves the focused application port without an artificial version, new-state flag or empty CRUD repositories. The inbox repository owns scalar reads, keyset selection and bounded bulk updates; assigned-ID lifecycle operations remain in the same feature adapter without a forwarding repository fragment.

F06 recipient construction uses one supported [HQL set operation](https://docs.hibernate.org/orm/7.4/querylanguage/html_single/)
for team/pool origins. PostgreSQL [READ COMMITTED](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED)
provides a snapshot per statement, so two separate origin reads could invent an empty union during
committed turnover. A single `UNION ALL` fixes that boundary in the F06 Spring Data repository without a separate
transaction, later account lock or replay. Actual Hibernate 7.4.5.Final/PostgreSQL 18.6 qualification
is recorded in [quickstart](quickstart.md#atomic-producer-and-link-qualification).

**Alternatives considered.** Timers persisted per match, a broker and recipient-history snapshots add state without an accepted precision/recovery requirement. Using after-commit listeners for inbox creation would break the accepted atomicity; after-commit is only the push boundary.

**Evidence.** [Spring scheduling](https://docs.spring.io/spring-framework/reference/integration/scheduling.html), [transaction-bound events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html), [Spring Data locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html), and the accepted [F02 concurrency contract](../002-sporting-data/plan.md#acceptance-and-concurrency). Native mechanisms are documented; rollback, lock ordering and process-loss boundaries still require actual PostgreSQL/Spring tests.

## Current projections, retention and continuation

**Decision.** Keep entry identity/time/family/variant/read state, deriving current sporting presentation. Use twenty-entry keyset windows with date/UUID keys, and one separate all-page summary with the next counted expiry. Exclude entries at 29 elapsed days everywhere controlled; physical daily purge retains the existing normal maximum of 30 days.

**Rationale.** Keyset boundaries remain usable after anchor deletion and avoid page offsets shifting after new entries/purges. The summary's next expiry lets a partially loaded mobile invalidate an unprovable total without downloading the whole inbox. One age cutoff removes disagreement between server totals and mobile exclusions. Consumed non-personal match facts are independent of personal retention.

**Alternatives considered.** Numbered pages are simpler where shifting is allowed but do not meet this inbox's accepted traversal behavior. A whole-inbox snapshot, stored cursor registry, copied sporting text and synchronized count introduce unnecessary state. Repeated purge retries add no required benefit over the next daily pass and manual intervention.

**Evidence.** [Spring Data scrolling](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html#jpa.query-methods.scroll) and [specification fluent queries](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html) document keyset scrolling and specification-based fluent reads. Use that supported path; string-based `@Query` scrolling is not supported. Non-null sort properties must be available in the selected projection. The opaque HTTP cursor is a focused mapping of those keys, not a new pagination engine. Criteria joins, index use, timestamp precision and generated serialization remain integration qualifications.

### Bounded inbox construction

`ConsultationMatchSelection` supplies F03-owned scalar Criteria subqueries for filtering before
F07 keyset paging/counting, and bounded detached match summaries. This explicit database
composition boundary avoids importing sporting entities/repositories into F07, materializing all
eligible match IDs, or duplicating sporting state in personal rows. The same F03 summary mapping
serves ordinary match consultation. A fetched to-one graph and one F08 active-link presence query
hydrate each selected window; no per-notification owner reads are required. Multi-query GETs use
a short read-only repeatable-read transaction; they promise no snapshot across HTTP requests.

The installed Spring Data JPA 4.1.1 fluent specification API supplies the selected projected
keyset operations; both persisted sort values remain in the scalar projection. Separate
`Notifications`/`PushSubscriptions` generator tags let each owning controller implement only its
actual operations, without changing wire routes, operation IDs or shapes or adding placeholders.

Read commands reuse the existing season → division → match → account locks before reselecting
current owner/age/visibility. After the conditional update confirms success, the response reuses
that authorized projection with read=true; rehydrating the same sporting/link facts adds no
freshness guarantee under these locks. Already-read entries return unchanged; the update never
merges or inserts. Cursor validation uses the JDK Base64/Instant/UUID parsers with a small input-size bound. There is no canonical re-encoding or duplicate timestamp/UUID grammar; native supported spellings are accepted, while emitted positions remain valid. Controlled
personal-row removal is qualified here; actual scheduled purge, F05 erasure and restoration remain
with [T052 and T051](tasks.md).

### Ordinary mobile read state

F03 annotates its native match query with the addressed match identity. F07 subscribes to actual
401/403/404 query outcomes, including intermediate failed attempts before native retries finish,
throughout the original F05 private client's lifetime, even while private reads are suspended.
Native query metadata identifies existing F07 resources; the subscription cancels pending
inbox/count/member reads, removes the refused match's loaded entries and invalidates the
unprovable whole count.
There is no restriction registry or dependency graph. A network/503 failure alone retains authorized
data; a later fresh authorized inbox response may restore a retained entry. F03's successful
absence of a stream cancels older inbox/member reads and replaces stale link wording with the
existing F07 absence copy in controlled cache. It preserves the result, family, read state,
original age and unread count; the next ordinary F07 read supplies complete current editorial
text. This is local sanitization of known-stale presentation, not a stored-text synchronization
or a second editorial engine.

A native true-only mutation invalidates the current inbox and whole-summary queries from mutation options, so completion survives removal of its initiating screen. Active observers consume invalidation; inactive screens recover on focus. No local monotone true overlay or uncertain-write GET acknowledgement is retained. Current server reads may briefly show an older read flag/count; a lost response permits later explicit safe true repetition. The private QueryClient follows F05's actual native identity lifetime, while active original-createdAt expiry, known owner/access refusal and exact-count invalidation retain their narrow privacy responsibilities. Cache staleTime/gcTime does not enforce retention. Persisted true-only intent remains authoritative; dated native evidence retains its recorded revision and scope.

## Association identity and native lifecycle

Construction separates the public sign-in UUID from the [native JPA-generated row identity](https://docs.hibernate.org/orm/7.4/introduction/html_single/#identifiers).
A native version restarts when a deleted row is recreated; matching the private generated row UUID
as well as revision/address prevents that old receipt tuple from becoming valid again. This uses
ordinary `GenerationType.UUID` and `@Version`, without version seeding, a tombstone, revocation
registry or retained invalid-address row. Replacement writes remove only the exact owner/connection
bindings reselected under account locks; a conflict arriving after that selection is left to native
uniqueness and rollback, rather than discovered and deleted by a later broad predicate.

The native token callback passes its APNs/FCM value only as the SDK's `devicePushToken` input to
`getExpoPushTokenAsync`; only the resulting Expo address is posted. The [SDK warning](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#pushtokenlistenertoken)
explains why reacquiring a native token from that callback can recursively emit the listener.
The process-level handler is installed while loading the native lifecycle module, before F14's
asynchronous initialization, so the SDK's foreground-presenting default cannot fill that wait.

**Decision.** Random installation UUID, fresh association UUID per sign-in, native token listener and ordinary registration opportunities. Guard removal by exact association and invalidation by its current JPA revision. No persisted logout retry. Keep current-account match navigation independent from notification read success. Reset the app-controlled badge at sign-out/account change or confirmed erasure. Leave presented system notifications to platform behavior; handle and clear tap responses only for ordinary navigation. Keep the foreground receive listener for discreet inbox refresh alongside the SDK handler that suppresses presentation.

**Rationale.** An address rotates and proves no ownership. A distinct association prevents an old logout or receipt from removing a newer binding, including returning to the same account. Native events and ordinary lifecycle refresh satisfy best-effort synchronization without polling or background tasks. A push from a former account does not justify requesting that account's inbox.

**Alternatives considered.** OS-version identities can collide. A device cleanup credential, server session registry, offline write queue, silent badge push or periodic mobile reconciliation would add machinery beyond the accepted requirement. Failed logout or an older registration arriving last can leave the old association in place until a successful ordinary current-account registration. This explicit F05/F07 limit can temporarily lose current-account push; stronger global request ordering would require additional coordination not retained here. Private inbox access remains isolated. Native dismissal is available but optional: imposing it at account changes adds a behavior and qualification obligation without the owner’s requested benefit. No notification-center synchronization or replacement foreground alert is retained. Push-carried badge counts are omitted to prevent delayed messages overwriting the current account’s count; native badge updates use confirmed summaries, accepting stale background badges.

**Evidence.** The [Expo SDK token APIs](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#getexpopushtokenasyncoptions) distinguish native token-change events from `getExpoPushTokenAsync`, which supplies the Expo delivery address. Its [presentation handler documentation](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#setnotificationhandlerhandler) requires explicit suppression on SDK 58, whose default presents foreground notifications. Return false for `shouldShowBanner`, `shouldShowList`, `shouldPlaySound` and `shouldSetBadge` to preserve the accepted absence of foreground UI/sound and summary-owned badges. Receive/tap listeners remain available independently. `setBadgeCountAsync(0)` clears the supported badge; last-response clearing consumes remembered tap context rather than removing displayed notifications. Expo exposes dismissal as an explicit API, not an account sign-out policy. Background presentation and badges depend on platform capabilities; Android launchers may not support badges. [TanStack React Native integration](https://tanstack.com/query/latest/docs/framework/react/react-native) documents lifecycle inputs. Exact native behavior, token rotations, account changes and stale callbacks require physical devices. Prototype interactions prove only the reviewed web experience.

## Contract and evidence boundaries

**Decision.** Extend the existing mobile OpenAPI source, reusing current sporting summaries and shared errors. Keep server generation, Orval/Zod validation and admitted-client compatibility under [F13](../003-shared-quality/plan.md#http-generation-errors-and-compatibility). No independent collector or provider-contract copy.

**Rationale.** F07 adds a private domain capability to the same backend. Existing projections have the same public sporting meaning; private ownership/read/family data stays in F07. A read-only true intent is repeatable, and the connection association is a resource with PUT/DELETE semantics. No task resource is needed for best-effort push.

**Evidence limits.** Official documentation and accepted source plans support the design. Generated boundary checks do not qualify F07 business integration, native push, restoration or provider configuration. The [quickstart](quickstart.md) names those qualifications. Design approvals are recorded separately in the plan and cannot be inferred from these sources.

## Native inbox navigation composition

**Decision.** Use the installed `expo-router/ui` Tabs, TabSlot, TabList and TabTrigger
for the newly introduced ordinary tab group. Native flex wrapping supplies the enlarged-text
rows; the Router supplies selection, focus, history and trigger events. Query remains the sole
badge owner. No navigation state mirror, event dispatcher or scroll mechanism is introduced.

**Rationale and alternative.** The standard styled tab bar fits the ordinary single row, but its
public styles do not expose wrapping of its inner item container. The approved [200% notification
screen](https://www.figma.com/design/rKu4xc8eJsx0f0Vu4E6U03/Blockout-Product-Design?node-id=1072-24724)
and prototype `.scaled .bottom-nav` require two rows. The documented headless composition provides
that layout without a second navigation implementation or dependency. It also preserves the
[two-entry guest variant](https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/Blockout-UI-Library?node-id=3305-1849).
Keep route definitions for hidden personal triggers so guest initial entry still reaches the
existing independent age/discovery gates before public search.

**Evidence and limits.** [Expo's custom tab documentation](https://docs.expo.dev/router/advanced/custom-tabs/)
documents these components and their focus/press forwarding, and labels the API experimental.
The installed SDK 58 declarations and real Router integration tests establish the consumed API;
this choice changes no dependency or accepted behavior. Native layout, safe-area and accessibility
inspection remain separate from those tests. Existing UI Library navigation labels and
strong-color badge roles supply the semantic token values.

## Atomic daily physical retention

**Decision (2026-11-01):** Replace selected-ID batches and independent subtransactions with one native JPQL `DELETE` at the pass's fixed inclusive creation cutoff. The application uses `TransactionTemplate` so a completion/count diagnostic is emitted only after real commit.

**Rationale:** Logical age-29 exclusion independently protects reads/counts/sends. Notification rows have no removal callback or child lifecycle requiring entity deletion. One transaction removes the progress record, selection query, loop and nested proxy while preserving facts and other owners.

**Accepted limit:** Each pass remains atomic. A definite transaction refusal rolls it back; a lost commit acknowledgement can leave the whole pass committed but unconfirmed. Report unconfirmed completion without a deletion count or a claim of zero effects. The next daily predicate or manual intervention safely removes any still-due rows, without another recovery protocol. One pass may hold more row locks and create a larger WAL/rollback unit. There is no measured load/duration requirement justifying incremental progress. Consider batching again only after a concrete deletion-duration/locking problem is observed.

**Alternatives considered:** Batching preserves stronger intra-pass progress at greater coordination/test cost. Per-entity deletion would load unnecessary objects. A recovery queue, extra retry schedule or weakened age exclusion is unnecessary and not selected.
