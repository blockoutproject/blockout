# Research: accounts, sessions and erasure

**Scope**: decisions supporting the [plan](plan.md) and [owning specification](spec.md). F13 versions and generation choices remain authoritative. Official documentation and inspected source establish capabilities, not a qualified Blockout native/provider integration.

## Principal and business identity

**Decision:** uniquely map validated Auth0 `(issuer, sub)` to a new business UUID. Preserve existing linked identities; never link or merge by email. Bootstrap is explicit, ordinary reads are local, and provider synchronization is limited to required email/age at login or targeted missing-data retrieval.

**Rationale:** a stable business UUID distinguishes a new account after erasure from an old provider reference and is the V2 RevenueCat App User ID. Exact-ID Auth0 reads expose the principal's creation and identity information without a broad user search. A PostgreSQL unique constraint handles concurrent creation directly.

**Alternatives:** using email would confuse legitimate distinct principals; reusing a provider ID as the business lifecycle would make old-target cleanup unsafe. A new linking process, periodic profile synchronization and business session registry have no accepted need.

**Evidence:** [Auth0 exact user lookup](https://auth0.com/docs/manage-users/user-search/get-users-by-id-or-email), [profile structure](https://auth0.com/docs/manage-users/user-accounts/user-profile-structure), [existing account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking). The retained tenant and historical samples establish neither complete population coverage nor every token invalidation path.

## Backend Management API integration

**Decision:** use the official [`auth0-java` 5.4.0](https://github.com/auth0/auth0-java/tree/5.4.0) Management SDK for exact-ID user reads and its typed response models. Spring Security OAuth2 Client retains the standard client-credentials acquisition, in-memory expiry cache and renewal through the environment's native `auth0` registration. SDK models remain inside the account infrastructure adapter; application code receives only necessary email, creation time and existing connection evidence.

**Rationale:** the official SDK owns endpoint construction and provider decoding instead of a handwritten HTTP/JSON projection. Its native `ClientOptions` header supplier accepts Spring's bearer without a second token cache. The 5.4.0 built-in `OAuthTokenSupplier` uses its own static HTTP client with a fixed 30-second call deadline; that path does not inherit the selected token transport's deadlines/redirect policy. The supported header-supplier integration preserves the already selected bounded Spring token client. Management calls use the SDK's supported native OkHttp transport with explicit deadlines, disabled connection retries and redirects; SDK retries and payload logging remain disabled. Maven needs the explicit `okhttp-jvm` compile artifact corresponding to the SDK's 5.2.1 transport dependency; this does not upgrade the workspace or replace the mobile SDK.

**Evidence:** [official SDK usage and configuration](https://github.com/auth0/auth0-java/blob/5.4.0/EXAMPLES.md), [`ClientOptions`](https://github.com/auth0/auth0-java/blob/5.4.0/src/main/java/com/auth0/client/mgmt/core/ClientOptions.java), [`OAuthTokenSupplier`](https://github.com/auth0/auth0-java/blob/5.4.0/src/main/java/com/auth0/client/mgmt/core/OAuthTokenSupplier.java), and [Spring's authorized-client API](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorized-clients.html). Controlled HTTP tests exercise the actual SDK decoding, exact ID, token audience, native expiry reuse, token/resource deadlines, refusal and absence of payload logging. They establish no real tenant configuration or provider qualification.

## Native authentication and environment boundary

**Decision:** one Auth0 tenant, distinct application/audience configuration. Production exposes Google/Apple; preproduction only its dedicated Database connection, with native signup. Destructive preproduction cleanup refuses social or cross-connection identities. Use the native SDK's secure credential management and ordinary renewal; independently clear local credentials when browser logout fails.

**Rationale:** native signup removes manual test provisioning without a second tenant or an application password form. Signup is connection-wide; the dedicated connection is disabled for production, so no custom Action is needed for this separation. Connection settings are not per-user directory isolation. Explicit local clearing is necessary because the inspected SDK's combined logout can fail before reaching it.

**Alternatives:** another tenant adds account/configuration cost without an accepted requirement; public signup on a shared production-enabled connection would weaken the intended boundary. Federated global logout, ephemeral-session policy changes, bespoke refresh timers and custom JWT claims are not selected.

**Evidence:** [Auth0 connection signup scope](https://support.auth0.com/center/s/article/disable-sign-ups-for-a-specific-application); [`react-native-auth0` 5.11.1 provider implementation](https://github.com/auth0/react-native-auth0/blob/v5.11.1/src/hooks/Auth0Provider.tsx). Native callbacks, cancellation, logout failure, retained token validity and the actual client/connection settings still require device/provider qualification. No settings were changed during planning.

## Atomic profile and square photo

**Decision:** one atomic multipart PATCH for the existing single Save action. Omitted fields retain current state; last accepted supplied value wins. Native square crop, one bounded PNG preparation, actual PNG/JPEG validation and metadata-free pixel re-encoding before PostgreSQL storage.

The native preparation adapter uses Expo FileSystem's `File` on the prepared output to check its byte length before upload. ImageManipulator owns PNG encoding; the server validates actual content. FileSystem is the existing Expo runtime dependency declared directly by the mobile consumer. Servlet multipart buffering retains accepted parts in memory within the existing per-file/request bounds; ImageIO uses memory-backed streams rather than disk staging.

**Rationale:** saving username and photo independently would introduce partial success without a corresponding user need. Standard picker/manipulator capabilities cover the requested interaction; server image decoding protects the accepted storage boundary. Applying the upload limit after preparation permits normal large camera/library originals.

**Alternatives:** no custom native cropping library/editor, persistent staging store, image job, quality-search loop or photo synchronization service. No optimistic revision UX is needed for owner edits with accepted per-field last-write behavior. A URL-only remote image would not preserve the accepted erasure/backup guarantees.

**Evidence:** [Expo SDK 57 ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) documents editing and the platform-specific square behavior; [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) supplies resize/PNG output. ImagePicker documents an iOS high-resolution crop issue; real large/rotated library assets must be qualified rather than presumed correct. [Java 25 ImageIO](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/javax/imageio/ImageIO.html) provides ordinary pixel read/write. The owner excludes native selection/crop and hosted Auth0 UI from prototype/Figma reproduction. The web prototype retains the shared in-app image field and does not prove native asset permissions, encoding or crop correctness.

## Session isolation and push removal

**Decision:** transient session UUID, standard query cancellation/private-cache removal, and one bounded best-effort push disassociation. No retained removal secret, offline replay or cleanup queue.

**Rationale:** cancellation can lose a race and account ID alone cannot distinguish A → guest → A. The small local generation rejects those late results without creating server sessions. Local sign-out must remain possible when the network is unavailable.

**Alternatives:** reliable eventual disassociation would require a persistent recovery mechanism; the owner accepted possible continued old-account system pushes until reassociation/provider invalidation/manual correction. The application still cannot disclose the old private inbox or remove the new account's association. Account erasure has a stronger server-side scope than local sign-out.

**Evidence:** F05/F07 accepted behavior and the bounded V1 production-lineage code inspection during exploration. That code comparison is not evidence of all installed binaries or actual push delivery; qualify the selected native destination lifecycle. F13 already supplies no automatic ordinary mobile retry/reconnection replay.

Concurrent explicit age retrieval and profile saves apply immutable field-owned updates through the existing Query owners. For the same cached UUID, POST updates provider email/age while preserving the editable profile; PATCH preserves provider evidence already admitted. Original-account rereads can refresh evidence, but a null snapshot never clears a known principal date. The native [`setQueryData` updater](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses#immutability) supports this without another state owner. Controlled delayed responses cover both delivery orders. A canonical reread after every mutation would add a request and another unavailable outcome; serializing writes would add unnecessary coordination. Neither is needed for these disjoint field owners.

## RevenueCat continuity

**Decision:** business UUID as the V2 customer association; SDK state/cache only for entitlement decisions. Explicit native restore plus verified manual assistance replaces a population migration engine. Gifts and historical customer erasure remain separate obligations.

**Rationale:** [identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers) documents explicit App User IDs and creation of a missing customer during login. [Restoration](https://www.revenuecat.com/docs/getting-started/restoring-purchases) and [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior) distinguish explicit restoration, store account and potentially receipt-wide transfer. Moving a purchase does not establish deletion of the old customer record. Existing configured devices also need qualification after erasure because SDK association can recreate a missing record.

**Alternatives:** no backend entitlement projection, automatic `syncPurchases` migration, email-based ownership inference, systematic full-user export or separate gift ledger. The owner reported approximately 10,000 V1 accounts and 18 paying subscribers during planning. This unaudited scale supports manual exception handling; it is not a capacity target or permission to lose valid gifts or erasure coverage.

**Evidence limit:** neither dashboard samples nor a Test Store purchase prove Apple/Google production restoration, all historical customer relationships or cross-device cleanup. F09/F14 own their qualification and private continuity coverage before cutover.

## Synchronous business deletion and manual external cleanup

**Decision:** remove business data in one transaction, attempt each known external target once after commit and use private failure logs/native alerts for manual repair. No durable pending state, automatic recovery or recreation gate. The [plan](plan.md#erasure-and-manual-resolution) owns sequencing and target safeguards.

**Rationale:** the local transaction protects Blockout data without claiming distributed rollback. The owner accepts interruption between commit and log emission and ordinary errors when re-login overlaps provider deletion. A new business UUID prevents an old local deletion from targeting its replacement. Actual Auth0 principal age avoids a separate artificial lifecycle clock. The narrowly scoped original-target logging exception makes manual repair possible without a database workflow record.

**Alternatives:** a durable tombstone/outbox would improve crash recovery and block recreation, but adds state and operational handling beyond the accepted need. No provider polling, queue, retry scheduler, custom session registry or permanent profile archive is selected. A provider acknowledgment is trusted without demanding inaccessible proof of physical erasure. Rejected mechanisms are not deferred roadmap items.

**Documented capabilities:** [Spring transactions](https://docs.spring.io/spring-framework/reference/data-access/transaction/programmatic.html) delimit ordinary local transactions. [Auth0 DELETE](https://auth0.com/docs/api/management/v2/users/delete-users-by-id) returns 204; [RevenueCat v2 DELETE](https://www.revenuecat.com/docs/api-v2/customer#delete-a-customer) returns 200 for asynchronously queued removal. Successful asynchronous acknowledgment does not by itself create manual work. [Auth0 Apple revocation](https://support.auth0.com/center/s/article/deleted-apple-users-receive-email-service-id-has-revoked-your-sign-in-with-apple-account) describes supported behavior, not this tenant's qualification. [Customer deletion](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile#delete-customer) does not cancel store subscriptions.

**Operational evidence:** [Grafana Loki alerting](https://grafana.com/docs/grafana/latest/datasources/loki/alerting/) supports native alerts from log queries. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) supports purpose-limited event context and protected access, with credential/payload exclusions. F05/F11 authorize only necessary original-target references in private logs for 14 days; longer unresolved cases use existing private support handling. The alert contains no personal targets. These capabilities establish neither guaranteed log delivery nor actual provider cleanup.

**Limits:** Auth0 supplies no conditional incarnation delete. Manual intervention verifies original targets/current use but does not invent atomic provider guarantees. Customer removal does not remotely revoke all existing SDK instances. No integrated transaction/provider/native deletion test has run; [quickstart](quickstart.md#erasure-and-return) defines future qualification.

## HTTP and proof boundaries

**Decision:** extend F13's canonical mobile root; use explicit account bootstrap, owner reads, atomic profile PATCH and original-UUID DELETE returning 204 without a body. Reuse shared Problem Details and no-store headers. DTOs remain generated boundary objects.

**Rationale:** [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and [atomic PATCH semantics](https://www.rfc-editor.org/rfc/rfc5789.html) fit these observable effects. No separate photo-write routes, login/logout API, job resource or bulk endpoint has a real consumer need. A 204 confirms local resource removal after bounded external attempts; a 404 confirms original resource absence, not physical provider purge. No monitor resource is needed.

**Qualification:** multipart JSON/file binding, optional-field preservation, unknown-request rejection, additional-response tolerance, nullable dates and PNG/JPEG response handling must pass the integrated Java/TypeScript chain before adoption. This documentation task does not compile a production runtime or generate its clients.
