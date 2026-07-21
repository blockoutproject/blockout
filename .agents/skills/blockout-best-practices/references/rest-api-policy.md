# Blockout REST API Policy

Read this before changing a controller, handwritten request or response, query parameter, API mapper, error response,
collection, or service-to-service HTTP boundary.

## Contract Shape

- Use resource-oriented paths and preserve existing V1 paths and HTTP methods unless the active task explicitly changes
  the contract.
- Blockout-owned JSON bodies, responses, and query parameters use native camelCase in every producer and consumer.
- Do not add Jackson naming strategies, `@JsonProperty` aliases, or generic case-conversion helpers for Blockout-owned
  fields.
- External provider payloads retain the provider's names and are isolated in provider-specific models.
- Use explicit `InternalRequest` and `InternalResponse` names for service-to-service transport models while contracts
  are
  handwritten.
- Keep application commands and views independent from HTTP and persistence types.

## Controllers And Mapping

- Controllers authenticate, validate transport input, call one application boundary, and map the result.
- Keep transport/application mapping explicit at the API boundary. Small constructor-based mappers are preferable to a
  framework or reflection-based abstraction.
- Never expose a JPA entity, provider payload, or message model as an HTTP response.
- Keep complete resource mirrors aligned with the owning service. Purpose-specific summaries and search results may be
  smaller when their names make that role explicit.

## Errors And Collections

- Translate expected application failures to RFC 9457-compatible `ProblemDetail` responses with a stable machine code,
  suitable status, and non-sensitive detail.
- Do not leak stack traces, provider bodies, SQL details, secrets, or personally identifiable information.
- Preserve an established collection response when compatibility matters. Introduce pagination only when the use case
  and clients require it, using stable `items` and pagination metadata rather than returning persistence pages.

Verify controller and mapper tests, all changed consumers, native camelCase serialization, unchanged external-provider
models, and `git diff --check`.
