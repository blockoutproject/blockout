# Blockout OpenAPI Source Layout

This directory is the future source of truth for Blockout REST contracts. MRG-305 fixes the fragment layout and
ownership rules only. Service base documents, paths, schemas, generated bundles, and generator targets are introduced
by their later roadmap tasks.

## Target Tree

```text
specs/source/
├── shared/
│   ├── base.json
│   └── schemas/
│       └── <SharedTechnicalSchema>.json
└── services/
    ├── config/
    ├── clubs/
    ├── teams/
    ├── pools/
    ├── competition/
    ├── matches/
    ├── users/
    ├── reports/
    ├── notification/
    ├── search/
    └── mobile-gateway/
        ├── base.json
        ├── paths/
        │   └── <operation-family>.json
        └── schemas/
            └── <BoundarySchema>.json
```

Every service directory uses the same `base.json`, `paths/`, and `schemas/` shape shown for `mobile-gateway`.
Directories are created by the first task that owns an actual fragment; empty placeholder trees are not committed.

## Fragment Roles

| Fragment                          | Required content                                                                                                     | Forbidden content                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `shared/base.json`                | OpenAPI shell for the generated shared-model catalog                                                                 | REST operations or business-object roots                                        |
| `shared/schemas/*.json`           | One stable enum or rare cross-boundary technical primitive per file                                                  | Club, team, pool, match, user, report, search, notification, or BFF objects     |
| `services/<owner>/base.json`      | OpenAPI version, owner-specific title, placeholder server, tags, security schemes, reusable parameters and responses | Implemented paths, inline business schemas, or another service's policy         |
| `services/<owner>/paths/*.json`   | One coherent operation family as a top-level path map                                                                | `openapi`, `info`, generated output, events, or provider APIs                   |
| `services/<owner>/schemas/*.json` | One boundary-local named component per file                                                                          | JPA entities, application records, vendor SDK models, or copied downstream DTOs |

Fragments are JSON and contain only deterministic, repository-local content. Schema references use
`#/components/schemas/<Name>` and are resolved from the owning service plus the shared schema registry by the MRG-306
bundler. Files never reference generated bundles, backend sources, Expo sources, standalone repositories, or remote
URLs.

## Owner And Bundle Map

| Source directory          | Contract owner                      | Generated bundle      | Contract task             | Consumers                                                   |
| ------------------------- | ----------------------------------- | --------------------- | ------------------------- | ----------------------------------------------------------- |
| `shared`                  | cross-contract technical primitives | `shared.json`         | MRG-316                   | backend shared models and generated clients                 |
| `services/config`         | config-service                      | `config.json`         | MRG-317                   | backend, mobile-gateway, search-worker, scrapers            |
| `services/clubs`          | clubs-service                       | `clubs.json`          | MRG-318                   | backend, mobile-gateway, search-worker, club scraper        |
| `services/teams`          | teams-service                       | `teams.json`          | MRG-319                   | backend, mobile-gateway, search-worker, both scrapers       |
| `services/pools`          | pools-service                       | `pools.json`          | MRG-320                   | backend, mobile-gateway, search-worker, competition scraper |
| `services/competition`    | competition-service                 | `competition.json`    | MRG-321                   | mobile-gateway and both scrapers                            |
| `services/matches`        | matches-service                     | `matches.json`        | MRG-322                   | mobile-gateway and competition scraper                      |
| `services/users`          | users-service                       | `users.json`          | MRG-323                   | backend and mobile-gateway                                  |
| `services/reports`        | reports-service                     | `reports.json`        | MRG-324                   | mobile-gateway                                              |
| `services/notification`   | notification-service                | `notification.json`   | MRG-325                   | mobile-gateway                                              |
| `services/search`         | search-service                      | `search.json`         | MRG-326                   | mobile-gateway                                              |
| `services/mobile-gateway` | Expo-facing mobile-gateway BFF      | `mobile-gateway.json` | MRG-327, MRG-357, MRG-358 | Expo only                                                   |

Folder names are stable contract identifiers, not Java module names. Internal service components use the documented
`Internal` shape naming; `mobile-gateway` components keep Expo/product workflow names and do not use an `Internal`
suffix. The BFF contract is organized by Expo workflow even though its source fragments share one deployable-owned
directory.

## Closed Boundaries

- `search-worker` has no REST controller and receives no source directory or generated server bundle.
- RabbitMQ contracts belong to the event source selected by MRG-315, never to this OpenAPI tree.
- Auth0, FFVB/LNV, Mapbox, S3, GitHub, Discord, and Expo provider payloads remain vendor-adapter models.
- Canonical operations use the `/api/v2/**` paths and camelCase wire names fixed by MRG-304.
- Existing `/api/v1/**` shapes remain isolated legacy adapters and are not modeled as generated canonical operations.
- No service imports another service's source fragments. Cross-service reuse is limited to approved `shared/schemas`.

## Generation Boundary

MRG-306 will port the deterministic Maaatch-shaped bundler and discover service directories lexicographically. It will
write only to `libs/shared/contracts/generated/specs/**`. MRG-307 owns bundle tests, and MRG-308 owns source lint. Until
those tasks are complete, this layout does not claim that generation is available or that any service is
contract-authoritative.
