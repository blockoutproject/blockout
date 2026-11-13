# Quickstart: qualifying the V1-to-V2 transition

Use the [mobile preparation and continuity sequence](plan.md#cutover-and-recovery). Independent local checks use disposable migrated PostgreSQL and controlled HTTP/native SDK fixtures. Signed upgrades, real providers and store outcomes require the native inputs below only for their own qualification; they do not block local development. No server deployment or infrastructure-restoration procedure is selected.

## Prerequisites

The following inputs apply to actual native/store/transition qualification. Controlled local owner, HTTP and fixture checks run independently with their ordinary local setup; no signed candidate or hosted server is needed to develop those boundaries.

- Implemented V2 owners and the [legacy contract](contracts/README.md#legacy-mobile-access), signed production-identity binaries on physical iOS/Android devices, and installed store V1 binaries for upgrade testing.
- Authorized qualification accounts covering the actual identity/purchase categories, both paying stores and linked sign-in methods. Current provider settings, credentials, build counters and release prerequisites verified privately.
- Usable private logo/reference preservation with the owner's manual-edit freeze in force, current obligations available, and current privacy/rights constraints established. Missing indispensable evidence blocks its destruction.
- Approved common discovery prototype and Figma revision. Browser simulations do not qualify native upgrade, store or provider behavior.

## Scenarios and expected outcomes

| Scenario                                        | Expected evidence                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed upgrade over V1 and fresh install        | Same common skippable discovery. Native credential clearing awaited before provider restoration under FR-006’s accepted SDK limit, explicit first sign-in, then normal later resumption. No new identity, old permission inheritance or origin detection.                                                                                                                                                     |
| Initialization interrupted or unable to persist | No old-session admission. Safe retry uses SDK/storage primitives; a completed initialization does not imply completed onboarding. Reinstall/OS restoration obey the qualified installation lifecycle.                                                                                                                                                                                                         |
| Discovery complete, skipped or interrupted      | A failed flag read shows normal discovery. Explicit finish/skip opens the current session immediately, with best-effort persistence; failed persistence may repeat discovery at the next launch. Successful persistence survives ordinary V2 updates/account changes. Interruption does not complete discovery; guest access and the F11 age gate stay independent.                                           |
| Identity and Pro continuity                     | Existing linked methods resolve to the retained principal and true age. New business UUID, explicit native restore, accepted F09 transfer scope and verified assisted exceptions work separately on both stores; no repurchase required solely for migration.                                                                                                                                                 |
| Price and presentation                          | Existing monthly products, 1.99 EUR target and reviewed localized prices; existing subscriber cohorts handled. Native offer/renewal evidence and ad-free-only copy match the release. No fixed UI price or atomic renewal promise.                                                                                                                                                                            |
| Reused build/provider configuration             | Store accepts higher build counters and signed upgrades; Google/Apple callbacks, native purchases, APNs/FCM and Expo Push work with the actual application identity. Reuse the exact build's observed outcomes under the qualification boundaries below; test keys/preview builds alone are insufficient.                                                                                                     |
| Frozen logo copy                                | Every protected association has usable bytes and its exact FFVB identifier, including leading zeros. Exact matches receive F02 images; unresolved matches remain private. An exceptional edit updates its affected copy; missing files block destruction.                                                                                                                                                     |
| Reconstruction                                  | Current plus three completed seasons have truthful F01/F02 outcomes and usable F04 projection. Source gaps remain distinct from defects. No announcements, push burst or invented V1 follows.                                                                                                                                                                                                                 |
| Store release and access                        | Functional review access before public maintenance; owner session/grants prepared beforehand. V2 truly downloadable on both stores for supported devices/storefronts, including qualified existing-user continuity outside new-download countries. Verify the required platform version is downloadable before any authorized F12 minimum increase; a store handoff, listing or review alone is insufficient. |
| Old-client retirement                           | Each supported installed V1 binary has one real compatible-response, update-action and correct existing-store opening observation. Controlled tests cover serialization and F12 independence. Actual direct old business calls, workers and default-role dependency cannot mutate V2; an update capture does not prove retirement.                                                                            |
| Old-client status read failure                  | Controlled tests prove missing-input 503 and HTTP refusals. Without available configuration, V1 guarantees neither blocking nor an update action; retained configuration may govern display after failure. State this limit without a per-runtime history campaign. Independently prove actual old business calls and delayed writers remain stopped on status failure.                                       |
| Opening and recovery                            | Accepted operations/current obligations reconciled before opening. Failed preparation stops safely. After opening, V2 repair or compatible restoration preserves current erasure/rights restrictions before reads or sends resume.                                                                                                                                                                            |

Use the existing Java/mobile test tools for controlled failure and serialization cases, then actual authorized native/provider checks for external outcomes. Do not log private customer references or credentials into public test reports. No automatic migration coordinator, new E2E framework or recurring transition test programme is required.

Reuse exact-build evidence under the [qualification boundaries](plan.md#qualification-boundaries): identify the tested build and demonstrated outcome in its existing owner record, with applicable source/configuration, package, signature, SDK graph and store identity. Recheck changed boundaries and keep passed, failed and unavailable results distinct. No duplicate execution is required solely because another task consumes that observation. Development-client evidence cannot replace signed production-binary or actual-download proof. Store availability, population completeness, both-store purchases, first-V2 new/existing-subscriber prices/cohorts and the private identity/purchase/logo preservation obligations retain their own evidence.

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

Start with the observed Android 1.3.5 (84) and iOS 1.3.5 (122) in the [V1 inventory](research.md#current-v1-evidence). Confirm the currently supported installed binaries from authorized evidence before qualification; these observations prove neither an exhaustive population nor available test artifacts. Do not invent a version/device matrix. Missing installed-binary execution remains in [T043](tasks.md#phase-6-user-story-4--cut-over-without-letting-v1-alter-the-new-state-priority-p1); signed V2 candidates retain T041/T042.

1. **Controlled contract and comparison checks.** Run the repository checks below. Reuse strict flat JSON/null/threshold/listing serialization, no-store, maintenance false, missing-input 503, invalid-configuration startup refusal and exact-public-GET security tests. Actual F12 integration changes maintenance and lowers/raises/removes minima/listings while the whole legacy response stays fixed. Existing client-boundary tests cover numeric ordering, including 2.9.0 versus 2.10.0, equality and malformed inputs. They exercise V2's comparator, not V1's distributed algorithm; do not add a simulated V1 runtime or duplicate comparator to claim native evidence.
2. **One real update observation per supported installed V1 binary.** In an authorized compatible host/path setup, configure the four retirement inputs from the [backend environment example](../../apps/backend/.env.example) with the qualified first V2 versions and actual existing store URLs. Confirm every supported V1 version is numerically below its platform threshold and the first V2 release meets it. Verify a successful real `GET /api/v1/mobile/public/config/app-status` is consumed by that binary, displays the update action and opens its correct existing listing with `maintenance: false`, including while V2 maintenance is enabled. Record binary/version/build, platform, effective configuration and observed destination in the existing owner evidence. Reuse a still-applicable exact-binary observation; actual download availability remains T048's separate proof. Fixture versions/listing IDs are not cutover inputs.
3. **Accepted configuration limit.** Without available configuration, V1 guarantees neither a blocking screen nor an update action; after a failed read, retained configuration may still govern display. This is a documented limit, not a required success/failure × retained/absent campaign on each old runtime. Verify the valid retirement response before cutover; F12's V2 unavailable journey cannot be retrofitted into V1.
4. **Independent real retirement proof.** Under separately authorized T049/T050 rehearsal/cutover, attempt direct authenticated old business calls and delayed workers/jobs/retries against the actual retired paths. Establish that no old mutation or identity link can affect V2, including with legacy status retrieval failing. Account for accepted work under its domain owner. An update screenshot, successful GET or controlled HTTP refusal does not establish actual cessation. Missing operational evidence remains pending and blocks the affected retirement/opening.

Store submission, actual availability, effective retirement and production activation remain distinct; controlled tests and one update observation do not establish them.

### Repository F12 integration

```sh
npm run bundle:contracts
./mvnw -B -ntp -pl apps/backend verify -Dtest='Legacy*WebMvcTest' -Dit.test='Legacy*IntegrationTest'
npm run test --workspace=@blockout/mobile -- --runInBand src/features/access/__tests__/installed-version.test.ts --reporters=default
```

The legacy MVC suites cover strict serialization and HTTP/security refusals. The integration suites activate actual F12 maintenance and lower/raise/remove its version settings in isolated migrated PostgreSQL, and check each missing/invalid retirement input. Expect the ordinary V2 response to follow committed F12 edits while the entire legacy flat response remains fixed, no-store and `maintenance: false`. Missing retirement inputs return canonical unavailable data without ordinary business admission. The mobile suite proves numeric comparison only at its V2 client boundary. Installed V1 binaries, compatible host and signed V2 releases remain separate qualification inputs.

## Common discovery

Use the [approved common discovery](plan.md#design-approval) on native iOS/Android. Observe representative finish/skip and ordinary entry using the unchanged normal composition. Controlled storage cases cover failed completion-flag reads showing normal discovery, immediate session entry while its write is pending or rejected, and discovery returning at the next launch after failed persistence. There is no discovery error/retry card, saving workflow or automatic write retry. Successful persistence survives restart, sign-out and a later app version; interruption before skip/finish stays incomplete. Keep current F12 blocking, required secure initialization and independent F11 age declaration. Initialization success alone must not complete discovery. Reuse valid unchanged native evidence; these development-client/storage cases establish no signed upgrade or native credential-clearing qualification.

## Actual discovery owners and fresh personal state

```sh
npx nx run mobile:generate --output-style=static
npm run test --workspace=@blockout/mobile -- --runInBand src/features/onboarding/__tests__/discovery-screen.test.tsx src/features/onboarding/__tests__/discovery-navigation.test.tsx src/features/onboarding/__tests__/initialize-v2-installation.test.ts src/features/onboarding/__tests__/initialization-root.test.tsx src/features/onboarding/__tests__/discovery-owner-integration.test.tsx src/features/onboarding/__tests__/transition-reset.test.tsx
./mvnw -B -ntp -pl apps/backend verify -Dtest=EstablishAccountAgeTest -Dit.test=TransitionResetIntegrationTest
```

Exercise actual owner composition with fictional HTTP/storage/native SDK inputs and isolated SQL. Expect nonblocking optional discovery flag failures followed by ordinary entry or rediscovery on a later launch, required secure initialization before Auth0Provider, ordinary explicit first sign-in then restoration, honest empty profile/follows/inbox and zero badge for the new UUID, voluntary follows, retained installation age declaration and no old callback/private state reassignment across accounts. These checks do not perform a business reset, real support submission or external erasure. These controlled checks establish no signed upgrade, provider operation, real protected-source preservation or cutover.

## Current repository checks

Run the [README verification commands](../../README.md#verification), including the legacy OpenAPI root and backend checks. Actual old-binary compatibility, provider continuity and public transition outcomes are outside these local checks. Source inspection and document checks establish only their own boundaries.
