# Repository boundaries and provenance

## Authority

`blockoutproject/blockout` is the public, dedicated V2 repository with independent Git history.
It retains accepted product intent and design evidence while rebuilding backend, ingestion and mobile internals.
The constitution, accepted specifications and approved V2 architecture constrain subsequent feature plans.

The source foundation is [blockout-legacy at e31d3105421ae1130d574af191ecdd94cb7308ea](https://github.com/blockoutproject/blockout-legacy/tree/e31d3105421ae1130d574af191ecdd94cb7308ea).
The architecture was delivered through [legacy PR #306](https://github.com/blockoutproject/blockout-legacy/pull/306)
under [#305](https://github.com/blockoutproject/blockout-legacy/issues/305).
Design/specification acceptance retains the exact revisions and issue evidence documented in
[V2 planning boundaries](../architecture/v2-planning-boundaries.md).

Only tracked governance, skills, Spec Kit integration, specifications, checklists and documentation
are carried over. Installed skills, the constitution and official Spec Kit assets are preserved
byte-for-byte; local feature-selection state is excluded. Existing specification language is retained
to avoid translating or changing accepted requirements during a repository split.
Historical issue/PR links explicitly identify `blockout-legacy`. The new repository
uses the `blockout` name; URLs under that name now identify this repository, not the
legacy repository. Do not rely on the original rename redirect for historical evidence. Historical source links pin the
foundation revision above, rather than following a changing branch. Original discovery observations
retain their own earlier baseline and limits; pinning a later file does not requalify the observation.

## Production boundary

The owner clarified on 2026-10-04 that the previous monorepo is **not deployed**.
Running V1 instances originate from independent repositories. Renaming the monorepo is not a
production cutover and does not establish those repositories' deployed revisions or configuration.
Neither repository foundation authorizes reading independent/archived repositories, changing
production, migrating data, or mutating Auth0, RevenueCat, AWS or Hostinger/Dokploy resources.

V1 continuity and protection of identities, valid rights, club identities and actual logo files
remain requirements. The [transition architecture](../architecture/v1-v2-transition-architecture.md)
requires qualification against actual authorized snapshots and deployed dependencies.

The legacy repository keeps its history and existing issue/PR evidence. New V2 work uses this
repository's issues and PRs; historical phase gates remain explicitly linked until separately
reorganized. No issue number is silently treated as the same issue across repositories.

## Clean target tree

[V2 planning boundaries](../architecture/v2-planning-boundaries.md) define future code locations:
`apps/<application>`, `libs/backend/<owner>`, `libs/mobile/<feature>`,
`libs/contracts/specs/source` and `infra/`. The dedicated repository removes the redundant `v2`
path segment. These locations are not instructions to create empty applications or library layers.
V2 contract source starts from approved V2 plans, not a copy of V1 wire schemas.

The historical contract pipeline and V1 architecture documents remain discovery evidence.
Their commands, paths and service structure are not executable authority here.
No V1 `package.json`, lockfile, `nx.json`, Maven/Python manifest, application source, generated
output, production workflow, secret or local runtime state is imported.

## Delivery boundary

After documentation-only planning, the branch model is topic branch to `develop`, then `develop`
to `main`, with explicit human merge authorization, merge commits and automatic deletion of
merged topic branches. The owner-approved temporary initialization exception is defined below.
Both branches prohibit force pushes and deletion and enforce protections for administrators.
`main` requires the up-to-date `verify` check, conversation resolution and dismissal of stale
reviews; its required approval count remains zero. `develop` retains the legacy protection settings
without adding a new approval-count or required-check policy during this split.

### Planning-only initialization history

The owner explicitly requires one evolving root initialization commit during documentation-only
planning. Amend that commit and publish the same revision to `develop` and `main`; do not add a
second commit or a merge commit for each plan iteration. Commit identifiers change after amendments.
This exception replaces the ordinary topic-branch/PR publication process only for this phase.

Before each rewrite, verify a clean working tree, inspect every remote branch and preserve a
recoverable local bundle outside the repository. Use an atomic push with explicit
`--force-with-lease=<ref>:<observed-sha>` expectations for both branches. Never overwrite an
unexpected remote change or another contributor's work. Read and save the current protections,
adapt only the settings needed for the publication, and restore them immediately in a cleanup
step even when the push fails. Force pushes must remain prohibited outside these bounded windows.
Verify both remote revisions and the restored settings, then inspect CI on the published revision.

This policy covers specifications, architecture, plans and associated governance. It does not
authorize runtime implementation, project dependency installation, executable workspace/application
generation, production operations or provider mutations. The first executable workspace/build/runtime
change ends this exception: freeze the initialization commit, keep the normal protections and
resume separate issue-owned implementation commits and draft PRs. Do not amend the root after
implementation starts.

Official Spec Kit procedures, specification/design authority, issue ownership and appropriate
validation still apply. Keep installed upstream skills and the constitution unchanged. A single
commit is a history policy, not acceptance of unfinished plans or permission to skip phase gates.
Decision and approval evidence remain in GitHub issues; do not turn repository Markdown into a
parallel delivery log.

### Verification and integrations

The new documentation-only CI checks formatting and enforces the same-repository `develop`
promotion source. It has read-only permissions and no deployment jobs. Pinned Prettier is a
bootstrap documentation tool, not a selected application dependency. Runtime task verification,
locked dependencies and build cache policy belong to the Nx foundation plan; the `verify` job
must expand with those boundaries before runtime code is delivered.

A public application repository does not satisfy F10 private support intake. The future support
adapter must use its separately configured private issue destination and authorized attachments.
Do not submit user diagnostics or private attachments to this public repository.
