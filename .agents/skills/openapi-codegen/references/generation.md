# Generator and validation boundaries

## Java

Generate server interfaces and DTOs into the configured build output. Implement interfaces in API adapters. Keep generated client models in infrastructure adapters and map object DTOs immediately to application/domain values. Contract-owned generated enums may be used directly in application APIs only when they carry exactly the intended concept; they never enter pure domain code.

Keep shared generated model packages limited to genuinely shared enums and technical primitives. Compile through the owning reactor so annotation processing and generated imports are exercised. Prove unions, enum serialization and null handling with actual generated output where configuration changes their behavior.

## Python

Use the repository-pinned OpenAPI Generator and asynchronous HTTPX configuration, with one declarative batch configuration per adopted contract. Respect the owning internal/public boundary; language does not change service ownership. Keep generated clients and object models inside the infrastructure API adapter. Reuse a generated enum in application code only for the exact contract-owned concept; pure domain values remain independent. Map objects to typed application/domain values using explicit functions. Validate imports and actual request/response behavior against controlled transport; never production data. Python language guidance owns typed application placement, explicit mapping and resource lifecycle. Keep generation/decoding guarantees here rather than copying that procedure into every adapter policy.

## Runtime validation guarantees

Own generation and transport-validation mechanics here; language policies own placement and application adaptation. Verify the installed generator's actual output and invocation path. An annotation, Pydantic dependency or generated type alone does not prove that received data is validated. Generated constraints must actually run at the entry boundary; Java server validation wiring and Python response deserialization require their own evidence.

At affected boundaries prove valid input succeeds and required-field absence, wrong types, unknown enum values, forbidden nulls, forbidden extra properties and malformed/partial responses fail as the contract requires. Specify permitted coercions rather than assuming strict mode everywhere. If the contract forbids extra properties, verify rejection: silently dropping them does not prove conformance. Do not admit invalid external data as a valid application value. For Python inspect the generated model configuration and the HTTPX client's actual decoding path; exercise that path, not only a manually constructed model.

If generation misses a required guarantee, identify the exact gap and use a supported configuration or a narrow handwritten boundary check outside generated code. Keep one contract owner: no parallel DTO family, copied schema or second routine validation at each layer. Generator/template adoption changes remain explicit work. Provider HTML/CSV without an API contract uses its own adapter parsing/validation, not an invented OpenAPI specification.

## TypeScript, Orval and Zod

Use Orval for client functions, transport types and Zod response schemas from the same source contract. Reuse its generated query keys/functions where the existing mode supplies them; do not assume a fetch-only project already generates Query hooks.

Inspect the installed Orval version and native output modes. Select supported Zod generation and a supported transport/mutator boundary for that version. If the existing mode needs an adoption change, make it explicit; do not invent an API or patch generated output. Keep handwritten transport behavior thin and outside generated directories.

For every consumed successful JSON response, run its generated schema at the transport boundary **once**, before the request resolves as success and before TanStack Query stores it. Rejected validation is a typed boundary failure, not partial success or a cast. Handle 204, streams and non-JSON responses according to their contract instead of parsing them as JSON. Route non-success HTTP statuses through their error contract, not the success schema. Preserve credentials, cancellation signals, timeouts, status/headers where required and safe error handling.

Form Zod schemas remain separate when editing has different defaults, intermediate strings or cross-field rules. Do not force a transport schema onto an unfinished form or validate the same server response again in every screen.

Tests should demonstrate a valid response admitted, a malformed response rejected before cache success, correct no-content/error handling and preserved cancellation when affected. TypeScript compilation alone cannot prove runtime validation.

Mechanics: [Orval documentation](https://orval.dev/overview) and [OpenAPI Generator configuration](https://openapi-generator.tech/docs/configuration/). Check the installed version before using optional features.
