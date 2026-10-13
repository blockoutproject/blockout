# Data model: accounts and erasure

**Authority**: [spec](spec.md), [plan](plan.md). These are logical persistence and lifecycle decisions; migration syntax and JPA implementation belong to future implementation under F13's baseline policy.

## Active account

| Field / relationship           | Meaning and constraint                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accountId`                    | Generated business UUID; stable for this account lifecycle, never reused after voluntary erasure. RevenueCat's V2 App User ID is its string representation.                                            |
| `issuer`, `subject`            | Exact validated Auth0 principal. Unique pair for concurrent bootstrap; no mapping by email or secondary purchase reference.                                                                            |
| `username`                     | Outer whitespace trimmed; 3–32 ASCII letters, digits, dot, hyphen or underscore. Case-insensitive unique constraint; generated neutral candidate uses the same rules.                                  |
| `email`                        | Usable provider value required at creation; not unique and not editable through profile PATCH. Missing later data does not clear it.                                                                   |
| `principalCreatedAt`           | Nullable trustworthy Auth0 creation instant, preserved across business recreation for migration. Never inferred from local creation time.                                                              |
| Optional photo                 | PNG/JPEG bytes with media type, byte length and square dimensions at most 1024 pixels; at most 5 MiB. No original metadata. Bytes and association share the profile transaction and PostgreSQL backup. |
| Business relationships         | F06 follows, F07 destinations/inbox, F08 attribution and F12 rights reference the business UUID. Each owner defines its own model and accepted cleanup. F05 does not add those features' tables.       |
| Historical customer references | Only established references needed for continuity or scoped erasure, discovered through F14's private evidence. No blanket copied customer profile or email-derived mapping.                           |

The unique username constraint handles competing accounts. Profile mutation and validation follow the [plan](plan.md#profile-photo-and-concurrent-changes).

A reliable known principal age remains usable during a provider outage. A null age restricts only dependent operations. No independent entitlement state, account-session table, global revision column or provider-profile mirror is stored.

## Deletion boundary

No pending account or deletion-request entity is stored. The original account row lock coordinates short personal-write transactions: a writer commits before deletion removes its result, or finds the original account absent. Provider synchronization captured for an existing UUID cannot update a replacement UUID. External calls take place after the transaction; private failure logs are operational evidence, not an exhaustive or durable workflow record.

| Transition          | Guard and effects                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Absent → active     | Explicit establishment, validated principal and usable provider email; unique principal and username constraints settle concurrent creation.           |
| Active → active     | Authorized login synchronization or profile save; omitted or temporarily unavailable fields preserve known data.                                       |
| Active → absent     | Owner confirmation and atomic local removal; preserve unowned content/moderation, then attempt external cleanup without rollback.                      |
| Absent → new active | Explicit registration with a new business UUID; no old profile, follows, grants, gifts or attribution. Actual Auth0 principal evidence determines age. |

A repeated DELETE for the original absent UUID causes no provider effects. Re-registration does not wait for a cleanup row or provider-completion proof. Original target references appear only in the scoped private diagnostics/support handling in the [plan](plan.md#erasure-and-manual-resolution). No SQL retry record or per-step state is added.

## Mobile transient state

The native Auth0 SDK holds credentials in its secure store. The application holds a session UUID, current account identity and private query/form state in memory. Every sign-out/account change rotates the session UUID and removes private state. In-flight callbacks include their captured generation; those from an older generation are rejected even after A → guest → A.

Authentication, business-profile availability and RevenueCat SDK entitlement state remain distinct. Known network failure does not imply revocation. No persistent business cache or write queue is added. F07's expiry and current permissions still restrict retained in-memory data.

Onboarding and the F14 transition-welcome completion retain their accepted installation-specific purpose independently of account deletion. This is not a persistent private profile cache.

## Retained content, providers and restoration

F08 retains useful links and moderation state without deleted-account attribution; it owns report history and content-specific restrictions. F07 removes personal inbox/destinations; F12 removes personal grants. F10/F11 own private support and legal retention. RevenueCat store purchases remain distinct from customer records and gifts; Auth0 deletion does not delete Google/Apple global accounts.

F14's transition evidence must keep required historical customer targets discoverable even after native purchase transfer. A returned user receives a new business UUID, and old cleanup never resolves its target through the current principal-to-account mapping. Restore of a PostgreSQL backup must apply current erasure, permission and expiry obligations before affected access or push resumes.
