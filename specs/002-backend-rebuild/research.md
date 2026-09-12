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
