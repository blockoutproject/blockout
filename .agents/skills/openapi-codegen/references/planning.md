# Contract ownership and planning

## Establish the shared boundary

Start from accepted user outcomes and any applicable approved technical decisions. When the stack or architecture is undecided, resolve it within the project’s technical-planning workflow together with the contract requirements; an architecture document is not a prerequisite. Inspect existing routes, contract sources and related plans before proposing another endpoint or model. Identify the provider, consumers, semantic owner and compatibility obligations of each affected interface. Reuse an operation only when it expresses the same behavior and access policy; similar names do not establish shared meaning.

An API follows an actual provider/consumer boundary. A feature plan, repository, programming language or module does not automatically require a separate API, service or deployment. Several plans may contribute to one API; one plan may affect several APIs. Keep domain objects owned by their domain and share technical primitives only where their meaning is identical. Coordinate changes to an existing route at its owner and reconcile affected plans before dependent implementation proceeds.

In a Spec Kit project, use the installed official planning procedure to make these decisions and produce its artifacts; this skill adds contract expertise, not a separate planning phase. Feature contract artifacts describe the proposed interface change and reference the authoritative source and agreed revision. They do not create a second editable definition. Record concrete ownership and affected consumers in the existing plan or contract documentation, not a separate registry unless the project needs one. Keep issue sequencing and acceptance in the tracker.

## Choose one source and a reproducible pipeline

Agree where canonical contract sources live independently of feature-plan numbering. Choose an authoring representation deliberately: OpenAPI YAML/JSON with references is a direct option; a schema language that emits OpenAPI needs a demonstrated benefit and a supported export path. Neither persistence entities nor generated DTOs become the authoring source by accident.

Describe the actual dependency chain: authored definitions, any required export/assembly, validation, then generation of server interfaces, transport DTOs, frontend and interservice clients or validators for active consumers. Each derived stage has one upstream authority. Introduce only stages that serve a concrete need; prefer supported tool configuration over a handwritten assembler, template fork or duplicate mapping catalogue.

Define composition behavior for references, schema names, operationIds, security and reusable error responses. Resolve collisions by meaning and ownership instead of silently renaming components. Provider and consumer generation use the same agreed contract revision. Cross-repository consumers pin a published artifact or a read-only copy with an exact source revision; updates remain deliberate.

Distinguish the OpenAPI specification version, the API compatibility version and the product release. Public/internal exposure alone does not select a version number or URL convention. Record the selected policy and rollout consequences in their owning plan and contract artifacts; reference existing project-wide constraints where applicable.

## Keep operation design proportionate

Consider request granularity from actual callers. For repeated ingestion or writes, compare a bounded bulk operation with ordinary individual operations. If bulk is selected, define the item/byte bounds, atomic or partial-success behavior, item identification, duplicate handling and what a caller can safely do after an uncertain response. Do not invent a universal batch/job framework, automatic retries or HTTP bulk solely to optimize SQL; database batching is a separate implementation decision.

Agree the shared error format during technical planning, preserving accepted contracts. If Problem Details is selected, use one shared profile with focused reusable responses and genuine domain extensions. Map failures to ordinary existing feedback where it satisfies the accepted journey. An error code does not require its own screen, recovery workflow or persisted state machine. If a required experience drives disproportionate machinery, present the simpler behavior and its user-visible limitation for a product decision before changing the specification. Do not automatically create a future roadmap item for a rejected mechanism.

## Qualify the design before depending on it

Evaluate the selected schema dialect and generators together. Check official documentation for intended versions, then use a small representative fixture when support is uncertain: request constraints, reusable errors, enums, dates, absence/null and any needed composition. Generate the actual selected server/client targets and compile or import them; exercise serialization and validation at the affected boundaries.

Prefer a simpler supported contract shape when it preserves the required semantics. Missing generator support is an unresolved design decision, not permission to patch generated output or weaken validation. Distinguish planned checks, a limited fixture and verified application behavior. Planning does not authorize dependency installation or production scaffolding by itself; obtain the appropriate experiment scope or leave adoption explicitly blocked by the missing evidence.

Plan the provider/consumer checks and compatibility review as part of the same contract change. A later feature reopens only the shared decisions it affects, with the existing owner and consumers. It must not independently redefine the API or defer a known cross-plan conflict to a final global audit.

References: [Spec Kit contract-driven development](https://github.com/github/spec-kit/blob/main/docs/guides/contract-driven-development.md), [OpenAPI specification](https://spec.openapis.org/oas/latest.html), [Problem Details, RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html). These describe supported standards and workflows; project choices still require their own rationale and evidence.
