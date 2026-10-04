# F02 administrative command contract

**Trace**: FR-011–016, FR-043, FR-045–052. [OpenAPI snapshot](admin.openapi.yaml); future fragments under `contracts/public/sport/`. F12 owns role assignment and approved navigation; F02 checks current action/scope permission at every operation through F05/F12. A visitor, ordinary account, live-link moderator or revoked session cannot mutate sporting administration implicitly.

## Operations and concurrency

All routes start with `/api/v1/admin/sport`. Bearer authentication and F13's safe problem profile apply. Reads are side-effect-free. Mutations require an expected revision; 409 means reread and decide, never merge silently. Revisions are opaque strings scoped to the target resource/configuration, not timestamps or per-field collaborative versions. A successful response returns the actual current revision.

| Method / suffix                                 | Permission / outcome                                                                                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `/classification`                           | Classification read permission; current pack/pool configuration and revision for one requested scope                                                                  |
| PUT `/classification`                           | Classification write for every requested scope; complete division/format/gender triple, complete pool override or its removal; atomic scope validation and correction |
| GET `/divisions/{divisionId}`                   | Division administration read; presentation, active and revision                                                                                                       |
| POST `/divisions`                               | Division creation; refuse case-insensitive name duplicates, initialize active explicitly as a defined creation rule                                                   |
| PUT `/divisions/{divisionId}/presentation`      | Division presentation permission; preserve active state, reject duplicate rename                                                                                      |
| PUT `/divisions/{divisionId}/activity`          | Division lifecycle permission; explicit desired active state; removal of only this reason, recheck F01 eligibility                                                    |
| GET `/{resourceType}/{resourceId}/presentation` | Scoped presentation read; effective and editable values, modes and revision; allowed types clubs/teams/pools                                                          |
| PUT `/{resourceType}/{resourceId}/presentation` | Scoped presentation write; independent names; fields supported by the selected resource only                                                                          |
| GET `/clubs/{clubId}/contacts`                  | Explicit contact correction/read permission; currently permitted automatic/manual/effective states and revision                                                       |
| PUT `/clubs/{clubId}/contacts`                  | Contact correction permission; requested field modes/value, preserve other fields; privacy dominates all modes                                                        |
| PUT `/{logoOwnerType}/{resourceId}/logo`        | Scoped logo write for clubs/teams/divisions; multipart PNG/JPEG via backend; expected revision and <=5 MiB file                                                       |
| DELETE `/teams/{teamId}/logo`                   | Team presentation permission; expected revision; remove explicit association to restore current club inheritance                                                      |

No generic match/score editor, identity-merge, alias-management UI or new contact form is created. Verified aliases/exceptional identity correction use an authorized controlled technical operation with declared scope and checked before/after identity consequences; they cannot bypass classification collision refusal. F14's import adapter is a separate temporary boundary with qualified manifest/mapping, current association revision and actual bytes.

Classification reads use exact requested source scope. A pack correction computes all inherited dependent pools; individual overrides remain independent. A multi-pool correction must name its complete affected scope. `CLEAR_OVERRIDE` applies only to pools and must re-evaluate current pack inheritance. Removing pack classification stops otherwise unclassified acquisition without itself hiding retained sporting data. All requested team/pool relations must remain coherent or the request is refused wholesale. The returned conflict explains safe scope IDs and reason codes, not personal data or a merge suggestion.

Presentation requests allow only supported fields: club display name; team/pool full and short display names; division name/colors via its dedicated operation. `SOURCE` removes one manual override; `MANUAL` requires the bounded value. Contacts additionally allow `INTENTIONAL_ABSENCE` with no value. Empty strings/null are not implicit clears. A request applies its named fields atomically. Current automatic source changes have a separate revision from operator intent so collection alone does not falsely invalidate an otherwise current correction.

## Logo transaction boundary

1. Authenticate and check current scoped permission; enforce 5,242,880 file bytes and bounded multipart overhead.
2. Check PNG/JPEG actual content and decodability, not extension/MIME alone. Reject unsupported/malformed/oversized content safely before attaching. Remove unneeded metadata according to F11; do not retain originals containing personal metadata as a new archive.
3. Store a fresh uniquely keyed object outside SQL; verify successful complete upload.
4. In SQL, recheck current permission, expected presentation revision and any transition restriction, then change association and affected search/presentation revision. No S3 HTTP within SQL.
5. On upload or association failure keep the old association. A newly uploaded unreferenced object can be diagnosed and removed by an authorized bounded cleanup; do not add a supervisor. Never overwrite/delete an object referenced by V1, another owner or F14's protected manifest.

A client timeout leaves uncertainty. Read the current association/revision before a new upload. No mobile automatic mutation/upload retry. An unchanged desired state can be acknowledged through a reread; a stale command itself is refused, which is idempotent in effect without universal receipts. Old logo URLs may remain cached, so replacement uses a new URL; this does not authorize moving existing V1 URLs.

## Errors and mobile behavior

| Status / code                  | Meaning and effect                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 400 / INVALID_REQUEST          | Wrong type, unexpected field, missing revision, malformed field mode or impossible state/value shape; no mutation |
| 401 / UNAUTHENTICATED          | Missing/invalid/revoked session; no mutation                                                                      |
| 403 / FORBIDDEN                | Missing action/scope permission; no mutation                                                                      |
| 404 / NOT_FOUND                | Missing or deliberately undisclosed resource; no replacement identity                                             |
| 409 / STALE_REVISION           | A newer operator/resource intent exists; reread current permitted state                                           |
| 409 / CLASSIFICATION_CONFLICT  | Split/merge/collision/out-of-scope affected participation; entire request unchanged, safe conflicting scope IDs   |
| 409 / DUPLICATE_DIVISION_NAME  | Case-insensitive duplicate create/rename; no side effect                                                          |
| 413 / UPLOAD_TOO_LARGE         | File exceeds 5 MiB or bounded envelope; old logo retained                                                         |
| 415 / UNSUPPORTED_IMAGE        | Not supported actual PNG/JPEG content; old logo retained                                                          |
| 422 / INVALID_SPORTING_COMMAND | Valid shape, unsupported field/resource combination or ineligible target division; no mutation                    |
| 503 / DEPENDENCY_UNAVAILABLE   | Required storage/database unavailable; confirmed failure retains prior state, response loss remains uncertain     |

F13 defines `application/problem+json` status/code/opaque diagnostic reference. Only domain conflict scope identifiers are an allowed additional safe field; never echo personal input or upstream exception text. Clients handle unknown codes generically and reject invalid consumed response fields before cache installation.

Reuse F13's read deadline 10 seconds, at most one transient read retry after one second; mutation 30 seconds and image upload 60 seconds, with no automatic repeat. Navigation remains available. Permission/validation/contract errors are not retried. After session/account change invalidate private cache and late old-session results, even if abort fails. F03/F12 own screen composition; test actual affected iOS/Android file selection/upload, accessibility and rendering against the accepted handoff.
