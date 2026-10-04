# F12 validation guide

This guide separates documentary validation from future implementation proof. The repository has no initialized application runtime; do not invent Nx targets, package scripts or provider results. All runtime, database, generated-consumer, native and store checks below remain future until their actual owners exist.

## Prerequisites and documentary checks

Read [spec](spec.md), [plan](plan.md), [contracts](contracts/consumers.md), [architecture](../../docs/architecture.md) and [repository guidance](../../AGENTS.md). For this dossier, run the official Spec Kit checklist/tasks/analysis procedures, validate OpenAPI structure and every local reference, inspect Markdown links/anchors and run:

```sh
npx --yes prettier@3.9.6 --check README.md AGENTS.md "docs/**/*.md" "specs/**/*.md" ".github/**/*.{md,yml}" .prettierrc.json
npx --yes prettier@3.9.6 --check "specs/013-administration-app-configuration/contracts/*.yaml"
git diff --check
```

The requirements-quality checklist is a review artifact, not an executed test suite. Publish analysis findings and actual check results in the issue/chat, not a repository delivery log. Preserve imported skills/templates and retained historical source links.

## Future runtime setup

After global plan acceptance and authorized F13/F05 initialization, use the actual committed Nx/Maven/npm targets and pinned dependencies. Start the disposable PostgreSQL environment defined by those manifests, apply Liquibase and use controlled Auth0/S3/provider doubles for automated boundary tests. Create separate fixtures for visitor, ordinary account, each single configuration permission, all three permissions, revoked permissions and deletion-requested account. Use exact disposable UUIDs, no live personal data or production grant edits.

Use the installed configuration schema and generated clients from the committed F13 contract pipeline. A real consumer compilation and native build is required before claiming those checks pass. Do not install or upgrade frameworks merely to run this planning guide.

## V01 — Permissions and identity

Prove all 21 booleans map to the catalogue, that new-account creation inserts exactly three ordinary grants atomically, concurrent bootstraps do not duplicate them, and later login/bootstrap never restores a removed grant. Direct HTTP requests must fail without current permissions regardless of visible controls or JWT scope. Demonstrate permission separation with maintenance-only, versions-only and bypass-only operators; check F01/F02/F08 resource conditions and owner-only F09/F11 boundaries.

Use real PostgreSQL to reject invalid code, orphan account and duplicate grant. Exercise the controlled owner procedure against wrong environment, wrong/nonexistent UUID, unusable account and unexpected before/after changes; roll back on mismatch. Serialize revocation/erasure with final mutation checks. Prove erasure acceptance removes grants in its local transaction, makes rights unusable and cannot affect a successor account. Clear capabilities/bypass and reject late private responses on account switch/logout/deletion. Recreated UUID receives no old privilege.

## V02 — Save outcomes and concurrency

With maintenance inactive, save content and show it remains inactive; repeat while active. Try blank messages, UTF-16 length boundaries (including emoji), invalid HTTPS URLs, null optional removals, missing required fields and empty patches. Distinguish missing nested platform fields from null; refuse removing a link while its minimum remains.

Use two real transactions with the same revision: only one effective change succeeds, the other returns 409 without effect. A content change invalidates an activation command based on old content. A valid same-state command retains revision; overflow cannot wrap. Missing singleton rows yield configuration unavailability and are never reseeded at runtime.

Keep a dirty draft during successful/failed refresh. Drop a mutation response after commit, then introduce a second operator change: rereading presents observed state without attributing it to the lost request; resubmission is explicit against the observed revision. A failed reread remains uncertain. Initial read failure cannot enable saving invented defaults. No mutation auto-retry or preview side effect.

## V03 — Complete verification and server admission

Cover every row in the [access matrix](contracts/mobile-and-design.md#access-decision-and-precedence) for ordinary tabs, direct links, operator administration and legal/support/identification. Activate maintenance during an open session: the next concerned HTTP request receives typed `503 MAINTENANCE_ACTIVE`, produces no automatic retry and updates blocking. A malformed projection blocks safely without installing invalid state. Technical read 503 follows only F13's bounded retry.

Succeed at one cold start, then immediately restart and fail the next complete check: ordinary access stays unavailable. Explicit retry failure preserves the gate; complete retry success applies current restrictions. Put a legacy permissive snapshot in storage and prove it is ignored without creating a new persistence path. Deliver complete, administrative and refusal responses in reverse order during one process; older revisions never overwrite newer knowledge or certify complete verification. Equal-revision conflicting payloads fail validation. Reject a response from another environment/API origin.

Cold start and explicit Retry trigger complete checks; foreground, Auth0 browser return, reconnect, remount and elapsed time do not. Keep an open session usable without a new timer, while applying ordinary server refusals. Bypass survives maintenance off/on in the same account memory, but not full restart/logout/account change; forged header and revoked right do not admit. No bypass lifts a minimum.

Admit a request, activate maintenance, then let its domain continue: no assumed cancellation. Repeat with permission revocation or a stale resource revision at final mutation and expect domain refusal. For F02 upload, keep provider I/O outside SQL and recheck before association. Prove F01 pause/current cycle/closure/scheduling is unaffected.

Recovery fixture: public snapshot fails while the permitted administrative group read succeeds. Allow only targeted administration, preserve a known version restriction, require that reliable group read before editing, and retain ordinary unavailability after save until explicit Retry establishes a complete snapshot. Also cover admin read failure and revoked manager permission.

## V04 — F07 integration

A controlled caller first proves current maintenance/unavailability read semantics. Then use the actual F07 owner to create eligible inbox entries and exercise the real sending decision: active maintenance and failed configuration lookup produce no provider attempt, including operators. Purge and retention continue; reopening creates no replay queue or resurrected entry. A new event after reopening uses ordinary F07 rules. A provider-accepted prior message retains its recall limitation and opens into the current access gate. No controlled substitute satisfies the real integration gate.

## V05 — Versions, stores and media

Run identical Java/TypeScript fixtures: `2`, `2.9`, `2.10.0`, `02.009.0`, zero, component maximum, overflow, four components, suffix/sign/whitespace/empty component, 32/33-character inputs. Compare normalized integer tuples, lower/equal/higher values and independent iOS/Android minima. Unknown installed version without a minimum permits other rules; with a minimum it produces an explained block.

Require human availability acknowledgement for adding/raising each minimum and reject wrong-platform/incorrect app identity URLs. Lowering/removing does not change maintenance; clearing one minimum leaves the other platform unchanged. Changing the draft invalidates an earlier confirmation. Verify minimum remains after bypass/deactivation, unavailable configuration and failed store opening; opening the store never counts as installation.

On actual iOS/Android binaries use native installed versions and the F14-qualified listings; validate external navigation, cancellation/failure and explicit Retry after update. An inaccessible optional image still leaves text/actions; animated media obey reduced motion. Neither browser simulation nor a well-formed URL qualifies store availability.

## V06 — Contract, design and transition

Validate seven operations, consumed required fields/nullability, safe revision bounds, extra response properties, malformed payload rejection and open unknown error codes. Validate all 21 known capability booleans and an added future field with the old client. Validate `Cache-Control: no-store`, including failures. Generate Java/TypeScript and compile actual backend/mobile consumers; adopt the single F13 Problem source and typed maintenance extension in concerned ordinary endpoint contracts.

Verify Spring module boundaries (no accounts-to-configuration cycle or cross-module repository), diagnostics with no credentials/personal/provider payloads, French text, and the [exact approved Figma states](contracts/mobile-and-design.md#design-authority). Qualify both themes, small screens, enlarged text, focus, semantic controls, touch targets and reduced motion on native devices. F14 separately establishes older-client API compatibility, store identities/availability and transition constraints; transition welcome cannot bypass restrictions.

## Coverage

| Validation block              | Active requirements | Retained scenarios | Success criteria | Implementation tasks             |
| ----------------------------- | ------------------- | ------------------ | ---------------- | -------------------------------- |
| V01 — Permissions             | FR-001–FR-005       | A01–A05, A16       | SC-001           | T004, T006–T011, T017, T028      |
| V02 — Saves                   | FR-006–FR-011       | A06–A12            | SC-002           | T005, T012–T015, T023–T024, T028 |
| V03 — Access/admission        | FR-012–FR-020       | A13–A22            | SC-003, SC-004   | T016–T020, T026, T028            |
| V04 — Notifications           | FR-021–FR-023       | A23–A26            | SC-005           | T021–T022                        |
| V05 — Versions/messages/media | FR-024–FR-031       | A27–A33, A08, A20  | SC-006           | T013, T015–T020, T023–T026       |
| V06 — Integration/design      | FR-034–FR-036       | A35                | SC-007           | T001–T003, T027–T030             |

FR-032, FR-033 and A34 are intentionally excluded. Cross-cutting setup/contract tasks support multiple rows. The union covers 34 active requirements, 34 retained scenarios and seven success criteria; it does not count runtime tests as executed.

## Evidence and stop conditions

For each implementation boundary report passed, failed, skipped or unavailable checks and their exact scope. Missing runtime owners, production store identifiers, native builds or provider qualification remain explicit outstanding evidence. Refuse completion for a missing required generation/consumer check, unsafe stale response, orphan requirement or real F07 integration replaced with a fake. Follow F14 for any production transition; this dossier authorizes none.
