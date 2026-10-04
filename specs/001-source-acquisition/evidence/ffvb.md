# FFVB discovery and identity evidence

**Observed:** 2026-10-06. **Authority:** [F01 specification](../spec.md) and [F02 specification](../../002-sporting-data/spec.md). These public-source observations inform the approved plan; they do not certify a working collector or replace accepted product decisions.

## Scope, method and limits

This investigation made **87 sequential direct HTTP reads: 72 GETs and 15 public read-only POSTs**, including targeted repeat readings. Six web-tool opens/clicks and three search queries were separate discovery aids; redirects were not counted independently. One initial sandbox DNS failure did not reach the provider and is excluded from successful direct reads. The earlier 30-request FFVB investigation recorded in [F02 provider evidence](../../002-sporting-data/provider-evidence.md) is a separate investigation, not part of these 87 reads. No additional provider request was made to write this document.

Reads followed official entry pages, links, frames, menus and public forms. The owner also requested comparisons of the same qualified seasonal route across 2023/2024, 2024/2025, 2025/2026 and 2026/2027. Selecting a season on that route was an exploratory request, not proof that the provider honored it. The study included a linked 2022/2023 masters directory as an interface witness only. It did not enumerate identifier ranges, crawl every organizer or pool, access private administration, install dependencies, modify suppliers or inspect a legacy repository.

Python standard-library HTTP clients and small in-memory HTML/CSV readers exposed relevant references and sporting examples. Raw responses, personal contact fields and referee names were not retained as repository fixtures. The exploratory readers are not production parsers. One early reader undercounted future team compositions because those tables differ from played standings; its participant counts are not evidence. An early date-summary expression also selected the wrong end of ISO date strings; its output is not season-attribution evidence. Search-engine cached content differed from live menus, so cached results are not current-catalog proof. No timing, load, capacity or availability conclusion follows from this research.

The accepted scope is departmental, regional, national and professional championships, including youth groups used before assignment to regional championship levels. French Cups and unrelated disciplines remain outside scope. Professional sporting facts come from LNV pages, even when FFVB menus expose professional options. Youth groups are ordinary separately classified pools; acquisition does not model progression to a later group or decide sporting qualification.

## Public entry points and their actual roles

| Interface                                                                                                                                                                  | Observed mechanism                                                     | What it can establish / limitation                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [National championships](https://www.ffvb.org/119-37-1-Championnats-Nationaux)                                                                                             | Seasonal article links and national pool framesets                     | Published season labels and actual entry links; article identifiers are discovered, not permanent constants.                                                                                     |
| [Regional championships](https://www.ffvb.org/120-37-1-Championnats-Regionaux) and [departmental championships](https://www.ffvb.org/122-37-1-Championnats-Departementaux) | Links to organizing entities through `vbspo_home.php?codent=...`       | Organizers and their current entry routes; a label without a link does not justify a guessed entity reference.                                                                                   |
| [General planning](https://www.ffvbbeach.org/ffvbapp/resu/planning_volley.php)                                                                                             | `select name=sel_entites` with 101 organizer values plus a placeholder | A shared organizer directory spanning national competitions, leagues and committees. This is not proof of the complete historical organizer set or permission to ingest every listed discipline. |
| [Season archives](https://www.ffvb.org/competitions/volley-ball/palmares-et-historique/article-351)                                                                        | Published senior/youth archive roots and historical planning links     | Prepared seasonal starting references; each destination still needs content-context validation.                                                                                                  |
| [Brittany menu](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIBR)                                                                                         | Nested group headings and calendar links with season and pool          | Native acquisition groups and child references; no universal identifier is present on each group heading.                                                                                        |
| [Île-de-France menu](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIIDF)                                                                                   | Direct pool links and `division=...&tour=...` links                    | A division/round page may expose several distinct groups; a flat list of direct pool links would omit them.                                                                                      |
| [Club search](https://www.ffvbbeach.org/ffvbapp/adressier/recherche.php)                                                                                                   | Public POST filters for league, committee or department                | Federal club references and detail forms. Directory reachability does not extend the accepted club-ingestion perimeter beyond covered teams.                                                     |

The selected discovery chain is: official entry or prepared seasonal root → organizer/season menu → provider group → direct pool or published division/round page → contextual pool references. Re-read the catalog according to F01; do not maintain a manual URL for each child pool. A newly visible child still requires coverage and effective classification before acquisition.

### National selector: the screenshot has ordinary HTML destinations

The observed [N3F.A frameset](https://www.ffvbbeach.org/ffvbapp/resu/seniors/2026-2027/index_3fa.htm) contains:

- Frame `en_tete`, source `pbscript.htm` relative to the seasonal directory.
- Frame `calendrier`, source [ABCCS/3FA, 2026/2027](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=ABCCS&poule=3FA).

The [national header menu](https://www.ffvbbeach.org/ffvbapp/resu/seniors/2026-2027/pbscript.htm) contains `listepages`, `listeN1`, `listeEA`, `listeN2`, `listeN3` and `listeCLUBS` selectors. Their `option value` attributes already hold complete destinations. For example, `N3F.A` points to the ABCCS/3FA calendar above. The change handler only assigns the selected URL to `window.parent.calendrier.location.href`.

A normal HTTP read and HTML parser can therefore extract national options without a browser or JavaScript execution. Regional and departmental menus instead expose ordinary anchors. Keep these known structures as explicit adapter branches. Discard non-calendar menu entries from calendar discovery: `listeCLUBS` links to the address directory and `recherche_division.php`; professional and Cup options do not override the selected product perimeter.

### Division and pool directories are useful complements, not universal catalogs

The [Occitanie engagement selector](https://www.ffvbbeach.org/ffvbapp/adressier/engag_division.php?codent=LILR) lists provider division codes and labels. Following its actual GET form establishes:

| Submitted provider division                                                                                      | Resulting pool in the engagement table |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [SMP](https://www.ffvbbeach.org/ffvbapp/adressier/engag_division_aff.php?divisions=SMP&id_club=&wss_codent=LILR) | PMA                                    |
| [PNM](https://www.ffvbbeach.org/ffvbapp/adressier/engag_division_aff.php?divisions=PNM&id_club=&wss_codent=LILR) | MPO                                    |

The table exposes `Poule`, local position, federal club number and club name, followed by detail links. A provider division code cannot be inferred from a pool prefix. It is also distinct from the operator's Blockout division classification.

The [Occitanie address-export selector](https://www.ffvbbeach.org/ffvbapp/adressier/adressier.php?codent=LILR&typ_edition=E) exposes `adr_poule[]` checkboxes and a POST to `adressier_pdf.php`. The sampled selector offered 25 pools while the current menu offered 30 calendar references. The directory is therefore not a complete replacement for that menu. No bulk contact export was needed.

Engagement forms inspected here carry no season. Even the Brittany 2025/2026 menu links to those directories without a season argument. Their current club or division information must not be silently attributed to the archive season. The hidden empty `wss_get_saison` field in an address-export form is not proof of a usable historical selector.

## Season detection and four-season comparison

The stable national page explicitly publishes seasonal article labels and links. At observation time, its current content referenced 2026/2027; the planning page linked `seniors/2026-2027/` and carried `saison=2026/2027` in navigation forms. The current Brittany menu also emitted calendar URLs for 2026/2027. These are discoverable supplier signals, unlike constructing next year's URL by incrementing a string.

Detection may prepare a season and the references actually found. Publication by one organizer does not prove every organizer is ready. Operator launch and classification remain separate decisions. Prepared roots can be corrected before launch; after launch, the accepted administrative rule locks those entries while child pool/round discovery continues. Exceptional technical repair remains possible. An official destination with a recognized structure can repair a changed URL; a new structure requires an adapter correction, not just a different URL.

### Direct menu comparison

Twelve menus were read: three organizers across four seasons. Nonempty menu links consistently carried their requested season in the examples below, except the explicitly unqualified Occitanie 2025/2026 case.

| Organizer | Seasonal evidence                                                                                                                                                                                                                                                                                                                                                                                          | Established change                                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brittany  | [2023/2024](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIBR&saison=2023/2024), [2024/2025](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIBR&saison=2024/2025), [2025/2026](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIBR&saison=2025/2026), [2026/2027](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIBR&saison=2026/2027)         | CPC and CPD belong to `M18F EXCELLENCE` in 2023/2024, then `M18F PERFORMANCE` in the three later menus. Pool-code continuity does not prove classification continuity.                                                                                                                          |
| Rhône     | [2023/2024](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=PTRA69&saison=2023/2024), [2024/2025](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=PTRA69&saison=2024/2025), [2025/2026](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=PTRA69&saison=2025/2026), [2026/2027](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=PTRA69&saison=2026/2027) | Earlier menus use `LOISIR` and `COMPET'LIB`; later menus use `COMPETMOUV'` and `COMPETFUN`. This proves changed labels, not a complete automatic mapping between old and new groups.                                                                                                            |
| Occitanie | [2023/2024](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LILR&saison=2023/2024), [2024/2025](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LILR&saison=2024/2025), [2025/2026](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LILR&saison=2025/2026), [2026/2027](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LILR&saison=2026/2027)         | Earlier regional men's/women's East/West groupings become separate level-1/level-2 labels in 2026/2027. The 2025/2026 menu instead states `Aucune compétition accessible actuellement`, with no calendar reference establishing that season. That route remains unqualified for reconstruction. |

Native parent headings in the ordinary menus are often just `<a href="#">label</a>`. Some round-based groups expose a division code, but no uniform permanent identifier for every pack was established. These four-season observations support manual classification per season, without fuzzy copying based on a label or pool code.

The archive page supplies real senior and youth seasonal roots. It also supplies historical planning URLs, but [the previously tested 2025/2026 planning link](https://www.ffvbbeach.org/ffvbapp/resu/planning_volley.php?saison=2025/2026) returned current-season material during F02 research. Prepared references must be checked against their actual destination and content. The current organizer directory alone does not establish every organizer that existed historically. Unavailable coverage is recorded, not filled from another season.

### Four exports of the same named pool

The native LIBR/PNF complete export was read for 2023/2024 through 2026/2027 using the seasonal references above. Each contained 132 rows. `PNFA001` was reused in all four, while the participant set changed.

- Federal references `0228400` and `0351428`, with their Cesson Saint-Brieuc and Pipriac labels, were present in all four samples. This supports persistent club references, not a single team identity spanning seasons.
- The 2024/2025 and 2025/2026 samples included `xxxxx` with an empty club number. This does not establish a real club or viewable encounter.
- Reference `0293684` used a label with `MÉTROPOLE` in 2025/2026 and `METROPOLE` in 2026/2027. This is not permission to remove accents from all team comparisons; federal club continuity and seasonal team identity are separate concerns.

The CSV has no explicit season column. These requests remain tied to the qualified menu/form context; a requested season or a date-only inference is not sufficient on its own.

## Calendar transport, contextual pools and official standings

### One useful complete export, not several downloads for the same facts

The public calendar form POSTs to [vbspo_calendrier_export.php](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier_export.php) with `cal_saison`, `cal_codent`, `cal_codpoule`, `cal_coddiv`, `cal_codtour`, `typ_edition=E`, `type=RES` and `rech_equipe`. Blank values are meaningful form selections, not permission to broaden an arbitrary scope. Print uses `typ_edition=P`.

The CSV uses semicolon separators, a trailing empty column, and these named fields: `Entité`, `Jo`, `Match`, `Date`, `Heure`, `EQA_no`, `EQA_nom`, `EQB_no`, `EQB_nom`, `Set`, `Score`, `Total`, `Salle`, `Arb1`, `Arb2`. The sampled text was compatible with Windows-1252. The Excel MIME label does not make it an Excel workbook.

It already supplies participants, calendar, results, set detail, totals, venue and referee fields. No separate results download or general match-sheet retrieval is justified for those fields. Supplementary HTML supplies official standings and context. No separate standings CSV API was established.

Samples included LIBR/PNF and ABCCS/2FA with 132 matches over 22 ordinary days, LIBR/CEF and CFF with 15 matches each, PTRA69/CL1 with 56 matches over 14 days, and LIIDF/CFA with 45 matches spanning three explicit rounds. These are sampled shapes, not exhaustive coverage counts.

### CFA is reused for different ordinary youth groups

The [Île-de-France menu](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_home.php?codent=LIIDF) publishes the exact group label `QUALIFICATIONS REGIONALES : M18 FEMININ 6X6` and [tour 01](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&division=QCF&tour=01), [tour 02](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&division=QCF&tour=02) and [tour 03](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&division=QCF&tour=03) pages. The label does not identify a French Cup. Treat the accepted youth groups as ordinary pools with manual classification; no downstream qualification relationship is required.

Tour 01 exposes CFA–CFQ; tour 02 exposes CFA–CFN. CFA has different participants and standings between these tours. The accepted representation therefore distinguishes each actual group by its source context. For this sample, a useful qualified reference is `FFVB / 2026-2027 / LIIDF / QCF / tour 02 / CFA`; an ordinary national pool can use `FFVB / 2026-2027 / ABCCS / 3FA` without adding its matchday to the pool identity. Provider QCF is not the operator's business division.

A complete CFA CSV with the native blank round selection returned 45 matches, 15 with each `Jo` value 01, 02 and 03. These checked examples align with the contextual pages:

| Match  | CSV `Jo` | Participants from the complete CSV                     |
| ------ | -------- | ------------------------------------------------------ |
| CFA001 | 01       | LEVALLOIS SPORTING CLUB — SPORT CLUB UNIVERSITAIRE FCE |
| CFA016 | 02       | VC CHAMPS SUR MARNE — PARIS AMICALE CAMOU 2            |
| CFA031 | 03       | ANTONY VOLLEY — VALLEE DE CHEVREUSE VOLLEY-BALL        |

Here `Jo` represents the provider round. In PNF and N2 samples it represents an ordinary matchday. Do not universally create one pool per `Jo`, derive every pool from a match-code prefix, or conflate sporting classification with provider context.

Download a complete export once where its shape is qualified, then partition it into the contextual pools expected by F02. Full partition qualification must compare all attributed references and boundaries against the official round pages; three matching examples alone are not an exhaustive proof. If scope cannot be established, isolate that gap and prohibit absence reconciliation. A more narrowly scoped export is usable only when its actual form and coverage are established. General division-wide CSV aggregation remains outside the selected approach.

Discovery absence is evaluated against the complete expected catalog scope. CFO's absence from tour 02 does not establish its disappearance from tour 01 or the whole season. Failure to read one required catalog part is incomplete discovery, not confirmed absence.

### Default HTML can misattribute later-round participants

The [CFA page without a tour](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=LIIDF&poule=CFA) is not a qualified current-round selector:

| Page               | Observed CFA content                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| CFA without a tour | First-round standings: Vésinet, Massy, Levallois, SCUF, Saint-Cloud.                 |
| QCF tour 01        | The same first-round standings.                                                      |
| QCF tour 02        | A different table: Ermont, Camou 2, Cellois/Chesnay, Champs-sur-Marne, Créteil.      |
| QCF tour 03        | A future group composition, without a numeric ranking; do not manufacture standings. |

The default page also rendered `CFA016` as Levallois against SCUF. The explicit tour-02 page and complete CSV both rendered that reference as Champs-sur-Marne against Camou 2. The default HTML's later-round participant labels must not override the correctly contextualized calendar evidence.

No provider field or selected option declaring the current tour was found. Keeping distinct contextual pools and their own official standings avoids inventing a latest-tour selection rule. This is a source-context distinction, not a sporting progression engine. Failure or absence of a ranking remains independent of otherwise usable calendar facts.

## Federal club references and local team references

Preserve club numbers as strings, including leading zeroes. A known federal number identifies the same federal club across its observations; different seasonal team labels under that number do not alone establish a club conflict. Separate club identity, team identity and local participation references.

A current example in [PTRA69/CL1](https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=PTRA69&poule=CL1) has CHAVANAY and POMMIERS 1 using `0690000`. The public club-search form, submitted with `id_club=0690000`, returns **GSD 69 VOLLEY**. The [Rhône engagement table](https://www.ffvbbeach.org/ffvbapp/adressier/engag_division_aff.php?divisions=L%2FC&id_club=&wss_codent=PTRA69) repeats that federal reference at different team positions. No evidence established that the named teams were separate autonomous federal clubs. Represent the established federal structure with distinct teams; do not reject it, blacklist its number or demand manual reconciliation solely because several team names share it.

This corrects the earlier exploratory interpretation that the shared number was intrinsically ambiguous. A genuinely conflicting reference or a changed club number still requires the existing F02 verification path; it is not inferred from this example.

The public detail route was reached through `engag_division.php` → GET `engag_division_aff.php` → POST `rech_aff_club.php`, with `id_club` and the native search fields. Club records then link to `planning_club.php?cnclub=...`. Those planning pages also expose a club export, but they do not prove complete competition discovery or a permanent team identifier.

A team reference is contextual. For example, PARIS AMICALE CAMOU 1, federal reference `0757954`, appears in CFE with `equipe=3` in tour 02 and CFJ with `equipe=1` in tour 03; CAMOU 2 simultaneously denotes a different team. The named entity and applicable F02 classification context govern correspondence, not the local number alone. All inspected CL1 team forms contained only season, organizer, pool and local `equipe`; no additional independent engagement ID was found.

The [masters directory witness for 2022/2023](https://www.ffvbbeach.org/ffvbapp/adressier/cdf_master_list.php?eng_tri=LIGUE&wss_compet=JMA&wss_saison=2022%2F2023) supplied `id_club`, `id_compet` and `wss_saison` to its detail form, not a missing universal team key. Its inspection does not add masters or Cup coverage to V2.

## Empty responses, sporting notation and inherited witnesses

The following are retained from the earlier [F02 investigation](../../002-sporting-data/provider-evidence.md), not claimed as newly fetched examples in the 87-read count:

- A qualified empty FFVB calendar and a deliberately invalid pool parameter both returned the same header-only CSV with HTTP 200. Context and source-presence qualification are required before any empty-calendar consequence.
- A historical planning URL returned a different season. Request parameters cannot substitute for content attribution.
- BV5/HJM examples demonstrate reused pool context across rounds. Their exploratory division-export experiment does not authorize a general multi-pool strategy.
- SCBA010 and EFA056 published `3/F`, HJM010 published `F/F`, and IJM010 published `2/F`. Preserve supplied administrative marks and actually published values.
- A CSV `00:00` corresponded to an empty HTML time cell in the inspected SCB case. Do not invent a reliable midnight start or a fast-collection window from that value.

The [official WebSport manual](https://www.ffvbbeach.org/ffvbapp/websport/WEBSport_2019_documentation.pdf), page 12, documents `F` for forfeiture and `P` for penalty; page 15 explains reused pool/round context. This is older supplier documentation, not proof of every current interface. A `3/P` test example is **synthetic**: these investigations did not establish a fetched real match with that exact score. Do not invent its winner, sets or arithmetic meaning, or describe a synthetic fixture as an observed supplier incident.

No public JSON competition API was identified in the inspected HTML, inline scripts or form actions. Observed application data is exposed by server-rendered pages and CSV forms. This does not prove that no other supplier API exists. Previous FFVB samples supplied no usable ETag/Last-Modified validation and no demonstrated CSV gzip saving; neither benefit is assumed. Standard connection reuse and bounded supplier access remain implementation choices, not measured performance promises.

## Decisions derived from the evidence

| Need                                         | Selected simple approach                                                                                     | Simpler alternative considered                                      | Consequence                                                                | Required qualification                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Discover actual eligible references          | Follow published roots, organizer menus, options, frames and explicit round pages                            | Hard-code sampled pool codes                                        | Small explicit HTML adapters; newly published children remain discoverable | Extract correct current and historical references from each selected layout; reject partial/error catalogs without withdrawing data |
| Avoid annual classification guesses          | Manual classification for each season, independent of provider labels and keys                               | Copy prior classification by name or pool code                      | Operator preparation, with no inference engine                             | Show CPC/CPD and changed regional groupings cannot silently inherit a wrong division                                                |
| Minimize duplicate acquisition               | Reuse one complete CSV download for its qualified source scope and HTML already needed for standings/context | Download separately for each team, result or set                    | Less redundant traffic; full scope must be known                           | Demonstrate complete contextual partition without cross-pool or cross-round removals                                                |
| Preserve independent ordinary youth groups   | Contextual pool identity where a code is reused for distinct groups                                          | Treat the bare code as one pool or make every matchday a pool       | Separate pools/rankings; no progression model                              | Ordinary matchdays remain one pool; CFA rounds have their own participants and ranking scope                                        |
| Preserve federal clubs and distinguish teams | String federal references plus the accepted seasonal team context                                            | Treat each team label as a new club, or treat `equipe` as permanent | Shared federal structure is allowed; local positions never merge teams     | GSD 69 remains one established federal structure; Camou 1/2 remain distinct and a team's local position may change                  |
| Keep seasonal setup and repair bounded       | Auto-prepare published entries, allow correction before launch, lock launched entries in administration      | Guess future URLs or accept arbitrary active-source edits           | Child discovery continues; exceptional source repair is technical          | Wrong season cannot pass qualification; a URL change works only with a recognized parser and attributable content                   |

## Qualification still required

All implementation qualifications below are **NOT EXECUTED**. Public research establishes observations and test inputs, not acceptance of an implemented collector.

| Capability                       | Success criterion                                                                                                                      | Blocking condition                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| National and organizer discovery | Correctly extract covered references from frames/options and anchor menus, retaining exact codes and seasonal context                  | An unrecognized, incomplete or wrong-season catalog cannot establish absence                                                 |
| New-season preparation           | Create preparation only from an attributable supplier signal and retain missing entry coverage explicitly                              | An incremented year or one organizer's publication cannot certify all scopes                                                 |
| Historical reconstruction        | Report obtained, rejected and unavailable coverage for each requested season using its qualified entries                               | LILR 2025/2026 remains unqualified on the tested route; current content cannot fill the gap                                  |
| Contextual youth pools           | Match every transmitted group and its ranking to the official organizer/season/round/pool context                                      | A roundless HTML table or unverified `Jo` interpretation cannot redefine participants or pool identity                       |
| Complete CSV partition           | Compare all relevant references against the declared contextual scope; retain placeholders and local rejections in presence accounting | Sampled matches or an assumed prefix alone cannot authorize absence reconciliation                                           |
| Federal club/team identity       | Preserve leading zeroes, same-club team distinction, changed local positions and repeated match codes across seasons                   | Missing identity evidence must not become an invented club/team; shared valid federal numbers are not failures by themselves |
| Scores and absent fields         | Preserve F/P marks, distinguish unknown/invalid/cleared, and keep synthetic fixtures labeled                                           | No numeric substitution, guessed winner or fabricated reliable time                                                          |
| Catalog/empty lifecycle          | Separate failed discovery, partial integration, qualified current emptiness and historical preservation                                | HTTP 200, a header-only body or an incomplete child-page set cannot justify withdrawal                                       |

No complete federation-wide coverage, native/mobile behavior, deployed scheduling, supplier reliability, restoration or migration readiness was demonstrated by these reads.
