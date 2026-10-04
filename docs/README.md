# Documentation

Blockout V2 is a complete rebuild of the backend, ingestion and mobile application, including mobile internals.
V1 source, tests, contracts and architecture documents record historical behavior and transition dependencies;
they are not the V2 target or a default architecture to preserve. Technical reuse requires justification from
accepted V2 requirements and approved plans. Accepted functional semantics, design evidence and explicit continuity
constraints remain binding under the [constitution](../.specify/memory/constitution.md).

- [Product vision](product/vision.md)
- [V1 functional inventory](product/v1-functional-inventory.md)
- [Identity and Pro continuity](product/identity-and-pro-continuity.md)
- [V2 functional specification perimeters](product/specification-perimeters.md)
- [Source acquisition and observation reliability specification](../specs/001-source-acquisition/spec.md)
- [Sporting data identity and lifecycle specification](../specs/002-sporting-data/spec.md)
- [Shared quality and operations specification](../specs/003-shared-quality/spec.md)
- [V2 target architecture and technical decisions](architecture/architecture-v2.md)
- [V2 domain ownership and invariants](architecture/blockout-domain-model-v2.md)
- [V1/V2 transition and club/logo migration architecture](architecture/v1-v2-transition-architecture.md)
- [V2 feature-planning boundaries and qualification gates](architecture/v2-planning-boundaries.md)
- [Historical V1 domain model and specification-owned V2 semantic references](architecture/blockout-domain-model-v1.md)
- [Historical mobile and identity architecture V1](architecture/mobile-and-identity-architecture-v1.md)
- [Historical V1 contract pipeline](engineering/contract-pipeline.md)
- [Repository boundaries and source provenance](engineering/repository-boundaries.md)

Accepted feature specifications live under [`specs/`](../specs/). Technical plans and tasks are derived per feature through the
official Spec Kit workflow and are not part of the repository foundation.
Future bounded delivery issues are created in [this repository](https://github.com/blockoutproject/blockout/issues); historical phase gates and acceptance evidence retain their original identities.
The [V2 roadmap](https://github.com/blockoutproject/blockout-legacy/issues/245) schedules architecture decisions after
acceptance of the complete specifications and global functional/design reviews. Architecture child issues under
[#248](https://github.com/blockoutproject/blockout-legacy/issues/248) are created after that gate, before implementation tasks.
