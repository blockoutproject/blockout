# F12 interfaces

## Authority and consumers

The [canonical mobile root](../../../contracts/http/mobile/openapi.yaml) references access [operations](../../../contracts/http/mobile/access/paths.yaml), [schemas](../../../contracts/http/mobile/access/schemas.yaml), [parameters](../../../contracts/http/mobile/access/parameters.yaml) and [admission problems](../../../contracts/http/mobile/access/problems.yaml). The existing [account schema](../../../contracts/http/mobile/accounts/schemas.yaml) references the permission projection. These files are the editable source; this folder owns rationale and consumer coordination only.

The same modular backend serves the native mobile. F12 owns settings/admission and permission meaning; F05 owns accounts. F02 commands reuse current grants in-process. F01/F07 internal callers read maintenance policy in-process, not through a new ingestion endpoint. No service, contract registry or editable API copy is created.

## Operations and semantics

| Operation                                    | Permission and behavior                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /application-access`                    | Anonymous complete maintenance/version snapshot, no-store; no Auth0 dependency or account data.                                                       |
| Existing `GET /accounts/me`                  | Authenticated current account with permissions; allowed for identification during maintenance, without profile navigation or automatic establishment. |
| `GET /administration/maintenance`            | `maintenance.manage`; stored content, activation and revision.                                                                                        |
| `PATCH /administration/maintenance`          | `maintenance.manage`; atomic content-only changes, preserving activation.                                                                             |
| `PUT /administration/maintenance/activation` | `maintenance.manage`; desired active boolean and expected maintenance revision.                                                                       |
| `GET /administration/application-versions`   | `application-versions.manage`; both platforms, shared message and revision.                                                                           |
| `PATCH /administration/application-versions` | `application-versions.manage`; atomic partial changes within the versions group.                                                                      |

Patch media type is `application/json`, with the explicitly described partial-change semantics, not an undocumented claim of JSON Merge Patch. Requests reject unknown properties; responses tolerate additive properties and validate known ones. Null removes only optional values; omission preserves them. Shape violations use 400; resulting-state violations use 422; stale revisions use 409. Do not translate body revision conflicts into HTTP-precondition 412. Accepted writes return the full current group, including no-op results; no asynchronous acceptance or job resource.

GET is safe. Activation PUT specifies the desired value and never toggles. Retrying against an old revision can return 409 even if the desired value already exists; after an uncertain result, GET first. Relevant state changes advance the JPA revision and matching no-ops do not. Admin responses are partial for admission purposes: only the complete public read can establish ordinary access.

## Bypass and errors

`Blockout-Maintenance-Bypass: true` carries current-session personal intent; absence/false requests no bypass. Invalid boolean syntax is rejected. A request seeking bypass during active maintenance requires valid mobile credentials, a usable current account and `maintenance.bypass`. It confers no other action permission. Inactive maintenance ignores the intent without opening protected business operations. Explicitly authorized management calls need their own grants, not personal bypass.

Existing ordinary account path items reference this parameter; the current-account identification GET does not need it. Later ordinary domain operations add the same reference when authored. The mobile attaches it only to backend operations subject to ordinary admission, including the private account-photo read. Never send it to Auth0, stores or external media/supplier URLs. No generated-file patch or custom client fork is needed.

Mobile maintenance rejection uses `urn:blockout:problem:maintenance`, HTTP 503 and the current active `maintenance` representation. The specialized `problems.yaml#/responses/AccessUnavailable` reuses shared Problem Details property definitions and adds the typed extension for ordinary operations subject to maintenance. Public configuration, authorized management and current-account identification are exempt from this block and use the common `ServiceUnavailable` response. Both are HTTP 503 responses; their descriptive component names follow the [shared naming convention](../../003-shared-quality/contracts/README.md#shared-http-behavior). Other dependency failures retain their existing problem category and never invent maintenance. No Retry-After or restoration-time claim is supplied. Current restrictions/revisions remain protected against late errors and reads as defined in the [plan](../plan.md#mobile-state-and-native-behavior).

Authentication/authorization failures use ordinary 401/403 and F13's Bearer/no-store headers. A removed bypass grant permits no ordinary effects; the mobile drops invalid bypass intent and shows the existing appropriate restriction, without a new screen. API JSON is validated once by the generated schemas at the transport boundary before cache use. Before presenting a maintenance-specific gate, also require the documented semantic combination: maintenance type, status 503, active state and a nonblank message. An inconsistent payload is unavailable data, never an admission or fabricated maintenance message.

## Compatibility and coordination

[F14](../../014-v1-v2-transition/contracts/README.md#legacy-mobile-access) adds the separate legacy status surface to this same backend. Its read-only deployment configuration supplies the qualified first V2 versions and existing store URLs in the already distributed flat JSON shape, with maintenance false for retired clients. This exception keeps the update action reachable and creates no old business API or additional writable settings group. Later ordinary minimum-version edits cannot readmit V1.

F05 account responses acquire required `permissions` with optional boolean properties. Update provider responses and generated mobile consumers together; absence of a capability never grants it. All account response producers, including establishment/profile writes, return that projection. Old clients tolerating extra response fields remain compatible; deploying a new client before its provider supplies the required object is not supported. Future fields do not require a strict extensible enum or dynamic permission interpreter.

F05 records the narrow maintenance-identification exception and preserves 404/no automatic creation. Its other ordinary calls receive the shared bypass intent and typed mobile unavailability profile. No existing operation is renamed. F02 action/resource validation retains its domain semantics with global grants and the common lock order. F13 generation/validation and compatibility rules remain authoritative; F14 controls admission of actual distributed versions, not an API version guessed from a route.

No hypermedia framework is introduced: the concrete mobile consumes generated fixed operations and explicit capability flags. This is a resource-oriented HTTP contract, not a claim of complete REST constraint conformance. There is no bulk caller here; no batch endpoint or pagination is needed.

## Qualification

Run Redocly lint/bundle against both roots, then qualify the actual F13 Java/TypeScript generators and consumers during authorized executable work. Exercise nullable PATCH values, omitted nested platform fields, safe-integer revisions, boolean permissions including extra/absent fields, all AccountResponse producers, typed maintenance errors and wrong-environment tokens. The [quickstart](../quickstart.md) distinguishes those future qualifications from this delivery's document/schema checks.
