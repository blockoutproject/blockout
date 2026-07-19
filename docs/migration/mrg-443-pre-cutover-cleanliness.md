# MRG-443 Pre-Cutover Cleanliness Boundary

## Purpose

MRG-443 defines what the repository must look like before Phase MRG-900 and adds the missing scraper refactoring and
final cleanliness gates to the future roadmap. It changes documentation only. It does not change runtime code,
contracts, generated sources, schemas, deployment, broker state, or production behavior.

The target is a simple Maaatch-shaped monorepo whose feature boundaries remain recognizable to maintainers of the
former Blockout repositories. The migration may replace weak internals, copied transport objects, and large
aggregators, but it must not hide product behavior behind a new generic framework or an unnecessary abstraction.

## Clean Canonical Core

Before Phase MRG-900, every migrated path must have one readable canonical implementation with these ownership rules:

- generated request, response, client, and event models remain inside the adapter that owns the wire boundary;
- application code uses role-specific commands, queries, views, snapshots, decisions, and plans only when the role is
  real; a field-for-field transport mirror is not an application model;
- generic `*Dto`, copied downstream responses, and version-suffixed transport names do not appear in application or
  domain APIs;
- persistence entities, search documents, cache snapshots, provider models, and form state remain owned by their
  respective boundaries;
- the BFF maps generated downstream clients immediately to workflow-owned inputs and views, performs explicit
  orchestration or projection, and maps once to its generated public contract;
- the mobile application maps Orval-generated transport types to feature view or form models and keeps handwritten
  Zod schemas and transforms at the feature boundary; and
- Python scrapers keep generated Blockout clients in outbound adapters and keep provider parsing, scheduling,
  configuration, and application policy in plainly named local modules.

The same concept should have the same role and naming pattern across deployables. Similar structure does not require a
shared base class, generic repository, generic service, generic mapper, or shared Docker abstraction. Shared code is
introduced only after two concrete consumers prove that the extracted behavior and lifecycle are identical.

## Compatibility Shell

Pre-cutover cleanliness does not authorize production retirement. Existing REST and event coexistence routes remain
governed by MRG-304. Until their external observation and cutover gates close, generated or handwritten transport
names containing `V1` or `V2` may remain only in:

- generated contract output;
- inbound or outbound API adapters;
- event producer or consumer adapters; and
- explicitly documented compatibility configuration or tests for those boundaries.

They must not leak into application services, domain policies, persistence models, search projection logic, mobile
feature models, or scraper application code. Every remaining version-suffixed handwritten type is inventoried by the
final Phase MRG-800 gate with its owning MRG-304 retirement condition. This yields a clean canonical core and an
explicit compatibility shell, not a repository that is permanently half migrated.

Removing that shell requires production evidence and authority outside this pre-MRG-900 goal. MRG-443 does not modify,
prepare, authorize, or execute Phase MRG-900 or MRG-1000 work.

## Scraper Refactoring Sequence

Existing scraper behavior must be captured before structural rewriting because the scrapers currently rely on working
integration behavior rather than broad unit coverage. The future Phase MRG-600 order is therefore:

1. inventory both scrapers, their schedules, sessions, authentication, provider calls, Blockout calls, errors, and
   concurrency;
2. align the already adopted root uv workspace and Nx projects with the simple `apps` and `libs/shared` ownership
   model, without another orchestration layer;
3. add offline characterization fixtures for provider inputs, mapped application values, Blockout adapter requests,
   scheduling decisions, retry/error behavior, and deterministic outputs;
4. refactor the club scraper as one bounded slice while preserving its entry point and observable behavior;
5. refactor the competition scraper as a separate bounded slice, including its local data-source priority policy;
6. delete replaced modules and duplication only after fixture parity, then align both scraper structures without
   forcing provider-specific behavior into a generic abstraction;
7. pin and audit dependencies after the retained imports and runtime needs are known; and
8. build and smoke the final production-shaped images with the same commands, environment contract, schedules, and
   offline startup behavior.

Each refactor compares old and new fixture results at stable seams. Tests cover parsing, normalization, mapping,
request construction, state transitions, ordering, missing data, errors, and concurrency decisions where applicable.
Live provider or production calls are not used as the primary regression oracle.

## Final Pre-Cutover Gate

MRG-807 is the final Phase MRG-800 cleanliness audit. It runs after backend, mobile, scraper, local-runtime, and CI
tasks. It must prove:

- no generated model or version-suffixed transport type crosses into a canonical application or domain API;
- no copied transport DTO, generic client service, obsolete migration helper, dead adapter, or superseded scraper
  module remains outside an open compatibility gate;
- BFF workflows, frontend features, and scrapers have one clear mapping path and role-based names;
- every handwritten `V1` or `V2` occurrence in executable source is either removed or mapped to an explicit MRG-304
  compatibility owner; and
- every incomplete implementation below Phase MRG-900 is either completed or split into an atomic roadmap task before
  the gate can pass.

MRG-807 is an audit and acceptance gate, not permission for a cross-service cleanup commit. A discovered fix remains
atomic and follows the owning phase and MRG-401 slice rule. The pre-cutover goal stops successfully only after that gate
and every other authorized task below Phase MRG-900 are complete.

## Validation And Rollback

MRG-443 is validated through documentation links and formatting, the Maaatch structural comparison, the complete
local shadow-CI verifier, generated-output ownership, and Git whitespace checks. Rollback is this single documentation
commit. No runtime or production rollback exists.
