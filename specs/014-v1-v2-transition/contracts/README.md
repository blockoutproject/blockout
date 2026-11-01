# Contracts: V1-to-V2 transition

## Legacy mobile access

The canonical source is [legacy-mobile/openapi.yaml](../../../contracts/http/legacy-mobile/openapi.yaml). It is a separate compatibility surface of the existing backend, not another service or an editable copy of the V2 mobile root.

| Property       | Responsibility                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Semantic owner | F12 owns ordinary admission semantics; F14 owns the fixed V1 retirement response.                  |
| Provider       | The V2 backend at the public host already used by V1.                                              |
| Consumer       | Already distributed V1 iOS/Android binaries. V2 uses its existing `/application-access` operation. |
| Operation      | `GET /api/v1/mobile/public/config/app-status`, public and without authentication.                  |

Preserve the historical snake_case JSON properties, flat shape and nullable values. V1 converts response keys to camelCase internally and compares dot-separated version components numerically. At retirement, require read-only deployment configuration for both first V2 versions and the existing store URLs. Return `maintenance: false` independently of V2 maintenance, because maintenance hides V1's update action. Do not include operator diagnostics or expose any old write route. The fixed retirement thresholds are independent of later F12 minimum-version changes; no new administration operation is exposed.

The response uses `Cache-Control: no-store`. Missing required retirement configuration uses the shared `ServiceUnavailable` response, never a permissive success. This does not guarantee a blocking screen in V1: without available configuration, its maintenance and update guards are false; after a later read failure, retained configuration may still determine the displayed state. Reusing the backend's error profile cannot add V2 unavailable handling to installed binaries. Verify a valid response before cutover and qualify failures with and without retained configuration; effective retirement relies on stopping old business APIs and writers, not on the displayed screen. Unspecified infrastructure failures are not a promise of a particular JSON body.

## Generation and compatibility

Use F13's OpenAPI 3.0.4, Redocly validation/bundle and OpenAPI Generator Spring server interface/DTO generation, including its ordinary JSON property mappings. The root is deliberately small enough to keep its one operation and one schema together. No new assembler, case-conversion adapter or template fork is needed.

V1 consumers cannot be regenerated after distribution. Therefore generate only the new provider boundary; qualify its serialization with captured non-personal contract fixtures and the actual installed store binaries. Current V2 mobile/ingestion roots and generated clients are unchanged by this compatibility operation. Keep the old prefix exactly; it is not a new API-versioning convention for V2.

## Other continuity interfaces

| Interface                                      | Existing owner and reuse                                                                                    | Transition implication                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth0 authentication and profile establishment | [F05](../../005-accounts-identity/contracts/README.md)                                                      | Preserve principals/links/age, clear local old credentials once, then establish a new business UUID. Remove the V1 default-role dependency; add no V2 substitute endpoint. |
| Purchases and restoration                      | [F09](../../006-pro-subscriptions/contracts/README.md)                                                      | Preserve project/products/entitlement. Native pricing and explicit restoration use existing provider interfaces; no migration API or automatic aliasing.                   |
| Club images and sporting reconstruction        | [F02](../../002-sporting-data/contracts/README.md), [F01](../../001-source-acquisition/contracts/README.md) | Reuse current data ownership, native identities and accepted operations. Private preservation is not an application upload/download API.                                   |
| Current user notifications                     | [F07](../../011-notifications-delivery/contracts/README.md)                                                 | Register V2 destinations normally, import neither old inbox nor sends, and retain ordinary current-account authorization.                                                  |
| Store/release configuration                    | [F13](../../003-shared-quality/plan.md)                                                                     | Use ordinary provider consoles/EAS and manual release controls. No transition endpoint, release orchestrator or store-polling API.                                         |

All provider configuration remains future authorized work. Documentation and OpenAPI validation establish neither signed-upgrade compatibility nor current user entitlement recovery.
