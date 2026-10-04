# F05 account API and mobile behavior

**Authority:** F05 FR-001–FR-025, FR-038–FR-039; [F13 API](../../003-shared-quality/contracts/api.md), [F13 mobile](../../003-shared-quality/contracts/mobile.md). [OpenAPI](account.openapi.yaml) is the documentary transport source. Future adoption uses `contracts/public/accounts/` and the single F13 problem definition; no generated artifacts are committed.

## Operations and effects

| Operation                     | Behavior                                                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/me/bootstrap`   | Authenticated explicit sign-in/bootstrap. No client identity or profile fields. Read current provider data outside SQL where needed, create one eligible neutral profile or synchronize/return the existing active account. Safe in business effect under duplicate requests, but never automatically replayed by mobile transport. |
| `GET /api/v1/me`              | Read active current profile from Blockout only. No provider call, account creation or automatic synchronization.                                                                                                                                                                                                                    |
| `POST /api/v1/me/account-age` | Explicit missing-evidence retrieval. Return known evidence immediately if already present; otherwise retrieve the current principal date and recheck original account/status before saving. No invented date.                                                                                                                       |
| `PATCH /api/v1/me/profile`    | Change username only with expected account UUID and revision. Trim surrounding whitespace then validate; reject a stale revision or occupied normalized name without effect. Email is not editable.                                                                                                                                 |
| `GET /api/v1/me/photo`        | Return actual private PNG/JPEG bytes after owner/current-status checks; 404 if no photo. No-store and no persistent native image cache.                                                                                                                                                                                             |
| `PUT /api/v1/me/photo`        | Multipart file plus expected account UUID and profile revision, actual PNG/JPEG content at most 5,242,880 input bytes. Upload a new object outside SQL and change association only after status/revision recheck.                                                                                                                   |
| `DELETE /api/v1/me/photo`     | Expected account UUID and revision in query parameters, no request body. Explicit removal returns the updated profile; no-photo removal at the current revision is unchanged.                                                                                                                                                       |
| `POST /api/v1/me/deletion`    | Explicit `confirmed: true` plus expected original account UUID; durable acceptance returns 202, never a claim of physical total erasure. Repetition against the same still-pending account returns its existing acceptance without spawning another cleanup attempt.                                                                |

A single `/me` scope resolves ownership from authenticated identity. Profile/photo mutations and deletion require `expectedAccountId`, captured at the original user intent and checked against the resolved current business UUID in the effect transaction. A mismatch returns `409 ACCOUNT_CHANGED` without effect. This is a precondition, never caller-supplied ownership proof. Preserve it on an uncertain repetition; never silently replace it with a successor UUID returned by a new GET. Profile revision additionally protects edits within the same account. An old valid JWT with a new explicit intent targeting the new account remains within the accepted Auth0 limit. Bearer authentication is required for all operations. An API 401 means an invalid/missing token; it is different from an active token whose business account is absent/deleting. F12 restrictions remain applicable, preserving its required legal/support/authentication routes.

## Creation and synchronization

Use the SDK's authenticated Auth0 principal, not a request-supplied email or decoded unverified identity. The backend retrieves necessary principal information using its restricted provider adapter; never accepts a mobile provider profile as authoritative. Valid provider email syntax and nonempty address are required at first creation; authentication of the principal is not proof of ownership of a different same-email account. Retain Auth0 verification information where needed for F11 ownership handling, without adding a Blockout email-verification form or new linking rule.

`providerSyncStatus` in bootstrap distinguishes `UPDATED`, `RETAINED` and `UNAVAILABLE`. The unavailable state can still accompany a usable known profile; they do not permit an ineligible first creation. Shared email produces no conflict; profiles remain isolated. Existing manual username/photo remain untouched. If Auth0 lookup fails and no active profile exists, return dependency-unavailable; if provider lookup succeeds but the address is unusable, return the declared business conflict. Missing age alone never blocks creation with usable identity/email.

Verified F14 identity/customer correspondences precede bootstrap; there are no email reservations. No live full-tenant search or historical-user scan on each login. An unresolved correspondence remains a transition blocker, not an approximate email match. A provider response arriving after account deletion cannot change a successor account.

## Mobile state and credential ownership

The mobile feature distinguishes guest, interactive sign-in, authenticated/profile unavailable, ready account, authentication required and deletion pending. Rights loading is separate and owned by F09. Guest/public content remains usable under F12; profile load failure does not reopen authentication while usable credentials exist. No personal mutation is automatically carried out after a sign-in prompt.

On cold start, restore credentials through the SDK and read the existing profile. Do not call bootstrap just because a GET failed or returned 404; offer explicit sign-in/appropriate recovery. Migration-specific first V2 authentication belongs to F14. On explicit sign-in, call bootstrap, then initialize the current F09/F07 associations through their owners. Unknown Pro rights neither block public sports nor invite repurchase or permit advertising.

Logout/account switch immediately advances F13's in-memory request generation, cancels private work, clears caches/profile/rights/image state and clears SDK credentials. Coordinate F07 destination disassociation while suitable proof is still available; failure cannot block local logout or be called success. F07 owns its supported recovery mechanism, not a second F05 device registry. Attempt SDK browser logout without federated Google/Apple global logout. Reject late results from the old mobile generation even when cancellation failed.

Use `getCredentials`/SDK-supported renewal when credentials are needed; do not create a timer or generic 401 replay interceptor. An authorization or contract refusal is not retried automatically. For a confirmed nonrenewable identity offer explicit sign-in; for network/provider unavailability retain a recoverable state. Never repeat mutations or purchases after refresh without a new explicit action and, where uncertain, a reread.

The same-subject JWT return limit in F05 FR-035 is intentional. Mobile cache isolation does not imply stronger server-side token lifecycle separation. Qualification must describe actual behavior honestly, not fail standard Auth0 solely for the accepted limitation.

## Errors and uncertain outcomes

Use F13 `application/problem+json` with an opaque diagnostic UUID unrelated to an account. No provider payload, email, token, object key, payment reference or conflicting person's details in errors/log export.

| HTTP / code                             | Meaning and response                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 400 / `INVALID_REQUEST`                 | Wrong type, undeclared request field, invalid username/confirmation/revision. Correct input; no automatic retry.          |
| 401 / `UNAUTHENTICATED`                 | Token missing/invalid/expired under standard validation. Apply SDK authentication handling; no automatic mutation replay. |
| 403 / `FORBIDDEN`                       | Current account/action permission refused; do not infer provider-session revocation.                                      |
| 404 / `ACCOUNT_NOT_FOUND`               | No current business profile. GET never recreates; absence is not proof of all provider erasure.                           |
| 404 / `PHOTO_NOT_FOUND`                 | Active owner's photo absent; show default avatar.                                                                         |
| 409 / `EMAIL_UNAVAILABLE`               | Missing/unusable provider email on first creation; shared email is valid. Retry/sign-in/support remain possible.          |
| 409 / `ACCOUNT_CHANGED`                 | The original intent targets a replaced account; refuse without effect and require a new explicit intent.                  |
| 409 / `USERNAME_TAKEN`, `STALE_PROFILE` | Preserve original state; reread/correct input.                                                                            |
| 409 / `DELETION_IN_PROGRESS`            | Original business account is blocked; guest/support remain available. Repeated deletion acceptance itself remains 202.    |
| 413 / `IMAGE_TOO_LARGE`                 | Input exceeds 5 MiB.                                                                                                      |
| 415 / `UNSUPPORTED_IMAGE`               | Bytes are not an admissible safely decoded PNG/JPEG.                                                                      |
| 503 / `DEPENDENCY_UNAVAILABLE`          | Required provider/storage/database evidence unavailable; no fabricated outcome.                                           |
| 500 / `INTERNAL_ERROR`                  | Safe failure; diagnostic reference supports operations.                                                                   |

After an uncertain profile/image mutation, reread current profile/revision (and image if present). After uncertain erasure acceptance, GET can establish a pending account via its declared conflict, or POST the same confirmation can safely recover an existing acceptance while authentication remains valid. Neither a 401 nor account absence proves total provider erasure: offer guest access/support without automatically recreating or asserting cancellation. No public account/deletion lookup by email or opaque diagnostic reference.

F13 read limits apply: 10 seconds, one eligible transient retry after one second. Mutations: 30 seconds; uploads: 60 seconds; no automatic repetition. Interactive browser/native SDK dialogs are not cut off by these HTTP deadlines. Navigation remains available.
