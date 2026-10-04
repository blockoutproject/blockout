# F05 erasure and existing operations

**Trace:** F05 FR-026–FR-039, A23–A32; [model](../data-model.md), [F13 operations](../../003-shared-quality/contracts/operations.md).

## Acceptance and one ordinary execution

Require current authenticated ownership plus explicit confirmation and the original business UUID as `expectedAccountId`. Verify that UUID against the resolved account in the acceptance transaction. A delayed/repeated intent for a replaced account returns `ACCOUNT_CHANGED` without accepting new erasure; never retarget it to a successor automatically. No additional ten-minute authentication threshold. Explain irreversible effects and separate store billing; expose native store subscription management. Cancellation changes nothing.

In one local transaction, lock the original account/principal, retain the minimum original target references, set `DELETION_REQUESTED`, and coordinate local account/profile/follow/notification/attribution/right cleanup through each owner's in-process API. Do not invoke providers in that transaction. Removing a contribution's account association does not unhide content or erase independently justified moderation restrictions. A transaction failure rejects acceptance and performs no external deletion.

After commit, return 202 and dispatch one cleanup attempt on a standard bounded backend executor within F13 runtime conventions, independent of the mobile request cancellation. This is a direct invocation, not a broker or event bus. Catch/report submission failure and cleanup failures. A process crash before/while dispatch leaves the single durable state and requires manual diagnosis; no polling/restart worker is added. Duplicate acceptance is serialized and does not enqueue another run.

Use captured original targets. Request applicable Apple revocation through standard Auth0 deletion behavior as qualified; request RevenueCat cleanup through F09's adapter; delete owned photo objects through storage. Stop on an uncertain destructive provider result rather than blindly repeating it. Do not treat transaction rollback as an undo of a provider side effect. Complete final SQL removal/release only when the required cleanup/return conditions are established under the provider contracts and current F11 obligations. Provider asynchronous acceptance is not physical-erasure proof.

## Manual exception procedure

Use existing authenticated PostgreSQL, Auth0, RevenueCat, S3 and Grafana/IRM tools. No new administration UI, API or executable resume command is part of F05.

1. Inspect pending account UUID, acceptance time and original target references privately. The runbook supplies a read-only SQL query over `accounts.business_account` filtered by `status = 'DELETION_REQUESTED'`; do not export results into public issues or Discord.
2. Inspect relevant safe logs/incident and provider state with non-mutating provider tools. Establish the original identity/customer/object being targeted. RevenueCat v1 GET subscriber is **not** an absence check because it can create a customer.
3. Stop if an identifier may now address a successor or if asynchronous cleanup could affect restored rights. Resolve the provider-specific uncertainty through its standard support/tools under F09. No name/email guess, broad bulk deletion or unbounded polling.
4. Complete only required remaining provider/file/local erasure, using original targets and reviewed bounded transactions. Already absent objects are an attained result where the provider documents that meaning. Do not repeat a destructive call just because a response was lost.
5. Before releasing the original identity/customer correspondence, verify that no old cleanup remains able to target a successor. Record the outcome and any justified remaining retention privately in the existing support/incident record, then remove/minimize the pending account record. Never preserve a full profile for possible restoration.
6. Verify all unresolved requests within the incident's scope before resolving the IRM group. Another account's successful deletion does not close it. Record manual verification in the resolution note as F13 requires.

A retained account reference identifies the original request; it is not permission to delete any later account with the same subject. An operator repeating an obsolete SQL/provider operation must verify the original UUID/status and targets first. Do not provide an unguarded copy/paste provider deletion command as a universal retry.

## Provider result interpretation

| Boundary                     | Established fact and limit                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth0 DELETE user            | Documented 204 means Auth0 user deletion succeeded. Associated refresh artifacts are documented as removed. Standard access JWT validity remains F05's accepted limit; no added token blacklist/wait/claim.  |
| Apple through Auth0          | Qualify standard revocation on the actual connections, including existing linked identities. Missing provider credentials can require authorized manual handling; no automatic claim of complete revocation. |
| RevenueCat customer deletion | Request can be accepted asynchronously; interpret through the F09 adapter and actual documented guarantees. Do not label it instant physical erasure or cancel store billing.                                |
| S3 object deletion           | Match original owned key; respect versioned-storage/backup erasure obligations under F11/F13. Removing a URL/association alone is not file erasure.                                                          |
| SQL absence                  | Establishes absence only in this database, not provider completion or legal compliance of every retained copy.                                                                                               |

No Auth0 token-expiry waiting period is selected. Pending dangerous provider cleanup can still prevent exposed recreation/restoration until resolved. These are different conditions. Qualify RevenueCat alias/deletion/restore behavior before enabling that boundary; unsupported guarantees return to a decision, not a supervisor.

## Incident route

Reuse F13 structured logging, Alloy, Grafana Alerting, IRM and the existing per-environment Discord channel. Confirmed failure has no added intentional pending delay. Stable grouping is environment + `accounts` + `account-erasure` + `cleanup`; never a user/customer/request identifier. An opaque technical reference in private diagnostics supports finding the affected operation without exporting targets or personal information.

Repeated failures join the existing group; no reminders or custom notification queue. Error-log expiry, disappearance of a series, silence and success for another account are not recovery. With no reliable positive counterpart, an authorized operator verifies pending state/provider outcomes and resolves using F13's existing manual-evidence path. Ordinary crash/telemetry alerts and investigation handle interrupted execution; no F05-specific periodic pending-work supervisor is introduced.

## External requests and restoration

F11's existing public privacy page has a prominent `#account-deletion` section, a usable contact email and scope/process/billing information; the exact deployed URL/contact are environment inputs to qualify, not fabricated values. Google Play's listing links directly to that section under F14. No separate website, form or portal.

Receiving an email is not accepting erasure. Verify ownership proportionately under F11; minimize evidence and keep it private. For a verified external request, the operator uses the same documented account-block/local cleanup transaction and original-target procedure through existing tools. The user need not reinstall or regain application access. Confirm the established outcome through the existing contact process, not a new in-app tracking system.

Before restoring backups, apply current deletion/privacy/right restrictions with F11/F13. Keep affected capabilities closed if current obligations cannot be established. F14 migration reconstruction is not voluntary deletion and does not relax its identity/paid continuity obligations.
