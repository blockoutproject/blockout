# Quickstart: validate sporting integration

**Scope**: [plan](plan.md), [data model](data-model.md), [contracts](contracts/README.md).

## Prerequisites

Use the executable Maven/npm targets and focused sporting test commands in [README verification](../../README.md#verification). The boundary suites exercise generated MVC binding/mapping, collector serialization and mobile response validation before Query admission. They use controlled HTTP peers and synthetic data; the business, database and native journeys below require their owning implementations.

Use isolated PostgreSQL at the [F13-selected version](../003-shared-quality/plan.md#technical-context), the F13 contract toolchain and synthetic/minimized supplier observations. Keep raw supplier documents and personal contact data outside public fixtures. Prototype/browser evidence does not establish native or provider behavior.

## Identities and useful partial success

Integrate a complete contextual calendar, then replay it and postpone a known match. Expect stable identifiers and no duplicate participation or notification. Cover same club with distinct named teams, one team in multiple compatible pools, new season, qualified LNV team without club, optional technical attachment and a recognized bye without a fictional opponent.

Submit 100 matches with one local failure. Expect 99 successful updates retained, the failed match unchanged and no absence reconciliation. Compare malformed global context, contradictory duplicates, a truly empty current calendar and wholly empty historical reconstruction. None may turn a parsing failure into a successful empty observation.

## Ordering and transactions

Delay an older calendar and detail response until after a newer observation. Expect complete rejection of old match facts and no stale participation restoration or absence finalization. Admit a newer calendar while an older request is between match transactions; only the current successful complete calendar may reconcile absence.

Race classification correction with match integration and test a shared-participation collision. Expect all-or-nothing administrative correction, stable identities and preserved customizations. Test division deactivation and source withdrawal as independent reasons; ordinary collection cannot lift them.

Exercise numeric and recognized special results with provisional, final and unconfirmed finality through ingestion and consultation. Preserve notation independently; only a final result establishes a definitive-result transition.

Race first final result with F08 publication. Expect the F07 composition matching the accepted order. Fail internal inbox persistence: only that match rolls back. Fail push after commit: score and inbox remain. Verify initial imports, unchanged results, corrections and withdrawal/restoration do not duplicate consumed announcements or resurrect purged inbox entries.

Carry supplied and omitted `providerPublishedAt` through the actual generated collector/backend boundary, including image metadata. Verify retained fact groups keep their own timestamps, newly accepted facts without a publication time remain unknown, and source publication time cannot overturn the logical token.

## Contracts and fields

Generate actual Spring interfaces/DTOs, RestClient and mobile consumers from the canonical roots; compile and exercise real request/response binding. Cover omitted/null/value, strict unknown request fields, tolerant response additions, unknown enums, dates, safe Problem Details and bounded partial outcomes. Regeneration must be deterministic without template patches or committed generated output.

Exercise club, team and division atomic multipart PATCH presentation saves through real MVC and mobile transport: JSON metadata with explicit nulls, image replacement, automatic-logo restoration and name/color changes in the same transaction. Reject an invalid image without saving another part of the form. Verify that `keep`/`automatic` reject an unexpected image and `replace` requires one. Pool PUT edits accept complete JSON names only and reject missing required fields, image or logo-action fields. Repeat an already-current permitted write: expect no new revision, image association or lifecycle transition. Contacts PATCH must apply all supplied fields or none. Division POST must return a usable Location matching the response identity; unsupported media types return 415.

Verify `Cache-Control: no-store` on administration/ingestion successes and errors, and the Bearer challenge on 401; the application-owned query cache must still obey account-switch and permission rules.

Try wrong-environment M2M tokens and unauthorized/stale administrative commands. Expect no effects. Lose a response and read current state before an explicit retry; no automatic mutation replay. Exceed the calendar/image bounds and verify explicit refusal, never truncation or deletion of valid images. Qualify a complete source-season catalog against the 8-MiB JSON bound; include repeated pool labels under distinct compound contexts and identical duplicates. Expect positional result correlation, one atomic catalog commit, and no absence change for stale, invalid or oversized input.

## Presentation, contacts and continuity

In existing native journeys, verify a professional team with no club remains readable/followable without a club link or invented point. Exercise team override → LNV → optional club → missing artwork, plus unchanged nonprofessional inheritance. Fail logo retrieval/replacement and retain the last valid presentation. Check both themes, enlarged text, focus and meaningful accessible action labels.

Change effective municipality/postal context while a geocoding response is in flight: the old point must not return. A street-only or overridden source change must not move it. Exercise each contact mode and current privacy restrictions without retaining former personal details.

Exercise standings with and without a retained usable table: `published` with empty rows remains an available table; `not-published` with empty arrays is qualified absence, and a failed/unreadable read is neither. Preserve a still-usable retained table and its own freshness on failure or non-publication; without one, F03 distinguishes qualified absence from unavailable acquisition. Reject non-publication with nonempty arrays and stale absence observations without effects. A successful table containing an unlinked row preserves official order without a fabricated team. Close a season and verify history remains while new cycles are refused. F14 logo preservation and controlled initial reconstruction remain prerequisites for any separately authorized transition, not actions of this quickstart.

### Current visibility and projection boundary

F02 T035–T040 are exercised by `SportingVisibilityIntegrationTest`, `SportingProjectionIntegrationTest` and `SportingReadServiceTest`, alongside the existing calendar/identity/classification suites. The integration suites use the real F01 admission, closure and completion services with explicitly migrated disposable PostgreSQL 18.6 and the restricted application role.

Current public reads recheck canonical visibility, permitted municipality, qualified aliases and participation; they never hydrate from an index document. Retained internal identity reads remain available to acquisition. A known date without a time remains eligible; a dateless or withdrawn match does not. Official standings retain labels, order and statistics while dropping links to unavailable participants. `SportingProjectionChanges.Changed` carries only identities/scopes after commit; `projectionDependents` expands current retained relations in batches, including hidden identities needing index removal. Rollback emits no handoff and score-only changes submit no search work. No request queue or recovery state is stored.

Presentation inputs currently use implemented source names and permitted locality. US6/T053 still owns manual/source short-name, contact, logo and locality mutation integration. F03/F04/F06 surface, index scheduling/rebuild/recovery and real follow qualification remain T041; these backend suites do not complete it. No provider, native-device or production qualification is claimed.
