# Manual operations

This guide covers local application diagnosis and authorized business operations under the owning specifications. Use task-owned processes, disposable qualification data and existing private provider/support tools. Each external or destructive action retains its own authorization and evidence requirements; these instructions perform none of them.

## Owner-only action grants

Only the product owner may assign or withdraw privileged actions, through an independently authorized database connection. A delegated operator receives application capabilities only: no SQL credentials, assignment endpoint or right to redistribute grants. Confirm the environment and current deployment, verify the target privately through F05, and use its **current business UUID** (`account.id`), never an email, Auth0 subject, old UUID or inferred replacement. Keep identifiers, connection material and results private; there is no public grant ledger.

The current [backend action definitions](../../apps/backend/src/main/java/com/blockout/backend/access/domain/Permission.java) and [migration](../../apps/backend/src/main/resources/db/changelog/access.xml) own these exact values:

| Persisted `account_permission.permission` | Scope                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `maintenance.manage`                      | F12 maintenance content and activation                                    |
| `application-versions.manage`             | F12 minimum versions, messages and store links                            |
| `maintenance.bypass`                      | F12 explicit personal maintenance bypass                                  |
| `collection.manage`                       | F01 source, season and collection commands                                |
| `sporting-presentation.manage`            | F02 sporting presentation and club contacts                               |
| `sporting-classification.manage`          | F02 classification                                                        |
| `division-lifecycle.manage`               | F02 division creation and activity                                        |
| `stream-links.moderate`                   | F08 complete stream-link moderation, including publication and withdrawal |

Each grant is independent. None delegates F09 provider-console powers or F11 legal publication, which remain owner-only through their existing operations. Ordinary capabilities need no grant row and retain resource, ownership, age and quota conditions, including F08's seven days and its sole moderation exception. No role, `isAdmin`, startup grant, owner table, grant history or delegation mechanism is involved.

Prepare one of the following short scripts in a private temporary file, then run it with native `psql`. The operator must identify an already authorized libpq connection/service; `owner_connection` below is a fictitious service name, not a provisioned account or connection string. Use protected libpq credential handling without shell tracing or credentials in arguments. The UUID and permission are fictitious examples: replace them privately after verification and choose exactly one supported value above. Preparing this runbook authorizes no real assignment.

```sh
psql -X 'service=owner_connection' -v ON_ERROR_STOP=1 \
  -v account_id=00000000-0000-4000-8000-000000000287 \
  -v permission=maintenance.manage -f /private/path/grant.sql
```

Grant (`grant.sql`):

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT id AS locked_account_id FROM account
WHERE id = :'account_id'::uuid FOR UPDATE
\gset
INSERT INTO account_permission(account_id, permission)
VALUES (:'locked_account_id'::uuid, :'permission')
ON CONFLICT (account_id, permission) DO NOTHING;
COMMIT;
SELECT EXISTS (SELECT 1 FROM account_permission
  WHERE account_id = :'account_id'::uuid AND permission = :'permission') AS granted;
```

For withdrawal, run the same `psql` invocation with `-f /private/path/revoke.sql`:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT id AS locked_account_id FROM account
WHERE id = :'account_id'::uuid FOR UPDATE
\gset
DELETE FROM account_permission
WHERE account_id = :'locked_account_id'::uuid AND permission = :'permission';
COMMIT;
SELECT EXISTS (SELECT 1 FROM account_permission
  WHERE account_id = :'account_id'::uuid AND permission = :'permission') AS granted;
```

Execute each file as one batch; do not leave a transaction open while inspecting identity or calling a provider. Native [`\gset`](https://www.postgresql.org/docs/18/app-psql.html#APP-PSQL-META-COMMAND-GSET) requires exactly one row: an absent account stops the noninteractive `ON_ERROR_STOP` script and disconnect rolls back its transaction. This also refuses a missing revoke target, rather than silently targeting a replacement. The primary key makes a repeated grant a no-op; deleting an absent association on an existing account is also a no-op. After commit, reread the association (`granted=true` for grant, `false` for withdrawal) and the current `/accounts/me` capability. An uncertain result requires this read before any explicit repeat; a prior projection or visible button authorizes no later effect.

Grant-only transactions take only the target account lock. Protected commands take domain roots first in their owner's order, then all concerned accounts in UUID order, and read grants **after** those locks; they acquire no sporting root afterward. Under [READ COMMITTED](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED), the post-lock grant statement sees a withdrawal that committed while the command waited. An admitted short transaction may finish before a waiting withdrawal; a command ordered after withdrawal is refused without effects. No remote cancellation or immediate invalidation of an already returned response is promised.

[F05 erasure](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) removes the original account and its grants, while global `access_settings` survive. Explicit recreation gets a fresh UUID with no inherited grants. An old UUID-targeted command cannot act on it; an otherwise valid same-subject token may identify the replacement only under its current rights. See [F12 T011 qualification](../../specs/013-administration-app-configuration/quickstart.md#direct-authorization-and-manual-grant-lifecycle) for the disposable-data proof and its provider/native limits.

## Ordinary owner recovery

Use these existing owner paths after interrupted processing without resetting retained data. Confirm the local target, running revision, affected source/control/resource and current authorization. Keep original command/cycle identities and private evidence; a lost response does not prove cancellation and a cleared technical error does not prove business recovery. The [A11–A13 qualification](../../specs/003-shared-quality/quickstart.md#ordinary-owner-recovery) separates tested application behavior from native/provider evidence.

1. **Inspect acquisition and integration separately.** Follow [collection inspection and explicit recovery](#collection-inspection-and-explicit-recovery) to read the original cycle, control, source and current incarnation. Read the exact scope/stage/phase outcomes, accepted/rejected counts and latest useful success through the [F01 application diagnostics](../../specs/001-source-acquisition/quickstart.md). A successful supplier read does not prove F02 accepted it; a completed passage can contain partial failures. Retain committed items, previous values/freshness for rejected or unreadable items, and current identities. Missing terminal evidence stays uncertain. Never resend an ingestion payload merely because its response was lost.
2. **Choose an eligible ordinary pass.** The next normal F01 opportunity rereads current sources and F02 truth. An operator with current `collection.manage` may use the existing `requestCollection` action for an enabled, launched family in an ACTIVE season, using its freshly read control revision. It returns existing running work or one pending request, not a promise of successful completion. A stale revision requires rereading; pause/resume does not clear an uncertain operation. If inspection requires incarnation replacement, use only the collector restart and follow-up checks in the [existing procedure](#collection-inspection-and-explicit-recovery). Closed seasons remain closed; no old observation, source edit or restart unlocks accepted bindings, restores removed classification or overrides inactive divisions. Manual corrections use the owning F02 administration action with current grants/revision, never a broad SQL rewrite. Inspect the subsequent affected outcome before calling the scope recovered.
3. **Catch up derivatives without rewriting truth.** Use [search projection and reconstruction](#search-projection-and-reconstruction): the serving backend's after-commit work and ordinary full run reread current PostgreSQL. A separately authorized restart of that same serving backend triggers its normal startup reconstruction. Operations expose no public rebuild endpoint or standalone reconstruction command. Preserve all usable aliases during incomplete/uncertain preparation; current SQL hydration still filters hidden, unclassified or inactive resources. Without a usable generation, search is unavailable rather than successfully empty. Observe a complete published generation and actual current searches; a targeted update, bulk envelope or reachable API is insufficient.
4. **Preserve consumed effects.** F02/F08 producers and F07's ordinary due-link pass retain `match_announcement` facts independently of personal inbox rows. Search reconstruction changes derivatives only: it neither resets those facts nor replays notification/push handoff. Keep original personal UUIDs, read state and creation times; [ordinary retention](#notification-retention-failure) removes expired rows without making announcements eligible again. Do not clear facts to repair a projection or recreate an inbox from sporting history. An ordinary rerun retains facts; F07 permits an exceptional duplicate only when a restoration genuinely lost match-level facts. Any reuse of retained data must first satisfy [current privacy, rights and expiry checks](#reconcile-before-access-or-sends), and that exception never permits expired/erased personal rows or an invented delivery confirmation. A committed announcement with a failed transient push handoff is not a pending push retry.

The owners' current state and existing private diagnostics provide the recovery evidence. There is no additional checkpoint, ledger, recovery service or lock/job protocol. Bounded initial-reconstruction launchers remain with [F01 T064–T069](../../specs/001-source-acquisition/tasks.md#phase-9-user-story-7--reconstruct-obtainable-history-through-a-bounded-operation-priority-p2); [F13 retained-data checks](../../specs/003-shared-quality/quickstart.md#current-restrictions-and-compatible-data) apply current restrictions and code/schema compatibility.

## Search projection and reconstruction

F04 uses one web-backend scheduler for after-commit scopes and full rebuilds: startup, then a configurable one-hour delay after completion. Failed/lost transient work waits for the next full run. Non-web operators never start a second writer. There is no durable queue, checkpoint, retry operation or rebuild endpoint. An authorized restart of this environment's serving backend starts the same ordinary reconstruction path; stop the old instance before starting its replacement.

Inspect private ECS `operation=search_projection`, `stage=targeted|submission|rebuild|cleanup`, `outcome`, bounded `affected_count`, safe exception `reason` and `last_success_at`. Failed bulk diagnostics use `affected_count` for submitted items and `partial_count` for explicitly successful returned items. The last-success epoch is zero before this process confirms a complete refreshed generation; targeted success never advances it. Native Micrometer `search.projection.last.success.time` exposes that epoch in seconds; `search.projection.runs` counts outcomes by bounded `action`/`outcome` through F13's ordinary application instrumentation. No query text, city/contact, credentials, raw engine error or document is collected.

Before any separately authorized cleanup or recovery, read the three current aliases using native `GET /<environment-prefix>-*/_alias`. Every club/team/pool alias must resolve to its usable generation. A response lost during `POST /_aliases` leaves an uncertain outcome: reread aliases, but an old-state read cannot prove that the switch is no longer in flight. If all three candidates are not confirmed active, retain every temporary generation until the next confirmed full run. The writer cleans only after a confirmed complete publication and a fresh metadata read, at most twelve unaliased UUID generation indexes per run in its owned namespace. If metadata cannot be read, it deletes nothing. Any index with an alias is preserved. Cleanup failure does not invalidate a confirmed generation or claim successful deletion. Never clear active indexes or delete by a broad environment wildcard.

After authoritative data changes or reconstruction, use the same ordinary search rebuild path. Verify actual current filtered searches and alias targets; an HTTP bulk envelope, scheduler run or reachable API alone does not establish usable search. Keep an affected capability unavailable where current visibility or a complete usable generation cannot be established.

## Private account cleanup

This is F05 T034's manual handling of observed private cleanup failures under the [accepted erasure boundary](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution). Use safe backend logs and existing private database, Auth0, RevenueCat and support tools. This guide neither activates cleanup nor authorizes provider deletion. Obtain authorization for the exact environment and original targets before acting; absent access, original-target evidence or a qualified private support destination leaves the action pending. Never post diagnostics or attachments to this public repository or a public notification.

1. **Locate the original failure privately.** Inspect backend `operation=account_cleanup`, `outcome=manual_attention` in the task-owned process output or its authorized private log destination. Read the original business UUID, original provider reference if present, safe reason and event time. Compare the original runtime configuration and revision with verified private evidence: `scope=disabled` denotes disabled cleanup, not an environment named disabled. Keep each provider/target outcome separate; one failure proves nothing about another attempt. Logs are not an exhaustive deletion inventory.
2. **Establish targets before any mutation.** Use the captured reference and trusted private continuity/support evidence, never an email search, identifier-format guess, alias expansion or current principal-to-account mapping as a replacement target. This schema captures the V2 UUID customer only; [F14's private inventory](#private-continuity-inventory) owns necessary historical customers, including records left after purchase transfer. A missing reference requires that owner's evidence before cleanup; do not reconstruct a deleted profile or create a mapping registry. Confirm the original issuer/tenant and RevenueCat project from the event's runtime configuration and verified evidence, rather than assuming today's defaults still describe that event.
3. **Check present use on the actual environment.** With authorized read-only database access, verify the original row is absent and whether its established principal now has another business UUID. On the verified private connection, use `psql -X --set=ON_ERROR_STOP=1`, supplying the three variables privately from established evidence:

   ```sql
   SELECT EXISTS (
            SELECT 1 FROM account WHERE id = :'original_account_id'::uuid
          ) AS original_present,
          EXISTS (
            SELECT 1 FROM account
            WHERE issuer = :'original_issuer' AND subject = :'original_subject'
              AND id <> :'original_account_id'::uuid
          ) AS principal_reused;
   ```

   If the original row exists, investigate the account/runtime inconsistency before external deletion. If a new account uses the principal, or a provider target/alias is currently used by another account, do not delete it on the old failure's authority: resolve the current situation privately with the account/provider owner. Check current provider evidence as well; an absent SQL row alone does not establish safe external ownership. If the issuer/subject is missing, leave that check unavailable until trustworthy evidence exists. These reads are observations, not locks against sign-in or provider reuse.

4. **Resolve the safe reason without replaying business erasure.** `missing_configuration` requires the environment owner to verify the disabled setting, credentials/access and exact project/tenant configuration through the [existing backend inputs](../../apps/backend/.env.example); it is not permission to enable cleanup globally. `missing_target` requires established original evidence. `unsafe_scope` requires resolving the actual scope discrepancy, never relaxing the guard. `unavailable_or_uncertain` requires a current non-creating exact-target provider read before deciding on an explicit manual action. Keep an unavailable read or lost acknowledgment uncertain; never resend the original account DELETE to repair providers, since an absent-original DELETE has no external effects.
5. **Inspect and, only when authorized and safe, clean Auth0.** Read the exact original principal through [Management API](https://auth0.com/docs/api/management/v2/users/get-users-by-id) `GET /api/v2/users/{id}` with `fields=user_id,identities` and `include_fields=true`, URL-encoding the established ID. Verify returned ID, configured issuer/tenant and every linked identity. The dedicated database test scope requires provider `auth0` and its exact configured connection for every identity; refuse social or cross-connection principals. Social cleanup retains the implemented Google/Apple provider/connection scope and requires its own verified authorization. After the current-use check and specific authorization, use [Management API DELETE](https://auth0.com/docs/api/management/v2/users/delete-users-by-id) for that same original ID. HTTP **204** acknowledges removal; exact-target **404** establishes absence without another deletion. Auth0's [Apple revocation behavior](https://support.auth0.com/center/s/article/deleted-apple-users-receive-email-service-id-has-revoked-your-sign-in-with-apple-account) covers associated Apple refresh tokens; record applicable revocation evidence or its remaining uncertainty privately, without collecting tokens. Do not delete a global Google/Apple account or promise immediate invalidation of every signed token or other device's SDK state.
6. **Inspect and, only when authorized and safe, clean RevenueCat.** Use the non-creating [v2 customer read](https://www.revenuecat.com/docs/api-v2/customer#get-a-customer), `GET /v2/projects/{project_id}/customers/{customer_id}`, on the verified project and exact established original reference. Do not use SDK login or a create-if-missing read for inspection. Check current use and relevant transfer/alias evidence privately; historical records after transfer remain separate original targets only when established by F14. The shared project has no sandbox customer namespace: test cleanup requires an individually verified test-only customer in the exact configured allowlist, not an ID prefix or a sandbox receipt alone. Do not delete a replacement/current customer to clear an old diagnostic. After authorization and verification, [v2 DELETE](https://www.revenuecat.com/docs/api-v2/customer#delete-a-customer) of that exact reference returning **200** acknowledges queued removal; **404** establishes absence. Trust queued acceptance without polling or repeated DELETE. Customer removal does not cancel store subscriptions, refund purchases or restore/transfer paid rights; [F09 recovery](#pro-restoration-and-assisted-recovery) owns those separate actions.
7. **Keep outcomes and necessary evidence privately.** Record only original references still required, environment/provider, verification source/time, authorized action and acknowledged/absent/uncertain result in the existing private support case. Retain minimum unresolved evidence only while its purpose remains justified under the [rights procedure](#manual-rights-and-club-contact-restrictions); no fixed diagnostic-log window is prescribed. Do not copy profiles, photos, credentials, tokens or raw provider payloads. Log silence or disappearance proves no repair, and no guaranteed operator response time is introduced.

An interruption after local commit but before diagnostic emission can leave cleanup unreported. Handle independently discovered obligations through the same private verification, without declaring log silence complete coverage or adding an outbox, ledger, polling, replay or automated repair. Concurrent return during an in-flight provider delete retains ordinary errors and manual assistance; provider reads offer no atomic incarnation guarantee. Do not roll back business deletion, restore old data/rights or block new registration pending cleanup. Actual provider/private-case execution remains [F05 T036](../../specs/005-accounts-identity/quickstart.md#erasure-and-return); this procedure is preparation, not that qualification.

## Bounded initial sporting reconstruction

F01's `initial-reconstruction` backend profile executes one explicit operator action, then exits without HTTP adapters, provider reads or F04 scheduling. It reuses the existing F01/F02 services and collector; it adds no second writer, bootstrap permission, CLI framework or reconstruction scheduler. Use the [bounded command and isolated rehearsal](../../specs/001-source-acquisition/quickstart.md#bounded-initial-reconstruction) for exact options and evidence limits.

1. Verify the separately authorized destination, migrated database, deployed JAR, single collector and operator's current `collection.manage`. Keep connection/operator values and output private. Export the backend environment through the [existing local setup](../../README.md#local-development); do not alter reference dotenv files for isolation.
2. Run `action=prepare` for each explicitly supplied sporting start year and official provider/root/candidate URL. Reuse canonical seasons and labels. Obtain ordinary collector validation, exact seasonal confirmation when needed, and the existing F02 classification. An unavailable or unqualified archive remains a gap; no current-feed substitution or archive crawler is available.
3. Run `action=request` with the current season revision and exact source-binding UUIDs. Optionally supply nonempty `scopes` for an identified narrower failure. Unknown options and blank retry lists are refused. Read the returned pending identities after uncertainty; never assume start, replay a write or allocate a replacement cycle blindly. First admission locks qualified references, freezes only that selection and keeps history PREPARING without periodic launch. Discovery alone schedules no follow-up.
4. Read `action=report`, including every bounded coverage page. Preserve requested, obtained, rejected and unavailable outcomes independently by source/scope/stage/phase. Missing counts remain unknown; completion does not imply integration success. Targeted retry changes its selected current results only; periodic results do not overwrite the initial report. Inspect current source qualification, original cycle and control state alongside it.
5. Have F14 review remaining gaps before any separately authorized transition decision. `action=close` requires the exact canonical label and current revision, is definitive, preserves history and locks, cancels unstarted work and permits only already admitted work to finish once. It changes no other season or seasonless control. An uncertain acknowledgement requires a current-state read before a further decision.

The serving backend's [ordinary complete F04 rebuild](#search-projection-and-reconstruction) covers these PostgreSQL changes; verify the resulting current filtered searches and aliases there. This command never starts an index writer. Production reconstruction, resets, source/provider changes, logo reassociation and cutover remain separately authorized F14 operations.

## Auth0 V1 default-role isolation

[F14 T019](../../specs/014-v1-v2-transition/tasks.md) and [#162](https://github.com/blockoutproject/blockout/issues/162) restrict the existing `assign-default-role` post-login Action to the retained V1 native client. Obtain authorization for this exact tenant/Action operation before editing or deploying it. V2 permissions remain PostgreSQL-owned; no replacement role endpoint, identity linking, credential rotation or V1 retirement is included.

1. Confirm the V1 native application's exact client ID from its current Auth0 registration and production callback identities. Record the bound Action's deployed version, runtime and dependencies, and keep a recoverable source copy privately outside this public repository. Do not open or copy secret values. Stop if another draft or concurrent revision differs from the reviewed source.
2. Insert this guard as the first executable statement of `exports.onExecutePostLogin`, before reading secrets, roles or user data. The public client ID below was verified for the retained V1 registration; reverify the target before another execution. Match neither the display name nor a client-ID prefix.

   ```js
   if (event.client.client_id !== "L3AotVuEqikyNrCQexkf6S3D1LZjk69E") return;
   ```

3. Keep V1's executable body unchanged. With synthetic data and controlled HTTP, verify its existing-role claim, encoded assignment request, five-second timeout, claims after assignment and login-blocking assignment failure. Verify non-V1 clients with and without prior roles produce neither legacy HTTP nor legacy claims, even when legacy secrets are unavailable. Auth0 documents the trusted [initiating client](https://auth0.com/docs/actions/reference/post-login/post-login-event-object#event-client) and [controlled Action tests](https://auth0.com/docs/customize/actions/unit-test).
4. In Auth0's native tester, exercise the candidate with a non-V1 client, both with and without roles, and V1 with an already assigned synthetic role. Do not send a synthetic roleless V1 identity to the real assignment endpoint: that test can perform a production write. Controlled tests establish their own boundaries, not a real mobile login or population continuity.
5. Deploy the reviewed version of the already-bound Action and verify its published version and unchanged post-login binding. Have the owner perform a real V1 sign-in with the existing application/account, then inspect the corresponding Auth0 outcome privately. Record safe version/results and remaining limits in the owning [qualification guide](../../specs/014-v1-v2-transition/quickstart.md). Full V2 native sign-in and prior-role categories remain T021-owned.
6. If the scoped change breaks V1, use Auth0's native [Version History / Revert](https://auth0.com/docs/customize/actions/manage-versions) for the recorded prior version, verify its deployed binding and repeat the affected check. Reread uncertain deployment results before repeating an operation; create no retry service or extra Action.

## Manual rights and club-contact restrictions

This is the bounded F11 [rights procedure](../../specs/004-advertising-privacy-legal/spec.md#user-story-6--exercise-my-rights-without-depending-on-an-account-priority-p1), prepared for separately authorized operations. The controller must designate an authorized operator and supply a real monitored email contact before legal publication. This repository establishes neither that contact nor access to a qualified private support destination or provider tools. If any required contact, evidence, permission or invocation tool is unavailable, keep that action pending and identify its owner; never substitute a public issue or claim execution. [T038/T039](../../specs/004-advertising-privacy-legal/tasks.md#phase-8-user-story-6--exercise-rights-without-depending-on-an-account-priority-p1) own contact/rights qualification and actual legal-content review.

1. **Receive and bound the request privately.** Accept requests without a session, including inaccessible or erased accounts. Use the operational email and the existing authorized private support process, recording receipt date, requested right, affected scope and operator. Clarify only what is needed; the [category matrix](../../specs/004-advertising-privacy-legal/spec.md#categories-purposes-and-responsibilities) owns purposes and recipients. Do not copy contact values, attachments, provider documents or personal references into this public repository, diagnostic logs or Discord.
2. **Verify proportionately before disclosure or mutation.** Establish that the requester concerns the specified data or has authority to act. Use the existing owner's verified account/provider context or necessary private supporting evidence appropriate to the request. A supplied reply address, name, club reference, account UUID or purchase claim alone proves no ownership. Do not match accounts by email, transfer identity or systematically collect identity documents. For reasonable doubt, request the minimum additional evidence and protect third parties; unavailable proof keeps disclosure/destructive action pending, without requiring a new account.
3. **Identify the actual copies and owners.** Record necessary data, purpose, authorized recipients, active/local/provider copies, applicable retention criterion and the requested operation in the existing private case. Route account/profile erasure and original Auth0/RevenueCat targets to [F05](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution), paid/gifted entitlement evidence and decisions to [F09](../../specs/006-pro-subscriptions/plan.md), club fields to F02 below, and tickets plus every linked file to [F10](../../specs/012-reports-feature-suggestions/plan.md). Include F06 follows, F07 destinations/inbox, F08 contributions/moderation, F03 location, F11 local choices and F13 application diagnostics when affected. Other individuals, including match referees, receive manual review through their owner; there is no generic person suppression or directory.
4. **Execute only the authorized owner action.** Keep per-copy confirmed, pending and limited outcomes distinct. Follow [F05's erasure sequence and provider acknowledgments](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for business-account deletion and original-target cleanup; a failed recipient action remains pending. Verify original targets and current use before any separately authorized provider deletion; a replacement business UUID is never the old cleanup target. Use the safe owner diagnostics and [private cleanup procedure](#private-account-cleanup) for uncertainty. A data request neither cancels store billing nor grants a refund, subscription transfer or gift; F09 retains those decisions. Apply the [ticket/file handling steps below](#private-support-intake-and-replies) for support; closure, account deletion and unlinking establish no attachment erasure.
5. **Respond and retain only justified evidence.** Communicate confirmed actions, pending recipients, reasons for any limitation and next owner action through the authorized private reply channel. For GDPR requests, respond without undue delay and within one month of receipt; if complexity/number of requests justifies up to two further months, explain the extension and reasons within that first month. A refusal also explains reasons and available complaint/judicial remedies. Use the [CNIL rights guidance](https://www.cnil.fr/fr/repondre-une-demande-de-droit-dacces) and [GDPR Article 12](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng) for the applicable case; these legal deadlines create no technical on-call or general ticket-response guarantee. Review necessary request/verification evidence against its purpose and remove it when no longer justified. F05 original-target references belong only in protected cleanup logs or still-justified private support handling. Notification expiry sets no other category's lifetime; this guide prescribes no hosted log-retention policy.

### Private support intake and replies

Use [F10's existing private intake](../../specs/012-reports-feature-suggestions/plan.md#complete-submission-and-provider-boundary) and [F11's prepared A20–A24 cases](../../specs/004-advertising-privacy-legal/quickstart.md#support-privacy-cases). These instructions prepare manual handling; they do not qualify a destination, send a reply or execute erasure. Before real use, the responsible operator must qualify actual private ticket/file access and the provider's applicable erasure procedure under the [F10 prerequisites](../../specs/012-reports-feature-suggestions/quickstart.md#prerequisites). Missing access or provider action stays pending with its owner.

1. **Check access and purpose.** Use only the configured private support repository and personnel authorized to handle the request. Verify both GitHub repository access and access to actual attachment bytes; a rendered image or file URL is no authorization proof. Application administration grants no GitHub/file permission, and repository access grants no F02/F05/F09 intervention rights. Consult only the content/files needed to understand and answer the case. Keep requests, addresses, private case/file URLs, attachments and credentials out of public issues, this repository, diagnostics and Discord. Discord contains only the configured generic signal and private request-list link. Do not export request data to a parallel case store or independent backup.
2. **Distinguish intake from handling.** Inspect the current case, its configured intake labels and every selected attachment through the authorized private tools. Text-only intake may be complete directly; image intake is complete only after all files and complete marking succeed. An incomplete label, both intake labels, absent marking or uncertain/missing files is not a finalized request. Issue open/closed state is independent of intake completeness. Do not infer receipt from a Discord message, issue creation or a submitter's screenshot of confirmation.
3. **Handle incomplete or exceptional duplicate attempts manually.** Leave incomplete attempts recognizable and private; do not mark them complete, replay uploads, silently omit a file or treat them as accepted work. Inspect available evidence in the existing private cases and close an incomplete attempt as such when appropriate. A response can be lost after real acceptance; a later explicit send can therefore leave another case, possibly with corrected content and a different request UUID. Compare only necessary content/context/files to establish an exceptional duplicate, preserve distinct or corrected information in its existing case, and close only the redundant case manually. Shared email alone proves neither duplication nor ownership. Do not add automatic matching, a receipt search service, retry worker or recovery ledger; closure of an incomplete or duplicate case deletes no bytes.
4. **Reply to the supplied address.** Use the request's `replyEmail` for necessary handling and response, not marketing or advertising. Format validation and prefill prove neither mailbox possession nor deliverability. Limit the reply to the request and withhold third-party/private account information until the proportionate verification above permits disclosure. A declared email, UUID or purchase claim authorizes no recovery, linking, erasure or entitlement transfer. Continue necessary exchanges through the authorized email channel; no automatic acknowledgement, application dialogue/status, guaranteed ordinary response time or promise to implement a suggestion is added. Close the issue manually after handling. If only the generic secondary alert failed after complete receipt, investigate the safe operational signal without requesting another submission.
5. **Treat closure and erasure separately.** GitHub remains working history with no periodic purge or automatic post-closure deletion deadline; this does not justify unlimited personal-data retention. For an applicable rights request, use the manual rights procedure above to identify the ticket, every affected file/copy and authorized recipient, including distinct provider locations and already-closed cases. Verify the authorized ticket operation and file-byte erasure independently through the applicable provider procedure. Removing a link, closing/deleting an issue or deleting/unlinking a business account alone proves no attachment-byte erasure. Keep failed, unavailable or unconfirmed recipient/file actions pending, communicate confirmed results and justified limits separately, and retain only necessary private evidence while its purpose remains justified. F10 cases and attachment bytes remain provider-owned; the application database proves neither their availability nor their erasure.

### Local support attachment CLI

The host-run backend resolves `gh` through the `PATH` inherited when its JVM starts. Use the [official GitHub CLI 2.102.0 release](https://github.com/cli/cli/releases/tag/v2.102.0), without replacing another task's global CLI. From this worktree's repository root, this macOS arm64 example installs an isolated copy in ignored `local/` and verifies its published checksum:

```sh
support_cli_dir="$PWD/local/tools/gh-2.102.0"
mkdir -p "$support_cli_dir"
curl --fail --location --connect-timeout 10 --max-time 120 \
  https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_macOS_arm64.zip \
  --output "$support_cli_dir/gh_2.102.0_macOS_arm64.zip"
curl --fail --location --connect-timeout 10 --max-time 60 \
  https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_checksums.txt \
  --output "$support_cli_dir/gh_2.102.0_checksums.txt"
(
  cd "$support_cli_dir" || exit 1
  awk '$2 == "gh_2.102.0_macOS_arm64.zip" {print}' gh_2.102.0_checksums.txt > selected-checksum.txt
  test -s selected-checksum.txt && shasum -a 256 --check selected-checksum.txt && \
    unzip -oq gh_2.102.0_macOS_arm64.zip
)
export PATH="$support_cli_dir/gh_2.102.0_macOS_arm64/bin:$PATH"
command -v gh
gh --version
gh issue edit --help
```

For another host, select that host's archive from the same official release and verify its matching checksum before extraction. Check that the resolved executable is the isolated copy, `gh --version` reports `2.102.0`, and `gh issue edit --help` exposes `--attach`. Start the task-owned backend or its Maven checks from this same environment; changing a later shell's `PATH` does not update an already-running JVM. The [local backend workflow](../../README.md#local-development) remains the launcher, with no support service, deployment image or durable upload volume added.

Supply the support destination and its repository-scoped token through private Spring external configuration only after the separate private-provider authorization and qualification. `GitHubAttachmentProcess` passes the token as `GH_TOKEN`, fixes `GH_HOST=github.com` and disables prompts; the [official environment documentation](https://cli.github.com/manual/gh_help_environment) describes credential precedence. Never put credentials in arguments or a shell command history, or print the process environment. Controlled checks use fictional credentials and do not contact a real support destination.

The committed support settings bound HTTP connection/read waits to 3/5 seconds and the CLI completion wait to 30 seconds. The adapter then allows one second for normal child termination and five for forced exit before allowing temporary-input cleanup. These process limits also bound a stalled CLI network operation; the REST client uses its own HTTP waits, disables automatic retries and refuses redirects. A nonzero result, timeout or interruption refuses complete receipt even when private partial effects may exist. The CLI's documented partial-upload behavior is not a rollback guarantee.

Run the [F10 controlled qualification](../../specs/012-reports-feature-suggestions/quickstart.md#complete-receipt-backend) before delivery. Existing `GitHubAttachmentProcessTest` exercises a real controlled Java child, environment credentials, separate arguments, all five private originals, bounded wait/termination and cleanup; `GitHubSupportClientTest` exercises real loopback HTTP waits and refusal of redirects. A `--version`/`--help` check verifies the installed official binary and attachment command availability only. Neither those checks nor the controlled child establish actual CLI uploads, repository permissions, attachment confidentiality or provider erasure; those remain the separately authorized private-provider qualification.

### Apply an authorized club-field restriction

The existing [F02 application operation](../../apps/backend/src/main/java/com/blockout/backend/sporting/application/service/RestrictClubContacts.java) is `RestrictClubContacts.restrict(UUID, Set<ContactField>)`. It is a trusted Spring transactional bean method, **not an HTTP endpoint or an installed operator CLI**. Prepare a separately reviewed, environment-specific invocation of this existing bean with the authorized backend operator; this guide supplies no production launcher. Without a safe approved invocation, leave execution pending. Do not instantiate the service directly, bypass its Spring transaction with SQL, or use ordinary contact editing as erasure.

1. Confirm the private request's exact established club UUID and affected fields: `ADDRESS`, `CITY`, `POSTAL_CODE`, `EMAIL`, `PHONE`, `WEBSITE`. Resolve ambiguity privately; preserve the club, teams, matches, other fields and their history. Read current contact state/revision with `GET /administration/clubs/{clubId}/contacts` under the existing `sporting-presentation.manage` grant. Keep the response private and retain scope/revision evidence rather than an archive of forbidden values.
2. Invoke the existing bean once for the approved set, for example `contacts.restrict(verifiedClubId, Set.of(ContactField.EMAIL))`, where `contacts` is the Spring-managed bean and `verifiedClubId` comes from the verified case. F02 locks the club before reading current values, clears both source and manual columns, retains the durable field restriction and current mode, and advances the contact editing revision when state changes. Repeating an already applied restriction is a no-op. Effective municipality/postcode changes also invalidate coordinates and advance locality revision through F02; do not reimplement those rules. Its existing after-commit change event covers affected projections.
3. Confirm commit and reread **current** state. Verify restricted source/manual/effective values are absent in the administrative response and `GET /clubs/{clubId}` public projection; unrelated fields and sporting identities remain intact. With authorized database read access, verify physical clearing as well, selecting only the necessary booleans and revision. For the email example, on the verified environment's private connection, `psql -X --set=ON_ERROR_STOP=1` can execute:

   ```sql
   SELECT contacts_revision,
          email IS NULL AS source_cleared,
          email_manual IS NULL AS manual_cleared,
          email_restricted AS restriction_retained
   FROM sporting_club WHERE id = :'club_id'::uuid;
   ```

   Set `club_id` privately to the verified UUID. Require exactly the expected club and all three booleans true. Check the equivalent mapped columns for the actual affected fields. A failed/uncertain write requires current inspection, never an assumed rollback or blind replay. If projections or derivatives cannot be verified, keep affected exposure unavailable for owner resolution.

4. Recollect and exercise ordinary editors only with synthetic cases in an authorized test environment. An old revision returns the existing 409 `stale-revision`; a current manual value for a restricted field returns 409 atomically, including any accompanying unrelated edit. `source`/`hidden` mode changes cannot lift the restriction. Source unavailability, renewed collection, reidentification or priority-source publication never restores permission. [F11's prepared cases](../../specs/004-advertising-privacy-legal/quickstart.md#scenarios-and-expected-outcomes) identify the automated boundary and remaining real-consumer qualification.
5. Record only the necessary decision, field set, current revision and verified outcomes privately. Do not lift flags through ordinary editing. A later lifting decision needs separate manual authorization and owner review; this operation implements no lifting path. After a restore/reconstruction, use the [current-state reconciliation](#reconcile-before-access-or-sends) before access, derivatives or sends; a copy predating the flag requires reapplication, and uncertainty keeps affected resources closed.

## Reconcile before access or sends

Apply current business restrictions whenever retained or reconstructed values are considered for use. The [F13 application checks](../../specs/003-shared-quality/quickstart.md#current-restrictions-and-compatible-data) use disposable data and current owner operations; no infrastructure restoration procedure is defined here. Row counts, image URLs and successful `/health` alone establish neither current rights nor usable reconstructed content.

- **F05/F06/F12:** reconcile current accounts, subject-to-UUID associations, follows, erasures and distinct application grants/settings. An older revoked permission or erased account must not regain access. Follow [F05 erasure and return](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution): a replacement account receives no deleted profile, follows, grants or gifts; do not merge by email or target a replacement UUID for original-account cleanup. Preserve accepted token-validity and private-log evidence limits; there is no exhaustive deletion ledger.
- **F09/F11:** verify current identity and RevenueCat rights through their [owning rules](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity), including gift expiry/revocation. A database value does not restore a purchase, cancel billing or prove entitlement. Unknown current-account rights remain unknown under the SDK's accepted behavior. Current [privacy restrictions](../../specs/004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy), including suppressed sporting contacts and affected images/attribution, still apply.
- **F07:** before affected reads/counts/sends, exclude inbox entries aged at least **29 elapsed days**, preserving original creation times and available nonpersonal match-announcement facts. Physical purge and current erasure/privacy/rights reconciliation follow the [owning retention rules](../../specs/011-notifications-delivery/spec.md). Missing current evidence keeps affected access/sends unavailable. Apply current account/destination/follow restrictions. The exceptional duplicate allowed by F07 if old match facts are unavailable permits neither erased/expired personal rows nor replay of uncertain or maintenance-suppressed pushes.
- **F04:** rebuild derivatives from current authoritative PostgreSQL through the [owning startup/full-rebuild path](../../specs/008-search-discovery/plan.md#projection-lifecycle). Verify complete alias replacement and current visibility before using search; incomplete work retains usable prior results or an explicit unavailable state. Collection reconstructs only what suppliers still publish, not missing customizations, image bytes or history.

Application code must remain compatible with its current schema and data. Replacing a binary does not reverse data changes. Use the existing schema-validation and explicit migration boundaries; neither an incompatible version nor an unresolved right may bypass current checks.

Use existing private provider/support tools for authorized manual resolution. Missing current evidence keeps the affected capability unavailable without introducing a recovery service, effect ledger or automatic replay.

## Notification retention failure

For `operation=notification_retention`, inspect safe stage, outcome, count and reason fields in the local backend's structured output. A missed, interrupted or `incomplete` pass is a retention failure, including physical rows remaining beyond age 30; it grants no longer lifetime. Preserve committed removals. Reads/counts continue excluding age 29 while physical removal is pending.

Verify the exact local target/backend revision, actual UTC daily cron, task-owned process, database connectivity, application DELETE permission and relevant lock/resource failures. Retain only necessary safe type, time and counts. Correct the demonstrated cause through its owner while preserving nonpersonal match facts, original dates and independently necessary installation/follow associations. Do not recreate personal rows or replay announcements/pushes.

The next ordinary daily pass starts again from due rows; there is no immediate retry timer or user-facing purge endpoint. Persistent failures use authorized manual handling. The existing Spring-managed `PurgeNotifications.run()` is an internal operation, not an HTTP route or installed operator CLI. Any earlier explicit corrective invocation needs a reviewed target-specific invocation of that bean; do not instantiate it directly or replace its transactional boundary with ad hoc SQL. Verify completed cleanup and [current restrictions](#reconcile-before-access-or-sends) for the affected data; a completed process or silence alone proves no recovery.

## Protected club-logo preservation and reassociation

This is F14 T028's preparation and T030's local rehearsal procedure. Actual V1 access, administrator freeze, source copy, reconstruction and live reassociation require separate operation-specific authorization under F14. This procedure authorizes none of those operations. Use only a verified isolated target and synthetic files for a rehearsal. The [F14 model](../../specs/014-v1-v2-transition/data-model.md#protected-club-logo-association) owns preservation outcomes; [F02](../../specs/002-sporting-data/plan.md#presentation-administration-and-locality) owns image validation, storage and inheritance.

### Prepare the private preservation copy

The private preservation copy contains the exact FFVB club identifier string, original logo reference and its usable bytes. Do not convert identifiers to numbers, trim meaningful leading zeros or infer identity from club names. For example, synthetic `000339`, `339` and `0000339` are different references. Do not use a spreadsheet import that changes those strings. Other V1 names, contacts, team/division artwork and presentation customizations are outside this copy.

1. Before an authorized source copy, identify the exact source/environment and all affected manual club-logo associations. The sole administrator freezes manual logo edits, settles relevant in-flight writes and verifies that the **deployed** collector preserves the protected associations before collection continues. A repository test cannot establish that deployed behavior. Keep the source intact while any prerequisite is unresolved.
2. Through the authorized source's ordinary read/export and file-download tools, copy every affected original association and actual file to the existing private operational location, independently of the source to be destroyed. Retain its exact string club reference, original logo reference, corresponding file path and source/observation time together. Use private access and restrictive file permissions (`umask 077`); keep identifiers, files and diagnostics out of Git, issues and PR attachments. No generic exporter, migration ledger or second application image store is needed.
3. Reconcile **every** source association with its preserved record and readable file, and every copied file with its association. Compare byte lengths and SHA-256 digests against the original read, then actually decode each copied image; a matching checksum, URL, HTTP success or file extension alone does not prove usability. F02 accepts actual PNG/JPEG content up to 5,242,880 bytes and 4,194,304 decoded pixels, preserving accepted original bytes. Missing, empty, corrupt, unsupported or oversized content is not ready for F02 reassociation; retain the original and resolve the affected case privately instead of silently transcoding, replacing or dropping it.
4. Lost/missing associations or unusable bytes mean **preservation is incomplete; block the destructive action affecting that source**. A complete usable association with no certain rebuilt target stays private and identifiable for manual resolution. If two preserved associations conflict for one exact reference, retain both and resolve their provenance before applying either; do not choose by name, list order, latest file timestamp or numeric conversion. Record the affected blocked operation privately, with only safe scope/outcomes in F14 quickstart.
5. Confirm the freeze still holds before using the copy. An exceptional edit refreshes and reverifies only its affected association/file. Elapsed time alone requires no full recopy. This freeze does not freeze purchases, erasures or privacy obligations: apply the [final current-state reconciliation](#final-current-state-reconciliation) before the separately authorized destructive/opening action. Retaining artwork does not permit republication against a current restriction.

### Reassociate through the current F02 owner

Use the authorized target's existing private database connection and current operator token. Verify host, port, database and user before reads or writes. The `blockout-logo-target` libpq service below is an explicitly prepared **isolated** connection for rehearsal, not an instruction to reuse a live service. Keep output private and shell tracing disabled. Select one preserved reference without normalizing it; use its corresponding verified file, never an arbitrary URL fetch by the backend.

1. Resolve **only** the exact FFVB reference using the existing database read tools. For example, with `FFVB_CLUB_REFERENCE` supplied as a string:

   ```sh
   PGSERVICE=blockout-logo-target psql -X --set=ON_ERROR_STOP=1 \
     --set=ffvb_reference="$FFVB_CLUB_REFERENCE" <<'SQL'
   SELECT id, provider, reference
   FROM sporting_club
   WHERE provider = 'FFVB' AND reference = :'ffvb_reference';
   SQL
   ```

   Proceed only with exactly one certain target and one resolved preserved association. Zero matches: retain the association/file privately; do not create a club. Multiple or contradictory candidates: stop the affected reassociation and resolve privately. The normal V2 schema prevents duplicate `(provider, reference)` clubs through `uk_club_identity`; do not drop that constraint to import ambiguous data. A similar name, another provider's native ID or a matching seasonal team label supplies no club identity.

2. With that UUID in `CLUB_ID`, read `GET /administration/clubs/{clubId}/presentation` using the current operator's `sporting-presentation.manage` grant. Prepare metadata from the **target's current** revision and manual name, including explicit null. This preserves current V2 naming and transfers only the protected club logo. Use fresh absolute private paths for `CURRENT_PRESENTATION`, `LOGO_METADATA`, `SAVED_PRESENTATION` and `VERIFIED_LOGO`; `PRESERVED_LOGO` is the corresponding verified original file. `BACKEND_URL` and `OPERATOR_ACCESS_TOKEN` must belong to that same authorized target.

   ```sh
   curl --fail-with-body --silent --show-error \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --output "$CURRENT_PRESENTATION" \
     "${BACKEND_URL}/administration/clubs/${CLUB_ID}/presentation" &&
   jq --exit-status '{revision, manualName: .names.manualName, logoAction: "replace"}' \
     "$CURRENT_PRESENTATION" > "$LOGO_METADATA"
   ```

   Inspect each native command's exit status and the read identity before continuing; never submit an error body or stale metadata. The [canonical F02 editor](../../contracts/http/mobile/sporting/paths.yaml) requires all metadata fields and an image part for `replace`. Current account permissions still govern the operation, including under maintenance; a former V1 role or M2M token grants no permission.

3. Submit the existing atomic multipart editor operation, then reread the effective club image. The public image read is subject to F12 maintenance admission: the explicit bypass header below requires the current `maintenance.bypass` grant while maintenance is active. Presentation-management permission alone supplies no bypass; keep access closed if that read cannot be authorized:

   ```sh
   curl --fail-with-body --silent --show-error --request PATCH \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --form "metadata=@${LOGO_METADATA};type=application/json" \
     --form "image=@${PRESERVED_LOGO}" \
     --output "$SAVED_PRESENTATION" \
     "${BACKEND_URL}/administration/clubs/${CLUB_ID}/presentation" &&
   curl --fail-with-body --silent --show-error \
     --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
     --header "Blockout-Maintenance-Bypass: true" \
     --output "$VERIFIED_LOGO" \
     "${BACKEND_URL}/clubs/${CLUB_ID}/logo" &&
   cmp "$PRESERVED_LOGO" "$VERIFIED_LOGO"
   ```

   F02 checks current grants before decoding and again in the write transaction, validates actual bytes and commits the association/content together in PostgreSQL. A refusal leaves the previous presentation intact. Stop after any failed or uncertain write: reread current presentation and image before an explicit retry. A `409` requires current-state inspection, never automatic resubmission of the old revision; matching current state proves the current outcome, not which historical request ran.

4. Verify the returned target/manual-logo association, unchanged names and byte-for-byte content; decode the downloaded image too. Check dependent FFVB teams through the ordinary read operations: they inherit current club artwork across seasons without copied team bytes, while an independent manual team image retains precedence. Professional teams use their existing contextual LNV identity and optional controlled club relationship; **never create or propagate a club relationship** during logo reassociation. A clubless professional team with a similar name/native reference stays clubless and receives no recovered club logo.
5. Keep unmatched/conflicting associations and files privately attributable until their owning resolution. Report exact-match success, pending association and incomplete preservation separately. This rehearsal does not authorize source destruction or prove a live inventory/freeze, actual deployed collector safety, full reconstruction, native rendering or release acceptance. F14 retains those business-continuity and qualification conditions.

### F13 protection handoff to F14

F13 T059–T061 supply the [controlled A22 verification](../../specs/003-shared-quality/quickstart.md#protected-logo-handoff); F14 retains ownership of the actual protected population, preservation and transition. Follow [private-copy preparation](#prepare-the-private-preservation-copy) and [F02 reassociation](#reassociate-through-the-current-f02-owner) above rather than creating another export/import path.

The operator handing over the set records its source/environment and observation time, exact expected association scope, private copy location, every association/file comparison and decoded usability, certain target matches, unresolved associations/conflicts and missing/unusable files. The receiving F14 operator checks that this evidence covers the operation's actual source and every protected association, that the copy remains usable independently of that source, and that freeze/deployed-collector and current-obligation prerequisites still hold. Keep exact references, files and diagnostics private; publish only safe scope, outcomes and limits.

A certain target may receive only its corresponding verified original file through the current F02 editor, under current permissions and revision. Unmatched or contradictory associations and their usable files stay private for manual resolution without an invented club, name-based match or professional-team link. Missing/unusable bytes or associations mean incomplete preservation and block the destructive action affecting that source; a URL, storage availability, test success or completed handoff cannot waive this refusal. This transfers verification evidence, not authorization: F14's live copy and later reconstruction/reassociation remain separately authorized operations. The local synthetic A22 rehearsal establishes only its controlled set; actual V1 logo preservation still requires the authorized F14 operation and its own evidence.

## Private continuity inventory

This section implements [F14 T018](../../specs/014-v1-v2-transition/tasks.md) continuity preparation. Actual population reconciliation and final current-state checks require operation-specific authorization under F14. Neither this guide nor completion of its preparation authorizes source/provider access, a population export, reset or retirement. The [recorded V1 observations](../../specs/014-v1-v2-transition/research.md#current-v1-evidence) are dated inputs, not a current inventory or new qualification.

### Establish scope and private evidence

1. Before inspection, obtain specific authorization for the source environments, provider accounts, operator and private destination. Identify the proposed destructive operation and the sources it would remove. Keep all personal references, association evidence and unresolved cases outside this public repository, issues, PRs and public logs; use existing restricted operational/support handling under F10/F11. Do not copy credentials, receipts, complete provider payloads or profiles into the inventory.
2. Establish the complete affected population from the authorized current sources and provider records. Include subscribers and the identities needed for access, historical customers relevant to erasure, anonymous aliases and any manual beneficiaries; do not limit discovery to active subscriptions or familiar identifier formats. Follow the available source/provider enumeration through its complete scope, including pagination where applicable, and reconcile references in both directions. For each category below, establish whether it is present, demonstrably absent or unresolved. A sample, dashboard total or unexamined page is insufficient to declare coverage; inaccessible scope remains a gap.
3. For each indispensable association, verify its actual beneficiary and how it will remain discoverable after the proposed destruction. Prefer reliable retained provider records. Demonstrate reconstruction while the original source remains available; merely expecting a provider to retain a reference is insufficient. Privately preserve only indispensable historical references not reliably retained by providers: original principal/customer references, beneficiary evidence and current scoped erasure obligations. Keep only the minimum attribution needed to resolve ambiguities, with the source, observation time, purpose and affected operation. This is no mandatory full-population mapping export, second identity store or durable erasure ledger.

| Category to reconcile                                 | Required determination before its source can be destroyed                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 principal and linked secondary identities       | Existing Google/Apple methods, including linked methods with different addresses, still resolve to their retained principal and reliable creation date. Verify necessary address-resolution evidence under F05. Distinct unlinked principals sharing an email remain distinct; missing usable email follows F05 retry/assistance and cannot be repaired by inventing a link. |
| Original, current and historical RevenueCat customers | Explain necessary principal/customer/purchase relationships and the recognized beneficiary, including historical records left after a transfer. Do not infer ownership from an identifier's format or assume a one-to-one mapping. Retain the existing project/products/entitlement; the new V2 business UUID does not erase old customer references.                        |
| Relevant anonymous aliases                            | Explain their association with actual purchases and beneficiaries, or identify the unresolved dependency privately. Anonymous references are neither automatically disposable nor sufficient proof of a beneficiary. No automatic alias rewrite, receipt replay or restoration is introduced.                                                                                |
| Paid and manual beneficiaries                         | Establish current validity and restrictions for independent rights under F09. Recheck the owner's reported absence of V1 gifts against the actual population. If gifts exist, preserve their recognized beneficiary and validity; purchase transfer does not transfer a gift. An absent population needs no gift-migration mechanism.                                        |
| Scoped erasure and privacy obligations                | Use available authorized original-account/customer references, including historical targets and existing private support cases. Identify current restrictions and unresolved original-target cleanup under F05/F11; a reset does not erase those obligations or permit old personal data to return.                                                                          |

[F05](../../specs/005-accounts-identity/plan.md#continuity-operations-and-limits) owns identity-preserving recreation: retain principals, links and age, establish a fresh V2 business UUID, and copy no old profile, follows, inbox or permissions. [F09](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity) owns applicable rights, explicit paying-store restoration, accepted receipt-wide transfer and verified assisted cross-store recovery. The inventory is evidence for those owners, never a grant, identity merge or automatic restore. Migration alone neither deletes a RevenueCat customer nor ends a valid gift.

Voluntary deletion follows [F05 erasure and manual resolution](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution). For this inventory, retain only justified original-target references and verify their environment and current use before any separately authorized cleanup; never target a replacement UUID or match by email. Available private diagnostics cannot establish exhaustive erasure coverage: interruption after local commit but before logging can leave cleanup unreported. Apply F05's cleanup and concurrent-return rules without restoring deleted personal data, grants or gifts.

Keep evidence only while needed for its authorized purpose under [F11](../../specs/004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy); use [F05's retention and private-support rules](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for cleanup diagnostics and unresolved cases. This adds no universal retention period or public copy of a private case. Preservation never authorizes restoring erased data or extending expired rights.

### Destruction gates and handoff

Before each affected destruction, the authorized operator must establish all of the following:

- Complete coverage of every category actually present, with each indispensable association retained or its reliable reconstruction demonstrated. Identify any missing/contradictory reference, uncertain beneficiary or inaccessible source privately and name the exact destructive operation it blocks. Preserve that source until resolved; later restoration promises and onboarding help do not lift the block.
- Actual continuity qualification for the affected categories, separately on Apple and Google, under T021/T022 and [A07–A15](../../specs/014-v1-v2-transition/spec.md#user-story-2--recover-entitlements-and-preserve-continuity-evidence-priority-p1). Population coverage does not prove sign-in, native restoration/transfer or assisted recovery; successful sampled native cases do not prove population coverage. Unqualified necessary outcomes remain blocking.
- Protection of any club logos affected by the same operation under the [logo-preservation owner](../../specs/014-v1-v2-transition/plan.md#protected-logos-and-sporting-reconstruction). Every association needs its exact FFVB string reference, original URL and independently usable file. Missing/unusable bytes block destruction; a preserved association without a certain rebuilt club match remains private for resolution, with no name-based or guessed professional-team match.
- The current-state check below, including accepted effects and current privacy restrictions. Retained evidence is not permission to reintroduce prohibited data.

Record coverage, supporting evidence and unresolved cases in the existing private operational process. Report only public-safe scope, outcomes, evidence limits and the affected blocked operation in [F14 quickstart](../../specs/014-v1-v2-transition/quickstart.md) without claiming that preparation executed the live operation. Do not attach identifiers or private diagnostics. A cleared preservation gate permits consideration of the separately authorized action; it does not establish both-store availability, effective V1 retirement or authorization to open V2. Those remain in the [release sequence](../../specs/014-v1-v2-transition/plan.md#cutover-and-recovery).

## Final current-state reconciliation

This is the T024 preparation required **immediately before separately authorized retirement**, and before any destructive operation could lose protected evidence. Check current purchases/revocations at cutover; the logo-edit freeze does not freeze provider state. Use the initial inventory/copy's source and observation time to review changes through the contemplated transition, not merely through the last rehearsal.

1. Reconfirm operation-specific authorization, private evidence access and the inventory's coverage. Add newly present categories or associations and resolve changed dependencies using the inventory method above. If evidence cannot cover the interval since preparation, keep the affected source intact and action blocked; do not infer absence of change from absent events or logs.
2. Before separately authorized retirement of V1 collection, workers, scheduled sends/retries and business/identity-writing paths, settle accepted work or identify unresolved effects with its F01/F05/F09/F11 owner. Maintenance and the logo freeze stop none of those processes by themselves. An accepted payment or erasure is not cancelled by retirement. This section defines reconciliation inputs; the actual retirement and its proof remain separate F14 operations.
3. Read current authoritative state and reconcile the following changes against the initial evidence. Use event/history evidence only to explain changes; an older event, copy or delayed response cannot override a newer decision. Do not add replay, synchronization or migration state machinery.

| Changes since preparation              | Required final check                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identities and associations            | Cover new/changed principals, linked methods, necessary address/age evidence and current beneficiaries. Preserve valid existing links; introduce no email matching, old-profile import or privilege inheritance. Distinguish identity-preserving recreation from voluntary deletion and a replacement business UUID.                                                                                                                                       |
| Purchases, renewals and transfers      | Check both stores' current applicable rights and customer/beneficiary associations, including historical references still needed after a transfer. Apply F09's accepted native transfer scope and assisted exceptions without merging profiles or moving gifts. Native renewal/propagation timing is not an atomic cutover guarantee.                                                                                                                      |
| Expiration and revocation              | Apply current paid/manual validity and restrictions. Old receipts, successful rehearsals or retained gift evidence cannot extend expiry or undo revocation. Unavailable/uncertain verification remains distinct from confirmed expiry or absence; follow F09's unknown-rights behavior without ads or a repurchase invitation.                                                                                                                             |
| Erasure and other privacy restrictions | Apply current F05/F11 obligations, including known original-target cleanup and restrictions affecting retained content, images or attribution. Never restore an erased business account from an old copy. Keep missing current evidence explicit and affected access suspended, without imposing a cleanup-pending gate on new registration or ordinary native restoration.                                                                                |
| Exceptional manual logo edits          | Confirm the sole administrator's freeze, settled in-flight writes and the actual scraper's preservation behavior under F14. Check for exceptions since the initial copy; refresh and verify each affected association and usable file, retaining exact FFVB strings. A verified unchanged copy needs no repeat full export solely because time passed. Missing files remain blocking; an unmatched but preserved logo remains identifiable for resolution. |

4. Record the actual check times, covered sources/interval, current outcomes, remaining uncertainty and owner of accepted unresolved effects privately. Provider activity can continue: if a later accepted change or delay makes the checked state stale before the dependent action, refresh the affected current checks and evidence. No manual freeze or timestamp guarantees a global provider snapshot. Do not proceed when necessary continuity or accepted-effect evidence remains unavailable.
5. Reassess the destruction gates above and hand the result to the authorized release operator. A failed check permits correction or retry while sources remain protected, never automatic destructive continuation or partial opening. Whenever retained values are reused, apply the [current business reconciliation](#reconcile-before-access-or-sends); F05/F09/F11 restrictions take precedence and unresolved affected access stays closed. Code remains compatible with current data; no infrastructure recovery procedure is selected here.

## Collection inspection and explicit recovery

Use the [F01 application diagnostics](../../specs/001-source-acquisition/quickstart.md) to distinguish failures, administration needs and uncertain terminal operations. Compare the exact control/scope/stage/phase current result, observation time and its own latest usable success. Pause, closure, log absence and success elsewhere prove no affected-scope recovery. A usable acquisition result leaves failed integration independent; a qualified empty or ambiguous municipal result is not a provider outage. Every failed, partial or unconfirmed key remains inspectable, including clubs/geocoding. Exact outage-start/duration is not retained; ordinary next-attempt eligibility is unchanged.

F01 retains current intent, cycles and scope results, not an execution history. The backend is the sole database writer. A lost response is not proof that the write failed. Keep the original control/cycle/source identity in the private operational case; never paste credentials, provider documents, locality or private diagnostics into this repository or a public issue. [F01's ordered cases](../../specs/001-source-acquisition/quickstart.md#ordered-uncertainty-cases) distinguish response loss before and after acceptance.

Use the authorized environment's existing private token process. With `BACKEND_URL`, `COLLECTION_CYCLE_ID`, `COLLECTION_CONTROL_ID` and `SOURCE_BINDING_ID` explicitly set to the affected environment/scope, the actual read routes are:

```sh
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${COLLECTOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/ingestion/collector-runtime"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${COLLECTOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/ingestion/collection-cycles/${COLLECTION_CYCLE_ID}"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/administration/collection-controls/${COLLECTION_CONTROL_ID}"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${OPERATOR_ACCESS_TOKEN}" \
  "${BACKEND_URL}/administration/source-bindings/${SOURCE_BINDING_ID}"
```

The first two reads require the collector's current ingestion audience/client and `sporting:ingest` scope. The last two require a usable current operator account with `collection.manage`; they remain individually authorized under maintenance and confer no minimum-mobile-version bypass. Use private shell handling without tracing; keep output private. Read failure is unresolved evidence, never permission to replay a sporting mutation. The collector sends startup, admission and terminal operations once without confirmation GETs or process-local acknowledgement ownership. Inspect current runtime/work and control/candidate state: if admission did not commit, later ordinary polling may attempt fresh admission; if admission committed but its response was lost, no provider read starts and backend RUNNING excludes new work until explicit restart. A committed terminal write may permit later collection despite response loss. If terminal submission did not commit, RUNNING remains blocked and needs inspection/restart. Preserve accepted independent sporting facts and do not resend their writes. Pause/resume creates no automatic repair or catch-up.

For a local task-owned collector, use `npx nx run collector:serve` from that worktree after its private environment is loaded through [local development](../../README.md#local-development). If unresolved unfinished work requires incarnation replacement, stop only that original foreground process with Ctrl-C and relaunch explicitly against the authorized local target. Never start a second collector for that target or stop another worktree’s process. Registration waits for admitted transactions, preserves their commits and marks unfinished old cycles interrupted; it does not replay their work. Completed cycles and accepted source qualifications survive. An interrupted candidate needs a new explicit validation request at its current revision if still applicable; ordinary collection uses its next eligible opportunity. Confirm the new runtime incarnation and affected cycle/source reads before calling the scope recovered. The launcher enables scheduled reads after registration: do not point it at live FFVB/LNV/IGN merely to inspect or test a build. Host applications do not run through Compose.

Source repair starts with read-only inspection of the canonical season, candidate, accepted binding and affected result. An unlocked source in an open season uses the existing candidate edit, explicit validation and (when required) exact-season confirmation, then selected launch; a candidate edit invalidates prior evidence. Pause and restart never unlock accepted references. There is no supported generic post-launch source-repair/reset command: a demonstrated defect in a locked binding requires an individually authorized, reviewed, narrowly scoped technical change through the existing [review and delivery policy](../../AGENTS.md#git-delivery), preserving accepted facts, locks and current revisions. Do not invent an ad hoc SQL unlock, broad reset or runtime repair endpoint. CLOSED remains terminal, with no repair workflow that reopens or recollects it.

## Native participant map configuration

F03 uses `react-native-maps` 1.27.2 with Apple Maps on iOS and Google Maps on Android. `GOOGLE_MAPS_ANDROID_API_KEY` is a native build input consumed by the package's Expo config plugin; it is not an `EXPO_PUBLIC_` runtime value. Rebuild the development/release client after changing it. No iOS Google key, location permission request, GPS, custom tile service or persistent geographic cache is configured.

Before authorized Android map use, supply a separate appropriately scoped key for the intended environment. Restrict it to **Android applications**, with the exact application package and SHA-1 signing-certificate fingerprint of each authorized build. The configured packages are `com.blockout.local`, `com.blockoutproject.blockout.preproduction` and `com.blockoutproject.blockout`; release verification must use the certificate that signs the installed artifact (including Play App Signing where applicable), not an assumed local/upload certificate. Restrict the key's APIs to **Maps SDK for Android**. Keep real key values and private provider evidence outside this repository; a mobile key is embedded in its native artifact and relies on verified restrictions.

This declares inputs and expected restrictions only. Real credentials, provider configuration/restriction checks and physical iOS/Android qualification remain [F03 T040](../../specs/007-sporting-consultation/tasks.md), using its [prepared map cases](../../specs/007-sporting-consultation/quickstart.md#native-map-cases). Building without a key does not qualify Android map use.

## Sporting push inputs and failure limits

F07 uses an explicitly configured Expo project, with **one enabled backend sender per project**.
Its single Spring worker paces batches of at most 100 by 200 ms (at most 500 messages/second,
within Expo's 600/project/second limit). Do not enable independent replicas or another sender
against that same project without revisiting the aggregate rate boundary. Inbox/facts remain in
PostgreSQL regardless of transport activation. No production/provider activation is established
by this configuration.

- Backend: `BLOCKOUT_NOTIFICATIONS_PUSH_ENABLED` defaults to `false`;
  `BLOCKOUT_NOTIFICATIONS_PUSH_PROJECT_ID` names the existing isolated project and
  `BLOCKOUT_NOTIFICATIONS_PUSH_ACCESS_TOKEN` is its private server bearer credential. Enabling
  requires both inputs. Enable Expo's enhanced push security separately only with authorization,
  and keep the server credential in the private environment/secret store. Never expose it in a
  mobile bundle, repository, shell transcript or diagnostic payload.
- Native `apps/mobile/app.config.ts`: `EXPO_PROJECT_ID` supplies the public build-time project UUID
  consumed by the existing `getExpoPushTokenAsync({ projectId })` lifecycle. Without an override,
  the existing `EXPO_PROJECT_SLUG` EAS configuration retains its current project UUID; a plain
  local build has none and does not register. Select matching native/backend project inputs;
  the Expo address itself does not prove its project to the backend. Mixed-project rejection is
  dropped, never split/retried. Preserve F14's existing production application/project identity.
- Android: `FCM_GOOGLE_SERVICES_FILE` is the environment-owned absolute path to the matching
  `google-services.json`; keep the file outside Git. The matching private FCM v1 service-account
  credential belongs to the isolated Expo/EAS project's service credentials, never the bundle or
  backend token field. The existing SDK creates channel `default` (label `Notifications`, default
  importance) before permission/token acquisition. The `expo-notifications` config plugin uses
  that channel. User/channel settings still control presentation.
- iOS: the isolated application identifier, APNs key and matching provisioning entitlement belong
  to the authorized Apple/Expo build credentials. No APNs secret is read from application config.
  The SDK plugin supplies ordinary native notification configuration; background remote
  notifications remain disabled. Adding the plugin changes future native binaries and does not
  update an already installed development client.

The [official Expo send/receipt API](https://docs.expo.dev/push-notifications/sending-notifications/)
was checked on 2026-10-30: 100 messages/request in one project, 600 messages/second/project,
4 KiB payloads and 1,000 IDs/receipt request. Payload-size admission belongs to Expo; the sender no longer serializes each message a second time to pre-certify its byte size. The Expo-listed Java SDK uses the existing 3-second connect and
5-second read bounds, with redirects and native Apache automatic retries disabled. Neither the SDK nor the underlying transport resends a request. Only safe sporting title/body and
`ownerAccountId`/`notificationId`/`matchId` routing data accompany the destination. No badge, old
video URL, profile, live-specific TTL, image extension, interactive action or background sync is
added. Omitted TTL/expiration retain the provider default, possibly four weeks. A late notice
makes no current-stream promise.

The worker queue holds at most 100 batches; up to 100 delayed receipt callbacks retain at most
100 ticket IDs each. Both are memory only and disappear on shutdown/restart. Each accepted ticket
is observed once around fifteen minutes later. A refusal, uncertain response, missing receipt,
overload or maintenance skip produces no resend, replay or catch-up. `DeviceNotRegistered` removes
only the matching private row identity/revision/address, so a late receipt cannot remove a newer
registration. A last current-maintenance check prevents each new handoff including operators;
changes after that check cannot atomically stop or recall an external message.

An empty or non-JSON HTTP refusal, including 401/403, can remain UNKNOWN under the native Java SDK rather than producing a dedicated HTTP-configuration diagnostic. Native ticket/receipt `InvalidCredentials` retains its safe configuration diagnostic. Never parse private SDK exception text to recover a status.

Keep `logging.level.com.niamedtech.expo.exposerversdk=OFF`: the upstream SDK has a raw response-body DEBUG log, which must not expose private provider evidence. Do not enable that logger; do not parse/log SDK exception messages.

Inspect existing structured stdout fields `operation=sporting_push` (drop reason/count),
`operation=expo_push_evidence` (acceptance/rejection/unknown counts) and
`operation=sporting_push_configuration` (disabled/enabled or credential/project diagnostic). These
contain no account/destination/ticket identities, content, raw provider error or secret.
Acceptance at Expo/APNs/FCM is not phone receipt. Correct credentials/project settings only in an
authorized environment; do not repair lost transient work by replaying announcements. Follow the
[physical preparation](../../specs/011-notifications-delivery/quickstart.md#physical-push-preparation)
for the separately owned device/provider qualification. No EAS/store build or provider mutation
is authorized by this runbook.

## Pro restoration and assisted recovery

This is the bounded F09 procedure for separately authorized owner operations, using the existing [F10 private complete-receipt process](../../specs/012-reports-feature-suggestions/plan.md) and [F11 rights handling](#manual-rights-and-club-contact-restrictions). The [F09 preparation cases](../../specs/006-pro-subscriptions/quickstart.md#restoration-and-assisted-recovery) and T034 own actual Apple/Google qualification. Writing this procedure grants no console, provider, support-send or production authorization.

1. **Receive and bound the request privately.** Use the existing authorized private support destination. Retain the request reference, operator, reason, date, requested scope, necessary corroborating evidence and actual outcome there. Verify destination access and operator authority before handling evidence; never substitute a public issue, repository attachment or diagnostic log. Review retention against the case purpose and delete evidence when no longer justified.
2. **Establish the requester and recipient.** Verify purchase ownership proportionately and identify the authenticated, usable recipient business account through F05. An email match, supplied UUID, isolated transaction number or uncorroborated screenshot is insufficient. Do not merge profiles, link identities by email or systematically request identity documents. Contradictory evidence keeps intervention pending; explain what is missing or why it is refused without disclosing another customer's information.
3. **Inspect the current purchase and full effects.** Corroborate the actual original-store purchase, current validity and historical association using authorized provider tools and F14's retained references. Inspect both beneficiaries and their independent paid/gifted entitlements before acting. Native restoration can affect a receipt's purchases together; no individual-purchase transfer guarantee is offered. An Apple receipt cannot be natively restored through Google Play or conversely. Same-account cross-platform rights and unsupported cross-store recovery require their own evidence.
4. **Use only a supported, bounded owner intervention.** Check that the provider's supported operation preserves independent rights. If scope is unsupported or effects cannot be established safely, contact provider support and retain the unresolved request. Never add an automatic compensatory gift, cancel billing implicitly, use a Blockout moderator role as console authority or promise that manual transfer changes the paying store account. Its later explicit restoration may transfer purchases again.
5. **Verify before confirmation or repetition.** Read the provider's actual result and refresh native state for source and recipient; compare paid and independent gift validity with the pre-intervention evidence. Distinguish a successful operation from active Pro rights. On failure or an unknown outcome, reread before deciding whether to repeat; never replay blindly. Communicate confirmed effects, uncertainty, any refusal and the next owner action privately.
6. **Preserve erasure and rights safeguards.** Follow [F05 original-target cleanup](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution) for failed/concurrent cleanup and [current F11 restrictions](../../specs/004-advertising-privacy-legal/plan.md) before exposing restored data. A fresh account can recover paid rights only: no old profile, follows, attribution, personal grants or gifts return. Deletion does not cancel store billing and creates no cleanup-pending registration/restoration gate. Keep necessary cleanup references under the existing private retention limits, without creating a second ledger or indefinite evidence archive.

## Pro gifts in the owner console

Use the [private recovery procedure above](#pro-restoration-and-assisted-recovery) for recipient verification, evidence, retention and uncertainty. **Owner-only, verified recipient/scope, reread uncertain outcomes before repeating. No Blockout gift ledger; no sensitive evidence in public artifacts.** RevenueCat's [Customer Support role](https://www.revenuecat.com/docs/projects/collaborators#customer-support) also permits refunds and customer deletion. A Blockout moderation grant or access to a support record delegates none of these operations; only the owner intervenes at launch.

1. **Bind the request to its original recipient.** Confirm the authorized environment/project, authenticated usable F05 business UUID and corroborating request through the private process. Inspect the exact RevenueCat customer and relevant aliases; an email or supplied identifier alone is insufficient. Record the intended `Blockout Pro` gift and explicit final expiry (including time zone), or no expiry, alongside the request/operator/reason/date. Ambiguous identity or scope keeps the request pending without mutation.
2. **Read before acting.** Record current promotional grants, independent paid validity and store renewal/billing information privately. Gifts affect neither store charges nor renewal; inspect both before and after. Granted entitlements also apply to sandbox clients but are production transactions in RevenueCat: a sandbox account is not an isolated customer namespace. Use only dedicated authorized accounts for qualification.
3. **Perform the supported promotional action.** Follow RevenueCat's [Granted Entitlements instructions](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile#granted-entitlements), checked on 2026-10-31:
   - Grant: customer profile → **Entitlements** → **Grant** → `Blockout Pro`; choose **Until date** for the agreed end, or the no-expiry/lifetime option. Review before submitting.
   - Lengthen: grant again with the intended later end. Shorten: revoke promotional access, then grant the agreed end. Revocation affects **all active promotional grants for this entitlement**; verify that scope first. These are separate operations: if replacement fails, record the actual intermediate state. Never add durations or use paid-subscription **Extend Subscription**/Google deferral.
   - Revoke: use the menu beside the **granted** entitlement, not a paid subscription. RevenueCat documents **Sandbox data** unchecked for promotional removal. Verify the customer and scope again; never cancel/refund/delete a customer to withdraw a gift.
4. **Establish the final result.** Reread provider history and final promotional validity, then observe ordinary SDK refresh on the affected native clients. Distinguish requested, provider-confirmed, failed and uncertain outcomes in the same private case. A console confirmation establishes no immediate mobile propagation. Preserve any independently active subscription; gift-only expiry/revocation permits F11 eligibility only when the SDK supplies inactivity. No usable SDK state means no ads or repurchase invitation. If the result is uncertain, inspect before any repeat; if the supported scope cannot preserve rights or the intended validity cannot be established, use provider support.
5. **Keep recovery bounded.** Purchase transfer leaves a gift with its original beneficiary; it is not a purchased receipt item. Reuse the restoration procedure for paid recovery and compare both recipients. After business deletion, failed provider cleanup remains an original-target manual obligation; never revoke against a replacement UUID or copy a gift to it. Any new gift needs its own explicit assignment. There is no automatic compensation, application gifting API or additional administration screen.

The [T036 cases](../../specs/006-pro-subscriptions/quickstart.md#owner-console-gifts) prepare execution. T038 retains actual iOS/Android/provider qualification; these instructions and controlled SDK tests do not establish unchanged billing, a live grant or native promotional rendering.
