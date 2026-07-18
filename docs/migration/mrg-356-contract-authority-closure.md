# MRG-356 Contract Authority Closure

- Status: closed in the monorepo source baseline
- REST authority: 80 owner operations and 50 mobile-gateway operations
- Event authority: 10 active routes and 14 active consumer queues
- Production effect: none

## Authority Decision

The Blockout contract migration has completed its source, generation, runtime-adapter, canonical-consumer, parity,
rollback, and conversion-cleanup gates. The OpenAPI fragments under `libs/shared/contracts/specs/source` and the
AsyncAPI fragments under `libs/shared/contracts/events/source` are now the only contract authority for Blockout-owned
v2 REST and RabbitMQ boundaries.

Generated bundles and language artifacts are reproducible outputs, not alternate authorities. Deployed standalone
repositories and images remain production authority until separately authorized cutovers. Retained v1 routes and
event paths are compatibility adapters, not canonical contract sources.

## REST Boundary Reconciliation

| Boundary         | Operations | Canonical runtime                                        | Canonical consumers                                                    |
| ---------------- | ---------: | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `config`         |         16 | generated Spring server and role-owned adapters          | generated BFF and scraper clients                                      |
| `clubs`          |          6 | generated Spring server and role-owned adapters          | generated BFF, search-worker, and scraper clients                      |
| `teams`          |          8 | generated Spring server and role-owned adapters          | generated BFF, users, search-worker, and scraper clients               |
| `pools`          |          7 | generated Spring server and role-owned adapters          | generated BFF, users, notification, search-worker, and scraper clients |
| `competition`    |          8 | generated Spring server and role-owned adapters          | generated BFF and scraper clients                                      |
| `matches`        |         16 | generated Spring server and role-owned adapters          | generated BFF and scraper clients                                      |
| `users`          |          9 | generated Spring server and role-owned adapters          | generated BFF, matches, and notification clients                       |
| `reports`        |          1 | generated Spring server and role-owned adapters          | generated BFF client                                                   |
| `notification`   |          6 | generated Spring server and role-owned adapters          | generated BFF client                                                   |
| `search`         |          3 | generated Spring server and role-owned adapters          | generated BFF client                                                   |
| `mobile-gateway` |         50 | generated Spring BFF interfaces and workflow projections | generated Orval operations, models, and wire schemas                   |

The 130 operation IDs reconcile exactly with MRG-301 and MRG-304. The six selected scraper service bundles generate
the private HTTPX client wheel used by both scrapers. Expo uses only generated v2 BFF operations for the migrated
workflows. Canonical adapters map generated transports immediately into role-owned application records; provider,
persistence, cache, and legacy transport models do not become contract sources.

## Event Boundary Reconciliation

| Active route                 | Producer              | Canonical consumers                               |
| ---------------------------- | --------------------- | ------------------------------------------------- |
| `club.upsert.v2`             | `clubs-service`       | `search-worker`                                   |
| `club.deactivation.v2`       | `competition-service` | `search-worker`, `clubs-service`, `teams-service` |
| `team.upsert.v2`             | `teams-service`       | `search-worker`                                   |
| `team.deactivation.v2`       | `competition-service` | `search-worker`, `teams-service`                  |
| `pool.upsert.v2`             | `pools-service`       | `search-worker`                                   |
| `pool.deactivation.v2`       | `competition-service` | `search-worker`, `pools-service`                  |
| `match.finished.v2`          | `matches-service`     | `notification-service`                            |
| `match.live-link-created.v2` | `matches-service`     | `notification-service`                            |
| `team.follow.v2`             | `users-service`       | `notification-service`                            |
| `pool.follow.v2`             | `users-service`       | `notification-service`                            |

All producers write generated v2 records through transactional outboxes with stable MRG-315 metadata. Every active
consumer decodes or maps generated records without `__TypeId__`, validates the queue contract and metadata, preserves
its existing acknowledgement/retry/requeue/DLQ behavior, and shares exact event identity across v1/v2 where duplicate
side effects or projections require it. The one orphan route and five listenerless queues remain explicitly excluded;
they are not made authoritative by catalog presence.

## Closure Evidence

- deterministic source bundling and generated-output checks cover REST bundles, backend Java, Orval, Zod, Python, and
  AsyncAPI/Modelina output twice without cache;
- all generated backend boundaries compile in the complete Maven reactor;
- runtime migrations preserve the audited authentication, status, pagination, ordering, null, side-effect, provider,
  and rollback behavior for every owner and BFF slice;
- Expo and both scrapers use their selected generated clients without handwritten case conversion;
- backend canonical source contains no Blockout `@JsonProperty`, `@JsonAlias`, `@JsonNaming`, or global snake-case
  strategy; snake-case serializers remain confined to retained v1 adapters;
- the v1 isolation guard rejects canonical-type imports in v1 adapters and v1 transport imports in v2 adapters;
- the obsolete, unreferenced generic `search-worker` HTTP client is removed as the final canonical-conversion residue;
  retained mobile-gateway legacy clients and DTOs remain required by `/api/v1/**` compatibility controllers.

## Operational Boundary

No route default, listener flag, publisher flag, broker resource, database, deployed image, standalone repository,
mobile release, or production traffic changes in MRG-356. Contract authority permits future code to derive from the v2
source; it does not authorize production cutover or v1 retirement. The MRG-304 read-only snapshot, provider-first
deployment, observation, rollback, and 30-day retirement gates remain mandatory.

No MRG-9xx or MRG-1000 work is executed, planned, authorized, or published.
