# F05 research and decisions

These decisions derive the owner-approved F05 plan on 2026-10-06. Sources establish documented capabilities, not deployed configuration. No provider, account, purchase, deletion, native build or production migration was exercised. All live qualifications below are **NOT EXECUTED**. Existing generations are inherited from F13; no dependency is installed here.

## R01 — Standard Auth0 boundary

**Need:** authenticate the existing Google/Apple population with little custom machinery (FR-003–FR-010, FR-017–FR-021).

**Decision:** native Auth0 SDK, protected credentials manager, Authorization Code with PKCE and Spring resource-server validation of signature, issuer, audience and expiry. Reuse actual existing tenant/session settings after qualification. SQL business status/resource permissions remain current. No business session registry, device list, `isConnected`, custom lifecycle claims or refresh timer.

**Simpler alternative:** trust the mobile user object or a supplied identifier. Rejected because it is not API authorization. A custom session service adds no accepted need.

**Consequences:** SDK/provider failures and business-profile unavailability remain separate; do not clear valid credentials on a network error or a business 403. On logout clear local credentials/private state even if browser logout fails; do not request global Google/Apple logout.

**Validation:** actual SDK credentials/refresh/logout on iOS/Android, API invalid-signature/issuer/audience/expiry refusals and current permissions. [SDK credentials/session interface](https://auth0.github.io/react-native-auth0/v5.11.1/interfaces/Interface.Auth0ContextInterface.html), [API validation](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens), [logout layers](https://auth0.com/docs/authenticate/login/logout).

## R02 — Explicit bootstrap and provider synchronization

**Need:** one account per recognized principal, no email linking, no mandatory form and no dependency on Auth0 for every sports read (FR-004–FR-014, FR-018).

**Decision:** POST bootstrap after explicit authentication; GET profile never creates. Read current provider information at first creation and explicit sign-in; use a separate authenticated request for a missing age reference. Provider lookup is by authenticated principal, never email. SQL uniqueness resolves concurrent attempts. Known-profile synchronization failure preserves known values and access when token/account checks pass. No periodic or cold-start provider synchronization.

**Simpler alternative:** bootstrap on every GET and always reload the provider. Rejected because reads would mutate state and provider outages would unnecessarily block known profiles.

**Consequences:** provider email can remain stale between explicit logins. Missing/unusable first email suspends creation; missing/unavailable updates preserve the old email, while a usable shared email is accepted. F14 preserves verified principal/customer associations, without address reservations.

**Validation:** concurrent bootstrap, known-profile outage, missing/new/shared email, linked primary identity, preserved identity association and no mutation/provider call on GET. [User profile structure](https://auth0.com/docs/manage-users/user-accounts/user-profiles/user-profile-structure), [existing linking semantics](https://auth0.com/docs/manage-users/user-accounts/user-account-linking). These sources do not authorize creating new links.

## R03 — Neutral minimal profile

**Need:** automatic usable profile without exposing an email-derived display name (FR-011–FR-015).

**Decision:** generate `player-` plus 12 random lowercase hexadecimal characters; insert under the ordinary case-insensitive username uniqueness constraint and regenerate on an actual collision. Do not derive from email. Username rules remain 3–32 ASCII letters/digits/dot/hyphen/underscore, trimming only surrounding whitespace. Start without a photo and use the approved default avatar. Do not copy provider first name, last name, phone or photo.

**Simpler alternative:** use the email local part and provider picture. Rejected by the owner in favor of a neutral initial identity and fewer external-image operations.

**Consequences:** customization remains optional and is never overwritten by later sign-in. Exhausted request handling or database failure produces a controlled failure, never a nonunique fallback or half-created profile.

**Validation:** malformed/occupied/case-equivalent names, collision regeneration, no copied personal fields, default avatar and preserved manual customization.

## R04 — Private photo replacement

**Need:** keep the previous photo when upload or association fails; prevent unauthorized reading (FR-014–FR-016, FR-038).

**Decision:** backend upload and owner-authenticated backend read of private S3 objects. Verify actual PNG/JPEG bytes, 5,242,880-byte input limit, safe decode/re-encode and stripping of irrelevant metadata. Use a new opaque object key; store the association only after rechecking account status and expected profile revision. Use F13's upload limit and session isolation. No public bucket/object ACL or presigned public profile link.

**Simpler alternative:** overwrite the old object or reuse public logo URLs. Rejected because failure could lose the image and profile access differs from sporting logos.

**Consequences:** an unreferenced object from failed association, or an old object whose deletion failed, is manually removable using existing S3 tools and safe diagnostics. No garbage-collection framework or image-processing service. Decode/resource limits are bounded implementation safeguards, not image-quality/product dimensions. Input refusal preserves the old photo; physical cleanup failure after a committed association is an operational exception, not SQL rollback.

**Validation:** exact size boundary, disguised format, decode failure, stripped metadata, stale edits, concurrent deletion, inaccessible other-owner image and old/new object handling. Use standard storage and image-library primitives qualified under F13, not a new runtime here.

## R05 — Reliable age without continuous synchronization

**Need:** preserve F08's account-age evidence across V2 reconstruction (FR-024–FR-025).

**Decision:** persist a reliably attributed Auth0 principal creation date supplied by verified F14 input or provider lookup. Never substitute business creation time. Retry retrieval only on a relevant explicit request when missing. A known date remains usable during an outage; permissions and the seven-day threshold remain F08/F12 decisions.

**Simpler alternative:** use business-row age. Rejected because a rebuild would reset established users. Scanning Auth0 users for refresh is unnecessary.

**Consequences/validation:** deletion and subsequent registration do not deliberately import old age; qualify actual provider recreation dates and linked principals. Missing evidence suspends only dependent publication. No inference of human age.

## R06 — Minimal durable erasure, manual exceptions

**Need:** an accepted deletion must survive app closure and external failures without building a recovery platform (FR-026–FR-035).

**Decision:** one account lifecycle state plus acceptance time and original target references. Commit acceptance and local domain erasure/minimization before external cleanup. Submit one post-commit execution to a standard bounded backend executor; rejection/crash leaves the persistent account state for operator handling. No restart scanner, periodic retries, persisted per-step statuses, attempt history, dedicated resume API or admin screen. Inspection and continuation use existing SQL/provider/storage tools under a documented private runbook.

**Simpler alternative:** logs alone or deleting Auth0 before recording intent. Rejected: logs expire and external success cannot be rolled back by SQL. The accepted single state is the minimum durable obligation.

**Consequences:** normal completion is automatic; uncommon failures need an operator. Keep original UUID/provider/file targets while needed, not a complete reusable profile. Manual work must inspect current facts before destructive continuation and must never target a newly created account by email or a reused subject. Provider acceptance is not always physical completion.

**Validation:** failure before commit causes no external effect; failure at each subsequent boundary leaves blocked, identifiable work. Application/process closure, repeated requests and manual completion are covered without claiming automatic recovery.

## R07 — Auth0 deletion and accepted token limit

**Need:** keep the owner-selected standard Auth0 behavior without an extra authentication system.

**Decision:** use `DELETE /api/v2/users/{id}`; its documented 204 is successful Auth0 deletion. Auth0 documents removal of associated refresh tokens. Existing signed API access tokens still follow their normal validity. Same-subject social re-registration may therefore allow an earlier valid token to access the new business account. Explicitly amend F05's stronger lifecycle promise; do not add a re-registration waiting period or custom claim to prevent this case. An absent/deleting business account remains unusable and an ordinary API read never recreates it.

**Simpler alternative:** assume deletion retroactively invalidates every token. Rejected as an unsupported promise. Stronger lifecycle isolation was discussed and not selected.

**Consequences:** old business data/rights must not return; late mobile results and stale cleanup remain isolated. These protections are different from rejecting every old access token for a reused Auth0 subject.

**Validation:** use real qualification accounts to observe deletion, refresh refusal, social subject reuse and old-token behavior; record actual settings without inventing expiry values. [Delete a user](https://auth0.com/docs/api/management/v2/users/delete-users-by-id), [token best practices](https://auth0.com/docs/secure/tokens/token-best-practices), [social user reuse](https://support.auth0.com/center/s/article/Delete-a-social-connection-user).

## R08 — Apple and RevenueCat boundaries

**Need:** erase applicable provider data while preserving the independently valid store purchase and protecting a later account (FR-029, FR-032–FR-036).

**Decision:** qualify standard Auth0 Apple revocation before adding any adapter. Auth0 support describes revoking available Apple refresh tokens during user deletion. RevenueCat customer deletion is asynchronous; preserve the distinction between accepted request and completed erasure. Never use RevenueCat v1 GET subscriber as an absence check: it can create a missing customer. F09 owns the mapped customer targets, documented result interpretation, SDK isolation, restore behavior and safe-return qualification. New business accounts use fresh opaque customer correspondences under the architecture, not email matching.

**Simpler alternative:** delete only the business row, or declare a queued provider deletion physically complete. Neither meets the accepted scope. A custom polling supervisor is not selected.

**Consequences:** use available provider guarantees; unresolved external operations that could affect recreation/restored purchases need manual resolution. No arbitrary waiting duration, impossible physical-erasure proof or hidden provider-setting change. A provider limitation blocks that qualification and returns to the owner instead of silently expanding machinery.

**Validation:** Apple-only and already-linked Google/Apple deletion, missing revocation credentials, RevenueCat acceptance/uncertainty, both stores' deletion-then-return/restore and actual native receipt-wide transfer scope. [Auth0 Apple deletion](https://support.auth0.com/center/s/article/deleted-apple-users-receive-email-service-id-has-revoked-your-sign-in-with-apple-account), [Apple TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple), [RevenueCat deletion API](https://www.revenuecat.com/docs/api-v1/customers#delete-customer), [restoration settings](https://www.revenuecat.com/docs/projects/restore-behavior). No production account was inspected or modified for this dossier.

## R09 — Existing diagnostics, no new incident concept

**Need:** make confirmed incomplete deletion actionable (FR-028, FR-032, FR-038–FR-039).

**Decision:** use F13 structured logs, Alloy/Grafana, IRM and environment-specific Discord. A confirmed cleanup failure opens the existing scoped incident without deliberate delay; group by environment/component/problem and stable cleanup scope, not account ID, request ID or changing error text. Logs carry an opaque technical reference only; sensitive targets remain in authorized storage. Manual verified resolution is supported by F13.

**Simpler alternative:** logs only would not use the already-approved incident workflow. A deletion dashboard/supervisor duplicates it.

**Consequences/validation:** no reminders or new delivery queue. Another account succeeding or an error log aging out does not prove recovery. Prove opening/grouping and manually verified recovery using the existing F13 integration; crash investigation includes a documented pending-state SQL inspection rather than a new periodic monitor.

## R10 — External deletion with existing privacy content

**Need:** keep in-app deletion and the external request route required by Google Play (FR-037–FR-038).

**Decision:** prominent deletion section with a direct anchor on the existing public privacy page and the F11 contact email. External requests are manually ownership-verified before the same deletion acceptance. No web form, account portal, reinstallation requirement or deletion on a merely asserted reply address.

**Simpler alternative:** in-app only. Rejected because Google explicitly requires an external web resource even with integrated deletion. A separate interactive site is unnecessary.

**Consequences/validation:** F11 publishes wording and a real monitored contact; F14 qualifies the store link. Apple still receives the in-app initiation journey. [Google Play requirement](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en), [Apple account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).

## R11 — Contracts, transactions and proof

**Need:** keep account behavior explicit across native/API/provider boundaries.

**Decision:** F13 OpenAPI/problem conventions and real consumers; DTO/domain/JPA/provider mappings; SQL uniqueness and short transactions; an expected original business UUID on profile/photo/deletion intents and simple profile revisions for edits. A successor mismatch refuses without effect; this is a request precondition, not token revocation or a session registry. No provider HTTP in SQL. Account permissions are current per action. No receipt platform for every mutation; use rereads and explicit uncertain outcomes.

**Simpler alternative:** generated models throughout the domain or accepting arbitrary provider objects. Rejected because it obscures ownership and validation. Full application runtimes are unnecessary to validate this documentary tree.

**Consequences/validation:** author all schemas and executable future tasks now; report generation, PostgreSQL, provider and native checks as NOT EXECUTED until real environments exist. Use meaningful scenario tests, not generated-source spelling tests. F13 owns toolchain locking and full future code CI.

## R11 — Delegate Pro and remove email ownership reservations

**Need:** keep identity distinct from contact details and avoid a second rights authority (FR-004–FR-010, FR-023, FR-036).

**Decision:** unique canonical principal, non-unique provider email; RevenueCat SDK supplies mobile entitlements, cache and expiry. Backend stores only necessary identity/customer correspondences and cleanup references. Standard native restoration scope, including receipt-wide transfer, is accepted.

**Simpler alternative:** email-based account lookup would be shorter but violates isolation; a backend entitlement projection would duplicate the provider without a retained need.

**Consequences:** distinct accounts can share email; no `EmailClaim`, address conflict error, custom rights refresh/tolerance clock or grant ledger. Preserve provider-required first-creation data and stale-cleanup protection.

**Validation:** Q01 proves same-email/different-principal creation and same-principal concurrency. Q05/Q09 prove SDK account isolation and actual native restoration scope. Provider/native proofs are **NOT EXECUTED**; unsafe correspondence or cleanup of a successor blocks release.
