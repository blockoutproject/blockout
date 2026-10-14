# F05 interfaces

The [canonical mobile OpenAPI root](../../../contracts/http/mobile/openapi.yaml) references account [operations](../../../contracts/http/mobile/accounts/paths.yaml) and [schemas](../../../contracts/http/mobile/accounts/schemas.yaml). These are the only editable HTTP sources. [F13](../../003-shared-quality/contracts/README.md) owns generation, shared headers/errors and compatibility; F05 owns account meaning. No account contract is copied into this folder.

## Provider, consumers and operations

The modular backend supplies these operations to the native mobile account feature. The collector is not a consumer and receives no account authorization. Existing sporting operations remain unchanged; they consume account usability/current F12 rights in-process, not through another service call.

| Operation                         | Need and observable effect                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /accounts`                  | Explicit establishment after authenticated login, or targeted missing-provider-data retry. 201 + Location for creation; 200 for an existing usable account. No caller-supplied identity or email. |
| `GET /accounts/me`                | Existing current profile and F12 permissions; also available for maintenance identification, without creation, Auth0 synchronization or opening blocked navigation.                               |
| `GET /accounts/{accountId}`       | Owner reread of the original target after a profile/deletion uncertainty. An absent original account returns 404 without provider effects.                                                        |
| `PATCH /accounts/{accountId}`     | One atomic multipart profile save. JSON metadata contains supplied username/photo intent; image only for replacement. Omitted fields retain current values.                                       |
| `GET /accounts/{accountId}/photo` | Private accepted binary photo, no-store; missing/inaccessible photo returns 404.                                                                                                                  |
| `DELETE /accounts/{accountId}`    | Synchronous local deletion, then bounded external attempts; 204 without a body even if external cleanup is logged for manual handling. Absent original UUID: 404 without further effects.         |

All account responses are private and `no-store`, including errors. F13's allowed client/environment/scope validation precedes use-case ownership. Other accounts are not exposed through UUID guessing. Photo bytes receive the same authorization as the profile. API absence never alone proves every supplier's physical erasure.

DELETE targets the original business UUID. After a lost response, read that original resource before explicit retry; never substitute an account recreated by later authentication. A 404 establishes resource absence, not physical provider purge. If the read is also unavailable, use an ordinary error and permit local sign-out without claiming confirmed deletion. No deletion receipt, monitor URL or pending-account error is exposed.

## Validation and failure semantics

- `ChangeAccountProfileRequest` rejects unknown fields and explicit null. Outer username whitespace is trimmed before the 3–32 character/ASCII validation and case-insensitive uniqueness check. Structural generation alone cannot express normalization before validation.
- Supply username, photoAction, or both; an unchanged username is valid. Omitting photoAction preserves the photo and forbids an image; replace requires one image, remove forbids it. The canonical schema owns the image bounds. Cross-part checks are focused boundary validation; a failed field rejects the whole save.
- Profile concurrency follows the [plan](../plan.md#profile-photo-and-concurrent-changes), independently of sporting editor revision rules.
- The [shared error responses](../../../contracts/http/common/problems.yaml) own problem identifiers for username collision (409), missing usable first-creation email and invalid image content (422), unavailable required provider retrieval (503), and ordinary request/media failures. Account operations reuse this profile without a parallel `code` property or account-specific error model.
- Responses tolerate additional properties, while known fields remain validated. `principalCreatedAt: null` means unknown age; a missing required field or wrong type is invalid. Multipart omission and null are distinct. Do not force a JSON validation path onto binary images.
- An interrupted mutation can have committed. Reread the original target before an explicit retry; no automatic retry, network-reconnection replay or token-renewal replay. No deduplication key/job store is necessary for these original-target effects.

Shared Problem Details remain unchanged. Qualify multipart metadata/file binding and bodyless 204 handling in the generated Spring/Jackson and Orval/Zod consumers; source validation alone is not compilation/runtime evidence.

## Other boundaries and coordinated consumers

| Boundary                              | Authority and integration                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 native SDK / hosted login       | Provider protocol; no Blockout login/logout/password endpoint. F05 selects environment connections, credential lifecycle and existing-principal rules.                                                                                             |
| Auth0 Management API                  | Backend-only exact-principal lookup and scoped cleanup; minimal read/delete capabilities, no mobile secret. Existing linked identities and preproduction scope are checked before destructive operations.                                          |
| RevenueCat SDK and customer API       | F09 owns entitlements/restore; F05 passes usable business UUIDs and cleans original customer references. Non-creating inspection is required for manual erasure verification.                                                                      |
| Notifications                         | F07 owns destination registration/removal contracts. Carry the original account association so a late removal cannot delete a new binding; one best-effort local sign-out attempt, full server-side erasure scope. No premature new endpoint here. |
| Permissions / admission               | F12 owns capabilities and global gates; business use cases consult current state. No grant enumeration or administration API is invented by F05.                                                                                                   |
| Contributions, support and transition | F08 detaches attribution; F10/F11 own private requests and retained content; F14 owns historical coverage and cutover. Native restore does not erase an old RevenueCat customer automatically.                                                     |

Generate backend/mobile consumers from the same canonical revision. These account contracts are not yet implemented or released, so removing the draft receipt/pending shapes requires no deployed-client migration. Generate both consumers together; F02 operations and the deployment/version surface remain unchanged. Future changes must preserve all F12-admitted mobile versions under F13's compatibility policy.
