# Quickstart: qualifying the V1-to-V2 transition

This is a future qualification guide. The repository has no production runtime, and #55 authorizes no migration or provider configuration. Use the [plan's release sequence](plan.md#cutover-and-recovery); do not treat the scenarios below as permission to run destructive operations.

## Prerequisites

- Implemented V2 owners and the [legacy contract](contracts/README.md#legacy-mobile-access), signed production-identity binaries on physical iOS/Android devices, and installed store V1 binaries for upgrade testing.
- Authorized qualification accounts covering the actual identity/purchase categories, both paying stores and linked sign-in methods. Current provider settings, credentials, build counters and release prerequisites verified privately.
- Usable private logo/reference preservation with the owner's manual-edit freeze in force, current obligations available, and F13 recovery protections ready. Missing indispensable evidence blocks its destruction.
- Approved common discovery prototype and Figma revision. Browser simulations do not qualify native upgrade, store or provider behavior.

## Scenarios and expected outcomes

| Scenario                                        | Expected evidence                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed upgrade over V1 and fresh install        | Same common skippable discovery. Local SDK credentials cleared before provider restoration, explicit first sign-in, then normal later resumption. No new identity, old permission inheritance or origin detection.                                                                                 |
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

## Current repository checks

Run the [README verification commands](../../README.md#verification), including the legacy OpenAPI root. They check formatting, references and schema structure; generation/compilation and actual old-binary compatibility remain future checks against the implemented provider.

Record passed, failed and unavailable evidence with the tested release. A source inspection, scheduled price change, present file or accepted store submission alone does not establish the end-to-end outcome.
