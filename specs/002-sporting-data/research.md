# Research: sporting identity and integration

**Authority**: [F02 specification](spec.md), [accepted F13 baseline](../003-shared-quality/research.md), [#43](https://github.com/blockoutproject/blockout/issues/43).

## Identity and professional coverage

**Decision**: Use contextual native LNV identities for professionals, without requiring a club. Keep optional controlled club association and existing navigation when present. FFVB supplies other covered competitions.

**Rationale**: Inspected official calendars expose championship/phase/match context and native team references. No dependable shared LNV/FFVB club identity was established. Names and logos are not identity evidence.

**Alternatives considered**: FFVB professional collection, cross-provider name matching and a new linking workflow would introduce another authority and maintenance burden. None is retained. Ordinary verified reference corrections remain possible without a generic reconciliation engine.

**Evidence**: Official [women's competition](https://www.lnv.fr/competitions/saforelle-volstar), [men's first division](https://www.lnv.fr/competitions/alterna-volstar), [men's second division](https://www.lnv.fr/competitions/volstar-masculine-2), and the [Data Project calendar](https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=135&PID=193). Native championship IDs do not encode a season; F01's qualified binding remains required. Server-rendered HTML was observed, not a promised stable API. No complete historical reconstruction was executed.

## Partial integration and stale observations

**Decision**: One bounded calendar submission, independent match transactions, then guarded absence finalization. Use backend cycle order plus a pre-read ordinal, per-match accepted order and current pool calendar order.

**Rationale**: This preserves F02's useful partial success and prevents older work from retracting or reviving newer data. A simple current-order marker replaces stored payloads, replay journals and checkpoint recovery. The logical cycle order is conservative across overlapping cycles and independent from arrival time.

**Alternatives considered**: Individual HTTP calls complicate proving calendar completeness; a whole-calendar SQL transaction loses valid matches on one local error; per-field late merging adds competing ages. All are rejected. The next ordinary collection is the recovery path.

**Bounds**: The selected 1,000-entry/8-MiB envelope is an initial transport safeguard, not a provider capacity claim. Inspected LNV phases included 156, 182 and 198 matches; the inspected FFVB youth export required qualified partitioning of 465 rows. The same 8-MiB JSON safeguard covers the other ingestion requests; catalog and standings have no extra item quota without a demonstrated domain bound. This is not proof of exhaustive supplier coverage: qualification must include complete source-season catalogs. Oversized input is refused, never truncated or automatically split into purportedly complete calendars.

## Score, sets and notifications

**Decision**: Latest valid logical observation wins across calendar/detail pages. Retain older already-accepted sets only while compatible, with their original freshness. Score and required F07 internal effects commit together; F08 publication uses the same match exclusion. Push follows commit.

**Rationale**: The [played-match detail](https://lnv-web.dataproject.com/MatchStatistics.aspx?mID=9796&ID=135&CID=316&PID=193&type=LegList) supplied aggregate and set scores, while the inspected calendar supplied aggregate scores. No dependable result-publication timestamp or documented page precedence was found. A later read may therefore carry older supplier content; this limitation was accepted. Generic live-menu flags are not proof of finality.

**Alternatives considered**: Fixed page priority and extra conflict-resolution reads were rejected in favor of one rule. Separate durable notification delivery would require recovery state; the owner instead accepted deferring a match when its internal notification write fails. Failed external push cannot invalidate a committed score.

**Documented mechanisms**: [JPA repository locking](https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html), [PostgreSQL 18 row locks and lock ordering](https://www.postgresql.org/docs/18/explicit-locking.html), and [Spring transaction-bound events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html). These establish supported mechanisms, not an executed proof of Blockout concurrency. Required inbox writes use an ordinary synchronous application call inside the transaction; only external push follows commit.

## Contract presence and generation

**Decision**: Optional properties omitted for no proposal, explicit null for qualified absence/removal, and values for usable candidates. Keep role-specific generated DTOs at HTTP boundaries and preserve presence before mapping.

**Rationale**: Per-scalar `{state,value}` wrappers are unnecessary. OpenAPI Generator 7.26.0's [Boot 4 template](https://github.com/OpenAPITools/openapi-generator/blob/v7.26.0/modules/openapi-generator/src/main/resources/JavaSpring/libraries/spring-boot/pom-sb4.mustache) and [RestClient template](https://github.com/OpenAPITools/openapi-generator/blob/v7.26.0/modules/openapi-generator/src/main/resources/Java/libraries/restclient/pom.mustache) use nullable support 0.2.12; its [tests](https://github.com/OpenAPITools/jackson-databind-nullable/blob/v0.2.12/src/test/java/org/openapitools/jackson/nullable/JsonNullableBasicTest.java) distinguish undefined and present-null with Jackson 2/3. The [RestClient adapter template](https://github.com/OpenAPITools/openapi-generator/blob/v7.26.0/modules/openapi-generator/src/main/resources/Java/libraries/restclient/ApiClient.mustache) registers the Jackson 3 module. Configure the backend mapper through supported Boot configuration and qualify real MVC binding; do not fork generated templates.

**Evidence limit**: Upstream source/tests were inspected, not executed. Complete Java/TypeScript generation, compilation, unknown-property handling, presence-aware mapping and real transport serialization remain implementation qualifications. No default value may silently turn an omitted observation into a supplied value.

The [OpenAPI 3.0.4 specification](https://spec.openapis.org/oas/v3.0.4.html#special-considerations-for-multipart-content) supports JSON metadata plus binary image parts. For club, team and division editors, one atomic multipart `PATCH` preserves atomic name/color/logo saving without staged media or a second write workflow. Its actual Spring/RestClient/Orval serialization remains a focused qualification, including PATCH parsing by the selected Servlet container, optional image and explicit null in the JSON part. Spring’s [multipart resolver documentation](https://docs.spring.io/spring-framework/docs/7.0.9/javadoc-api/org/springframework/web/multipart/support/StandardServletMultipartResolver.html) describes container-dependent parsing; it is supporting evidence, not qualification of the selected Boot runtime.

## HTTP resource semantics

**Decision**: Keep the existing resource URLs and operation IDs. Presentation changes with `keep/replace/automatic` logo instructions use atomic PATCH; names-only pool presentation, classification settings and activity use PUT for complete writable state. Division creation uses POST with a 201 Location; ingestion POST processes observations without exposing a stored observation/job resource. The catalog commits within one source-season scope, while calendar matches retain independent outcomes.

**Rationale and alternatives**: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) distinguishes replacement from resource-specific processing; [RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html) permits a defined atomic patch format. Requiring clients to upload an unchanged logo for PUT or introducing staged media would complicate the accepted single-save editor. Existing body revisions already guard relevant editing state; keep their 409 conflicts rather than introduce a second ETag/If-Match concurrency protocol. No-op writes cause no new state transition or revision. The JSON/multipart patch formats remain explicit contracts, not claims of JSON Patch or Merge Patch compliance.

**Evidence limit**: These are unshipped contracts, with no generated consumer to migrate. HTTP method/header validation is documentary; actual generated clients, multipart PATCH and server transaction behavior remain qualification work. F13 owns response cache policy and the limits of REST conformance.

## Logos and locality

**Decision**: Fetch LNV logos during existing calendar passages, using the published resource address once per distinct team in that passage. Prioritize manual team, accepted LNV, optional club, then missing artwork. Keep image bytes and association in PostgreSQL.

**Rationale**: An additional daily schedule and due-state would cost more mechanisms than the accepted repeated downloads. An inspected [team page](https://lnv-web.dataproject.com/CompetitionTeamDetails.aspx?ID=135&TeamID=702) published image URLs; an inspected JPEG-named/type-declared response actually held PNG bytes. Validate content rather than trusting extension. No original-resolution API or conditional-request support is presumed. Failed retrieval preserves the previous valid image independently of matches.

**Alternatives considered**: Extra scheduler, separate image storage synchronization and guessed source-image paths are rejected. Geocoding remains F01's provider responsibility; F02 only defines effective locality, context revision and admissible results.

## Supplier interpretation limits

FFVB CSV samples used CP1252, semicolon fields and request/HTML context for season/pool attribution. Club codes are strings, including leading zeros and alphanumeric territory codes. A shared youth export can be partitioned only using demonstrated published group/tour context; matchday or code prefixes are not universal rules. Recognized byes, special scores and absent time remain distinct from parse failure. The [FFVB WebSport manual](https://www.ffvbbeach.org/ffvbapp/websport/WEBSport_2019_documentation.pdf) is dated supporting evidence, not proof of every current page.

No raw provider archive or personal contact fixture is added. Observed samples do not prove exhaustive seasons, live-state semantics, all image formats or future HTML stability. F01 maintains adapters when a supported structure changes; F02 preserves accepted state on unusable observations.
