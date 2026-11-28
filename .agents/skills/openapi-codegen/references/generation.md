# Generator and validation boundaries

Apply the sections matching the actual generation targets. Verify the installed generator's capabilities against its output.

Keep semantic model names in the authored contract and use supported generator naming options when composition would lose them. Preserve native generated names when consumers depend on them; do not add handwritten aliases or post-processing solely to hide a name.

## Java

Generate the selected artifacts in the project's configured source or build directory. For a server target, implement its generated interfaces in API adapters. For a client target, keep the client and its runtime lifecycle in the consuming adapter. A generated DTO or enum may serve an application boundary when its contract owns that exact concept and this follows the project pattern. Map where semantics or lifetime differ; pure domain code remains independent of generated transport types.

Keep shared generated model packages limited to genuinely shared enums and technical primitives. Compile through the owning build so annotation processing and generated imports are exercised. Prove unions, enum serialization and null handling with actual generated output where configuration changes their behavior.

## Python

Import the selected generated modules. For a server target, exercise request binding and the serialized response at its handler. For a client target, use controlled transport to check the outgoing JSON and deserialized response. With an async HTTPX client, use its supported transport seam and close it after the call. For a model-only target, exercise serialization where those models are used.

## Runtime validation boundaries

Distinguish canonical schema semantics, the native decoder's behavior and the enforcement required at the actual boundary. A generated type, annotation or validation dependency does not prove that constraints execute. Inspect the selected generator's output and invocation path, including Java server validation wiring and Python response deserialization.

Choose response enforcement from the producer/consumer relationship, compatibility obligations and concrete failure consequences. Start with the generated client's supported decoding and ordinary configuration. An owned internal API can rely on that boundary with explicitly accepted limits; ownership alone neither proves correctness nor waives security or business invariants. Keep existing selected validation where it meets an actual need. Do not automatically add a schema engine, Bean Validation invocation, wrapper or handwritten field checks to close every decoder gap.

An accepted enforcement limit does not make missing required fields, forbidden nulls, unknown enums or out-of-range values valid contract data. State the actual consequences, such as coercion, late failure or incorrect interpretation, before accepting a weaker boundary. General enthusiasm for native libraries is not acceptance of those consequences. If a required guarantee remains unmet, first check supported configuration or a simpler supported contract shape; preserve accepted semantics and resolve the tradeoff with the owner before adopting additional machinery or changing the requirement.

For new contracts, prove unknown request properties are rejected and an older response consumer still accepts additional properties, including nested additions. Ignoring or stripping extra response properties is acceptable; stripping unknown request properties is not rejection. Preserve explicitly closed existing contracts unless an evolution is authorized. Request authorization, binding and domain integrity retain their own owners; accepting response-decoder limits does not weaken them.

Test actual producer serialization and generated-client calls for the selected guarantees: valid and nullable data, additive properties, decoding errors and meaningful downstream outcomes. Where strict response validation is required, prove required-field absence, wrong types, unknown enums, forbidden nulls and malformed/partial responses fail before admission. Exercise the integration that really runs; validating an equivalent separate schema or constructing a model directly does not establish HTTP behavior. Do not add tests requiring an accepted upstream limitation to persist after a future fix.

Keep one contract owner: no parallel DTO family, copied schema, template patch or second routine validation at each layer. Generator adoption changes remain explicit work. Provider HTML/CSV without an API contract uses its own adapter parsing/validation, not an invented OpenAPI specification.

## TypeScript clients using Orval and Zod

When the project selects Orval and Zod, generate client functions, transport types and response schemas from the same source contract. Reuse its generated query keys/functions where the existing mode supplies them; do not assume a fetch-only project already generates Query hooks.

Inspect the installed Orval version and native output modes. Select supported Zod generation and a supported transport/mutator boundary for that version. If the existing mode needs an adoption change, make it explicit; do not invent an API or patch generated output. Keep handwritten transport behavior thin and outside generated directories.

For every consumed successful JSON response, run its generated schema at the transport boundary **once**, before the request resolves as success and before any application cache stores it. Rejected validation is a typed boundary failure, not partial success or a cast. Handle 204, streams and non-JSON responses according to their contract instead of parsing them as JSON. Route non-success HTTP statuses through their error contract, not the success schema. Preserve credentials, cancellation signals, timeouts, status/headers where required and safe error handling.

Reuse validated generated object types directly in frontend consumers when they express the same concept; do not create renamed mirrors or obligatory view models. Form Zod schemas and models remain separate when editing has different defaults, intermediate strings or cross-field rules. Do not force a transport schema onto an unfinished form or validate the same server response again in every screen.

Tests should demonstrate a valid response admitted, a malformed response rejected before success, additive response properties accepted, strict request rejection, correct no-content/error handling and preserved cancellation when affected. TypeScript compilation alone cannot prove runtime validation.

Mechanics: [Orval documentation](https://orval.dev/overview) and [OpenAPI Generator configuration](https://openapi-generator.tech/docs/configuration/). Check the installed version before using optional features.
