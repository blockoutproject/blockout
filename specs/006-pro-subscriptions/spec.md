# Functional specification: subscriptions and Pro benefits

**Feature branch**: `feature/262-pro-ad-free`

**Created on**: 2026-09-18

**Status**: Accepted functional baseline under [planning authority #9](https://github.com/blockoutproject/blockout/issues/9); technical-dossier acceptance and implementation evidence remain separate.

**Requested scope**: [#262](https://github.com/blockoutproject/blockout-legacy/issues/262), F09 in the [specification navigation](../../README.md#specifications). Define paid and gifted Pro entitlements, their refresh, purchases, restorations, transfers and assisted recovery, in continuity with [F05](../005-accounts-identity/spec.md) and [F11](../004-advertising-privacy-legal/spec.md). No new benefit, subscription tier, web purchase or pricing change is selected here.

## Clarifications — approved KISS revision, 2026-10-06

- Q: Who decides Pro and restoration scope? → A: RevenueCat SDK state, cache and expiry govern mobile rights; the server retains account mappings and cleanup only. Native receipt-wide transfers are accepted, without merging Blockout profiles. Gifts remain managed in the RevenueCat console. The previous five-minute refresh and exact 72-hour tolerance are withdrawn.

## Clarifications

### Session 2026-09-25

- Q: What does Pro include? → A: Only the absence of advertising served by Blockout, excluding advertising from external video services; the name, offers, prices, subscriptions and gifts remain unchanged.
- Q: Who can view maps and full club calendars? → A: Everyone, including guests, regardless of entitlement state; personal and administrative permissions remain unchanged.
- Q: What governs offline Pro state? → A: Standard RevenueCat SDK cache and expiry behavior. With no state, show no advertising or purchase invitation; an inactive SDK state permits consent-based advertising.
- Q: Where does the Pro journey open? → A: The profile's “My account” entry presents a RevenueCat-managed, dismissible sheet over the profile; it does not navigate to a Blockout Pro page. The privacy entry independently opens the Google UMP form.
- Q: How does an established Pro right affect the visual theme? → A: Neutral chrome gains very restrained gold accents over black/white foundations in both themes. This is visual recognition of the same ad-free entitlement, not another gated feature. Division contexts and match cards keep their existing treatment; unknown or expired rights do not imply premium styling.
- Q: What is the scope of this revision? → A: Specifications and the standalone prototype; no production code, V2 technical plan, catalog or provider setting changes. Affected mockups must be revalidated under #272 during R02.

## User scenarios and validation _(mandatory)_

The actors are the visitor, the holder of a usable account and the project owner, the only person authorized at launch to manage manual benefits and recovery in RevenueCat. A Blockout moderator receives none of these powers automatically. Stores manage billing; assignment of a Blockout entitlement is distinct from the paying Apple/Google account and the F05 sign-in identity.

These scenarios are expected outcomes of a future implementation. Their presence proves neither an actual purchase, store configuration nor success of the deletion/restoration lifecycle. A, FR and SC identifiers are local to F09. Later mutative tests must use authorized qualification accounts; no real customer data is published in evidence.

### User story 1 — Understand my access and recover my benefits (Priority: P1)

As an account holder, I want to recover the same benefits on my devices and understand whether my access is active, free or pending, without unnecessary payment.

**Priority rationale**: Entitlements determine the advertising exemption, never access to sporting consultation. Missing evidence does not mean the person must buy.

**Independent validation**: Cross each entitlement state with sporting consultation and advertising, then switch accounts and platforms with delayed responses.

**Acceptance scenarios**:

1. **A01** — **Given** a valid paid subscription or valid manual benefit, **when** entitlements are established, **then** the sole Pro benefit is the absence of advertising served by Blockout. The pool map and full calendars of clubs’ upcoming and completed matches are free for everyone, including guests. Advertising from external video services is excluded from this promise; a mere client declaration proves no entitlement. (FR-001–FR-003)
2. **A02** — **Given** a guest or an account that is SDK-inactive, paid active, gifted, expired or has unknown entitlements, **when** they open public sporting consultation, including a pool map or full club calendar, **then** no Pro block, wait for entitlement verification or purchase invitation interrupts access. Personal and administrative actions retain their account and permission conditions. A person with free status may voluntarily open the Pro offer from the profile; purchase and restoration require sign-in. Unknown entitlements display verification and retry only in the Pro context, without advertising or an invitation to repurchase. F13 accessibility applies to degraded states. (FR-001, FR-003–FR-005, FR-017, FR-033)
3. **A03** — **Given** paid and promotional entitlements in RevenueCat, **when** native SDK state changes after expiry, revocation or restoration, **then** that state determines Pro without a Blockout recomputation. A gift changes no billing date; restoration follows the accepted native receipt-wide scope. (FR-002, FR-020, FR-028)
4. **A04** — **Given** the same Blockout account on another device or the other platform, **when** the person signs in, **then** their applicable entitlements are recovered without a new purchase. An already linked Google/Apple method leads to the same outcome. Native restoration is distinct from this account-based recovery. (FR-005, FR-016)
5. **A05** — **Given** account A with a purchase, restoration or entitlement read in progress, **when** the session switches to B or guest mode and a response from A arrives, **then** it assigns no entitlement to the new session. A payment already made remains recoverable in its legitimate context; the session change does not portray it as a store cancellation. (FR-006, FR-014)

### User story 2 — Continue during an outage without retaining an entitlement indefinitely (Priority: P1)

As a subscriber, I want verification outages not to cut off my benefits immediately, using the provider’s standard state and understandable recovery.

**Priority rationale**: A verification outage, a certain end date and a billing problem with an entitlement still active must be distinguished.

**Independent validation**: Supply active, inactive, cached and unavailable SDK state, then change account and exercise native purchase/restoration outcomes.

**Acceptance scenarios**:

1. **A06** — **Given** active use, foreground return or an opened Pro sheet, **when** the RevenueCat SDK supplies cached or refreshed state, **then** the application uses that state without a custom five-minute clock or backend verification. Public sporting consultation remains usable. (FR-003, FR-007, FR-008)
2. **A07** — **Given** a provider outage, **when** the SDK still supplies an active entitlement under its cache rules, **then** Pro remains active. When it supplies an inactive state, F11 advertising eligibility may resume subject to consent. No exact 72-hour Blockout guarantee is asserted. (FR-003, FR-004, FR-009)
3. **A08** — **Given** an unavailable SDK with no current-account state, **when** the application restarts or verification fails, **then** it shows no advertising and no purchase invitation; retry and support remain available. No timestamp or independent tolerance counter is introduced. (FR-004, FR-007–FR-009)
4. **A09** — **Given** a changed entitlement, **when** the SDK refreshes, **then** its current state governs Pro. A response for an earlier account session cannot grant rights to the new account. (FR-006, FR-010)
5. **A10** — **Given** a gift expiry, sign-out or accepted deletion, **when** state is evaluated, **then** native SDK expiry rules apply and the previous account’s rights never populate a guest or another account. There is no separate Blockout grace period. (FR-005, FR-009, FR-010, FR-027)
6. **A11** — **Given** renewal disabled but a paid period still active, **when** the person views Pro, **then** entitlements remain applicable until their actual end. A payment problem with active store grace also preserves access; expiry, suspension without an active entitlement or confirmed revocation removes only the relevant entitlement. An event label alone is insufficient to decide the outcome. (FR-011)

### User story 3 — Purchase and manage my subscription without ambiguity (Priority: P1)

As an account holder, I want to know the offer terms, understand the payment outcome and find subscription management.

**Priority rationale**: Payment, entitlement verification and display of benefits may complete separately; confusing them may lead to paying again.

**Independent validation**: Exercise an available then unavailable offer, cancel, defer or confirm payment and trigger a verification failure after payment.

**Acceptance scenarios**:

1. **A12** — **Given** a usable account confirmed as free, **when** the offer is opened, **then** available products, their localized price, period and applicable terms are displayed without an invented price. An absent offer, failed retrieval and an already Pro account are not confused; no payment is triggered automatically. (FR-005, FR-012, FR-013)
2. **A13** — **Given** a purchase journey, **when** the person cancels or the store indicates a pending payment, **then** no new Pro access is granted on that outcome alone. Cancellation is not presented as a technical error; waiting explains retry without inviting multiple purchases. An independent valid entitlement remains applicable. (FR-014)
3. **A14** — **Given** a payment confirmed by the store, **when** immediate entitlement verification fails or remains uncertain, **then** the confirmed payment is not presented as failed. Activation is pending with retry and support, without an invitation to pay again. A lost response does not justify blindly repeating the purchase. (FR-008, FR-014, FR-015)
4. **A15** — **Given** a confirmed purchase and valid entitlement established for the current account, **when** the result is applied, **then** the absence of advertising is confirmed without requiring a restart. No sporting content is presented as newly unlocked. A repeated request must not intentionally create an additional purchase; an already owned purchase directs the person to recognition or restoration. (FR-006, FR-014, FR-015)
5. **A16** — **Given** a profile with a paid subscription, gift only or uncertain rights, **when** “Blockout Pro” is tapped, **then** RevenueCat-managed UI appears as a dismissible sheet over the profile, without a Blockout Pro page. The origin and reliable validity details remain distinct; management directs paid subscribers to the original store, and a gift implies no billed renewal. Closing the sheet returns to the profile. If native management is unavailable on this device, the journey remains understandable. (FR-017, FR-018)

### User story 4 — Restore a purchase and obtain verified assistance (Priority: P1)

As a purchase holder, I want to recover it after reinstalling, switching accounts or deletion, without merging profiles or losing other entitlements.

**Priority rationale**: Holding a Blockout account and owning the purchase are distinct; support must neither require repurchasing nor arbitrarily assign a subscription.

**Independent validation**: Restore from each store onto the original account then another account, with an independent gift, and qualify evidence for assisted recovery.

**Acceptance scenarios**:

1. **A17** — **Given** a signed-in account, free, Pro or awaiting verification, **when** the person looks for restoration, **then** they find an action independent of starting a purchase. Information explains possible association of store purchases with the current account. Unavailability prevents the attempt with retry, without permanently hiding the journey. (FR-005, FR-017, FR-019)
2. **A18** — **Given** a restoration request, **when** the store returns no applicable purchase, confirms restoration with a valid entitlement, or cannot establish the outcome, **then** these three outcomes remain distinct. A successful operation without an active Pro entitlement does not receive a “Pro active” confirmation. The outcome is verified immediately. (FR-008, FR-019)
3. **A19** — **Given** an authenticated account B and store purchases previously associated with A, **when** the user explicitly restores, **then** the standard RevenueCat/store transfer scope applies, potentially receipt-wide. No Blockout profile is merged and no gift transfers as a purchase. Observe both accounts on refresh without a purchase-by-purchase guarantee. (FR-010, FR-020, FR-028, FR-032)
4. **A20** — **Given** an Apple purchase and a person now on Android without access to their old Blockout account, **when** they request recovery, **then** no native restoration of an Apple receipt on Google Play is promised; verified assisted recovery is offered. The reverse case is covered. If the same Blockout account remains accessible, its entitlements are recovered without requiring a store change. (FR-016, FR-021)
5. **A21** — **Given** resolved F05 deletion, including erasure of the RevenueCat customer record, and a still-valid store purchase, **when** the person creates an account then restores, **then** only the paid entitlement may be restored. The old profile, follows, account age, contribution attribution and gifts do not return; a delayed old operation does not erase this new entitlement. Qualify Apple and Google separately, with the relevant offers, notifications, historical associations and actual transfer effects; a customer sample does not constitute complete reconciliation. (FR-022, FR-032)
6. **A22** — **Given** assisted recovery, **when** the owner verifies the recipient account, the purchase, its validity and corroborating ownership evidence, **then** they may perform the compatible operation, check both assignments and communicate the outcome. The request reference, reason, decision and outcomes are retained in the private process. (FR-023–FR-025)
7. **A23** — **Given** a declared email, an isolated transaction number, an uncorroborated screenshot, an uncertain recipient or contradictory evidence, **when** the request is examined, **then** no automatic transfer or gift occurs. The response specifies what is missing or the refusal reason without disclosing another customer’s information; additional evidence may be submitted. (FR-023, FR-024, FR-034)
8. **A24** — **Given** a manual transfer that could affect an independent entitlement or whose outcome is uncertain, **when** the owner intervenes, **then** they do not bypass guarantees: they verify the scope, contact the provider if necessary and reread the result before repetition. A later restoration by the paying store account may transfer the purchase again; the manual transfer has not changed that paying account. (FR-020, FR-025, FR-026)

### User story 5 — Grant and withdraw a gifted benefit without changing billing (Priority: P1)

As the owner, I want to gift Pro to an identified account, set its validity and revoke it from RevenueCat, without an additional Blockout screen.

**Priority rationale**: This capability is retained from V2 launch, but must neither alter a subscription nor become disguised account recovery.

**Independent validation**: Grant a temporary then open-ended gift, change its validity outcome, revoke it and cross these operations with subscription, transfer and deletion.

**Acceptance scenarios**:

1. **A25** — **Given** the owner in RevenueCat and an unambiguously identified beneficiary, **when** they grant Pro with or without an end date, **then** its visibility follows the SDK refresh and its known validity is identifiable. An address alone is insufficient to choose between accounts; a Blockout moderation role does not authorize the operation. (FR-027, FR-029)
2. **A26** — **Given** a temporary benefit, **when** its end date is reached, **then** that entitlement stops granting Pro under SDK expiry behavior, without a Blockout extension. An explicit change or extension produces identifiable final validity, without implicitly adding durations. A failed or uncertain operation receives no false confirmation and can be checked before retry. (FR-009, FR-027, FR-030)
3. **A27** — **Given** a gift and paid subscription simultaneously, **when** the gift is revoked, **then** the valid subscription continues granting Pro. Its price, billing date and renewal remain unchanged; gifting Pro has suspended no payment and creates no refund. (FR-002, FR-028, FR-030)
4. **A28** — **Given** an open-ended gift, **when** the account is deleted or a purchase transferred elsewhere, **then** the gift disappears with the deleted account or stays with its beneficiary during transfer, as applicable. It does not return on recreation and is not presented as a billed subscription. (FR-022, FR-028)
5. **A29** — **Given** a confirmed console change at RevenueCat, **when** the SDK refreshes, **then** the application reflects the supplied state without a Blockout propagation deadline. Existing provider/private intervention evidence identifies the operation; no extra grant ledger is created. (FR-004, FR-007, FR-029–FR-031, FR-034)

### User story 6 — Recognize my Pro experience without losing sports context (Priority: P2)

As a Pro subscriber or gift recipient, I want a restrained premium treatment in neutral app chrome without losing readable matches or competition colors.

**Independent validation**: Compare neutral and sporting screens in light and dark themes for active paid, gifted, maintained, SDK-inactive, guest and unknown-rights states; then switch accounts and apply a reliable entitlement change.

**Acceptance scenario**:

1. **A30** — **Given** an active Pro right supplied by the SDK, **when** its owner browses neutral screens, **then** subtle gold accents complement black/white foundations in both themes. Match cards and division contexts keep their existing colors. Unknown, expired and free rights do not receive this treatment; logout or account change immediately clears the previous owner's premium styling. (FR-005, FR-035)

### Edge cases

- Expected expiry with renewal still undetermined does not by itself constitute a confirmed end. A certain end, revocation or the known end date of a gift receives no new interval. (A07–A11)
- SDK cache/expiry behavior is authoritative; no additional freshness or outage clock is maintained. (A06–A10)
- A transaction may be paid without benefits yet established; a successful restoration may contain no active Pro entitlement. (A14, A18)
- An account’s entitlement, the store receipt and historical RevenueCat associations are not the same identity; F09 authorizes no new Auth0 linking. (A04, A19–A24)
- A refund or cancellation record must be interpreted with the effective entitlement, not as an instruction to remove all access. (A03, A11, A27)
- Disappearance of the payment record during F05 deletion does not delete the store purchase, but neither does it permit restoration exposed to erasure still in progress. (A21)
- Closing the provider sheet, losing an offer or changing account while it is open MUST NOT imply a confirmed purchase or entitlement or retain the previous owner's premium styling. (A05, A12–A16, A30)

## Requirements _(mandatory)_

### Functional requirements

#### Entitlements and states

- **FR-001**: Blockout Pro MUST have a single benefit: the absence of advertising served by Blockout. Its name, offers, subscriptions and gifts MUST be retained without changing prices, the catalog or provider settings. The pool map and full calendars of clubs’ upcoming and completed matches MUST be free, including for guests, in all entitlement states; no sporting consultation may require Pro, entitlement verification or a purchase invitation. Account and permission conditions for personal and administrative actions remain unchanged. F03 owns sporting content; F11 owns advertising. Advertising served by external video services is explicitly excluded from the Pro promise.
- **FR-002**: Pro access MUST follow the active entitlement supplied by RevenueCat, accounting for supported paid and promotional grants. Gifts do not postpone or suspend subscription billing. Blockout does not recompute or persist a separate entitlement decision; native transfer scope follows FR-020.
- **FR-003**: The mobile MUST consume RevenueCat SDK entitlement state for the current account, distinguishing active, inactive, unavailable/no state and pending purchase. SDK cache and expiration behavior apply. No backend entitlement projection, separate grant ledger, custom refresh clock or Blockout outage tolerance is required. These states MUST NOT block sporting consultation.
- **FR-004**: When the SDK supplies no entitlement state for the current account, show verification unavailable with retry and support, without advertising or a purchase invitation. An inactive state supplied by the SDK, including a cached state under its standard behavior, MAY permit advertising under F11 consent, availability and frequency rules. A transport failure alone does not establish an inactive state. No advertising debt accumulates.
- **FR-005**: Purchase and restoration MUST require authentication and a usable account as defined by F05. A guest does not retain the previous account’s SDK entitlement state. Pro accounts or accounts with undetermined entitlements MUST NOT be encouraged to repurchase; restoration and support access remains identifiable even if unavailability temporarily prevents execution.
- **FR-006**: Every entitlement, purchase or restoration response MUST remain attributed to the relevant account and operation. Sign-out, account switching and late responses MUST NOT assign A’s outcome to B or a guest. An already made payment is not inferred to be cancelled from a session change; its recovery follows the account and purchase actually concerned.

#### Freshness, outage and billing

- **FR-007**: RevenueCat SDK refresh and cache behavior MUST govern when entitlement changes become visible. Use its standard integration for sign-in, foreground use, purchase, restoration and provider-managed UI. No Blockout guarantee of renewal within five minutes or global propagation deadline applies; sporting consultation does not wait.
- **FR-008**: Purchase and restoration MUST consume the outcome and current-account entitlement state supplied by the RevenueCat SDK. Keep payment success, entitlement activation and unavailable verification distinct. A lost response does not authorize blind repurchase. No additional server verification endpoint or custom evidence timestamp is required.
- **FR-009**: Withdrawn by the approved KISS revision: the exact 72-hour Blockout outage tolerance and its clock protections are removed. Standard SDK cache/expiration behavior and FR-004 no-state handling apply.
- **FR-010**: The mobile MUST apply the current-account state supplied by the SDK and reject responses from an earlier account session. Sign-out and accepted deletion invalidate that account’s local rights and private data. Use standard provider transfer and refresh behavior; do not build an independent ordering or entitlement projection system.
- **FR-011**: Effective entitlement validity MUST govern access, not merely the name of a payment event. Disabling renewal preserves the still-valid period; active store grace preserves the entitlement. Expiry, suspension without an active entitlement or effective revocation removes only the relevant entitlement. Store billing grace and SDK cache behavior remain provider-owned; this spec prescribes no change to grace settings.

#### Purchase and subscription consultation

- **FR-012**: The offer MUST present actually available products, their localized price, period and applicable terms, including a trial or renewal if present. Store information and the selected offer are authoritative; a historical observation does not set a price, trial, annual offer or family sharing. No new Pro tier or web purchase is introduced.
- **FR-013**: The system MUST distinguish an available offer, no offer and retrieval unavailability, with retry and without implicit payment. A purchase starts only on an explicit action by an eligible account; validity checks do not serve to multiply purchases of an already owned entitlement.
- **FR-014**: The journey MUST distinguish user cancellation, pending payment, definite error, uncertain outcome and confirmed payment. Cancellation or waiting grants no new entitlement on that outcome alone and removes no independent entitlement. Confirmed payment followed by verification failure remains a confirmed payment with activation pending, without an invitation to pay a second time. An unknown outcome requires verification/safe retry rather than blind repetition.
- **FR-015**: Pro activation MUST be announced only after the entitlement is established for the current account. The sole ad-free benefit MUST apply without requiring a restart; confirmation MUST NOT imply that sporting content has been unlocked. Retrying a paid or already owned purchase MUST allow its recognition or restoration without intentional additional acquisition, with support access if verification remains unavailable.
- **FR-016**: The same Blockout account MUST recover its applicable entitlements on its devices and platforms without repurchasing. Identity associations already retained by F05 remain equivalent; no new Auth0 association or business profile merge is introduced. The paying Apple/Google account remains distinct from the Blockout sign-in method.
- **FR-017**: The profile MUST show “Blockout Pro” before “Privacy choices” in “My account”, with meaningful, distinct icons. Tapping Pro MUST present RevenueCat-managed UI as a dismissible sheet over the profile, without a separate Blockout Pro page; the privacy entry independently opens the Google UMP form. The provider journey MUST make entitlement information, restoration independent of purchase, paid-subscription store management and assistance reachable. Its offer MUST describe only “An ad-free experience”, explicitly excluding external video-service ads. Paid, gifted and verification states MUST remain distinct and show only known validity/renewal dates; a gift MUST NOT imply billed renewal. RevenueCat owns entitlement decisions and the offer/customer UI; Blockout owns account association, consumption of SDK state, advertising consent rules and safe lifecycle cleanup. R02 owns visual revalidation, not a new commercial offer.
- **FR-018**: Billing management MUST direct the person to the original store, with an understandable indication when its native management is not accessible on the device. Gifting Pro, deleting a Blockout account or changing platforms constitutes neither cancellation nor a refund. No Blockout-specific payment editor or refund process is added; the relevant store procedures and applicable support remain accessible.

#### Restoration, transfer and return

- **FR-019**: Restoration MUST be explicitly triggered, without requiring a prior purchase in this journey, with clear information about possible association of store purchases with the current account. The informed action is sufficient without systematic repeated confirmation. The absence of an applicable purchase, a valid restored entitlement and an unavailable/uncertain outcome MUST be distinguished; an operation without an active entitlement must not announce “Pro active”.
- **FR-020**: Explicit restoration MUST accept the standard RevenueCat/store transfer scope, which can include all purchases on a receipt. Do not promise transfer purchase by purchase or that other paid purchases on that receipt remain with the old account. No Blockout business profiles are merged; manual gifts are not transferred as store purchases. Actual behavior must be qualified on both stores before launch.
- **FR-021**: The journey MUST NOT promise native restoration of a receipt from another store. When the original Blockout account remains accessible, FR-016 applies; otherwise, the person is directed to verified assisted recovery. Impossible native restoration proves neither absence of a purchase nor an obligation to repurchase.
- **FR-022**: After resolved F05 deletion, including the RevenueCat customer record, a still-valid store purchase MUST be restorable on a new usable account without recovering old data, account age, contribution attribution, personal permissions or gifts. The complete lifecycle MUST be qualified separately on Apple and Google. Restoration exposed to erasures still in progress is suspended under F05; old retries must not alter the new account or entitlement.

#### Assisted recovery

- **FR-023**: Assisted recovery MUST use the private F10/F11 process and, for compatible interventions, RevenueCat; at launch, only the owner is authorized to intervene. The recipient account must be authenticated and usable. The operator MUST establish the link between the request, that account, the actual purchase, its current validity and its beneficiary before transferring; a declared address or identifier alone does not constitute evidence.
- **FR-024**: Supplied evidence, such as store documentation and its references, MUST be checked against transaction data and corroborating ownership evidence obtained through the authorized process. An isolated transaction number or uncorroborated screenshot is not automatically sufficient. In case of contradiction, an uncertain recipient or insufficient evidence, no transfer or automatic compensatory gift is authorized; explain the reason or missing elements without disclosing others’ data and allow a completed request. F11 proportionate verification still applies, without systematic identity documents.
- **FR-025**: Before intervention, the owner MUST verify the relevant entitlements and effects on the old and new beneficiary. After intervention, they MUST verify the outcome and record privately the request reference, operator, reason, necessary decision evidence, date, scope and outcome, including uncertain or pending. A reread precedes repetition of an operation with an unknown outcome; the communicated result must not claim completion of what remains pending.
- **FR-026**: Assisted recovery MUST use the provider’s supported scope with verified ownership and an understandable outcome. If necessary evidence or a supported operation is unavailable, report the block and use provider support rather than fabricating success or merging profiles. Standard receipt-wide transfer is accepted under FR-020; no bespoke per-purchase transfer mechanism is required.

#### Gifted benefits and operations

- **FR-027**: The owner MUST manage gifts directly in the RevenueCat console: grant, extend/change using supported operations or revoke an entitlement, with an explicit expiry or no expiry. There is no additional Blockout grant ledger or administration screen. Mobile visibility follows standard SDK refresh and expiration; no immediate cross-device propagation guarantee is imposed.
- **FR-028**: A gift MUST be independent of the beneficiary’s charges, prices, renewals, refunds and other entitlements. It is not automatically converted to a subscription and does not suspend an existing subscription. It stays attached to its beneficiary account on purchase transfer; its deletion with the account is definitive unless a new explicit assignment is made to a new account. Revoking it does not remove a valid subscription.
- **FR-029**: At launch, manual assignments, changes, revocations and recovery MUST be reserved for the owner in RevenueCat and have an identifiable private record. RevenueCat’s Support role MUST NOT be described as a permission limited to gifts: it has broader powers. Any later delegation requires an explicit decision; no Blockout moderation role or support-record access right implicitly grants these powers.
- **FR-030**: Operator actions MUST distinguish request, confirmed provider result, failure and uncertainty. Inspect the provider result before repeating an uncertain operation; do not arbitrarily extend a gift or remove a valid subscription. The mobile reflects changes on SDK refresh under FR-007, without claiming earlier success.
- **FR-031**: Verification outages, pending purchases/restorations and blocked interventions MUST be identifiable and addressable under F13 without exposing personal data, receipts or secrets in diagnostics. Entitlement recovery and propagation remain distinct; no new human on-call coverage or provider response deadline is guaranteed.
- **FR-032**: Qualification before launch MUST verify offer/entitlement mappings, effective restoration and store notification settings, historical identities and purchase/gift transfer limits. Observing a few customers, a Test Store purchase or a dashboard interface does not prove continuity of all subscriptions. F14 owns full reconciliation and transition; this requirement makes no production change. The F14 welcome explains recovery and offers restoration after sign-in; this assistance waives neither prior reconciliation nor preservation of indispensable evidence, and does not classify a verification outage as subscription loss.
- **FR-033**: Journeys MUST apply F13 for accessibility, language, understandable errors and degraded states, and F05 for a usable account and isolation. Entitlement validation and its availability MUST NOT block public content or support. Qualification evidence must not be presented as behavior already delivered in V1.
- **FR-034**: Payment evidence, account mappings, supporting documents and intervention records MUST remain in processes authorized for their purpose, under F11. Traceability justifies neither public copying of a record, retention of a complete customer after deletion nor unlimited retention. Data requests and backups apply current restrictions before making data available again; an old restored state does not restore a revoked entitlement.
- **FR-035**: An established active Pro right supplied by the SDK MUST give neutral application chrome a restrained black/white/gold appearance in both light and dark themes. This visual recognition MUST NOT gate any capability beyond the sole ad-free benefit. Gold is a subtle accent, not a brown replacement for surfaces or a sporting-division color. Match cards and division-specific contexts MUST retain their light/dark and division treatments. Guest, SDK-inactive, expired and unknown-rights states MUST use the neutral base theme. Account or reliable entitlement changes MUST update the appearance without retaining a previous account's premium styling.

### States and access decisions

| Established state                                                                | Sporting consultation                                          | Blockout advertising and Pro information                                          | Recovery                                                                 |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Guest                                                                            | All public content, including maps and club calendars          | F11 guest eligibility; no exemption from the previous account                     | Sign-in before purchase or restoration, never before public consultation |
| Active paid entitlement or valid gift                                            | All public content                                             | No advertising; Pro active, with valid origin and date                            | Normal verification; native entitlement state                            |
| Reliably SDK-inactive, including after a certain end without another entitlement | All public content                                             | F11 eligibility; offer voluntarily accessible from the profile                    | Explicit purchase, restoration or support                                |
| Unknown entitlements for a signed-in account                                     | All public content                                             | No advertising or repurchase invitation; “to be verified” state                   | Retry; elapsed time alone never establishes free status                  |
| SDK supplies active state during outage                                          | All public content                                             | No advertising; Pro active under SDK behavior                                     | Standard SDK refresh                                                     |
| SDK supplies no state                                                            | All public content                                             | No advertising or purchase invitation                                             | Retry or support                                                         |
| Initial purchase pending                                                         | All public content                                             | No new entitlement from pending payment alone; other entitlements or FR-004 apply | Verify without multiplying purchases                                     |
| Known gift end date, entitlement end, revocation or transfer                     | All public content                                             | Other independent entitlements determine active, free or unknown status           | SDK cache and expiration behavior applies                                |
| F05 sign-out or deletion                                                         | Guest public content subject to usual application availability | Guest rules; no account exemption or private data retained                        | F05 lifecycle; no implicit recovery                                      |

### Key entities

- **Beneficiary account**: F05 business account to which an entitlement is assigned, distinct from linked identities and the paying store account.
- **Store purchase / subscription**: Transaction and validity periods tied to the original store; their billing is not changed by a gift or Blockout transfer.
- **Paid Pro entitlement**: Advertising exemption from a valid purchase; its transfer transfers neither business profile data nor sporting access.
- **Manual benefit**: Gifted advertising exemption, temporary or open-ended, revocable and independent of paid entitlements; it does not govern sporting access.
- **Entitlement state**: Current-account RevenueCat SDK information, including its standard cached state; no separate Blockout evidence clock or rights ledger.
- **Offer**: Presentation of actually available products and their terms; constitutes neither purchase evidence nor an entitlement.
- **Purchase/restoration operation**: Explicit action whose payment, receipt of the outcome and entitlement establishment may have distinct outcomes.
- **Recovery / intervention record**: Private request, proportionate evidence, verified recipient, decision, scope and outcome; does not replace the F05 account.

## Success criteria _(mandatory)_

### Measurable outcomes

- **SC-001**: A01–A05 MUST preserve exactly one Pro benefit and correct account assignment. For guests and SDK-inactive, paid-active, gifted, unknown and expired states, pool maps and both club calendars remain accessible without waiting for entitlement verification or a purchase invitation. A mere account switch does not copy local rights from A to B or a guest. Explicit restoration follows the accepted RevenueCat/store transfer scope and may affect the store receipt as a whole; Blockout profiles remain separate. (FR-001–FR-006, FR-016)
- **SC-002**: A06–A10 exercise SDK active, cached inactive and unavailable states, SDK refresh, account switching and purchase uncertainty. No custom five-minute refresh, exact 72-hour tolerance or backend rights projection is introduced. (FR-003–FR-010)
- **SC-003**: A02 and A07–A11 distinguish SDK-inactive, waiting, outage and entitlements still active despite a billing problem; zero advertising or repurchase invitation appears when entitlements remain undetermined without usable evidence. (FR-003–FR-004, FR-009–FR-011)
- **SC-004**: A12–A16 distinguish every payment outcome and announce no unestablished entitlement; every confirmed payment can be recovered without an invitation to repeat it. Established activation requires no restart. (FR-012–FR-018)
- **SC-005**: A17–A21 qualify both stores, recording actual native restoration scope, potentially receipt-wide, and its visibility on SDK refresh. No business profile merge, gift transfer as a purchase or return of deleted business data occurs. Impossible native restoration has an explicit assistance direction. (FR-019–FR-022)
- **SC-006**: A22–A24 permit no intervention on a mere declaration, insufficient evidence or an uncertain recipient; every performed intervention has a verifiable private decision and outcome. A block does not become an automatic gift or false success. (FR-023–FR-026, FR-034)
- **SC-007**: A25–A29 cover assignment, validity, end date, change and revocation; no gift operation changes a charge or independent entitlement. At launch, only the owner performs these operations in RevenueCat. (FR-027–FR-030)
- **SC-008**: Across A01–A29, pending outcomes and errors have usable recovery or direction; every qualification item states its scope without public personal data and without claiming global store validation from observation alone. (FR-031–FR-034)
- **SC-009**: A16 and A30 show provider-managed UI from the profile without a separate Pro page and distinguish premium styling in both themes only for established SDK-active rights. No match card or division palette is recolored gold; account and entitlement changes leave no previous-user premium styling. (FR-005, FR-017, FR-035)

## Assumptions and dependencies

- Existing offers remain the starting point: the scoping observation of a monthly product is not a complete audit of the catalog, prices, trials or sharing settings. These must be checked before publication; no new commercial offer is imposed.
- RevenueCat SDK state and refresh determine visibility; Blockout defines no independent refresh or outage-tolerance deadline.
- No global propagation deadline applies. Provider/native qualifications remain unexecuted until actual applications and authorized environments exist.
- The RevenueCat console owns gifts, and its SDK supplies mobile entitlements. The backend retains identity/customer mappings and lifecycle cleanup only, without a business entitlement projection or gift ledger.
- Support uses the F10/F11 process with proportionate verification. Provider capabilities must meet guarantees before activation: technical impossibility does not allow the implementation to merge accounts or broaden transfer without a product decision.
- F05 identity choices remain settled: existing associations only, no new Google/Apple linking, migration/deletion distinction, guest access and prevention of delayed old operations. F09 does not redefine them.
- The 2026-10-06 scoped approval in [design references](../../docs/design.md#review-references) covers the provider-managed sheet entry from the profile, distinct Pro/privacy icons, the ad-free-only offer, SDK-active/to-verify states, subtle premium chrome in both themes, unchanged sporting palettes, free guest maps and club calendars, unavailable offers, pending payment/activation, restoration and assistance. No Blockout Pro page or gift-operator screen is required. Actual provider-managed content and native/store behavior remain to qualify; a material design change requires revalidation.

## V1 evidence and limitations

Code observations used the identity baseline `03ca1bfec969ef8b85686bea0ed974f20a7bf945` and general-inventory baseline `a67b615cc293b757fd71d8a055b6b4b7cc7cacaa`. Historical links pin the later foundation `e31d3105421ae1130d574af191ecdd94cb7308ea`; they do not change the observed baselines. The owner accepted the monorepo as a functional reference but confirmed on 2026-10-04 that it is not deployed: running V1 instances come from independent repositories. No installed binary or complete deployed configuration was established. These retained observations authorize no new source or provider inspection.

Authorized read-only production RevenueCat inspection on **2026-09-15**, recorded under [legacy #253](https://github.com/blockoutproject/blockout-legacy/issues/253), found:

- Restore behavior `Transfer to new App User ID`, without a distinct sandbox setting. This is configuration evidence, not a successful native restore or cross-store recovery.
- Entitlement `Blockout Pro`, App Store product `monthly`, Google Play `monthly:monthly`, Test Store `monthly`, and active `default` offering with one package. Both production app identifiers were `com.blockoutproject.blockout`. Offering contents, prices, trials, Family Sharing and complete store settings were not audited; Test Store does not prove a production purchase.
- Recent Apple server-notification receipt with new-purchase tracking enabled; no connected Google developer-notification topic; no active dashboard integrations. Those are distinct surfaces: the empty integrations page does not imply absent Apple notifications. Google delivery was unverified.
- A renewing active Apple monthly customer with an Auth0-format ID and anonymous alias, matched to an Auth0 sample. Visible active rows included Google/Apple-format IDs. Totals were not reconciled and can reflect different cohorts or refresh times; this does not prove full coverage, absence of anonymous-only customers or completeness of aliases. [Customer-list limitations](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-lists) apply.

No production purchase, restoration, linking, deletion, exhaustive subscriber reconciliation or cutover test was performed. [F05](../005-accounts-identity/spec.md#v1-evidence-and-limitations) owns identity samples and [F14](../014-v1-v2-transition/spec.md#v1-evidence) owns their transition qualification. Historical architectural intentions do not establish an implemented backend entitlement service.

| Source                                                                                                                                                                                                                                                                                                                                                                                     | Bounded finding                                                                                                                                | Consequence for F09                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Mobile purchases provider](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/subscription/providers/purchases-provider.tsx)                                                                                                                                                                               | Orders identity changes, filters some old responses, rereads entitlements after purchase/restoration and retains a cached state after failure. | Preserve the isolation intent, define reliable boundaries and also cover account switching during payment. The code does not qualify current RevenueCat SDK cache/expiry behavior. |
| [Mobile provider tests](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/subscription/providers/__tests__/purchases-provider.test.tsx)                                                                                                                                                                    | Cover account changes, responses, offline cache and purchase-screen outcomes with simulated providers.                                         | Limited local evidence; does not replace store, independent-entitlement or deletion/recreation tests.                                                                              |
| [Pro invitation](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/subscription/ui/pro-upsell-tab.tsx) and [advertising](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/advertising/providers/advertising-provider.tsx) | Use, among other things, initial availability and a Pro indicator; a degraded state may be considered loaded.                                  | A failure must not become free by default: FR-003–FR-004 and F11 set the future outcome.                                                                                           |
| [Club tabs](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/club/ui/club-tabs.tsx) and [pool tabs](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/pool/ui/pool-tabs.tsx)                                              | Gate club lists and the map on the Pro indicator.                                                                                              | Historical V1 gates are removed from V2 by FR-001; they do not prove that paid sporting access is required in V2.                                                                  |
| [RevenueCat adapter](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/subscription/providers/revenuecat-client.ts)                                                                                                                                                                                        | Distinguishes, among other things, configuration, identity, network, waiting and store; messages and diagnostics are bounded.                  | Preserve understandable outcomes without treating verification failure after payment as a declined payment.                                                                        |

The following official references delimit possibilities and necessary qualifications:

- [RevenueCat caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching): the documentation describes, among other things, foreground refresh at five minutes and offline tolerance of up to three days. V2 delegates cache/expiry to the SDK; this documentation is not qualification of Blockout’s actual native integration.
- [Entitlement state](https://www.revenuecat.com/docs/customers/customer-info) and [billing grace](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work): entitlement retrieval, caching, restoration and periods remaining active despite a payment problem. No store setting is assumed enabled.
- [Restoration](https://www.revenuecat.com/docs/getting-started/restoring-purchases) and [transfer behavior](https://www.revenuecat.com/docs/projects/restore-behavior): dependency on the store account, consequences of changing beneficiary and distinctions from anonymous associations. Effects on other purchases and gifts need qualification.
- [RevenueCat customer profile](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile): manual assignment with a duration or end date, revocation and operator transfer. A gift does not change billing and applies alongside subscriptions. Availability of a button does not demonstrate that a transfer respects our scope.
- [RevenueCat support](https://www.revenuecat.com/docs/dashboard-and-metrics/supporting-your-customers) and [roles](https://www.revenuecat.com/docs/projects/collaborators): a manual transfer preserves the owning store account; the Support role also includes refunds and customer deletions. V2 reserves these interventions for the owner at launch.
- [RevenueCat Paywalls](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls) and [React Native Customer Center](https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native): the SDK can present provider-managed offer and customer-management UI. Availability and actual content for Blockout still require provider qualification; these references do not establish an approved design or a working V2 integration.

## Coverage and cross-perimeter dependencies

| Origin                                       | F09 requirements      | Scenarios | Criteria       |
| -------------------------------------------- | --------------------- | --------- | -------------- |
| Entitlement state and identity isolation     | FR-001–FR-006, FR-016 | A01–A05   | SC-001         |
| F11 unknown entitlements and SDK state       | FR-007–FR-011         | A06–A11   | SC-002, SC-003 |
| Purchase and native outcomes                 | FR-012–FR-018         | A12–A16   | SC-004         |
| Native restoration and transfer              | FR-019–FR-022         | A17–A21   | SC-005         |
| Verified assisted recovery                   | FR-023–FR-026         | A22–A24   | SC-006         |
| Manual benefits                              | FR-027–FR-030         | A25–A29   | SC-007         |
| Privacy and provider qualification           | FR-031–FR-034         | A01–A29   | SC-008         |
| Provider-managed Pro UI and premium identity | FR-017, FR-035        | A16, A30  | SC-009         |

[F05 FR-007](../005-accounts-identity/spec.md#functional-requirements) establishes that distinct unlinked principals may share email without linking or merging profiles. Its F09 interface is independent restoration, never a way to link identities or transfer business data.

| Scope                                                                                                                          | Agreement and responsibility                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F03 / [#263](https://github.com/blockoutproject/blockout-legacy/issues/263)                                                    | FR-001–FR-004, FR-017: sole ad-free benefit and unrestricted public sporting consultation in every entitlement state; F03 owns content.                                                                                   |
| F05 / [#261](https://github.com/blockoutproject/blockout-legacy/issues/261)                                                    | FR-005–FR-006, FR-016, FR-020–FR-022: current identity, no new linking, deletion and return; restoration does not restore data or gifts.                                                                                  |
| [F10](../012-reports-feature-suggestions/spec.md) / [#268](https://github.com/blockoutproject/blockout-legacy/issues/268)      | FR-023–FR-026, FR-034: private recovery process, necessary voluntary documents, reply address distinct from evidence and honest outcome; no new integrated messaging.                                                     |
| F11 / [#260](https://github.com/blockoutproject/blockout-legacy/issues/260)                                                    | FR-003–FR-004, FR-009–FR-011, FR-034: advertising compatible with each state, purposes and protection of documents/records; no new periodic purge or general retention duration.                                          |
| [F12](../013-administration-app-configuration/spec.md) / [#269](https://github.com/blockoutproject/blockout-legacy/issues/269) | FR-027–FR-030: owner only in RevenueCat at launch, no implicit moderation permission and no additional Blockout screen for gifts.                                                                                         |
| F13 / [#259](https://github.com/blockoutproject/blockout-legacy/issues/259)                                                    | FR-007–FR-010, FR-031, FR-033–FR-034: freshness, outage, recovery, propagation after acceptance, restrictions before restoration and diagnostics without personal data.                                                   |
| [F14](../014-v1-v2-transition/spec.md) / [#270](https://github.com/blockoutproject/blockout-legacy/issues/270)                 | FR-020–FR-022, FR-032: reconciliation of historical entitlements and identities, effective configuration, notifications and complete per-store qualification before transition; no authorized loss of valid entitlements. |
