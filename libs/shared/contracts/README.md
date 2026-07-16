# Contracts

This directory is reserved as the Blockout contract-first source boundary, matching Maaatch.

Future authoritative OpenAPI source fragments will live under `specs/source/**`. Generated bundles, backend generated
models, and Expo generated clients will be outputs.

No deployed service is contract-authoritative from this directory yet. The active migration roadmap must first
inventory current production APIs, add deterministic bundling and tests, configure backend and mobile generation, and
prove one end-to-end migration. Do not invent source fragments or claim generation is operational before those tasks
are complete.
