# MRG-348 Club Scraper Generated Client Migration

- Status: implemented in the monorepo shadow baseline
- Owner: club scraper Blockout adapters
- Migrated operations: six
- Production effect: none

## Purpose

MRG-348 migrates every club-scraper call to a Blockout-owned service from handwritten aiohttp requests to the pinned
OpenAPI Generator Python `httpx` clients activated by MRG-378. Thin scraper adapters construct generated models and
operation arguments immediately before each call, then project generated responses immediately into scraper-owned
application models.

The club scraper's FFVB address-directory request remains on its existing provider aiohttp session with the same
timeout, semaphore, retry loop, TLS behavior, form fields, decoding, logs, scheduling, and concurrency. No
competition-scraper call changes in this task.

## Migrated Operation Set

| Audit ID  | Generated operation                 | Adapter policy                                       |
| --------- | ----------------------------------- | ---------------------------------------------------- |
| `CLUB-01` | `list_clubs`                        | aggregate every canonical page into `Club` models    |
| `CLUB-03` | `create_club`                       | generated create model and multipart image argument  |
| `CLUB-04` | `update_club`                       | generated update model, keep-logo intent, path ID    |
| `COMP-06` | `bulk_deactivate_competition_clubs` | canonical sorted missing-club command                |
| `CFG-14`  | `get_scraper_status`                | generated scraper enum and short-lived status client |
| `TEAM-06` | `list_team_club_ids`                | aggregate every canonical club-ID page               |

Clubs and team club IDs use a page size of 100 and follow generated `hasNext` metadata until complete, preserving the
former unpaged application view. Empty pages become empty application lists. The scraper's existing cache identity,
clone/update flow, input order, missing-club safety gate, update comparison, reactivation behavior, and logging remain
unchanged.

## Model And Multipart Boundary

Python application models remain snake_case. Generated aliases alone emit canonical camelCase fields such as
`rawName`, `postalCode`, `phoneNumber`, `removeLogo`, and `missingClubIds`. The create adapter supplies only fields
owned by the canonical create contract. The update adapter preserves explicit nullable values, address updates, and
keep-logo intent with `removeLogo=false`. The generated multipart implementation owns JSON/file encoding and file
lifecycle.

Generated club responses are projected immediately to the scraper's `Club` dataclass. Generated pagination, enums,
models, exceptions, and transport objects do not enter caches, provider parsing, scheduling, services, or business
rules. The status view now retains only the `name` and `enabled` fields actually exposed by the canonical contract and
consumed by the scheduler.

## Session, Auth, And Error Ownership

One status client exists only for the ten-second enablement probe. Each scraper run owns one generated client for
clubs, teams, and competition; an `AsyncExitStack` closes all three on success, error, or cancellation. Every
operation obtains the current scraper-owned Auth0 token immediately before serialization through the shared generated
client foundation. Generated exceptions map to the bounded scraper-owned `BlockoutApiError` without logging tokens or
unsafe response fields.

The run retains its existing provider `aiohttp.ClientSession` with `trust_env=True`, a limit of 20, disabled TLS
verification, and a 60-second default timeout. That session now reaches only the FFVB provider POST. Blockout clients
use their separately generated HTTPX sessions with the MRG-378 proxy, connection-limit, timeout, no-retry, and close
policy.

## Removed Compatibility Paths

- Handwritten Blockout URLs, methods, headers, JSON payloads, `aiohttp.FormData`, and response decorators are removed
  from the four club-scraper API modules.
- The generic aiohttp Blockout response/dataclass converter is deleted because it has no provider owner.
- The recursive dataclass `to_dict()` wire helper and handwritten Auth0 header builder are deleted after their final
  club-scraper callers migrate.
- Scraper application models and the FFVB provider transport remain; no broad cleanup is pulled forward.

## Compatibility And Rollback

The owner services retain their existing v1 routes and canonical v2 routes under the MRG-304 coexistence gates. Before
a monorepo v2 club-scraper image is released, rollback remains the current standalone v1 image. After release,
rollback uses the last-known-good club-scraper image with the retained dual-route owner-service images. This task does
not authorize a deployment, traffic switch, standalone-repository change, provider write, or v1 removal.

## Verification Evidence

- Eighteen Python boundary tests cover all six generated operations, canonical aliases and commands, complete page
  aggregation, application projections, three run-client lifecycles, per-probe status lifecycle, Auth0 refresh,
  multipart policy, error mapping, and generated-import confinement.
- Source guards prove the four migrated API modules contain no aiohttp transport or handwritten Authorization helper;
  the obsolete response converter and dataclass wire serializer are absent.
- Club-scraper syntax and its root-context Docker image pass. An ephemeral image probe imports `main` and all four
  generated adapters from the installed local wheel.
- Environment validation, documentation links, Nx project inspection, Maaatch comparison, formatting, generated
  output guards, and whitespace checks remain publication gates.

## Closed Scope

- No provider/federation request, retry, TLS, parsing, schedule, concurrency, metric, or log behavior changes.
- No competition-scraper, backend, Expo, event, database, contract, generated source, standalone repository,
  production, or Maaatch change.
- No MRG-349 work is pulled forward.
- No MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
