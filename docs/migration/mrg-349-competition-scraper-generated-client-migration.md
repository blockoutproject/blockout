# MRG-349 Competition Scraper Generated Client Migration

- Status: implemented in the monorepo shadow baseline
- Owner: competition scraper Blockout adapters
- Migrated operations: eighteen
- Production effect: none

## Purpose

MRG-349 migrates every competition-scraper call to a Blockout-owned service from handwritten aiohttp requests to the
pinned OpenAPI Generator Python `httpx` clients activated by MRG-378. Five thin adapters construct generated request
models and operation arguments immediately before each call, then project generated responses immediately into
scraper-owned application dataclasses.

The scraper's federation and provider reads remain on the existing aiohttp session. This includes FFVB and LNV pages,
the FFVB CSV form POST, and the untouched SignalR utilities. Their timeouts, semaphores, retry loops, TLS behavior,
decoding, parsing, scheduling, concurrency, metrics, and logs do not change.

## Migrated Operation Set

| Audit IDs                    | Generated operations                                           | Adapter policy                                               |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `COMP-01`, `COMP-02`         | add/reactivate and list pool-team associations                 | generated query/path arguments and complete page aggregation |
| `COMP-04`, `COMP-05`         | bulk deactivate teams by pool and pools                        | sorted generated missing-ID commands                         |
| `COMP-07`                    | replace competition statistics                                 | generated full statistics snapshot                           |
| `CFG-10`, `CFG-11`, `CFG-14` | create/list raw-division mappings and read scraper status      | generated models, enums, list wrapper, and status probe      |
| `MATCH-01`, `MATCH-04..06`   | list/create/update matches and bulk deactivate matches by pool | complete pages, canonical requests, and sorted codes         |
| `POOL-01`, `POOL-03..04`     | list/create/update pools                                       | complete pages and canonical requests                        |
| `TEAM-01`, `TEAM-03..04`     | list/create/update teams                                       | complete pages, canonical requests, and generated multipart  |

Association, match, pool, and team reads use a page size of 100 and follow generated `hasNext` metadata until
complete. The raw-division operation retains its canonical list wrapper. Empty results become empty application lists.
The removed `rawName` team query is preserved as an adapter-local filter after canonical pagination, so no generated
type or noncanonical query enters scraper logic.

## Model And Multipart Boundary

Python application fields remain snake_case. Generated aliases alone emit canonical camelCase fields such as
`divisionId`, `matchCode`, `missingTeamIds`, `missingPoolIds`, `missingMatchCodes`, and `removeLogo`. Numeric canonical
division IDs are converted only at the adapter boundary and remain strings in the existing scraper dataclasses.
Generated enums project immediately to application strings.

Team update uses the generated multipart `data` model and explicit `removeLogo=false`; no handwritten FormData or JSON
serialization remains. Matches, pools, teams, mappings, associations, and status responses are projected immediately
to scraper-owned dataclasses. Generated pages, models, enums, exceptions, and transport objects do not enter caches,
provider parsing, scheduling, services, or business rules.

## Session, Auth, And Error Ownership

One generated config client exists only for the ten-second enablement probe. Each enabled scraper run owns five
generated clients: config, teams, pools, competition, and matches. An `AsyncExitStack` closes all five on success,
error, or cancellation. The four concurrent scraper variants share that bounded run bundle just as they previously
shared one Blockout-capable session.

Every operation obtains the current scraper-owned Auth0 token immediately before serialization. Generated exceptions
map to the bounded scraper-owned `BlockoutApiError` without logging tokens or unsafe response fields. The generated
HTTPX sessions retain `trust_env=True`, limit 20, ten-second operation timeouts, disabled TLS verification, zero retry,
and deterministic close from MRG-378.

The separate provider aiohttp session retains `trust_env=True`, limit 20, its ten-second default timeout, and disabled
TLS verification. It now reaches only federation/provider resources; Blockout requests never use it.

## Removed Compatibility Paths

- Handwritten Blockout URLs, methods, headers, query dictionaries, JSON payloads, multipart FormData, and response
  decorators are removed from the five competition-scraper API modules.
- The generic aiohttp Blockout response/dataclass converter is deleted because it has no provider owner.
- The recursive dataclass `to_dict()` wire helper and handwritten Auth0 header builder are deleted after their final
  competition-scraper callers migrate.
- Scraper application models, caches, services, provider utilities, and federation transport remain; no broad cleanup
  is pulled forward.

## Compatibility And Rollback

Owner services retain their existing v1 routes and canonical v2 routes under the MRG-304 coexistence gates. Before a
monorepo v2 competition-scraper image is released, rollback remains the current standalone v1 image. After release,
rollback uses the last-known-good competition-scraper image with the retained dual-route owner-service images. This
task does not authorize a deployment, traffic switch, standalone-repository change, provider write, or v1 removal.

## Verification Evidence

- Twenty-three Python boundary tests include direct coverage of all eighteen competition operations, canonical aliases
  and commands, complete pagination, application projections, five run-client lifecycles, per-probe status lifecycle,
  Auth0 refresh, multipart policy, error mapping, and generated-import confinement.
- Source guards prove the five migrated API modules contain no aiohttp transport or handwritten Authorization helper;
  the obsolete response converter and dataclass wire serializer are absent.
- Competition-scraper syntax, the root-context Docker image, and an ephemeral installed-image import of `main` and all
  five adapters are publication gates.
- Environment validation, documentation links, Nx project inspection, Maaatch comparison, formatting, generated-output
  guards, and whitespace checks remain publication gates.

## Closed Scope

- No provider/federation request, retry, TLS, parsing, schedule, concurrency, metric, or log behavior changes.
- No backend, Expo, event, database, contract, generated source, standalone repository, production, or Maaatch change.
- No MRG-350 work is pulled forward.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
