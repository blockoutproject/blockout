# Mobile And Identity Architecture V1

## Context

Blockout is a native mobile product backed by service-owned competition resources and provider ingestion. The
architecture keeps navigation, authentication, transport generation, remote state, domain ownership, and native
capabilities explicit without duplicating business authority in the application.

## Mobile Application

The deployable application lives under `apps/frontend/mobile` and uses Expo with React Native. Expo Router owns routes,
layouts, deep links, and native navigation composition. Route files stay thin; feature modules own their screens,
forms, hooks, view models, API adaptation, and use-case state.

Shared mobile code represents an application-wide invariant or serves multiple active semantic consumers. Native
capabilities and third-party providers remain behind owned adapters. Platform-specific files express real iOS or
Android behavior differences.

Blockout UI Library owns reusable visual foundations and components. Blockout Product Design owns approved product
patterns and representative screen states. Implementation follows published design tokens and components while
preserving native platform behavior, safe areas, text scaling, touch targets, focus, keyboard interaction, and
accessibility.

## Data And Transport

The mobile application reaches Blockout through `mobile-gateway`. The gateway orchestrates mobile-facing views and
commands but does not own clubs, teams, pools, competition associations, matches, users, notifications, reports,
configuration, or search truth.

OpenAPI sources generate the Orval client and transport types. Generated types remain at the API boundary. TanStack
Query owns remote facts, request lifecycle, caching, retries, and invalidation; feature state owns only local user
intent and presentation concerns.

## Authentication And Authorization

Auth0 is the OpenID Connect provider. The application is a public native client and uses authorization code flow with
PKCE through the system browser. `react-native-auth0` owns the authentication and credential lifecycle, and credentials
are stored only through operating-system protected storage.

External identities are keyed by `(issuer, subject)` and mapped to stable Blockout user IDs. Auth0 owns credentials,
federation, and authentication assurance. Blockout services own roles, permissions, subscriptions, grants, resource
state, and authorization decisions. UI guards and token claims never replace authorization by the service that owns
the requested behavior.

Access tokens are attached only at the API boundary for the intended audience. Tokens, authorization codes, raw
claims, and credentials never enter logs, analytics, URLs, screenshots, fixtures, or ordinary application storage.

## Runtime Ownership

- `clubs-service`, `teams-service`, `pools-service`, `competition-service`, and `matches-service` own the competition
  resources defined by the domain model.
- `users-service`, `notification-service`, and `reports-service` own accounts, favorites, notifications, and reports.
- `config-service` owns application status, divisions, legal documents, scraper status, and provider mappings.
- `search-service` owns search reads; `search-worker` maintains search projections.
- `club-scraper` and `competition-scraper` own provider ingestion workflows, not the resources they update.

PostgreSQL stores service-owned relational state, RabbitMQ carries purpose-specific asynchronous messages, and
Elasticsearch stores search projections. Complete resources cross boundaries through owned contracts; purpose-specific
messages and projections carry only the information required by their consumers.

## Provider Ingestion

The scrapers map FFVB competition data and supported LNV or DataProject enrichment into owner APIs through generated
clients. Provider transport, identifiers, encodings, parsing, retry, and throttling concerns remain inside provider
adapters.

Status checks and reconciliation fail closed. Timeouts, malformed responses, partial observations, and isolated
resource failures never authorize destructive reconciliation. Missing-resource deactivation requires a complete,
structurally valid observation for the selected source.

## Verification Boundary

Nx exposes one local project graph while Maven, uv, Expo, and Docker remain authoritative for their ecosystems. Mobile
verification generates the client, then runs formatting, linting, type checking, tests, and Expo export. Native build
and launch evidence is required when native dependencies, configuration, providers, routing, or platform-specific
behavior changes.
