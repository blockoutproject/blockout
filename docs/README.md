# Blockout Documentation

This folder contains product/runtime context, architecture, durable decisions, temporary migration guidance, and
reusable runbooks.

## Start Here

During monorepo migration:

1. Run `git status --short --branch`.
2. Read [`current/blockout-active-roadmap.md`](current/blockout-active-roadmap.md).
3. Read [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md) and
   [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md).
4. Load only the scope-specific sources routed by the selected migration item.

GitHub Project task planning remains dormant until the final GitFlow activation phase.

## Active Documents

| Area                   | File                                                                                                                         | Role                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Migration roadmap      | [`current/blockout-active-roadmap.md`](current/blockout-active-roadmap.md)                                                   | Temporary task order, dependencies, and completion state   |
| Product context        | [`current/blockout-product-runtime-context.md`](current/blockout-product-runtime-context.md)                                 | Delivered runtime posture and boundaries that stay closed  |
| Agent brief            | [`current/blockout-agent-brief.md`](current/blockout-agent-brief.md)                                                         | Minimal migration selection and source routing             |
| Backend architecture   | [`architecture/blockout-backend-contract-data-architecture.md`](architecture/blockout-backend-contract-data-architecture.md) | Approved contract, data, mapping, and service target       |
| Repository router      | [Blockout Best Practices](../.agents/skills/blockout-best-practices/SKILL.md)                                                | Universal rules and reference routing                      |
| Backend audit          | [`migration/backend-contract-data-audit-template.md`](migration/backend-contract-data-audit-template.md)                     | Read-only service and BFF field-lineage audit template     |
| REST wire inventory    | [`migration/mrg-301-deployed-rest-wire-inventory.md`](migration/mrg-301-deployed-rest-wire-inventory.md)                     | Current 130-operation contract discovery baseline          |
| Event wire inventory   | [`migration/mrg-302-deployed-rabbitmq-wire-inventory.md`](migration/mrg-302-deployed-rabbitmq-wire-inventory.md)             | Current RabbitMQ topology and payload discovery baseline   |
| Match event contracts  | [`migration/mrg-370-match-event-contract-migration.md`](migration/mrg-370-match-event-contract-migration.md)                 | Match event v2 contracts, parity, and rollback             |
| Client/casing audit    | [`migration/mrg-303-handwritten-client-casing-inventory.md`](migration/mrg-303-handwritten-client-casing-inventory.md)       | Current handwritten client and conversion ownership        |
| Contract coexistence   | [`migration/mrg-304-contract-coexistence-cutover-matrix.md`](migration/mrg-304-contract-coexistence-cutover-matrix.md)       | REST v1/v2 and RabbitMQ coexistence, rollback, and removal |
| Legal owner pilot      | [`migration/mrg-331-legal-document-runtime-migration.md`](migration/mrg-331-legal-document-runtime-migration.md)             | First generated v2 owner boundary, v1 parity, and rollback |
| Legal BFF pilot        | [`migration/mrg-332-mobile-legal-document-generated-client.md`](migration/mrg-332-mobile-legal-document-generated-client.md) | Generated BFF/client boundary, v1 isolation, and rollback  |
| Legal Expo pilot       | [`migration/mrg-333-expo-legal-document-client-form.md`](migration/mrg-333-expo-legal-document-client-form.md)               | Generated Expo client and React Hook Form/Zod pilot        |
| Config Expo slice      | [`migration/mrg-344-expo-configuration-client-migration.md`](migration/mrg-344-expo-configuration-client-migration.md)       | Generated configuration clients, schemas, and projections  |
| Catalog Expo slice     | [`migration/mrg-345-expo-catalog-client-migration.md`](migration/mrg-345-expo-catalog-client-migration.md)                   | Generated club, team, and pool clients and projections     |
| Match Expo slice       | [`migration/mrg-346-expo-match-client-migration.md`](migration/mrg-346-expo-match-client-migration.md)                       | Generated match, live-link, and moderation clients         |
| Relay Expo slice       | [`migration/mrg-347-expo-relay-client-migration.md`](migration/mrg-347-expo-relay-client-migration.md)                       | Generated user, search, notification, and report clients   |
| OpenAPI normalization  | [`migration/mrg-377-openapi-standard-syntax-normalization.md`](migration/mrg-377-openapi-standard-syntax-normalization.md)   | Standard scalar syntax and generated-output proof          |
| Config runtime slice   | [`migration/mrg-376-config-runtime-migration.md`](migration/mrg-376-config-runtime-migration.md)                             | Remaining config owner boundaries and worker client        |
| Clubs runtime slice    | [`migration/mrg-334-clubs-runtime-migration.md`](migration/mrg-334-clubs-runtime-migration.md)                               | Generated club owner boundaries and worker snapshot client |
| Teams runtime slice    | [`migration/mrg-335-teams-runtime-migration.md`](migration/mrg-335-teams-runtime-migration.md)                               | Generated team owner boundaries and internal clients       |
| Pools runtime slice    | [`migration/mrg-336-pools-runtime-migration.md`](migration/mrg-336-pools-runtime-migration.md)                               | Generated pool owner boundaries and internal clients       |
| Competition slice      | [MRG-337 competition runtime][mrg-337]                                                                                       | Generated association and statistics owner boundaries      |
| Ranking slice          | [MRG-359 competition ranking][mrg-359]                                                                                       | Canonical ranking projection and ordering policy           |
| Lifecycle slice        | [MRG-360 competition lifecycle][mrg-360]                                                                                     | Bulk deactivation and cascade owner boundaries             |
| Matches core slice     | [MRG-338 matches core and day page][mrg-338]                                                                                 | Generated match owner and grouped-day boundaries           |
| Matches live slice     | [MRG-361 matches live and history][mrg-361]                                                                                  | Live commands, history, policy parity, and users client    |
| Moderation slice       | [MRG-362 matches moderation and reports][mrg-362]                                                                            | Moderation projection, actions, reports, and parity        |
| Users account slice    | [MRG-339 users account and profile][mrg-339]                                                                                 | Generated account boundary, image intent, and user client  |
| Users favorite slice   | [MRG-363 users favorites][mrg-363]                                                                                           | Canonical favorites, generated boundary, and projections   |
| Users identity slice   | [MRG-364 users identity and storage][mrg-364]                                                                                | Auth0/S3 adapters, deletion order, and generated identity  |
| Reports runtime slice  | [MRG-340 reports runtime][mrg-340]                                                                                           | Generated report boundary and provider adapter isolation   |
| Notification inbox     | [MRG-341 notification inbox][mrg-341]                                                                                        | Generated page, stable ordering, and legacy continuation   |
| Notification mutations | [MRG-365 notification mutations][mrg-365]                                                                                    | Current-user state changes and token lifecycle boundary    |
| Notification delivery  | [MRG-366 notification delivery][mrg-366]                                                                                     | Provider-neutral delivery and Expo adapter boundary        |
| Search runtime slice   | [MRG-342 search runtime][mrg-342]                                                                                            | Generated search boundary and Elasticsearch isolation      |
| BFF relay runtime      | [MRG-343 mobile-gateway relays][mrg-343]                                                                                     | Generated facade boundaries for five workflow families     |
| BFF catalog runtime    | [MRG-367 mobile catalog workflows][mrg-367]                                                                                  | Generated club, team, and pool workflow projections        |
| BFF match runtime      | [MRG-368 mobile match and live workflows][mrg-368]                                                                           | Generated match, live, moderation, and PDF projections     |
| Expo contracts/forms   | [`decisions/mrg-313-expo-contract-generation.md`](decisions/mrg-313-expo-contract-generation.md)                             | Orval, TanStack, Zod, React Hook Form, and form migration  |
| Python clients         | [`decisions/mrg-314-python-contract-clients.md`](decisions/mrg-314-python-contract-clients.md)                               | Generated async clients, adapters, wheel, and scraper use  |
| RabbitMQ contracts     | [`decisions/mrg-315-rabbitmq-event-contracts.md`](decisions/mrg-315-rabbitmq-event-contracts.md)                             | AsyncAPI source, Java records, envelope, and v2 topology   |
| Production cutover     | [`migration/monorepo-cutover.md`](migration/monorepo-cutover.md)                                                             | Temporary per-deployable migration and rollback procedure  |

[mrg-337]: migration/mrg-337-competition-association-statistics-runtime-migration.md
[mrg-359]: migration/mrg-359-competition-ranking-runtime-migration.md
[mrg-360]: migration/mrg-360-competition-lifecycle-cascade-runtime-migration.md
[mrg-338]: migration/mrg-338-matches-core-day-runtime-migration.md
[mrg-361]: migration/mrg-361-matches-live-history-runtime-migration.md
[mrg-362]: migration/mrg-362-matches-moderation-report-runtime-migration.md
[mrg-339]: migration/mrg-339-users-account-profile-runtime-migration.md
[mrg-363]: migration/mrg-363-users-favorites-runtime-migration.md
[mrg-364]: migration/mrg-364-users-identity-storage-runtime-migration.md
[mrg-340]: migration/mrg-340-reports-runtime-migration.md
[mrg-341]: migration/mrg-341-notification-inbox-runtime-migration.md
[mrg-365]: migration/mrg-365-notification-mutation-token-runtime-migration.md
[mrg-366]: migration/mrg-366-notification-delivery-provider-runtime-migration.md
[mrg-342]: migration/mrg-342-search-runtime-migration.md
[mrg-343]: migration/mrg-343-mobile-gateway-relay-runtime-migration.md
[mrg-367]: migration/mrg-367-mobile-gateway-catalog-runtime-migration.md
[mrg-368]: migration/mrg-368-mobile-gateway-match-live-runtime-migration.md

## Documentation Map

| Layer           | Location                                   | Keep here                                                                      |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Current context | [`current/`](current/)                     | Runtime posture, minimal agent routing, and temporary active migration roadmap |
| Architecture    | [`architecture/`](architecture/)           | Current product and technical models                                           |
| Decisions       | [`decisions/`](decisions/)                 | Durable product, capability, architecture, and workflow decisions              |
| Releases        | [`releases/`](releases/)                   | Stable delivered-scope snapshots after they are established                    |
| Migration       | [`migration/`](migration/)                 | Temporary cutover guidance removed or archived after migration                 |
| Runbooks        | [`runbooks/README.md`](runbooks/README.md) | Reusable procedures, never product authority                                   |

## Source Rules

- Current source and deployed behavior outrank historical claims.
- The active roadmap controls migration execution only.
- Architecture and decisions preserve durable intent.
- Generated artifacts are outputs, not product authority.
- Maaatch is the structural reference, not a Blockout product source.

## Stability Rules

- Keep current documents focused and give each fact one owner.
- Do not duplicate roadmap state in runbooks or architecture documents.
- Do not silently change durable product or architecture decisions during cleanup.
