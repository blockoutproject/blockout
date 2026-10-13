# Research: accounts, sessions and erasure

**Scope**: decisions supporting the [plan](plan.md) and [owning specification](spec.md). F13 versions and generation choices remain authoritative. Official documentation and inspected source establish capabilities, not a qualified Blockout native/provider integration.

## Principal and business identity

**Decision:** uniquely map validated Auth0 `(issuer, sub)` to a new business UUID. Preserve existing linked identities; never link or merge by email. Bootstrap is explicit, ordinary reads are local, and provider synchronization is limited to required email/age at login or targeted missing-data retrieval.

**Rationale:** a stable business UUID distinguishes a new account after erasure from an old provider reference and is the V2 RevenueCat App User ID. Exact-ID Auth0 reads expose the principal's creation and identity information without a broad user search. A PostgreSQL unique constraint handles concurrent creation directly.

**Alternatives:** using email would confuse legitimate distinct principals; reusing a provider ID as the business lifecycle would make old-target cleanup unsafe. A new linking process, periodic profile synchronization and business session registry have no accepted need.

**Evidence:** [Auth0 exact user lookup](https://auth0.com/docs/manage-users/user-search/get-users-by-id-or-email), [profile structure](https://auth0.com/docs/manage-users/user-accounts/user-profile-structure), [existing account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking). The retained tenant and historical samples establish neither complete population coverage nor every token invalidation path.

## Native authentication and environment boundary

**Decision:** one Auth0 tenant, distinct application/audience configuration. Production exposes Google/Apple; preproduction only its dedicated Database connection, with native signup. Destructive preproduction cleanup refuses social or cross-connection identities. Use the native SDK's secure credential management and ordinary renewal; independently clear local credentials when browser logout fails.

**Rationale:** native signup removes manual test provisioning without a second tenant or an application password form. Connection settings are not per-user directory isolation. Explicit local clearing is necessary because the inspected SDK's combined logout can fail before reaching it.

**Alternatives:** another tenant adds account/configuration cost without an accepted requirement; public signup on a shared production-enabled connection would weaken the intended boundary. Federated global logout, ephemeral-session policy changes, bespoke refresh timers and custom JWT claims are not selected.

**Evidence:** [Auth0 connection signup scope](https://support.auth0.com/center/s/article/disable-sign-ups-for-a-specific-application); [`react-native-auth0` 5.11.1 provider implementation](https://github.com/auth0/react-native-auth0/blob/v5.11.1/src/hooks/Auth0Provider.tsx). Native callbacks, cancellation, logout failure, retained token validity and the actual client/connection settings still require device/provider qualification. No settings were changed during planning.

## Atomic profile and square photo

**Decision:** one atomic multipart PATCH for the existing single Save action. Omitted fields retain current state; last accepted supplied value wins. Native square crop, one bounded PNG preparation, actual PNG/JPEG validation and metadata-free pixel re-encoding before PostgreSQL storage.

**Rationale:** saving username and photo independently would introduce partial success without a corresponding user need. Standard picker/manipulator capabilities cover the requested interaction; server image decoding protects the accepted storage boundary. Applying the upload limit after preparation permits normal large camera/library originals.

**Alternatives:** no custom native cropping library/editor, persistent staging store, image job, quality-search loop or photo synchronization service. No optimistic revision UX is needed for owner edits with accepted per-field last-write behavior. A URL-only remote image would not preserve the accepted erasure/backup guarantees.

**Evidence:** [Expo SDK 57 ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) documents editing and the platform-specific square behavior; [ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) supplies resize/PNG output. ImagePicker documents an iOS high-resolution crop issue; real large/rotated library assets must be qualified rather than presumed correct. [Java 25 ImageIO](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/javax/imageio/ImageIO.html) provides ordinary pixel read/write. The owner excludes native selection/crop and hosted Auth0 UI from prototype/Figma reproduction. The web prototype retains the shared in-app image field and does not prove native asset permissions, encoding or crop correctness.

## Session isolation and push removal

**Decision:** transient session UUID, standard query cancellation/private-cache removal, and one bounded best-effort push disassociation. No retained removal secret, offline replay or cleanup queue.

**Rationale:** cancellation can lose a race and account ID alone cannot distinguish A → guest → A. The small local generation rejects those late results without creating server sessions. Local sign-out must remain possible when the network is unavailable.

**Alternatives:** reliable eventual disassociation would require a persistent recovery mechanism; the owner accepted possible continued old-account system pushes until reassociation/provider invalidation/manual correction. The application still cannot disclose the old private inbox or remove the new account's association. Account erasure has a stronger server-side scope than local sign-out.

**Evidence:** F05/F07 accepted behavior and the bounded V1 production-lineage code inspection during exploration. That code comparison is not evidence of all installed binaries or actual push delivery; qualify the selected native destination lifecycle. F13 already supplies no automatic ordinary mobile retry/reconnection replay.

## RevenueCat continuity

**Decision:** business UUID as the V2 customer association; SDK state/cache only for entitlement decisions. Explicit native restore plus verified manual assistance replaces a population migration engine. Gifts and historical customer erasure remain separate obligations.

**Rationale:** [identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers) documents explicit App User IDs and creation of a missing customer during login. [Restoration](https://www.revenuecat.com/docs/getting-started/restoring-purchases) and [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior) distinguish explicit restoration, store account and potentially receipt-wide transfer. Moving a purchase does not establish deletion of the old customer record. Existing configured devices also need qualification after erasure because SDK association can recreate a missing record.

**Alternatives:** no backend entitlement projection, automatic `syncPurchases` migration, email-based ownership inference, systematic full-user export or separate gift ledger. The owner-reported small paid population supports manual exception handling, not silent loss of valid gifts or deletion coverage.

**Evidence limit:** neither dashboard samples nor a Test Store purchase prove Apple/Google production restoration, all historical customer relationships or cross-device cleanup. F09/F14 own their qualification and private continuity coverage before cutover.

## Durable acceptance, manual incomplete cleanup

**Decision:** atomically accept erasure and remove local personal data, retain one pending state with exact original targets, then attempt ordinary provider cleanup once. Any unresolved work is inspected and completed manually. Reconnection checks only the stored block, without provider polling or retry.

**Rationale:** a durable obligation survives process loss without an automatic recovery platform. Retaining original principal/linked identities blocks premature recreation, including a detached secondary identity. Safe operator targeting is more important than an apparent automatic completion state.

**Alternatives:** no queue, scheduler, per-step status ledger, generation protocol, reconnection repair, retry endpoint or new operator screen. No permanent complete-profile tombstone and no email matching. The accepted same-subject JWT limit remains explicit in F05 FR-035 instead of adding a custom session system.

**Evidence:** [Auth0 delete user](https://auth0.com/docs/api/management/v2/users/delete-users-by-id) does not supply an incarnation compare-and-delete guarantee. Original creation evidence and controlled manual handling are therefore necessary before deleting a reused subject. [Auth0 Sign in with Apple revocation](https://support.auth0.com/center/s/article/deleted-apple-users-receive-email-service-id-has-revoked-your-sign-in-with-apple-account) describes native behavior, not qualification of this tenant. [RevenueCat v2 customers](https://www.revenuecat.com/docs/api-v2/customer) documents asynchronous deletion acceptance and non-creating inspection. Do not use a get-or-create API to verify erasure. [Customer deletion](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile#delete-customer) does not cancel store subscriptions.

**Limits:** asynchronous accepted RevenueCat deletion can normally leave manual work, not merely a rare failure. No physical-purge or immediate cross-device SDK-revocation guarantee is invented. F11 deadlines and private retention purposes remain binding, and unresolved evidence keeps affected recreation blocked. Restored backups require manual reconciliation before reopening access.

## HTTP and proof boundaries

**Decision:** extend F13's canonical mobile root; use explicit account bootstrap, owner reads, atomic profile PATCH and original-UUID DELETE with minimal acceptance information. Reuse shared Problem Details and no-store headers. DTOs remain generated boundary objects.

**Rationale:** [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and [atomic PATCH semantics](https://www.rfc-editor.org/rfc/rfc5789.html) fit these observable effects. No separate photo-write routes, login/logout API, job resource or bulk endpoint has a real consumer need. A 202 establishes acceptance; a 404 resource absence does not independently certify supplier purge.

**Qualification:** multipart JSON/file binding, optional-field preservation, unknown-request rejection, additional-response tolerance, nullable dates and PNG/JPEG response handling must pass the integrated Java/TypeScript chain before adoption. This documentation task does not compile a production runtime or generate its clients.
