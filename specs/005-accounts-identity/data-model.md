# F05 data model

The future `accounts` Spring module owns these concepts. This is a schema design, not an executed Liquibase migration. DTOs, domain values, JPA records and Auth0 payloads remain separate. PostgreSQL constraints enforce uniqueness across concurrent requests.

## BusinessAccount

| Field                     | Meaning and constraint                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                      | Server-generated immutable UUID for one business lifecycle; never derived from email or a provider subject.                                                                                                                                                                                                  |
| `principalId`             | Unique reference to the verified external principal correspondence. One current business account per principal.                                                                                                                                                                                              |
| `status`                  | `ACTIVE` or `DELETION_REQUESTED`; not logged-in/offline/session status. Completed erasure removes the minimized account record when its remaining purpose ends.                                                                                                                                              |
| `username`, `usernameKey` | Active profile only: 3–32 ASCII letters/digits/`.`/`-`/`_`; trim surrounding whitespace, lowercase key under a unique constraint. Neutral generated prefix `player-` plus 12 lowercase hexadecimal characters; retry only actual uniqueness collisions. Clear personal presentation during accepted erasure. |
| `photoObjectKey`          | Nullable opaque key to the current private S3 image; absence selects the approved default avatar. Never a provider photo URL.                                                                                                                                                                                |
| `profileRevision`         | Nonnegative monotonically increasing revision for profile/photo edits; supplied expected revision prevents stale replacement. Not a per-field history.                                                                                                                                                       |
| `createdAt`               | Business creation time, never the F08 account-age substitute.                                                                                                                                                                                                                                                |
| `deletionRequestedAt`     | Set once upon durable acceptance; null for active accounts.                                                                                                                                                                                                                                                  |
| `deletionTargets`         | Only original external customer/file references necessary for outstanding erasure. Fixed targeted snapshot, not step statuses, retry counts or a full profile. Access restricted to cleanup/support purpose.                                                                                                 |

Account email is private provider contact data without cross-account uniqueness. Delete acceptance is not cancellation of store billing.

## ExternalPrincipal

| Field                | Meaning and constraint                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                 | Internal correspondence UUID.                                                                               |
| `issuer`, `subject`  | Canonical trusted Auth0 principal; unique pair. Exact verified identity, not a case-folded email.           |
| `principalCreatedAt` | Nullable reliable Auth0 creation instant; tied to the principal being represented. Missing remains unknown. |
| `evidenceOrigin`     | `AUTH0` or `VERIFIED_TRANSITION`, with a useful observation/import reference; no raw provider history.      |
| `observedAt`         | Time evidence was obtained, distinct from principal age.                                                    |

F14 can preserve a verified canonical-principal correspondence before business-profile bootstrap. A reservation is not an active profile or permission grant. Existing associated login identities resolve to the canonical Auth0 principal; only verified historical correspondences may be imported if a secondary reference must be represented. Do not build a generic identity graph or create new Auth0 links.

After erasure, a later social signup can reuse the same `(issuer, subject)` but creates a new business UUID and correspondence lifecycle. Standard valid Auth0 access tokens may still identify that subject: **neither the UUID nor this correspondence claims token-lifecycle separation**. No special token claim, blacklist or forced waiting period is added. Ordinary API reads cannot create missing rows.

## Provider contact email

Email ownership reservations are removed. Store a usable provider contact email on the account, without a unique constraint across principals. It is private contact data, never an account key. Explicit sign-in may update it to the same value used by another principal; missing/unavailable data preserves the reliable previous value. First creation still needs a usable provider email. The canonical `(issuer, subject)` and case-insensitive username constraints remain independent.

## Photo storage and revisions

The image is private S3 content read through an owner-authorized backend endpoint. No public ACL, permanent unauthenticated photo URL or remote provider initialization. Reads use `Cache-Control: no-store`; the native image adapter must avoid persistent account-independent image caching and invalidate in-memory image state on account change.

Check authenticated ownership, expected account UUID and edit eligibility before uploading outside SQL to a fresh key after validating actual PNG/JPEG content, input size and safe decoding/re-encoding. Recheck account UUID, eligibility and expected profile revision inside the association transaction. A refusal keeps the old association. A committed replacement/deletion advances the revision; remove obsolete objects outside SQL. An uncertain client response requires rereading the profile revision/photo presence before another upload. Failed obsolete/orphan object cleanup is diagnosed and manually completed with existing tools.

Do not overwrite or delete historical V1-owned objects. New V2 profile images do not inherit the public sporting-logo storage policy. Backups and authorized erasure follow F11/F13; restore checks current obligations before re-exposure.

## Transaction boundaries

1. **Bootstrap:** authenticate; fetch necessary provider evidence outside SQL; transactionally resolve/import the verified principal, validate the provider email and insert one neutral active profile or return the existing one. Serialize lifecycle changes on the principal; database uniqueness settles competing principal creation and username collisions. On conflict reread only the same authenticated principal; never recover by another account's email.
2. **Synchronization:** explicit login or missing-age retrieval only; preserve reliable values on omission/outage and never overwrite user presentation. Before committing provider results recheck the original account UUID/status so late work cannot update a successor.
3. **Profile mutation:** owner/current permissions plus expected original account UUID and profile revision; modify only the requested field. A stale revision rejects the full mutation without a merge UI.
4. **Erasure acceptance:** serialize on the account/principal and verify the expected original account UUID; capture original external/file targets, set `DELETION_REQUESTED`, clear/minimize local profile and coordinate personal-association removal in the same local transaction. Rollback before acceptance means no provider call. Concurrent accepted writes finish under the old UUID; writes after the block are refused.
5. **External cleanup/finalization:** one post-commit execution using captured targets outside SQL. Recheck original UUID/status before final SQL removal; a stale completion cannot remove a replacement. Manual continuation uses current private evidence and the same original targets. No persisted per-step workflow.

A delayed/repeated profile, photo or deletion intent must retain its `expectedAccountId`; reject a successor mismatch before effects, even if its revision has restarted at zero. This uses the existing business UUID, not a token/session lifecycle mechanism.

No arbitrary timed purge of an unresolved request. Retention ends when cleanup/safe return and applicable F11 obligations no longer require the record; minimize references along the way. An incident log is never the sole durable deletion obligation.

## Cross-feature keys

F06/F07/F08/F09 reference the immutable business UUID, not email or provider-local identity. F07 alone owns installations/destinations; these are not F05 sessions. F12 owns permission assignment; `accounts` exposes current usable-account resolution. F08 receives nullable reliable account age and applies its threshold. F09 owns customer correspondences and lifecycle cleanup; RevenueCat owns entitlement state and supplies only the necessary cleanup targets/outcomes. See [consumer contract](contracts/consumers.md).
