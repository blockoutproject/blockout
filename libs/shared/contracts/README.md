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

The generated bundle directory and the block between `BEGIN generated schemaMappings` and
`END generated schemaMappings` are generated artifacts. Edit source fragments or generation scripts instead of
editing either artifact manually. CI regenerates both and requires a clean tree.

The committed shared bundle contains the MRG-316 technical catalog. Deployable bundles inherit its security,
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

The scraper-owned Python boundary is generated separately from the six service bundles selected by MRG-314:

```bash
npm exec nx run @blockout/contracts:generate-python-clients
npm exec nx run @blockout/contracts:build-python-wheel
```

OpenAPI Generator `7.23.0` produces the committed Python 3.12 `asyncio` namespaces beneath
`clients/python/src/blockout_contract_clients`. Those files are generated-only. The private
`blockout-contract-clients` wheel is installed from the monorepo by both root-context scraper images and is never
published externally. MRG-348 and MRG-349 remain responsible for moving the existing handwritten calls behind the
generated boundary.

Exact temporary exceptions live in `specs/lint-exceptions.json`. Every entry must identify one rule, file, JSON
Pointer, compatibility reason, owning task, and removal task; malformed, duplicated, or unused entries fail the lint.

Only owner contracts completed in the active roadmap are authoritative here. Generated server and client boundaries,
runtime route activation, and end-to-end migration remain separate tasks; do not infer their completion from bundle
presence.
