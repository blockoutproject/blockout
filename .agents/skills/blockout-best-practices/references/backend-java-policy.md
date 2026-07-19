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
packages while that remains clearer. Do not create empty architecture folders. Do not use generic `impl`, `utils`,
`helpers`, `common`, or `support` packages.

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

Avoid `*Impl` and weak `Default`, `Jpa`, or `Transactional` prefixes for primary application services. Put records in the
package that owns their role; never create a generic `records` package.

## Transport Boundary

Until contract-first is activated, handwritten transport types stay at the API edge and use explicit names such as
`CreateClubInternalRequest`, `UpdateClubInternalRequest`, and `ClubInternalResponse`. Controllers and API mappers
translate them to application commands and views. Persistence entities never cross the boundary.

Complete resource mirrors in other applications must match the owning service's field semantics. Purpose-specific
events and query projections may be smaller when their role is explicit.

## Mappers And Reusable Logic

Put a mapper where the translated boundary lives:

- transport to application and application to transport: `api/mappers`;
- simple entity-to-view mapping: beside `application/views` or in the application service while genuinely local;
- persistence-local conversion: `infrastructure/persistence/mappers`;
- repository-backed read assembly: `application/projection` as a projector, not a mapper.

Prefer explicit construction for small handwritten shapes. Introduce MapStruct only when repeated structural mapping
creates enough mechanical code to justify it. Do not create static utility bags; promote shared behavior to a named
policy, validator, parser, mapper, gateway, projector, or provider.

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
