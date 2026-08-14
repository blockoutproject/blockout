# Backend Java Architecture

Apply this policy when changing Java packages, Spring components, Maven modules, or backend boundaries. Build only the
architecture required by the designated issue; do not infer future services, persistence, security, caching, or messaging.

## Structure And Ownership

Organize a growing service by business feature first, then by technical role:

```text
service-root
├── ServiceApplication.java
├── feature
│   ├── api
│   ├── application
│   ├── domain
│   └── infrastructure
├── config
└── shared
```

A small single-feature service may keep flat `api`, `application`, `domain`, `infrastructure`, and `config` packages
while that is clearer. Create packages when behavior needs them, not as an empty speculative tree.

- `api` owns generated-interface implementations, transport mapping, input validation, and error translation.
- `application` owns use cases, commands, views, orchestration, policies, and outbound ports.
- `domain` owns framework-free business concepts, invariants, and decisions.
- `infrastructure` owns database, HTTP, messaging, storage, cache, and other technical adapters.
- `config` owns service-wide Spring wiring and typed properties.
- `shared` is reserved for stable technical semantics used by several active features.

Avoid generic `impl`, `utils`, `helpers`, `common`, `support`, and `records` packages. Place a type beside the role that
owns it.

## Application Boundary

- Give an application service one coherent use-case family. Keep controllers and technical adapters thin.
- Use immutable commands or focused scalar inputs. Return application views or domain results.
- Do not expose generated transport types, JPA entities, servlet types, HTTP clients, or message records through the
  application boundary.
- Put transaction ownership on the application operation that owns the write.
- Represent expected validation, authorization, not-found, conflict, and dependency outcomes with stable application
  semantics. Exceptions are not ordinary branching.
- Introduce a port only for a real replaceable boundary such as persistence, an external provider, storage, clock, or
  messaging. Do not create an interface and implementation for every class.

Prefer explicit role names such as `CreateResourceCommand`, `ResourceView`, `ResourceEntity`,
`ResourceApplicationService`, `ResourceStorage`, and `ResourceEventPublisher`. Avoid `*Impl` and weak prefixes such as
`Default`, `Jpa`, or `Transactional` when they do not explain the responsibility.

## Transport And Mapping

Generated server interfaces and DTOs are API adapter contracts. Implement the interfaces in `api`, map their values
immediately, and prevent generated models from spreading into application, domain, persistence, or messaging code.
Entities and provider payloads never cross an HTTP boundary.

Follow `mapping.md`. Put each mapper at the boundary it translates. Prefer MapStruct for mechanical Java mapping and
handwritten code for decisions, aggregation, polymorphic dispatch, enrichment, or failure semantics.

## Spring And Configuration

- Use constructor injection. Never use field injection or application-context lookup.
- Keep domain objects and pure policies free of Spring, HTTP, persistence, and messaging annotations.
- Use typed, validated `@ConfigurationProperties` scoped to one integration or technical concern.
- Extract identity and authorization context at the API or security boundary; pass only application data to use cases.
- Keep health and technical endpoints separate from product controllers.
- Keep each executable application in its own Maven module and generated sources under `target`.
- Add the narrowest dependency to the owning module. Centralize a version or plugin only when several modules share it.
- Do not combine an architecture change with a framework or dependency upgrade unless the issue includes both.

## Service And Integration Boundaries

- The mobile gateway composes client-oriented workflows and hides internal topology; it does not become the canonical owner of
  service data.
- A service owns its complete business resources. Cross-service reads use owner-controlled contracts, never shared
  tables or imported entities.
- An outbound adapter translates dependency failures once and contributes the technical context it owns.
- When messaging changes, make routing, retry, dead-letter, ordering, acknowledgement, and
  idempotency semantics explicit. Never assume exactly-once delivery.

## Complexity Review

Size is a review signal, not a mechanical limit:

- review a class above roughly 250 lines or a method above roughly 40 lines;
- review an application service with more than five injected collaborators;
- split by responsibility or change axis, never only by line count;
- extract shared behavior only when multiple active callers share the same invariant.

## Verification

- Run the focused tests while iterating and `./mvnw -f apps/backend/pom.xml verify` before delivery.
- Inspect dependency direction, transport leakage, transaction ownership, configuration, and generated outputs.
- Apply `java-testing.md`, `logging.md`, and `code-documentation.md` when those concerns change.
- Run formatting and repository diff-hygiene checks.
