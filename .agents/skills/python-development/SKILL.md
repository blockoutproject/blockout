---
name: python-development
description: "Design and implement new typed Python backend applications: feature boundaries, explicit mapping, configuration and async ownership. Covers small scripts and conditional ingestion without selecting a web framework or ORM."
---

# Python backend development

Read the accepted behavior, Python version and project tooling. Apply these conventions within the requested change.

## Working conventions

- Organize growing applications by business feature and occupied responsibilities. Keep small scripts small.
- Use classes for coherent orchestration with stable constructor-injected dependencies; use functions for transformations, mapping and simple operations. Assemble explicitly at startup. A consumer-owned `Protocol` describes a real external need, not every implementation class.
- Keep commands/results and shared internal values immutable by default. Mutable working state needs an explicit owner and execution lifetime; do not keep per-run data in a reusable service.
- Keep generated object DTOs and clients in transport adapters. Reuse an exact contract-owned generated enum in application code only; pure domain code remains independent.
- Decode and validate external data before mapping it to application values. Allow only conversions defined by the input format or contract.
- Map explicitly at the owning adapter. A mapper neither performs I/O nor decides which business operation to execute. Extract a named function when it clarifies a meaningful conversion; inline trivial construction is fine.
- Use strict typing for handwritten production and test code. Annotate signatures, infer obvious locals and keep justified typing exceptions narrowly scoped.
- Validate application configuration at startup before I/O. Small scripts may use argparse and simple validation. Configuration failures identify the parameter and violated constraint without its received value.
- Keep calculations synchronous and I/O asynchronous where the flow is async. Own clients/tasks, bound concurrency, propagate cancellation and close resources. Retry only a declared repeatable operation with bounded attempts at one layer.

## Read the relevant reference

| Task                                                              | Read                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Feature structure, models, dependencies, typing or composition    | [Architecture and models](references/architecture.md) |
| Mapping between provider, application, domain or generated values | [Mapping](references/mapping.md)                      |
| Settings, exceptions, HTTP, scheduling, concurrency or shutdown   | [Runtime and errors](references/runtime.md)           |
| Parsing, synchronization, reconciliation or provider ingestion    | [Ingestion](references/ingestion.md)                  |

Read the references for the responsibilities being changed. Adapt the illustrative fragments to the project's actual contracts.

## Verification

Test owned behavior and changed external boundaries. Run the project's configured tests, formatter, lint and type checks for the affected code. Characterize a seam before replacing it. Verify actual generated-client decoding with the project's versions when claiming contract validation, not a substitute model. Report missing type, runtime, network or generated evidence. Inspect the full diff, including any regenerated sources the project versions. Preserve supported behavior unless an accepted correction changes it.
