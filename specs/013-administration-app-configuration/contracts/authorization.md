# Permission authority and owner operations

## Catalogue

`accounts` owns this catalogue and resolves grants against a usable current F05 business account. All grants are global within the named domain in this scope. The operation still checks its resource and business conditions. There is no administrator wildcard, implicit role, club/team delegation or permission-assignment endpoint.

| Permission code                      | Capability field under `capabilities` | Meaning / owner                                                                 |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------- |
| `configuration.maintenance.manage`   | `configuration.manageMaintenance`     | Read/edit maintenance content and explicitly change state; F12                  |
| `configuration.versions.manage`      | `configuration.manageVersions`        | Read/edit platform minima, links and shared message; F12                        |
| `configuration.maintenance.bypass`   | `configuration.bypassMaintenance`     | Choose a personal maintenance exception; no configuration write right           |
| `acquisition.read`                   | `acquisition.read`                    | Read permitted acquisition administration; F01                                  |
| `acquisition.control`                | `acquisition.control`                 | Explicit pause/resume/relaunch under F01 lifecycle rules                        |
| `acquisition.seasons.manage`         | `acquisition.manageSeasons`           | Prepare/launch/close seasons under F01 conditions                               |
| `acquisition.sources.manage`         | `acquisition.manageSources`           | Supported pre-launch source completion/confirmation; never edit locked sources  |
| `sport.classification.read`          | `sport.readClassification`            | Read classification administration; F02                                         |
| `sport.classification.write`         | `sport.writeClassification`           | Correct classification under scoped command conditions; F02                     |
| `sport.divisions.read`               | `sport.readDivisions`                 | Read division administration; F02                                               |
| `sport.divisions.create`             | `sport.createDivisions`               | Create an eligible division; F02                                                |
| `sport.divisions.presentation.write` | `sport.writeDivisionPresentation`     | Edit division presentation; F02                                                 |
| `sport.divisions.activity.write`     | `sport.writeDivisionActivity`         | Change division activity under current conditions; F02                          |
| `sport.presentation.read`            | `sport.readPresentation`              | Read sporting presentation administration; F02                                  |
| `sport.presentation.write`           | `sport.writePresentation`             | Edit sporting presentation/logos; F02                                           |
| `sport.contacts.read`                | `sport.readContacts`                  | Read club contact correction context; F02                                       |
| `sport.contacts.write`               | `sport.writeContacts`                 | Correct contact fields, deliberate absence/return to source; no new mobile form |
| `contributions.publish`              | `contributions.publish`               | Ordinary publication subject to F08 account age/resource/quotas                 |
| `contributions.withdraw`             | `contributions.withdraw`              | Ordinary withdrawal subject to ownership and F08 conditions                     |
| `contributions.report`               | `contributions.report`                | Ordinary reporting under F08 conditions                                         |
| `contributions.moderate`             | `contributions.moderate`              | Privileged approval/refusal and moderation under F08                            |

Only `publish`, `withdraw` and `report` are initialized automatically, in the transaction that creates a new account. A bootstrap resolving an existing account never restores withdrawn grants. Privileged operations on another person's contribution require F08's combinations: publish plus moderate for direct moderator publication, withdraw plus moderate for another author's withdrawal; approval/refusal requires moderate. Ordinary publication retains F08's seven-day rule. F08 FR-027 explicitly exempts authorized moderator publication from age, time-window and quota conditions and permits direct post-match publication; professional-context, URL, visibility/privacy and concurrency restrictions still apply. Moderation consultation/history/approval/rejection/reactivation requires moderation permission. No capability confers Pro rights.

F09 RevenueCat gifts remain product-owner operations in the provider console. F11 legal publication remains versioned-file work under its own delivery authority. Neither becomes a mobile grant through F12.

## Account and resource interfaces

The accounts module exports current-account resolution and an authorization operation taking the business UUID, action and resource context. Resource context describes the actual domain target, not a new persisted permission scope. No consumer reads its repository. Authentication validates Auth0 issuer/audience/signature/expiry via F05; Auth0 roles or token scopes never override Blockout grants.

At mutations, the owning domain calls the current accounts decision within its final transaction, after any external upload. The accounts boundary owns its account/grant serialization; see [data model](../data-model.md#revision-and-mutation-rules). Do not hold a SQL transaction while calling Auth0, S3 or another provider. A client capability cache is presentation evidence only. Unusable/deletion-requested accounts cannot use retained grants.

`GET /api/v1/me/capabilities` requires the current usable account and returns all 21 known booleans, including false. It uses `Cache-Control: no-store`. Future capability fields are additive and ignored by old clients; do not encode the catalogue as a closed response enum array. Check the response UUID and F05/F13 session generation before installing it. Account switch, logout or deletion clears private capability state and bypass; failed cancellation cannot allow an old response to repopulate them.

## Manual owner-only assignment procedure

The future runbook is `docs/operations/manage-account-permissions.md`, operated only by the product owner using authorized environment-specific database access. Create it when concrete maintained instructions and their qualification exist, using the shared operating-procedure structure from `project-documentation`; the authorization contract and feature validation remain in this dossier. It is not an application role and is not available to delegated operators. This dossier does not execute any grant or distribute credentials.

1. Establish the intended environment, database/schema, authenticated operator and authorized change. Compare the actual connection identity/environment with the intended target before beginning. Do not copy connection secrets into logs or tickets.
2. Obtain the exact current business UUID from trusted current account evidence. Never locate a target by approximate email, substring, name or a previous account's identifier.
3. Begin a short SQL transaction, lock that account row, and require exactly one usable current account. Read existing grants. Abort on an unknown, erased or mismatched lifecycle.
4. Validate each requested permission against the catalogue and explicit instruction. Insert exact `(account_id, permission_code)` pairs or delete exact pairs; no broad replacement of all accounts, inferred privilege bundle or wildcard.
5. Compare the resulting grants and affected row counts with the requested before/after delta. Commit only that intended result, otherwise roll back. Re-read after commit to establish state; a lost acknowledgement requires a read before repetition.
6. Keep only the minimal authorized operational record needed to understand the change, without introducing a new application audit/history system or exporting account/personal data.

Use the same account-row lock as application grant checks and F05 erasure; configuration mutations then lock the configuration row. If erasure wins, grants cannot be reintroduced. Repeat login grants nothing. Recreation never restores privileged rows; an operator must independently authorize any new current UUID. Direct unsupported database edits fall outside this controlled procedure.

## HTTP admission and exceptions

Root backend security composes account authorization with configuration's maintenance read, without `accounts → configuration`. The maintenance decision runs once before a concerned HTTP use case; it is not a promise that the domain will accept or complete it.

| Request category                                                                                        | Maintenance behavior                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public access configuration                                                                             | Always readable if configuration storage is healthy; no authentication                                                                                            |
| Legal/privacy and F10/F11 support entry points                                                          | Exempt from maintenance; retain their own validations, authentication and complete-receipt semantics                                                              |
| F05 operator identification/bootstrap, current-account read (`GET /api/v1/me`) and current capabilities | Exempt solely to establish identity/permissions; ordinary authenticated access remains blocked                                                                    |
| F12 configuration reads/writes                                                                          | Exempt with the corresponding current manage permission; bypass permission is unnecessary                                                                         |
| Other ordinary public/private business operations                                                       | Read current maintenance; active refuses unless explicit bypass header and current usable account has bypass permission; normal action/resource rules still apply |
| Necessary provider callbacks, accepted obligations and F01 internal collection                          | Continue under their owners' authentication/lifecycle rules; never made public by this exception                                                                  |

Use explicit route/operation classification, not an exemption for all `/admin`, `/me` or callback-looking paths. A configuration lookup failure yields technical unavailability for ordinary requests; no permissive default. Public legal/support availability does not promise that a failed provider or database works.

`X-Blockout-Maintenance-Bypass: true` is a request choice, not an authorization credential. Missing/other values do not opt in. Active maintenance and absent usable bypass produce `503 MAINTENANCE_ACTIVE`; sensitive identity failures retain F05's authentication rules. A valid bypass permits admission only; a missing domain permission still yields 403. A permission revoked after admission can fail at final mutation. Maintenance activated after admission does not retroactively cancel the operation.

Native minimum versions govern mobile navigation, not trusted HTTP authorization. A caller-supplied version header cannot prove a binary version. F14 separately qualifies old API clients; neither this header nor bypass may justify incompatible server changes.
