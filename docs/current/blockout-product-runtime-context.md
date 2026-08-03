# Blockout Product And Runtime Context

This document summarizes the delivered Blockout posture and the boundaries that must not reopen by continuity. It is
not a roadmap and does not track task status.

## Sources Of Truth

| Question                                                   | Source                                                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Committed tasks, status, priority, ownership, and blockers | [Roadmap GitHub Project](https://github.com/orgs/blockoutproject/projects/4)                                                                 |
| Delivered runtime behavior                                 | Current OpenAPI sources, application source, and tests                                                                                       |
| Product and architecture boundaries                        | [`../architecture/`](../architecture/) and [`../decisions/`](../decisions/)                                                                  |
| Delivered V1 summary                                       | [`../releases/blockout-v1-baseline.md`](../releases/blockout-v1-baseline.md)                                                                 |
| Roadmap operating rules                                    | [`GitHub Roadmap Policy`](../../.agents/skills/blockout-best-practices/references/github-roadmap-policy.md)                                  |
| Canonical visual design                                    | The Blockout Figma file governed by the repository [`Figma policy`](../../.agents/skills/blockout-best-practices/references/figma-policy.md) |

## Current Runtime Posture

- Blockout is a mobile-first volleyball companion. The Expo and React Native application consumes the mobile gateway
  and generated V1 clients for account, discovery, competition, notification, moderation, support, and application
  status flows.
- The backend is a Java 25 Spring Boot 4.1 service system using the Spring Framework 7 and Jackson 3 baseline. Each
  complete business resource has one owning service; the mobile gateway coordinates mobile-facing views without
  becoming the persistence owner.
- Source OpenAPI fragments under `libs/shared/contracts` own Blockout transport boundaries. Java adapters, the mobile
  Orval client, and shared Python HTTPX clients are generated outputs and remain outside Git.
- The club and competition scrapers are Python 3.12 applications. They preserve provider-specific parsing inside
  adapters, use generated Blockout clients at the owner boundary, and fail closed before destructive reconciliation
  when provider evidence is incomplete.
- PostgreSQL, RabbitMQ, Elasticsearch, and pgAdmin run through the local Compose boundary. Application processes retain
  their native Maven, uv, Nx, and Expo toolchains.
- The canonical Figma file owns accepted visual truth. Repository mobile architecture owns implementation boundaries,
  while screen-specific delivery evidence remains in its GitHub issue and pull request.

Verify these statements against current source before changing behavior. Generated artifacts and closed-task documents
are not authority.

## Boundaries That Stay Closed

- Historical imported applications are behavioral evidence, not executable architecture or a source of new work.
- A complete resource mirror cannot silently diverge from its owning service. Purpose-specific events and projections
  remain smaller only when their role and consumers are explicit.
- Persistence entities, provider payloads, transport models, application commands or views, and mobile view state do
  not collapse into one shared model.
- Mobile features do not bypass the generated gateway client with parallel handwritten contracts unless an owning task
  explicitly changes the boundary.
- Native authentication, notifications, purchases, advertising, maps, media, and platform configuration remain behind
  their current Expo or provider adapters. A structural cleanup cannot change provider behavior.
- Scraper cleanup and deactivation remain guarded by complete provider observations. A timeout, malformed source, or
  partial crawl is never permission for destructive owner updates.
- Deferred product behavior, unsupported provider rules, new public surfaces, and contract changes require a sourced
  `Ready` issue. Documentation or historical sequencing does not activate them.
- The retired local roadmap and Markdown completion-ledger patterns must not be recreated. GitHub Project fields,
  native relationships, issues, Worksets, pull requests, and Git history own operational state.

## Maintenance

Update this file only when delivered product/runtime posture or a durable closed boundary changes. Put task state and
evidence in GitHub, durable decisions in `docs/decisions/**`, architecture state in `docs/architecture/**`, and stable
delivered-scope summaries in `docs/releases/**`.
