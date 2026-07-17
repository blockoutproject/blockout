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
- `../generated/events` contains committed, fully resolved deployable and catalog bundles.
- `apps/backend/event-contracts/src/generated/java` contains committed Java 21 records.

All references must be repository-local. Generated bundles contain no `$ref`, and Maven compiles only committed Java
sources; Maven never invokes Node or regenerates contracts.

## Commands

```bash
npm exec nx run @blockout/contracts:generate-event-contracts --skip-nx-cache
npm exec nx run @blockout/contracts:test-event-contracts
mvn -Dmaven.repo.local=.m2/repository -f apps/backend/pom.xml -pl event-contracts test
```

Run generation twice before committing and require identical output. MRG-802 owns moving the complete deterministic
generation, committed-output, compilation, reconciliation, and forbidden-source checks into CI.

## Active MRG-350, MRG-369, And MRG-370 Boundary

MRG-350 defines the six club, team, and pool lifecycle event families. MRG-369 adds team/pool followed and unfollowed
facts with positive numeric user and target IDs and activates only Q-18/Q-19. MRG-370 adds audited match-finished and
live-link facts with positive match/team/pool IDs and activates only the notification-owned Q-14/Q-15 successor
contracts. All v2 side-effect listeners and users/matches publication remain inactive until MRG-372. `EV-TPD`, Q-11
through Q-13, and Q-16 through Q-17 retain explicit no-v2 dispositions. No outbox,
deduplication, traffic switch, broker operation, or production action is authorized by the contract source.
