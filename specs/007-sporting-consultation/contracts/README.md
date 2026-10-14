# Sporting consultation contracts

## Authoritative sources

The [mobile root](../../../contracts/http/mobile/openapi.yaml) supplies public resource reads and document/image delivery. Its consultation paths and schemas remain under `contracts/http/mobile/consultation/`. The [ingestion root](../../../contracts/http/ingestion/openapi.yaml) carries qualified references and permitted match details from the collector. This directory contains no editable copy of those definitions.

| Boundary                          | Provider and consumer | Semantic owners                                                                           |
| --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Public club/team/pool/match reads | Backend → mobile      | F02 facts/visibility; F03 projection, calendar classification and document access         |
| Pool standings and participants   | Backend → mobile      | F02 independent official table and participation; F03 presentation                        |
| Document and logo resources       | Backend → mobile      | F02 effective image/reference; F03 current eligibility and temporary reading; F11 privacy |
| Match enrichment                  | Collector → backend   | F01 qualification/observation; F02 acceptance/order; F03 consumes accepted references     |

## Interaction choices

Resource summaries include labels, identities and effective image links needed by cards and relationships, avoiding a request per row. Public division presentation preserves the administrative `color` and three-color `gradient`; a null gradient keeps the ordinary color-derived treatment. Available documents provide links to the backend-owned document subresources; provider fetch parameters remain private. These resource links support the actual mobile transitions without introducing a hypermedia framework or claiming full REST conformance from URL naming alone.

Calendars select exactly one club, team or pool. Club reads include season. Category, IANA grouping zone and optional exclusive day continuation completely describe the request. A page contains up to seven complete nonempty days, no total count or match-count limit. Preserve the same selection during continuation. Concurrent moves can leave gaps until refresh; the client deduplicates by match UUID.

Ordinary consultation is public. The optional maintenance-bypass header requires a valid authorized token and does not relax resource visibility. Document and logo delivery apply the same admission and current ownership restrictions as JSON reads. Shared access Problem Details handles maintenance and ordinary unavailability; no second error taxonomy or code-specific screen is introduced.

JSON responses tolerate additive properties while validating known fields; omitted optional values are unavailable, not zero or empty strings. Empty arrays are successful empty collections. Requests reject unknown properties. Binary PDF and PNG/JPEG responses use their media types and bypass JSON validation intentionally. All responses prohibit HTTP caching; retained mobile memory follows the owning session and consultation rules.

## Compatibility and qualification

The additions preserve existing administration and ingestion routes. Optional enrichment fields do not change absence reconciliation, source authority or result ownership. Shared scalar definitions and vocabulary apply across administration, collection and consultation; public contacts use `website` consistently with collection and administration. These authored contracts have no deployed consumers, so no compatibility alias is needed. Update backend interfaces, Java collector client and Orval mobile outputs together from the canonical roots, using F13's existing Redocly → generation chain.

Check enums, date/date-time preservation, optional values, error responses, binary handling and deterministic regeneration in active consumers. Lint/bundle success establishes source structure only; generated Java/TypeScript compilation and native download/rendering remain future qualification under [quickstart.md](../quickstart.md).
