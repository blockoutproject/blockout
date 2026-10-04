# F03 consumers and owning interfaces

## Application seams

| Owner                                | Interface meaning                                                                                                                      | F03 obligation                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F02 `sport`                          | Current viewability, effective identities, seasonal relationships, schedules/results, rankings, municipal points, document descriptors | Add concrete public read use cases inside the occupied sport module. Keep domain models independent of generated DTOs and never duplicate canonical entities.                                                                      |
| F01 `acquisition`                    | Qualified public calendar URL for the exact season/organizer/pool/tour reference                                                       | Root coordination calls this application interface alongside sport. Do not make sport depend on acquisition or reach acquisition repositories. Missing link does not block match facts.                                            |
| F05 `accounts` / F12 `configuration` | Session generation, ordinary admission, explicit current capabilities, maintenance refusal                                             | Preserve account isolation and request admission. Guest consultation remains free. F12 bypass affects admission only.                                                                                                              |
| F06 `following`                      | Public count and separately private current-account follow state; owner commands                                                       | Compose the approved follow controls separately from public sport DTOs. No fake count/false follow state on owner failure. F06 later consumes sport's concrete calendar selection/projection interface for its own personal scope. |
| F08 `contributions`                  | Public applicable link and private user/moderator actions                                                                              | Keep professional source media separate. Compose through owner interfaces without contribution tables/commands in sport. No fabricated inactive link when the owner is unavailable.                                                |
| F10 assistance                       | Contextual issue/report entry points using current target identity                                                                     | Pass safe resource identity/context, never diagnostics or credentials. General reporting differs from F08 link reporting.                                                                                                          |
| F11/F09                              | Privacy/advertising eligibility and Pro exemption                                                                                      | Restrict prohibited fields everywhere. Unknown signed-in entitlement suppresses ads; sporting consultation remains usable.                                                                                                         |

Root composition above modules owns cross-module calls. There is no deployable consultation gateway, module cycle or generic event bus. F06 calendar selection will use a concrete owning interface, not a callback giving access to sport repositories or a copied F03 database. Its private query contract remains F06-owned.

## Source additions

F02's [internal contract](../../002-sporting-data/contracts/internal.openapi.yaml) defines dedicated informationSheet, scoresheet and professionalMedia observations. F01's qualified references already carry the official calendar sourceUrl. Extend only known provider parsing branches; information-sheet descriptors can be retained through the match lifecycle once attributable. An empty/absent icon alone is UNKNOWN rather than proof of explicit removal. No download of PDF bytes during acquisition.

The canonical season startYear comes from published/confirmed season attribution. F01 stores it on the candidate and resolves it when preparing the F02 season; the mobile does not submit an independently editable year. A source without qualified chronology remains unresolved. Preserve exact seasonLabel for display and typed closure confirmation.

## Contract adoption

Adopt consultation.openapi.yaml under `contracts/public/sport/` through F13's root, referencing the shared F13 problem schema, F12 maintenance response and F02-owned format/gender enums. Keep their exact codes; mobile localization supplies presentation labels. Update F02 internal and F01 acquisition fragments before generation. Generate Java server interfaces and Orval/Zod public consumers; internal additions also regenerate and compile/import/test Python. Retain no generated output.

Binary success must bypass JSON/Zod object decoding while still validating status, content type and bounded PDF bytes. Error responses use the ordinary typed problem validator, including additive F12 maintenance fields. Qualify Orval's operation-specific binary handling and custom transport adapter; do not disable validation globally. Request/schema conditional rules in read-semantics.md must be tested against real generated consumers.

Prove clean generation twice, Java compilation, TypeScript typechecking and Python imports/validation after changes. Documentary schema checks cannot claim those nonexistent runtimes passed.

## Dependency acceptance

F03 sporting-only navigation/calendar/map/PDF increments can be tested after F13/F02/F01 prerequisites. Follow/contribution/report controls require real F06/F08/F10 owners before whole-feature integration acceptance. Controlled doubles verify only the seam. No temporary endpoint or inert button is presented as the completed integration. F14 qualifies actual production deep-link identities, native release settings and transition compatibility; do not invent them in this dossier.
