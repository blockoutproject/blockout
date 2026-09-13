# Contracts

OpenAPI fragments under `specs/source/**` are the source of truth for generated transport contracts:

- `source/shared/schemas` contains reusable transport enums only;
- `source/services/<service>/schemas` contains DTOs owned by that service;
- `source/services/<service>/paths` contains that service's operations;
- `generated/specs` contains ignored bundles consumed by generators.

Application enums such as the competition scraper's `DataSourcePriority` remain in their application. Generated Java
sources stay below the owning Maven module's `target` directory, generated Python packages stay in the private
`python-contract-clients` wheel, and the mobile client stays below `apps/frontend/mobile/src/shared/generated`. No
generated source is committed.

## API Problem Codes

`ApiProblemCodeEnum` defines the replacement backend's stable error codes. The core `ProblemDetail.code` schema
references it, generating a Java enum in `shared-models` and TypeScript values and a union type in the core mobile
client. Spring's native `ProblemDetail` carries the generated enum's wire value in its `code` extension.

Application failure reasons remain independent of transport models and are translated at the API boundary. Existing
wire values remain stable; mobile consumers must retain a generic failure path for unknown codes introduced by a
newer backend. The core Orval adapter preserves unknown error codes without runtime enum validation and supplies generic safe messages. It is explicitly configured before use and does not switch current screens.

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
