---
name: python-development
description: "Design and implement new typed Python backend applications: feature boundaries, explicit mapping, configuration and async ownership. Covers small scripts and conditional ingestion without selecting a web framework or ORM."
---

# Python backend development

These conventions target new Python applications and features, without translating Spring's class hierarchy. Read the accepted behavior, project instructions, Python version and tooling. Applying this skill to an existing repository does not authorize a general migration; its instructions and the authorized task scope remain applicable.

## Working conventions

- Organize growing applications by business feature and occupied responsibilities. Keep small scripts small.
- Use classes for coherent orchestration with stable constructor-injected dependencies; use functions for transformations, mapping and simple operations. Assemble explicitly at startup. A consumer-owned `Protocol` describes a real external need, not every implementation class.
- Keep commands/results and shared internal values immutable by default. Mutable working state needs an explicit owner and execution lifetime; do not keep per-run data in a reusable service.
- Keep generated object DTOs and clients in transport adapters. Reuse an exact contract-owned generated enum in application code only; pure domain code remains independent.
- Decode and validate external data before mapping it to application values. Allowed conversions come from the input format/contract, not a library's accidental defaults. Internal objects do not all become Pydantic models.
- Map explicitly at the owning adapter. A mapper neither performs I/O nor decides which business operation to execute. Extract a named function when it clarifies a meaningful conversion; inline trivial construction is fine.
- For new managed projects, use uv, Ruff, pytest and mypy strict on handwritten production code and tests from the start. Annotate signatures, infer obvious locals and keep justified typing exceptions narrowly scoped.
- Use Pydantic Settings for new durable applications, validating configuration before I/O. Small scripts may use argparse and simple validation. Configuration failures identify the parameter and violated constraint without its received value.
- Keep calculations synchronous and I/O asynchronous where the flow is async. Own clients/tasks, bound concurrency, propagate cancellation and close resources. Retry only a declared repeatable operation with bounded attempts at one layer.

## Read the relevant reference

| Task                                                              | Read                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Feature structure, models, dependencies, typing or composition    | [Architecture and models](references/architecture.md) |
| Mapping between provider, application, domain or generated values | [Mapping](references/mapping.md)                      |
| Settings, exceptions, HTTP, scheduling, concurrency or shutdown   | [Runtime and errors](references/runtime.md)           |
| Parsing, synchronization, reconciliation or provider ingestion    | [Ingestion](references/ingestion.md)                  |

Read references for the changed responsibilities, not the entire pack. Illustrative fragments clarify a convention; they are not an executable application or a required scaffold. Source-contract generation and its validation guarantees belong to the contract workflow; do not reproduce generator configuration policy here. Web frameworks, ORM/transaction mechanisms and distributed workers require an actual accepted project need.

## Verification

Test owned behavior and changed external boundaries. New managed applications run Ruff, pytest and mypy strict on handwritten code/tests; use the repository's targets and supported versions. Characterize a seam before replacing it. Verify actual generated-client decoding with the project's versions when claiming contract validation, not a substitute model. Report missing type, runtime, network or generated evidence. Keep generated outputs ignored, inspect the full diff and preserve supported behavior unless an accepted correction changes it.
