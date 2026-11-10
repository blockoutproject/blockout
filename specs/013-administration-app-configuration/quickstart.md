# Quickstart: Validate administration and application access

Use the [README verification commands](../../README.md#verification), [canonical operations](contracts/README.md#operations-and-semantics) and [data constraints](data-model.md). F13 supplies the generated consumers and selected test tools; native accessibility verification follows [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity).

## Prerequisites

Use isolated migrated PostgreSQL and compatible native development clients with valid environment-specific Auth0 configuration. Reuse clients whose native dependency/configuration graph matches the source; rebuild only when that graph requires it. Prepare a guest, ordinary usable accounts and operators with separate grants; use fictional identities and no production credentials in committed fixtures. Make both settings groups controllable. Follow [F13 proportionate qualification](../003-shared-quality/plan.md#proportionate-qualification): local functional checks do not wait for publication, while actual provider/store operations retain their own authorization and inputs.

## Focused scenarios

| Boundary                 | Exercise                                                                                                                                                                                      | Expected evidence                                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permissions              | Call management as guest, ordinary user and operators with only one F12 grant; enter mobile administration during maintenance as a manager without bypass; try redistribution and revocation. | Correct 401/403, no unauthorized effects, assignment endpoint or implied grants; a manager with an admitted version reaches authorized administration while ordinary access stays blocked without bypass.                                                        |
| Account lifecycle        | Read `/accounts/me` in maintenance; delete/recreate a granted account; use an old mobile-session response.                                                                                    | Identification only, no automatic creation/navigation; no restored grants; old-session results discarded.                                                                                                                                                        |
| Concurrent authorization | Hold the target account lock, order a protected mutation and a manual revoke both ways.                                                                                                       | Already admitted transaction finishes before revoke, or current grant check refuses without effects; no grant read cached across the ordering boundary.                                                                                                          |
| Settings                 | Save message while inactive/active, set activation explicitly, remove image/message/minimum where allowed, omit fields, submit a minimum without a link.                                      | Correct atomic changes; no accidental activation or cross-group changes; invalid resulting state refused.                                                                                                                                                        |
| Native editing           | Edit minimum-version/store-link fields inline or on the ordinary edit screen; use first/last fields, keyboard, scroll and cancel/back in both themes and enlarged text.                       | All unchanged fields/actions remain reachable; no form sheet, lost dirty values or unintended cross-group save.                                                                                                                                                  |
| Concurrent editing       | Two clients edit the same group; also edit maintenance and versions independently; lose a save response.                                                                                      | Stale revision rejected with no effects; independent groups succeed; drafts survive, reread establishes current outcome before explicit retry.                                                                                                                   |
| Cold start               | Restart after prior success with access read failing; separately fail credential retrieval or account reading while public configuration succeeds, restore connectivity and press retry.      | No persistent fallback; native read recovery runs before a failed initial read offers explicit retry. Retry recovers identification without restart, interactive sign-in, account creation or session switch; public results stay independent.                   |
| Late results             | Deliver an older full read after a newer admin write or maintenance refusal, then an older refusal after a newer complete read.                                                               | The current complete Query read owns admission; partial administrative results invalidate it without granting access. Private callbacks remain scoped to their native principal.                                                                                 |
| Native maintenance       | Enter explicit bypass, refresh a token silently, revoke bypass, sign out/switch account and restart. Try blocked deep links and the private account-photo read.                               | Bypass stays personal and temporary; no interactive sign-in at gates; current grants and route guards enforced; bypass intent reaches protected backend images, never external URLs.                                                                             |
| Version control          | Compare 2.9.0/2.10.0, equal/higher, absent threshold and unreadable installed metadata. Combine maintenance and outdated operator.                                                            | Numeric ordering; no minimum exception, maintenance shown first but no outdated admin admission; existing unavailable screen when applicable.                                                                                                                    |
| Store/media failures     | On compatible clients, hand off to each platform store; exercise opening failure/retry and a broken optional image.                                                                           | No inferred installation or download availability; explicit store retry; message/actions remain usable without media.                                                                                                                                            |
| Domain continuity        | Activate maintenance during a short accepted mutation; process ingestion/inbox/purge; admit a new sporting push.                                                                              | Accepted effects retained; collection/inbox/purge continue; new pushes skipped for all recipients without replay.                                                                                                                                                |
| Contract boundary        | Generate/compile Java and TypeScript, run response validation and wrong-token cases.                                                                                                          | Null/absence, numeric range, additional fields, capabilities and Problem Details behave as authored; ordinary maintenance refusals carry current maintenance, exempt operations only technical unavailability; deterministic generated output stays outside Git. |
| Accessibility            | Representative compatible iOS/Android compositions with text scaling, reduced motion, ordinary form keyboard/focus and deep-link/back navigation under FR-030.                                | Approved actions remain reachable; ordinary field focus and labels understandable; decoration never carries the only information. No exhaustive presentation cross-product or dedicated screen-reader campaign is added.                                         |

## Direct authorization and manual grant lifecycle

Use the [owner-only grant/revoke procedure](../../infra/operations/README.md#owner-only-action-grants) against an authorized disposable connection. Exercise actual F01/F02/F05/F08 commands and all eight independent action values, including withdrawal ordered before/after a short protected mutation and erase/recreate. Expect current grants, no inferred permission and no old-UUID reassignment. Assignment remains an owner operation, never an application capability.

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=ActionAuthorizationTest,CurrentPermissionsTest \
  -Dit.test=DirectAuthorizationIntegrationTest,ManualGrantOperationsIntegrationTest,PermissionPersistenceIntegrationTest,EraseAccountIntegrationTest,CollectionControlIntegrationTest,SportingPresentationIntegrationTest,SportingResourcesIntegrationTest,SubmitContributionIntegrationTest,ModerateContributionIntegrationTest,ContributionSportingLocksIntegrationTest
NX_LOAD_DOT_ENV_FILES=false NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  npx nx run backend:verify --output-style=static
```

## First-environment rehearsal

For the local rehearsal, use actual F05 sign-in with dedicated test identities and migrated isolated PostgreSQL. Apply only owner-authorized SQL grants to the current business UUID, verify management/bypass, and confirm that a second ordinary account remains blocked and an outdated operator cannot bypass its minimum. This local work does not require a store publication campaign.

Restart the owned backend process and verify that committed settings survive. Correct an invalidating operator mistake using ordinary authorized SQL, advancing only the edited group's revision and preserving the complete resulting-state invariants. Reread committed state and verify complete-read admission; apply current grants/erasures before older data is used. No hidden bootstrap endpoint, reset or dedicated recovery tool is expected.

Before actual public distribution, F14 separately establishes the owner normally with the exact production binary in its test channel, manually grants only required actions, verifies administration, and activates maintenance if opening is deferred. Inspect the pre-public exposure boundary separately; a test channel is not a backend access control. The local correction/restart rehearsal does not complete that production-identity preparation.

## Atomic settings

Run the generated TypeScript wire boundary through the disposable `AccessSettingsConsumersIntegrationTest` orchestrator, never against a retained/shared backend or database. It invokes the installed Jest entry directly with Node from the mobile workspace. Its explicit opt-in enables settings writes; skipped cases provide no qualification. Preserve omission versus explicit null in both maintenance/versions PATCH models, decode the actual successful responses and a genuine stale-revision 409 Problem Details response. Keep SQL atomicity, current-grant/concurrency checks and ordinary form recovery in their focused suites; F10 multipart remains unchanged.

```sh
BLOCKOUT_ACCESS_CONSUMERS_TEST=true ./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=AdministrationSettingsWebMvcTest,AccessSettingsValidationTest \
  -Dit.test=AccessSettingsIntegrationTest,AccessSettingsConsumersIntegrationTest,AccountMaintenanceAdmissionIntegrationTest,HealthEndpointIntegrationTest
npm run test --workspace=@blockout/mobile -- \
  --runTestsByPath src/features/access/__tests__/maintenance-settings.test.tsx \
  src/features/access/__tests__/application-versions-settings.test.tsx
```

For the complete repository check when private per-application `.env.local` files exist, disable Nx's local dotenv loading so synthetic security tests keep their committed inputs:

```sh
NX_LOAD_DOT_ENV_FILES=false NX_DAEMON=false BLOCKOUT_ACCESS_CONSUMERS_TEST=true npm run verify
```

Exercise the real Maintenance content-editing route under its ordinary providers on a compatible installed iOS Simulator/client. Check ordinary text focus/typing, first/last content fields, keyboard/“Enregistrer” reachability, validation/draft retention, back confirmation and the representative theme/text cases under [F13 FR-030](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity). Maintenance has no secret field; no temporary secure-entry mount is required. T045 retains its bounded recorded iOS 17 content-editing scope, without qualifying the complete activation page. Cold-launch maximum-text title/activation truncation remains in F13 T072/T073's general qualification, alongside T077's live-setting limitation. Keep exact runtime/build/toolchain, captures and observed limits in the PR; this evidence does not qualify iOS 16.4, actual Auth0/provider behavior or general F13/F12 acceptance.

## Optional maintenance preview

Use the actual Maintenance form with a syntactically valid HTTPS image URL. Observe loading, displayed media, decode failure, explicit “Réessayer l’aperçu” and URL replacement. Each state occupies the same 96-point media region, with no illustrated State Card or form-wide progress. Retry must remount only the current image: no configuration reread, write, URL removal or draft/revision reset. A pending or failed image leaves message and URL inputs editable and allows explicitly saving valid changed text; invalid URL/message validation and navigation confirmation still apply.

```sh
npm run test --workspace=@blockout/mobile -- --runInBand --reporters=default \
  --runTestsByPath src/features/access/__tests__/maintenance-settings.test.tsx
```

Qualify representative compact and enlarged-text compositions on explicitly allocated iOS/Android development clients, in both themes across those cases. Check that the fallback and minimum-size retry target stay inside the media region, text inputs remain usable and Save remains reachable with the ordinary keyboard/scroll owner. Use controlled demonstration media when necessary and distinguish a native rendering/decoding harness from real account/API/provider integration. Captures, build identifiers and delivery evidence belong in the PR, not here. Broader F12/F13/provider qualifications retain their existing owners and limits.

## Shared maintenance admission

Exercise the exact ordinary/operational method/resource boundary, complete public read, typed maintenance refusal and current-account identification exception:

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=MaintenanceAdmissionWebMvcTest,AccountAccessWebMvcTest,AccountProfileWebMvcTest \
  -Dit.test=MaintenanceAdmissionIntegrationTest,AccountMaintenanceAdmissionIntegrationTest
npm run test --workspace=@blockout/mobile -- \
  --runTestsByPath src/shared/api/__tests__/api-fetch.test.ts \
  src/features/access/__tests__/maintenance-bypass.test.tsx \
  src/features/access/__tests__/access-gates.test.tsx
```

Expect canonical no-store 401/403/503 responses, current grants and no permissive configuration fallback. Generic/inconsistent unavailable data must not fabricate maintenance or admission. Native gates and provider behavior require their own setup.

## Owner-operation continuity

Run the actual local F01/F05/F10 operation boundaries in their owning quickstarts with isolated fixtures. Activate maintenance before versus after ordinary short-operation admission. Expect new ordinary work to be refused while accepted erasure and fully received support retain their outcomes; collection desired pause/activity, running-cycle drain, resumption, missed runs and independently authorized internal work remain unchanged. F10's complete private receipt/multipart qualification stays with F10.

T030 also retains a real confirmed native purchase across maintenance, consuming [F09 T027's actual purchase qualification](../006-pro-subscriptions/tasks.md#phase-5-user-story-3--purchase-and-manage-my-subscription-without-ambiguity-priority-p1). Local admission or controlled purchase callbacks do not complete that junction. Keep actual purchase/provider inputs and authorization at their owners and report the remaining outcome as unavailable until exercised. Uncertainty follows each domain; no general cancellation, suspension or catch-up mechanism is introduced.

## Sporting push maintenance policy

After dependency installation and contract bundling, run:

```sh
./mvnw -B -ntp -pl apps/backend test -Dtest=MaintenancePushAdmissionTest
```

Exercise current maintenance before each handoff decision without recipient privilege/bypass input. Expect active maintenance or unavailable state to prevent a new handoff, while an earlier admitted handoff may finish. This policy check alone does not establish actual sender binding or receipt.

## Maintenance notification continuity

Run the actual F07 producer/inbox/sender/purge and current F12 SQL admission boundaries:

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=MaintenancePushAdmissionTest \
  -Dit.test=MaintenanceNotificationIntegrationTest
NX_LOAD_DOT_ENV_FILES=false EXPO_NO_DOTENV=1 \
  npm run test --workspace=@blockout/mobile -- --runInBand --reporters=default \
  --runTestsByPath src/features/notifications/__tests__/maintenance-push-navigation.test.tsx
```

For A23–A26, expect eligible retained inbox entries during maintenance, no new handoff for ordinary or operator recipients, continued age-29 exclusion/purge, no replay on reopening and current access on old-push taps. Activation during an admitted batch may allow that batch to finish but must prevent the next handoff. Controlled Expo/native I/O does not establish physical receipt or an atomic remote stop/recall.

## Native access composition

Use compatible iOS/Android development clients with the actual F05/F14 composition and [approved design sources](spec.md#design-evidence), independently of public distribution. Reuse deterministic cold-start public/identity failures, partial/late responses and current-grant cases; observe representative native retry, direct links/back, grant withdrawal and combined maintenance/minimum behavior. Expect the public complete check to remain independent of credential initialization, ordinary closure without a successful check, separate operational admission and no minimum-version bypass. Actual native authentication and exact signed-binary qualification remain with F05/F13/F14.

Across representative compositions, verify both themes, ordinary form keyboard/focus, navigation, enlarged text and reduced motion without repeating every asynchronous scenario in every presentation. Confirmed maintenance/update retains native refresh; failed admission uses Retry alone under F13. Store opening is a native action, never proof that a required binary is downloadable.

Compare the blocking-screen backdrop with the [native composition](plan.md#mobile-state-and-native-behavior): the compact rail stack stays centered as a whole, the one-way loop joins seamlessly, and reduced motion stays still.

## Native versions and release boundaries

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath \
  src/features/access/__tests__/installed-version.test.ts \
  src/features/access/__tests__/store-action.test.tsx
```

T035 owns deterministic 2.9.0/2.10.0 numeric ordering, lower/equal/higher versions, absent thresholds and unreadable required metadata. T039 uses compatible iOS/Android development clients to observe actual installed metadata and the platform store handoff, understandable failure/retry, combined maintenance/update and corrected/removed thresholds. Opening never lifts the minimum or proves installation; these local checks require neither store publication nor a real purchase.

Record the compatible client's actual installed published version and vary only the isolated platform threshold: absent, equal and above, plus below when the installed version permits it. A client at `0.0.0` has no lower valid threshold; retain T035's deterministic numeric-ordering evidence instead of rebuilding to manufacture that case. Exercise maintenance with an outdated operator, then correct or remove the threshold and reread complete access. Add no metadata override or binary rebuild per case. Keep unreadable metadata and deterministic store rejection/retry in their existing automated suites; label controlled failures separately from an observed native store handoff.

Before release, [F13 T058](../003-shared-quality/tasks.md#native-candidate-preparation-and-qualification) validates the exact signed production binaries' installed-version metadata with F14's candidate/identity checks. Before any authorized minimum increase, reuse [F14 T048](../014-v1-v2-transition/tasks.md#phase-6-user-story-4--cut-over-without-letting-v1-alter-the-new-state-priority-p1)'s actual downloadable availability of the intended version. A valid link, opened store, preview client or equivalent source build supplies neither result. F14 retains old-client compatibility and both-store availability before ordinary V1 retirement; no automatic store monitor is added.

## Native versions editor

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath \
  src/features/access/__tests__/application-versions-settings.test.tsx \
  src/features/access/__tests__/application-versions-route.test.tsx
NX_LOAD_DOT_ENV_FILES=false NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  npx nx run mobile:verify --output-style=static
```

On compatible native clients, exercise first/last fields and final action with the software keyboard open, representative themes and enlarged text. Expect omitted fields to remain unchanged, explicit null removal, independent platform values under one revision, retained failed-save drafts, explicit reread after conflict and a reachable full-screen preview close action. Use [the plan's form/design decisions](plan.md#mobile-state-and-native-behavior); actual operator authentication, SQL and released-binary/store outcomes retain their distinct qualification boundaries.

## Direct Profile operational navigation

From Profile, activate “Collectes”, “Maintenance” and “Versions minimales” under each literal current grant. Expect their existing destinations directly and Back to Profile, with no intermediate index or sporting-only access. Verify revoked/malformed/stale account reads and account changes. Retain the separate `/administration` gate destination and current ordinary/operational admission.
