# Data model: search projections and visit state

**Authority**: [F04](spec.md), [plan](plan.md), [F02 sporting model](../002-sporting-data/data-model.md). These are responsibilities, not a requirement for a table per concept.

## Authoritative inputs

F02 owns stable resource UUIDs, effective public/source full and short names, scoped verified aliases, seasons, classification, relationships and current viewability. It supplies public current projection inputs through its application API. F04 never writes those facts or uses text similarity as identity.

Verified aliases refer to one known owner in its applicable provider/season/competition context. Division search terms refer to a known division; accepted examples are `N2`, `N3`, `prenat`, `prereg`, `reg` and `dep` only where that division meaning applies. Maintenance is a controlled technical data correction, without a new admin process or endpoint. Neither category is a global alias dictionary or a history of previous names.

## Derived engine documents

| Index | Inputs in addition to stable keyword UUID                                                                                                                                                              | Constraints                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Clubs | Current public/source names and applicable aliases; effective permitted city                                                                                                                           | Club viewability does not require a visible team. No raw contact/address/email/phone.                                                           |
| Teams | Public/source full and short names, scoped aliases, club names and effective city when attached; division name/terms; French format/gender labels; season/division UUIDs and exact format/gender enums | Seasonal identity; no invented club/context for unattached professional teams. Viewability depends on current participation and division rules. |
| Pools | Public/source full and short names, scoped aliases, division name/terms, league label, French format/gender labels; season/division UUIDs and exact format/gender enums                                | Current F02 viewability; published past/future seasons remain eligible.                                                                         |

French labels use the existing category vocabulary (féminin, masculin, mixte) and formats (6x6, 4x4, 2x2), with ordinary case/accent normalization. No synonym taxonomy is added. Missing context stays absent, never an empty fabricated identity.

The common text fields feed native whole-word and prefix aggregates with `copy_to`. Named fields remain available for normal relevance boosts. Filter fields and UUID tie-breaking are keywords. One document per existing resource UUID prevents duplicate results when several fields match.

City is indexed only in its effective permitted form. On reads, the indexed value must still equal the current authorized value, including absence; otherwise omit the candidate until automatic reindexing catches up. Names retain their separate approved source/alias semantics. Public cards are hydrated from current F02/F03 views, including current logos, not serialized from engine documents.

Three stable aliases identify the current club/team/pool generations. New generations are temporary until every bulk item succeeds, refresh completes and the atomic alias replacement succeeds. This is index lifecycle, not another relational status table. Previous inactive/failed generations are eligible for scoped cleanup; active or uncertain references are not.

## In-process projection requests

After-commit submissions carry an identity or a changed sporting scope, not a stored document payload. One scheduler serializes targeted reads/writes and whole rebuilds. Dependent-resource expansion belongs to the sporting application boundary and is batched. No durable queue, projection outbox or event history is retained. A process crash loses pending work; the startup/full periodic rebuild supplies catch-up.

Useful operational values are last rebuild outcome/success time and bounded scope/failure counts through existing diagnostics, not public business data or a new operation ledger. No query text or previous restricted city is retained for troubleshooting.

## Read and mobile values

- **Search context**: Resource type, normalized text, optional sporting filters and applicable access/session context. Empty text selects examples; nonempty text selects exhaustive textual traversal.
- **Continuation**: Native score/UUID sort values plus context binding, opaque to the mobile. No server snapshot, expiry job or retained result set. Invalid structure/context is a bad request; a changed index is ordinarily traversed live until refresh.
- **Examples**: At most five resource UUIDs in selected order, retained in the visit for each applicable tab/filter context. Reread removes no-longer-eligible identities without replacement; a changed filter selects again.
- **Search page**: Up to twenty current resource summaries and an optional next cursor; no total. Query also retains local request-dispatch time for comparison with the existing F03 refusal timestamp; it is not a wire field or a restriction registry. Failure does not erase previous authorized pages or establish exhaustion. Current refusals prune identities without replacing them.
- **Options**: Current viewable seasons for the requested team/pool type and active divisions, plus the existing format/gender values. Successful empty and failed retrieval are different states.

All visit values live in ordinary mobile navigation/component state or TanStack Query according to their role. There is no persisted search history, private profile enrichment or duplicate backend catalogue.
