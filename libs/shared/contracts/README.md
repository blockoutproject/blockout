# Contracts

This directory is the reserved Blockout contract-first boundary, matching Maaatch while retaining Blockout service and
Expo terminology.

The [source layout](specs/source/README.md) fixes shared schemas, service-owned internal APIs, and the Expo-facing
`mobile-gateway` BFF structure. Future authoritative OpenAPI fragments live under that tree. Generated bundles,
backend generated models, Python clients, and Expo generated clients remain outputs.

No deployed service is contract-authoritative from this directory yet. The active migration roadmap must first
inventory current production APIs, add deterministic bundling and tests, configure backend and mobile generation, and
prove one end-to-end migration. Do not invent source fragments or claim generation is operational before those tasks
are complete.
