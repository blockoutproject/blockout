# Blockout

The dedicated repository for the complete Blockout iOS/Android, backend and acquisition rebuild.

Start with the [documentation index](docs/README.md), [accepted specifications](specs/),
[constitution](.specify/memory/constitution.md) and [target architecture](docs/architecture/architecture-v2.md).
[Agent guidance](AGENTS.md) routes the installed skills and official Spec Kit procedures.

This repository starts with an independent history and the accepted product/design/architecture foundation.
It contains no V1 runtime code, inherited build manifests or deployment credentials.
The [repository boundaries](docs/engineering/repository-boundaries.md) describe the source provenance,
future code locations and the distinction between historical code and running production.

During documentation-only planning, changes amend one root initialization commit, published to
aligned `develop` and `main` branches under the [planning exception](docs/engineering/repository-boundaries.md#planning-only-initialization-history).
Once implementation starts, changes use an owning GitHub issue and a `feature/<issue>-<slug>`,
`bugfix/<issue>-<slug>` or `tech/<issue>-<slug>` branch, delivered as a draft PR to `develop`.
Promotion goes from `develop` to `main`. Merges require an explicit human request and use merge commits.

Nx initialization is a separate planned change. Do not copy the legacy workspace configuration
or infer V2 runtime choices from the installed platform skills.
