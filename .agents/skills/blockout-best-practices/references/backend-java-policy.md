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

## Mappers And Reusable Logic

Follow `mapping-policy.md`. Put each mapper at the boundary it translates, prefer MapStruct for structural Java
mapping, and keep aggregation or decision-making explicit. Do not create static utility bags; promote shared behavior
to a named policy, validator, parser, mapper, gateway, projector, or provider.

## Review Triggers

- A class over 250 lines needs a clear reason.
- A class over 400 lines should normally split before gaining behavior.
- A method over 40 lines deserves a responsibility review.
- More than five injected collaborators usually signals too much coordination.
- Split by responsibility, never only by line count.

Expected business, API, authorization, dependency, and state-conflict failures use application exceptions with stable
semantics. API adapters translate them to `ProblemDetail`-compatible responses. Native exceptions remain for programmer
errors and unexpected technical failures.

## Verification

- Compile the impacted module from `apps/backend/pom.xml`.
- Run relevant tests and the reactor when a shared boundary changes.
- Inspect for accidental `impl`, `utils`, `helpers`, entity exposure, and transport leakage.
- Confirm package moves did not alter routes, ports, migrations, queue names, or runtime behavior outside scope.
- Run `git diff --check`.
