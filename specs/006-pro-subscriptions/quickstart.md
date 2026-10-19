# Quickstart: qualify Pro integration

The native mobile workspace is initialized; Pro implementation and qualification remain tracked in [tasks.md](tasks.md). Use the [README verification commands](../../README.md#verification) for existing mobile and contract checks. Those checks and browser simulations do not qualify RevenueCat or the stores.

## Prerequisites and setup

- Implement the [plan](plan.md) in the F13 native workspace with paired purchases/UI 10.13.0 packages and the existing F05 account session.
- Use dedicated test accounts in the existing RevenueCat project. Select the V2 offering with existing products and simple Customer Center actions. Keep sandbox access `Anybody`; never test destructive cleanup against a real customer.
- Use Test Store for routine development, then native platform keys, products and Apple/Google sandbox accounts for store qualification. Never ship a Test Store key in a production candidate. Provider changes require their own authorization.
- Prepare physical iPhone and Android devices, including the minimum supported OS matrix. Use the established native development and EAS/store candidate workflow; Expo Go is insufficient.

Run Pro feature tests through the existing F13 Jest Expo/React Native Testing Library target as they are implemented. Then exercise the following native scenarios; use controllable SDK doubles for deterministic callback ordering in unit/component tests.

## Scenarios and expected outcomes

| Scenario                                                                         | Expected outcome                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest opens Pro, dismisses, then signs in                                        | Shared invitation without price/provider offer. Dismissal preserves context; sign-in follows the ordinary route without reopening Pro or starting an operation.                                                                          |
| Current account active, inactive, cached or no usable state                      | Match [state consumption](data-model.md#state-consumption). No network error becomes inactivity. Public sport is usable in every state.                                                                                                  |
| Cancelled, pending, confirmed or interrupted purchase                            | Native outcome remains distinct from rights. No duplicate payment attempt, invented grant or false failure after confirmed payment. Restart uses native state.                                                                           |
| Restore with no purchase, active entitlement or unavailable outcome              | Distinct outcomes; no active-rights message merely because the restore call succeeded.                                                                                                                                                   |
| A → guest → B during read, purchase and restore                                  | No previous rights, premium styling, dialog or callback populates B. Qualify native pending transaction behavior, not just mocked callback filtering.                                                                                    |
| A → guest → B and A → guest → A while login/logout is delayed or fails           | At most one native identity call runs; its completion precedes association of the latest target. Local logout/navigation stay immediate, old UI clears, and only Pro waits. A current-target failure uses explicit retry without a loop. |
| Delayed SDK update from A reaches the listener after B becomes current           | The event payload never grants A's rights to B. It only signals an ordinary native read after current association; late read results fail the F05 session check. Verify this on both native platforms as well as deterministic doubles.  |
| Same account on another device/platform; explicit transfer to B                  | Rights follow the account/accepted native receipt scope. No business profile merge. Cross-store receipt limitations lead to verified assistance, not forced repurchase.                                                                  |
| Delete original account, recreate, restore                                       | F05 local-first erasure and manual provider-failure handling remain effective. Restore paid rights without private data, personal grants or gifts. Qualify both stores and original-target safety.                                       |
| Grant temporary/open-ended gift, change, expire and revoke alongside paid rights | Native UI shows supported origin/validity without billed renewal. SDK refresh controls visibility; independent paid rights/billing stay intact.                                                                                          |
| Native assistance action and dismissal                                           | Paywall and Customer Center dismissal closes the app-owned sheet. The native assistance action closes Pro before opening F10, without automatic sensitive attachments.                                                                   |
| Customer Center without purchases or with a loading failure                      | Native restoration/assistance remain reachable where supported; no secondary purchase offering or support ticket channel. After closing a failed view, the existing profile F10 entry remains usable.                                    |
| Light/dark, compact width, enlarged text, VoiceOver/TalkBack                     | Usable native offer/management, coherent focus/close actions and unchanged sporting colors. Guest invitation matches approved design.                                                                                                    |
| Production candidate and review account                                          | Correct platform keys, actual localized terms/products and functioning sandbox purchase for reviewer accounts; no Test Store key. Explicit V2 offering and shared Customer Center settings preserve V1 coexistence.                      |

## Evidence and release boundary

Record actual platform/build, tested scenario and outcome in the normal delivery evidence. Keep receipts, customer IDs and diagnostics private. Test Store, mocked callbacks or one successful purchase do not establish native lifecycle, complete continuity or store approval.

Unavailable evidence remains a release qualification, not a passing test. Resolve a failed required native behavior before release; do not add a custom recovery system as an unreviewed workaround.
