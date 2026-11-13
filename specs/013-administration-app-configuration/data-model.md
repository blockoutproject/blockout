# Data model: administration and access

## Permissions and locking

Store a unique association `(accountId, permission)` referencing the active F05 business UUID. Deletion cascades with that account. Permission identifiers come from known backend action definitions, not user-supplied expressions, arbitrary scopes or Auth0 role names. F12 defines `maintenance.manage`, `application-versions.manage` and `maintenance.bypass`; existing F02 actions keep separate presentation, classification and division-lifecycle grants. F01 adds the independent `collection.manage` action. F08 adds `stream-links.moderate`, covering all contribution moderation actions without additional publication/withdrawal grants or maintenance bypass. Other owners extend actual action definitions in their plans rather than receiving an implicit F12 administrator privilege.

Ordinary account capabilities are evaluated from usability and domain conditions, not seeded as privileged rows. No role, delegation scope, owner-account table, grant history or session registry is needed. The product owner controls the SQL access used for assignment; a mobile operator cannot obtain that access through an application grant.

Manual assignment/revocation locks the target account in a short transaction before changing associations. Protected mutations acquire their domain root locks first, then account locks in UUID order, then read current grants and apply effects before commit. Grant-only changes need no domain root lock. A current read checks account existence and grants without claiming to invalidate an already returned response. Account erasure removes grants and private associations without acquiring sporting root locks; no writer acquires a sporting root after an account lock. F02 and F05 record the same boundary; later F07 transactions must preserve it.

## Permission projection

Extend the canonical F05 `AccountResponse` with a required `permissions` object of named boolean capabilities. Current fields cover `manageMaintenance`, `manageApplicationVersions`, `bypassMaintenance`, `manageSportingPresentation`, `manageSportingClassification`, `manageDivisionLifecycle`, `manageCollection` and `moderateStreamLinks`. They express current grants, not unconditional eligibility for every domain resource. The [canonical permission projection](../../contracts/http/mobile/access/schemas.yaml) includes division presentation under sporting presentation, while division lifecycle covers creation and activity. No separate division-management grant, generic `isAdmin` or owner flag is returned.

Properties are optional and absence means no capability. Responses tolerate additional properties, so a future action does not make the entire account unreadable for an older app. The server emits the known capability values; the client accepts only literal true as a positive grant. Future owners add fields and backend mappings together; no dynamic client evaluator or permission-schema registry is introduced.

Only `GET /accounts/me` has the maintenance-identification exception. Other account responses using the same representation remain subject to their operation's admission policy. This read may return 404; it never establishes/recreates an account. Account/profile ownership remains F05's.

## Maintenance settings

One fixed-identity row contains:

| Value      | Meaning                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `active`   | Desired global maintenance state. Content edits never change it.                                                  |
| `message`  | Required plain text, trimmed and nonempty, usable without media.                                                  |
| `imageUrl` | Optional controlled HTTPS asset URL; null removes it. No credentials, personal data or personalized tracking URL. |
| `revision` | JPA-managed monotonic version; advances for an accepted state change.                                             |

Fresh initialization is inactive, with the standard approved maintenance message and no image. Activation requires a usable message. Public inactive responses omit the prepared message and image using null values; the authorized management read exposes stored content. Invalid URL syntax is rejected, but backend content fetching and guaranteed remote availability are not required.

## Application version settings

One fixed-identity row contains independent iOS and Android minimum versions/store URLs, one optional shared update message and its own revision. Each platform starts with no minimum and no link; the shared message starts absent.

Versions use three decimal integer components without leading zeros except zero itself. Compare components numerically, not lexically; keep components within the safe integer range supported by the actual JSON/JavaScript consumer. No prerelease/build suffixes, ranges or coercion of malformed input. A null minimum removes that platform's requirement. A retained minimum requires a valid HTTPS link to the platform's store: App Store under `apps.apple.com`, Google Play under `play.google.com/store/apps/details` with the intended application ID. The operator verifies that it targets Blockout and the required binary is downloadable; syntax is not proof of availability.

Optional message null removes the customization and uses the existing understandable update text. No deadline or store-availability claim is generated. PATCH computes and validates the whole resulting settings group atomically: omitted fields retain their current values, null only removes optional values. Both platform edits share the group revision.

## Revisions and complete reads

Revisions are nonnegative integers representable exactly by JavaScript, backed by database/JPA versions. Validate the wire range and refuse an overflow instead of wrapping. Compare the submitted revision with the current aggregate before applying changes; JPA's commit-time version check protects the concurrent-write window. A stale revision returns 409 with no effect, including an attempted no-op against stale state. A matching no-op preserves the revision.

Read both settings rows with one SQL statement projection so the complete access response has a coherent statement snapshot. Missing/invalid settings fail closed, never synthesize permissive initial values. No global revision row is needed.

The process public Query cache owns the latest successful complete maintenance/versions representation. No successful complete read in this process means no public admission, including after a successful partial management read or write. A failed recheck leaves Query’s complete data in place, retaining the known restriction, platform minimum and valid platform-store URL while the current Query error supplies [F13 read feedback](../003-shared-quality/spec.md#functional-requirements). Maintenance keeps presentation priority; when update is presented, its retained valid URL supplies the store action. A successful complete response replaces that configuration and may reopen access. Partial administrative reads never populate the public result. Management write attempts normally invalidate the complete public query. No persisted configuration, second admission store, restriction history or refusal latch is introduced. One explicit temporary bypass choice remains account-scoped React state; the private Query cache belongs to the mounted native principal. Backend owners retain current authorization.

Each settings form retains its existing RHF visit and one coherent editable baseline/revision behind the [F13 blocking read card](../003-shared-quality/plan.md#frontend-form-conventions). Maintenance and versions have independent baselines; both platform edits share the versions revision, and maintenance content/activation share the maintenance revision. A background representation never silently rebases dirty input. A failed/lost write preserves values and editing revision with normal invalidation, while an accepted group ACK establishes that group’s accepted values/revision even if the next read fails. Actual conflicts allow an explicit current baseline choice. Read Retry never resends a write. No duplicate server snapshot, draft persistence, receipt or read-status mirror is introduced.

## Cross-domain boundaries

Account deletion removes grants, not global settings. Maintenance does not erase data, change sporting source state, cancel already admitted work or restart missed collection. F07 inbox/purge continue and sporting push admissions are skipped while maintenance is active. Legal/public health resources and internal processing keep their explicit purposes; no broad administrative privilege is inferred from those exceptions.

Database restore follows F13/F05 current erasure/rights obligations. Exceptional settings repair uses ordinary SQL with the same invariants and a revision increment, without an automatic recovery process or volume reset.
