# Blockout Event Contracts

This directory is the authoritative source and generation boundary for Blockout-owned RabbitMQ v2 event contracts.
The approved design is recorded in `docs/decisions/mrg-315-rabbitmq-event-contracts.md`; the deployed v1 baseline and
coexistence topology remain recorded in `docs/migration/mrg-302-deployed-rabbitmq-wire-inventory.md` and
`docs/migration/mrg-304-contract-coexistence-cutover-matrix.md`.

## Layout

- `source/shared` contains local-reference schemas, headers, messages, and channels.
- `source/deployables` contains one AsyncAPI `3.0.0` document per participating deployable.
- `source/catalog.json` is the component-only Modelina input and the complete route/queue reconciliation ledger.
- `scripts` contains the direct parser, bundler, Modelina, and contract-test entry points.
- `tests/golden` locks representative JSON bodies, AMQP properties, and stable headers.
- `../generated/events` contains ignored, fully resolved deployable and catalog bundles.
- `apps/backend/event-contracts/src/generated/java` contains ignored Java 21 records.

All references must be repository-local. Generated bundles contain no `$ref`. Build and CI boundaries run Nx event
generation before Maven; Maven itself never invokes Node or regenerates contracts.

## Commands

```bash
npm exec nx run @blockout/contracts:generate-event-contracts --skip-nx-cache
npm exec nx run @blockout/contracts:test-event-contracts
mvn -Dmaven.repo.local=.m2/repository -f apps/backend/pom.xml -pl event-contracts test
```

Run generation twice before compiling and require identical output. MRG-431 installs the ignored-output and
zero-tracked-generated-files policy; MRG-802 retains the later complete CI consolidation ownership.

## Contract-Authoritative Boundary

MRG-356 marks the ten active v2 routes and fourteen active v2 consumer queues as contract-authoritative. The eight
deployable documents own ten `send` operations and fourteen `receive` operations for lifecycle, favorite, and match
facts. Their fixed envelopes, camelCase payloads, generated Java records, AMQP metadata, producers, consumers, routes,
and queue dispositions derive only from this source.

`EV-TPD`, Q-11 through Q-13, and Q-16 through Q-17 retain explicit excluded dispositions and are not canonical event
boundaries. Generated bundles and Java records remain derivative artifacts. Retained v1 publishers, listeners, queues,
and DTOs are compatibility adapters only; their runtime defaults, traffic cutover, broker operations, observation, and
retirement remain governed by MRG-304. Contract authority does not activate v2 traffic or change production authority.
