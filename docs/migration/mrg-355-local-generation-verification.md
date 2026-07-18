# MRG-355 Local Generation Verification

## Outcome

`scripts/verify-ci-pr-local.sh` is the complete local verification entrypoint for the contract migration. It now
regenerates every active contract-derived boundary, rejects tracked generated output, proves two-run determinism,
compiles generated backend sources, and keeps retained v1 adapters isolated.

Run it from the repository root after dependencies are installed:

```bash
scripts/verify-ci-pr-local.sh --skip-install
```

Omit `--skip-install` when the lockfile installation must also be verified.

## Ignored Generation Matrix

The verifier generates the matrix twice with the Nx cache disabled, compares both content manifests, and compares a
final manifest after compilation, export, wheel, and image checks.

| Source boundary                      | Generator                                      | Deterministic output                                       |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| REST OpenAPI fragments               | `@blockout/contracts:generate-contracts`       | ignored service bundles and backend parent schema mappings |
| Mobile gateway OpenAPI               | `@blockout/mobile:codegen`                     | ignored Orval operations, models, and Zod schemas          |
| Six selected scraper service bundles | `@blockout/contracts:generate-python-clients`  | ignored Python async client package source                 |
| AsyncAPI event fragments             | `@blockout/contracts:generate-event-contracts` | ignored event bundles and Java event records               |

The repository guard requires that none of the generated directories is tracked. The two-run comparison proves
deterministic output across uncached runs. A later final comparison ensures that no compile, test, export, or image
step rewrites generated files.

Prettier checks every supported tracked or new file changed by the current local iteration. This keeps new work
formatted without treating unrelated historical formatting debt as generated-output drift.

## Backend Generation And Compilation

The verifier runs a clean Maven `generate-sources`, captures every module-local OpenAPI Java source tree, runs backend
generation again, and requires identical manifests. It then compiles the complete reactor so generated server,
client, shared-model, and event boundaries are compiled in their real module graph.

## V1 Adapter Isolation

`npm run validate:v1-adapter-isolation` inspects all backend main Java source. It enforces these directional rules:

- a physical `v1` source directory declares a v1 package, and a v1 package lives in a physical `v1` directory;
- a controller owning an `/api/v1` route lives in a v1 package;
- v1 adapters do not import generated canonical types or v2 adapter types; and
- v2 adapters do not import v1 transport types.

This guard deliberately permits application and domain roles behind a v1 adapter. It also leaves legacy shared
mobile-gateway transport helpers available to historical v1-only services until MRG-304 authorizes their retirement.

## Remaining Ownership

MRG-355 changes only repository-local verification. It does not alter a contract, runtime route, event topology,
database, provider, mobile release, scraper schedule, image, or deployment.

MRG-802 owns moving the complete generation matrix into CI. MRG-806 owns making the later CI structure and local
verifier invoke exactly the same authoritative commands. MRG-304 remains the only production-observation and
retirement authority for v1 routes and adapters.

The Python client source is copied to the verifier's temporary directory and built there as a wheel, then its
installation and scraper checks run inside a temporary virtual environment. The generated source tree and the local
system or Homebrew Python installation are never mutated.

No production action, MRG-9xx work, or MRG-1000 work is performed or authorized. The active goal stops successfully
before Phase MRG-900.
