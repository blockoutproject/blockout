# Foundation Quickstart

Prerequisites: Java 25, repository Maven wrapper, Node/npm, Docker with Compose. No production credentials are needed for automated tests.

1. Run `npm run contracts:generate` before compiling the generated API boundary from a fresh checkout.
2. Run `./mvnw -f apps/backend/pom.xml -pl migrations,jobs,core-service,core-worker -am verify`.
3. Run `scripts/backend-foundation/build.sh` to build all three images from one Git revision.
4. Run `scripts/backend-foundation/local.sh up`. PostgreSQL starts, the Liquibase container exits successfully, then API and worker become ready.
5. Run `scripts/backend-foundation/smoke.sh` for image/migration/readiness/privilege proofs.
6. `scripts/backend-foundation/local.sh down` retains local data; `scripts/backend-foundation/local.sh reset` explicitly recreates only the isolated development volume.

Development Auth0 values use a reserved invalid issuer and have no real users. Protected-route JWT tests run with a controlled local JWKS server. For interactive Auth0 verification supply the existing issuer/audience/JWKS URL via documented environment values; never commit tokens or secrets.

A baseline edit before first production deployment requires an explicit local reset if checksums changed. Never run clearCheckSums. An ordinary restart preserves data. A failed migration blocks application startup.

Dead jobs require investigation. Operator replay: `UPDATE operations.jobs SET state='pending', available_at=clock_timestamp(), max_attempts=attempts+5, lease_token=NULL, lease_expires_at=NULL, finished_at=NULL WHERE id=:job_id AND state='dead'`; bind one reviewed UUID and inspect affected-row count. Never replay all work blindly.

This quickstart proves infrastructure only. It does not qualify real subscribers, sporting preservation, Sunday load or production cutover. Record executed/skipped checks on the issue/PR, not in repository delivery logs.

## Identity increment validation

Run focused `identity,core-service,core-worker` Maven verification with `-am`, then canonical `npm run backend:verify`. Native Liquibase initializes the PostgreSQL integration fixtures. Auth0 HTTP/JWKS fixtures use loopback only and synthetic identities; application startup has explicit fixture-safe configuration in isolated Compose, with no live credentials.

After an explicit reset of the disposable local database for generation 2, build the revision-tagged images and run the existing Docker smoke. Check identity table readiness and exact runtime DDL rejection. Verify contracts generation and the mobile TypeScript projection without changing current mobile API routing.

Controlled external evidence is separate: configure the retained tenant and RevenueCat project using secret environment injection, acquire a token through the established native/public-client flow, POST the current profile twice against the isolated replacement and verify one UUID, then verify paid evidence after the subscription worker is delivered. Never print tokens, raw provider responses, customer IDs or personal profile data. No restore, transfer, linking or deletion call is part of this server rehearsal. Record provider/native evidence still unavailable on the PR, not as completed tasks.

### Profile-only interactive configuration

The API requires `BLOCKOUT_IDENTITY_NATIVE_CLIENT_IDS`, `BLOCKOUT_IDENTITY_AUTH0_BASE_URL`, `BLOCKOUT_IDENTITY_AUTH0_CLIENT_ID`, `BLOCKOUT_IDENTITY_AUTH0_CLIENT_SECRET`, `BLOCKOUT_IDENTITY_BILLING_PROJECT_ID` and `BLOCKOUT_IDENTITY_BILLING_ENVIRONMENT` (production or sandbox), in addition to existing JWT configuration. Management credentials need only read:users. The management origin is fixed; the issuer may use the tenant's configured custom login domain. Never enable debug/wire logging for provider traffic. Local Compose defaults are explicitly unconfigured `.invalid` examples; they prove readiness, not real login.

The worker only imports identity schema readiness in the profile-only delivery, so it needs no Auth0 credentials. No RevenueCat key is required until its reconciliation adapter is delivered. The new core TypeScript client is generated into its own ignored namespace and is not connected to the current mobile providers.
