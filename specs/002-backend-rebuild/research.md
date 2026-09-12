# Foundation Decisions

| Need                     | Decision                                                          | Simpler alternative                 | Consequence and verification                                        |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Foreground isolation     | Two executables, shared jobs library                              | One JVM                             | Separate resources/restart; prove worker failure does not stop API  |
| Atomic durable dispatch  | PostgreSQL jobs and leases                                        | In-memory queue                     | At-least-once effects; test rollback, expiry and fencing            |
| Repeatable fresh schema  | XML native Liquibase changes and one-shot image                   | Startup migration                   | Separate credentials/lifecycle; test image then application startup |
| Pre-production iteration | Mutable creation baseline until first monolith production release | Append every development alteration | Local reset is explicit; never hide checksum mismatch               |
| SQL least privilege      | Bootstrap namespace/roles, Liquibase table grants                 | Shared owner credentials            | Small GRANT SQL exception; prove runtime DDL rejection              |
| Builds                   | Existing Maven reactor with four narrow modules                   | Separate reactor                    | Existing parent maintained; no legacy model imports                 |
| API access               | Standard Spring Security JWT decoder                              | Custom token parsing                | Controlled issuer/audience/JWKS tests                               |
| Schema readiness         | Supported integer generation plus required tables                 | Assume migration ordering           | Missing/incompatible schema is not ready                            |
| Runtime proof            | Test-only handlers                                                | Production diagnostic job endpoint  | No artificial public behavior                                       |

Version evidence: existing Spring Boot 4.1.0 BOM manages Liquibase 5.0.3. Existing project uses Java 25/PostgreSQL 17. Official PostgreSQL SELECT documentation describes SKIP LOCKED for queue consumers. Spring recommends a single schema initialization mechanism. The imported Maaatch policy is portable; its repository-specific deployment posture is supplied separately for Blockout.

Execution deadlines use an independent bounded scheduler so a failed database health check cannot disable cancellation. Active work is keyed by lease token, preserving capacity accounting for an uncooperative old attempt while another lease processes the same job. PostgreSQL integration tests cover both failure modes.

## Package ownership and operational diagnostics

- Decision: role packages inside the current single-capability modules; PostgreSQL implements application publication/queue ports. Worker scheduling, attempt outcomes and telemetry have separate responsibilities. Expected publication and handler rejections return explicit results.
- Alternative: keep all classes at module roots or introduce empty business modules. The former obscures ownership; the latter invents domains outside this increment.
- Consequence: future business handlers depend on the job contracts, not JDBC adapters, and the worker alone owns acknowledgement. SQL callbacks commit atomically with success.
- Verification: real PostgreSQL publication/lease tests, SQL-effect completion metrics, mirrored test packages and the complete backend reactor.

- Decision: ECS JSON timestamps are UTC instants even for native JVM runs. Worker events have bounded structured fields and sanitized throwable snapshots retaining types/frames/causes, with a total diagnostic node budget.
- Alternative: default-zone Logstash timestamps and raw provider exceptions. Those depend on host configuration or risk exposing payloads/credentials.
- Consequence: operators retain failure locations and state transitions without raw exception messages; investigating payload content requires a separately authorized mechanism. Repeated polling outages log only one transition until recovery.
- Verification: diagnostic privacy and outage-transition tests, plus runtime JSON/UTC inspection.

## Identity and subscription decisions

| Need                                    | Decision                                                        | Simpler alternative                                            | Consequence and verification                                                |
| --------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Share the owner between two runtimes    | One identity library, feature-first packages                    | Copy user/subscription logic into both runtimes                | Real dependency boundary; verify Maven/Nx graph and assembly                |
| Fresh profile with stable paid identity | Unique issuer/subject and explicit unchanged RevenueCat binding | Use local UUID for purchases                                   | Concurrent PostgreSQL tests and controlled existing-customer read           |
| No unnecessary identity calls           | Read Auth0 only on first creation, outside transactions         | Provider lookup on each request                                | Existing-profile tests prove no dependency call; finite first-login failure |
| Concurrent pseudonyms                   | Normalized unique key with conflict arbitration                 | Pre-check only                                                 | Competing inserts cannot create duplicate identity or pseudonym             |
| Typed local Pro decision                | Persist minimal server evidence, four states                    | Trust client isPro or call provider on each match read         | Clock/negative authorization tests; no network on reads                     |
| Environment-isolated entitlement        | RevenueCat V2 subscription gives_access plus exact entitlement  | V1 get-or-create or environment-less active_entitlements alone | Complete pagination, sandbox exclusion, trials/promotion/grace cases        |
| Recoverable event processing            | HMAC webhook receipt plus existing jobs                         | Apply event types directly                                     | Duplicates, ordering, transfers and crash recovery tested                   |

Provider references: [Auth0 linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking), [RevenueCat identity](https://www.revenuecat.com/docs/customers/identifying-customers), [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior), [V2 subscriptions](https://www.revenuecat.com/docs/api-v2/customer/resources), [webhooks](https://www.revenuecat.com/docs/integrations/webhooks). Production configurations are verification inputs, not presumed inspected evidence. Existing affected users were already linked before billing adoption, as confirmed by the owner.
