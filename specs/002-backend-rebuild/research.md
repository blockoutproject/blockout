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
