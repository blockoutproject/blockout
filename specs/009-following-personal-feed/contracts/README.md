# Contracts: following and personal feed

Canonical definitions live in the [mobile root](../../../contracts/http/mobile/openapi.yaml), [following paths](../../../contracts/http/mobile/following/paths.yaml), [parameters](../../../contracts/http/mobile/following/parameters.yaml) and [schemas](../../../contracts/http/mobile/following/schemas.yaml). This folder contains no editable API copy.

## Ownership and operations

The existing backend provides these operations to the mobile. F06 owns relationships, counts and personal selection; F02 owns target identity/viewability, F03 sporting summaries/calendar rules, F05 original-account access and F12 admission. Public count reads do not depend on account or Pro state. Every personal read/write belongs only to the caller's usable original account; administrator/Pro status grants no other-account access.

| Resource                                                                   | Methods and meaning                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/accounts/{accountId}/team-follows` and `/pool-follows`                   | GET viewable follows; optional seasonId, zero-based page, twenty items, optional nextPage and no total. |
| `/accounts/{accountId}/team-follows/{teamId}` and `/pool-follows/{poolId}` | GET relationship state; PUT complete desired boolean state, returning the confirmed state.              |
| `/accounts/{accountId}/follow-options`                                     | GET viewable season choices and the ordinary default when one exists.                                   |
| `/accounts/{accountId}/matches`                                            | GET personal calendar and whether the selection contains viewable follows.                              |
| `/teams/{teamId}/follower-count` and `/pools/{poolId}/follower-count`      | GET public count for a viewable target, without identities.                                             |

A follow member represents current relationship state, which exists conceptually for each usable owner/viewable target even when no association is stored. GET/PUT therefore return 200 with following=false or true. The collection lists only actual viewable follows. PUT replaces that boolean rather than toggling it; repetition has no additional effect. No separate DELETE, creation response, idempotency token or bulk dispatcher is needed for this state representation.

Unknown/hidden targets and unknown/unavailable selected seasons return the shared NotFound. A list's empty items is successful emptiness, not failed retrieval. nextPage is omitted only when exhausted; concurrent changes can shift offset traversal until refresh. An absent seasonId means All seasons. Options return chronological descending seasons and defaultSeasonId only when choices exist.

The personal calendar reuses MatchCalendarResponse with hasAvailableFollows in the enclosing response. The boolean concerns eligible follows in the selected season, independent of category. Reuse [F03 parameters](../../../contracts/http/mobile/consultation/parameters.yaml) for category, timeZone and nextDay, and its team/pool/season summaries. These projections and the flag are evaluated together; no copied calendar structure or match-origin metadata.

Public and private operations use no-store. Existing BadRequest, Unauthorized, Forbidden, NotFound, UnsupportedMediaType where applicable, and AccessUnavailable cover ordinary failures. Invalid query/body shapes are rejected, including unknown properties/parameters. A lost mutation response causes one bounded read before explicit retry; no error code introduces another screen.

## Compatibility and consumers

The additions preserve existing wire behavior. Extracting identical F03 calendar parameters into named owner references changes no accepted route or parameter. Public sporting responses stay account-independent. Additive response properties are allowed; requests have explicit required fields and reject extras. The OpenAPI descriptions explain API behavior without feature identifiers or planning history.

Use F13's OpenAPI 3.0.4 / Redocly / OpenAPI Generator / Orval pipeline unchanged. Generated Java interfaces/DTOs and mobile types/functions/Zod remain derived build outputs. The future [qualification guide](../quickstart.md) covers compilation, validation and authorization; this documentation delivery initializes no runtime or generation configuration.

F07 consumes confirmed relation identities through an in-process application boundary, not a new HTTP API. It owns the consequences for recipients and cancelled deliveries; the displayed season never becomes a notification preference. The collector is not a consumer of these private operations.
