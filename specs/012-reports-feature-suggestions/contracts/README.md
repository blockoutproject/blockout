# Private support contract boundary

F10 owns intake and complete acceptance. The existing backend provides the operation to the mobile form. Canonical sources are [the mobile root](../../../contracts/http/mobile/openapi.yaml), [support operations](../../../contracts/http/mobile/support/paths.yaml) and [support schemas](../../../contracts/http/mobile/support/schemas.yaml); this directory contains no editable contract copy.

`POST /support-requests` accepts JSON metadata and zero to five repeated image parts. An absent subject is omitted, not null or an empty enum value. Unknown contextual facts are omitted; the context object may be empty. Contact and account/target references are declarations, never authorization. The operation does not depend on successful bearer authentication, but current application gates still apply.

A `201` response confirms the complete request and returns its opaque UUID. There is no client-visible ticket URI, so no `Location` exposes the private repository or implies a mobile read endpoint. No receipt GET, editing PATCH, cancellation DELETE, idempotency registry or asynchronous `202` is introduced. After a failed or lost response, the form permits a new explicit send; a provider error can have partial effects.

Reuse shared named Problem Details for bad input, oversized content, unsupported media, invalid images and access/service unavailability. Validation refusal precedes provider effects. Requests reject unknown fields, and response validation tolerates additions under [F13](../../003-shared-quality/contracts/README.md). Public guest intake does not replace the authorization rules of any other operation.

The change is additive to the mobile root. F11 owns privacy obligations, F12 access gates, and F13 multipart/error/generation conventions. The collector has no new support API. GitHub REST, the official CLI and Discord remain external adapters, not copied OpenAPI sources or mobile dependencies.

Qualify the existing OpenAPI 3.0.4 → Redocly → OpenAPI Generator/Orval chain with actual JSON-part content type, repeated binary parts, generated Java binding and native FormData submission. Preserve normal platform-generated multipart boundaries; do not add a handcrafted serializer or edit generated output. Documented shapes alone do not establish integrated generator/runtime compatibility.
