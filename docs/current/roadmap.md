# Blockout Roadmap

- [x] **BOOT-001 — Import standalone Blockout applications into a functional Nx monorepo**
- [x] **BASE-001 — Add safe application-local environment examples**

## Current refactor

- [x] **REF-001 — Define the refactor direction and inventory JSON boundaries**
  - Record Maaatch as the read-only reference for structure and naming.
  - Classify application-owned REST, internal, message, scraper, and mobile JSON boundaries.
  - Exclude database, configuration, protocol, and provider-owned names.

- [x] **REF-002 — Characterize the JSON flows before changing them**
  - Add focused serialization and client-boundary tests for representative backend, gateway, worker, scraper, and mobile flows.
  - Cover the scraper status check and one write payload for each scraper without calling production systems.
  - Preserve current behavior so the camelCase migration has an executable baseline.

- [x] **REF-003 — Migrate Blockout-owned JSON fields to camelCase**
  - Change all in-repository producers and consumers together: Java services, gateway, worker, Python scrapers, and Expo mobile.
  - Keep the existing V1 routes and controllers; do not create V2 endpoints, aliases, contract sources, or generated code.
  - Leave external provider payloads and non-JSON infrastructure names unchanged.
  - Remove the global snake_case serialization settings and explicit application-owned snake_case mappings once no longer needed.

- [x] **REF-004 — Validate both scrapers against the local application stack**
  - Start the required infrastructure and APIs with local configuration.
  - Exercise each scraper through status retrieval, representative parsing, and application API writes using controlled non-production inputs.
  - Verify persisted results, service health, logs, metrics, and the absence of unintended external writes.
  - Record missing credentials or unavailable external fixtures honestly; do not weaken the functional gate.

- [x] **REF-005 — Make the Blockout HTTP contract natively camelCase**
  - Use camelCase directly in Java, Python, and TypeScript transport models and query parameters.
  - Remove generic case-conversion utilities and retain only type serialization required for values such as dates and enums.
  - Preserve provider-owned payloads and non-HTTP infrastructure names.

- [x] **REF-006 — Establish a green local verification baseline**
  - Fix the imported mobile type errors without changing application behavior.
  - Keep the search worker context test isolated from startup jobs and external systems.
  - Validate the complete Maven reactor, mobile typecheck, and a gateway-to-service local smoke.

The tasks are executed in order. DTO restructuring, contract-first adoption, code generation, scraper redesign, GitFlow, CI, deployment, and production changes require later roadmap tasks and are not bundled into this migration.
