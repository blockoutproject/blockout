# Quickstart: Validate administration and application access

Use the [README verification commands](../../README.md#verification), [canonical operations](contracts/README.md#operations-and-semantics) and [data constraints](data-model.md). F13 supplies the generated consumers and selected test tools.

## Prerequisites

Use isolated migrated PostgreSQL and native development builds with valid environment-specific Auth0 configuration. Prepare a guest, ordinary usable accounts and operators with separate grants; use fictional identities and no production credentials in committed fixtures. Make both settings groups controllable. Provider/store operations require authorization for their actual environment.

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
| Store/media failures     | Open each real platform store link; fail opening; display a broken optional image.                                                                                                            | No inferred installation; explicit store retry; message/actions remain usable without media.                                                                                                                                                                     |
| Domain continuity        | Activate maintenance during a short accepted mutation; process ingestion/inbox/purge; admit a new sporting push.                                                                              | Accepted effects retained; collection/inbox/purge continue; new pushes skipped for all recipients without replay.                                                                                                                                                |
| Contract boundary        | Generate/compile Java and TypeScript, run response validation and wrong-token cases.                                                                                                          | Null/absence, numeric range, additional fields, capabilities and Problem Details behave as authored; ordinary maintenance refusals carry current maintenance, exempt operations only technical unavailability; deterministic generated output stays outside Git. |
| Accessibility            | Physical iOS/Android with VoiceOver on iOS, text scaling, reduced motion and deep-link/back navigation.                                                                                       | Approved actions remain reachable; focus and labels understandable; decoration never carries the only information.                                                                                                                                               |

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

Before public distribution, establish the owner normally with the production binary in its test channel, manually grant only required actions, verify management/bypass, and activate maintenance if opening is deferred. Confirm that a second ordinary account remains blocked and that an outdated operator cannot bypass its minimum. Inspect the pre-public exposure boundary separately; a test channel is not a backend access control.

Restart/deploy again and verify that saved settings survive. In an isolated rehearsal, correct an invalidating operator mistake using ordinary authorized SQL, advancing the edited revision and validating the complete result. No hidden bootstrap endpoint, reset or dedicated recovery tool is expected.

## Atomic settings

Run the generated TypeScript/form consumer boundary through the disposable `AccessSettingsConsumersIntegrationTest` orchestrator, never against a retained/shared backend or database. Its explicit opt-in enables settings writes; skipped cases provide no qualification. Exercise the settings/concurrency rows with actual HTTP/PostgreSQL and ordinary native forms.

```sh
BLOCKOUT_ACCESS_CONSUMERS_TEST=true ./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=AdministrationSettingsWebMvcTest,AccessSettingsValidationTest \
  -Dit.test=AccessSettingsIntegrationTest,AccessSettingsConsumersIntegrationTest,AccessSettingsConsumerProcessIntegrationTest,AccountMaintenanceAdmissionIntegrationTest,HealthEndpointIntegrationTest
npm run test --workspace=@blockout/mobile -- \
  --runTestsByPath src/features/access/__tests__/maintenance-settings.test.tsx
```

For the complete repository check when private per-application `.env.local` files exist, disable Nx's local dotenv loading so synthetic security tests keep their committed inputs:

```sh
NX_LOAD_DOT_ENV_FILES=false NX_DAEMON=false BLOCKOUT_ACCESS_CONSUMERS_TEST=true npm run verify
```

The minimum-iOS simulator input journey remains required for final native acceptance. Its owner-authorized scoped deferral permits delivery of the atomic settings implementation without changing compatibility requirements or completing final F12 acceptance. Preserve the deployment minimum and use the installed supported toolchain; no native input patch or implicit prerelease installation is selected. [F13](../003-shared-quality/quickstart.md#profile-forms-and-contextual-sheets) owns shared text-size/input limits.

## Shared maintenance admission

Exercise the exact ordinary/operational method/resource boundary, complete public read, typed maintenance refusal and current-account identification exception:

```sh
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=MaintenanceAdmissionWebMvcTest,AccountAccessWebMvcTest,AccountProfileWebMvcTest \
  -Dit.test=MaintenanceAdmissionIntegrationTest,AccountMaintenanceAdmissionIntegrationTest
npm run test --workspace=@blockout/mobile -- \
  --runTestsByPath src/features/access/__tests__/maintenance-problem.test.ts
```

Expect canonical no-store 401/403/503 responses, current grants and no permissive configuration fallback. Generic/inconsistent unavailable data must not fabricate maintenance or admission. Native gates and provider behavior require their own setup.

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

Use actual iOS/Android builds with the F05/F14 owners and [approved design sources](spec.md#design-evidence). Exercise cold-start public/identity failures independently, explicit retry, partial/late responses, direct links, grant withdrawal and minimum versions. Expect the public complete check to remain independent of credential initialization, ordinary closure without a successful check, separate operational admission and no minimum-version bypass.

Verify both themes, keyboard/navigation, VoiceOver on iOS, enlarged text and reduced motion. Confirmed maintenance/update retains native refresh; failed admission uses Retry alone under F13. Store opening is a native action, never proof that a required binary is downloadable.

Compare the blocking-screen backdrop with the [native composition](plan.md#mobile-state-and-native-behavior): the compact rail stack stays centered as a whole, the one-way loop joins seamlessly, and reduced motion stays still.

## Native versions editor

```sh
npm run test --workspace=@blockout/mobile -- --runTestsByPath \
  src/features/access/__tests__/application-versions-settings.test.tsx \
  src/features/access/__tests__/application-versions-route.test.tsx
NX_LOAD_DOT_ENV_FILES=false NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  npx nx run mobile:verify --output-style=static
```

On native builds, exercise first/last fields and final action with the software keyboard open, both themes and enlarged text. Expect omitted fields to remain unchanged, explicit null removal, independent platform values under one revision, retained failed-save drafts, explicit reread after conflict and a reachable full-screen preview close action. Use [the plan's form/design decisions](plan.md#mobile-state-and-native-behavior); actual operator authentication, SQL, stores and physical accessibility retain their distinct qualification boundaries.

## Direct Profile operational navigation

From Profile, activate “Collectes”, “Maintenance” and “Versions minimales” under each literal current grant. Expect their existing destinations directly and Back to Profile, with no intermediate index or sporting-only access. Verify revoked/malformed/stale account reads and account changes. Retain the separate `/administration` gate destination and current ordinary/operational admission.
