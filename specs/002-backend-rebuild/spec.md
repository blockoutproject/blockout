# Feature Specification: Fresh Backend Rebuild

**Feature Branch**: `tech/230-backend-rebuild-specification`

**Created**: 2026-09-12

**Status**: Draft for repository review.

**Input**: Rebuild Blockout around coherent business ownership, preserve delivered capabilities on fresh business data, retain external identities and paid subscriptions, display dates in the device timezone, and redesign search reliability and relevance.

## Authority and Boundaries

This specification defines the replacement's observable behavior. The [constitution](../../.specify/memory/constitution.md) and [domain model](../../docs/architecture/blockout-domain-model-v1.md) govern it. The [baseline](../../docs/engineering/backend-preservation-baseline.md), its [data inventory](../../docs/engineering/backend-preservation/data.md), and [contract inventory](../../docs/engineering/backend-preservation/contracts.md) supply evidence, not an obligation to reproduce defects or retain old records.

The [mobile redesign specification](../001-mobile-ui-redesign/spec.md) owns visual language, navigation, accessibility, and design authority. This specification owns reset, subscription enforcement, secure account linking, device-timezone dates, unknown times, official standings, continuation, and search behavior. UI states require approved design evidence before their technical plans are finalized.

The [architecture decision](../../docs/architecture/backend-rebuild-architecture.md) records implementation constraints separately. The [coverage map](coverage.md) traces all epic obligations without duplicating GitHub progress tracking.

### Included

All eight baseline journey families: startup/session; match feeds; discovery/details; follows/communications; community lives; profile/supporting actions; subscription/advertising; administration/bootstrap. All supported provider formats remain covered. Existing business rows are disposable; future information coverage and actions are not.

### Excluded

Migration of old matches, favorites, live links, inboxes, business profiles, media, or history; replacing the external authentication or subscription provider; new competition formats; additional social features; semantic/vector search; horizontal scaling without measured need; and a new-app compatibility layer for the old business backend.

## User Scenarios & Testing

### User Story 1 - Reconnect Without Losing Paid Access (Priority: P1)

An existing subscriber installs the new app, reconnects with the existing account, and recovers paid access despite having no local business profile or old favorites.

**Why this priority**: Losing a paid entitlement is the highest-risk consequence of the reset.

**Independent Test**: Upgrade an old installation using controlled paid, expired, and free accounts, then reconnect, restore, restart, and switch accounts on both platforms.

**Acceptance Scenarios**:

1. **Given** an old installation with cached credentials and data, **When** the replacement first launches, **Then** it clears the old local session/data before silent recovery and presents sign-in or guest entry.
2. **Given** an existing paid identity with no business profile, **When** sign-in succeeds, **Then** exactly one profile is created and the existing paid entitlement remains accessible without repurchase.
3. **Given** an interrupted first-launch reset, **When** the app restarts, **Then** cleanup resumes safely and the old session cannot leak into the replacement.
4. **Given** a positive entitlement verified within the permitted outage grace, **When** its provider is temporarily unavailable, **Then** access follows FR-008; an unknown entitlement is not misrepresented as a confirmed free account.
5. **Given** two simultaneous first authenticated requests, **When** they finish, **Then** they resolve to the same business user.
6. **Given** logout or account switching, **When** the next account becomes active, **Then** no previous user's personal data, device ownership, or paid access remains active.

### User Story 2 - Read Correct Match Dates Anywhere (Priority: P1)

A follower sees a precisely scheduled match's time, date, list section, and relative-day label agree with the device timezone. A match without a known time retains its announced competition date and clearly communicates that no precise instant is available.

**Why this priority**: Inconsistent day and time interpretation can cause users to miss a match.

**Independent Test**: Open the same known match in Paris, Montreal, UTC, and Kolkata, including midnight and daylight-saving transitions, then compare list/detail/notification presentation.

**Acceptance Scenarios**:

1. **Given** one match with a known instant, **When** two devices use different timezones, **Then** each shows its correct local date/time and matching day section.
2. **Given** a date without a known kickoff time, **When** it is displayed, **Then** the announced date is preserved and the time is explicitly unknown, never fabricated as midnight.
3. **Given** a device timezone changes while the app is backgrounded, **When** the app resumes, **Then** the visible consultation is rebuilt consistently rather than continuing the previous timezone's list.
4. **Given** a 23-hour or 25-hour local day, **When** its matches are requested, **Then** every qualifying match appears once within that day's actual boundaries.
5. **Given** a user changes the device timezone, **When** attempting a time-restricted action, **Then** eligibility and daily quotas remain governed by trusted business time.
6. **Given** a date-only match viewed from Paris, Montreal, UTC, or Kolkata, **When** filtering and paginating, **Then** it is selected by its announced civil date and placed after timed matches within its day/pool group, with unknown-time presentation and source-calendar relative labels.
7. **Given** a date-only match later receives a trustworthy kickoff time, **When** refreshed, **Then** it moves to the appropriate device-local day/time; an incompatible old continuation requires refresh.
8. **Given** an unknown kickoff time before the match is finished, **When** a nonmoderator attempts a live publication requiring the one-hour window, **Then** the time-dependent action is unavailable until the time is known; moderator and post-finish rules remain explicit exceptions.

### User Story 3 - Receive Coherent Sporting Updates (Priority: P1)

A follower receives valid new competition information while an operator can identify and recover failed observations without losing useful data.

**Why this priority**: Imports supply the product's core information.

**Independent Test**: Process the controlled FFVB/LNV/club fixture matrix, repeat observations, rename entities, inject failures, and inspect the resulting catalog, matches, and rankings.

**Acceptance Scenarios**:

1. **Given** a valid complete pool observation, **When** it is published, **Then** its teams, associations, and matches become coherent together; unavailable official standings do not block a valid calendar.
2. **Given** an invalid pool and another valid pool, **When** processing completes, **Then** the invalid pool retains its last valid state while the valid pool advances.
3. **Given** duplicate observations or a renamed team, **When** imported, **Then** no duplicate business entity or user notification is created.
4. **Given** an incomplete or suspiciously empty source, **When** reconciliation runs, **Then** absence is not interpreted as authority for mass deactivation.
5. **Given** a manual correction, **When** a conflicting observation arrives, **Then** the displayed correction remains until explicitly removed.
6. **Given** a previously published result disappears, **When** the source is observed again, **Then** the last valid result remains and an operator-visible conflict is recorded.
7. **Given** new results or a manual match correction while official standings are unchanged, **When** displayed, **Then** the published official positions, ties, points, and penalties remain unchanged; no local ranking is calculated.
8. **Given** a missing, partial, malformed, wrong-pool, or wrong-season standing observation, **When** processed, **Then** it cannot replace the last usable official snapshot for that pool/season; without one, the app displays a ranking-unavailable state.
9. **Given** official standings containing tied positions, **When** displayed, **Then** source positions and row order remain intact without a local tie-break.
10. **Given** an unchanged official snapshot fetched recently, **When** its freshness is displayed, **Then** collection time is distinguished from the official update time, and a recent fetch does not imply recent official results.

### User Story 4 - Browse and Discover Relevant Competition (Priority: P1)

A guest or signed-in user finds clubs, teams, and pools, browses coherent details and match lists, and can recover from failed search or changed list data.

**Why this priority**: Discovery connects all sports journeys and must remain usable during peak load.

**Independent Test**: Exercise all three search categories and filters against a controlled catalog, then browse several pages while matches change and search is restarted or rebuilt.

**Acceptance Scenarios**:

1. **Given** a name with accents, punctuation, or multiple words, **When** searched by supported normalized text or prefix, **Then** the intended eligible entity is discoverable with its original display name.
2. **Given** several active filters, **When** searching, **Then** every result satisfies all selected filters.
3. **Given** search is unavailable, **When** a request fails, **Then** the app reports a retryable failure rather than claiming no results exist.
4. **Given** search data is rebuilt, **When** users search concurrently, **Then** the previous complete generation remains available until the replacement is ready.
5. **Given** an unchanged feed selection, **When** successive pages are loaded, **Then** ordering is deterministic and no match is skipped or duplicated.
6. **Given** a change invalidates continuation, **When** another page is requested, **Then** existing rows remain and an explicit refresh is offered rather than mixing versions.
7. **Given** a large pool spans pages, **When** the user scrolls, **Then** match order and day/pool context remain correct across the boundary.

### User Story 5 - Follow, Receive Updates, and Share Lives (Priority: P2)

A user follows teams or pools, receives relevant new notifications, and creates or reports live links under the established rules.

**Why this priority**: Community writes and asynchronous communication must stay consistent through retries.

**Independent Test**: Follow and unfollow concurrently, process repeated new match events, rotate devices/accounts, and exercise live ownership, quotas, and moderation.

**Acceptance Scenarios**:

1. **Given** repeated follow/unfollow actions, **When** requests complete, **Then** one authoritative relationship, its count, and the notification audience agree.
2. **Given** a new result for a followed entity, **When** processing retries, **Then** one logical inbox notification exists for the event and recipient.
3. **Given** an already announced score is corrected, **When** the correction publishes, **Then** the match and stored inbox content update without a second correction push.
4. **Given** an old external account with a newly recreated profile, **When** publishing a live link, **Then** the account-age rule uses trusted external account age.
5. **Given** two simultaneous attempts to activate a live link, **When** they finish, **Then** at most one active link exists for the match.
6. **Given** another user's notification or device registration, **When** accessed without ownership, **Then** the operation is denied.

### User Story 6 - Manage Accounts and Supporting Features (Priority: P2)

A user manages their profile, legal documents, reports, and account; authorized staff manage competition and operational settings.

**Why this priority**: Less frequent capabilities still belong to the preserved product scope.

**Independent Test**: Exercise profile/pseudonym/photo changes, reports with attachments, document access, intentional deletion, editor/moderator/admin boundaries, and controlled external failures.

**Acceptance Scenarios**:

1. **Given** valid or invalid profile/media changes, **When** submitted, **Then** validation, authorization, conflict, success, and recoverable failures remain explicit.
2. **Given** a deliberate account-deletion request, **When** confirmed and processed, **Then** its documented identity/profile consequences apply; technical reset never invokes this operation.
3. **Given** a guest or user requesting a supported document or submitting a report, **When** an external service fails, **Then** a safe recoverable result is presented without exposing credentials or internal diagnostics.
4. **Given** a staff account, **When** editing mappings, divisions, maintenance, or scraper controls, **Then** only currently authorized operations succeed.

### User Story 7 - Link Google and Apple Safely (Priority: P2)

A user who controls two sign-in identities can link them without email-based account takeover, lost paid access, or accidental privilege inheritance.

**Why this priority**: Existing email-based linking and uniqueness can prevent second-provider sign-in.

**Independent Test**: Link controlled free/paid accounts using fresh proof of both identities, inject interruption, and verify subsequent sign-in through either provider.

**Acceptance Scenarios**:

1. **Given** matching email addresses without proof of both accounts, **When** linking is attempted, **Then** no automatic merge occurs.
2. **Given** both identities are proven and at most one independently paid subscription exists, **When** linking succeeds, **Then** both sign-in methods reach the initiating signed-in business profile, retaining its ID, pseudonym and photo, merged favorites, and the existing subscription binding.
3. **Given** two distinct active paid subscriptions, **When** linking is requested, **Then** linking stops before identity/profile merge, both accounts remain usable, and an explanation plus the existing support contact path is offered without promising cancellation, refund, or purchase merge.
4. **Given** interrupted linking, **When** the user retries, **Then** they can recover without a second merge or unexplained entitlement transfer.
5. **Given** different privileges, **When** profiles are linked, **Then** privileged grants are not automatically unioned.
6. **Given** linking starts from a free account and the other account holds the sole active subscription, **When** linking succeeds, **Then** the initiating profile is retained and paid access remains associated with its existing billing identity.
7. **Given** two verified identities alias the same subscription, **When** checked, **Then** they are not classified as two independently paid subscriptions.
8. **Given** a previously blocked dual-subscription conflict is resolved, **When** linking resumes, **Then** both identities and current subscription state are verified again before merge.

### User Story 8 - Open the Replacement Reliably (Priority: P1)

An operator prepares the new season, verifies paying-user continuity and peak load, then opens the replacement through a rehearsed maintenance window.

**Why this priority**: The release is intentionally incompatible with old business data and APIs.

**Independent Test**: Rehearse on isolated infrastructure with representative data, controlled provider identities, old and new mobile binaries, and failure injection.

**Acceptance Scenarios**:

1. **Given** an empty replacement, **When** reference configuration and imports complete, **Then** the required catalogs and customer journeys are usable without copied old business rows.
2. **Given** the old mobile app, **When** cutover requires an update, **Then** it receives and displays the update requirement even with an expired or failed business session.
3. **Given** an unsuccessful readiness check, **When** opening is considered, **Then** cutover is postponed; the new app is never routed to the old business backend.
4. **Given** a background processing backlog during peak reads, **When** traffic continues, **Then** foreground usability and processing freshness meet the qualification criteria.
5. **Given** an old match link or push, **When** opened after reset, **Then** it cannot resolve to an unrelated newly created resource.
6. **Given** fault-free peak qualification and a complete valid observation, **When** publication takes five minutes or longer after durable receipt, **Then** freshness qualification fails even if the delay is correctly alerted.
7. **Given** an injected source/worker failure, **When** processing cannot advance, **Then** the last valid state remains visible, the failure is distinguishable from freshness, and recovery is tested separately from fault-free timing.
8. **Given** a post-opening incident, **When** service is restored, **Then** recovery uses compatible replacement code/data and never sends the new app to the legacy business API.

### Edge Cases

- Date-only observations cannot be converted to another timezone without inventing an instant. They retain the announced date and explicit unknown-time state.
- Ambiguous or nonexistent source-local times retain the previous valid state and an actionable diagnostic until trustworthy evidence resolves them.
- Receipt of a batch does not imply validation or publication; malformed and temporarily failed observations remain distinguishable.
- External notification providers can leave an uncertain delivery outcome. Logical inbox uniqueness is required; exactly-once device delivery is not promised.
- Cancelling renewal does not by itself mean paid access has expired. Provider-defined billing grace and Blockout's outage grace are distinct.
- A successful search rebuild must include writes and deactivations occurring during its construction, not merely a historical initial copy.
- A first post-reset login during provider outage has no old local proof to trust. Access is explicitly indeterminate unless fresh trusted evidence is available.
- A user's local clock, locale, timezone, or cached role cannot authorize a protected operation.

## Requirements

### Functional Requirements

#### Reset, identity, and paid access

- **FR-001**: The replacement MUST start with no migrated business profiles, matches, favorites, lives, notifications, media, or historical records, while preserving external identity accounts and paid-subscription associations.
- **FR-002**: The updated app MUST perform resumable, one-time local reset before automatic session restoration, then offer explicit sign-in or guest entry without deleting the external account or cancelling purchases.
- **FR-003**: Older supported installed binaries MUST receive maintenance/update guidance at cutover. The new app MUST use only the replacement business system.
- **FR-004**: Reconnection MUST create at most one business profile for an external issuer/subject pair. Email MUST NOT be a unique identity key or sufficient linking proof.
- **FR-005**: Personal data, navigation intent, device ownership, and subscription presentation MUST remain isolated across logout and account switching.
- **FR-006**: Existing subscribers MUST recover their valid paid access through their retained subscription identity without repurchase; restore and renewal/expiry changes MUST be supported.
- **FR-007**: Protected club-wide match lists and pool maps MUST enforce current paid access at the owning service, independently of client UI. Paid presentation and advertising suppression MUST remain coherent with entitlement state.
- **FR-008**: During provider outage, a previously verified positive entitlement MAY remain usable until the earlier of 24 elapsed hours after that verification and a known access expiry. Confirmed revocation/ineligibility ends grace immediately. Without proof, expose a retryable indeterminate state rather than a confirmed absence of purchase.
- **FR-009**: New voluntary account linking MUST require recent proof of both accounts, preserve the initiating signed-in business profile ID, pseudonym and photo, union/deduplicate favorites, and avoid automatic privilege union. Business-profile retention MUST NOT replace the existing billing identity.
- **FR-010**: Two independently active paid subscriptions MUST block linking before any identity/profile merge. Both accounts remain usable and an explanation plus the existing support contact path is provided, without automatic cancellation, refund, or purchase transfer. Aliases of one subscription are not independent subscriptions. A resumed attempt MUST reverify both identities and current subscriptions.

#### Time and competition

- **FR-011**: Known match instants MUST display using the device timezone consistently across time, date, grouping, detail, and relative-day labels.
- **FR-012**: Date-only values MUST retain the announced source civil date and display "Horaire non communiqué" rather than a fabricated instant. They are grouped and filtered by that date and placed after timed matches within each day/pool group in a stable order. Their relative-day labels use the competition calendar. Provider midnight conventions MUST be established per format, never globally guessed.
- **FR-013**: Changing the display timezone MUST rebuild affected consultations and prevent mixed-timezone continuation. Language or time-format preferences MUST NOT change the scheduled instant.
- **FR-014**: Known-instant matches MUST be selected within the requested device-local day's actual half-open boundaries, including daylight-saving transitions. Date-only matches MUST instead match the announced source civil date, without timezone conversion; combined results preserve day/pool grouping and FR-012 ordering.
- **FR-015**: Source time interpretation MUST be independent of machine configuration, preserve its source timezone context, and reject unresolved ambiguous/nonexistent precise times without overwriting trusted values.
- **FR-016**: Server-authorized elapsed-time windows MUST use trusted current time. Daily quotas and scraper schedules MUST retain the current Europe/Paris business calendar independently of device timezone.
- **FR-017**: Club/team/pool/division identity, season relationships, names, logos, contact/location information, participants, score, sets, venue, officials, and relevant ranking information MUST remain available on fresh valid data.
- **FR-018**: Renames and repeated observations MUST preserve entity identity. Identical provider codes in different source/season contexts MUST NOT collide.
- **FR-019**: Match status, corrected results, and match-derived views MUST remain consistent. A removed source score MUST retain the last valid result and expose an operator conflict; explicit manual removal remains possible. Match changes MUST NOT recompute or modify the official standings.
- **FR-020**: Standings MUST come exclusively from the official competition source, preserving its positions, ties, row order, points, penalties and statistics. No calculated ranking, fallback, or local tie-break is permitted. Apply the Official Standings Rules below for usability, provenance and unavailability.

#### Imports and freshness

- **FR-021**: Accepted observations MUST be durably recoverable and expose distinct received, validation, published, rejected, and temporarily failed outcomes. Repeated submission MUST NOT duplicate effects.
- **FR-022**: Calendar publication MUST be coherent per pool. A failed calendar observation keeps its previous valid state while independent valid pools can advance. Missing or unusable official standings MUST NOT block a valid calendar; standings retain their own source provenance and usable snapshot.
- **FR-023**: Partial, failed, or suspiciously empty observations MUST NOT authorize destructive reconciliation. Complete scoped evidence is required for deactivation.
- **FR-024**: Supported FFVB departmental/regional/national formats, LNV/DataProject enrichment, and club directory/contact/location information MUST retain the useful field coverage recorded in the baseline.
- **FR-025**: Field-specific source priority MUST be preserved; an older observation MUST NOT overwrite a newer accepted observation. Missing optional enrichment MUST NOT erase the last valid enrichment or block a valid primary calendar.
- **FR-026**: Manual corrections to owned sporting fields MUST override imported values until explicitly removed; subsequent observations remain available as the underlying source value. Official standing positions and statistics MUST NOT be manually overridden or recalculated from corrected match data.
- **FR-027**: Processing MUST support bounded retry, operator-visible failure, replay, and safe shutdown. Replay MUST NOT duplicate business data or logical notifications.
- **FR-028**: Competition collection MUST run every five minutes in existing busy weekend windows and every thirty minutes otherwise. Fault-free qualification MUST publish each complete valid observation less than five minutes after durable receipt. Operators MUST distinguish collection cadence, publication delay, last successful observation, last actual change, and incident state. An alert does not satisfy the publication-delay objective.
- **FR-029**: Initial loading of already completed matches MUST NOT notify users of historical results.

#### Lists and search

- **FR-030**: Upcoming, completed, followed, and entity match lists MUST preserve their established scopes, filters, day/pool context, refresh, and detail navigation; no new global feed is implied.
- **FR-031**: Unchanged list continuation MUST be bounded, deterministically ordered, and free of unintended gaps/duplicates. A large pool MAY continue across pages with coherent group context.
- **FR-032**: Loaded lists MUST NOT reorder silently during reading. Incompatible continuation MUST retain visible rows and offer refresh; fresh opening/refresh and match detail request current information.
- **FR-033**: Search MUST support clubs, teams, and pools with their existing relevant fields and filters, original display names, accent/case normalization, and incremental prefix matching.
- **FR-034**: Search results MUST satisfy all selected filters. Empty queries MUST return bounded, deterministically ordered eligible suggestions instead of unseeded random ordering.
- **FR-035**: Search unavailability, timeouts, and incomplete answers MUST NOT be presented as successful empty results. Users MUST receive a safe recovery action.
- **FR-036**: Restarting/rebuilding search MUST NOT discard the currently usable result generation. The replacement MUST include intervening changes and deactivations before becoming authoritative for reads.
- **FR-037**: Renaming a club or division MUST update affected dependent search results. Stale events MUST NOT resurrect removed resources or replace newer projections.

#### Community, support, and authorization

- **FR-038**: Follow/unfollow MUST be idempotent, with one relationship per user/target and consistent counters and notification audiences.
- **FR-039**: Notifications MUST preserve listing, unread count, distinct read/open state, deletion, and safe target navigation. One logical message per recipient/business event MUST survive retries.
- **FR-040**: Device registration, reassignment, invalidation, delivery feedback, and retries MUST respect authenticated ownership; another user's device or inbox cannot be controlled by a caller-supplied identity.
- **FR-041**: Correcting an announced result MUST update its stored inbox content without a new correction push; an already delivered system notification is not promised to change.
- **FR-042**: Live creation/replacement/deletion/reporting/history/approval/rejection/reactivation MUST preserve baseline ownership and moderation rules, with at most one active link per match.
- **FR-043**: The seven-day live-publishing age MUST use trusted external account age. Preserve the one-hour pre-match window, pre-finish nonmoderator quotas (three versions/match and three distinct matches/day), professional-league exclusion, post-finish pending review, and report thresholds (three upcoming, ten finished). Unknown kickoff time MUST NOT authorize a time-dependent pre-match action; moderator and post-finish exceptions retain their defined rules.
- **FR-044**: Profile, pseudonym, photo, and deliberate account deletion MUST remain supported with explicit validation and recoverable errors. Technical reset MUST NOT invoke identity deletion.
- **FR-045**: Legal/privacy content, signed competition documents, reports/attachments, and media replacement/cleanup MUST remain available with their baseline guest/user/staff permissions and safe upstream-failure behavior.
- **FR-046**: Authorized staff MUST retain division/provider mappings, scraper switches/status, maintenance/minimum versions, legal updates, and moderation controls. Guest/user/editor/moderator/admin ownership and permissions MUST be verified at the service boundary.
- **FR-047**: Advertising consent, tracking permission, paid ad suppression, purchases, push navigation, and native/external document links MUST remain coherent on both iOS and Android.
- **FR-048**: New public identities MUST prevent old links, cached IDs, or push targets from opening unrelated resources after reset.

#### Operations and release

- **FR-049**: Fresh initialization MUST reproducibly establish non-scrapable prerequisites, including divisions, mappings, legal content, application status, and required new assets.
- **FR-050**: Operators MUST observe foreground availability/latency, provider freshness, blocked pools, queued/failed work, search freshness, entitlement-sync failures, and notification failures without exposing secrets or personal payloads.
- **FR-051**: Peak-load qualification MUST combine reads, writes, scheduled imports, and notification processing on resources comparable to the production VPS, using twice the measured representative Sunday peak as the initial workload target.
- **FR-052**: Cutover MUST be rehearsed with actual old/new mobile builds and controlled identity/subscription accounts. Opening MUST be postponed when critical checks fail. Planned maintenance targets at most thirty minutes; post-opening recovery repairs the replacement instead of redirecting new clients to the old business system.
- **FR-053**: Legacy writers and messages MUST be isolated before opening. Irreversible retirement and production actions MUST remain explicit release decisions, separate from implementing this specification.

### Official Standings Rules

- The official source is identified per competition. A usable snapshot belongs to the requested pool and season, contains interpretable standing rows, and resolves its teams without evidence of partial observation. Malformed positions, unexplained duplicate team rows or unresolved teams prevent publication; officially tied positions are valid.
- Store and display official positions, row order, ties, points, penalties and statistics as supplied. Missing optional statistics remain absent; they are not calculated from matches or filled with invented zeroes.
- An unusable or absent observation never replaces a usable official snapshot for the same pool and season. A snapshot from another season/pool is never a substitute.
- Retain the last usable official snapshot when the source is unavailable, incomplete or unchanged. Without one, display "Classement indisponible" rather than an empty completed ranking.
- Collection time and the source's own update time are separate. Preserve the latter only when supplied; a recent successful collection does not establish that the official standings incorporate the newest results.
- Match corrections and new results do not modify standings. Display the official snapshot independently of calendar freshness; no comparison with a calculated ranking is required.

### Key Entities

- **Club, Division, Team, Pool, CompetitionAssociation, Match**: Existing domain concepts with stable identity and coherent competition/season relationships.
- **Match Schedule**: Source-local civil date, optional known time, source timezone context, and an actual instant only when trustworthy evidence resolves one.
- **Observation and Correction**: Scoped provider evidence and an explicit manual override with separate provenance.
- **Ranking**: An official standing snapshot for a specific pool and season, preserving source positions, row order, ties, statistics and provenance; never calculated locally.
- **User and External Identity**: Local business profile associated with proved external identities, independent of email and purchase identifiers.
- **Entitlement Evidence**: Provider-verified access state, verification time, known expiry, and identity association.
- **Favorite, Live Link, Notification, Device Registration, Report, Media**: Owned relationships/resources whose future capabilities survive reset without old rows.
- **Search Projection**: Rebuildable discovery information, never a second owner of business truth.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All eight baseline journey families and fourteen reference scenarios pass on fresh replacement data; every intended difference is explained by a requirement here.
- **SC-002**: Every controlled existing paid-account upgrade/restore scenario on iOS and Android recovers eligible access without repurchase; cross-account access leakage is zero.
- **SC-003**: The same known match instant remains identical through every transformation, and all timezone/day-boundary scenarios yield the expected local date, time, and group with zero missing/duplicate matches.
- **SC-004**: Duplicate, renamed, cross-season, incomplete, and failed observation scenarios produce zero accidental identity replacements, mass deactivations, or duplicate logical notifications.
- **SC-005**: Every labeled exact-name/prefix search case finds its intended eligible entity within the first twenty suggestions; all returned results meet selected filters.
- **SC-006**: Search restart/rebuild tests produce no empty-result window caused by discarding the active generation; all concurrent changes are represented at switchover.
- **SC-007**: All negative authorization tests deny cross-user, wrong-role, and unentitled protected operations, including direct requests outside the UI.
- **SC-008**: At matched representative workloads, the replacement's user-visible read latency at the 95th percentile and failure rate MUST not exceed the existing-system reference under equivalent data, resources and request mix. Also qualify the replacement at twice the measured Sunday peak against those reference thresholds. Record dataset, workloads, resource limits, run duration and thresholds before execution.
- **SC-009**: In fault-free peak qualification, every complete valid observation is published less than five minutes after durable receipt; any violation fails qualification regardless of alerting. Separate fault-injection tests MUST prove distinguishable incident reporting, preservation of the last valid state, and successful replay/recovery.
- **SC-010**: A rehearsed successful cutover completes within thirty minutes; failed pre-opening checks keep the replacement closed and legacy writers isolated according to the rehearsed procedure.
- **SC-011**: Every old-ID collision, interrupted reset, and account-switch scenario reaches the correct unavailable/recovery state with zero unrelated resource exposure.
- **SC-012**: Every requirement has acceptance evidence mapped to an implementation delivery before the epic can be completed; documentation alone never satisfies runtime criteria.

## Assumptions and Dependencies

- Device timezone governs known-instant display. Date-only records retain source civil dates and source-calendar relative labels because they contain no convertible instant. Business-day quotas and scraper schedules remain Europe/Paris.
- Continuation invalidation offers explicit refresh; empty search is deterministic. Linking retains the initiating profile and unions favorites. Two independently paid accounts require conflict resolution before linking. Result corrections do not generate another push.
- Secure linking does not authorize automatic unlinking, subscription cancellation, privilege transfer, or changing the existing subscription project's restore policy.
- Provider-specific meanings of midnight/missing dates must be established from controlled evidence before parser changes. Unresolved evidence is quarantined, never silently replaced by a fabricated date.
- Standings come exclusively from the official competition source. Local points, standings, statistical ranking inputs, and tie-break calculations are outside the product scope.
- Source timezone assignments are maintained as trusted source/competition configuration, not inferred from the device or a postal address alone.
- Real deployed versions, peak measurements, provider tenant settings, and store subscription behavior require controlled verification; repository evidence does not certify them.
- The powerful single VPS is retained. Resource isolation is required, but replicas and multi-node availability are not implied.
- UI technical planning waits for approved evidence for material changes, including linked accounts, unknown time, timezone-aware grouping, and continuation/search recovery states. Backend work without material UI impact can be planned separately.
- The maintenance target is a qualified successful-cutover budget, not a guarantee that every post-opening incident can be repaired within thirty minutes.
