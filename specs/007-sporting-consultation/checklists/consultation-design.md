# Consultation requirements and interfaces checklist: F03

**Purpose**: Deep author and peer review before technical dossier acceptance, focused on lifecycle, public contracts, native documents and owner boundaries.
**Created**: 2026-10-09
**Feature**: [F03](../spec.md), [technical plan](../plan.md)

**Note**: Generated through `$speckit-checklist`.
**Review Ownership**: Reviewer-owned requirements-quality criteria.
**Marker Semantics**: `[x]` means the reviewer found the written criterion satisfied; it does not mean runtime implementation or tests passed.

## Requirement completeness

- [x] CHK001 Are all eleven read responsibilities distinguished from personal following, contributions and mutations? [Completeness, Spec FR-001–008, FR-035; contracts/consumers.md]
- [x] CHK002 Are common page information and independently readable tabs explicitly separated, including the club Information exception? [Clarity, Spec FR-018; contracts/read-semantics.md]
- [x] CHK003 Are published future, closed, missing and temporarily unreadable seasons covered without inferring season order from match dates? [Coverage, Spec FR-007, A04]
- [x] CHK004 Are unknown, absent, invalidated and restricted source values distinguished without forbidden fallbacks? [Completeness, Spec FR-006, FR-031, FR-033]
- [x] CHK005 Are information sheet, scoresheet, professional media and official calendar ownership and eligibility distinct? [Completeness, Spec FR-025–028; contracts/consumers.md]

## Calendar and time clarity

- [x] CHK006 Is the whole-day page unit quantified, with deterministic day, pool and tie ordering and no hidden match cap? [Clarity, Spec FR-016–017; data-model.md]
- [x] CHK007 Are continuation scope, empty dates, duplicate identities and concurrent movement limits explicit? [Coverage, Spec A16–A17; data-model.md]
- [x] CHK008 Are initial opening, retained back navigation, focus, foreground, reconnect and explicit refresh distinguished? [Clarity, Spec FR-018, FR-030]
- [x] CHK009 Is refresh replacement specified only after a valid first page, including previous-generation responses and failure retention? [Coverage, Spec A17, A29]
- [x] CHK010 Is the accepted timezone exception consistent across converted times, retained groups, continuation and the next refresh? [Consistency, Spec FR-009, A08, SC-002]
- [x] CHK011 Are definitive-result priority, the exact six-hour boundary and date-only Paris midnight independently measurable? [Measurability, Spec FR-012, A11–A14]
- [x] CHK012 Is automatic calendar reclassification explicitly excluded while match-detail rereads remain required? [Consistency, Spec FR-012, FR-014, FR-030]

## Interfaces and security consistency

- [x] CHK013 Are strict request validation, additive responses and conditional absence/null rules specified together? [Completeness, contracts/read-semantics.md; Spec FR-006]
- [x] CHK014 Are visibility checks and known-restriction removal authoritative even for retained pages and old identifiers? [Consistency, Spec FR-008, FR-011, FR-015, FR-031]
- [x] CHK015 Are public consultation, maintenance admission, personal actions and advertising entitlement kept distinct? [Consistency, Spec FR-031–032, FR-035]
- [x] CHK016 Are response freshness, supplier observation and integration times clearly distinguished? [Clarity, Spec FR-021, FR-030]
- [x] CHK017 Are binary success and typed errors distinguished without interpreting an HTTP200 HTML body as a document? [Coverage, Spec FR-028; contracts/read-semantics.md]
- [x] CHK018 Are supplier destinations, credential isolation, cancellation, temporary-file lifetime and cleanup requirements explicit? [Completeness, Spec FR-028, FR-033; contracts/mobile-and-design.md]

## Scenario and acceptance quality

- [x] CHK019 Are ranking absence, failure and unmatched rows distinguished without recalculating official ranks or missing statistics? [Coverage, Spec FR-020–021, A18–A19]
- [x] CHK020 Are no participants, no reliable points, partial coverage and basemap failure separately described? [Clarity, Spec FR-022–024, A20–A22]
- [x] CHK021 Are document expiry and unknown failure distinguished only when evidence supports that diagnosis? [Consistency, Spec FR-028, A26]
- [x] CHK022 Are both native reader outcomes described without treating successful handoff as proof of reading? [Measurability, Spec SC-006; contracts/mobile-and-design.md]
- [x] CHK023 Are retry, return, large text, screen-reader meaning and non-color cues covered for partial/error states? [Completeness, Spec FR-029, FR-034, A32]
- [x] CHK024 Are the 36 requirements, 34 scenarios and eight success criteria traceable to planned evidence and tasks? [Traceability, Spec FR-036; quickstart.md]

## Dependencies and evidence limits

- [x] CHK025 Are targeted F01/F02 model additions assigned to their owners instead of a second sporting store? [Consistency, contracts/consumers.md; Spec assumptions]
- [x] CHK026 Are real F06/F08/F10/F12 integration prerequisites distinguished from isolated test doubles? [Dependency, Spec FR-035; contracts/consumers.md]
- [x] CHK027 Are accepted lifecycle amendments reconciled with exact approved design references and remaining native proof? [Coverage, Spec FR-036; contracts/mobile-and-design.md]
- [x] CHK028 Are bounded provider observations, documentary validation and future native/runtime qualification reported with distinct scopes? [Measurability, Spec SC-008; research.md; quickstart.md]

## Notes

The reviewer-approved conclusions for CHK001–CHK028 are recorded in [#23](https://github.com/blockoutproject/blockout/issues/23). These markers validate requirements quality only; implementation tasks and historical checklist markers retain their separate lifecycle. `$speckit-implement` reads these markers but does not change them. The built-in `requirements.md` lifecycle remains separate. See [planned validation](../quickstart.md) for future implementation tests.
