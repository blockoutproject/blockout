# F12 consumer contracts and dependency seams

## In-process interfaces

| Interface / owner                                              | Consumers                                                       | Contract                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current account and action/resource authorization / `accounts` | Configuration, sport, acquisition, contributions, root security | Current usable business UUID and grant decision; resource invariants stay with the domain. No repository access across modules.                      |
| Maintenance read / `configuration`                             | Root HTTP admission and F07 push owner                          | Current immutable maintenance value/revision or explicit unavailability; no cached permissive substitute, no account dependency for the read itself. |
| Public snapshot / `configuration`                              | Public HTTP endpoint                                            | Coherent read of both resources; no permission projection or account identity.                                                                       |
| Configuration mutation / `configuration`                       | Authorized HTTP commands                                        | Current account permission and expected revision; only its resource changes in a short SQL transaction.                                              |

The composition root depends on accounts and configuration. Configuration may invoke accounts authorization. Accounts has no configuration dependency. Validate the intended module graph with Spring Modulith rather than introducing a local event bus, internal HTTP service or cross-module repository.

## Existing implementation-plan prerequisites

All IDs below are qualified by their feature directory; they describe future implementation dependencies, not completed runtime work.

| Owner   | Existing tasks / contract                                                                               | F12 integration                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F13     | [003-shared-quality/tasks.md](../../003-shared-quality/tasks.md), T013–T014, T023–T025, T040–T046       | Validated generated responses, safe errors, retry selection, private session isolation and native/UI evidence. `MAINTENANCE_ACTIVE` must be classified before generic 503 retry.                                       |
| F05     | [005-accounts-identity/tasks.md](../../005-accounts-identity/tasks.md), T004/T006–T008                  | Reuse current account and JWT boundary; extend actual new-account transaction with three ordinary grants. Never bootstrap grants on GET/login for an existing account.                                                 |
| F05     | T020, T027–T029, T033/T035 in the same dossier                                                          | Private capabilities/bypass clear with session generation. Erasure acceptance removes grants in accounts' own local transaction coordinated by `AccountErasureCoordinator`; fresh UUID gets no privileged restoration. |
| F01     | [001-source-acquisition/tasks.md](../../001-source-acquisition/tasks.md), T009/T013–T014/T036/T038/T052 | Bind current grants to season/source/control interfaces and final mutation checks. Maintenance never changes pause, next run, cycle or closure state.                                                                  |
| F01/F14 | F01 T044/T047                                                                                           | Protected reconstruction retains its technical authority; no mobile wildcard or new reconstruction permission is inferred from this catalogue.                                                                         |
| F02     | [002-sporting-data/tasks.md](../../002-sporting-data/tasks.md), T004/T007/T017–T018                     | Existing permission ports retain resource scope, collision and transaction conditions. Global grants do not mean arbitrary target eligibility.                                                                         |
| F02     | T038–T039/T041–T042/T046 in the same dossier                                                            | Presentation/logo commands recheck permission and revision after external upload before association. Preserve previous resource on final refusal. F12 composes navigation, not sport forms.                            |

The F12 tasks extend these actual owners. Do not create an alternative account bootstrap, cleanup coordinator, sport mutation or acquisition control implementation to make an isolated F12 demonstration pass.

## F07 push integration

[F07 FR-024–FR-026 and A26–A28](../../011-notifications-delivery/spec.md) owns the sending point; no F07 technical task IDs exist yet. Immediately before the ordinary provider attempt, the F07 sending use case directly reads maintenance through configuration's interface, outside any provider-containing SQL transaction. Active or unestablishable state means no new attempt, including operator recipients. Do not create delayed push work for that skipped attempt.

Inbox insertion and ordinary purge continue; reopening neither restores purged entries nor replays skipped pushes. New events use F07's current follows/relevance/permissions and ordinary best-effort handling. A message already handed off cannot be reliably recalled. Opening it still uses current mobile blocking. A controlled F12 consumer qualifies the read/error contract only; integration completion requires the actual F07 sending and retention paths. F02's sporting-fact coordination does not substitute for that boundary.

## Remaining domain and transition owners

F08 owns contribution age/ownership/visibility/quotas and permission combinations; F12 supplies grants only. F09 owns RevenueCat console operations and provider callbacks, F10 complete support receipt, F11 versioned legal publication/privacy, and F14 real store identifiers, client compatibility and V1 retirement. Useful legal/support/operator sign-in remains accessible during all block states, subject to actual provider availability.

F14 must qualify both stores before ordinary V1 retirement; F12 minimum configuration does not execute retirement, migrate data, prove contract compatibility or authorize changing providers. The transition welcome cannot open access around F12's gate.

## Contract adoption

[configuration.openapi.yaml](configuration.openapi.yaml) is a documentary source for future `contracts/public/configuration/`. Its Problem reference reuses the existing documentary F05 projection of F13 rather than adding a second competing shape. At runtime adoption, rewrite that reference to F13's single shared source and bundle through its actual configured root. Keep generated Java interfaces/DTOs and TypeScript clients out of Git. Generate, validate and compile both real consumers; no new Python consumer is justified.

Configuration and capability responses, including configuration errors, send `Cache-Control: no-store`. No HTTP or persistent mobile cache establishes startup access; complete verification is required in each process. Response objects allow unknown fields under F13, but consumed required fields/nullability, safe revisions and semantic limits must be validated before cache installation. Requests reject unknown editable fields to expose mistakes; additive response compatibility does not mean accepting arbitrary mutation fields.

The typed `MaintenanceProblem` schema is the reusable 503 extension for ordinary endpoints governed by admission. Their owning future OpenAPI sources must reference it when adopted; the seven configuration/capability operations themselves are maintenance-exempt and do not return that business refusal. Generic configuration unavailability remains a safe F13 Problem with `CONFIGURATION_UNAVAILABLE`.
