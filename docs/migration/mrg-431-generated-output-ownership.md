# MRG-431 Generated Output Ownership

## Outcome

Blockout now follows Maaatch's source-first contract-generation structure. Git owns authoritative OpenAPI and AsyncAPI
fragments, generator configuration, handwritten adapters, packaging metadata, and the backend parent schema-mapping
block. Git does not own generated REST bundles, generated event records, Orval output, or generated Python client
source.

The ignored output roots are:

- `libs/shared/contracts/generated/**`;
- `apps/backend/event-contracts/src/generated/**`;
- `apps/frontend/mobile/src/api/generated/**`;
- `libs/shared/contracts/clients/python/src/blockout_contract_clients/**`.

`npm run validate:generated-untracked` fails when any file beneath those roots is tracked. Generation remains local and
deterministic; the output is present when a build needs it but cannot enter a commit accidentally.

## Clean-checkout Build Order

The repository build boundaries generate their prerequisites explicitly:

1. backend CI installs Node dependencies, generates REST bundles and event records, proves both outputs deterministic,
   and then compiles the Maven reactor;
2. mobile CI generates REST bundles, proves bundle determinism, generates Orval output twice, typechecks, and exports;
3. scraper CI generates the selected REST bundles and Python clients, proves Python output deterministic, builds the
   local wheel, runs its boundary tests, and builds both root-context images;
4. the EAS post-install hook generates the mobile contract client after establishing the workspace dependency link;
5. `scripts/verify-ci-pr-local.sh` runs the same ignored-output matrix twice before backend, mobile, scraper, and
   Compose validation.

The backend parent `schemaMappings` block remains committed because it is build configuration derived from shared
source schemas, exactly as in Maaatch. Java OpenAPI models remain under module-local Maven `target` directories.

## Superseded Output Clauses

MRG-431 changes output ownership only. It supersedes the committed-output clauses of MRG-309, MRG-313, MRG-314,
MRG-315, MRG-328, MRG-330, MRG-350, and MRG-355. Their generator versions, contract authority, transport boundaries,
runtime adapters, event envelope and topology, and behavioral evidence remain unchanged.

## Compatibility And Rollback

No REST schema, event schema, route, payload, dependency version, runtime behavior, queue, database, deployment, or
production state changes. Rollback is limited to restoring the former tracked-output policy and CI comparisons, but it
would deliberately reintroduce the divergence from Maaatch and is not the target architecture.

No deployment, production action, MRG-9xx work, or MRG-1000 work is performed or authorized.
