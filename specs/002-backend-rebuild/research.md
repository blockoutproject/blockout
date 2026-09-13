# Foundation Decisions

| Need                     | Decision                                                          | Simpler alternative                 | Consequence and verification                                        |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| Foreground isolation     | Two executables, shared jobs library                              | One JVM                             | Separate resources/restart; prove worker failure does not stop API  |
| Atomic durable dispatch  | PostgreSQL jobs and leases                                        | In-memory queue                     | At-least-once effects; test rollback, expiry and fencing            |
| Repeatable fresh schema  | XML native Liquibase changes and one-shot image                   | Startup migration                   | Separate credentials/lifecycle; test image then application startup |
| Pre-production iteration | Mutable creation baseline until first monolith production release | Append every development alteration | Local reset is explicit; never hide checksum mismatch               |
| SQL least privilege      | Bootstrap namespace/roles, Liquibase table grants                 | Shared owner credentials            | Small GRANT SQL exception; prove runtime DDL rejection              |
| Builds                   | Existing Maven reactor with focused replacement modules           | Separate reactor                    | Generated transport enums only at HTTP boundaries                   |
| API access               | Standard Spring Security JWT decoder                              | Custom token parsing                | Controlled issuer/audience/JWKS tests                               |
| Schema readiness         | Supported integer generation plus required tables                 | Assume migration ordering           | Missing/incompatible schema is not ready                            |
| Runtime proof            | Test-only handlers                                                | Production diagnostic job endpoint  | No artificial public behavior                                       |

Version evidence: existing Spring Boot 4.1.0 BOM manages Liquibase 5.0.3. Existing project uses Java 25/PostgreSQL 17. Official PostgreSQL SELECT documentation describes SKIP LOCKED for queue consumers. Spring recommends a single schema initialization mechanism. The imported Maaatch policy is portable; its repository-specific deployment posture is supplied separately for Blockout.

Execution deadlines use an independent bounded scheduler so a failed database health check cannot disable cancellation. Active work is keyed by lease token and stays counted until the task's run method exits, preserving capacity accounting for an uncooperative old attempt while another lease processes the same job. A bounded ArrayBlockingQueue covers the handoff between task completion and an idle executor thread; the dispatcher still reserves at most its configured concurrency. A SynchronousQueue can reject work during that handoff, and FutureTask.done runs on cancellation before the handler necessarily exits. These semantics follow the [JDK executor](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html) and [FutureTask](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/FutureTask.html) contracts. PostgreSQL integration tests cover both failure modes.

Content deduplication uses [PostgreSQL JSONB equality](https://www.postgresql.org/docs/17/datatype-json.html) plus the payload version. A Java canonicalizer and stored hash would duplicate the database's existing comparison semantics. The native comparison keeps exact numbers, nested values and array ordering with no additional state; real PostgreSQL tests cover equivalent content, conflicts, version changes and concurrent publication.

## Package ownership and operational diagnostics

- Decision: role packages inside the current single-capability modules; PostgreSQL implements application publication/queue ports. Worker scheduling, attempt outcomes and telemetry have separate responsibilities. Expected publication and handler rejections return explicit results.
- Alternative: keep all classes at module roots or introduce empty business modules. The former obscures ownership; the latter invents domains outside this increment.
- Consequence: future business handlers depend on the job contracts, not JDBC adapters, and the worker alone owns acknowledgement. SQL callbacks commit atomically with success.
- Verification: real PostgreSQL publication/lease tests, SQL-effect completion metrics, mirrored test packages and the complete backend reactor.

- Decision: one logging library supplies the standard Spring Boot StackTracePrinter extension used by API and worker. This avoids two copies drifting or coupling logging to a business module. ECS JSON timestamps are UTC instants even for native JVM runs. Worker events have bounded structured fields and keep the original throwable. Native ECS excludes error.message; StandardStackTracePrinter applies a type-only formatter to the exception and its causes, omitting suppressed failures. Spring owns traversal and formatting; there is no custom diagnostic graph or copied throwable.
- Alternative: sanitizing each throwable before logging creates a second representation and loses its native error type. The standard [Spring Boot ECS formatter](https://docs.spring.io/spring-boot/reference/features/logging.html) owns serialization and privacy for the configured stdout sink. Any future appender must apply the same privacy policy; no additional appender or remote sink is introduced here.
- Consequence: operators retain exception types, causal call sites and state transitions without raw exception messages; investigating payload content requires a separately authorized mechanism. Repeated polling outages log only one transition until recovery.
- Verification: diagnostic privacy and outage-transition tests, plus runtime JSON/UTC inspection.

The error contract follows [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html#section-3.1.1): an omitted type means about:blank. Spring's standard ProblemDetail serialization is retained; the source OpenAPI declares type optional and the security handler supplies the required safe detail. A custom serializer to force a default type would add a second serialization policy without changing recovery semantics. HTTP and generated-consumer checks verify the boundary.

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

## Standard validation and provider integration

- Need: configuration errors must stop startup without maintaining a parallel validation framework.
- Decision: Spring Boot `@Validated` configuration records with Jakarta `@NotBlank`, `@NotEmpty`, `@Size`, `@Pattern`, `@Min`/`@Max`, and Hibernate Validator `@URL`/`@DurationMin`. Only the worker's relationship between polling, renewal, lease and shutdown durations needs a short `@AssertTrue` method. Validate at the boundary; application records do not repeat already established transport or configuration checks.
- Alternative: constructor checks, a custom URL policy, fixture-only production flags, and bespoke constraint annotations. These introduce additional behavior without helping the operator-configured deployment. Production configuration uses HTTPS; HTTP fixtures use normal property binding.
- Decision: Spring Security's `JwtAudienceValidator` and `RestClientClientCredentialsTokenResponseClient` own JWT audience and OAuth protocol behavior. The Auth0 adapter supplies the audience/scope, translates safe failures, and retains synchronized token caching and provider backoff. Its typed provider profile is decoded by Spring/Jackson and validated once with Bean Validation before database writes; our OpenAPI contract cannot validate an external Auth0 response.
- Consequence: no handwritten OAuth token JSON parser, recursive throwable sanitizer or custom URL validator. Spring's one-second expiry fallback is rejected to prevent immediate repeated token issuance. Internal queue publication still validates its own contract because it has no HTTP/generated validation boundary; transaction ownership and lease fencing still protect real concurrent writes.
- Verification: Spring context startup tests for invalid properties, controlled Auth0 request/expiry/concurrency tests, API/JWKS tests, PostgreSQL profile and queue tests, generated-consumer compilation and isolated runtime smoke.

Official references: [Spring configuration validation](https://docs.spring.io/spring-boot/reference/features/external-config.html#features.external-config.typesafe-configuration-properties.validation), [Hibernate Validator constraints](https://docs.hibernate.org/validator/9.1/reference/en-US/html_single/), [Spring OAuth client credentials](https://docs.spring.io/spring-security/reference/servlet/oauth2/client/authorization-grants.html#oauth2Client-client-creds-grant), [Spring JWT validation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html#oauth2resourceserver-jwt-validation).

## Module, HTTP And Monitoring Boundaries

- Need: enforce the current Maven/package boundaries without introducing another runtime architecture.
- Decision: test-only [ArchUnit rules](https://www.archunit.org/userguide/html/000_Index.html) cover cycles, generated
  transport leakage, inward dependency direction and private infrastructure. [Spring Modulith](https://docs.spring.io/spring-modulith/reference/fundamentals.html)
  offers module detection/named interfaces and broader modular testing; those conventions would require additional
  metadata for this layout. ArchUnit directly expresses the required rules with no production dependency.
- Verification: architecture tests run in both executable assemblies; the worker consumes Spring's HealthIndicator
  instead of the queue adapter's concrete type.

- Need: consistent, safe errors from both security filters and MVC, with credentials and recovery owned at the client edge.
- Decision: native [ProblemDetail and ResponseEntityExceptionHandler](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html),
  generated ApiProblemCodeEnum and one safe detail factory. The [Spring generator options](https://openapi-generator.tech/docs/generators/spring/) select Boot 4, Jackson 3, JSpecify and native MVC validation; constraints stay generated while class-level @Validated proxies are unnecessary. The [Orval mutator](https://orval.dev/docs/guides/custom-client/)
  uses expo/fetch and an injected native credential supplier. It preserves unknown error codes, keeps 401/403 distinct,
  supports timeout/cancellation and never retries or exposes provider prose. Current screens remain on their existing API.
- Verification: real HTTP tests for validation, malformed bodies, negotiation, missing routes and authorization; mobile
  generated-boundary tests for credentials, safe errors, unknown codes and cancellation.

- Need: real metric collection/display and safe diagnostics rather than configuration files alone.
- Decision: native ECS plus Spring Boot's [StackTracePrinter extension](https://docs.spring.io/spring-boot/reference/features/logging.html#features.logging.structured.stack-traces).
  The standard printer uses withFormatter to omit exception messages; a fabricated Throwable would lose the native error.type.
  Pinned Prometheus/Grafana containers use [file provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
  and [promtool rule tests](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/).
- Verification: captured ECS asserts the original exception type without private messages; an isolated smoke validates
  scrapes through Grafana and loaded dashboards/alerts. No production account or notification destination is changed.
