# Blockout REST Endpoint Policy

> Migration status: this is the target architecture inherited from Maaatch. Apply it incrementally through `docs/current/blockout-active-roadmap.md`; do not bulk-refactor imported production code or assume missing generated-contract infrastructure already exists.

Read this reference before adding or changing a BFF endpoint, internal endpoint, OpenAPI path, `operationId`,
request/response DTO, or generated client call.

## Standard

- URLs name resources, not actions.
- Product APIs do not expose a generic `action` + `data` bus.
- Official, auditable, generated, or sensitive decisions create addressable resources: records, runs, executions,
  corrections, assignments, publications.
- BFF and internal APIs follow the same REST grammar, error model, idempotency model, and contract-first workflow.
- BFF and internal APIs may use different DTOs.
- A path name found outside current V1 sources does not justify a V1 endpoint.

## Decision

1. Read a resource: `GET /resources/{resourceId}`.
2. Read a collection: `GET /resources`; use `*ListResponse` only for complete bounded lists and add pagination
   with `*PageResponse` if it can grow.
3. Create a mutable resource: `POST /resources`, response `201`.
4. Modify a mutable resource: `PATCH /resources/{resourceId}` with expected revision when needed.
5. Create an official decision or sensitive result: `POST` on the collection of the produced resource.
6. Calculate a non-persisted preview: `GET` if inputs fit naturally in query parameters; otherwise `POST /.../previews`.
7. If no clear resource exists, stop and model the resource before the contract.

Forbidden: `/do-*`, `/execute-*`, `/process-*`, `/commands`, state verbs in the path, `PATCH` with `{ "action": ... }`.

## Grammar

- Use lowercase kebab-case segments.
- Use plural nouns: `/competitions`, `/stages`, `/fixtures`, `/result-records`.
- Use `{resourceNameId}` variables: `{competitionId}`, `{stageId}`, `{fixtureId}`.
- Nest only for real ownership, authorization, or scope.
- Keep `competitionId` in sporting-core write paths unless there is a strong reason not to.
- Every path parent must enforce a concrete constraint.

Good examples:

```http
POST /competitions/{competitionId}/fixture-generation-runs
POST /competitions/{competitionId}/fixtures/{fixtureId}/result-records
POST /competitions/{competitionId}/standing-definitions/{standingDefinitionId}/standing-records
POST /competitions/{competitionId}/stage-transitions/{transitionId}/executions
POST /competitions/{competitionId}/publication-records
POST /competitions/{competitionId}/stage-transitions/{transitionId}/previews
```

## Methods And Responses

| Method   | Use for                                                  | Avoid for                                  |
| -------- | -------------------------------------------------------- | ------------------------------------------ |
| `GET`    | reads                                                    | mutations, commands, complex previews      |
| `POST`   | creations, records, runs, executions, previews with body | generic dispatch                           |
| `PATCH`  | partial mutation of a mutable resource                   | official records, publication, transitions |
| `PUT`    | explicit full replacement                                | default update                             |
| `DELETE` | rare deletion of mutable drafts                          | auditable concepts                         |

- `200`: read or command returning a current projection.
- `201`: created resource, record, run, execution, publication, or assignment.
- `202`: true asynchronous work.
- `204`: intentionally empty body.
- Complete bounded collections use a `*ListResponse` wrapper with `items` only.
- Volumetric collections use a `*PageResponse` paginated wrapper with `items` + `pageInfo`.
- Response DTOs are projections; do not reuse command request DTOs.

## Errors

Every endpoint declares expected errors in OpenAPI. Bodies are `ProblemDetail`-compatible and carry a stable `code`.

- `400`: invalid shape.
- `401`: missing or invalid authentication.
- `403`: missing platform scope or resource permission.
- `404`: missing or intentionally hidden resource.
- `409`: duplicate, stale revision, incompatible retry, or state conflict.
- `422`: business violation with valid shape, only when the service distinguishes it.
- `503`: technical dependency unavailable.

## Command Resources

Use a command resource when the decision is idempotent, auditable, generated, official, or correction-sensitive.

Examples: `FixtureGenerationRun`, `FixtureSeatAssignmentRecord`, `FixtureResultRecord`, `StandingRecord`,
`StageTransitionExecution`, `StageEntryPlacementRecord`, `CompetitionPublicationRecord`, `CommandExecutionRecord`.

Sensitive commands include a `commandId`, useful expected revisions, and, when needed, an audit reason or note. The
client reuses the same `commandId` for retries. The backend enforces idempotency, request hash, stable retry responses,
and `409` for incompatible retries. The backend builds snapshots; the client does not provide trusted audit snapshots.

## BFF And Internal

- The BFF optimizes product workflows, UI projections, normalized errors, and session context.
- Internal services optimize ownership, execution, revisions, and technical fields.
- A BFF write calls the owning service. It does not reimplement the domain decision.

## V1 Vocabulary

Prefer `competition`, `activityKey`, `stage`, `stage-round`, `stage-entry`, `stage-group`, `fixture`, `fixture-seat`,
`fixture-generation-run`, `result-record`, `standing-definition`, `standing-record`, `stage-transition`,
`transition-execution`, and `publication-record`. Do not expose future capabilities until behavior is implemented,
tested, and activable.

## Completion Check

- Valid V1 source identified.
- Path names a resource, not an action.
- BFF and internal DTOs are intentional.
- Success, errors, security, and idempotency are explicit.
- Contract-first generation and impacted codegen were run or intentionally skipped with reason.
