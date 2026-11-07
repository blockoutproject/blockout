# Quickstart: qualifying the V1-to-V2 transition

Use the [mobile preparation and continuity sequence](plan.md#cutover-and-recovery). Independent local checks use disposable migrated PostgreSQL and controlled HTTP/native SDK fixtures. Signed upgrades, real providers and store outcomes require the native inputs below only for their own qualification; they do not block local development. No server deployment or infrastructure-restoration procedure is selected.

## Prerequisites

The following inputs apply to actual native/store/transition qualification. Controlled local owner, HTTP and fixture checks run independently with their ordinary local setup; no signed candidate or hosted server is needed to develop those boundaries.

- Implemented V2 owners and the [legacy contract](contracts/README.md#legacy-mobile-access), signed production-identity binaries on physical iOS/Android devices, and installed store V1 binaries for upgrade testing.
- Authorized qualification accounts covering the actual identity/purchase categories, both paying stores and linked sign-in methods. Current provider settings, credentials, build counters and release prerequisites verified privately.
- Usable private logo/reference preservation with the owner's manual-edit freeze in force, current obligations available, and current privacy/rights constraints established. Missing indispensable evidence blocks its destruction.
- Approved common discovery prototype and Figma revision. Browser simulations do not qualify native upgrade, store or provider behavior.

## Scenarios and expected outcomes

| Scenario                                        | Expected evidence                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed upgrade over V1 and fresh install        | Same common skippable discovery. Native credential clearing awaited before provider restoration under FR-006’s accepted SDK limit, explicit first sign-in, then normal later resumption. No new identity, old permission inheritance or origin detection.                                          |
| Initialization interrupted or unable to persist | No old-session admission. Safe retry uses SDK/storage primitives; a completed initialization does not imply completed onboarding. Reinstall/OS restoration obey the qualified installation lifecycle.                                                                                              |
| Discovery complete, skipped or interrupted      | Completion persists only for explicit finish/skip; no repeat after ordinary V2 updates or account changes. Guest access works, and the F11 age gate stays independent.                                                                                                                             |
| Identity and Pro continuity                     | Existing linked methods resolve to the retained principal and true age. New business UUID, explicit native restore, accepted F09 transfer scope and verified assisted exceptions work separately on both stores; no repurchase required solely for migration.                                      |
| Price and presentation                          | Existing monthly products, 1.99 EUR target and reviewed localized prices; existing subscriber cohorts handled. Native offer/renewal evidence and ad-free-only copy match the release. No fixed UI price or atomic renewal promise.                                                                 |
| Reused build/provider configuration             | Store accepts higher build counters and signed upgrades; Google/Apple callbacks, native purchases, APNs/FCM and Expo Push work with the actual application identity. Test keys/preview builds alone are insufficient.                                                                              |
| Frozen logo copy                                | Every protected association has usable bytes and its exact FFVB identifier, including leading zeros. Exact matches receive F02 images; unresolved matches remain private. An exceptional edit updates its affected copy; missing files block destruction.                                          |
| Reconstruction                                  | Current plus three completed seasons have truthful F01/F02 outcomes and usable F04 projection. Source gaps remain distinct from defects. No announcements, push burst or invented V1 follows.                                                                                                      |
| Store release and access                        | Functional review access before public maintenance; owner session/grants prepared beforehand. V2 truly downloadable on both stores for supported devices/storefronts, including qualified existing-user continuity outside new-download countries.                                                 |
| Old-client retirement                           | A valid historical snake_case response is qualified before cutover. Both store V1 binaries display the update action even during V2 maintenance. Direct old business calls, workers and default-role dependency cannot mutate shared state. A screenshot alone does not prove retirement.          |
| Old-client status read failure                  | Exercise missing retirement configuration (503) and network failure, with and without retained V1 configuration. Without configuration, no blocking screen or update action is guaranteed; retained configuration may still govern the display. Old business access remains stopped in every case. |
| Opening and recovery                            | Accepted operations/current obligations reconciled before opening. Failed preparation stops safely. After opening, V2 repair or compatible restoration preserves current erasure/rights restrictions before reads or sends resume.                                                                 |

Use the existing Java/mobile test tools for controlled failure and serialization cases, then actual authorized native/provider checks for external outcomes. Do not log private customer references or credentials into public test reports. No automatic migration coordinator, new E2E framework or recurring transition test programme is required.

## Private continuity and final-state preparation

Use the [private inventory and destruction gates](../../infra/operations/README.md#private-continuity-inventory) and [final current-state reconciliation](../../infra/operations/README.md#final-current-state-reconciliation). Perform population reconciliation only under its actual authorization and repeat the current-state check immediately before authorized retirement. Keep personal associations and unresolved cases in the authorized private process. A sampled account or controlled test does not establish population coverage.

## Identity and Pro owner integration

After ordinary contract generation, run the actual account/Pro owner boundaries with isolated fictional data:

```sh
npx nx run mobile:generate --output-style=static
npm run test --workspace=@blockout/mobile -- --runInBand src/features/pro/__tests__/transition-continuity.test.tsx --reporters=default
./mvnw -B -ntp -pl apps/backend verify -Dtest=EstablishAccountAgeTest -Dit.test=TransitionIdentityIntegrationTest
```

Exercise the identity/Pro scenario row with actual F05/F09/F12 composition. Expect retained principal age and linked identity, new business UUID, current grants, distinct unlinked equal-email principals and explicit restoration only. Controlled HTTP/native SDK inputs do not qualify real linking, store ownership, receipt transfer or provider erasure. The [identity and purchase continuity requirements](plan.md#identity-and-purchase-continuity) still require actual population/provider qualification.

## Auth0 default-role isolation

The completed scoped `assign-default-role` isolation is described in the [business procedure](../../infra/operations/README.md#auth0-v1-default-role-isolation). Local V2 account/session checks use existing authorized native applications and dedicated test users without modifying that Action, its binding or the V1 application. Current local work grants no final dependency-removal authority.

## Protected-logo rehearsal

Use the [bounded preservation/reassociation procedure](../../infra/operations/README.md#protected-club-logo-preservation-and-reassociation) with isolated fictional associations and files, then run:

```sh
./mvnw -B -ntp -pl apps/backend verify -Dtest=ImageDecoderTest,ValidateSportingImageTest -Dit.test=TransitionLogoIntegrationTest
```

Expect distinct exact FFVB strings such as `000339` and `339`, no name-based association, rejected missing/corrupt bytes without presentation changes and ordinary uniqueness/grant/revision protection. A clubless professional team receives no guessed club logo. [Private copy completeness and deployed V1 preservation](plan.md#protected-logos-and-sporting-reconstruction) require T029’s actual authorized freeze, association-and-byte copy and source checks; the fictional rehearsal does not establish them. T029 remains incomplete until every affected source record/file has its required private evidence.

## Local reconstruction and silent initial mode

```sh
npm run bundle:contracts
./mvnw -B -ntp -pl apps/backend verify \
  -Dtest=InitialReconstructionTest,InitialReconstructionRunnerTest \
  -Dit.test=InitialReconstructionIntegrationTest,TransitionAnnouncementIntegrationTest
```

Expect two four-season passages with stable sporting identities and complete native search-generation replacement, distinct per-scope acquisition/integration outcomes and counts, initial/repeated announcement silence, then an eligible ordinary V2 announcement. Use the existing [F01 bounded reconstruction](../001-source-acquisition/quickstart.md#bounded-initial-reconstruction), [collector/backend qualification](../../README.md#collector-to-sporting-qualification) and [F04 process/rebuild checks](../008-search-discovery/quickstart.md#projection-and-privacy).

These checks use disposable PostgreSQL/OpenSearch and controlled source/push inputs; they establish no official-archive availability, physical push delivery or actual transition qualification.

## Legacy status qualification

Use both supported installed V1 store builds and the actual first V2 release for each platform. Refresh the [V1 inventory](research.md#current-v1-evidence) before qualification rather than assuming that its observed builds cover the supported population.

1. Configure the four retirement inputs in the [backend environment example](../../apps/backend/.env.example) for an authorized isolated backend. These are fixed first-V2 versions and existing listing URLs, independent of F12 minima. Missing inputs produce 503; malformed supplied versions or non-HTTPS/wrong-store URLs fail startup. Do not use fixture versions or listing IDs for cutover.
2. Call `GET /api/v1/mobile/public/config/app-status` without credentials. Repeat with obsolete or malformed bearer credentials; only this exact GET ignores them. Verify the [historical flat shape](contracts/README.md#legacy-mobile-access), explicit required nulls, `maintenance: false`, both thresholds/links and `Cache-Control: no-store`. On both installed clients, verify numerical component comparison: every supported V1 version is below its threshold, while the qualified first V2 release meets it. Include a multi-digit component comparison such as 1.10.0 versus 1.9.0 in the controlled comparison cases.
3. Activate V2 maintenance and subsequently change F12 minimum versions through their authorized controls. The legacy response must remain unchanged and both old clients must retain a working update action to the correct existing listing. This integration requires the implemented F12 admission/settings owners.
4. Separately omit a required retirement input and simulate a network failure, first without any retained V1 configuration and then after a successful read. Record each installed client's actual result: no configuration guarantees neither a blocking screen nor an update action; retained configuration may still govern the display. Restore and verify the valid response before any cutover.
5. In the authorized retirement rehearsal, try direct authenticated old business calls and deferred writers as well as the status read. No old mutation or identity association may reach V2 state, even when status retrieval fails. An update screenshot does not establish writer retirement.

Qualify platform versions, configured thresholds and actual installed-binary behavior with the supported V1 store builds. Store availability, effective retirement and production activation remain distinct; serialization alone does not establish them.

### Repository F12 integration

```sh
npm run bundle:contracts
./mvnw -B -ntp -pl apps/backend verify -Dtest='Legacy*WebMvcTest' -Dit.test='Legacy*IntegrationTest'
```

Activate actual F12 maintenance and lower/raise/remove its version settings in isolated migrated PostgreSQL. Expect the ordinary V2 response to follow those committed edits while the entire legacy flat response remains fixed, no-store and `maintenance: false`. Missing retirement inputs must return canonical unavailable data without ordinary business admission. Installed V1 binaries, compatible host and signed V2 releases remain separate qualification inputs.

## Common discovery

Use the [approved common discovery](plan.md#design-approval) on native iOS/Android. Exercise finish, skip, interruption, persistence failure and retry; repeat after restart, sign-out and a later app version. Expect a separate installation completion flag written only on explicit skip/finish, current F12 blocking and independent F11 age declaration. Initialization success alone must not complete discovery.

## Actual discovery owners and fresh personal state

```sh
npx nx run mobile:generate --output-style=static
npm run test --workspace=@blockout/mobile -- --runInBand src/features/onboarding/__tests__/discovery-owner-integration.test.tsx src/features/onboarding/__tests__/transition-reset.test.tsx
./mvnw -B -ntp -pl apps/backend verify -Dtest=EstablishAccountAgeTest -Dit.test=TransitionResetIntegrationTest
```

Exercise actual owner composition with fictional HTTP/storage/native SDK inputs and isolated SQL. Expect ordinary explicit first sign-in then restoration, honest empty profile/follows/inbox and zero badge for the new UUID, voluntary follows, retained installation age declaration and no old callback/private state reassignment across accounts. These checks do not perform a business reset, real support submission or external erasure. These controlled checks establish no signed upgrade, provider operation, real protected-source preservation or cutover.

## Current repository checks

Run the [README verification commands](../../README.md#verification), including the legacy OpenAPI root and backend checks. Actual old-binary compatibility, provider continuity and public transition outcomes are outside these local checks. Source inspection and document checks establish only their own boundaries.
