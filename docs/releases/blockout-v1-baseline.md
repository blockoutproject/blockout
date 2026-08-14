# Blockout V1 Baseline

This document summarizes the delivered Blockout V1 baseline after contract-first migration, application-boundary
cleanup, and mobile alignment. It records active capabilities and known limits; it does not replace source contracts,
architecture models, or designated issues.

## Active Capabilities

- Contract-first transport
  - Source OpenAPI fragments own current V1 HTTP boundaries.
  - Backend adapters, the Expo mobile client, and shared Python clients are generated from those sources.
  - Generated output remains outside Git.

- Volleyball data
  - Club, team, pool, ranking, match, competition-association, division, and search reads are available through their
    owning services and mobile-facing gateway views.
  - Search projections are maintained asynchronously.

- Account and engagement
  - Native Auth0 sign-in, current-user profile, favorites, followed content, and user-owned state are available through
    the mobile application.
  - User notifications, deep links, unread state, and push-token registration use the notification boundary.

- Contribution and support
  - Authorized users can contribute or correct supported entities through current owner APIs.
  - Match live-link moderation, report creation, legal content, and application-status gates are represented in the
    mobile flows.

- Mobile application
  - Expo Router owns the application shell and navigation.
  - Discovery, competition reading, account, notification, contribution, moderation, support, and system-state flows
    use the generated gateway client.
  - Canonical Figma foundations, components, and representative iOS states own accepted visual direction.

- Provider ingestion
  - Python scrapers ingest supported FFVB and LNV sources through explicit provider adapters.
  - Source-derived sanitized fixtures and offline tests protect parsing and safe reconciliation.

## Known Limits

- Provider availability and upstream document shape remain external constraints.
- Some provider-specific rules and dormant imported behaviors require explicit source revalidation before correction or
  activation.
- Native distribution, store release, production credentials, and production infrastructure are outside this source
  baseline.
- Android visual certification is not implied by iOS canonical screen evidence.
- A documented or historical capability is not active work until a real issue owns its objective, scope, sources, and
  acceptance criteria.

## Validation Baseline

- Repository formatting through Prettier, Spotless, and Ruff.
- OpenAPI bundle generation and contract checks.
- Backend Maven compilation and tests.
- Python Ruff, syntax, generated-client, and pytest targets.
- Mobile code generation, lint, typecheck, Jest, and Expo export.
- Native iOS or Android builds when a platform boundary changes.

## Final Source Gate

Current source, contracts, tests, and canonical Figma assets determine the delivered result. Closed issues, merged pull
requests, and Git history retain detailed completion evidence. Any new behavior, contract, provider rule, or product
surface requires a dedicated issue.
