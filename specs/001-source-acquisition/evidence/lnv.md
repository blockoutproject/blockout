# LNV and DataProject discovery evidence

**Observation date:** 2026-10-06. **Scope:** public LNV/DataProject reads supporting the [F01 specification](../spec.md) and its approved planning decisions. This document records observations and limits; it does not certify a deployed collector or complete historical coverage.

## Method and limits

This F01 research made **75 direct HTTP requests**: a first bounded batch of 30, a second batch of 42, and a final three-request verification of the current discovery chain. Counts include repeated readings used to inspect different page sections, four small presentation scripts, and public read-only POST requests used by the website's own tabs. Redirects were not separately instrumented. An initial sandbox DNS failure did not reach the provider and is excluded. Additional public web searches and three initial web-tool page openings are outside the direct-request count. The earlier [F02 provider research](../../002-sporting-data/provider-evidence.md) has separate counts and must not be added as if it were part of this batch.

Requests were sequential, with Python standard-library HTTP clients and gzip where requested and returned. Responses were examined in memory; no raw-document archive, dependency installation, provider change, identifier-range enumeration or load test was performed. A player-page URL discovered by public search was read once solely to recover its championship navigation; player data is not retained here. No external or archived repository was consulted.

One initial exploratory POST used a competition-tab value of `6` that had not been established from a published entry. It returned an iframe with an empty source. This response is **not qualified discovery evidence**, is not a valid empty sporting calendar and must not become a production reference or fixture proving a valid empty competition. Subsequent requests used emitted links and parameters.

The observations below are real supplier readings. Proposed crash, timeout, stale-work, rollover and malformed-content tests remain synthetic qualification cases. Sizes describe individual responses, not benchmarks, throughput objectives, provider quotas or capacity conclusions.

## Current discovery chain

The three current official championship pages expose a calendar tab with `data-competition`, a public AJAX POST and DataProject iframe destinations:

| Stable championship role | Official entry inspected                                                   | Emitted LNV tab value | DataProject championship | Published regular phase |
| ------------------------ | -------------------------------------------------------------------------- | --------------------- | ------------------------ | ----------------------- |
| Men's first division     | [Alterna VOLSTAR](https://www.lnv.fr/competitions/alterna-volstar)         | `4`                   | `137`                    | `192`                   |
| Women's first division   | [Saforelle VOLSTAR](https://www.lnv.fr/competitions/saforelle-volstar)     | `5`                   | `135`                    | `193`                   |
| Men's second division    | [VOLSTAR Masculine 2](https://www.lnv.fr/competitions/volstar-masculine-2) | `162`                 | `139`                    | `196`                   |

The final verification repeated this exact chain:

```text
GET https://www.lnv.fr/competitions/alterna-volstar
  calendar tab: data-id="tab-calendar", data-competition="4"
POST https://www.lnv.fr/ajaxpost/SportsCompetitions/view
  tab=tab-calendar&competitions_id=4
  response iframe: CompetitionMatches.aspx?ID=137
GET https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=137
  published phase link: CompetitionMatches.aspx?ID=137&PID=192
```

The LNV page also directly embeds `CompetitionStandings.aspx?ID=137`. The collector therefore discovers `137`; it does not calculate it from a year. `4`, `137` and `192` belong to different provider namespaces. None is a permanent application constant. The three championship roles remain recognizable when commercial names change; entry URLs themselves are not guaranteed never to change.

The observed POST is a public website interface returning a small HTML iframe, not an established supported JSON API. No claim is made that LNV has no other API.

### Selected seasonal-binding behavior

Assisted discovery reads supported official entries and prefills candidate championship references. The backend stores the confirmed association between a Blockout season, a championship role and its provider reference. The operator confirms the season when the source does not establish it, and may correct supported entry references before launch. Source bindings are locked at launch; later repair is an explicit technical operation. Parser rules and supported URL shapes belong to the adapter, while seasonal identifiers and confirmed entry references belong to backend configuration/data, not hard-coded annual values.

An already bound championship remains eligible until the operator closes its season, subject to the other accepted eligibility rules. A commercial LNV entry rolling to a new championship does not replace the older season's binding or prove its phases disappeared. A newly observed championship is a candidate: a changed ID alone proves neither a new season nor a valid replacement. New phase links under an established championship remain automatically discoverable after launch; the source-binding lock does not freeze the phase list.

For historical bootstrap, the operator may supply or confirm a supported official championship URL before launch when earlier references were never recorded and cannot be rediscovered. This is bounded preparation of seasonal entries, not a generic archive crawler or per-match URL editor. Initial historical reconstruction uses the same F02 integrator before definitive closure, without enabling periodic collection, resetting data or scheduling a day of repeated runs. Once closed, the season has no recollection or reopening operation.

## Four-season comparison and season-attribution limits

| Season under examination | Men's first division: championship / phases          | Women's first division: championship / phases         | Men's second division: championship / phases                           | Attribution evidence                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current 2026/2027        | `137`: regular `192`                                 | `135`: regular `193`                                  | `139`: regular `196`                                                   | Current LNV entries supply the IDs; the linked official calendar announcement names 2026-2027. The announcement does not itself bind the DataProject IDs. Operator confirmation remains applicable. |
| Expected 2025/2026       | `125`: regular `175`, Play-In `190`, Play-Offs `176` | `124`: regular `173`, Play-Ins `191`, Play-Offs `174` | `126`: regular `177`; no additional phase link in inspected navigation | Real historical pages and phase navigation obtained. An explicit championship-level season pair was not established in this sample; do not derive it from match dates.                              |
| 2024/2025                | `115`: regular `159`, Play-Offs `161`                | `113`: regular `156`, Play-Offs `158`                 | `116`: regular `160`, Play-Offs `162`                                  | The official DataProject home catalog attaches a 2024-to-2025 period directly to these three championship cards.                                                                                    |
| Expected 2023/2024       | `105`: regular `142`, Play-Offs `143`                | `103`: regular `141`, Play-Offs `154`                 | `106`: regular `144`, Play-Offs `145`                                  | Real historical calendars obtained. Their explicit championship-level season pair remains unqualified here; dates and player-history text are not an automatic season rule.                         |

Sources include the [current LNV calendar announcement](https://www.lnv.fr/actualites/2026-08-17/decouvrez-les-calendriers), [DataProject home catalog](https://lnv-web.dataproject.com/MainHome.aspx), [men's historical phases](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125&PID=175), [women's historical phases](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=124&PID=173) and [historical second division](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=126&PID=177).

The DataProject catalog's displayed period is `31 jui. 2024 - 31 jui. 2025`; this is useful championship-level year-context evidence, not a reason to infer an exact season-boundary timestamp from the provider's abbreviated month. The root catalog still exposed these older competitions when LNV's current entries pointed to 137/135/139, so it is not a sufficient current catalog by itself.

The final current DataProject calendar inspection found none of the literal pairs `2026/2027`, `2026-2027`, `2025/2026` or `2025-2026`. This is a scoped observation, not proof that no other official seasonal evidence exists. Conversely, the [older 89/137 witness](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=89&PID=137) explicitly labels its championship 22-23 and publishes phases `124`, `137` and `138`.

A mutable URL is not an archive declaration: the official [women's playoff page whose slug contains 2025](https://www.lnv.fr/evenements/play-offs-2025-sp6) displayed a 2027 title during inspection and no DataProject link in the inspected content. Its slug cannot qualify a 2025 archive. The [second-division final-phase page](https://www.lnv.fr/evenements/play-offs-2025-lbm) likewise did not establish a historical DataProject phase reference.

### Calendar samples actually inspected

Counts below are distinct `mID` occurrences after collapsing repeated HTML representations. They are neither expected sporting totals nor completeness certificates. A listed navigation link is not a claim that its destination and all its matches were individually qualified.

| Championship / phase | Distinct match references observed in this F01 batch |
| -------------------- | ---------------------------------------------------: |
| `105 / 142`          |                                                  182 |
| `105 / 143`          |                                                   21 |
| `103 / 141`          |                                                  156 |
| `106 / 144`          |                                                  132 |
| `115 / 159`          |                                                  156 |
| `113 / 156`          |                                                  182 |
| `116 / 160`          |                                                   90 |
| `116 / 162`          |                                                   24 |
| `124 / 173`          |                                                  156 |
| `126 / 177`          |                                                  165 |
| `89 / 137`           |                                                   23 |

Several regular, play-in and playoff structures were read, but full phase coverage for all four seasons is **not qualified**. In particular, the lack of another published link under championship 126 does not establish that no final phase existed elsewhere. No phase finale under a separate championship ID was demonstrated by this sample; the collector must not invent one or silently expand competition scope.

## Identity evidence: LNV profiles, seasonal teams and matches

### Current profile-to-team bridges

LNV's championship logo lists link to official team profiles. Each profile exposes `data-team` and uses `/ajaxpost/SportsTeams/view`. The `tab-calendar` response provides a direct provider-emitted association:

| Official profile                                       | `teams_id` | Returned calendar iframe context |
| ------------------------------------------------------ | ---------: | -------------------------------- |
| [Sète](https://www.lnv.fr/d1m/equipes/sete-173)        |        173 | `ID=137&TeamID=725`              |
| [Royan](https://www.lnv.fr/d1m/equipes/royan-11335)    |      11335 | `ID=137&TeamID=733`              |
| [Béziers](https://www.lnv.fr/d1f/equipes/beziers-3309) |       3309 | `ID=135&TeamID=700`              |
| [Ajaccio](https://www.lnv.fr/d2m/equipes/ajaccio-177)  |        177 | `ID=139&TeamID=718`              |

These bridges require no name matching. Treat `teams_id` as a qualified LNV profile reference; its technical name does not establish a universal permanent organization identifier. Historical stability of each profile and cases with multiple teams from one organization remain to be demonstrated before automating those associations.

The `tab-infos` responses for profiles 173, 3309 and 177 expose club-information fields for address, telephone, status and foundation date. No FFVB affiliation code or FFVB link was observed in those three responses. Contact values are deliberately omitted here. A certain LNV-to-FFVB organization correspondence therefore remains a separate qualification or a small verified technical mapping under F02, never name/address similarity.

### Seasonal references change

| Published team label used for comparison only | Expected 2023/2024 | Qualified 2024/2025 context | Expected 2025/2026 | Current provider-emitted bridge |
| --------------------------------------------- | ------------------ | --------------------------- | ------------------ | ------------------------------- |
| Sète                                          | `105 / TeamID 520` | `115 / 559`                 | `125 / 609`        | LNV 173 → `137 / 725`           |
| Béziers                                       | `103 / 508`        | `113 / 547`                 | `124 / 590`        | LNV 3309 → `135 / 700`          |
| Royan                                         | `106 / 543`        | `116 / 582`                 | `126 / 624`        | LNV 11335 → `137 / 733`         |

The labels make this comparison understandable; they are not sufficient evidence to merge the rows automatically. Unknown historical correspondences remain unresolved. A seasonal `TeamID` must not be placed into F02's certain `clubReference` field merely to satisfy transport validation.

Within one championship, [116/160](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=116&PID=160) and [116/162](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=116&PID=162) expose the same team-selector references, including Royan 582 and Ajaccio 576. This supports retaining team references across those phases. The selector also includes championship teams not necessarily present in every phase; calendar participation remains the authority for participation creation.

The [current DataProject team 725 page](https://lnv-web.dataproject.com/CompetitionTeamDetails.aspx?TeamID=725&ID=137) contains a history from 2011 through 2026, including professional competition, cup and CFC/Elite Avenir labels. That history block has no links or identifiers for the older entries. It is descriptive evidence, not an automatic join between a first team, reserve/training teams and older seasonal IDs.

### Match identity and detail attribution

Published match links carry `mID`, championship `ID`, phase `PID` and observed container `CID`. Examples include regular-season `mID=8758&ID=125&CID=300&PID=175` and play-in `mID=9573&ID=125&CID=313&PID=190`. Keep the qualified provider context. `CID` is not a demonstrated club identifier; here its value belongs to the calendar/phase container.

The [9573 detail page](https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=9573&ID=125&CID=313&PID=190&type=LegList) supplies a 2–3 aggregate and five ordinary sets: 19–25, 26–24, 25–22, 19–25, 9–15. Summary nodes include `Content_Main_LB_Set...`; no client-side execution is needed to obtain these values. The prior F02 evidence records a golden-set icon without a qualified score. Neither the icon nor an ordinary-set total authorizes inventing a golden-set score, winner or qualification outcome.

Do not collect the first `TeamID` found anywhere in a detail document: unrelated player/MVP links can use other references. Resolve only the relevant participant component and verified context. Repeated desktop/mobile renderings are duplicates to collapse, not additional matches.

## Transport and optimization evidence

The inspected public scripts were `js/common.js`, `js/RadComboBox.js`, `js/MenuLiveScoreBlink.js` and `js/MatchStatisticsDivBlinkjQuery.js`. They implement presentation, streaming-window opening, selector behavior or visual blinking. They did not expose a structured calendar/set-data feed.

Calendars use ASP.NET/Telerik, including ViewState and `ajaxManager.ajaxRequest('TeamChanged')` for the team filter. This establishes an interface postback mechanism, not a qualified lightweight endpoint or supported public API. No Telerik postback was replayed for this research. A separate browser runtime or custom postback client is not justified by the evidence obtained.

| Single response sample     |     Gzip body octets |                          Decoded size |
| -------------------------- | -------------------: | ------------------------------------: |
| Current137 calendar        |               567746 |                        4032011 octets |
| Current135 calendar        |               494578 |                        3469986 octets |
| Historical125/175 calendar | approximately 604333 | approximately 4256730 text characters |
| Match9573 detail           | approximately 163800 | approximately 2609994 text characters |

The first current samples explicitly measured decoded bytes; later diagnostic reads measured decoded Python text length. These units are intentionally not treated as interchangeable. Values vary between readings. No durations or extrapolated daily volume are claimed here.

The emitted Sète URL `CompetitionMatches.aspx?ID=137&TeamID=725` still returned 183 distinct `mID` values and approximately 4 million decoded characters. The published `TeamID` parameter therefore did **not** demonstrate a smaller team-only transfer. Download a qualified grouped phase calendar once rather than assuming these profile URLs save requests.

The calendar's print action calls `printDiv('printableArea')` on the document already obtained. No linked CSV/ICS export or lighter necessary-detail representation was established in the inspected pages. Reads of match 9573 and calendar 125/190 found no published PDF/DataVolley report link that could qualify a bridge to separately located report URLs. No production PDF parser or report-name guessing follows from this research.

Gzip was actually returned and is useful for these large HTML responses. The prior F02 research found no usable DataProject conditional validator; this F01 batch did not establish ETag/Last-Modified revalidation. Do not promise 304 savings. Reusable HTTP clients, bounded provider concurrency and paced requests are standard implementation choices; this sample establishes no universal numeric provider quota and does not benchmark connection reuse.

### Selected cadence and freshness

Professional match and standings facts remain **LNV pages only**. XML LNV and FFVB do not supplement or replace these professional observations.

Phase calendars and standings follow the phase's eligible cadence. A match-detail page follows **its own** reliable kickoff window: five-minute scheduled cadence from one hour before to four hours after that kickoff; otherwise thirty minutes, including final matches. Another match's fast window must not accelerate every detail page in the phase. An unchanged aggregate does not suppress scheduled detail reads, because sets may be corrected independently.

A fast phase-calendar reading can establish complete match presence without freshly reading every secondary detail field. Preserve each field's actual observation time; a retained or not-requested detail is not newly observed. F02 already separates essential presence from secondary sets and provides per-field observation time. If the aggregate changes and old sets are incompatible, hide the incompatible detail rather than fabricate consistency. Invalid or unavailable detail retains the accepted F02 distinction from explicit removal.

## Remaining qualification gates

| Gate                               | Evidence obtained                                                                                        | Required success evidence before relying on the capability                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assisted seasonal discovery        | Current public tab/iframe chain read again; 2024/2025 catalog cards attributable                         | Executable adapter discovers candidates; human confirmation required when season evidence is absent; new IDs never overwrite a launched binding. **Not executed.**                           |
| Rollover and source lock           | Behavior selected; current and older references remain independently readable                            | Simulated rollover retains old-season collection; prelaunch edits work, postlaunch edits are refused except authorized technical repair; new phase links still discovered. **Not executed.** |
| Historical phase coverage          | Representative calendars and phase links for four examined season groups; older 22-23 witness            | Confirm requested seasonal bindings and qualify every required available phase, or report the exact missing scope without substituting current data. **Incomplete qualification.**           |
| Organization and seasonal identity | Four current LNV-profile bridges, multiple changing seasonal IDs, one same-championship phase comparison | Verify required historical/pro-amateur mappings; unresolved participants must not receive guessed club IDs. **Partially observed; application behavior not executed.**                       |
| Cadence and field freshness        | Grouped HTML and actual detail fields observed                                                           | Clock-controlled tests prove own-match windows, thirty-minute final/out-of-window reads, phase cadence, no aggregate-only suppression and accurate field freshness. **Not executed.**        |
| Safe parsing and integration       | Real structures and duplicates observed                                                                  | Reduced controlled fixtures, unknown/error/partial cases, contract consumers and F02 database integration prove safe outcomes. No broad raw-response archive is needed. **Not executed.**    |

Missing supplier evidence is reported as a qualification limit. It does not authorize a fuzzy matcher, generic archive crawler, new supervision service, cross-source fallback or a claim that four seasons are fully reconstructible.

## Direct-request inventory

`L` below means `https://www.lnv.fr`; `D` means `https://lnv-web.dataproject.com`. Unmarked requests were GET. Repetitions are retained in counts because they were actual network reads. Query values are observation records, not supported-identifier constants.

### Batch A: 30 requests

| Requests | Destination or operation                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A01      | L`/competitions/alterna-volstar`                                                                                                |
| A02–A03  | L`/competitions/saforelle-volstar`; L`/competitions/volstar-masculine-2`                                                        |
| A04      | L`/ajaxpost/SportsCompetitions/view`, POST `tab=tab-calendar&competitions_id=4`                                                 |
| A05      | D`/CompetitionMatches.aspx?ID=137`                                                                                              |
| A06      | Same LNV endpoint, POST `tab=tab-calendar&competitions_id=5`                                                                    |
| A07      | D`/CompetitionMatches.aspx?ID=135`                                                                                              |
| A08      | Same LNV endpoint, POST `tab=tab-calendar&competitions_id=6`; unqualified exploratory value, excluded from valid-scope evidence |
| A09      | Same LNV endpoint, POST `tab=tab-calendar&competitions_id=162`                                                                  |
| A10–A12  | D`/CompetitionMatches.aspx?ID=139`; D`/CompetitionHome.aspx?ID=137`; D`/`                                                       |
| A13–A15  | D`/js/common.js`; D`/js/RadComboBox.js`; D`/js/MenuLiveScoreBlink.js`                                                           |
| A16–A17  | D`/CompetitionMatches.aspx?ID=125&PID=175`; D`/CompetitionMatches.aspx?ID=125&PID=190`                                          |
| A18      | D`/CompetitionTeamDetails.aspx?TeamID=725&ID=137`                                                                               |
| A19      | D`/CompetitionHome.aspx?ID=125`                                                                                                 |
| A20      | D`/MatchStatistics.aspx?mID=9573&ID=125&CID=313&PID=190&type=LegList`                                                           |
| A21–A23  | Repeat A01; repeat A18 twice                                                                                                    |
| A24      | D`/js/MatchStatisticsDivBlinkjQuery.js`                                                                                         |
| A25–A26  | L`/evenements/play-offs-2025-sp6`; L`/evenements/play-offs-2025-lbm`                                                            |
| A27–A28  | Repeat A18 twice for the history block                                                                                          |
| A29–A30  | Repeat A20; repeat A16                                                                                                          |

### Batch B: 42 requests

| Requests | Destination or operation                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B01      | L`/competitions/alterna-volstar`                                                                                                                                               |
| B02–B03  | L`/d1m/equipes/sete-173`; L`/d1m/equipes/royan-11335`                                                                                                                          |
| B04–B05  | L`/competitions/saforelle-volstar`; L`/competitions/volstar-masculine-2`                                                                                                       |
| B06–B08  | L`/ajaxpost/SportsTeams/view`, POST `teams_id=173` with respectively `tab=tab-calendar`, `tab=tab-stats`, `tab=tab-infos`                                                      |
| B09      | Same endpoint, POST `tab=tab-calendar&teams_id=11335`                                                                                                                          |
| B10–B11  | L`/d1f/equipes/beziers-3309`; L`/d2m/equipes/ajaccio-177`                                                                                                                      |
| B12      | L`/actualites/2026-08-17/decouvrez-les-calendriers`                                                                                                                            |
| B13      | D`/CompetitionMatches.aspx?ID=137&TeamID=725`                                                                                                                                  |
| B14–B15  | L`/ajaxpost/SportsTeams/view`, POST `tab=tab-calendar` with respectively `teams_id=3309`, `teams_id=177`                                                                       |
| B16–B17  | D`/`; repeat B12                                                                                                                                                               |
| B18      | L`/ajaxpost/SportsTeams/view`, POST `tab=tab-news&teams_id=173`                                                                                                                |
| B19–B20  | D`/MatchStatistics.aspx?mID=9573&ID=125&CID=313&PID=190&type=LegList`; D`/CompetitionMatches.aspx?ID=125&PID=190`                                                              |
| B21      | D`/MainHome.aspx`                                                                                                                                                              |
| B22–B24  | D`/CompetitionMatches.aspx?ID=103&PID=141`; D`/CompetitionMatches.aspx?ID=105&PID=143`; D`/CompetitionMatches.aspx?ID=89&PID=137`                                              |
| B25–B26  | Repeat B21 twice for catalog card/date extraction                                                                                                                              |
| B27–B28  | D`/CompetitionHome.aspx?ID=113`; D`/CompetitionHome.aspx?ID=116`                                                                                                               |
| B29      | D`/CompetitionTeamDetails.aspx?ID=124&TeamID=598`                                                                                                                              |
| B30      | D`/CompetitionHome.aspx?ID=105`                                                                                                                                                |
| B31      | D`/PlayerDetails.aspx?ID=106&PlayerID=4536&TeamID=545`; championship navigation only retained                                                                                  |
| B32–B35  | D`/CompetitionMatches.aspx?ID=126&PID=177`; D`/CompetitionMatches.aspx?ID=113&PID=156`; D`/CompetitionMatches.aspx?ID=116&PID=160`; D`/CompetitionMatches.aspx?ID=115&PID=159` |
| B36–B38  | D`/CompetitionMatches.aspx?ID=106&PID=144`; D`/CompetitionMatches.aspx?ID=105&PID=142`; repeat B22                                                                             |
| B39–B40  | D`/CompetitionMatches.aspx?ID=124&PID=173`; D`/CompetitionMatches.aspx?ID=116&PID=162`                                                                                         |
| B41–B42  | L`/ajaxpost/SportsTeams/view`, POST `tab=tab-infos` with respectively `teams_id=3309`, `teams_id=177`; field labels and federation-code/link presence inspected                |

### Final verification: 3 requests

Repeat A01, A04 and A05, deriving each next request from the value or link actually returned. The observed chain remained LNV tab 4 → DataProject championship 137 → regular phase 192.
