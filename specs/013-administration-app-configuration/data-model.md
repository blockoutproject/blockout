# F12 derived data model

## Ownership and durable entities

| Entity / owner                           | Fields and constraints                                                                                                                                                                  | Lifecycle                                                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AccountPermission / `accounts`           | `account_id` UUID FK to F05 account; `permission_code` text constrained to the [catalogue](contracts/authorization.md#catalogue); composite primary key `(account_id, permission_code)` | Only current grants, no role, inheritance, polymorphic scope, Auth0 mirror or assignment history. Ordinary grants join actual account creation; local erasure removes all grants atomically. |
| MaintenanceSettings / `configuration`    | Fixed singleton key; `active` boolean not null; `message` not null; nullable `image_url`; `revision` bigint constrained to 0..9007199254740991                                          | Content and activation share one revision. Content writes cannot alter `active`.                                                                                                             |
| MinimumVersionSettings / `configuration` | Fixed singleton key; nullable `ios_minimum_version`, `ios_store_url`, `android_minimum_version`, `android_store_url`, `message`; bounded `revision` bigint                              | One revision across both platforms/message; independent of maintenance. Minimum implies valid platform store URL.                                                                            |

The migration seeds both singleton rows at revision 0, maintenance inactive with an approved usable French message (for example “Une maintenance est en cours. Réessayez plus tard.”), null image and no platform minimum/message/link. Missing or corrupt rows at runtime are configuration unavailability; no service recreates them or assumes unrestricted access. Corrections use an explicitly diagnosed operator procedure, not automatic repair.

The SQL schema stores normalized versions as text after domain validation. No dynamic database enum/type migration is needed for permission objects; a check constraint or equivalent catalogue constraint rejects unsupported grant codes. A catalogue addition deliberately updates migration, server mapping and capability projection together. Existing clients ignore extra response fields.

## Revision and mutation rules

1. Resolve the current usable account and required permission, then acquire the owning configuration row for the short SQL mutation.
2. Compare `expectedRevision` with the current revision, even for a would-be no-op. A mismatch yields `409 CONFIGURATION_STALE_REVISION` and no writes.
3. Apply only supplied fields to a candidate. Validate the complete candidate and any required store confirmation; explicit null removes only optional values. No editable field (including an empty nested platform object) is `400 INVALID_REQUEST`.
4. If the normalized candidate equals current state, return current state/revision. Otherwise increment revision once and persist atomically. At maximum safe revision, refuse an effective change with a safe `500 INTERNAL_ERROR` and operational diagnostic; never wrap or publish an unsafe integer.
5. Return the persisted resource. No provider call participates in this transaction.

Use ordinary database row locks/conditional writes for serialization, not a second change ledger. Coordinate current account/grant checking at mutation with the accounts-owned interface and its transaction locking protocol: owner SQL grant changes and account erasure take the same account-row lock. Revocation committed before this serialized decision denies the mutation; revocation after it does not retroactively cancel accepted work. Lock order is account first, then the owned resource. Read-only authorization is current at its decision point.

## Field semantics and cross-language validation

| Field                       | Rule                                                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance message         | Required, nonblank, at most 4,000 UTF-16 code units. Preserve entered content after rejecting all-whitespace content; no silent truncation.                                                                                                                                                     |
| Optional versions message   | Null means absent/fallback text. Non-null must be nonblank and at most 4,000 UTF-16 code units. The form sends null for explicit removal.                                                                                                                                                       |
| Image/store URL             | At most 2,048 UTF-16 code units, absolute HTTPS URL, nonempty host, no username/password, control characters or surrounding whitespace. No network fetch validates an image.                                                                                                                    |
| Store URL                   | Platform host/path and app identifier must match the F14-qualified Blockout listing (Apple `apps.apple.com` app path and numeric ID; Google `play.google.com/store/apps/details` with the qualified `id`). No invented production identifiers. A threshold cannot remain if its URL is removed. |
| Minimum version input       | At most 32 ASCII characters; exactly one to three dot-separated digit components, each 0..2147483647. Reject whitespace, signs, suffixes and empty components. Leading zeros are accepted and removed during normalization. Normalize to three decimal components; compare integer tuples.      |
| Expected/published revision | JSON integer 0..9007199254740991; Java `long`, TypeScript exact integer guard. Fractional or unsafe values fail validation.                                                                                                                                                                     |

Java `String.length()` and JavaScript string length count UTF-16 units. OpenAPI `maxLength` counts Unicode characters and is therefore only a coarse upper bound for messages/URLs; descriptions and `x-maxUtf16Length` retain the exact rule. Explicit Java/TypeScript semantic validation and shared fixtures must reject over-limit surrogate-pair inputs even when a schema's character count passes. Version component bounds also require semantic validation beyond regex.

For message blankness, both implementations use the ECMAScript whitespace/line-terminator set: U+0009–000D, U+0020, U+00A0, U+1680, U+2000–200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF. Empty or all-set-character content is invalid. Java must implement this same set rather than assuming its default `isBlank()` matches JavaScript `trim()`; nonblank content remains unchanged. Include NBSP and supplementary-character fixtures.

A new or numerically raised platform minimum requires `storeAvailabilityConfirmed: true` on that mutation; one acknowledgement covers every added/raised platform in that submission. A link edit without raising a threshold still validates the app identity. Removing a minimum preserves its link unless explicitly removed. Confirmation is command input, not stored proof of ongoing availability.

## Non-durable projections

- **CurrentCapabilities:** current business UUID plus the 21 known booleans; generated response shape, no token permission source and no guarantee of resource eligibility. Private in-memory data uses F05/F13 session generation.
- **AccessSnapshot:** maintenance and versions read from one SQL snapshot; no account, permission or bypass. Both revisions travel with the resources.
- **MaintenanceRefusal:** typed maintenance projection attached to a safe F13 Problem. It confirms only that resource and cannot establish complete verification.
- **Access memory:** complete-check outcome and snapshot, latest observed revision/value for each resource in the current process, installed native version result, account-bound bypass and access outcome. [Mobile contract](contracts/mobile-and-design.md) owns reconciliation.
- **Form state:** published resource/revision, draft, dirty fields and save outcome. A changed draft is never installed as global published access state; previews stay local.

## State transitions

Content save preserves maintenance activation; explicit state command changes activation only. Inactive → active requires a valid message and the current shared maintenance revision. Both transitions leave version configuration, acquisition controls and inbox retention unchanged.

A usable account → deletion accepted makes permissions unusable immediately and removes grant rows in the same local F05 transaction. Recreated account has a different lifecycle/UUID and only three new ordinary grants. Logout clears private projections/bypass. Public observations may remain in memory across an account change because they contain no rights. A cold start resets the access state to unavailable; no access snapshot, verification timestamp or storage envelope is persisted or restored. A complete successful check is required before ordinary access opens; partial administrative results cannot establish it.
