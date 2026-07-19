# MRG-433 Nx Python And uv Workspace

## Scope

MRG-433 moves the club scraper, competition scraper, and private generated contract-client wheel into one Python 3.12
uv workspace. It changes dependency, generation, packaging, Docker, and verification ownership only. Scraper
schedules, provider/federation calls, Blockout calls, Auth0 credentials, ports, deployment, and production behavior
remain unchanged.

Maaatch was inspected only as a structural reference: deployables remain under `apps`, shared contract authority
remains under `libs/shared`, and generated output remains outside Git.

## Workspace And Nx Ownership

- Root `pyproject.toml`, `.python-version`, and `uv.lock` own the three-member workspace and Python 3.12 constraint.
- uv is pinned to 0.11.29. The one root `.venv` is ignored; the one root `uv.lock` is committed.
- Both scraper members are non-package applications and declare the buildable `blockout-contract-clients` member as an
  explicit `{ workspace = true }` dependency.
- `@blockout/contracts:generate-python-clients` remains generation authority.
- `@blockout/python-contract-clients:sync`, `:test`, and `:build` own locked sync, fixtures, and wheel creation.
- Scrapers preserve the public `serve`, `syntax-check`, and `docker-build` target names.

`@nxlv/python` is pinned to 22.2.2 and is deliberately narrow: it supplies uv dependency edges, sync, and shared-venv
activation. `inferDependencies` is false, and no experimental package sync generator is configured.

## Plugin Evaluation

Local Nx 23 inspection discovers all three Python projects and reports one implicit edge from each scraper to
`@blockout/python-contract-clients`, derived from explicit workspace metadata. The sync executor runs the required
`uv sync --locked --all-packages`, and run-command targets activate the root `.venv`.

The pre-adoption npm audit snapshot reported 17 high and 3 critical findings in the existing workspace. The final
audit still reports 17 high findings and no high or critical finding linked to `@nxlv/python`. The plugin contributes
two moderate entries through its nested `uuid@9.0.1`; version 22.2.2 has no plugin-side fix for that advisory. This is
accepted under the MRG-433 stop rule, which rejects any added high or critical finding. A future plugin upgrade must
repeat the graph, executor, and differential-audit proof before changing the pin.

## Shared Enum Generation

MRG-433 originally classified `DataSourcePriorityEnum` as shared OpenAPI source and installed a blanket handwritten-
enum ban. MRG-435 supersedes that ownership decision: source precedence is competition-scraper application policy, so
`DataSourcePriority` is local, while `Format`, `Gender`, `MatchStatus`, and other wire concepts remain generated from
OpenAPI. The seventh model-only `blockout_contract_clients.shared` namespace remains in the same private wheel for real
shared contract schemas.

The MRG-435 AST guard derives contract enum names and member/value fingerprints from authoritative shared schemas. It
rejects handwritten contract mirrors without a manual allowlist while permitting distinct application enums.

## Docker And Runtime Parity

MRG-433 originally used a separate uv source stage, a Python builder, and a Python final stage. MRG-436 supersedes that
container shape with one Python 3.12 builder and one Python 3.12 runtime: the pinned uv binary is copied directly into
the builder, the selected package is synced once with `--locked --no-dev --no-editable`, and the resulting environment
is copied to the final image. uv, Nx, test tools, and executable validation remain outside the runtime image.

`WORKDIR=/app`, `TZ=UTC`, `CMD ["python", "main.py"]`, exposed ports, and existing target tags remain preserved. The
MRG-433 distribution table below is historical completion evidence, not a requirement to retain unused packages.
MRG-436 requires behavioral runtime parity and explicitly removes unused `pytest`, `aioresponses`, and `faker`
distributions plus their now-unneeded transitive dependencies.

The before/after image comparison excludes only bootstrap `pip`, `setuptools`, and `wheel` distributions:

| Image               | Reference distributions | Migrated distributions | Version parity |
| ------------------- | ----------------------: | ---------------------: | -------------- |
| club scraper        |                      43 |                     43 | exact          |
| competition scraper |                      45 |                     45 | exact          |

Both migrated images import their generated clients, shared models, and active adapters. Each process remained alive for
three seconds with networking disabled and placeholder environment values, matching the reference smoke. Python is
3.12.13 in both before and after images.

## CI And Generated Ownership

PR CI, Push CI, and the local verifier use official setup-uv with uv 0.11.29, locked workspace sync, and Nx targets for
the client tests/build, scraper syntax, and image builds. Contract generation remains clean-checkout authoritative and
transfers ignored Python sources exactly as before. The 23 existing Python fixtures now also cover the shared namespace
and integer enum values. No generated source, wheel, `.venv`, or cache is tracked.

## Rollback

If the plugin graph, uv resolver, wheel, Docker runtime, or deterministic generation regresses, revert MRG-433 as one
unit: remove the plugin and root Python workspace metadata, restore the two scraper `requirements.txt` files and prior
Docker stages as historical source, restore the old CI/local commands, and restore the prior enum ownership. MRG-435
and MRG-436 are later independent corrections and must be evaluated before applying that historical rollback literally.
Generated outputs require no Git cleanup because they remain ignored. No production rollback or data migration is
required because MRG-433 changes no deployed behavior or persistent state.
