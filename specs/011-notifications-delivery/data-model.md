# Data model: Notifications, inbox and push

## Match announcement facts

One F07-owned record keyed by the F02 match UUID holds processed live, result and post-result-link categories, plus composition fixed at result acceptance. These facts contain no account reference, message, score, editorial variant, read state or delivery payload. Use ordinary string enums/booleans for these finite concepts, not an append-only event journal.

- A live announcement consumes only live.
- Plain result consumes result and fixes plain composition.
- Enriched result consumes result and post-result-link together and fixes enriched composition.
- A later qualifying publication consumes post-result-link if still available.
- Initial discovery/reconstruction is distinguished by trusted F02 context; it must not turn existing historic facts into a new announcement on a later unchanged observation.
- Every processed category is recorded even with no recipients. Corrections, hiding/restoration, contribution replacement/reactivation and personal purge cannot clear it.

The shared match lock protects composition and transitions. Hiding does not delete facts. They may leave with actual match erasure under its owner, never with personal account erasure. If a restore lost facts, the accepted exceptional duplicate limit applies; it does not waive erasure/expiry obligations.

## Personal notification

| Field                  | Meaning and constraints                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | UUID, immutable personal entry identity.                                                                                                                            |
| `accountId`, `matchId` | Existing owner identities; account erasure deletes the entry.                                                                                                       |
| `family`               | Plain result, enriched result, live link or post-result link; fixed at creation.                                                                                    |
| `variant`              | Stable selection among the family's French editorial variants. Unknown sporting values use appropriate fallback wording without changing family or inventing facts. |
| `createdAt`            | Non-null UTC instant of original creation, never reset by reading, correction, visibility or delivery.                                                              |
| `read`                 | Non-null false initially; only transition is false → true. Repeated true is a no-op.                                                                                |

Unique `(accountId, matchId, family)` supplements consumed match facts. The latter also prevent contradictory plain/enriched result creation and survive personal purge. Index owner/date/UUID for keyset reads, owner/read for summary selection and creation time for daily expiry. Actual generated migration/index behavior is qualified on PostgreSQL; no synchronized count column.

Current match/pool/team/division/result presentation comes from owner-controlled read projections. No serialized sporting DTO, source document, video URL history, duplicated score or separately synchronized rendered text is stored here. Public viewability is a database predicate before paging/counting. Required internal creation occurs in the sporting transaction; projections of corrections need no per-entry content rewrite.

A short consistent summary computes count plus minimum `createdAt + 29 elapsed days` over consultable unread entries. No expiry is returned at zero. All reads/sends exclude entries from 29 days; daily physical deletion includes hidden/read rows, normally removing them before 30. F05 erasure is immediate and supersedes retention. No permanent per-recipient delivery/announcement history remains after purge.

## Push subscription

| Field            | Meaning and constraints                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `id`             | UUID created for one sign-in association; new after every new sign-in, including the same account.       |
| `installationId` | Random installation UUID, independent of account/OS version. Not an authentication secret.               |
| `accountId`      | Usable original business account UUID, verified from the authenticated request.                          |
| `expoPushToken`  | Private replaceable destination, scoped to the configured project/environment; never logged.             |
| `revision`       | Native JPA version used internally to guard stale receipt invalidation. Not a public session identifier. |

Unique installation and destination constraints prevent equivalent active bindings. PUT replaces the complete association and removes conflicting old bindings in one local transaction; affected account rows use sorted locking. An unresolved concurrent uniqueness conflict rolls back without partial reassociation and is retried only at a normal registration occasion. Do not use a new SQL upsert engine. A successful registration advances revision, including unchanged-address re-registration, using native optimistic force increment where necessary. Token rotation retains this connection ID; a new sign-in uses another ID. DELETE removes only the exact owner/association, so a delayed old DELETE cannot remove its replacement.

An in-flight old registration may be the last server-accepted registration: no client-time ordering or separate revocation registry is claimed. F05's accepted best-effort logout limit applies. Erasure deletes all account bindings atomically, while other accounts/installations remain.

A receipt invalidates only the association ID/revision/address captured for that send, using a conditional repository operation or ordinary optimistic version check. Once replaced, the old target cannot invalidate the new binding. No external call is inside this transaction.

## Ephemeral processing and mobile data

After-commit send context references newly created entries, the original eligible follow relation IDs, and selected association IDs/revisions. Ticket IDs retained for the single delayed receipt check live only in process memory. A restart discards this work; it does not change inbox persistence or trigger replay. These are transient integration values, not additional database entities.

The mobile query cache holds validated responses by account/session and continuation. Read confirmations remain monotone within that cache, and expired/known-restricted content cannot be restored by older responses. No read journal or complete inbox mirror is added. Logout/account changes clear private queries and local badge, regardless of best-effort disassociation outcome.

The installation and current connection UUIDs are device metadata; the Expo address is obtained through the native SDK. Neither provides account authority, and no retained credential exists solely to clean up a failed logout.
