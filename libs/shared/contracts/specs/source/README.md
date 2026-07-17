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

## Shared REST Catalog

MRG-316 establishes the only components inherited automatically by every deployable REST bundle:

- `bearerAuth` defines the common HTTP Bearer JWT shape, but operations still declare their exact public,
  authenticated, or scope-protected security requirement;
- `Page` and `PageSize` define zero-based pagination with a default size of 25 and a hard shared maximum of 100; an
  owner may document and enforce a lower maximum;
- `RequestId` and the standard Problem Details responses expose `X-Request-ID` without making correlation metadata a
  business field;
- `ProblemDetail` requires `title`, HTTP `status`, and stable machine-readable `code`; `requestId` remains optional
  when a runtime cannot safely supply it;
- `PageInfo` requires `page`, `pageSize`, and `hasNext`; `totalItems` remains optional;
- `UuidIdentifier`, `NumericIdentifier`, `CalendarDate`, and `UtcDateTime` are wire aliases mapped to native Java
  types through validated `x-java-type` values;
- the twelve approved REST enums retain their exact deployed wire values and contain no UI labels or provider
  metadata.

The inherited response catalog covers `400`, `401`, `403`, `404`, `409`, `413`, and `500`. An operation references
only the statuses it can actually return; the catalog does not silently change legacy behavior or make every response
universal.

Bounded-list wrappers deliberately remain owner-local and typed. A `*ListResponse` contains only a required `items`
array with a concrete item schema, while a `*PageResponse` contains concrete `items` plus shared `PageInfo`. There is no
generic untyped list schema. Complete-list operations document the bounded source and deterministic ordering;
growable collections use `Page`, `PageSize`, and a stable ordering tie-breaker.

Shared and owner component registries are merged deterministically. An owner cannot shadow a shared component or
schema name; the bundler rejects the collision so security, error, or enum behavior cannot drift silently.

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

MRG-306 through MRG-309 establish the deterministic Maaatch-shaped bundler, tests, source lint, committed source shells,
and generated bundles. The bundler discovers service directories lexicographically, cleans its owned output, and
writes only to `libs/shared/contracts/generated/specs/**`. Empty `paths` in deployable bundles state that no canonical
operation exists yet. Shared Problem Details may already appear because inherited reusable responses reference it;
owner contract tasks populate business paths and schemas. Generation availability does not by itself make a service
contract-authoritative.
