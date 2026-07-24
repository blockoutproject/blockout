# GitHub Governance Taxonomy

Read this reference when assigning a Roadmap Track, choosing an issue identifier, applying labels, validating
`Workset.Areas`, or provisioning the Blockout GitHub taxonomy.

This taxonomy is the active vocabulary for Blockout issues, pull requests, Worksets, and Roadmap fields.

## Tracks

Track describes the primary outcome stream, not every repository area touched by the work. Select exactly one Track
from this ordered list:

| Order | Track        | Identifier prefix | Ownership                                                                                         |
| ----: | ------------ | ----------------- | ------------------------------------------------------------------------------------------------- |
|     1 | `ACC`        | `ACC`             | Account, identity, profile, favorites, notifications, reports, moderation, legal, and support     |
|     2 | `CMP`        | `CMP`             | Clubs, teams, pools, matches, rankings, search, discovery, and competition-facing product flows   |
|     3 | `ING`        | `ING`             | Provider ingestion, scrapers, synchronization, data quality, and search projection maintenance    |
|     4 | `FIG`        | `FIG`             | Canonical Figma assets, design tokens, component libraries, screen certification, and design QA   |
|     5 | `Foundation` | `FND`             | Cross-cutting contracts, shared models, application foundations, and reusable runtime foundations |
|     6 | `Platform`   | `PLT`             | GitHub, CI, repository workflow, infrastructure, workspace tooling, and developer experience      |

Choose the Track from the issue's objective:

- a mobile or gateway slice uses `ACC` or `CMP` when it delivers one of those product outcomes;
- a scraper/provider or projection correction uses `ING`, even when it also changes an owning service;
- canonical design-system work uses `FIG`; implementing an already accepted design uses the owning product Track;
- contract or shared-runtime work with no single product owner uses `Foundation`; and
- repository mechanics with no product behavior use `Platform`.

When several Tracks appear equally primary, split the issue if it contains independently shippable outcomes. Otherwise
record the single ownership decision in the issue context. Track does not reserve files and never decides workset
conflicts.

Existing identifiers such as `REF-*` and `GIT-*` remain stable. New structured roadmap identifiers use the prefix above
plus the next unused three-digit number within that prefix. Ordinary issues without a roadmap identifier retain their
native type indicator.

## Workset Areas

Every `Workset.Areas` entry must use one of these labels. The mapping describes ownership; the issue's explicit write
locks remain the conflict authority.

| Area label                     | Owned boundary                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `area:contracts`               | `libs/shared/contracts/**` and generated contract outputs                      |
| `area:python-contract-clients` | `libs/shared/python-contract-clients/**` and its generated outputs             |
| `area:backend-shared`          | `apps/backend/pom.xml`, shared models, Maven wrapper, and cross-service config |
| `area:club-scraper`            | `apps/backend/club-scraper/**`                                                 |
| `area:competition-scraper`     | `apps/backend/competition-scraper/**`                                          |
| `area:clubs-service`           | `apps/backend/clubs-service/**`                                                |
| `area:competition-service`     | `apps/backend/competition-service/**`                                          |
| `area:config-service`          | `apps/backend/config-service/**`                                               |
| `area:matches-service`         | `apps/backend/matches-service/**`                                              |
| `area:mobile-gateway`          | `apps/backend/mobile-gateway/**`                                               |
| `area:notification-service`    | `apps/backend/notification-service/**`                                         |
| `area:pools-service`           | `apps/backend/pools-service/**`                                                |
| `area:reports-service`         | `apps/backend/reports-service/**`                                              |
| `area:search-service`          | `apps/backend/search-service/**`                                               |
| `area:search-worker`           | `apps/backend/search-worker/**`                                                |
| `area:teams-service`           | `apps/backend/teams-service/**`                                                |
| `area:users-service`           | `apps/backend/users-service/**`                                                |
| `area:mobile`                  | `apps/frontend/mobile/**`                                                      |
| `area:infra`                   | `infra/**`, container configuration, and local runtime resources               |
| `area:workspace`               | root workspace configuration, lockfiles, Nx configuration, and agent guidance  |
| `area:docs`                    | repository documentation outside canonical Figma                               |
| `area:figma`                   | canonical Blockout Figma resources reserved through exact external locks       |
| `area:github`                  | `.github/**`, repository settings, issue types, labels, Project, and workflows |

Use every matching area label and no area label absent from the Workset. A task that changes a shared source and its
generated consumers lists all affected areas and write locks. `area:figma` requires an exact canonical file or node
external lock whenever Figma will be mutated.

## Label Catalog

All names are lowercase. Colors are six-digit hexadecimal values without `#`.

### Workset labels

| Label                          | Color    | Description                                      |
| ------------------------------ | -------- | ------------------------------------------------ |
| `area:contracts`               | `5319e7` | OpenAPI contracts and generated contract outputs |
| `area:python-contract-clients` | `5319e7` | Shared generated Python models and HTTPX clients |
| `area:backend-shared`          | `0e8a16` | Shared backend models and Maven configuration    |
| `area:club-scraper`            | `0e8a16` | Club scraper application                         |
| `area:competition-scraper`     | `0e8a16` | Competition scraper application                  |
| `area:clubs-service`           | `0e8a16` | Clubs service                                    |
| `area:competition-service`     | `0e8a16` | Competition service                              |
| `area:config-service`          | `0e8a16` | Configuration service                            |
| `area:matches-service`         | `0e8a16` | Matches service                                  |
| `area:mobile-gateway`          | `0e8a16` | Mobile backend-for-frontend gateway              |
| `area:notification-service`    | `0e8a16` | Notification service                             |
| `area:pools-service`           | `0e8a16` | Pools service                                    |
| `area:reports-service`         | `0e8a16` | Reports service                                  |
| `area:search-service`          | `0e8a16` | Search service                                   |
| `area:search-worker`           | `0e8a16` | Search projection worker                         |
| `area:teams-service`           | `0e8a16` | Teams service                                    |
| `area:users-service`           | `0e8a16` | Users service                                    |
| `area:mobile`                  | `1d76db` | Expo and React Native mobile application         |
| `area:infra`                   | `fbca04` | Infrastructure and local runtime                 |
| `area:workspace`               | `c5def5` | Workspace tooling and configuration              |
| `area:docs`                    | `0075ca` | Repository documentation                         |
| `area:figma`                   | `c2e0c6` | Canonical Figma resources                        |
| `area:github`                  | `f9d0c4` | GitHub Project and repository governance         |

### Product and delivery labels

| Label           | Color    | Description                                                          |
| --------------- | -------- | -------------------------------------------------------------------- |
| `account`       | `fef2c0` | Account, identity, profile, favorites, and user preferences          |
| `competition`   | `e99695` | Clubs, teams, pools, matches, rankings, and competition flows        |
| `discovery`     | `a2eeef` | Feed, search, followed content, and entity discovery                 |
| `ingestion`     | `fbca04` | Provider scraping, synchronization, projections, and data quality    |
| `notifications` | `c2e0c6` | Push, in-app notification, unread state, and deep-link behavior      |
| `support`       | `bfdadc` | Reports, moderation, legal content, administration, and user support |
| `backend`       | `0e8a16` | Backend services, Java, Python, Spring Boot, Maven, or persistence   |
| `ci`            | `c5def5` | CI, build pipeline, generated artifacts, or quality gates            |
| `contracts`     | `5319e7` | OpenAPI contracts, schema fragments, and contract generation         |
| `docs`          | `0075ca` | Documentation, plans, architecture, or guidance                      |
| `frontend`      | `1d76db` | Expo, React Native, navigation, or frontend application code         |
| `infra`         | `fbca04` | Containers, local runtime, infrastructure, or environment config     |
| `mobile`        | `1d76db` | Mobile product surface or native platform behavior                   |
| `product`       | `bfdadc` | Product framing, business model, or product decisions                |
| `research`      | `d876e3` | Research, framing, discovery, or decision work                       |
| `ui`            | `c2e0c6` | User interface, views, or visual product experience                  |
| `v1`            | `e99695` | V1 roadmap and migration work                                        |
| `workflow`      | `f9d0c4` | Repository workflow, GitHub process, labels, types, or automation    |

### Pull-request type labels

| Label     | Color    | Description                                                                      |
| --------- | -------- | -------------------------------------------------------------------------------- |
| `bug`     | `d73a4a` | Defect or unexpected behavior                                                    |
| `feature` | `a2eeef` | Product feature or V1 roadmap implementation                                     |
| `hotfix`  | `b60205` | Urgent production or environment fix                                             |
| `tech`    | `fbca04` | Technical debt, infrastructure, tooling, contracts, CI, workflow, or maintenance |

Native issue type owns issue classification. Do not add these labels to Roadmap issues merely to repeat their type.
Pull requests use at most one of them.

### Audit and collaboration labels

| Label              | Color    | Description                                          |
| ------------------ | -------- | ---------------------------------------------------- |
| `audit-finding`    | `5319e7` | Finding produced by a repository audit               |
| `duplicate`        | `cfd3d7` | Duplicate of another issue or pull request           |
| `good first issue` | `7057ff` | Good first contribution for newcomers                |
| `help wanted`      | `008672` | Extra attention or external help is welcome          |
| `invalid`          | `e4e669` | Invalid or not reproducible                          |
| `needs-info`       | `d876e3` | Needs clarification or a product decision            |
| `severity:p0`      | `b60205` | Critical audit finding requiring immediate attention |
| `severity:p1`      | `d93f0b` | Major audit finding requiring correction             |
| `severity:p2`      | `fbca04` | Actionable moderate audit finding                    |
| `wontfix`          | `ffffff` | Will not be worked on                                |

Do not create `blocked`, `action`, `epic`, or another label that duplicates Project Status or native issue type.

## Legacy Label Migration

GIT-004 applies this deterministic mapping after verifying current use:

| Existing Blockout label | Target label       | Action                         |
| ----------------------- | ------------------ | ------------------------------ |
| `bug`                   | `bug`              | Keep and normalize description |
| `documentation`         | `docs`             | Rename                         |
| `duplicate`             | `duplicate`        | Keep and normalize description |
| `enhancement`           | `feature`          | Rename                         |
| `good first issue`      | `good first issue` | Keep and normalize description |
| `help wanted`           | `help wanted`      | Keep and normalize description |
| `invalid`               | `invalid`          | Keep and normalize description |
| `question`              | `needs-info`       | Rename                         |
| `wontfix`               | `wontfix`          | Keep and normalize description |

If a source and target both exist, migrate every issue and pull request first, then remove the empty source label.
Never delete a label while an unresolved item still relies on it.

## Pull Request Label Selection

Apply two to four useful labels after draft PR creation:

1. zero or one type label;
2. one or two relevant delivery or product labels; and
3. `workflow`, `ci`, `contracts`, `docs`, or another precise label only when it materially describes the diff.

Do not put `area:*` labels on pull requests merely because their issue has them. The issue Workset owns locking
metadata; PR labels summarize the review surface.
