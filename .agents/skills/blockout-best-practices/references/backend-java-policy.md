# Blockout Backend Java Architecture Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

In Blockout, references to a BFF describe the target facade role of `apps/backend/mobile-gateway`. They do not imply
that generated gateway contracts or facade policies are already migrated.

Read this before moving backend Java packages, changing Spring services, adding service collaborators, changing backend
Maven modules, or moving backend tests.

Documentation rules stay in code-documentation-policy.md.

## Core Rule

Backend Java code is organized by business feature first, then by technical role.

For complex services, prefer:

```text
service-root
├── ServiceApplication.java
├── feature-a
│   ├── api
│   │   └── mappers
│   ├── application
│   │   ├── commands
│   │   ├── views
│   │   ├── projection
│   │   ├── policies
│   │   ├── validation
│   │   └── mutation
│   ├── domain
│   └── infrastructure
│       └── persistence
│           ├── entities
│           ├── repositories
│           └── mappers
├── feature-b
│   ├── api
│   ├── application
│   ├── domain
│   └── infrastructure
└── shared
```

For small services, a flat structure is allowed only while it stays readable:

```text
service-root
├── api
├── application
├── domain
├── infrastructure
├── config
└── shared
```

The subpackages shown above are role examples, not mandatory folders. Do not create empty architecture folders. Do not
use generic impl, utils, helpers, common, or support packages.

## BFF Facade Structure

The BFF follows this policy too. This section only changes the top-level grouping rule: BFF code is organized by
frontend facade workflow first, then by technical role. All other rules in this policy still apply unchanged, including
application contracts, DTO boundaries, mapper placement, reusable logic, expected errors, test structure, and
verification.

A facade workflow is the product surface optimized for the frontend, not a copy of a downstream service boundary. For
example, `competition/setup`, `competition/play`, and `competition/publication` are valid BFF workflow packages when
they match frontend journeys. Do not mirror every `competition-service` feature such as `stage`, `fixture`, `standing`,
or `transition` unless that split is also a distinct BFF workflow with its own API, orchestration, and tests.

For a growing BFF domain, prefer:

```text
bff
├── BffApplication.java
├── competition
│   ├── setup
│   │   ├── api
│   │   │   └── mappers
│   │   ├── application
│   │   │   ├── commands
│   │   │   ├── views
│   │   │   └── ports
│   │   └── infrastructure
│   │       └── competitionservice
│   ├── play
│   │   ├── api
│   │   ├── application
│   │   └── infrastructure
│   │       └── competitionservice
│   └── publication
│       ├── api
│       ├── application
│       └── infrastructure
│           └── competitionservice
├── me
│   ├── api
│   ├── application
│   └── infrastructure
├── users
│   ├── api
│   ├── application
│   └── infrastructure
└── shared
```

For small BFF facade domains, a flatter `domain/{api,application,infrastructure}` shape is allowed while it stays
readable. Split into workflow packages only when the domain grows enough that one controller, gateway, mapper, or
application service would become a catch-all for unrelated frontend journeys. A workflow may map to a frontend screen,
page group, or user journey. The same rule applies to `me`, `users`, `authorization`, and any future BFF domain: keep it
flat while it has one clear workflow, then add workflow packages inside that domain when new frontend-facing workflows
appear. Do not create empty workflow packages.

BFF application code owns UI workflow orchestration, cross-service aggregation, capability filtering, session context,
and BFF-specific authorization checks. It does not own downstream business decisions. A BFF write calls the service that
owns the domain decision, and a BFF read may assemble a frontend projection from one or more downstream services.

BFF `domain` packages are optional and should be rare. Use them only for pure BFF-owned product concepts with real
invariants. Most BFF commands, views, decisions, and projection records belong in the workflow's `application` role.

BFF infrastructure packages contain generated downstream clients, downstream DTO mappings, cache adapters, and other
outbound technical details. Keep generated BFF DTOs at the inbound API edge, and keep generated downstream DTOs at the
outbound adapter edge.

BFF inbound DTO mappers live under the workflow's `api/mappers` package. Prefer the workflow name plus `Mapper`, such
as `CompetitionSetupMapper`, rather than repeating the `Api` suffix in the class name when the package already carries
the API role. Use a stronger boundary name only when it avoids a real collision or distinguishes an outbound adapter,
for example `ProfileServiceUserProfileMapper` under `infrastructure/profileservice`.

Use explicit DTO construction for simple application view to BFF response mappings. Reserve
`ObjectMapper.valueToTree(...)` or `ObjectMapper.convertValue(...)` in BFF API mappers for neutral JSON payload
pass-throughs, generated contract payloads, or other explicit JSON boundaries; do not use it to hide straightforward
field-by-field response mapping.

## Package Roles

### api

Inbound adapters and API-facing code:

- REST controllers
- OpenAPI delegates
- request and response DTOs
- API mappers under `api/mappers`
- API exception handlers
- BFF facade controllers

Controllers stay thin. They translate transport concerns into application commands, queries, or service calls.

### application

Use cases and orchestration logic:

- application service interfaces
- primary application service implementations
- commands and queries
- use-case result records
- validators
- authorization checks
- idempotency boundaries
- dependency guards
- projectors
- policies coordinating several dependencies
- ports required by the use case

Application code may depend on the local domain. It must not expose JPA entities, HTTP clients, or transport DTOs as its
main contract.

Use application subpackages when a feature grows enough for the role to matter:

- `commands` for use-case command records, query inputs, mutation inputs, and request contracts owned by the use case.
- `views` for application read models returned by use cases and simple entity-to-view mappers such as
  `CompetitionViewMapper`.
- `projection` for real read assembly, enrichment, repository-backed projection logic, and projectors.
- `policies`, `validation`, `guards`, `mutation`, `loading`, `calculation`, or another role-specific package for named
  collaborators with that responsibility.

Do not add a generic `application/mappers` package by default. Put a mapper at the boundary it translates: API,
application command/view/policy, projection, or persistence. Keep `application/mappers` only as a temporary migration
package or when a mapper genuinely spans several application contract families and no tighter role package is clearer.

### domain

Business concepts owned by the feature:

- value objects
- domain entities or aggregates
- domain events
- domain policies
- domain exceptions
- domain-specific enums
- invariant checks

Domain code must not depend on Spring Web, Spring Data repositories, generated OpenAPI classes, HTTP clients, messaging,
or persistence infrastructure.

Do not place records in `domain` just because they are immutable, shared by several application classes, or free from
adapter dependencies. Application commands, inputs, decisions, plans, and read views belong to the application role that
owns that contract unless they are pure business concepts with domain invariants.

### infrastructure

Outbound adapters and technical implementation details:

- JPA entities
- Spring Data repositories
- persistence mappers under `infrastructure/persistence/mappers`
- HTTP clients
- message publishers and consumers
- cache adapters
- storage adapters
- feature-local technical configuration

Infrastructure may implement application ports. It must not hide business decisions.

### config

Spring configuration and typed properties that affect the whole service.

Feature-local configuration may stay under the feature’s infrastructure package.

### shared

Only for stable cross-feature semantics:

- security principal extraction
- clocks and time providers
- error primitives
- API problem details
- shared technical configuration
- reusable test fixtures

Do not move business concepts to shared just because two features currently need similar code. Prefer local ownership
until the shared contract is obvious.

## Service Boundaries And Naming

Application services exposed to a controller, OpenAPI delegate, message handler, scheduled job, or another service
boundary use an interface named for the boundary:

txt UserAccountService AuthorizationDecisionService CompetitionAuthorizationService CommandIdempotencyService

The primary in-process implementation uses ApplicationService:

txt UserAccountApplicationService AuthorizationDecisionApplicationService CompetitionAuthorizationApplicationService
CommandIdempotencyApplicationService

Use explicit role names for collaborators:

txt StageTransitionEligibilityPolicy FixtureResultCorrectionValidator CommandRequestHasher StandingRecordProjector
CorrectionDependencyGuard CorrectionDependencyRefRecorder AuthorizationGatewayHttpClient ActivityAdapterRegistry

Do not add an interface for every class. Internal collaborators such as parsers, factories, mappers, policies,
resolvers, hashers, and one-off validators stay concrete until they become a real adapter or boundary.

Avoid \*Impl and weak implementation prefixes such as Default, Jpa, or Transactional for primary application services.
Transactions and persistence technology belong in annotations, dependencies, and behavior, not in the primary class
name.

## Application Contracts And API DTO Boundary

Application service contracts should expose domain models, commands, queries, use-case result records, or named
application read models. They should not expose generated OpenAPI request, response, list, or page DTOs as their main
contract.

Controllers and API mappers are the transport boundary. They may implement generated OpenAPI interfaces and return
generated OpenAPI DTOs, but generated DTO construction should stay in `api` adapters, API mappers, or equivalent
transport-facing code.

For list and page use cases, use an application-owned page/result shape before the API layer maps it to the generated
REST wrapper. The application shape must preserve the business ordering and pagination semantics needed by the API
contract, but it should not be named after the generated response DTO.

Application read models should be named after the use case or business projection they represent and should usually live
under `application/views`. Do not create one-to-one mirrors of generated response DTOs only to satisfy layering. A
temporary mirror is acceptable for an audit correction or migration step when it removes a direct generated DTO
dependency; consolidate it opportunistically when the projection gains business meaning or the touched code is next
refactored.

Complex read assembly, enrichment, or repository-backed projection logic belongs in application projection services or
projectors under `application/projection`, not in controllers or API mappers. API mappers should translate application
read models to generated DTOs without loading repositories, enforcing authorization, or making business decisions.

Generated OpenAPI enums may be used where the enum schema is the stable shared contract. Generated payload DTOs used as
durable contract JSON should be isolated at an explicit contract-payload boundary and converted at the API,
application, or persistence edge that owns that contract. Do not let generated payload DTOs become the general-purpose
domain model for a feature.

Apply this boundary incrementally. When touching existing code, prefer moving generated DTO exposure back to the API
edge if the change is already in scope. Do not perform a broad mechanical refactor only to satisfy this rule.

## Record Placement

Java records are data contracts, not a shortcut for leaving unnamed tuples inside services. Do not create `records`
packages: `record` is a Java form, not an architectural role. Put a record in the package that owns the contract it
represents:

- `domain` only for pure business concepts owned by the feature, with no Spring, JPA entity, generated DTO, JSON, HTTP,
  persistence, or adapter details.
- `application/commands` for use-case commands, query inputs, mutation inputs, and stable request contracts owned by a
  use case.
- `application/views` for application read models and `*View` records returned by use cases or consumed by API mappers.
- `application/projection` only for records that are truly owned by read assembly or a projector. Do not move a record
  there just because it is immutable or returned by a method.
- `application/policies`, `application/calculation`, `application/mutation`, or another role-specific application
  package for decisions, plans, calculation inputs, mutation internals, and local contracts exchanged between
  collaborators in that role.
- `api` only for handwritten transport-facing DTOs or API mapper shapes that intentionally belong to the inbound
  adapter. Prefer generated OpenAPI DTOs at the API edge when the contract already exists.
- `infrastructure` only for adapter-local persistence or integration shapes that must not leak back into application
  contracts.

Prefer a top-level public or package-private record when the shape crosses a class boundary or becomes a stable local
application contract. A tiny private record may stay nested when it is only an implementation tuple for one class and
extracting it would make the flow harder to read. If several records are only meaningful together inside one engine,
keep them beside that named collaborator or introduce a clearer collaborator boundary before scattering them across
packages.

Name records after their role in the business or application flow. Avoid generic `*Data` growth when a stronger name
exists; use suffixes such as `CommandData`, `View`, `Decision`, `InputData`, `PlanData`, or `Scope` only when they make
the boundary clearer.

## Mapper Placement

Mappers live at the boundary they translate. Do not group all mappers into a feature-level `mapping` bag or a generic
`application/mappers` package.

- Generated OpenAPI DTO to application contract, and application contract to generated OpenAPI DTO: `api/mappers`.
- Simple persistence entity to application read model: `application/views`, named after the target view family such as
  `CompetitionViewMapper`.
- Repository-backed read assembly, enrichment, pagination composition, or current-state projection:
  `application/projection`,
  named as `*Projector` or `*ProjectionService` when it really orchestrates a read projection.
- Application payload conversion with validation, policy, or business semantics: the owning application role package,
  such as `application/policies`, `application/mutation`, or a specific payload role package.
- Persistence entity to persistence-local shape, or persistence adapter conversion that must not leak to application:
  `infrastructure/persistence/mappers`.

MapStruct mappers follow the same placement rules. Use one mapper per coherent source/target family, not a static
utility bag. If a mapper spans several application contract families, first look for a clearer collaborator boundary
before adding or keeping a generic mapper package.

## Reusable Logic

Centralize reusable logic when it becomes a shared semantic operation across controllers, services, policies, or
adapters.

Do not flatten reusable logic into generic utilities. Promote it to a named collaborator or boundary with a clear role:

txt Provider Resolver Policy Validator Parser Mapper Gateway Projector Recorder Hasher

Prefer a local feature-owned boundary first. Introduce a shared Maven module only when several services have the same
contract, dependencies, and error semantics.

For repeated JSON payload conversions in backend services, do not copy private helpers such as `convertNullable(...)`
or ad hoc `ObjectMapper.convertValue(...)` wrappers in every mapper. Centralize the conversion behind a named
role-specific collaborator, for example a service-local `JsonPayloadMapper` under `shared.api.mappers` for API
projection mappers, or an application-owned `PayloadPolicy` / `PayloadMapper` when validation or business semantics are
involved. Keep feature mappers responsible for business field names and DTO composition; the shared collaborator should
only own the mechanical JSON tree / generated DTO conversion semantics.

Authentication identity extraction is a service boundary, not controller glue. When a Spring service needs the
authenticated JWT subject, use a named collaborator such as:

txt shared.security.AuthenticatedPrincipalProvider

or a feature-local equivalent when the behavior is feature-specific.

## Service Size And Splits

These are review triggers, not formatting rules:

- a class over 250 lines needs a reason
- a class over 400 lines should usually be split before adding behavior
- a method over 40 lines should be checked for hidden validation, mapping, querying, or branching
- more than 5 injected collaborators usually means the class coordinates too many concerns
- a package mixing unrelated use cases should split by feature
- an application package becoming a service bag should split by use case or collaborator role

Split by responsibility, not by line count.

Good extraction names are domain-specific:

txt StageTransitionEligibilityPolicy FixtureResultCorrectionValidator CommandRequestHasher StandingRecordProjector
CompetitionAccessPolicy

## Expected Errors

Expected business, API, authorization, idempotency, dependency, and state-conflict failures use local application
exceptions with:

- stable code
- useful message
- HTTP or semantic status when the service owns an API boundary

Application services throw application exceptions. API adapters translate them to ProblemDetail.

Use native Java exceptions only for programmer errors or impossible technical failures.

## Maven Parent And Modules

- Keep versions and generated-code plugin defaults in the backend parent dependencyManagement and pluginManagement.
- dependencyManagement and pluginManagement do not activate dependencies or plugins by themselves.
- Child modules still declare the dependencies and plugins they use.
- Put runtime dependencies in the module that uses them.
- Share test dependencies from the parent only when most application modules need them.
- Never edit generated schemaMappings in apps/backend/pom.xml by hand.

## Test Structure

Tests mirror production packages first.

Use suffixes that signal runtime weight:

txt *UnitTest *WebMvcTest *JpaTest *IntegrationTest \*SmokeTest

Move tests with the production surface they exercise.

Prefer @DisplayName on backend tests that are actively touched.

Do not add architecture source-scan tests only to enforce package naming when targeted inspection is enough.

## Project-Specific Rules

competition-service keeps V1 sporting ownership in one module. It follows the same feature-first package rule as other
complex services.

BFF modules follow the BFF Facade Structure section above. Existing small facade domains such as `authorization`, `me`,
and `users` may stay flat while readable; if they grow, they split by frontend workflow inside the same domain. Growing
domains such as `competition` split by frontend workflow before they mirror downstream service internals.

Do not introduce non-V1 vocabulary as V1 target vocabulary.

## Verification

Before accepting backend Java changes:

- changed backend Java compiles from apps/backend/pom.xml
- relevant tests pass, or skipped tests are documented with a reason
- rg finds no unintended services.impl, \*Impl, weak Default / Jpa / Transactional service names, or generic package bags
- package moves do not change OpenAPI contracts, generated sources, controller paths, Flyway migrations, ports, or
  runtime behavior
- no non-V1 vocabulary is introduced as V1 target vocabulary
- git diff --check passes
