# MRG-436 Simple Scraper Containers

## Scope

MRG-436 keeps the root Python 3.12 uv workspace, its one committed lockfile, and the narrow Nx integration established
by MRG-433. It changes only container packaging and unused dependency ownership. Scraper schedules, provider and
federation calls, Blockout calls, credentials, ports, image tags, deployment, and production behavior remain unchanged.

Maaatch remains a read-only structural reference: deployables live under `apps`, contract clients under `libs/shared`,
and generated sources stay ignored and untracked. No Maaatch code or Dockerfile is copied.

## Container Shape

Each scraper Dockerfile has exactly two stages:

1. A `python:3.12-alpine` builder copies `/uv` from the official uv 0.11.29 image, copies only workspace metadata and
   the generated private client source required for resolution, and runs one `uv sync --locked --package ... --no-dev
--no-editable` command.
2. A `python:3.12-alpine` runtime copies the resulting virtual environment and its owning application.

The runtime contains no uv binary, Nx, validation command, shared Docker helper, or test tool. `WORKDIR=/app`, `TZ=UTC`,
`CMD ["python", "main.py"]`, ports, and Nx-owned image tags keep their existing contract. Import, structure, dependency,
and offline startup checks run outside Docker through repository validation.

## Dependency Ownership

`pytest`, `aioresponses`, and `faker` were installed in both images but are not imported by either scraper or by the 24
generated-client boundary fixtures. They and their unused transitive-only packages are removed from both member
dependency lists and the shared lock. No empty development group replaces them. Retained runtime dependencies keep
their locked versions.

`validate:scraper-containers` rejects extra stages, uv in the runtime, executable import checks, multiple package syncs,
the removed tools, or an empty dependency group. PR CI, Push CI, and the complete local verifier run this guard before
the image builds.

## Evidence

The locked workspace resolves 41 packages and syncs all three members with uv 0.11.29 on Python 3.12. The narrow Nx
graph retains one implicit edge from each scraper to `@blockout/python-contract-clients`. The 24 client and adapter
fixtures, both syntax checks, clean wheel build and import, deterministic generations, generated-file ownership guard,
and complete local PR verifier pass.

The competition runtime contains 38 distributions and the club runtime contains 36; retained direct dependencies keep
their locked versions. Both images use Python 3.12.13, import their generated clients and active adapters, expose the
same `/app`, `TZ=UTC`, and `python main.py` metadata, and contain neither uv nor the three removed test tools. Both
processes remained alive for five seconds with networking disabled and placeholder environment values.

## Compatibility And Rollback

Acceptance is runtime behavioral parity rather than exact equality with the historical distribution list. Both images
must retain their direct runtime imports, generated client and adapter imports, Python 3.12 runtime contract, metadata,
and offline placeholder-environment startup. The final image must not contain uv or the three removed test tools.

Rollback reverts the MRG-436 source commit as one unit, restoring the previous Docker stages and dependency lock. It
requires no database, event, broker, credential, deployment, or production action. Generated sources remain ignored,
and no MRG-9xx or MRG-1000 work is planned, authorized, executed, or published.
