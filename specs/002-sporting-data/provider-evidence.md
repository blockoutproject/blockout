# F02 provider evidence

**Research date:** 2026-10-05 (UTC). **Document date:** 2026-10-06. **Authority:** [accepted F02 specification](spec.md); observations below inform its implementation and do not replace its rules.

## Authority after the approved KISS revision

The observations below are historical discovery evidence. V2 uses LNV pages alone for professional calendars, match details and standings; XML LNV and FFVB observations do not authorize fallback or cross-source completion of those matches. FFVB CSV and complementary pages remain authoritative for the other covered competitions. Unobserved professional phases remain unqualified. The recorded measurements are not performance commitments.

## Method and limits

The owner authorized small, sequential, read-only HTTP experiments against public provider interfaces. The direct research comprised 30 FFVB requests, 34 LNV/DataProject requests and four French commune API requests, including repeat readings and the targeted controls described below. Public search/documentation lookups are outside these counts; redirects were not separately instrumented. No enumeration of identifier ranges, broad crawl, access bypass, dependency installation or load test was performed. No legacy repository was consulted.

Python standard-library clients measured elapsed time immediately before opening a request through completion of reading its body, before decompression and parsing. There was no reusable HTTP session; FFVB responses declared `Connection: close`. Sizes mean received body octets, excluding headers, HTTP framing and TLS overhead. Where gzip was returned, compressed and decompressed sizes are distinguished. Timings are observations from one machine and session, not targets, guarantees, benchmarks or a capacity study. They do not establish provider availability or behavior on another day.

This document retains bounded sporting examples and technical findings, not raw response archives, referee names or club contact details. Actual provider responses are distinguished from the deliberately invalid-scope request. Future malformed-input, interruption, replay and authorization fixtures are synthetic validation cases, not provider incidents observed during research.

## FFVB: one complete CSV per qualified pool

### Observed interface

The [Paris ARF calendar](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?calend=COMPLET&codent=PTIDF75&poule=ARF&saison=2025%2F2026) exposes a public POST form to [the calendar export endpoint](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php):

```text
cal_saison=2025/2026
cal_codent=PTIDF75
cal_codpoule=ARF
cal_coddiv=
cal_codtour=
typ_edition=E
type=RES
rech_equipe=
```

`typ_edition=E` exports CSV; the separate print button uses `P`. The CSV uses semicolons and a trailing empty column:

```text
Entité;Jo;Match;Date;Heure;EQA_no;EQA_nom;EQB_no;EQB_nom;Set;Score;Total;Salle;Arb1;Arb2;
```

Dates, participants, results, set details, totals and venue are in the same document. A second results-only download is unnecessary. The response declares `application/vnd.ms-excel` and attachment filename `ffvb_calendrier.csv`; it is not an Excel workbook. Sampled text was compatible with Windows-1252; the historical menu explicitly declares that encoding. Do not assume UTF-8 from the MIME type.

Example, excluding referee fields: match `ARFA001`, 2025-10-04 19:30, SCPV (`0758726`) against VB 14 (`0755123`), aggregate `1/3`, sets `17-25,25-18,18-25,23-25`, total `83-93`.

**Selected initial approach:** one complete CSV per eligible pool, with explicit season, organizing entity and any required round context; the HTML calendar supplies official standings and qualification context when needed. Do not add a CSV request per team or match. No separate standings CSV endpoint was established in the inspected forms. Reuse source discovery according to F01 rather than rediscovering the whole catalog on every fast cycle. A shared HTTP client is a standard implementation choice; its connection-reuse benefit was not measured here.

### Identity and participation evidence

`EQA_no`/`EQB_no` are not permanent team identifiers. ARF contains PAC1 and PAC2 under the same club number `0757954`; their HTML filters use different local `equipe` values. The [official historical menu](https://www.ffvbbeach.org/ffvbapp/resu/seniors/2025-2026/pbscript.htm) links [EFA](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2025/2026&codent=ABCCS&poule=EFA) and [EFC](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2025/2026&codent=ABCCS&poule=EFC). Identical club/name pairs have different local team filters between these phases:

| Team                                   | Club number | EFA `equipe` | EFC `equipe` |
| -------------------------------------- | ----------- | ------------ | ------------ |
| QUIMPER VOLLEY 29                      | 0299370     | 2            | 1            |
| LES NEPTUNES NANTES VOLLEY ASSOCIATION | 0444976     | 1            | 2            |
| RENNES ETUDIANTS CLUB                  | 0351417     | 7            | 3            |
| VOLLEY CLUB DE VALENCIENNES            | 0590036     | 5            | 4            |
| VOLLEY-BALL PAYS VIENNOIS              | 0695743     | 3            | 5            |

The SCB CSV contains different team labels under club number `0690000`. The later [F01 club-sheet evidence](../001-source-acquisition/evidence/ffvb.md) establishes one official GSD69 VOLLEY club reference: shared club numbers alone are normal and do not make its teams ambiguous. The earlier observation remains valid; its interpretation as intrinsic club-number ambiguity is corrected. The youth selection example `9990001` in VYM is a separate unresolved context, not a universal blacklist or a demonstrated club correspondence. EFC's empty club number with `xxxxx` remains a participant placeholder: retain source context without fabricating a club or public match.

### Complete, empty and multi-round are different claims

The [current AALNV menu](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=AALNV) explicitly links [PAZ 2026/2027](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=AALNV&poule=PAZ). Its CSV was HTTP 200 with only the 90-byte header. A deliberately invalid-scope control changed only `cal_codpoule` to `__BLOCKOUT_INVALID_SCOPE__`: HTTP 200 and exactly the same 90 bytes. Therefore a readable header or successful status cannot certify the existence or context of an empty calendar. Qualification must include established source references and scope, before applying F01/F02 empty-observation rules.

The [historical planning URL](https://www.ffvbbeach.org/ffvbapp/resu/planning_volley.php?saison=2025/2026) returned links and matches for 2026/2027. The requested URL season alone is not proof of the content season.

Official forms also expose division exports. VYM returned 71 matches. [BV5, round 04](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?codent=LIIDF&division=BV5&saison=2025%2F2026&tour=04) used `cal_codpoule=`, `cal_coddiv=BV5`, `cal_codtour=04` and returned 36 matches. A single owner-authorized parameter experiment cleared `cal_codtour`: it returned 144 matches, 36 each for `Jo=01`, `02`, `03`, `04`, without duplicate match codes. The round-04 subset contained the previously inspected examples; an exhaustive byte comparison against the earlier complete response was not performed.

HJM demonstrates reused pool context: `HJM001–003` in round 01 involved ACBB 1, Issy and Meudon Chaville Sèvres 1; `HJM004–006` in round 02 involved Courbevoie 1, Courbevoie 2 and Issy; round 04's `HJM010–012` involved ACBB 1, ACBB 2 and ACBB 3. This agrees with the round/pool reuse described in the [official WebSport manual](https://www.ffvbbeach.org/ffvbapp/websport/WEBSport_2019_documentation.pdf), page 15.

A complete export can be complete only within its selected round. `Jo` can represent a day or round, not universally a phase. The CSV has no explicit pool or season column and no manifest of empty pools. Multi-pool aggregation is therefore not the initial collection strategy; its successful response does not authorize absence-based removal outside a proven scope. Qualify reused pools/rounds and full-calendar selection before enabling removals for that competition shape. Never infer every pool boundary from an unqualified match-code prefix.

### Administrative scores and unknown time

| Observed match | Aggregate `Set` | Published set details | Published total |
| -------------- | --------------- | --------------------- | --------------- |
| SCBA010        | `3/F`           | `25-0,25-0,25-0`      | `75-0`          |
| EFA056         | `3/F`           | `25-0,25-0,25-0`      | `75-0`          |
| HJM010         | `F/F`           | absent                | `0-0`           |
| IJM010         | `2/F`           | `15-0,15-0`           | `30-0`          |

The [WebSport manual](https://www.ffvbbeach.org/ffvbapp/websport/WEBSport_2019_documentation.pdf), page 12, explains `F` for forfeiture and `P` for penalty. The [regional competition regulations](https://www.volleyidf.org/wp-content/uploads/2024/01/RPE-Championnat-Regional-OR-M21M-2023-2024.pdf), articles 11 and 17, provide corroborating notation. Preserve administrative marks and actually published values; do not manufacture sets, convert letters to zero, infer a winner from `0-0`, or impose three winning sets/25 points universally. In SCB, CSV `00:00` corresponded to an empty HTML time cell: this is an unknown-time qualification case, not evidence of a midnight start.

## LNV and DataProject: scope and correspondence before enrichment

The [Alterna Volstar entry](https://www.lnv.fr/competitions/alterna-volstar) exposed a public read-only POST to `/ajaxpost/SportsCompetitions/view`, with `tab=tab-calendar&competitions_id=4`. The 135-byte response contained an iframe for `CompetitionMatches.aspx?ID=137`; official DataProject navigation supplied phase `PID=192`. These observed identifiers are discovery evidence, not permanent constants. DataProject's root page still linked older competitions; it was not a sufficient current catalog by itself.

Public historical navigation established these [ID 125 regular-season](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125&PID=175), [Play-In](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125&PID=190) and [Play-Offs](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=125&PID=176) pages: 182, four and 14 distinct `mID` values respectively. Dates/phases corresponded to 2025–2026, but an explicit literal season declaration was not established in the inspected pages. Preserve official season-attribution evidence; never derive a season solely from a match date.

Grouped HTML contains date/time, participants, aggregate score, venue and referee fields, with repeated desktop/mobile renderings requiring deduplication by match reference. Match attribution includes competition `ID`, phase `PID` and the observed container `CID`. A team menu listed refs 602–615 on all three historical phases, including nonparticipants; it cannot establish participation. Current competition team refs were 725–738, so a team reference is not a proven permanent club identifier across seasons.

The [match 9573 detail](https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=9573&ID=125&CID=313&PID=190&type=LegList) showed Plessis-Robinson versus Paris, aggregate 2–3 and five sets: 19–25, 26–24, 25–22, 19–25, 9–15. Its calendar displayed a Golden Set icon; no golden-set score was established in the inspected summary. The [official playoff explanation](https://www.lnv.fr/evenements/play-offs-d1m) establishes that such a deciding set exists. Do not invent a sixth ordinary set, its score, its winner or the qualified team from the icon. No real LNV forfeiture-letter case was qualified in this sample.

### Historical XML exploration: excluded from V2 source authority

The [official XML entry](https://www.lnv.fr/flux-xml) publishes current [LAM](https://www.lnv.fr/xml/calendrier-LAM.xml), [LAF](https://www.lnv.fr/xml/calendrier-LAF.xml) and [LBM](https://www.lnv.fr/xml/calendrier-LBM.xml) calendars, and [LAM standings](https://www.lnv.fr/xml/classement-LAM.xml). Calendar structure is `Calendrier/Competition/Journee/Match`, with official `CodeMatch`, participant names, date/time, aggregate score, `Set1`–`Set5`, `PointsEquipeDomicile`/`PointsEquipeExterieur` and `P2`/`Stats`. The two `PointsEquipe` fields must not be treated as rally-point totals: for `D1F002` they were 0 and 3, whereas its published sets sum to 52 and 76; their competition-point semantics require qualification. Sampled calendars contained 182, 156 and 198 matches. They did not provide a proven `mID`, team ID or explicit season in calendar rows.

LAF match `D1F002` published aggregate 0–3 and sets 10–25, 18–25, 24–26, followed by two `0-0` placeholders. Its `P2` and `Stats` fields were empty. Future rows used aggregate and sets `0-0`; these are not proof of a played result. Calendar and standings names differed, for example `AS Cannes` versus `Cannes` and `T.V.B.` versus `Tours`.

A direct XML `CodeMatch` to HTML `mID` correspondence was **not established**. Inspected detail links and public scripts did not reveal a usable documented bridge or lightweight set-detail endpoint, either grouped or per match. This does not prove such a bridge is impossible. Do not fuzzy-join names, pair/date-match automatically, combine HTML aggregate with XML set details without attribution and compatibility, or treat the former HTML > XML > FFVB priority as current authority: the approved KISS revision uses LNV pages only. Refreshing detail only when the aggregate changes would miss corrections confined to set details; it is not a qualified shortcut.

## Qualified commune geocoding

The [official commune API documentation](https://geo.api.gouv.fr/decoupage-administratif/communes) supports postal-code and name queries. Four sequential public GETs produced:

| Query on `https://geo.api.gouv.fr/communes`                        | Observed result                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `codePostal=91190&fields=nom,code,codesPostaux,centre&format=json` | Three communes: Gif-sur-Yvette (`91272`), Saint-Aubin (`91538`), Villiers-le-Bâcle (`91679`) |
| Same fields with `codePostal=75013`                                | Paris (`75056`), multiple Paris postal codes, centre `[2.347,48.8589]`                       |
| Same fields with `codePostal=00000`                                | HTTP 200, empty array                                                                        |
| `nom=Saint-Maur&limit=5`                                           | Saint-Maurin, Sainte-Maure and three different Saint-Maur entries                            |

Use the effective city/postal context after manual overrides, intentional absence and privacy restrictions. Postal code or a top-ranked name result alone does not establish the correct commune. Accept only an unambiguous qualified correspondence; an empty or ambiguous success remains distinct from a technical failure. A commune centre is not a gym or match venue. Discard replies for an obsolete locality context, following F02/F01 lifecycle rules.

## Transport observations and acceptance limits

| Sample                                     | Received body                         | Isolated elapsed observations                             |
| ------------------------------------------ | ------------------------------------- | --------------------------------------------------------- |
| FFVB ARF HTML / CSV                        | 88,787 / 6,432 bytes, uncompressed    | 0.557 / 1.184 seconds                                     |
| FFVB EFA HTML / CSV                        | 138,562 / 16,456 bytes, uncompressed  | HTML 0.728, 0.274, 1.928; CSV 0.742, 0.531, 0.694 seconds |
| FFVB BV5 round 04 / all rounds CSV         | 5,156 / 20,796 bytes, uncompressed    | 0.468 / 0.937 seconds                                     |
| DataProject historical regular season HTML | 604,504 gzip bytes; 4,256,942 decoded | 0.769 seconds                                             |
| DataProject match 9573 detail HTML         | 163,861 gzip bytes; 2,610,111 decoded | 0.745 seconds                                             |
| LNV LAM XML                                | 3,075 gzip bytes; 86,186 decoded      | 0.142 seconds                                             |
| Commune queries, table order above         | 368 / 273 / 2 / 739 bytes             | 0.099 / 0.105 / 0.078 / 0.087 seconds                     |

FFVB CSV samples exposed neither `ETag` nor `Last-Modified`; `Expires: 0` and `Cache-Control: must-revalidate, post-check=0, pre-check=0` do not supply a validator. Explicit gzip requests on two CSVs returned no content encoding and no size reduction. Do not promise conditional-request or compression savings for FFVB.

LNV XML supplied `ETag`, `Last-Modified` and `Vary: Accept-Encoding`; gzip altered the ETag representation. A GET using an actually received matching validator returned **304 with no body**. Reuse the previously validated representation only for the same source/context/representation; 304 is not an empty calendar. File modification time is not proof of every match's publication time. DataProject HTML supported gzip, but no usable conditional validator was observed (`no-cache`, `Expires: -1`, `Pragma: no-cache`). A former LNV entry returned HTTP 200 with an error-404 document, reinforcing content validation rather than status-only success.

These reads establish research findings only. Parser regression fixtures, strict context checks, full-round reconciliation, identity ambiguity handling, golden-set semantics, real contract consumers, replay/stale-cycle rejection and provider failure behavior remain **not executed as V2 implementation qualifications**. Each affected capability must retain its blocking acceptance condition; these samples do not certify a working collector, complete historical coverage or safe absence-based removal.
