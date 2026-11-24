# Feature Specification: Advertising, privacy and legal

**Feature Branch**: `develop`

**Created**: 2026-09-18

**Status**: Accepted functional baseline; [plan.md](plan.md) owns technical planning and [tasks.md](tasks.md) tracks implementation.

**Input**: Approved functional rules, F11 in the [specification navigation](../../README.md#specifications). Define age-appropriate advertising, its frequency and relationship with Pro, public consultation and versioned publication of legal documents, and shared privacy obligations. Detailed reporting journeys belong to F10; their shared constraints and decisions needed to write them are explicit here.

## User Scenarios & Testing

Visitors and signed-in users view content and documents, exercise their choices and may contact support. The authorized operator maintains versioned legal files; authorized personnel handle reports and data-related requests. Repository legal-content publication grants no access to support records. F12 defines assignment of shared permissions.

These scenarios define required outcomes. They prove neither V1 behavior, provider production settings nor certified legal compliance. Identifiers are local to this specification.

### User Story 1 — View content with predictable advertising frequency (Priority: P1)

As a free user, I want predictable advertising breaks while browsing sport and direct access to live streams.

**Why this priority**: Advertising revenue must remain compatible with usable navigation, including when no ad can be displayed.

**Independent Test**: Open sporting pages, system notifications and external streams with a ready interstitial and with no interstitial available. Check which actions count and when the destination opens.

**Acceptance Scenarios**:

1. **A01** — **Given** a free user and a zero count, **when** they make ten eligible navigations, **then** the first nine continue directly. At the tenth, an authorized, ready interstitial may appear at the transition and the destination opens after dismissal. The next navigation starts a new count. (FR-001–FR-003)
2. **A02** — **Given** no authorized, ready interstitial at the tenth navigation, **when** the action is accepted, **then** it continues immediately. The next navigation starts a new count even though no ad was shown. (FR-003–FR-005)
3. **A03** — **Given** an interstitial presentation attempt, **when** the provider reports dismissal or failure, **then** the destination opens at most once if the originating navigation is still valid. Ads ready after a transition never appear there. (FR-004, FR-005)
4. **A04** — **Given** nine eligible navigations, **when** the user opens a system notification, a deep link or an external stream, navigates back, changes a filter, refreshes a page or uses an account, privacy, legal or support action, **then** that action proceeds directly without increasing the count. Returning from the background preserves the count and a new application session starts at zero. (FR-001, FR-002, FR-006)

### User Story 2 — Receive advertising consistent with my entitlements and choices (Priority: P1)

As a user, I want my Pro entitlements and privacy choices respected, even during an outage or account change.

**Why this priority**: An unknown entitlement does not prove absence of a subscription; lack of personalization does not mean a guaranteed absence of advertising.

**Independent Test**: Cross entitlement states with applicable choices and advertising preparation outages on both selected mobile platforms.

**Acceptance Scenarios**:

1. **A05** — **Given** a valid paid or gifted Pro entitlement, **when** a sporting action is performed or an external video opened, **then** Blockout serves no advertising without promising its removal from the external service. Guests and people with confirmed free status perform the same public sporting actions under the shared F11 count; guests do not wait for account entitlement consultation. No map or calendar requires Pro. (FR-007)
2. **A06** — **Given** a signed-in account, **when** the SDK supplies no state, **then** no ads or purchase invitation appear. An inactive SDK state may restore consent-based ad eligibility, including after native cache expiry, without debt or a Blockout outage clock. Public sport stays accessible. (FR-006–FR-008)
3. **A07** — **Given** account A and a pending entitlement response, **when** the user signs out or switches to account B, **then** only B’s current rights determine ad eligibility. The account change does not repeat installation consent preparation or release a destination belonging to the old account. (FR-008, FR-009)
4. **A08** — **Given** a fresh start, **when** Pro entitlements are unknown, **then** the user can browse and no ad appears while rights are unknown. A known Pro user has no automatic advertising prompt. Signing in or changing Pro status alone does not repeat an applicable consent flow already completed in the current launch. (FR-007–FR-009)
5. **A09** — **Given** a fresh or returning installation, **when** a guest or signed-in user enters the app, **then** the normal discovery and session flows lead to sport without asking for, retaining or renewing an age declaration. The provider may present its applicable consent form for advertising. (FR-009, FR-010, FR-013)
6. **A10** — **Given** two free users making the same navigations with different advertising choices, **when** they reach the tenth navigation, **then** the opportunity frequency is the same. The providers determine which ads can serve under each user’s applicable choices, and navigation proceeds when there is no eligible ad. (FR-012, FR-013)
7. **A11** — **Given** the provider requires an advertising choices entry, **when** a user opens it, **then** the native form handles their choices. A failure gives brief feedback at that action and permits an explicit retry. A subsequent ad uses current choices, including after a change or withdrawal. (FR-013, FR-014)

### User Story 3 — Read and maintain reliable legal documents (Priority: P1)

As a visitor, I want to read applicable documents without an account. As an authorized operator, I want to publish a consistent title, version and content.

**Why this priority**: Information must be accessible before the actions it concerns; a publication error must not erase the last available document.

**Independent Test**: Read each of the three documents as a guest, then compare reviewed file publication, rejected invalid content and failed release against the still-published state.

**Acceptance Scenarios**:

1. **A12** — **Given** a visitor without a session, **when** they open legal notices, the privacy policy or terms of use, **then** they can read the requested document without advertising. Native opening failure gives brief feedback at the original link and permits another explicit press. Once opened, the integrated browser supplies reading, network, reload and return controls; missing content remains explicit. None of these states constitutes acceptance. (FR-015, FR-016)
2. **A13** — **Given** an authorized legal-file update, **when** reviewed files are released with the backend, **then** public reading returns the published title, version and content together. There is no mobile editor or write API. (FR-017–FR-019)
3. **A14** — **Given** invalid legal-file content or a failed backend release, **when** publication is evaluated, **then** documentary validation rejects invalid content and the last valid document is preserved. Reading shares backend availability and may be unavailable during delivery, migration or repair; preservation is not uninterrupted availability. Check public reading after service recovery before claiming publication. (FR-017, FR-018)
4. **A15** — **Given** a document update, **when** a user views it or continues sign-in, **then** neither version history nor an acceptance register is created by that action alone. Privacy information is not treated as blanket consent to optional processing. (FR-020)

### User Story 4 — Use sporting information without re-exposing restricted data (Priority: P1)

As a data subject, I want personal information useful for sport limited to that use and applicable corrections or restrictions to take effect.

**Why this priority**: A publicly accessible source does not permit every use; preserving a sporting identity does not require republishing every historical personal datum.

**Independent Test**: Follow club contacts and referee names in their sporting context, then restrict one club contact field and replay collection and restoration. Other individual requests use the manual rights process.

**Acceptance Scenarios**:

1. **A16** — **Given** a club contact published by an authorized source or a referee associated with a match, **when** the information is used, **then** it serves the intended sporting context, not advertising profiling. Referees do not acquire standalone personal profiles and replaced old contact details do not form a viewable archive. (FR-021–FR-023)
2. **A17** — **Given** an applicable request targeting a club contact field, **when** it is handled, **then** the field is corrected or removed from relevant active views and copies without indiscriminately deleting the club, teams or matches. Later collection, even from the priority source, an administrative correction or an explicit return to the source does not re-expose the forbidden field. (FR-023, FR-024)
3. **A18** — **Given** a backup predating a restriction, erasure or applicable notification-retention boundary, **when** it is restored, **then** current obligations apply before any access. F07 notifications due for purge do not reappear and available non-personal match-level announcement facts prevent ordinary repeats. If those facts were lost, an exceptional repeat is accepted under F07 FR-045; personal erasure and expiry still apply, and uncertain compliance keeps affected data unavailable. Backup retention does not set active-data or log retention. (FR-025, FR-026; F07 A51)
4. **A19** — **Given** a technical diagnostic or secondary support notification, **when** produced, **then** no secret or personal content is exposed in a public artifact, user error or diagnostic log. Support content remains in its authorized process, not in log copies or public notifications. The only scoped personal-reference logging exception is the private original-target evidence needed for F05 manual cleanup under FR-027. (FR-021, FR-027, FR-031)

### User Story 5 — Be contacted after a report even without sign-in (Priority: P1)

As a visitor or user encountering an error, I want to send a usable report and reply address without needing to succeed at the failing action.

**Why this priority**: A “match inaccessible” report must retain the attempted target; sign-in difficulty must not close support access.

**Independent Test**: Establish expected data for a guest report, an inaccessible page and failed sign-in, then examine their destination and submission outcomes. F10 details the journey and its categories.

**Acceptance Scenarios**:

1. **A20** — **Given** a guest, a signed-in user or failed sign-in, **when** a report is prepared, **then** an email address is mandatory, prefilled if available and editable before sending. An absent or invalidly formatted value prevents submission with an explanation; valid format proves neither deliverability nor possession. Outside F12 global gates, legal information and the support journey remain accessible subject to complete-receipt rules. The three global gates suppress in-app legal/support/sign-in entry points and direct-route bypasses. (FR-028, FR-029)
2. **A21** — **Given** a route targeting a match known by identifier whose loading fails, **when** a report is sent, **then** the target type and identifier come from the attempted navigation. Unknown names remain absent; failure is not replaced by an assumed target. For failed sign-in, only the method, step and safe reason or useful reference are sent with minimal technical context. (FR-030)
3. **A22** — **Given** a report and its screenshots, **when** processed, **then** only authorized personnel access personal data, including linked files. The operator uses GitHub and may reply to the supplied address; no integrated dialogue or resolution tracking in the application is assumed. A declared address or identifier does not permit account recovery. (FR-029, FR-031, FR-032)
4. **A23** — **Given** a support submission, **when** its outcome is presented or retried, **then** only transmission of the content and every selected image, attached to the same authorized record, allows complete acceptance. An incomplete record is not finalized. After a lost response, ordinary error feedback preserves input for explicit retry without a mobile receipt lookup, retaining the accepted rare-duplicate/manual-closure limit of F10. No isolated file becomes public. If only the secondary alert fails after complete receipt, the request remains accepted without resubmission. (FR-031, FR-033)
5. **A24** — **Given** a closed support issue, **when** time passes, **then** no new periodic purge or automatic deadline is imposed. Retention remains limited to the purposes and obligations that apply to the request. (FR-026, FR-034)

### User Story 6 — Exercise my rights without depending on an account (Priority: P1)

As a data subject, I want to know the contact and process for requesting access, rectification, erasure or objection applicable to my data.

**Why this priority**: A request may concern a guest, sporting contact or person who can no longer sign in.

**Independent Test**: Prepare requests concerning an account, sporting contact and report, then identify the recipient, proportionate check and copies to process.

**Acceptance Scenarios**:

1. **A25** — **Given** a person without a session, **when** they read the privacy policy, **then** they find an email contact and request process. Handling is manual; information requested to verify identity is proportionate to the request, without systematic identity documents. (FR-035)
2. **A26** — **Given** a received request, **when** examined, **then** affected data and recipients are identified, the response or reason for a limitation is communicated within the applicable legal deadline, and follow-up is distinguished from account deletion or a refund. A recipient outage does not allow declaring complete erasure. (FR-036)
3. **A27** — **Given** release preparation, **when** processing, providers and distribution are reviewed, **then** public information explains the actual purposes, recipients, retention conditions and rights procedures. The declared audience and enabled advertising configuration support advertising without age collection, and EU27 distribution preserves access for existing users. (FR-010, FR-011, FR-021, FR-037)

### Edge Cases

- An unavailable ad consumes only the current opportunity. The next opportunity is ten eligible navigations later. (A02)
- Loss of eligibility or a change in advertising choices invalidates a prepared ad. Account or Pro changes alone do not repeat current installation consent preparation. (A07, A08, A11)
- A foreground return is neither sporting navigation nor a new session by itself. (A04)
- An unreviewed file or failed backend release must not replace the currently published legal document. (A14)
- The same version string may be retained during a valid change; it is neither a timestamp nor evidence of acceptance. (A13, A15)
- An unavailable sporting source preserves still-authorized data under F02 without neutralizing an already applicable personal restriction. (A17)
- A guest may report an unloaded target; their entered address may belong to a third party and therefore proves no identity. (A20–A22)
- A person who has deleted their account can still contact the controller about retained data. (A25, A26)

## Requirements

### Functional Requirements

#### Advertising actions and frequency

- **FR-001**: Blockout MUST use interstitials only at natural transitions in sporting consultation. An eligible navigation is the deliberate opening of a club, team, pool or match page from within an active in-app journey. Count an accepted navigation once. Initial entry, foreground return, automatic routing, system notifications, external links, scrolling, refresh, filters and back navigation are outside this rule.
- **FR-002**: One count MUST cover eligible sporting navigations. Opening a live stream, account, authentication, payment, privacy, legal and support actions MUST proceed without triggering or incrementing advertising.
- **FR-003**: Every tenth eligible navigation MUST consume one opportunity. Present at most one authorized, ready interstitial at that transition and advance at dismissal. If no ad can be presented, proceed and start the next cycle at zero regardless of whether an ad was displayed.
- **FR-004**: An absent, unready or ineligible ad MUST leave the requested navigation immediate. A presentation failure MUST release the action. The provider owns presentation and dismissal controls.
- **FR-005**: A dismissal or presentation failure MUST release the still-valid destination at most once. Ads MUST NOT overlap or appear after the destination opens. A destination opening failure remains with its originating action.
- **FR-006**: The count starts at zero in each application runtime and survives backgrounding in that runtime. Pro users and accounts with unknown entitlements create no advertising opportunities. Advertising choices or availability do not change the interval.

#### Entitlements and advertising choices

- **FR-007**: RevenueCat SDK active paid or gifted state suppresses Blockout advertising, the sole Pro benefit. External video-service ads are excluded. Without SDK state for a signed-in account, show no advertising or purchase invitation. SDK-inactive state, including native cached inactive state, permits advertising only under existing consent, availability and frequency rules. F09 owns SDK integration; no Blockout entitlement clock or advertising debt. Public sporting access remains free.
- **FR-008**: Reassess advertising eligibility from current entitlements before loading or showing an ad. Loss of eligibility invalidates preparation. Account switching and delayed responses MUST NOT transfer an entitlement or release an obsolete destination. F05 and F09 own identity and rights. Public consultation remains available while entitlement evidence is unresolved.
- **FR-009**: Native advertising choices belong to the installation. Refresh them at each applicable launch. An already known Pro entitlement avoids an automatic advertising prompt. Account identifiers or Pro changes alone do not repeat an applicable consent flow during the same launch. Advertising choices and availability MUST NOT control access to Blockout content.
- **FR-010**: Blockout MUST provide ordinary access without collecting, storing, correcting or renewing an age declaration. Before enabling advertising, verify that the actual audience, applicable rules and selected provider configuration permit the age-free advertising flow. Availability on a store must be assessed separately from the declared target audience.
- **FR-011**: New store distribution MUST target the 27 European Union countries without an in-app geography gate or country collection. Existing users outside that distribution and travelers retain ordinary access and applicable Pro rights. Advertising settings MUST respect the applicable audience rules and the actual content rating.
- **FR-012**: Refusal of optional advertising processing or tracking MUST NOT affect access, Pro status or the ten-navigation interval. Providers may serve an ad under an authorized mode when available. Impression counts can vary with availability and choices.
- **FR-013**: Use the provider’s native consent flow and respect the applicable request permission and processing choices. Advertising and tracking MUST be limited to valid authorizations. Request iOS App Tracking Transparency when the intended processing requires it and respect the system outcome. The absence or failure of a provider response does not establish new consent.
- **FR-014**: Privacy information remains available without sign-in outside F12 blocking gates. Provide a visible action to open the provider’s native advertising options whenever the provider requires one, independently of Pro. A change of choices invalidates incompatible prepared ads.

#### Legal documents

- **FR-015**: Legal notices (`imprint`), the privacy policy (`privacy`) and terms of use (`terms`) MUST be viewable without sign-in, including before an action presented as acceptance of terms. Consultation MUST depend neither on Pro nor a favorable advertising choice. The sporting-document reader remains a distinct capability.
- **FR-016**: Open the public document in the platform’s integrated browser with its ordinary reading, loading, return and network-failure controls. A native opening failure MUST give brief feedback at the original link and permit a new explicit press, without a document-read request or page error in Blockout. Once opened, the browser owns network errors, reload and return. Missing content MUST be explicit, never replaced by fictional text or implicit acceptance. No Blockout document-reader screen, legal-reader API or offline copy is required.
- **FR-017**: Legal notices, privacy and terms MUST be versioned repository files published with the backend. There is no mobile editor or legal-write operation/permission. Use the existing reviewed documentary delivery process. The standalone public legal and privacy-page deletion URLs remain identifiable outside the mobile application and share backend availability. F12 global gates suppress only in-app entry points and route bypasses; delivery, migration or repair can temporarily prevent reading without requiring independent hosting.
- **FR-018**: Published legal files MUST contain nonempty title, free-form version and content, with a truthful modification date. Validate the complete document before publication. A failed release preserves the last valid deployed content, without guaranteeing uninterrupted reading while the backend is unavailable. Inspect the deployed read result after recovery before claiming publication. No mobile partial-edit command is provided.
- **FR-019**: Reading after confirmed publication MUST return the published title, version and content together. The version MUST remain a free-form label, distinct from the actual last-modification date. No lexical comparison, mandatory increment or new version value is required to authorize a valid change.
- **FR-020**: Updating a document MUST NOT create viewable history, an acceptance register or new mandatory acceptance on every change. The privacy policy MUST inform about processing without being presented as blanket consent to optional processing. Applicable specific consent remains distinct from reading documents and accepting terms.

#### Purposes, minimization and shared restrictions

- **FR-021**: Every category of personal data used MUST have an identified purpose, only the data needed for that purpose, authorized recipients and explainable retention and rights-exercise conditions. The category matrix below constitutes the shared scope; it does not require collecting every field found in V1. No advertising profiling from accounts, follows, reports, sporting contacts or contributions is authorized.
- **FR-022**: Available, authorized club contacts and referee names MUST remain usable for sporting information and contact intended by F02. Publication by a source does not authorize unlimited reuse. Referees remain associated with matches, without creating a standalone directory or personal profile.
- **FR-023**: Applicable corrections and removals of club contact fields MUST reach active values and views without retaining old personal values as history. A restriction on a particular club contact field removes both its source and manual values and remains effective across later collection, manual editing and return to source. F02 sporting identities and history remain distinct; a source outage preserves only still-authorized values.
- **FR-024**: The dedicated no-republication mechanism MUST be limited to restricted club contact fields, applied through an authorized manual operation without a new administration journey. Collection, reactivation and reconstruction MUST NOT persist or expose the restricted field again even if a source still publishes it. Do not indiscriminately remove the club, teams or matches. No generic person-matching or referee-removal subsystem is required; applicable requests outside club contacts still receive manual handling under FR-035–FR-036, without claiming automatic coverage.
- **FR-025**: Restorations MUST apply current restrictions, erasures, domain-specific retention periods and rights before any access, under F13 FR-027. If compliance cannot be established, affected data remains unavailable. Backups MUST remain protected and never provide another means of viewing erased data. For notifications, F07 FR-045 requires removal of expired or known-purged entries and preservation of available non-personal match-level announcement facts. If those facts were lost, an exceptional repeat announcement is accepted; that limit never waives personal erasure or expiry obligations.
- **FR-026**: No infrastructure backup or log-storage duration is selected. A retained copy MUST NOT establish the default retention period for active data, support requests or logs. Each domain’s retention remains tied to its purpose and applicable obligations. F07 explicitly owns exclusion from consultation and counts at 29 elapsed days, daily physical notification purge between 29 and 30 elapsed days, non-personal match-level announcement facts and protected copies under FR-019/FR-043–FR-046; this establishes neither support-request purging nor a shared log duration. Applicable individual erasure requests remain possible in controlled destinations and are not delayed by notification retention.
- **FR-027**: Technical diagnostics MUST exclude secrets, tokens, personal content, attachments and raw provider payloads. The sole scoped exception permits the original business account ID, relevant Auth0/RevenueCat target references and minimum original-target verification evidence needed for F05 manual cleanup in private operator logs. Do not include email, profile data or photos. Public artifacts and secondary signals contain no personal target references. Existing private handling retains only still-needed references until resolution or another applicable obligation, without a new registry or selected log-storage duration. Other diagnostics use non-personal scope, time, outcomes and safe reasons. A retained copy or ticket history never authorizes unnecessary diagnostic retention.

#### Support privacy and agreement with F10

- **FR-028**: F10 MUST allow reports without an account, before sign-in and after authentication failure. An email address MUST be mandatory for every report, prefilled when available and editable before sending. This collection serves request handling and response, not marketing or advertising personalization. F12 global maintenance, unavailable-access and mandatory-update gates suppress in-app support/legal entries and direct-route bypasses. Outside these gates, guests and people with failed sign-in retain ordinary access. This does not remove the standalone public privacy/deletion page or its no-account contact obligations.
- **FR-029**: The reply address MUST be checked for format without guaranteeing deliverability or adding an ownership-verification journey. An address, name or identifier declared by the client MUST NOT constitute evidence of account ownership or authorize linking, recovery, erasure or entitlement transfer. Evidence rules belong to F05/F09 and FR-035.
- **FR-030**: The report MUST automatically include available reliable context: screen, problematic action, type and identifier of the targeted resource even if loading fails, application version, system and device model useful for diagnosis. Unknown names remain absent. For failed sign-in, method, step and safe reason or diagnostic reference may be included; password, token, payment evidence and raw provider content are excluded from automatic context.
- **FR-031**: Ticket personal data, chosen screenshots and linked files MUST be accessible only to personnel authorized to handle them. Submission must not require a screenshot or raw log; users must be able to inspect chosen attachments before submission. Neither publication in a public space nor automatic copying of personal content to a secondary notification is authorized. Access to the file bytes MUST remain restricted, including after a partial upload.
- **FR-032**: GitHub MUST remain the handling tool and ticket history selected by the operator; replies use the supplied email address. No integrated dialogue or resolution tracking in the application is added. F10 owns the private GitHub-native storage and generic private Discord signal, without personal content in the signal or an independent Blockout support backup.
- **FR-033**: F10 MUST accept a request only when its content and every selected image are transmitted and attached to the same authorized record. No intermediate or incomplete receipt is success. After response loss, preserve input and permit explicit retry with ordinary feedback and the F10 accepted rare-duplicate/manual-closure limit, without mobile receipt lookup or automatic resend. No dedicated recovery system, indefinite form lock, partial-delivery or post-confirmation editing journey is added. Secondary-alert failure MUST NOT invalidate complete receipt or require resubmission.
- **FR-034**: GitHub issues MUST be allowed to remain working history, without adding periodic purging or an automatic post-closure deadline. GitHub hosting MUST NOT be presented as validation of unlimited personal-data retention. The controller MUST handle requests about retained support data under FR-035 and FR-036.

#### Rights and information

- **FR-035**: The privacy policy MUST publish an operational email contact and rights-exercise procedures, accessible without sign-in. Handling is manual. Identity verification MUST be proportionate to the data and request; systematic identity documents or treating a report’s entered address as sufficient evidence are excluded. No new request form is required.
- **FR-036**: Request handling MUST identify affected data, active copies and recipients, apply relevant rights and communicate the outcome or reason for a limitation within applicable legal deadlines. An authorized extension must be explained under applicable conditions; it is not a silent extension. Successful and still-pending operations remain distinct. F05 owns the account-deletion journey and provider lifecycle; F09 owns paid-entitlement evidence and decisions. A data request constitutes neither a refund nor identity transfer.
- **FR-037**: Before publication, supplied information MUST match actual processing: controller and contact, applicable purposes and bases, relevant recipients and transfers, retention durations or criteria, rights and optional authorizations. Store audience/distribution declarations and provider settings MUST match FR-010–FR-014, including existing-user continuity. Starter text, this document or a writing checklist MUST NOT be presented as a compliance certification.

### Key Entities

- **Eligible action**: Accepted voluntary sporting transition; belongs to the shared count without creating individual cross-device history.
- **Advertising state**: Distinct combination of Pro entitlements, applicable authorizations, preparation and ad availability. A count at the threshold replaces none of these checks.

- **Privacy choice**: Decision applicable to processing and its conditions; distinct from reading a document, system permission and Pro entitlement.
- **Legal document**: Stable type, title, free-form version, current content and actual modification date. Contains no acceptance register.
- **Sporting personal data**: Field useful for sporting context, subject to applicable restrictions independently of sporting identity retention.
- **Support record**: Transmitted content, reliable context, reply address, chosen attachments and acceptance outcome. Its declarations are not an authenticated identity.
- **Data-related request**: Data subject’s request, scope, proportionate verification, outcome and necessary recipient follow-up. Does not create a request-management product.

### Categories, purposes and responsibilities

| Category                                 | Purpose and necessary data                                                                                                                                                                    | Recipients and restrictions                                                                                                                                                         | Lifecycle owner                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and profile                     | Sign-in, session and profile; identifiers and contact details needed for the accepted journey.                                                                                                | Data subject, authorized operators and necessary identity providers; no linking from a merely declared email.                                                                       | F05; F11 restrictions and rights.                                                                                                      |
| Pro entitlements                         | Establish and restore paid or manual entitlements with authorized evidence.                                                                                                                   | Data subject, authorized personnel and necessary providers; no payment evidence in public diagnostics.                                                                              | F09, with F05 session isolation.                                                                                                       |
| Follows and notifications                | Personal selections and eligible event announcements; necessary account and match associations and destinations, with non-personal match facts preventing ordinary repeats after inbox purge. | Account holder and providers needed for delivery; no advertising profiling or viewable anti-duplicate archive.                                                                      | F06/F07; F07 FR-019/FR-043–FR-046 govern content, markers, local cleanup and protected copies. F05 account erasure remains applicable. |
| Live-stream contributions and moderation | Attribution and moderation of live-stream contributions and reports.                                                                                                                          | Public for publishable sporting elements only; reporter identity and moderation evidence limited to authorized recipients.                                                          | F08, F11 shared rights; account erasure removes report authors and reasons, preserving counted facts and decisions.                    |
| Sporting contacts and referees           | Useful club contact details and referees associated with matches, according to authorized data.                                                                                               | Sporting-resource readers for authorized fields; no standalone personal directory or archive of old contact details.                                                                | F01 acquisition, F02 identity and presentation; FR-022–FR-024.                                                                         |
| Phone location and permissions           | User-requested function, such as location for the map or a chosen report attachment.                                                                                                          | Only recipients needed for that function; no advertising reuse or automatic collection of the rest of the photo library.                                                            | F03/F10 for journeys, F11 for purpose and minimization; no location history added.                                                     |
| Advertising and choices                  | Interstitial display and provider-owned privacy choices under applicable permissions.                                                                                                         | Disclosed advertising providers. No age collection or advertising profiling from other categories.                                                                                  | F11 with F09 for Pro eligibility.                                                                                                      |
| Support and attachments                  | Understand and respond to the request; email, voluntary content and necessary reliable context.                                                                                               | Authorized personnel and private GitHub-native storage; personal data outside public spaces and secondary notifications.                                                            | F10 for the record; FR-028–FR-034 for shared constraints.                                                                              |
| Diagnostics and backups                  | Operate and restore only necessary data.                                                                                                                                                      | Authorized operator; no personal diagnostic content except the bounded F05 cleanup references in FR-027; protected backups remain subject to restrictions before return to service. | F13; no backup deadline transferred to active data or logs.                                                                            |

## Success Criteria

### Measurable Outcomes

- **SC-001**: A01–A04 show no more than one interstitial opportunity in each group of ten eligible navigations. Missed or failed ads leave the next nine eligible navigations ad-free and excluded actions do not affect the count. (FR-001–FR-006)
- **SC-002**: In A02–A03, dismissal and presentation failure release a still-valid destination once. An unavailable ad does not delay navigation and no ad appears after the destination opens. (FR-004, FR-005)
- **SC-003**: A05–A08 show zero advertising for valid Pro or unknown signed-in entitlements, no entitlement transfer between accounts and uninterrupted access to sport. Account or Pro changes alone do not repeat the installation’s completed consent flow. (FR-007–FR-009)
- **SC-004**: A09–A11 show ordinary access without age collection, changes and refusals applied through provider controls, and access maintained if consent or advertising is unavailable. (FR-010–FR-014)
- **SC-005**: A12–A15 cover public reading of all three versioned document types and backend publication, with no mobile editor/write operation. Native opening failure permits another explicit link press; subsequent reading/network/reload/return stays with the browser. Title, version and content remain consistent; a free-form version is not a computed date. (FR-015–FR-020)
- **SC-006**: For A16–A19, restricted club contact values remain absent through collection, manual edits, reactivation, reconstruction and restoration; an independent sporting identity is not removed solely for a personal field. Other individual requests follow the manual rights process rather than an assumed generic suppression mechanism. (FR-021–FR-027)
- **SC-007**: Every accepted A20–A24 report has a validly formatted reply address; all known targets remain identifiable despite loading failure. No secret or public access to personal attachments is allowed. No complete confirmation lacks a selected image; intermediate states never count as acceptance and uncertain outcomes permit ordinary explicit retry with rare exceptional duplicates handled manually under F10, and secondary-alert failure does not invalidate the complete record. No new periodic purge is required. (FR-028–FR-034)
- **SC-008**: A25–A27 cover accounts, sporting contacts and support records; every request has a contact accessible without an account and an outcome or reason within the applicable deadline, without claiming completion of still-pending operations. Every matrix category has an identified purpose, recipients and functional owner. (FR-035–FR-037)

## Assumptions

- Sporting access does not depend on an age declaration. Target-audience declarations and age-free advertising are verified before activation. EU27 distribution and retention of existing users’ access remain separate publication checks.
- The count is local to the application session. Its lack of cross-device persistence is a simplicity choice, not a guarantee of global frequency per person. Entitlements and choices remain checked on every presentation.
- GitHub is the selected support process, without a new issue-purge schedule. This does not waive handling applicable requests or honestly documenting retention conditions; no claim of compliance for unlimited retention is made.
- Matrix categories delimit authorized processing; they select neither new fields, additional providers nor a technical schema. Operational durations and parameters not set by a domain are not inferred from backups or tickets.
- Content, errors and journeys follow F13 for French language, accessibility, platforms, session isolation and understanding of uncertain outcomes. Privacy forms and legal documents retain their existing accessibility semantics and remain usable with enlarged text and ordinary form keyboard/focus within [F13 FR-030’s qualification scope](../003-shared-quality/spec.md#platforms-accessibility-and-bounded-continuity); their layout belongs to the global Figma review.
- The rights contact and legal notices must be real before publication; no fictional address or legal identity is supplied here. Legal deadlines remain distinct from a technical on-call deadline or a response deadline promised for every ticket.
- [F10](../012-reports-feature-suggestions/spec.md) defines the shared problem/suggestion form, optional subject, images and complete submission with safe retry. F05/F09 retain deletion, evidence and subscription decisions.
- Design prerequisites follow the [constitution](../../.specify/memory/constitution.md). Existing approvals apply only to their recorded scope; specification acceptance is not runtime qualification.

## Evidence and traceability

### V1 sources

The [transition owner](../014-v1-v2-transition/spec.md#v1-evidence) retains continuity and the limits of the historical functional reference. Current requirements govern the shared advertising threshold, entitlement uncertainty, native privacy choices, public legal reading and private rights handling; historical code is neither a compliance decision nor evidence of production settings. [F05](../005-accounts-identity/spec.md#v1-evidence-and-limitations) and [F09](../006-pro-subscriptions/spec.md#v1-evidence-and-limitations) retain their identity/payment continuity limits. Qualification follows [quickstart.md](quickstart.md), without inferred provider consent or entitlement status.

### External references and limitations

- Google distinguishes [ad-serving modes](https://developers.google.com/admob/ios/privacy/ad-serving-modes): nonpersonalized mode may still use identifiers for some functions. [Limited ads](https://support.google.com/admob/answer/10105530) allow nonpersonalized ads under their conditions without guaranteeing availability. FR-011–FR-013 therefore equate neither refusal with Pro nor absence of personalization with absence of all processing.
- [Apple’s privacy documentation](https://developer.apple.com/app-store/user-privacy-and-data-use/) governs tracking covered by ATT. System permission and information or consent obligations remain distinct.
- [Google Play’s audience guidance](https://support.google.com/googleplay/android-developer/answer/9867159) distinguishes target audience from content rating and requires age screening in applicable mixed-audience cases. [CNIL guidance](https://www.cnil.fr/fr/les-bases-legales/consentement) describes conditions for a minor to consent on their own to processing. Confirm the requirements for the actual audience and serving configuration before publication.
- CNIL recommendations on [reuse of published data](https://www.cnil.fr/fr/recommandations-reutilisateurs-donnees-internet) justify not inferring unlimited authorization from a public source. FR-022–FR-024 preserve authorized sporting uses and applicable rights.
- CNIL describes [responding to access requests](https://www.cnil.fr/fr/repondre-une-demande-de-droit-dacces), normally within one month with regulated extensions and proportionate identity checks. FR-035–FR-036 refer to applicable deadlines without promising continuous human availability.

These references underpin distinctions useful to the specification; they certify neither advertising settings nor production processing. Qualification must examine the rules and settings applicable at that time.

### Cross-perimeter dependencies

| Owner                                                                                                                              | Shared rule or F11 input                                                                                                                                                           | Responsibility limit                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [F01](../001-source-acquisition/spec.md) and [F02](../002-sporting-data/spec.md)                                                   | FR-022–FR-024: authorized contacts and referees, correction, restriction and no republication. F02 FR-024/FR-049 and its identity rules remain applicable.                         | No new source, systematic erasure of sporting history or bypass of current visibility restrictions.                                                              |
| [F03](../007-sporting-consultation/spec.md), [F04](../008-search-discovery/spec.md), [F06](../009-following-personal-feed/spec.md) | FR-001–FR-006: shared eligible transitions; FR-021: purpose and minimization.                                                                                                      | Owners retain consultation, search and following journeys.                                                                                                       |
| [F05](../005-accounts-identity/spec.md) and [F09](../006-pro-subscriptions/spec.md)                                                | FR-007–FR-009, FR-029, FR-035–FR-036: isolation, unknown entitlements, evidence and exercise of rights.                                                                            | Deletion, identity, providers and entitlement validity remain in their scopes; the support address is not evidence.                                              |
| [F07](../011-notifications-delivery/spec.md) and [F08](../010-live-contributions-moderation/spec.md)                               | FR-021, FR-025–FR-027: authorized recipients, minimization, bounded retention, post-restoration restrictions and safe diagnostics.                                                 | F07 owns notification retention and anti-duplicate facts without delaying account erasure; F08 moderation remains distinct from F10 support.                     |
| [F10](../012-reports-feature-suggestions/spec.md)                                                                                  | FR-028–FR-034 and A20–A24: guest access, email contact, target on error, safe context, privacy, GitHub, complete submission and independent alert.                                 | F10 FR-001–FR-031, A01–A28: forms, suggestions, images and retries without post-confirmation editing or new integrated dialogue.                                 |
| [F12](../013-administration-app-configuration/spec.md)                                                                             | FR-017–FR-018, FR-031, FR-035: authorized actions and purpose-based data access.                                                                                                   | F12 assigns permissions; F11 owns versioned legal content and public reading.                                                                                    |
| [F13](../003-shared-quality/spec.md) and [F14](../014-v1-v2-transition/spec.md)                                                    | FR-025–FR-027: restrictions before restoration, privacy and retention limits; F13 shared accessibility and error rules.                                                            | No new backup duration, on-call guarantee or authorized loss of identity/entitlements.                                                                           |
| [Corpus consistency](../../.specify/memory/constitution.md) and [Design review](../../AGENTS.md#design-inputs)                     | Global review of responsibilities then journeys and states: advertising choices, document reading and file-based publication, support before sign-in and on error, rights contact. | Material visual changes follow the constitution’s scoped prototype and Figma approvals; documentary consistency establishes no native or provider qualification. |
