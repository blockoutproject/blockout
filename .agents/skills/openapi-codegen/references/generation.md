# Generator and validation boundaries

Apply only the sections matching the approved stack. Generator/framework names below describe candidate integrations and their obligations, not mandatory technology selections. Use the project's selected tools and versions; verify their documented capabilities and actual output before relying on them.

Keep semantic model names in the authored contract and use supported generator naming options when composition would lose them. Preserve native generated names when consumers depend on them; do not add handwritten aliases or post-processing solely to hide a name.

## Java

Generate server interfaces and DTOs into the configured build output. Implement interfaces in API adapters. Keep generated client models in infrastructure adapters and map object DTOs immediately to application/domain values. Contract-owned generated enums may be used directly in application APIs only when they carry exactly the intended concept; they never enter pure domain code.

Keep shared generated model packages limited to genuinely shared enums and technical primitives. Compile through the owning build so annotation processing and generated imports are exercised. Prove unions, enum serialization and null handling with actual generated output where configuration changes their behavior.

## Python

When the project selects OpenAPI Generator with asynchronous HTTPX, use its pinned version and a declarative configuration for each adopted contract. Respect the owning internal/public boundary; language does not change service ownership. Keep generated clients and object models inside the infrastructure API adapter. Reuse a generated enum in application code only for the exact contract-owned concept; pure domain values remain independent. Map objects to typed application/domain values using explicit functions. Validate imports and actual request/response behavior against controlled transport; never production data. Python language guidance owns typed application placement, explicit mapping and resource lifecycle. Keep generation/decoding guarantees here rather than copying that procedure into every adapter policy.

## Runtime validation boundaries

Own generation and transport-validation mechanics here; language policies own placement and application adaptation. Distinguish canonical schema semantics, the native decoder's behavior and the enforcement required at the actual boundary. A generated type, annotation or validation dependency does not prove that constraints execute. Inspect the selected generator's output and invocation path, including Java server validation wiring and Python response deserialization.

Choose response enforcement from the producer/consumer relationship, compatibility obligations and concrete failure consequences. Start with the generated client's supported decoding and ordinary configuration. An owned internal API can rely on that boundary with explicitly accepted limits; ownership alone neither proves correctness nor waives security or business invariants. Keep existing selected validation where it meets an actual need. Do not automatically add a schema engine, Bean Validation invocation, wrapper or handwritten field checks to close every decoder gap.

An accepted enforcement limit does not make missing required fields, forbidden nulls, unknown enums or out-of-range values valid contract data. State the actual consequences, such as coercion, late failure or incorrect interpretation, before accepting a weaker boundary. General enthusiasm for native libraries is not acceptance of those consequences. If a required guarantee remains unmet, first check supported configuration or a simpler supported contract shape; preserve accepted semantics and resolve the tradeoff with the owner before adopting additional machinery or changing the requirement.

For new contracts, prove unknown request properties are rejected and an older response consumer still accepts additional properties, including nested additions. Ignoring or stripping extra response properties is acceptable; stripping unknown request properties is not rejection. Preserve explicitly closed existing contracts unless an evolution is authorized. Request authorization, binding and domain integrity retain their own owners; accepting response-decoder limits does not weaken them.

Test actual producer serialization and generated-client calls for the selected guarantees: valid and nullable data, additive properties, decoding errors and meaningful downstream outcomes. Where strict response validation is required, prove required-field absence, wrong types, unknown enums, forbidden nulls and malformed/partial responses fail before admission. Exercise the integration that really runs; validating an equivalent separate schema or constructing a model directly does not establish HTTP behavior. Do not add tests requiring an accepted upstream limitation to persist after a future fix.

Keep one contract owner: no parallel DTO family, copied schema, template patch or second routine validation at each layer. Generator adoption changes remain explicit work. Provider HTML/CSV without an API contract uses its own adapter parsing/validation, not an invented OpenAPI specification.

## TypeScript; Orval and Zod when selected

When the project selects Orval and Zod, generate client functions, transport types and response schemas from the same source contract. Reuse its generated query keys/functions where the existing mode supplies them; do not assume a fetch-only project already generates Query hooks.

Inspect the installed Orval version and native output modes. Select supported Zod generation and a supported transport/mutator boundary for that version. If the existing mode needs an adoption change, make it explicit; do not invent an API or patch generated output. Keep handwritten transport behavior thin and outside generated directories.

For every consumed successful JSON response, run its generated schema at the transport boundary **once**, before the request resolves as success and before any application cache stores it. Rejected validation is a typed boundary failure, not partial success or a cast. Handle 204, streams and non-JSON responses according to their contract instead of parsing them as JSON. Route non-success HTTP statuses through their error contract, not the success schema. Preserve credentials, cancellation signals, timeouts, status/headers where required and safe error handling.

Reuse validated generated object types directly in frontend consumers when they express the same concept; do not create renamed mirrors or obligatory view models. Form Zod schemas and models remain separate when editing has different defaults, intermediate strings or cross-field rules. Do not force a transport schema onto an unfinished form or validate the same server response again in every screen.

Tests should demonstrate a valid response admitted, a malformed response rejected before success, additive response properties accepted, strict request rejection, correct no-content/error handling and preserved cancellation when affected. TypeScript compilation alone cannot prove runtime validation.

Mechanics: [Orval documentation](https://orval.dev/overview) and [OpenAPI Generator configuration](https://openapi-generator.tech/docs/configuration/). Check the installed version before using optional features.
