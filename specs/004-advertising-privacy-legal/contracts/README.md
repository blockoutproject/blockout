# F11 boundaries

## Ownership and consumers

| Boundary                              | Provider / consumers                                                                         | Authority and change                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advertising consent and interstitials | Google UMP/Mobile Ads with Meta mediation / mobile                                           | Provider SDK interfaces; F11 selects age, consent and transition behavior.                                                                                                                                       |
| Advertising age                       | Installation-local form / advertising runtime                                                | [Data model](../data-model.md); no account/backend API.                                                                                                                                                          |
| Public legal pages                    | Existing backend / native integrated browser, ordinary browsers and store review             | Three static HTML documents published together with the backend; reading is unauthenticated.                                                                                                                     |
| Club contacts                         | Backend / existing administration and sporting consumers; collector supplies ordinary inputs | Canonical [mobile contract](../../../contracts/http/mobile/openapi.yaml) and [ingestion contract](../../../contracts/http/ingestion/openapi.yaml), owned by F02. Restrictions prevent persistence/republication. |
| Entitlement/session                   | Existing F09/F05 owners / advertising runtime                                                | Consume current native state and session changes. Do not infer free status from an outage or transfer another account's exemption.                                                                               |

## Public reading

- `GET /legals/imprint`, `GET /legals/privacy`, `GET /legals/terms`: complete UTF-8 HTML with visible title, version and actual modification date. Preserve the existing privacy entry and external account-deletion directions.
- Successful reading returns 200 `text/html`; missing content returns a truthful 404 page. Network/server failure uses ordinary browser behavior. Public access requires neither authentication nor Pro/advertising choices.
- Browser-compatible links and navigation express this document interface; it has no mobile JSON consumer, so no generated document client/DTO or write operation is introduced. Static file representation and backend routing are the implementation source, not duplicated OpenAPI schemas for an unused JSON API.
- F12 blocks in-app entry during its gates; standalone public URLs remain available whenever the backend is available. No independent hosting guarantee or offline fallback.

## Existing contact semantics and compatibility

`getClubContacts` and `setClubContacts` retain their routes, fields and current-revision conflict semantics. For a restricted field, source/manual/effective values remain null. Ordinary contact mutation cannot lift the restriction or persist a prohibited value; reject a conflicting write atomically with the existing conflict response. Existing hidden mode remains a display choice, not proof of erasure.

The collector contract does not gain privacy instructions or a new batch: backend enforcement applies to ordinary incoming records under the club lock. No new endpoint, enum, editable contract copy or consumer-specific response is added. Update concise descriptions at the canonical source when necessary; keep requirement traceability here rather than embedding feature identifiers in API prose.

The [F13 contract toolchain](../../003-shared-quality/plan.md#http-generation-errors-and-compatibility) remains authoritative for existing JSON boundaries. Documentary lint does not replace generated Java/TypeScript compilation or contact concurrency tests in the future implementation.
