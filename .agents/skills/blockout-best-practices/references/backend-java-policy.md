# Blockout Backend Java Architecture Policy

Read this before moving Java packages, changing Spring services, adding collaborators, or changing backend Maven
modules.

## Structure

Organize complex services by business feature first, then technical role:

```text
service-root
├── ServiceApplication.java
├── feature
│   ├── api
│   │   ├── mappers
│   │   └── models
│   ├── application
│   │   ├── commands
│   │   └── views
│   ├── domain
│   └── infrastructure
│       ├── messaging
│       └── persistence
│           ├── entities
│           └── repositories
├── config
└── shared
```

A small single-feature service may use flat `api`, `application`, `domain`, `infrastructure`, `config`, and `shared`
packages while that remains clearer. Do not use generic `impl`, `utils`, `helpers`, `common`, or `support` packages.
Remove empty legacy packages. Retain an empty architectural package with `.gitkeep` only when a current accepted design
requires the location before its first implementation; do not create complete speculative package trees.

## Roles

- `api`: controllers, handwritten transport requests/responses, API mappers, and exception translation.
- `application`: use cases, boundary interfaces, application services, commands, views, policies, validation, and ports.
- `domain`: pure business concepts and invariants with no Spring Web, JPA, HTTP, or messaging dependency.
- `infrastructure`: entities, repositories, HTTP/provider clients, message consumers/publishers, storage, caches, and
  scheduled technical adapters.
- `config`: service-wide Spring configuration and typed properties.
- `shared`: stable cross-feature technical semantics only, such as error primitives or security extraction.

Controllers stay thin. Application contracts must not expose JPA entities, HTTP clients, multipart types, or transport
models. Infrastructure implements application ports when an outbound adapter needs a replaceable boundary; do not add
interfaces to simple internal collaborators without a real boundary.

### Application Contract

- Give one application service responsibility for one coherent use-case family. Keep orchestration explicit and pure
  decisions in named policies or domain values.
- Application inputs are immutable commands or focused scalar inputs. Application outputs are views or domain results,
  never entities, generated transport types, servlet types, multipart resources, HTTP clients, or message records.
- Put transaction ownership at the application operation that owns the write.
- Represent expected not-found, validation, authorization, dependency, and state-conflict outcomes with stable
  application exceptions. Do not use exceptions as ordinary branching or catch a failure only to conceal it.
- Introduce an outbound port when the application depends on a replaceable database, provider, storage, clock,
  messaging, or identity boundary. Do not create an interface and implementation pair for every class.
- Put records beside the role that owns them: API transport records in `api.models`, commands and views in
  `application`, provider records in their adapter, and persistence projections in infrastructure.

## Naming

- Boundary interface: `ClubService`, `AuthorizationDecisionService`.
- Primary implementation: `ClubApplicationService`, `AuthorizationDecisionApplicationService`.
- Application inputs: `CreateClubCommand`, `UpdateClubCommand`.
- Application reads: `ClubView`.
- Persistence: `ClubEntity`.
- Explicit collaborators: `ClubImageStorage`, `ClubEventPublisher`, `ClubGeocodingJob`.

Avoid `*Impl` and weak `Default`, `Jpa`, or `Transactional` prefixes for primary application services. Put records in
the
package that owns their role; never create a generic `records` package.

## Transport Boundary

Until its contract-first vertical is adopted, each handwritten transport type stays at the API edge and uses an explicit
name such as `CreateClubInternalRequest`, `UpdateClubInternalRequest`, or `ClubInternalResponse`. Controllers and API
mappers translate transport models to application commands and views. Persistence entities never cross the boundary.

After adoption, generated transport types and interfaces remain at the same edge. Application commands, views, domain
objects, persistence entities, provider models, and mapping stay handwritten and explicit.

Complete resource mirrors in other applications must match the owning service's field semantics. Purpose-specific
events and query projections may be smaller when their role is explicit.

Generated API interfaces and models are adapter contracts, not the application model. Implement them in the API layer,
map immediately, and prevent generated types from propagating into repositories, domain logic, or messages.

## Mappers And Reusable Logic

Follow `mapping-policy.md`. Put each mapper at the boundary it translates, prefer MapStruct for structural Java
mapping, and keep aggregation or decision-making explicit. Do not create static utility bags; promote shared behavior
to a named policy, validator, parser, mapper, gateway, projector, or provider.

- Keep transport mappers in `api.mappers`, persistence mappers next to persistence, provider mappers next to the
  provider adapter, and message mappers next to messaging.
- Use handwritten mapping where decisions, conditional enrichment, external lookups, or failure semantics matter.
- Reuse logic only when two active callers share the same invariant. Similar syntax does not justify a generic helper,
  reflection mapper, base service, manager, registry, or framework.

## Spring, Configuration, And Security

- Prefer constructor injection. Do not use field injection or application-context lookups.
- Keep `@ConfigurationProperties` typed, validated, and scoped to one integration or technical concern. Secrets never
  enter source control.
- Keep Spring annotations at adapters and application services where lifecycle or transactions require them. Pure
  domain values and policies remain framework-free.
- Extract authenticated identity and authorization context at the API/security boundary. Pass only application data
  required by the use case.
- Do not trust client-owned user, club, or scope identifiers when authenticated context owns them.
- Keep health, metrics, and technical endpoints separate from product controllers.

## Gateway And Service Boundaries

- `mobile-gateway` composes client-oriented workflows and shields mobile from internal topology. It does not become the
  canonical owner of service data.
- Organize a growing gateway by mobile workflow or feature and keep each downstream client in infrastructure.
- Services own complete business resources and persistence. Cross-service reads use owner-controlled contracts, not
  shared tables or entity imports.
- Preserve current timeouts, retry policy, circuit behavior, and failure translation unless an active task changes them
  with explicit evidence.

## Messaging

- Treat RabbitMQ messages as transport contracts. Keep event and command records separate from application and
  persistence models.
- Make queue, exchange, routing-key, retry, dead-letter, ordering, and idempotency behavior explicit at the adapter.
- A consumer maps the message, validates the boundary, and delegates to one application operation.
- Do not acknowledge a message before the owned operation reaches its accepted durable outcome.
- Preserve duplicate-delivery behavior and never assume exactly-once delivery.

## Maven And Dependencies

- Keep `apps/backend/pom.xml` as the backend reactor authority and each deployable service as an explicit module.
- Put versions and shared plugin configuration in the parent only when multiple modules genuinely share them.
- Add the narrowest dependency to the owning module. Do not add a library for trivial mapping, validation, collection,
  or string logic.
- Keep generated sources and build output outside Git. Do not hand-edit generator output.
- Use Java 21 and the repository-pinned Spring Boot, Maven plugin, compiler, Spotless, and test configuration.
- Do not mix architecture work with dependency or framework upgrades unless the issue explicitly includes them.

## Review Triggers

- A class over 250 lines needs a clear reason.
- A class over 400 lines should normally split before gaining behavior.
- A method over 40 lines deserves a responsibility review.
- More than five injected collaborators usually signals too much coordination.
- Split by responsibility, never only by line count.

Expected business, API, authorization, dependency, and state-conflict failures use application exceptions with stable
semantics. API adapters translate them to `ProblemDetail`-compatible responses. Native exceptions remain for programmer
errors and unexpected technical failures.

## Documentation

Follow `code-documentation-policy.md`. Public or locally shared handwritten contracts explain intent, ownership, and
failure semantics where the type and name are insufficient. Do not narrate Spring annotations, getters, mapping syntax,
or obvious control flow.

## Verification

- Compile the impacted module from `apps/backend/pom.xml`.
- Run relevant tests and the reactor when a shared boundary changes.
- Run Spotless through the repository format commands.
- Inspect for accidental `impl`, `utils`, `helpers`, entity exposure, and transport leakage.
- Inspect dependency direction, generated-model containment, transaction ownership, and message acknowledgement.
- Confirm package moves did not alter routes, ports, migrations, queue names, or runtime behavior outside scope.
- Run `git diff --check`.
