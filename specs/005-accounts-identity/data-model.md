# Data model: accounts and erasure

**Authority**: [spec](spec.md), [plan](plan.md). These logical persistence and lifecycle decisions follow the [F13 schema lifecycle](../003-shared-quality/plan.md#runtime-data-and-consistency).

## Active account

| Field / relationship           | Meaning and constraint                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accountId`                    | Generated business UUID; stable for this account lifecycle, never reused after voluntary erasure. RevenueCat's V2 App User ID is its string representation.                                                 |
| `issuer`, `subject`            | Exact validated Auth0 principal. Unique pair for concurrent bootstrap; no mapping by email or secondary purchase reference.                                                                                 |
| `username`                     | Outer whitespace trimmed; 3–32 ASCII letters, digits, dot, hyphen or underscore. Case-insensitive unique constraint; generated neutral candidate uses the same rules.                                       |
| `email`                        | Usable provider value required at creation; not unique and not editable through profile PATCH. Missing later data does not clear it.                                                                        |
| Optional photo                 | Optional S3 object key and accepted media type in PostgreSQL. The private object holds the accepted original PNG/JPEG bytes, at most 5 MiB. The profile transaction publishes the association after upload. |
| Business relationships         | F06 follows, F07 destinations/inbox, F08 attribution and F12 rights reference the business UUID. Each owner defines its own model and accepted cleanup. F05 does not add those features' tables.            |
| Historical customer references | Only established references needed for continuity or scoped erasure, discovered through F14's private evidence. No blanket copied customer profile or email-derived mapping.                                |

The unique username constraint handles competing accounts. Profile mutation and validation follow the [plan](plan.md#profile-photo-and-concurrent-changes).

No independent entitlement state, account-session table, global revision column or provider-profile mirror is stored.

## Deletion boundary

No pending account or deletion-request entity is stored. The original account row lock coordinates short personal-write transactions: a writer commits before deletion removes its result, or finds the original account absent. Provider synchronization captured for an existing UUID cannot update a replacement UUID. External calls take place after the transaction; private failure logs are operational evidence, not an exhaustive or durable workflow record.

| Transition          | Guard and effects                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Absent → active     | Explicit establishment, validated principal and usable provider email; unique principal and username constraints settle concurrent creation.                                               |
| Active → active     | Authorized login synchronization or profile save; omitted or temporarily unavailable fields preserve known data.                                                                           |
| Active → absent     | Owner confirmation and atomic local removal of profile and photo access. Preserve unowned content/moderation, then attempt cleanup of the original photo and other known external targets. |
| Absent → new active | Explicit registration with a new business UUID; no old profile, follows, grants, gifts or attribution.                                                                                     |

A repeated DELETE for the original absent UUID causes no provider effects. Re-registration does not wait for a cleanup row or provider-completion proof. Original target references appear only in the scoped private diagnostics/support handling in the [plan](plan.md#erasure-and-manual-resolution). No SQL retry record or per-step state is added.

## Mobile transient state

The native Auth0 SDK holds credentials in its secure store. The application reads the current validated subject and business account, while each mounted subject owns its private QueryClient and forms. Sign-out or a subject change unmounts that private lifetime and clears its data. A later A → guest → A mounts a fresh private client; detached callbacks can only complete against the old client. Operations that dispatch credentials still verify their captured original principal. No application session UUID or generation counter is introduced. The [plan](plan.md#mobile-session-and-shared-consumers) owns the concrete boundaries.

The original erasure UUID and RHF confirmation belong to that mounted account visit; technical read recovery hides its editable region without a second draft or response snapshot.

The route-local profile draft owns username and explicit `keep`/`remove`/`replace` photo intent; replacement alone owns a prepared file. Current `hasPhoto` and an optional decoded URI are separate facts. Hiding the required body for technical read recovery preserves that RHF owner, its prepared file and native ancestors; neither a second draft store nor persistent draft is added. A new business UUID selects a new form context even under the same principal. Confirmed profile response fields remain acquired in the original matching Query while later reading may fail; current grants and refusal still constrain their use. Failed or lost-response profile saving leaves that mounted draft directly editable for an explicit manual retry, without a separate uncertainty mode or verification prerequisite. Image choices remain transient presentation under F13 and introduce no persisted account field, photo-admission bit or command state.

Authentication, business-profile availability and RevenueCat SDK entitlement state remain distinct. The shared current-account Query alone owns account data, latest read status and prior-success timestamp; withdrawal uses nullable data coherently and cannot be undone by a technical failure. Known network failure does not imply revocation. No persistent business cache or write queue is added. F07's ordinary-event age filtering and current permissions still restrict retained in-memory data. No notification count or summary state belongs to the account; F07's standard native zero clear handles a prior app-controlled badge without introducing migration state.

V2 initialization and common-onboarding completion are distinct installation markers under [F14](../014-v1-v2-transition/data-model.md#installation-state), retained independently of account deletion. This is not a persistent private profile cache.

## Retained content, providers and restoration

Deleting the account cascades to F07 inbox entries and push destinations and F12 grants. F08 keeps useful links and moderation state with nullable attribution foreign keys that clear on account deletion. F08 clears the original reporter’s private reasons before the account delete in the same transaction and owns contribution history and content-specific restrictions. F10/F11 own private support and legal retention. RevenueCat store purchases remain distinct from customer records and gifts; Auth0 deletion does not delete Google/Apple global accounts.

F14's transition evidence must keep required historical customer targets discoverable even after native purchase transfer. A returned user receives a new business UUID, and old cleanup never resolves its target through the current principal-to-account mapping. Reusing an older retained copy must apply current erasure, permission and expiry obligations before affected access or push resumes.
