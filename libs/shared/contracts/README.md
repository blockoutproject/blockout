# Contracts

OpenAPI fragments under `specs/source/**` are the source of truth for generated transport contracts:

- `source/shared/schemas` contains reusable transport enums only;
- `source/services/<service>/schemas` contains DTOs owned by that service;
- `source/services/<service>/paths` contains that service's existing V1 operations;
- `generated/specs` contains ignored bundles consumed by generators.

Application enums such as the competition scraper's `DataSourcePriority` remain in their application. Generated Java
sources stay below the owning Maven module's `target` directory, generated Python packages stay in the private
`python-contract-clients` wheel, and the mobile client stays below `apps/frontend/mobile/src/shared/generated`. No
generated source is committed.

## Commands

```bash
npm exec nx run @blockout/contracts:test
npm exec nx run @blockout/contracts:generate-contracts
npm exec nx run @blockout/python-contract-clients:generate
npm exec nx run @blockout/python-contract-clients:test
npm exec nx run @blockout/python-contract-clients:build
mvn -f apps/backend/pom.xml -pl shared-models package
```

Change source fragments first, regenerate every affected projection, and verify each server, scraper, shared-client,
and mobile consumer selected by the contract change.
