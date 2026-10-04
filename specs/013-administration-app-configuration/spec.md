# Functional specification: shared administration and access configuration

**Branch**: `feature/269-administration-app-configuration`

**Created**: 2026-09-23

**Status**: Accepted functional baseline under [planning authority #9](https://github.com/blockoutproject/blockout/issues/9); technical-dossier acceptance and implementation evidence remain separate.

**Requested scope**: F12, [#269](https://github.com/blockoutproject/blockout-legacy/issues/269), shared administration and access in the [specification navigation](../../README.md#specifications). Define permissions, effective maintenance, minimum versions, configuration errors and operator recovery, without redefining commands owned by other domains.

The actors are the visitor, the holder of a usable account, the operator with specific permissions and the product owner. “Owner” in privilege assignment refers to the latter, not the owner of an account or contribution. Maintenance temporarily limits ordinary access; it changes neither resource identity, business rights nor collection commands.

## Clarifications

### Session 2026-10-05

- Q: Is a dedicated owner recovery circuit outside mobile required at launch? → A: No. Remove the dedicated command, console and recovery qualification requirement. Ordinary administration, distinct permissions, version restrictions and legal/support access remain.

### Session 2026-10-09

- Q: May a failed cold-start check reuse recently verified permissive configuration? → A: No. Every cold start requires a successful complete check. Failed checks keep ordinary access closed with explicit retry, without persisted access configuration. Restrictions and revisions already observed remain protected during the current process; partial administrative reads or writes cannot establish ordinary access. Foreground and authentication returns do not create a cold start. Existing legal, support and authorized operator exceptions remain.

## User scenarios and validation

### Journey 1 — Access only authorized commands (Priority: P1)

An account receives its ordinary capabilities; an operator has only the commands entrusted to them.

**Priority rationale**: Avoid implicit privileges without requiring manual assignment for ordinary users.

**Independent validation**: Compare a guest, a usable account, an operator and the owner with different permissions.

1. **A01** — **Given** a new usable account, **when** its capabilities are established, **then** ordinary actions are available under their business conditions, including the F08 seven days; no administrative privilege is assigned. (FR-001)
2. **A02** — **Given** the owner and a delegated operator, **when** they attempt to assign or remove a privileged permission, **then** only the owner is authorized; the operator neither redistributes their rights nor grants themselves rights. (FR-002)
3. **A03** — **Given** an operator authorized to manage maintenance, **when** they attempt to change versions or bypass maintenance, **then** each action requires its distinct permission; administration access is insufficient. (FR-003, FR-004, FR-014)
4. **A04** — **Given** a link moderator or F12 manager, **when** they attempt an F01 retry, an F02 correction, an F11 edit or an F09 Pro operation, **then** domain permissions are required and Pro powers reserved for the owner remain reserved. (FR-004, FR-005)
5. **A05** — **Given** a guest, an account without permission, a revoked permission or an old session, **when** a protected action is requested, even through a direct call, **then** refusal leaves data unchanged and no implicit right results from a displayed button. (FR-005)

### Journey 2 — Prepare and publish settings without unintended effects (Priority: P1)

The operator prepares content and distinguishes saving it from activating the block.

**Priority rationale**: Limit accidental blocking and loss of input or newer decisions.

**Independent validation**: Prepare content while maintenance is inactive, activate it, correct an error and examine a concurrent save.

1. **A06** — **Given** inactive then active maintenance, **when** the message or image is saved, **then** the state remains inactive or active respectively; only explicit commands activate or deactivate the block. (FR-006)
2. **A07** — **Given** an empty or whitespace-only message, **when** content is saved or maintenance activated, **then** the operation is refused; a valid message suffices without an image. (FR-007, FR-010)
3. **A08** — **Given** a supplied optional image, **when** it is explicitly removed or becomes unavailable for display, **then** its removal takes effect without changing other settings; unavailability prevents neither the message nor retry. (FR-007, FR-008, FR-031)
4. **A09** — **Given** known maintenance and version settings, **when** only one group or field is changed, **then** the others remain unchanged; an explicitly removed value is not confused with an unchanged field. (FR-008, FR-030)
5. **A10** — **Given** configuration that has not loaded or unsaved input, **when** loading fails or a refresh arrives, **then** no default value constitutes published state and input is not silently overwritten. (FR-009, FR-010)
6. **A11** — **Given** a refusal or confirmed save failure, **when** the outcome is shown, **then** the last accepted state remains intact, with an explanation and appropriate retry. (FR-009, FR-010)
7. **A12** — **Given** a lost save response or another change accepted in the meantime, **when** the operator resumes, **then** rereading establishes the outcome; an old submission does not silently replace the new decision. (FR-009, FR-011)

### Journey 3 — Understand the block and regain access (Priority: P1)

The person receives reliable access state at launch, without periodic mobile monitoring.

**Priority rationale**: Effectively block prohibited operations while retaining a simple journey and accessible support.

**Independent validation**: Walk through cold starts, explicit retries, authentication returns, server refusals and exceptions without adding a timer.

1. **A13** — **Given** active maintenance, **when** an ordinary user launches the application or requests an operation directly, **then** blocking applies in the application and on the server; an old link does not bypass it. (FR-012, FR-015)
2. **A14** — **Given** maintenance, a mandatory update or unavailable configuration, **when** a person seeks legal information, support or operator sign-in, **then** the necessary entry points remain accessible; ordinary authentication does not lift the block. (FR-013, FR-018)
3. **A15** — **Given** an operator with bypass permission, **when** they choose to bypass maintenance, **then** they can use the application and their authorized commands without opening access for others or acquiring a new right. (FR-014)
4. **A16** — **Given** a personal operator exception, **when** the account changes or its permission is revoked, **then** it benefits neither the new account nor the operator deprived of that right; current checks continue to apply. (FR-005, FR-014)
5. **A17** — **Given** a cold start, a foreground return and then a “Retry” action, **when** settings are read, **then** only startup and explicit retry trigger this check, without periodic polling or a session timer. (FR-015, FR-017)
6. **A18** — **Given** an already open session, **when** maintenance is activated and then an ordinary operation is requested, **then** the server refuses the operation and the application applies the block; without server interaction, instant screen replacement is not promised. (FR-012, FR-016)
7. **A19** — **Given** a successful check followed by a new cold start, **when** that startup check fails, **then** ordinary access remains closed on unavailability with explicit retry, even if the previous success was recent. A successful complete retry opens access only under its current restrictions; a failed retry keeps access closed. No saved permissive configuration is restored. (FR-017, FR-018)
8. **A20** — **Given** restrictions or configuration revisions already observed during the current process, **when** a check fails or a late response arrives, **then** it cannot lift the restriction or replace a newer decision. Operator identification and authorized partial configuration reads or changes do not open ordinary access: a successful complete check is required, with no minimum-version bypass. (FR-013, FR-017, FR-018, FR-031)
9. **A21** — **Given** newly active maintenance, **when** ordinary actions arrive while a short operation has already been accepted, **then** new actions are refused and the accepted operation finishes under its domain rules; a lost response still requires an established outcome, without assumed cancellation or a general suspension mechanism. (FR-019)
10. **A22** — **Given** enabled or already paused collection, **when** maintenance is activated then deactivated, **then** collection state remains unchanged; the current cycle and resumption belong to F01, without implicit catch-up. (FR-020)

### Journey 4 — Retain notifications without sending during maintenance (Priority: P1)

Eligible events populate the personal inbox without inviting use of a blocked application through push.

**Priority rationale**: Preserve announcements and their limits without a burst of expired notices on reopening.

**Independent validation**: Create notices during blocking, lift maintenance and introduce a new event, then compare recipients.

1. **A23** — **Given** an eligible event during maintenance, **when** F07 processes its recipients, **then** personal entries are created under the usual rules but no push is sent, even to an operator who can bypass maintenance. (FR-021, FR-022)
2. **A24** — **Given** an inbox entry created during maintenance, **when** maintenance ends, **then** it remains within normal retention but its skipped push is not replayed. Purged entries remain absent. (FR-021, FR-022)
3. **A25** — **Given** a new sporting event after maintenance, **when** ordinary best-effort sending is evaluated, **then** current follows, relevance and permissions still apply without a backlog or recreated announcement. (FR-022)
4. **A26** — **Given** a message handed to the provider before blocking, **when** it is received or opened during maintenance, **then** no certain recall is promised; opening applies current blocking and no established success is intentionally replayed. (FR-023)

### Journey 5 — Update and correct blocking configuration (Priority: P1)

The person reaches the correct store; authorized operators manage configuration through ordinary administration.

**Priority rationale**: Avoid an impossible update and an operational dead end.

**Independent validation**: Compare platforms, version boundaries, combined restrictions and authorized ordinary configuration changes.

1. **A27** — **Given** distinct thresholds for iOS and Android, **when** the installed version is compared to its platform threshold, **then** a lower version is blocked, an equal or higher version satisfies the condition; without a threshold, this restriction does not apply. (FR-024)
2. **A28** — **Given** versions 2.9.0 and 2.10.0, an invalid threshold or an unknown installed version when a minimum applies, **when** comparison or saving is requested, **then** numeric order is respected, the invalid threshold is refused and the unknown version produces an explainable error with retry/support, without a fictitious value. (FR-025)
3. **A29** — **Given** an operator or the owner on an outdated version, **when** they attempt bypass, **then** no version exception is granted, even with permission to bypass maintenance. (FR-014, FR-026)
4. **A30** — **Given** maintenance and an unmet minimum version, **when** maintenance is displayed then lifted or bypassed by an authorized operator, **then** the update block remains applicable before application access. (FR-027)
5. **A31** — **Given** a proposed minimum increase, **when** the operator prepares its activation, **then** the link targets the correct store and the operator must verify version availability; a well-formed URL alone does not prove availability. (FR-028)
6. **A32** — **Given** a store link invalid at entry, impossible to open or an unavailable store, **when** configuration is saved or the update journey used, **then** the invalid link is refused; opening failure offers retry and support without lifting the minimum. Successful opening does not prove installation. (FR-028, FR-029, FR-030)
7. **A33** — **Given** an incorrect threshold or absent optional message, **when** the operator corrects the threshold/link, removes the minimum or displays the message, **then** maintenance remains unchanged; a link cannot be removed while leaving its threshold enforced, and fallback text does not promise a date or verified availability. (FR-030, FR-031)
8. **A34** — **Withdrawn** with FR-032–FR-033. No dedicated outside-mobile emergency route or associated recovery demonstration is part of initial F12 acceptance. Ordinary configuration and access scenarios remain.
9. **A35** — **Given** configuration, restriction and recovery journeys, **when** their outcomes and qualification are examined, **then** F13 applies to permissions, diagnostics, accessibility and availability, including maintenance. F14 receives transition constraints and R02 the states to design, without deeming any architecture or screen approved. (FR-034, FR-035, FR-036)

### Edge cases

- Configuration unavailability is neither proof of maintenance nor a new authorization. Restrictions and revisions observed during the current process survive failed checks and late responses.
- A cold start does not restore access configuration from storage. Foreground and authentication returns preserve the current process state without creating a startup check, timer or grace period against a server refusal.
- Explicit maintenance bypass is individual; the minimum version and every business permission still apply.
- Removing a threshold or image is an explicit change; leaving a field unchanged preserves its value.
- Maintenance does not itself suspend collection, cancel payments or erase notifications; it also does not pause F07 retention or daily purge.

## Requirements

### Functional requirements

#### Permissions and assignment

- **FR-001**: A new usable account MUST automatically receive the ordinary capabilities provided by the specs, without manual assignment, preserving ownership, visibility, F08 account age, quotas and other business conditions. No administrative or moderation privilege must be granted automatically.
- **FR-002**: Only the product owner MUST be able to assign or remove privileged permissions within an authorized process. An operator MUST NOT redistribute their rights or grant themselves rights. No generic account or permission management console is added.
- **FR-003**: Managing maintenance and its content, managing minimum versions/messages/store links, and bypassing maintenance MUST be three distinct permissions; possessing one does not provide the others.
- **FR-004**: Each command MUST retain its functional owner and permissions: F01 collection and seasons, F02 sporting data and presentation, F08 moderation, F09 Pro entitlements, F11 versioned legal publication outside mobile. Administration access MUST NOT confer general power. F09 powers reserved for the owner remain reserved despite F12 delegation. Club contact-field corrections, intentional absences and returns to the source belong to F02 FR-047–FR-052 and their business permission, without requiring a new mobile form.
- **FR-005**: Every protected action MUST check current rights for the account, action and resource, independently of control visibility. An absent, revoked or unusable permission provides no implicit right; refusals and responses from an old session respect F05/F13.

#### Content and saving settings

- **FR-006**: Saving the maintenance message or image MUST preserve its active or inactive state. Activation and deactivation MUST be explicit commands distinct from content preparation.
- **FR-007**: The saved maintenance message MUST be nonempty and not consist solely of whitespace; activation requires a usable message. The image remains optional and may be explicitly removed. An image invalid at entry must be flagged; display unavailability blocks neither the message nor retry actions.
- **FR-008**: A change MUST respect its scope: maintenance settings do not change version settings, and vice versa; unchanged fields retain their values. Explicitly removing an optional field must not be confused with leaving it unchanged.
- **FR-009**: Administration MUST distinguish loading, known configuration, unsaved input, refusal, confirmed failure, uncertain outcome and confirmed saving. A loading failure MUST NOT present defaults as published state or allow them to be saved as though that state were known.
- **FR-010**: Validation refusal or confirmed failure MUST preserve the last accepted state and make correction or retry understandable. A refresh MUST NOT silently erase unsaved input.
- **FR-011**: A save whose response is lost MUST be verifiable by rereading before repetition. A newer concurrent change MUST NOT be silently overwritten by an old response or submission; expose the conflict and allow retry from current state without imposing a new architecture.

#### Maintenance and access control

- **FR-012**: Maintenance MUST block ordinary features in the application and the corresponding server-side operations. A direct call, old link or retained screen MUST NOT bypass a current refusal. This block constitutes neither data erasure nor sporting withdrawal.
- **FR-013**: Legal information, F10/F11 support, authentication needed to identify an operator and authorized operational commands to exit the block MUST remain accessible despite the ordinary restriction. Authenticating an ordinary user does not open application access. These exceptions do not guarantee availability of a failed provider or expand permissions.
- **FR-014**: An operator with bypass permission MUST be able to explicitly choose to bypass maintenance to use the application and their authorized commands. This exception is personal, does not deactivate global maintenance and provides no other right. It MUST NOT benefit another account or a revoked permission and never bypasses a minimum version.
- **FR-015**: Access settings MUST be checked at every cold start, then on the explicit “Retry” action. A foreground return or authentication return MUST NOT constitute a new cold start or rerun this check. No timer, periodic mobile polling or permanent screen synchronization is required.
- **FR-016**: If maintenance is activated during a session, the server MUST refuse the next ordinary operation and the application MUST apply blocking on receiving that refusal. No instant replacement of an already displayed screen without server interaction is promised; no repeated mobile configuration reads are added to obtain that effect.
- **FR-017**: Every cold start MUST require a successful complete access-configuration check before ordinary access opens. If it fails, ordinary access MUST remain closed with explicit retry, even after a recent successful verification. The application MUST NOT persist access configuration or restore a prior permissive state from storage. Already open sessions require no expiry timer or additional periodic check; current server refusals retain priority.
- **FR-018**: Without a successful complete check in the current process, the application MUST show unavailability with accessible explicit retry, without inventing maintenance, a required update or authorization. Restrictions and revisions already observed during this process MUST remain protected against failed checks and late responses until a reliable current result establishes their replacement. A partial administrative read or change MUST NOT open ordinary access; a complete verification must succeed. FR-013 legal, support and authorized operator access remains identifiable, with existing permissions and no minimum-version bypass.
- **FR-019**: Maintenance MUST refuse new ordinary actions but allow already accepted short operations to finish. Uncertain outcomes follow their domain rules; a confirmed purchase, accepted deletion or received F10 request does not become cancelled. No general task suspension, cancellation or resumption system is added.
- **FR-020**: Activating or deactivating maintenance MUST NOT change collection state. Pausing, a started cycle, resumption and missed scheduled runs remain governed by F01. Internal processing is not implicitly stopped merely by blocking ordinary access.

#### Notifications during maintenance

- **FR-021** : Eligible F07 personal entries MUST continue to be created during maintenance under normal trigger/recipient rules. Blocking consultation does not itself erase entries or cancel an announcement. F07 daily purge and elapsed retention continue during maintenance; reopening neither restores purged content nor renews its age.
- **FR-022**: Maintenance MUST prevent new sporting push attempts, including to operators with bypass access. Eligible inbox creation and retention continue under F07. Ending maintenance does not replay skipped pushes or establish a persistent retry window; new events receive ordinary best-effort handling.
- **FR-023**: A message already handed to the provider before maintenance MUST NOT be presented as certainly recallable. Opening it applies current restrictions; already established successes remain retained according to F07.

#### Minimum versions and stores

- **FR-024**: Each platform, iOS and Android, MUST have its independent minimum threshold and store link; the update message remains shared. A lower version is blocked, an equal or higher version satisfies this condition. Absence of a threshold means this setting imposes no minimum for that platform.
- **FR-025**: Comparison MUST follow numeric order of published version components, not alphabetical text order; in particular, 2.10.0 is greater than 2.9.0. An invalid threshold MUST be refused without changing accepted state. When a threshold must apply, an unknown or invalid installed version receives no fictitious value or invented compatibility decision; offer an understandable error, retry and support. Without a threshold for the platform, no comparison is necessary.
- **FR-026**: Operators, including the owner, MUST NOT bypass the minimum version. Settings verification follows FR-015–FR-018; technical compatibility of old clients is not inferred from this mobile check and remains to be qualified under F14.
- **FR-027**: When maintenance and a required update coexist, maintenance MUST be presented first. Lifting it or authorized bypass MUST leave the remaining version block applicable; no maintenance exception constitutes an installed update.
- **FR-028**: Before raising a minimum, the operator MUST have a valid link to the relevant platform store and verify that the required version is actually available. URL format does not prove download availability; no automatic store monitoring is added.
- **FR-029**: A link that cannot be opened or an unavailable store MUST produce an understandable outcome with retry and support, without lifting the minimum. Opening the store does not prove installation; the application MUST check the actually installed version when reassessing this condition.
- **FR-030**: An authorized operator MUST be able to explicitly correct the threshold, message or link and remove a threshold without changing maintenance. Configuration imposing a threshold must have a valid link for that platform; removing the link while retaining the threshold is refused. An absent optional message uses understandable text without inventing a deadline or verified availability.

#### Recovery and boundaries

- **FR-031**: Fallback content MUST distinguish known maintenance, an outdated version and unavailable configuration; it MUST NOT promise an unestablished reopening date or duration. The image is never the sole carrier of information or actions.
- **FR-032**: Withdrawn by the approved reset: no dedicated owner emergency circuit outside mobile is required. This identifier is retained for historical traceability, not implementation.
- **FR-033**: Withdrawn with FR-032: no dedicated emergency-command, console or recovery-service qualification is required. Ordinary configuration validation, access control and F13 operational monitoring remain.
- **FR-034**: F13 MUST govern security, safe diagnostics, accessibility, French content and degraded states. No monthly availability accounting, personal activity log, extra audit system or on-call guarantee is added. Actual incidents remain observable during maintenance.
- **FR-035**: F14 MUST retain version compatibility and useful legal/support access during transition. Maintenance is not V1 retirement and does not authorize migration or provider changes. Both stores must actually offer V2 before ordinary V1 retirement under F14. After opening, recovery concerns V2 through standard operations; no dedicated outside-mobile F12 emergency circuit is required. Transition welcome never bypasses F12 restrictions.
- **FR-036**: R02 MUST cover visible permissions, content preparation, activation/deactivation, refusals, conflicts, maintenance, updates, unavailable configuration and operator access as a whole. The global and scoped approvals are routed by [design references](../../docs/design.md); the 2026-10-09 prototype/Figma revalidation under #37 covers the startup amendment. Material changes still require design approval before plan finalization; native qualification remains separate.

### Functional entities

- **Ordinary or privileged permission**: a capability tied to an action and domain conditions; assignment does not constitute eligibility for every operation.
- **Maintenance settings**: active/inactive state, message and optional image, editable independently of versions.
- **Version settings**: threshold and store link per platform, shared message; absent threshold distinct from an invalid threshold.
- **Current access configuration**: complete values verified during the current process, together with observed restrictions and revisions; no persisted configuration or verification-age allowance establishes access after restart.
- **Maintenance exception**: a personal choice by a currently authorized operator, without a version exception or additional privilege.
- **Save outcome**: confirmed state, refusal, failure or uncertainty, to be checked against newer changes.

## Success criteria

- **SC-001**: A01–A05 grant zero automatic privileges, zero privileged assignments by anyone other than the owner and zero commands accepted without their permissions; ordinary capabilities remain subject to their conditions.
- **SC-002**: A06–A12 produce zero activations due solely to content saving, zero unintended changes to another group and zero silent overwrites of input or newer decisions; uncertain outcomes remain verifiable.
- **SC-003**: A13–A20 produce zero ordinary admissions after a failed cold-start check or solely from partial administrative reads/changes, including immediately after a previous successful verification. Failed retries and late responses do not lift restrictions observed in the current process. No foreground return, authentication return, timer or periodic mobile polling triggers the access check described here.
- **SC-004**: A21–A22 retain accepted-operation outcomes and collection state; zero collection resumptions, caught-up scheduled runs or assumed cancellations arise solely from changing maintenance.
- **SC-005**: A23–A26 prevent every new sporting push during maintenance, retain eligible inbox entries under normal purge and perform no backlog replay on reopening. Previously handed-off messages retain their system limitations; there is no persistent push retry deadline.
- **SC-006**: A27–A33 distinguish platform, lower/equal/higher versions, invalid values and absent thresholds. No operator bypasses a minimum version or treats store failure as its removal. A34 and the dedicated outside-mobile recovery requirement are withdrawn.
- **SC-007**: A35 covers F13 rules, F14 constraints and R02 needs without declaring an implementation, qualified procedure or approved screen. Future checks and qualification evidence remain assigned to their phases.

## Assumptions and limits

- Ordinary actions are the views and mutations provided by F03–F10, except for explicitly retained access. Operators remain subject to each domain’s permissions; sign-in needed to identify them does not open ordinary access during maintenance.
- The single mobile startup check and server authorization are distinct responsibilities. How to provide current state to the server, protect current-process observations or represent permissions belongs to the technical plan; no mobile polling or persisted startup fallback must be inferred from these needs.
- Compared versions are published versions with ordered numeric components; internal build numbers, prerelease suffixes and remote-update mechanisms create no new product policy. Their mapping and compatibility of old clients will be qualified during technical and transition phases.
- An already accepted short operation finishes under its existing rules. External processes and identity or payment obligations already undertaken are not cancelled by maintenance. No general suspension/resumption scheduler is prescribed.
- The F07 inbox can receive entries while ordinary access is blocked. Reopening preserves still-retained history and consumed announcement limits; it never resets retention or restores purged entries.
- Activation is voluntary and maintenance content supplies no automatic end time. No maintenance calendar, additional SLA, generic console or technical fallback mechanism is selected.
- Verify actual store availability before raising a minimum. A dedicated outside-mobile emergency circuit is excluded from initial scope. Approved design remains authority for unchanged journeys; this reset claims no new UI qualification.

## V1 evidence

| Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Observation and limit                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Root navigation](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/session/navigation/root-navigation-state.ts) and [access state](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/app-status/hooks/use-app-access-state.ts)                                                                                                                                                                                | Maintenance takes priority over updates; mobile bypasses associated with `update:maintenance`. These guards prove neither server blocking nor separation of V2 permissions.                                                                                                                |
| [Maintenance control](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/administration/hooks/use-maintenance-control.ts) and [card](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/administration/ui/maintenance-control-card.tsx)                                                                                                                                                                          | Saving sends an active state and requires a message; optional image and confirmed activation. This behavior does not constitute the independent preparation retained for V2.                                                                                                               |
| [Version control](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/administration/hooks/use-app-version-control.ts), [comparison](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/app-status/model/app-version.ts) and [screen](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/app-status/ui/update-required-screen.tsx) | Separate platform thresholds/links and a shared message; fallback version value, permissive parsing and swallowed opening errors. No evidence of store publication or V2 requirements for unknown versions is inferred.                                                                    |
| [Configuration service](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/config-service/src/main/java/com/blockout/config/appstatus/application/AppStatusApplicationService.java) and [controller](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/config-service/src/main/java/com/blockout/config/appstatus/api/AppStatusController.java)                                                                                                         | Partial update with shared `update:maintenance` permission; null values ignored. Explicit field removal and separation of V2 powers must be defined independently of this historical contract.                                                                                             |
| [Role assignment](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/backend/users-service/src/main/java/com/blockout/users/user/application/UserApplicationService.java) and [dated transition evidence](../014-v1-v2-transition/spec.md#v1-evidence)                                                                                                                                                                                                                                                                      | Capability to assign the basic role; this source path alone does not establish its external composition. The dated Auth0 post-login observation is retained by [F14](../014-v1-v2-transition/spec.md#v1-evidence). V1 architectural intention does not prove implemented V2 authorization. |
| [Access tests](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/app-status/hooks/__tests__/use-app-access-state.test.ts), [screen tests](https://github.com/blockoutproject/blockout-legacy/blob/e31d3105421ae1130d574af191ecdd94cb7308ea/apps/frontend/mobile/src/modules/app-status/ui/__tests__/app-status-screens.test.tsx), [historical source baseline](../014-v1-v2-transition/spec.md#v1-evidence)                                                                                    | Evidence of local access journeys, not qualification of effective blocking, the fallback procedure or production stores.                                                                                                                                                                   |

## Coverage and dependencies

| Domain                                          | Requirements  | Scenarios         | Criteria |
| ----------------------------------------------- | ------------- | ----------------- | -------- |
| and shared permissions                          | FR-001–FR-005 | A01–A05, A16      | SC-001   |
| Preparation, field removal and saving           | FR-006–FR-011 | A06–A12           | SC-002   |
| Maintenance, exceptions and launch verification | FR-012–FR-018 | A13–A20           | SC-003   |
| Accepted actions and independent collection     | FR-019–FR-020 | A21–A22           | SC-004   |
| Personal entries and push                       | FR-021–FR-023 | A23–A26           | SC-005   |
| Versions and stores (A34 withdrawn)             | FR-024–FR-031 | A27–A33, A08, A20 | SC-006   |
| Quality, transition and design                  | FR-034–FR-036 | A35               | SC-007   |

| Scope                                                                                                                                                                   | Ownership and limit                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [F01](../001-source-acquisition/spec.md)                                                                                                                                | Collection, seasons, pauses and retries remain independent of access maintenance.                                                                                                                                              |
| [F02](../002-sporting-data/spec.md), [F03](../007-sporting-consultation/spec.md), [F04](../008-search-discovery/spec.md), [F06](../009-following-personal-feed/spec.md) | Sporting identities, visibility and actions remain domain-owned; maintenance erases neither resources nor follows.                                                                                                             |
| [F05](../005-accounts-identity/spec.md), [F08](../010-live-contributions-moderation/spec.md), [F09](../006-pro-subscriptions/spec.md)                                   | Identity and isolation, publishing/moderation rights and Pro; automatic ordinary permissions subject to conditions, distinct privileges, F09 powers reserved for the owner.                                                    |
| [F07](../011-notifications-delivery/spec.md)                                                                                                                            | FR-019, FR-024–FR-026, FR-043–FR-046; A26–A28, A45, A50: inbox creation and retention continue, push is best effort without persistent retries; match facts prevent ordinary repeats and personal purge prevents resurrection. |
| [F10](../012-reports-feature-suggestions/spec.md), [F11](../004-advertising-privacy-legal/spec.md)                                                                      | Support, legal reading and privacy despite blocking; F10 sending retains its complete-receipt rule.                                                                                                                            |
| [F13](../003-shared-quality/spec.md)                                                                                                                                    | Effective permissions, diagnostics and authorised manual operations; no monthly availability accounting or dedicated outside-mobile emergency circuit.                                                                         |
| [F14](../014-v1-v2-transition/spec.md) / [#270](https://github.com/blockoutproject/blockout-legacy/issues/270)                                                          | Compatibility and retirement of old versions, continuity of useful access and recovery qualification; no transition is executed here.                                                                                          |
| R01 / [#271](https://github.com/blockoutproject/blockout-legacy/issues/271), R02 / [#272](https://github.com/blockoutproject/blockout-legacy/issues/272)                | Consistency review then overall design of access and states; no technical plan before global acceptance.                                                                                                                       |

## Approved F01 source-lifecycle clarification — 2026-10-06

F01 owns season/source preparation, supported pre-launch URL completion, explicit LNV season confirmation when evidence is missing, and locked launched source bindings. Administrative permissions govern these actions. Pause and definitive closure never unlock sources. Competition controls are independent per season/provider; clubs remain seasonless. Closing requires exact typed season confirmation and current revision, preserves data, allows only already running cycles to finish, and offers no recollection or reopening. Other seasons are unaffected. No generic URL editor, source reassignment, reset or workflow engine is added. Targeted design approval is required for these changed journeys. See [F01 A38–A45](../001-source-acquisition/spec.md).
