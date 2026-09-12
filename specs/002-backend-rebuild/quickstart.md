# Foundation Quickstart

Prerequisites: Java 25, repository Maven wrapper, Node/npm, Docker with Compose. No production credentials are needed for automated tests.

1. Run `./mvnw -f apps/backend/pom.xml -pl migrations,jobs,core-service,core-worker -am verify`.
2. Run `scripts/backend-foundation/build.sh` to build all three images from one Git revision.
3. Run `scripts/backend-foundation/local.sh up`. PostgreSQL starts, the Liquibase container exits successfully, then API and worker become ready.
4. Run `scripts/backend-foundation/smoke.sh` for image/migration/readiness/privilege proofs.
5. `scripts/backend-foundation/local.sh down` retains local data; `scripts/backend-foundation/local.sh reset` explicitly recreates only the isolated development volume.

Development Auth0 values use a reserved invalid issuer and have no real users. Protected-route JWT tests run with a controlled local JWKS server. For interactive Auth0 verification supply the existing issuer/audience/JWKS URL via documented environment values; never commit tokens or secrets.

A baseline edit before first production deployment requires an explicit local reset if checksums changed. Never run clearCheckSums. An ordinary restart preserves data. A failed migration blocks application startup.

Dead jobs require investigation. Operator replay: `UPDATE operations.jobs SET state='pending', available_at=clock_timestamp(), max_attempts=attempts+5, lease_token=NULL, lease_expires_at=NULL, finished_at=NULL WHERE id=:job_id AND state='dead'`; bind one reviewed UUID and inspect affected-row count. Never replay all work blindly.

This quickstart proves infrastructure only. It does not qualify real subscribers, sporting preservation, Sunday load or production cutover. Record executed/skipped checks on the issue/PR, not in repository delivery logs.
