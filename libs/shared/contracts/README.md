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
`specs/source/shared/schemas/*.json`. The synchronizer maps every shared schema to
`com.blockout.shared.model.<SchemaName>` in lexical order. The backend parent supplies shared generator defaults, but
`pluginManagement` does not activate them: no backend API or model generation is active yet. Later owning modules must
declare their own executions and keep all generated Java beneath their module-local
`target/generated-sources/openapi/<boundary>` directory.

The generated bundle directory and the block between `BEGIN generated schemaMappings` and
`END generated schemaMappings` are generated artifacts. Edit source fragments or generation scripts instead of
editing either artifact manually. CI regenerates both and requires a clean tree.

The committed bundles currently contain the shared and deployable contract shells with no operations or business
schemas. MRG-316 and the owner contract tasks populate those shells; their presence alone does not make a runtime
boundary contract-authoritative.
The bundler's fixture and workspace guarantees run through:

```bash
npm exec nx run @blockout/contracts:test
```

Canonical source policy is enforced separately through:

```bash
npm exec nx run @blockout/contracts:lint-openapi-source
```

Exact temporary exceptions live in `specs/lint-exceptions.json`. Every entry must identify one rule, file, JSON
Pointer, compatibility reason, owning task, and removal task; malformed, duplicated, or unused entries fail the lint.

No deployed service is contract-authoritative from this directory yet. The active migration roadmap must first
inventory current production APIs, add deterministic bundling and tests, configure backend and mobile generation, and
prove one end-to-end migration. Do not invent source fragments or claim generation is operational before those tasks
are complete.
