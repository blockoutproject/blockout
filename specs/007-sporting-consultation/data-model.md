# Data model: Sporting consultation

## Ownership and persistence

[F02](../002-sporting-data/data-model.md) owns seasons, clubs, teams, pools, participations, matches, accepted facts, restrictions and images. F03 adds read projections and calendar interpretation, not another persistent sporting model. DTO names and exact absence rules are defined by the [canonical contracts](contracts/README.md).

| Read concept       | Content and relations                                                                                            | Integrity                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Club detail        | Effective public presentation, permitted contact/location values, available seasons                              | Seasons come from viewable teams, newest first. No source fallback for a deliberate absence or restriction.                |
| Team detail        | Season, classification, optional club, viewable pool participations                                              | Stable identity; a professional team needs no club or assumed municipality.                                                |
| Pool detail        | Season, competition/phase context, effective classification and presentation                                     | Missing classification is not inferred from another pool.                                                                  |
| Standings          | Published column order and rows, stated position, source label, optional team summary, accepted observation time | No local rank or zero calculation; unmatched rows stay unlinked.                                                           |
| Pool participants  | Current viewable teams and optional reliable municipality points                                                 | Independent of standings. Identical points retain every team; absent points remain absent.                                 |
| Calendar page      | Category, loading time zone, complete display days and pool groups, exclusive next-day boundary                  | At most seven nonempty days per response, no total browsing cap. Each match appears once in that response.                 |
| Match detail       | Date precision, participants, pool, accepted result/sets, permitted venue/referees, current usable links         | A missing usable date or current restriction hides the resource; no invented instant, score or winner.                     |
| Document reference | Owning match, document kind and qualified source locator                                                         | Information is result-independent; scoresheet/statistics delivery also requires a definitive result. No PDF body retained. |

## Calendar derivation

Evaluate category once per request. A definitive official result gives Completed immediately; otherwise use kickoff plus six elapsed hours, or midnight in Europe/Paris after a date-only match. A missing date supplies no public row. Provisional and unconfirmed results retain their finality in either category. The shared result state controls definitive-result behavior; a special notation alone does not establish completion or document eligibility.

Convert an established instant into the requested IANA grouping zone. A date alone keeps its sporting date. Order days ascending for Upcoming and descending for Completed; order pools by stable UUID and matches by known instant in the traversal direction, unknown times last, then UUID. The exclusive continuation day uses that same category and zone. Read day selection and its matches in one short read-only repeatable-read transaction. Concurrent changes across pages remain possible and are resolved by explicit refresh, not a durable server snapshot.

## Qualified documents

F02 retains only current qualified reference data and its observation time/order. Information-sheet locators carry the supported season, organizer and match code used by the official form. Professional scoresheet/statistics references are actual published PDF URLs; arbitrary schemes, hosts and redirect destinations are refused. Adapter qualification does not make a document public before its current match/result conditions permit it.

For professional information sheets, verified team-label associations are ordinary collector configuration scoped by season/championship and native DataProject team identity. A unique exact participants/date match may establish the auxiliary document code; it never establishes sporting identity. The backend retains the accepted code on the match and preserves it after rescheduling. Current XML cannot invent historical references. A missing mapping or failed read supplies no new fact; it does not erase a useful accepted reference. A qualified explicit withdrawal removes only its named reference. No mapping editor, alias-learning process or acquisition schedule is added.

Keep schedule, result, sets and document freshness independent when only some groups are acquired successfully. Existing F01/F02 observation order and per-match transaction rules apply to enrichment; a late whole observation cannot fill a missing document opportunistically.

## Client state and files

TanStack Query owns generated resource/season/category/zone keys in the current native principal's private client. Ordinary infinite invalidation may reread every retained page; a changed loading zone selects a normal loading/error state. Preserve server complete-day cursors and render identity deduplication. A refused resource purges its own sensitive data, while benign neighbouring projections refresh independently. Public logos use credential-free native Image URIs with no caching; explicit bypass retains generated authenticated transport.

A PDF download uses the common cancellable transport and a temporary Expo cache file. The native renderer receives only the local URI. Remove files when reading closes or fails; remove leftovers on the next cold start. This is a bounded file lifecycle, not an offline document collection. Known access restrictions cancel inappropriate work and prevent delivery; no provider content or personal diagnostic is retained in logs.
