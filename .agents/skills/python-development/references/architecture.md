# Architecture, models and composition

## Feature and dependency ownership

A growing application groups by capability, then by occupied roles:

```text
feature/
  application/       # use cases, commands/results, outbound needs
  domain/            # pure values and invariants, only when needed
  infrastructure/    # external APIs, provider parsing, storage and adapters
  api/               # incoming invocation adapter, only when it exists
config/              # validated process configuration
bootstrap.py         # explicit composition and resource lifecycle
```

The role matters more than forcing a directory for one small file. A single-feature application can keep these responsibilities flat. A CLI or scheduler invokes the application; it does not acquire ownership of business rules. A standalone script does not need a package, application class or new dependency manager solely to match this diagram. Use a `src` layout for a new installable package. A local utility may use argparse, standard-library parsing and a few ordinary functions; configuration objects, service classes and protocols need actual responsibilities.

The domain imports neither HTTPX, generated packages, settings libraries nor infrastructure. The application imports its own contracts and useful domain concepts, not concrete adapters, parser nodes or HTTP response objects. Infrastructure translates external representations and satisfies application-owned needs. The composition root may import concrete implementations because it assembles them. Across features, use an explicit application API; do not import another feature's private adapter or mutable working state.

A provider parser and its raw records remain in that provider adapter. If application decisions need a normalized observation, the consuming application owns its shape. Do not import a provider-specific model into the application and call that isolation. Do not create a second domain model merely to mirror an application projection.

## Functions, services and ports

Use a function for a calculation, mapping, pure decision or small operation with explicit inputs. Use an application class when several operations form a coherent use case or a use case has a stable dependency set. Constructor parameters describe those dependencies; method parameters describe the current request. A single-method class can be useful for that stable composition, but one class per operation is not mandatory.

Keep clients/resources with their actual owner. Construct adapters and application objects in the entry point, passing instances directly. No service locator, implicit global client, DI container or `Service`/`ServiceImpl` pair. An application service must not instantiate a concrete network adapter internally. Directly calling an owned pure function is not a dependency-injection failure.

Declare a small `Protocol` at a genuine outbound seam such as source retrieval, an API write or storage. Express the needed operation and typed application values rather than copying a whole SDK. Structural typing does not require the concrete class to inherit the protocol. A typed callable is enough for a simple single-operation dependency when naming a protocol adds no useful contract. No protocol per ordinary class, generic `BaseRepository` or abstraction created only for a possible future implementation.

A reusable service retains dependencies, not mutable request results, counters or previous-run errors. Allocate run state in the method or an explicitly run-scoped object. An instance lock protects that instance only; it does not provide distributed exclusion. A genuinely stateful component must declare who creates it, who can mutate it and who closes it.

## Model selection

| Role                                                 | Default                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Application command/result or shared value           | Frozen dataclass with explicit fields                        |
| Domain value with invariants                         | Dataclass or focused class enforcing those actual invariants |
| Temporary reconciliation state                       | Mutable object confined to one owned execution               |
| Structured external input without generated contract | Pydantic model in its adapter                                |
| OpenAPI transport                                    | The generated object model; no handwritten DTO mirror        |
| Dictionary required by a library                     | Keep local; use `TypedDict` for a stable dictionary contract |

`frozen=True` prevents attribute reassignment, not mutation of nested lists or dictionaries. Use tuples/frozensets or deliberate copies when the shared-value contract needs them. Do not require deep copies, `slots` or keyword-only dataclasses everywhere; use named construction when it makes roles unambiguous. Keep mutable buffers internal rather than exposing them through a supposedly immutable result.

Constructor invariants belong to the meaningful object. Do not add another validation pass to every internal method. A data container need not become a rich domain entity. A separate type needs a real difference in contract, invariant, validation, lifecycle or consumer semantics. Do not rename a generated DTO into a handwritten transport duplicate.

Closed owned vocabularies use enums; external extensible identifiers do not automatically become enums. Exact contract-owned generated enums may be reused in application commands/results, but entering pure domain code requires a domain-owned concept and explicit mapping. Preserve supported unknown-provider behavior without silently inventing a valid status.

## Typing and readable Python

For new managed projects, configure mypy strict for handwritten production modules and tests from the start, with project-owned compatible tooling. Annotate function/method parameters and returns, including private helpers, fixture factories and test functions. Infer obvious locals. Prefer readable named contracts over chains of calculated types, generic machinery or a dictionary carrying unrelated value variants.

Narrow untrusted objects through verified validation. Do not propagate `Any`, use `cast` as validation or broaden an interface to silence the checker. Generated code may require a narrowly scoped module override; still check handwritten callers and exposed types. A documented `type: ignore[error-code]` may bridge a verified third-party limitation at the adapter, not disable checks application-wide. Prefer available supported library stubs over inventing a parallel SDK. Record what the checker cannot prove.

Keep snake_case functions/modules, meaningful role names and simple comprehensions. Use a loop when branching, exception handling or multiple operations make a comprehension obscure. Avoid broad inheritance, metaclasses, registries or decorators for ordinary application flow. Importing a module must not read settings, open clients, start a scheduler or perform I/O.

Before extracting a helper, search existing owners. A private function used once is valid when it names a coherent step; an exported application contract can have one consumer. Share identical knowledge at the narrowest useful owner when actual consumers need it, then remove copies. Do not invent global utils or add layers around an unresolved ownership problem.

## Composition and mechanics

The composition root loads configuration, creates resources, constructs concrete adapters, injects the application and invokes it, then closes the owned resources. A CLI, scheduler or framework entry calls this composition at its proper lifecycle boundary. This sequence does not require a shared bootstrap framework.

Language mechanics: [dataclasses](https://docs.python.org/3/library/dataclasses.html), [Protocols](https://typing.python.org/en/latest/spec/protocol.html), [mypy strict options](https://mypy.readthedocs.io/en/stable/command_line.html) and [package layouts](https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/). Feature roles and the hybrid style are this pack's conventions.
