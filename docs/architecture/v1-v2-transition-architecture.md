# V1 to V2 transition architecture

This design applies [F14](../../specs/014-v1-v2-transition/spec.md),
[F02](../../specs/002-sporting-data/spec.md),
[F13](../../specs/003-shared-quality/spec.md) and the
[V2 architecture](architecture-v2.md). It describes future controlled operations;
it does not claim an export, provider qualification or production migration exists.

The previous monorepo is not deployed. The running V1 instances originate from
independent repositories. Legacy source observations do not establish their exact
deployed versions or data shape; qualify actual authorized exports and runtime
dependencies during transition work. This repository foundation neither inspects
nor changes those independent repositories or production systems.

## Protected state and responsibilities

Preserve existing Auth0 principals/links, email ownership and age evidence;
historical/current RevenueCat correspondences and valid rights; pending erasures
and restrictions; and all V1 club/logo associations with recoverable files.
Business-account recreation is distinct from voluntary provider/account erasure.
Do not promise recovery of excluded V1 follows, inbox/read states, contributions
or profile personalizations.

The owner explicitly requires an exploitable V1 club registry for adaptation to
V2, not just a list of orphan image URLs. Inventory every V1 club. Export only
attributes needed for identity, permitted transformation and media/geocoding
qualification; do not turn this requirement into an unrestricted personal-contact
archive. Unknown/ambiguous clubs remain preserved for resolution and are not
automatically published as new V2 resources.

Use a bounded Java migration executable in the Nx workspace. It reads authorized
snapshots/manifests, transforms explicit legacy models and invokes Sport-owned
import use cases. It shares no V1 JPA entities with V2 and has no role in normal
mobile reads. Its operators use dry-run, resumable import and reconciliation modes,
not a permanent new mobile migration UI. Liquibase creates/evolves the required
schema; it does not download files or perform provider-dependent ETL.

## Historical evidence, not assumptions

The inspected V1 ClubEntity has ID, raw/display names, address, city, postal code,
contacts, logo URL, coordinates and timestamps. The scraper maps a parsed club
identifier into the submitted ID. Neither fact proves every retained production
row has a reliable unique provider identity. Profile the actual authorized export
before choosing matching evidence.

The V1 Mapbox adapter can submit a street address and request postcode/place/address
results. Persisted latitude/longitude therefore do not prove municipal precision,
current effective locality or storage permission. No supplier account settings or
production data were inspected to establish those properties.

## Migration records and interfaces

| Record/interface          | Required semantics                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LegacyClubRecord          | Snapshot/run ID, V1 club ID, verified source references when available, useful source/display names and locality, historical logo reference, candidate coordinates and available provenance, extraction time and relevant-content fingerprint. |
| ClubCorrespondence        | Legacy identity, optional V2 ID, matching evidence/rule version, resolution state, operator decision where needed and source revision.                                                                                                         |
| PreservedMediaManifest    | Original association/reference, protected object/version, size, actual type, content checksum, validation outcome and any derived-object provenance.                                                                                           |
| MigrationRun              | Input manifest/schema version, extraction boundary, transformer version, checkpoints, counts and resumable terminal/uncertain outcomes.                                                                                                        |
| Controlled import command | Stable legacy identity/import key, expected correspondence and current target revision, qualified source evidence and preserved media reference.                                                                                               |
| Reconciliation report     | Every source record and association accounted for; mapped/unresolved/conflicting/missing-file outcomes distinct; no raw personal payloads in logs.                                                                                             |

These are semantic contracts for the F14 plan, not generated API files. Imports
require a restricted operator/service identity, never an ordinary mobile token.
Bind idempotence to stable legacy association plus input revision. Replaying an
identical revision is a no-op; an older revision cannot overwrite a newer import
or an operator's subsequent V2 presentation edit. An uncertain result is queried
by operation identity before another mutation.

## Preservation and mapping protocol

1. Produce a coherent database snapshot and enumerate all club/logo associations.
   Preserve useful identity/locality evidence in private versioned staging,
   independent of the database that may later be reset.
2. Resolve every referenced logo to actual bytes. Preserve an independent object
   copy; verify type, readability, size and checksum. Record version/checksum as
   evidence rather than relying only on a mutable URL or S3 ETag.
3. Preserve the original if a format adaptation is needed; record the derivative
   and relationship. A failed conversion is explicit, not a successful import.
4. Establish correspondence from verified provider identity or explicit validated
   historical mapping. Names/locality help detect conflicts and propose candidates,
   but never alone authorize automatic identity merging.
5. Apply certain correspondences through Sport. Attach logos as manual presentation
   with normal cross-season team inheritance. Missing supplier logos cannot erase
   them. V2 owns the resulting resource and access policy.
6. Keep absent, ambiguous and conflicting associations with preserved files for
   later operator resolution. Do not fabricate a club, silently discard a row or
   report unresolved matching as completed.

The correspondence states are certain, needs review, ambiguous, no candidate,
identity conflict and integrated. File outcomes are separate: verified, missing,
unreadable or adaptation failed. Many associations may refer to the same byte
object; content deduplication must never merge club identities or associations.
Multiple V1 rows mapping to one candidate require explicit identity resolution,
not a silent uniqueness-conflict workaround.

Once retained staging/import data exists, Liquibase changesets are immutable.
Use separate migration/application credentials, one ordered changelog root with
owned includes, and expand/backfill/contract for compatibility. Do not rewrite V1
Flyway history or run schema updates at application startup. Test clean creation,
upgrade with retained fixtures and the actual repair/restore path.

## Geocoding candidates

Reuse an existing point only if club identity is certain, commune/postal context
matches the effective V2 context, municipal precision is established, no current
restriction forbids use and storage/reuse rights are established. Record that
qualification and bind the point to the locality revision.

Otherwise leave it unpublished and create the ordinary F01/F02 geocoding need.
Do not make a missing reusable point a blocker to preserving a club/logo. A
street-level point is not upgraded into a municipal point by relabeling it. A
previously valid point cannot bypass a newer locality change or privacy decision.

## Concurrent V1 changes and final reconciliation

Preparation is repeatable while V1 runs. Track protected changes after each
snapshot: identity/rights events, erasures and logo/association changes. Do not
assume last_update alone detects deletes, replaced S3 objects or all supplier
changes. A final full comparison of club associations and object manifests covers
those cases; any relevant concurrent replacement triggers recapture/revalidation.

At the final window, fence affected V1 writes, drain/reconcile already accepted
operations, establish the last protected boundary and compare the full manifests
before importing final changes. V1 remains the ordinary live application during
preparation; do not run two active writers against V2 or treat maintenance as proof
collectors stopped. Missing files block destructive action; an unresolved identity
with a verified preserved association remains resolvable and is reported honestly.

## Wider cutover sequence

1. Protect identity/entitlement correspondences, current obligations, club registry
   and actual logo bytes before any affected reset. Unknown dependencies block
   destruction rather than becoming a promise of later purchase restoration.
2. Build isolated V2 and reconstruct the current plus three closed seasons through
   the accepted exceptional import path, without historical notifications. Explain
   genuine supplier gaps; do not invent arbitrary completeness percentages.
3. Rehearse migration, provider continuity, supplier failure and isolated restoration.
   Qualify all historical subscriber categories and both Apple/Google stores,
   including linked identities, reinstall, cross-platform return, limited transfer,
   assisted recovery and erasure followed by restoration.
4. Qualify installed-client upgrade markers and the separate dismissible transition
   welcome. Require explicit Google/Apple reauthentication for first personal V2
   use; do not silently restore purchases after login. Measure OS-minimum impact
   and communicate before retiring access.
5. Publish and verify actual download availability on both stores. Store submission
   or approval alone is not download availability.
6. Enter the controlled final window, reconcile protected deltas and drain accepted
   obligations. Disable old ordinary API/session/provider actions and old
   collectors/deferred jobs, including dependencies such as V1 role assignment.
   Preserve legal/support and outside-mobile owner recovery under F12.
7. Open V2 only after continuity and protection criteria hold. Do not blindly import
   old push destinations, unread badges or queued notifications; reconcile current
   installation/account binding. Already delivered pushes cannot be recalled.
8. After opening, repair or restore V2. No functional rollback to V1 is promised;
   new V2 actions and current restrictions remain protected. Keep unresolved
   associations recoverable, with purpose-limited access and retention, rather
   than deleting the staging record because the application launched.

No failed preparation automatically resets data or partially opens V2. Physical
deletion/reset is a separately controlled production action, not a side effect of
running a schema migration, import dry-run or image deployment.

## Qualification and release blockers

| Scenario                      | Required evidence                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Registry coverage             | Every source club has an accounted-for migration record; source/target counts and intentional relationships are explainable.    |
| Logo preservation             | Every expected association and byte object is verified or an explicit destruction blocker. A URL alone never passes.            |
| Ambiguous identity            | No automatic name-only match; unresolved associations and files remain retrievable.                                             |
| Replay/concurrency            | Repeating a run creates no duplicate club/media/effect; older runs and imports cannot overwrite newer V2 edits.                 |
| V1 changes during preparation | Added/replaced/removed associations and replaced objects are captured in final reconciliation.                                  |
| Partial file/import failure   | Correct checkpoints, no falsely complete dossier and previous valid target presentation retained.                               |
| Geocoding                     | Only qualified context-matching municipal points publish; other candidates follow normal acquisition.                           |
| Supplier identity/Pro         | Category-specific evidence on both stores; uncertain/overbroad transfers block the affected path.                               |
| Loss/restore                  | Coherent independent files/database; current erasures, rights, restrictions and consumed announcements reapplied before access. |
| Retired V1                    | Old clients/direct sessions/background jobs cannot resume ordinary writes or bypass V2 continuity controls.                     |

Use sanitized synthetic fixtures for repeatable automated tests, then an authorized
private representative export/rehearsal for actual migration evidence. Never commit
production snapshots, correspondence records, personal data or logo exports to the
public application repository.
