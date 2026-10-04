# Functional specification: reports and improvement suggestions

**Branch**: `feature/268-reports-feature-suggestions`

**Created**: 2026-09-22

**Status**: Accepted functional baseline under [planning authority #9](https://github.com/blockoutproject/blockout/issues/9); technical-dossier acceptance and implementation evidence remain separate.

**Requested scope**: F10, [#268](https://github.com/blockoutproject/blockout-legacy/issues/268), Reports and suggestions in the [specification navigation](../../README.md#specifications). Enable a signed-in person or guest to send a complete, private request to support, without in-app conversation or resolution tracking.

The actors are the person preparing a request and the staff authorized to handle it. Complete sending means that the content and all selected images are transmitted and attached to the same case accessible to authorized staff. Intermediate ticket creation does not constitute complete acceptance. V1 technical choices are historical evidence, not the V2 architecture.

## Clarifications — approved KISS revision, 2026-10-06

- Q: Does simpler support remove images or change storage? → A: No. Category, text and every selected image create the private GitHub issue with native attachments. Confirm only complete receipt; reconcile uncertain outcomes and handle rare exceptional duplicates manually. No new support portal, post-confirmation editor or S3 relocation is selected.

## Clarifications

### Session 2026-10-05

- Q: Must exceptional provider/network failures guarantee exactly one final GitHub issue? → A: No. Prevent ordinary double submissions, but accept a rare duplicate private issue and close it manually. Complete content/attachments, confidentiality and honest status remain required; no dedicated recovery system is needed.

## User scenarios and validation

### Journey 1 — Explain a problem or an improvement (Priority: P1)

The person uses a shared form, accessible even when sign-in or loading a detail sheet fails.

**Priority rationale**: Support must remain usable precisely when another journey does not work.

**Independent validation**: Describe a guest request and a signed-in person’s request, their mandatory fields and their context despite a loading failure.

1. **A01** — **Given** a guest or signed-in person, **when** they access support, **then** the same form allows a problem or suggestion; a sign-in or loading failure does not remove the relevant entry point. F12 maintenance and mandatory updates preserve this support access. (FR-001, FR-002)
2. **A02** — **Given** a chosen request type, **when** the person prepares a request, **then** the subject may remain absent; a context-based suggestion remains editable. A logo problem belongs to sporting data. (FR-002, FR-003)
3. **A03** — **Given** a problem or suggestion, **when** the title or description is missing or contains only whitespace, **then** sending is refused with an explanation without losing the other fields. A suggestion uses the same form with guidance adapted to the need and desired improvement. (FR-004, FR-017)
4. **A04** — **Given** a known or absent address, **when** the person prepares to send, **then** they can change the prefilled address; an absent or invalidly formatted address prevents sending, without ownership verification or a deliverability promise. (FR-005)
5. **A05** — **Given** an inaccessible match detail sheet but a known navigation target, **when** the request is prepared, **then** the target type and identifier are attached with reliable context; no unknown name is invented. (FR-006)
6. **A06** — **Given** a failed sign-in, **when** context is attached, **then** the method, stage and safe reason or useful reference may be transmitted; no password, token, payment proof, raw log or raw provider content is attached automatically. (FR-006, FR-007)
7. **A07** — **Given** an account or Pro recovery request, **when** the declared address and identifiers are received, **then** they support handling without establishing ownership; decisions remain subject to F05/F09 evidence. (FR-008, FR-028)

### Journey 2 — Prepare images and retain input (Priority: P1)

The person can illustrate their request without a mandatory screenshot and without losing their text during preparation difficulties.

**Priority rationale**: An optional attachment must not make the form unusable or expose the rest of the photo library.

**Independent validation**: Compare requests without images, with five admissible images and with a rejected image, then temporary navigation away and back and abandonment.

1. **A08** — **Given** a valid form without images, **when** sending is requested, **then** no screenshot is required. Up to five admissible images can be reviewed and removed before sending. (FR-009, FR-011)
2. **A09** — **Given** five selected images, **when** a sixth is added, **then** the limit is explained and the existing selection and text remain available. (FR-009, FR-012)
3. **A10** — **Given** an image prepared as PNG or JPEG, **when** its size is 5 MiB, **then** it meets the limit; above this, or if the format is rejected, it is not accepted and the text remains available. (FR-010, FR-012)
4. **A11** — **Given** a chosen photo, **when** preparation fails or photo access is denied, **then** an explanation allows the selection to be corrected without mandatory manual conversion or text loss. A selected image in error is not silently omitted when sending. (FR-010–FR-012, FR-018)
5. **A12** — **Given** a populated form, **when** the person temporarily navigates away and back or encounters a failure, **then** input remains available during the journey. Voluntary closing requests confirmation of abandonment; no restoration after restart is promised. (FR-013, FR-014)
6. **A13** — **Given** a request prepared for an account, **when** the account changes, **then** its input is not exposed to the new account and no retry reassigns the request. (FR-015)

### Journey 3 — Send a complete request once (Priority: P1)

The person receives either complete confirmation or an actionable failure or uncertain state, without a partial-delivery journey.

**Priority rationale**: The chosen content and images must reach processing together, with ordinary duplicate prevention and manually resolved exceptional duplicates.

**Independent validation**: Walk through failures before and after intermediate creation, a lost response and complete success with a failed secondary alert.

1. **A14** — **Given** valid content and admissible images, **when** the content and all images are transmitted and attached to the same authorized case, **then** a single complete confirmation is shown, indicating that any exchanges use the supplied email address. (FR-016, FR-018, FR-024)
2. **A15** — **Given** a submission with an image that cannot be transmitted, **when** failure is confirmed, **then** no completed submission is announced; the form remains available for correction or retry. No option to finish with missing images is offered. (FR-017–FR-019)
3. **A16** — **Given** an intermediate private issue and an attachment failure, **when** processing is corrected or retried, **then** the incomplete issue is not represented as final and files remain authorized/private. Manual cleanup or closure is acceptable, including an exceptional duplicate under FR-021. (FR-018, FR-021, FR-026)
4. **A17** — **Given** a lost response, **when** the submission is checked or retried, **then** known complete acceptance can be reported, otherwise uncertainty stays explicit. A rare duplicate caused by the incident may be closed manually; automatic result recovery is not guaranteed. (FR-016, FR-020, FR-021)
5. **A18** — **Given** an ordinary double tap or concurrent retry of the same submission, **when** processing succeeds, **then** only one final issue is intentionally created and changed form values do not silently alter an unresolved submission. Exceptional failure duplicates follow FR-021. (FR-021, FR-022)
6. **A19** — **Given** a pending or uncertain submission, **when** the form closes or the app restarts, **then** this does not prove cancellation or failure. No automatic draft or result recovery is guaranteed; avoid deliberate resubmission of a known accepted request and handle exceptional duplicates manually. (FR-014, FR-020–FR-023)
7. **A20** — **Given** a completely received request, **when** a secondary alert fails, **then** the request remains accepted; the alert failure is identifiable for operations without requiring a new submission. (FR-025)
8. **A21** — **Given** complete confirmation, **when** the person notices a forgotten image, **then** no journey for editing or adding to the ticket is offered in the application. Any additional exchanges use email. (FR-024, FR-027)
9. **A22** — **Given** no network, **when** the person attempts to send, **then** neither success nor guaranteed deferred sending is announced; input remains available during the journey. If transmission may already have occurred, the result remains uncertain until established. (FR-013, FR-020, FR-030)

### Journey 4 — Handle the request within its authorized process (Priority: P1)

Staff have a complete, private case in GitHub, subject to the limits of their role and other domains.

**Priority rationale**: Handling must expose no data or grant any right solely on the basis of a declaration.

**Independent validation**: Examine the recipients of the case, files and alerts, as well as requests concerning moderation, accounts and Pro.

1. **A23** — **Given** a ticket and its files, **when** a staff member views them, **then** access is restricted to people authorized for this purpose, including for separate files. No personal content appears in a public space or secondary notification. (FR-025, FR-026)
2. **A24** — **Given** a received problem or suggestion, **when** the operator handles it, **then** GitHub remains their tool and history; any replies use email. No guaranteed deadline, promised implementation, in-app messaging or in-app resolution tracking is inferred. (FR-027)
3. **A25** — **Given** a problem concerning a stream link, **when** it is sent to support, **then** no F08 report is counted and no link is hidden by this submission; the moderation journey remains separate. If the match is hidden, neither the case nor its confirmation re-exposes it in the application. (FR-028)
4. **A26** — **Given** a staff member authorized to access the case, **when** they handle a Pro request or sporting correction, **then** this access does not grant F09 or F02 permissions. A request does not automatically correct sporting data or merge accounts. (FR-008, FR-028)
5. **A27** — **Given** a deleted account or an applicable individual request, **when** support data is examined, **then** F11 applies to the ticket and files, without inferring their erasure from account erasure or imposing periodic purge or unlimited retention. (FR-029)
6. **A28** — **Given** form, refusal, waiting, uncertainty and confirmation states, **when** they are defined, **then** they apply F13 French language, accessibility, understandable errors and offline limits; R02 owns their overall visual design. (FR-030, FR-031)

### Edge cases

- An absent subject is not an error; a missing required type, title, description or email address prevents sending.
- Explicitly removing an image before a new attempt after confirmed failure differs from silently omitting it or modifying an accepted ticket.
- Intermediate creation, complete acceptance and sending the operator alert are three distinct facts.
- The absence of a persistent draft does not remove the obligation to resolve the effects of an already transmitted operation.
- A support request does not make a hidden sporting resource viewable or open access to other people’s personal data.

## Requirements

### Functional requirements

#### Access, request type and context

- **FR-001**: Support MUST be accessible to guests and signed-in users, before sign-in and after authentication or loading failure; the relevant entry point does not depend on the problematic journey succeeding. F12 global maintenance and version restrictions preserve this access; they do not waive complete-receipt requirements.
- **FR-002**: The shared form MUST require a type: “Report a problem” or “Suggest an improvement”. Both follow the same contact, privacy, attachment and delivery rules.
- **FR-003**: The subject MUST be optional, suggested only from reliable context and editable: application behavior, sporting data, account and sign-in, Pro subscription, stream links, other. Logos belong to sporting data; absence of classification MUST NOT block sending.
- **FR-004**: Title and description MUST be mandatory and not consist solely of whitespace. Guidance MUST invite a description of the problem or need and desired improvement, without additional mandatory fields for suggestions.
- **FR-005**: Every request MUST include an editable reply email address, prefilled if available. Its format MUST be checked without verifying possession or guaranteeing deliverability. Its purpose remains handling and replying, in accordance with F11.
- **FR-006**: Available reliable context MUST be attached automatically: screen, action, type and identifier of the navigation target even if inaccessible, application version, useful operating-system and model information. Unknown data remains absent. A sign-in failure may include the method, stage and safe reason or useful reference.
- **FR-007**: Automatic context MUST NOT contain any password, token, payment proof, raw log or raw provider content. Voluntarily chosen attachments remain subject to F11 minimization.
- **FR-008**: A declared address, name or identifier MUST NOT prove ownership of an account or purchase. Support applies F05/F09; case access authorizes no linking, merging, deletion or granting of rights through a mere declaration.

#### Images and input

- **FR-009**: Images MUST be optional and limited to five per request. No screenshot or collection of the rest of the photo library is required.
- **FR-010**: Accepted images MUST be PNG or JPEG and no larger than 5 MiB each after preparation, meaning 5 × 1 024 × 1 024 bytes. Preparing the chosen photos MUST avoid mandatory manual conversion; no tool, dimensions or compression rate is prescribed here.
- **FR-011**: The person MUST be able to review and remove chosen images before sending.
- **FR-012**: Exceeded limits, rejected formats, denied permissions or failed preparation MUST be explained without losing text or other valid attachments. A selected but unready attachment MUST be corrected or explicitly removed before sending.
- **FR-013**: Input MUST remain available during the journey after failure or temporary navigation away and back. This rule does not create a persistent draft after restart.
- **FR-014**: Voluntary closing of a populated form MUST request confirmation of abandonment. Abandoning input MUST NOT be equated with cancelling an already transmitted operation.
- **FR-015**: Account changes MUST apply F05 isolation: no exposure of previous input or silent reassignment of the request or its retries to the new account.

#### Complete sending and retries

- **FR-016**: Sending MUST distinguish validation refusal, an operation in progress, confirmed failure, an uncertain outcome and complete acceptance; no intermediate state constitutes success confirmation.
- **FR-017**: Validation refusal or confirmed failure MUST explain the problem and preserve the form during the current journey for correction or a new attempt. Prevent ordinary duplicate submissions; the exceptional provider-failure limit in FR-021 applies.
- **FR-018**: Acceptance MUST cover the content and all selected images, transmitted and attached to the same case accessible to authorized staff. No selected image may be silently omitted; no incomplete case may be treated as a finalized request.
- **FR-019**: The application MUST NOT offer to finish a submission with selected images that have not been transmitted. After confirmed failure, the person may correct their selection before retrying; this is not editing an accepted ticket.
- **FR-020**: An uncertain result MUST remain explicit rather than being called success, failure or cancellation. Use available submission/provider state or authorized manual checking to resolve it. If complete acceptance is known, return that result without deliberate resubmission. No guaranteed automatic recovery of every lost response is required; exceptional duplicates follow FR-021.
- **FR-021**: Prevent ordinary double taps and concurrent retries from deliberately creating duplicate submissions. An exceptional provider/network failure may leave a duplicate private GitHub issue; authorized manual closure is acceptable. Incomplete issues and isolated files remain private and MUST NOT be presented or processed as fully accepted. No dedicated reconciliation or crash-recovery system is required to guarantee exactly one external issue.
- **FR-022**: Input changes MUST NOT silently alter an operation still in progress or uncertain; its outcome must be established before a new corrected submission that could duplicate it.
- **FR-023**: Closing or restarting MUST NOT prove cancellation of a transmitted submission. The absence of draft restoration authorizes neither false failure nor duplication of an already accepted submission.
- **FR-024**: After complete acceptance, an understandable confirmation MUST indicate that any exchanges use the supplied email address. The application MUST NOT offer ticket editing or adding a forgotten image after confirmation.
- **FR-025**: A secondary operator alert MUST remain independent of complete acceptance. Its failure must be identifiable for operations without invalidating the case or requiring a new submission. It MUST NOT contain any copy of personal content, in accordance with F11; no notification mechanism is selected.

#### Handling and responsibilities

- **FR-026**: The ticket, contact details and all attachments, even if stored separately, MUST remain accessible only to staff authorized for this purpose. A public space or file URL without access control does not satisfy this requirement; intermediate errors retain these protections.
- **FR-027**: GitHub MUST remain the private handling tool and operator history; any replies use the supplied email address. No in-app dialogue, in-app resolution tracking, automatic email acknowledgement, guaranteed response time or promise to implement a suggestion is added.
- **FR-028**: F10 MUST remain distinct from F08 moderation reporting: a support ticket does not count toward its thresholds or hide any link. Sporting, identity and Pro interventions remain subject to F02/F05/F09 decisions and permissions; the case does not bypass F02/F03 sporting visibility. F12 assigns permissions without implicit general moderator authorization.
- **FR-029**: F11 MUST govern purposes, minimization, applicable erasure requests and retention of the ticket and files. Account deletion does not prove erasure of these copies; no periodic purge, post-closure deadline or unlimited retention is added.
- **FR-030**: The form and its states MUST apply F13: French language, accessibility, understandable errors, safe diagnostics and offline limits. Lack of network means neither success nor a commitment to deferred sending; no new offline action queue is required.
- **FR-031**: R02 MUST cover the guided form, image selection and review, refusals, abandonment, sending in progress, uncertainty and confirmation as a whole. F10 declares no screen approved and does not impose the presentation of a third-party application.

### Functional entities

- **Request**: type, optional subject, title, description, reply email address and reliable context; it does not constitute identity evidence.
- **Image selection**: at most five optional, reviewable attachments, ready or in error before submission.
- **Submission operation**: submitted content and outcome to establish; retrying it differs from a new request and from editing after acceptance.
- **Accepted case**: content and all images attached, usable only within the authorized process.
- **Secondary alert**: an operational signal, independent of complete receipt and without unauthorized duplication of personal content.

## Success criteria

- **SC-001**: A01–A07 allow both request types without an account, mandatory classification or invented data. All accepted cases have a valid title, description and email address; no contact declaration constitutes identity evidence.
- **SC-002**: A08–A13 respect five images and 5 MiB per image, without a mandatory screenshot or text loss after refusal. No account change exposes or reassigns previous input.
- **SC-003**: A14–A19 and A22 produce no false complete confirmation with a missing selected image and no false result after response loss. Ordinary duplicate submissions are prevented; rare incident-related duplicate private issues can be closed manually. Intermediate effects never make an incomplete issue a finalized request.
- **SC-004**: A20–A21 fully distinguish the received request from the secondary alert; no alert failure requires a new submission, and no editing journey after confirmation is required.
- **SC-005**: A23–A27 expose zero personal content to an unauthorized destination and grant no F02/F05/F08/F09 power solely on the basis of the ticket. Erasure obligations cover the relevant copies according to F11.
- **SC-006**: A28 defines accessible states and R02 needs without presenting writing quality as implementation, provider qualification or approved design.

## Assumptions and limits

- GitHub is an accepted operator choice; storage, secondary notifications, architecture and retry mechanisms remain to be determined from V2 requirements. Complete-sending guarantees will need qualification before service launch, not inference from a local transaction.
- No response SLA, public voting, suggestion catalog, in-app ticket status or F07 support notification is added. The operator handles requests case by case within their authorized process.
- Input retention concerns the current journey; obligations concerning the effects of a transmitted submission persist independently of the draft. Safe retry does not require exposing a ticket history.
- General quality and abuse-protection limits remain those of F13; no additional product quota, mandatory authentication or new email-verification journey is introduced.
- R01, R02 and global acceptance under #247 precede technical planning. This delivery describes expected outcomes, without an API, schema, migration or production-availability qualification.

## V1 evidence

| Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Observation and limit                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Form](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/report/forms/report-form.tsx) and [tests](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/report/forms/__tests__/report-form.test.tsx)                                                                                                                  | Display, data, logo, live and other categories; title and description required; device context and declared identity; photos prepared as JPEG, width 1280. No suggestion journey or evidence of V2 delivery guarantees.               |
| [Orchestration](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/reports-service/src/main/java/com/blockout/reports/report/application/ReportApplicationService.java)                                                                                                                                                                                                                                                 | PNG/JPEG images, a limit of 5 × 1024 × 1024 bytes, upload before ticket creation, then attachment; independent secondary alert. No atomicity of complete delivery is inferred from this.                                              |
| [GitHub provider](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/reports-service/src/main/java/com/blockout/reports/report/infrastructure/providers/github/GitHubIssueProvider.java)                                                                                                                                                                                                                                | The image-attachment error is logged then swallowed; a successful response may therefore fail to demonstrate their presence in the ticket. This observation does not satisfy FR-018.                                                  |
| [Composition](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/reports-service/src/main/java/com/blockout/reports/report/application/IssueDraftFactory.java) and [Discord alert](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/reports-service/src/main/java/com/blockout/reports/report/infrastructure/providers/discord/DiscordReportNotifier.java) | Categories converted to labels and context in the body; the alert includes the title, among other things. V2 must respect F11 independently of this historical content. Neither production settings nor actual access were inspected. |
| [Public contract](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/libs/shared/contracts/specs/source/services/mobile-gateway/paths/report.json) and [internal contract](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/libs/shared/contracts/specs/source/services/report/paths/reports.json)                                                                                   | Report creation; these contracts establish no conversation or user-tracking feature to preserve. They do not select the V2 contract.                                                                                                  |
| [historical source baseline](../014-v1-v2-transition/spec.md#v1-evidence) and [issue #268](https://github.com/blockoutproject/blockout-legacy/issues/268)                                                                                                                                                                                                                                                                                                                          | Historical reporting and the approved extension to suggestions. The approved plan sets the shared form, optional subject, five images, input retention during the journey and complete sending without subsequent editing.            |

## Coverage and dependencies

| Domain                                               | Requirements  | Scenarios         | Criteria       |
| ---------------------------------------------------- | ------------- | ----------------- | -------------- |
| access, fields, context, declared identity           | FR-001–FR-008 | A01–A07           | SC-001         |
| Images, input, abandonment and isolation             | FR-009–FR-015 | A08–A13, A19      | SC-002, SC-003 |
| Complete sending, uncertainty, concurrency and retry | FR-016–FR-023 | A14–A19, A22      | SC-003         |
| Confirmation and independent alert                   | FR-024–FR-025 | A14, A20–A21, A23 | SC-004, SC-005 |
| Private handling and business boundaries             | FR-026–FR-029 | A07, A16, A23–A27 | SC-005         |
| Quality and overall design                           | FR-030–FR-031 | A22, A28          | SC-006         |

| Scope                                                                                                                                                                | Responsibility                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [F02](../002-sporting-data/spec.md), [F03](../007-sporting-consultation/spec.md)                                                                                     | Sporting identity and visibility, target context and authorized interventions; no resource restoration through support.                 |
| [F05](../005-accounts-identity/spec.md), [F09](../006-pro-subscriptions/spec.md)                                                                                     | Guest access, isolation, ownership evidence, deletion and entitlement recovery; case access does not confer Pro recovery powers.        |
| [F08](../010-live-contributions-moderation/spec.md), [F07](../011-notifications-delivery/spec.md)                                                                    | Link moderation and personal inbox remain separate from support; no moderation threshold or personal support notice is created here.    |
| [F11](../004-advertising-privacy-legal/spec.md)                                                                                                                      | FR-028–FR-034, A20–A24: contact, context, privacy, GitHub, complete sending and safe retry; purposes, access and erasure remain shared. |
| [F13](../003-shared-quality/spec.md), [F12](../013-administration-app-configuration/spec.md) / [#269](https://github.com/blockoutproject/blockout-legacy/issues/269) | Quality, security and diagnostics; permission assignment according to purpose.                                                          |
| R01 / [#271](https://github.com/blockoutproject/blockout-legacy/issues/271), R02 / [#272](https://github.com/blockoutproject/blockout-legacy/issues/272)             | Cross-feature consistency followed by overall design of journeys and states; no visual approval is inferred from this spec.             |
