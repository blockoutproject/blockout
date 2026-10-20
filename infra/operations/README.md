# Manual restore and rollback

This procedure implements [F13 T056](../../specs/003-shared-quality/tasks.md) preparation. It authorizes no backup activation, provider change or restoration. **Presence does not mean validated restoration.** The [initial restore cases](../../specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition) require actual isolated evidence under T057 before relying on V2 protection.

## Inputs and isolation

1. Obtain authorization for the exact source, isolated destination and later reopening scope. Select the last usable native database backup and record its environment/time in private operational evidence. Preserve original storage and the selected copy; do not overwrite the live database. For the initial proof, make original database/file storage unreachable **from the restore environment**, without stopping another environment. Use independent PostgreSQL 18.6 storage, private networking and separate credentials; no production routes, provider writes or push destinations may be reachable from the check.
2. Keep backend and collector stopped during SQL restoration. F12 maintenance alone does not stop collection or notification creation. For a recovery affecting a running environment, enable maintenance with an already usable authorized operator session before stopping writers through the [delivery guide](../dokploy/README.md#promotion-and-native-deployment). Keep external access and sends closed independently of any old maintenance setting in the dump. Wait for active deployments/migrations; do not cancel or overlap them.
3. Obtain the trusted archive, its source PostgreSQL/tool versions and the matching application/migration image digests. Use PostgreSQL 18 tools with the selected 18.6 server; qualify any different version before use. Retain the source encoding, locale, extensions, required database settings and intended roles separately: a single-database dump does not include cluster roles or deployment configuration. Prepare current erasure/restriction/rights evidence privately, including changes since the backup; an old dump alone cannot establish current obligations.

[Dokploy's documented PostgreSQL format](https://docs.dokploy.com/docs/core/databases/restore) is a custom-format `pg_dump` archive with `--no-acl --no-owner`, wrapped in gzip. This procedure uses native PostgreSQL tools on an authorized downloaded copy; Dokploy's S3 Restore action is a separate provider operation. The [masking prerequisite](../../specs/003-shared-quality/research.md#backups-and-restoration) still blocks real V2 S3 credentials/activation until T054 and explicit authorization. No corrected release is qualified here.

## Restore the logical database

Run each step only after the preceding step succeeds. Keep archives, extracted SQL/listings and diagnostics in a private directory outside this public repository, with access limited to the operator. SSE-S3 does not protect downloaded copies. Use the native [password file](https://www.postgresql.org/docs/18/libpq-pgpass.html) with mode `0600`; never put passwords in command arguments or public logs.

1. On the **empty isolated cluster**, provision the approved migration owner and application login, without superuser, database/role creation or migration-role membership for the application. Use the boundaries in [init-roles.sql](../postgres/init-roles.sql), substituting separately supplied private credentials; do not run its disposable setup against an existing environment. Create an empty `blockout_restore` database from `template0`, owned by `blockout_migration`, with source-compatible encoding/locale/extensions. The name below is an isolated example, not a production destination.
2. Configure a native [libpq connection service](https://www.postgresql.org/docs/18/libpq-pgservice.html) named `blockout-restore` for **only that isolated host/port/database**, with its required TLS settings and private password file. Before any write, verify host/port, `current_database()` and `current_user` using `psql`; explicitly select the intended administrator or migration user. Do not inherit the live environment's connection settings.
3. Set `RESTORE_ARCHIVE`, `RESTORE_DUMP` and `RESTORE_TOC` to private absolute paths (the latter two must be new files). Inspect gzip integrity and archive contents, then restore the complete database, including image values and Liquibase history, as the migration owner:

   ```sh
   umask 077
   gzip -t "$RESTORE_ARCHIVE" &&
   gzip -dc "$RESTORE_ARCHIVE" > "$RESTORE_DUMP" &&
   pg_restore --list "$RESTORE_DUMP" > "$RESTORE_TOC" &&
   PGSERVICE=blockout-restore pg_restore \
     --username=blockout_migration --dbname=blockout_restore \
     --no-owner --no-acl --exit-on-error "$RESTORE_DUMP"
   ```

   Inspect native exit status/errors after each command. An archive listing is only an input check. On restore failure, keep the target closed: `--exit-on-error` stops further commands but earlier changes may remain. Diagnose privately and use another authorized empty target for a new attempt; do not continue on a partial database, use `--clean` on live storage or clear Liquibase checksums. [PostgreSQL 18 `pg_restore`](https://www.postgresql.org/docs/18/app-pgrestore.html) owns these options. No restore command is executed by this documentation change.

4. Reapply intended ownership, existing-object ACLs and future-object defaults from the current environment's approved role configuration. Restoring with `--no-owner` as `blockout_migration` makes restored objects its responsibility; inspect database, schema and object owners explicitly. For the repository's `public` schema and two-role boundary, apply the following as the authorized database owner (adjust only for actual approved schemas/roles):

   ```sql
   REVOKE ALL ON DATABASE blockout_restore FROM PUBLIC;
   GRANT CONNECT ON DATABASE blockout_restore TO blockout_app;
   REVOKE CREATE ON SCHEMA public FROM PUBLIC;
   ALTER SCHEMA public OWNER TO blockout_migration;
   GRANT USAGE ON SCHEMA public TO blockout_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO blockout_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO blockout_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO blockout_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO blockout_app;
   ```

   Run through `psql -X --set=ON_ERROR_STOP=1` on the verified isolated connection. [Default privileges](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html) affect future objects only; they do not repair restored table/sequence grants. Inspect `\du`, `\dn+`, `\dp` and `\ddp`, then verify application data access and denied schema creation using disposable qualification data. Collector still has no SQL credentials. These database privileges are separate from restored F12 application grants.

## Reconcile before access or sends

Keep the target isolated while checking the [prepared owner cases](../../specs/003-shared-quality/quickstart.md#initial-restore-and-activation-condition). Compare representative records, original timestamps, relationships and PNG/JPEG bytes against privately retained expected values. Apply current corrections and restrictions using the owning implementations or an authorized manual correction; never infer recoverability from row counts, URLs or successful `/health` alone.

- **F05/F06/F12:** reconcile current accounts, subject-to-UUID associations, follows, erasures and distinct application grants/settings. A revoked permission or erased account in the old copy must not regain access. Follow [F05 erasure and return](../../specs/005-accounts-identity/plan.md#erasure-and-manual-resolution): a replacement account receives no deleted profile, follows, grants or gifts; do not merge by email or target a replacement UUID for original-account cleanup. Keep the accepted token-validity and private-log evidence limits; there is no exhaustive deletion ledger.
- **F09/F11:** verify current provider identity and RevenueCat rights through their [owning rules](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity), including gift expiry/revocation. SQL restoration does not restore a subscription, cancel billing or prove entitlement. Unknown current-account rights remain unknown under the SDK's accepted behavior. Reapply current [privacy restrictions](../../specs/004-advertising-privacy-legal/plan.md#legal-content-and-shared-privacy), including suppressed sporting contact values and affected images/attribution; restoration must not make them accessible again.
- **F07:** before controlled reads/counts/sends, remove inbox entries aged at least **29 elapsed days**, preserving original creation times and available nonpersonal match announcement facts. Apply current account/destination/follow restrictions. [F07 FR-043–046 and A51](../../specs/011-notifications-delivery/spec.md) accept an exceptional duplicate sporting announcement if restore lost facts; they permit no erased personal data or expired inbox resurrection. Do not replay uncertain pushes or maintenance-suppressed sends.
- **F04:** rebuild isolated OpenSearch derivatives from the reconciled PostgreSQL data through the [owning startup/full-rebuild path](../../specs/008-search-discovery/plan.md#projection-lifecycle). Start the candidate backend only after SQL reconciliation, under isolation/maintenance with outbound effects blocked. Verify complete alias replacement and current visibility before opening search; a failed/incomplete rebuild keeps affected search unavailable. No independent search backup chain is required. Source collection recovers only what suppliers still expose, not missing customizations, bytes or history.

Missing current evidence keeps the affected access/sends unavailable. Do not bypass that condition by assuming an erased account, revoked right or unknown provider state is valid. Use existing private provider/support tools for authorized manual resolution, with no new recovery service or ledger.

## Configuration outside PostgreSQL and reopening

Recover deployment/provider configuration separately from its authorized owner: [Dokploy environment/image/network/domain inputs](../dokploy/README.md#images-and-configuration), Auth0 applications/audiences and identities under [F05](../../specs/005-accounts-identity/plan.md#identity-and-account-establishment), and RevenueCat/store configuration under [F09](../../specs/006-pro-subscriptions/plan.md#environments-and-continuity). Use the existing private configuration and native provider records; a database dump neither contains them nor authorizes changing shared tenant/project settings. Re-establish only the isolated candidate's authorized connections. Missing credentials or provider recovery evidence remain explicit limits.

[F10 support cases and GitHub-native attachments](../../specs/012-reports-feature-suggestions/plan.md#privacy-recovery-and-shared-owners) live exclusively in the private GitHub destination. PostgreSQL restoration proves none of their recovery, access restrictions or erasure. GitHub's recovery capabilities remain the limit, without an independent Blockout support backup. A closed issue, removed link or restored business account is not attachment recovery/erasure evidence; qualify those provider operations separately. Never copy private case content or diagnostics here.

Record actual source/candidate versions, backup time, isolated destination, recovered scope/byte comparisons, role checks, current-obligation decisions, gaps and elapsed duration in existing **private** delivery evidence. No duration or loss guarantee follows. Remove temporary downloaded/extracted copies when their authorized purpose ends; restoring does not renew the original backup's retention. Keep source storage intact until any separate disposal decision.

Only after those checks and explicit reopening authorization may the operator reconnect the approved target through the [serialized delivery path](../dokploy/README.md#promotion-and-native-deployment), run any required compatible migration once, verify validation-only startup, readiness and owner outcomes, then lift maintenance/access and resume ordinary sends. Failed migration/startup or unresolved obligations keep the affected capability closed. The initial isolated proof itself opens no production access.

## Compatible application rollback

Use the [existing rollback qualification cases](../../specs/003-shared-quality/quickstart.md#delivery-and-operations) and exact previously qualified image digests. Verify compatibility with **current** schema/data and admitted mobile clients before selecting the older candidate. Keep maintenance enabled and use the same serialized delivery procedure; no SQL downgrade, volume deletion or automatic reversal of data is implied by replacing an image. A failed migration leaves restart blocked.

If the earlier image cannot use retained data, keep writers/access closed and choose an authorized forward repair or the isolated restoration above with a compatible image. Reconcile the restore point's gaps and all current obligations before reopening. After V2 opens, [F14](../../specs/014-v1-v2-transition/spec.md) requires V2 repair/restoration, not a functional return to V1. Its separately authorized logo-retention/reset checks are not performed by this procedure.
