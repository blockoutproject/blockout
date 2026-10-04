# Historical V1 contract pipeline

This document describes the legacy monorepo at the [foundation source revision](https://github.com/blockoutproject/blockout-legacy/tree/e31d3105421ae1130d574af191ecdd94cb7308ea).
The paths, topology and commands below do not exist in this clean V2 repository.
V2 retains source-first generation under the constitution; its contracts and build
implementation follow the [V2 architecture](../architecture/architecture-v2.md) and
[planning boundaries](../architecture/v2-planning-boundaries.md).

The legacy monorepo uses one source-first OpenAPI pipeline:

```text
OpenAPI source fragments
-> service and shared bundles
-> generated Java server models and interfaces
-> generated Python models and HTTPX clients
-> generated Orval TypeScript client
-> service, scraper, and mobile adapters
```

Source fragments live in `libs/shared/contracts/specs/source`. Shared schemas contain reusable transport enums;
service schemas and paths stay with their owning service. The bundler resolves transitive references into one contract
per service plus `shared.json` under the ignored `libs/shared/contracts/generated/specs` directory.

The schema-mapping synchronizer maps shared schemas to `com.blockout.shared.model` so Java service generators consume
one shared model. OpenAPI Generator produces Java sources in Maven build directories and Python packages in the shared
contract-client workspace. Orval produces the mobile gateway client under
`apps/frontend/mobile/src/shared/generated`.

All generated artifacts are ignored. Change source fragments first, regenerate every affected projection, and keep
provider, persistence, application, and presentation models outside the transport boundary.

## Commands

```bash
npm run contracts:test
npm run contracts:generate
npm run contracts:check-mappings
npm run backend:verify
npm run python-clients:verify
npm run mobile:codegen
```

`npm run verify` runs the complete contract and consumer verification sequence together with repository formatting.
