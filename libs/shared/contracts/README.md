# Contracts

This directory is the reserved Blockout contract-first boundary, matching Maaatch while retaining Blockout service and
Expo terminology.

The [source layout](specs/source/README.md) fixes shared schemas, service-owned internal APIs, and the Expo-facing
`mobile-gateway` BFF structure. Future authoritative OpenAPI fragments live under that tree. Generated bundles,
backend generated models, Python clients, and Expo generated clients remain outputs.

The deterministic bundle entrypoint is available through:

```bash
npm exec nx run @blockout/contracts:generate-openapi-bundles
```

It discovers future service source directories lexicographically and writes bundles only to `generated/specs/*.json`.
Until an owning roadmap task adds a real `base.json`, the command succeeds without manufacturing placeholder output.
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
