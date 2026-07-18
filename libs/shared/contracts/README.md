# Contracts

This directory is the reserved Blockout contract-first boundary, matching Maaatch while retaining Blockout service and
Expo terminology.

The [source layout](specs/source/README.md) fixes shared schemas, service-owned internal APIs, and the Expo-facing
`mobile-gateway` BFF structure. Future authoritative OpenAPI fragments live under that tree. Generated bundles,
backend generated models, Python clients, and Expo generated clients remain outputs.

The complete contract-artifact entrypoint is:

```bash
npm exec nx run @blockout/contracts:generate-contracts
```

It discovers service directories lexicographically, regenerates bundles under `generated/specs/*.json`, and
synchronizes the backend parent `schemaMappings` block from
`specs/source/shared/schemas/*.json`. The synchronizer maps generated shared models to
`com.blockout.shared.model.<SchemaName>` and derives native scalar mappings only from standard OpenAPI type/format
pairs in lexical order. Positive numeric identifiers remain inline and generate as native `Long`/`number`/`int`
values instead of a wrapper model. The backend parent supplies shared generator defaults, but `pluginManagement` does not activate them. The
`shared-models` module generates the shared objects and enums; later owning modules must declare their own executions
and keep all generated Java beneath their module-local
`target/generated-sources/openapi/<boundary>` directory.

Every backend Java enum is source-owned as one schema beneath `specs/source/shared/schemas`, including application
intent, decision, delta, claim, and result values that are not exposed by a REST operation. Backend modules import the
generated `com.blockout.shared.model.*Enum` type instead of declaring service-local, nested, test-only, or application
enum copies. Blockout-owned event discriminators remain generated from AsyncAPI in `event-contracts`; the generated
`com.blockout.events.v2.model.EventType` is therefore the deliberate event-boundary exception to the REST shared-model
package. `npm run validate:backend-enums-generated` enforces zero handwritten declarations across backend Java.

The generated bundle directory is ignored by Git. The block between `BEGIN generated schemaMappings` and
`END generated schemaMappings` is the only source-derived build configuration retained in Git, matching Maaatch.
Edit source fragments or generation scripts instead of either output. CI regenerates both, proves deterministic
content, and rejects any tracked file below a generated output directory.

The generated shared bundle contains the MRG-316 technical catalog. Deployable bundles inherit its security,
pagination, request-correlation, and Problem Details components while resolving only the shared schemas their active
operations or reusable components reference. MRG-317 through MRG-327 make `config.json`, `clubs.json`, `teams.json`,
`pools.json`, `competition.json`, `matches.json`, `users.json`, `reports.json`, `notification.json`, and `search.json`
authoritative owner bundles, and make all 50 audited `mobile-gateway.json` operations authoritative across relay,
club/team/pool, match/live/moderation, and signed-document workflows.
Bundle authority defines the target contract; it does not activate routes or change runtime authority.
The bundler's fixture and workspace guarantees run through:

```bash
npm exec nx run @blockout/contracts:test
```

Canonical source policy is enforced separately through:

```bash
npm exec nx run @blockout/contracts:lint-openapi-source
```

The scraper-owned Python boundary is generated from the shared model bundle and six service bundles selected by
MRG-314 and MRG-433:

```bash
npm exec nx run @blockout/contracts:generate-python-clients
npm exec nx run @blockout/python-contract-clients:build
```

OpenAPI Generator `7.23.0` produces the ignored Python 3.12 model-only shared namespace and six `httpx` namespaces beneath
`clients/python/src/blockout_contract_clients`. Those files are generated-only. The private
`blockout-contract-clients` wheel is installed from the monorepo by both root-context scraper images and is never
published externally. MRG-348 and MRG-349 remain responsible for moving the existing handwritten calls behind the
generated boundary.

Exact temporary exceptions live in `specs/lint-exceptions.json`. Every entry must identify one rule, file, JSON
Pointer, compatibility reason, owning task, and removal task; malformed, duplicated, or unused entries fail the lint.

## Contract Authority

MRG-356 closes the contract migration and marks every source bundle in this boundary as contract-authoritative:

| Source owner     | Canonical operations |
| ---------------- | -------------------: |
| `config`         |                   16 |
| `clubs`          |                    6 |
| `teams`          |                    8 |
| `pools`          |                    7 |
| `competition`    |                    8 |
| `matches`        |                   16 |
| `users`          |                    9 |
| `reports`        |                    1 |
| `notification`   |                    6 |
| `search`         |                    3 |
| `mobile-gateway` |                   50 |

The 80 owner operations and 50 BFF operations are the canonical Blockout REST definition. Generated bundles, Spring
interfaces/models/clients, Orval operations/models/Zod schemas, and selected Python clients are derivative artifacts;
edit the source fragments and regenerate them. Canonical runtime adapters and consumers use those generated
boundaries. Retained `/api/v1/**` controllers, DTOs, and clients are compatibility adapters only and remain isolated
until the MRG-304 production observation and retirement gate permits their removal.

Contract authority does not mean production deployment authority. Standalone repositories and deployed images remain
operationally authoritative until a separately authorized cutover. Vendor contracts, storage schemas, and RabbitMQ
messages are outside this OpenAPI boundary; Blockout-owned events are authoritative under `events/source/**`.

The complete repository-local generation gate is:

```bash
scripts/verify-ci-pr-local.sh --skip-install
```

It regenerates every ignored REST, Expo, selected Python, and event artifact twice without the Nx cache, rejects
tracked generated output, proves backend OpenAPI Java generation is deterministic, compiles the generated boundaries,
and validates that retained v1 adapters remain isolated from generated and v2 adapter types.
