# Quickstart: qualifying the V1-to-V2 transition

Use the [plan's release sequence](plan.md#cutover-and-recovery). Repository tests do not authorize migration, provider changes or retirement; the native and operational scenarios below require their stated qualification setup.

## Prerequisites

- Implemented V2 owners and the [legacy contract](contracts/README.md#legacy-mobile-access), signed production-identity binaries on physical iOS/Android devices, and installed store V1 binaries for upgrade testing.
- Authorized qualification accounts covering the actual identity/purchase categories, both paying stores and linked sign-in methods. Current provider settings, credentials, build counters and release prerequisites verified privately.
- Usable private logo/reference preservation with the owner's manual-edit freeze in force, current obligations available, and F13 recovery protections ready. Missing indispensable evidence blocks its destruction.
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

Use the [private inventory and destruction gates](../../infra/operations/README.md#private-continuity-inventory) prepared by T018 and the [final current-state reconciliation](../../infra/operations/README.md#final-current-state-reconciliation) prepared by T024. Execute the population reconciliation only under explicit authorization to execute T020; T049 performs the final check immediately before authorized retirement. T025/T053 record public-safe outcomes here, separating population coverage, native/provider qualification and current-state evidence. Keep all personal associations and unresolved cases in the authorized private process.

This inventory/reconciliation preparation provides no executed population inventory or end-to-end continuity qualification. The scoped T019 result below does not complete T020–T022, T025, logo preservation or release execution in [tasks.md](tasks.md); the dated observations in [research.md](research.md#current-v1-evidence) are not new operational evidence.

## Identity and Pro owner integration — T015–T017

The [SQL integration suite](../../apps/backend/src/test/java/com/blockout/backend/accounts/application/TransitionIdentityIntegrationTest.java) composes actual F05 establishment/read/erasure, F12 grants/authorization and the committed Liquibase schema on disposable PostgreSQL 18.6 with the restricted application role. Provider I/O alone is controlled; MockMvc uses Spring Security test JWTs. Linked-method fixtures share the retained principal, even with different provider addresses; distinct unlinked principals with equal or case-varied emails remain private. Missing initial email commits no partial account and needs explicit retry. Unknown age stays unknown; explicit evidence recovery and later outages preserve the actual principal date. Current SQL grants govern projection and protected commands despite obsolete JWT roles. Synthetic business reset invokes no provider deletion. Voluntary erasure followed by registration uses a new UUID and the actual surviving/new principal date, without the old profile or grants; requests for the deleted UUID cannot target its replacement.

The [mobile integration suite](../../apps/mobile/src/features/pro/__tests__/transition-continuity.test.tsx) mounts production routes and actual F05/F09 owners, generated HTTP clients, Query, F10 assistance and F11 advertising admission. Only HTTP, storage and native I/O/provider views are controlled. Explicit sign-in associates RevenueCat with the new business UUID, independently of Auth0 or historical customer references, and reads already-applicable paid/manual rights without restoration. Equal emails across different principals do not carry a gift or private cache. An unusable profile cannot associate RevenueCat; its explicit retry needs no additional hosted login. Deletion and recreation clear the old gift/grants, retain actual principal age and permit only explicit native restoration of the supplied Apple/Google result. Unknown verification, pending payment, uncertain restoration, an empty restore and current revoked rights remain distinct; an old listener payload only occasions a current SDK read. Outage recovery neither opens an offer nor starts advertising, and actual F10 assistance remains reachable with the receipt-wide/cross-store limitations explained by F09.

The existing production composition satisfies these cases; T017 needs no account, entitlement, session, contract or dependency change. Reproduce the focused checks with the repository toolchain:

```sh
npx nx run mobile:generate --output-style=static
npm run test --workspace=@blockout/mobile -- --runInBand src/features/pro/__tests__/transition-continuity.test.tsx --reporters=default
./mvnw -B -ntp -pl apps/backend verify -Dtest=EstablishAccountAgeTest -Dit.test=TransitionIdentityIntegrationTest
```

These construction tests do not establish actual Google/Apple linking, signing/storage behavior, paying-store account ownership, receipt transfer scope, real restoration, provider erasure or population completeness. They execute no production reset, provider configuration or real support submission. The accepted same-subject token, native cache and cleanup-interruption limits remain unchanged. T020–T022/T025 retain their separate inventory and actual native/provider qualification; all unrelated tasks remain unchanged. This evidence does not qualify SC-002 globally or authorize destruction, cutover or opening.

## Auth0 default-role isolation — T019

The explicitly authorized restriction follows the [operations procedure](../../infra/operations/README.md#auth0-v1-default-role-isolation): `assign-default-role` returns before legacy data access unless the initiating client exactly matches the retained V1 native registration. V1's existing-role claim and roleless HTTP assignment/claims remain unchanged; roleless assignment failure still rejects login.

Controlled Node 24.18.0 execution covers non-V1 clients with/without roles and a prefix-sharing client, existing-role claims, roleless encoded requests/five-second timeout/both claims and assignment failure. Auth0's Node 22 tester covers non-V1 clients and an existing-role V1 event; roleless V1 HTTP remains controlled. No synthetic assignment reached production.

Action version 7 was observed deployed and bound in Post Login with Node 22 and `axios@1.11.0`. Private source/provider records retain the detailed proof and version 6 rollback target; no rollback ran. The owner confirmed ordinary V1 iOS logout/sign-in and a connected screen, with successful Auth0 login/code exchange and no reported Action error.

This qualifies the scoped T019 restriction and sampled V1 iOS continuity. It does not qualify Android V1, a real roleless V1 account, V2 native sign-in, complete identity categories or population preservation. Actual Google/Apple and prior-role continuity remain **T021**; final Action removal remains **T050**. No V2 role-assignment endpoint, automatic grant, relinking, tenant replacement, credential rotation or V1 retirement was introduced.

## Protected-logo rehearsal — T027/T028/T030

The [bounded operations procedure](../../infra/operations/README.md#protected-club-logo-preservation-and-reassociation) prepares the private copy, exact target lookup and existing F02 multipart editor. No live V1 access, freeze, export or private inventory was performed for this rehearsal; those remain T029 / [T029](tasks.md).

`TransitionLogoIntegrationTest` uses actual F02 identity, presentation, validation and read operations with PostgreSQL 18.6 Testcontainers and the real Liquibase baseline. Its synthetic cases cover distinct `000339` / `339` identities despite identical club names, unmatched `0000339`, original PNG/JPEG bytes in PostgreSQL, a missing file, empty/corrupt content, current grant withdrawal, stale revision refusal, cross-season FFVB inheritance and a clubless LNV team with a coincident native reference. No image host, production identity, collector provider or native device is involved. These cases do not qualify actual V1-logo preservation or production reassociation.

Normal V2 uniqueness rejects a duplicate `(FFVB, reference)` club; the suite exercises that database refusal rather than disabling the constraint to manufacture an ambiguous target. Exact lookup and uniqueness operations receive no file path: these tests prove identity handling, not private file preservation. Retaining private copies and resolving conflicting source associations remain manual under the procedure and are not qualified here. Missing/corrupt-file attempts leave current presentation unchanged; the procedure keeps affected destruction blocked.

These cases establish the isolated owner boundary for T027/T030 and the prepared procedure for T028. They establish neither an actual protected-logo population/copy nor deployed V1 collector behavior, native image rendering, full A16–A24/SC-003 qualification or permission to destroy/open anything. T029/T034/T036 and all unrelated tasks remain separate. Run `./mvnw -B -ntp -pl apps/backend verify -Dtest=ImageDecoderTest,ValidateSportingImageTest -Dit.test=TransitionLogoIntegrationTest` after the ordinary contract bundle, or the complete `npx nx run backend:test` from [repository verification](../../README.md#verification); Failsafe discovers the integration suite during `verify`.

## Legacy status qualification

Use both supported installed V1 store builds and the actual first V2 release for each platform. The previously observed store builds were Android 1.3.5/build 84 and iOS 1.3.5/build 122; refresh that inventory before qualification rather than treating those observations as the supported population.

1. Configure the four retirement inputs in the [backend environment example](../../apps/backend/.env.example) for an authorized isolated backend. These are fixed first-V2 versions and existing listing URLs, independent of F12 minima. Missing inputs produce 503; malformed supplied versions or non-HTTPS/wrong-store URLs fail startup. Do not use fixture versions or listing IDs for cutover.
2. Call `GET /api/v1/mobile/public/config/app-status` without credentials. Repeat with obsolete or malformed bearer credentials; only this exact GET ignores them. Verify the [historical flat shape](contracts/README.md#legacy-mobile-access), explicit required nulls, `maintenance: false`, both thresholds/links and `Cache-Control: no-store`. On both installed clients, verify numerical component comparison: every supported V1 version is below its threshold, while the qualified first V2 release meets it. Include a multi-digit component comparison such as 1.10.0 versus 1.9.0 in the controlled comparison cases.
3. Activate V2 maintenance and subsequently change F12 minimum versions through their authorized controls. The legacy response must remain unchanged and both old clients must retain a working update action to the correct existing listing. This integration requires the implemented F12 admission/settings owners.
4. Separately omit a required retirement input and simulate a network failure, first without any retained V1 configuration and then after a successful read. Record each installed client's actual result: no configuration guarantees neither a blocking screen nor an update action; retained configuration may still govern the display. Restore and verify the valid response before any cutover.
5. In the authorized retirement rehearsal, try direct authenticated old business calls and deferred writers as well as the status read. No old mutation or identity association may reach V2 state, even when status retrieval fails. An update screenshot does not establish writer retirement.

Record platform, installed version/build, tested backend revision, configured threshold and safe outcomes with T043. Store availability, effective retirement and production activation remain their later tasks; serialization tests alone do not complete them.

### Repository F12 integration — T037/T040

The [legacy integration suites](../../apps/backend/src/test/java/com/blockout/backend/legacy/api/) exercised the actual Spring application, generated server DTOs/serialization, F12 controllers and admission policy against disposable PostgreSQL 18.6 initialized through the committed Liquibase migrations. They use the existing restricted application role and Spring Security test JWTs; no account/admission/settings collaborator is mocked.

- The F12 activation PUT commits maintenance, the public V2 read reports it active and an ordinary public business read receives the maintenance 503. The exact legacy GET still returns its strict flat snake_case response, explicit historical nulls, `maintenance: false`, fixed platform versions/store links and `Cache-Control: no-store`, including with an obsolete bearer. An authenticated old client gains no access to the tested legacy business mutation.
- Actual F12 version PATCHes lower and raise both platform minima and change both store links and the update message during maintenance. Removing both minima/links through explicit nulls is also exercised. The public V2 read observes each committed change while the entire legacy response remains fixed.
- With retirement inputs absent and SQL maintenance active, the legacy GET returns the canonical no-store unavailable 503 without maintenance or retirement fields. Ordinary business admission remains blocked.

Run the focused legacy configuration/MVC and integration boundaries with the repository toolchain:

```sh
npm run bundle:contracts
./mvnw -B -ntp -pl apps/backend verify -Dtest='Legacy*WebMvcTest' -Dit.test='Legacy*IntegrationTest'
```

This completes the repository integration of [T037/T040](tasks.md) using the [existing F12 admission implementation](../013-administration-app-configuration/quickstart.md). No controller, mapper, deployment setting, security matcher or contract needed alteration. Synthetic retirement versions/listing IDs are fixtures, not qualified release inputs. MockMvc exercises the real servlet/security application without a live network listener; JWT signature validation retains its existing dedicated suite. Installed V1 binaries, native numeric-version comparison/update actions, network failures with retained configuration, compatible public host, signed V2 releases, actual store availability, writer retirement and production cutover remain unqualified here under T043 and their later owners.

## Common discovery construction — T006–T010

The common five-step journey uses the approved Figma references in [the plan](plan.md#design-approval). Its separate `blockout:v2-discovery-complete` AsyncStorage flag is written only after explicit skip or finish; failed persistence retains the current journey and an explicit retry. Root routing waits for the installation read, preserves current F12 blocking and operational admission, then hands completed discovery to the ordinary F05 sign-in/guest journey. Initialization, account state, Pro and advertising choices remain independent.

Controlled Jest cases cover interruption, V1/initialization flags, finish/skip, read/write failures, restart, foreground, sign-out, later app versions, pending-read deep links, current gates and cancelled/failed/profile-unavailable F05 entry with guest/help availability. HTTP and native SDK I/O are controlled; this is not actual provider or store qualification. Local Android API 29 debug-build observations and representative light/dark, compact and enlarged-text captures are recorded for [T006–T010](tasks.md); they use a demonstration public-admission peer and do not establish signed-upgrade or complete native acceptance. Actual-owner integration T011 is qualified in the [owner-integration evidence](#actual-discovery-owners-and-fresh-personal-state--t011t026t033) below. Signed upgrade/reinstall/backup T012 and complete native/accessibility qualification T013–T014 remain pending.

## Actual discovery owners and fresh personal state — T011/T026/T033

Mobile initialization/continuity cases and `TransitionResetIntegrationTest` exercise the existing production composition against disposable PostgreSQL 18.6, the committed Liquibase migrations and restricted application role. They establish only the controlled construction boundaries below.

- [Discovery owner integration](../../apps/mobile/src/features/onboarding/__tests__/discovery-owner-integration.test.tsx) mounts the actual application routes, root, F05 session, F09 Pro, F10 help form, F11 age and F12 admission owners. It verifies explicit first sign-in/establishment followed by ordinary restoration, unknown versus SDK-expired rights, explicit restoration, assistance after cancelled/failed sign-in or unavailable profile, independent age declaration after skip and help suppression under each global gate. Old profile reads, paywall callbacks and grants do not enter a different subject's private tree.
- [Fresh-state mobile integration](../../apps/mobile/src/features/onboarding/__tests__/transition-reset.test.tsx) uses actual F05/F06/F07 providers, generated clients and profile/follow/inbox consumers. Accepted empty responses end loading with the existing empty states and a zero badge. Following remains voluntary and targets the exact current UUID. Issued follow/read commands keep their original account and detached client across A → guest → B → A; returning A reads current server state. The installation age declaration survives account changes.
- [Fresh-state SQL integration](../../apps/backend/src/test/java/com/blockout/backend/accounts/application/TransitionResetIntegrationTest.java) uses real establishment, account, follow, inbox and current-grant services, plus MockMvc/Spring Security test JWTs. A newly established UUID gets a neutral profile, no photo/grants/follows/inbox and a zero unread count despite another account sharing its provider email and holding personal state. Voluntary team/pool follows remain separate; homonyms and absent old references confer no association. Guest and B cannot read or mutate A's original private resources. Only principal evidence and time are controlled.

Reproduce the focused checks after ordinary contract generation:

```sh
npx nx run mobile:generate --output-style=static
npm run test --workspace=@blockout/mobile -- --runInBand src/features/onboarding/__tests__/discovery-owner-integration.test.tsx src/features/onboarding/__tests__/transition-reset.test.tsx
./mvnw -B -ntp -pl apps/backend verify -Dtest=EstablishAccountAgeTest -Dit.test=TransitionResetIntegrationTest
```

These are construction tests with synthetic HTTP/storage/native SDK boundaries and isolated SQL fixtures. They perform no business-data reset, V1-origin detection, identity linking, automatic restoration, real support submission or external erasure. F10 cases and F05/F11 privacy/erasure obligations remain independently applicable; their provider retention/erasure is not qualified here. Clearing a private cache does not undo an issued server or native operation. The accepted Auth0 same-subject and RevenueCat cache limits remain unchanged. Signed upgrades, physical devices, real providers, historical populations, destination delivery, reconstruction and cutover remain with their separate tasks; this evidence does not complete T012/T013/T020–T025/T029–T032/T034 or establish design acceptance.

## Current repository checks

Run the [README verification commands](../../README.md#verification), including the legacy OpenAPI root and backend tests. They cover generation, binding, serialization, HTTP admission and missing configuration. The real F12 repository integration is recorded above; actual old-binary compatibility and deployment remain separate qualification boundaries.

Record passed, failed and unavailable evidence with the tested release. A source inspection, scheduled price change, present file or accepted store submission alone does not establish the end-to-end outcome.
