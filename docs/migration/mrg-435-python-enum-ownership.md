# MRG-435 Python Enum Ownership

## Ownership

Blockout contract enums are generated only when OpenAPI or AsyncAPI owns their wire meaning. Python reuse alone does
not make a concept contractual. `DataSourcePriority` controls competition-scraper reconciliation order and never
crosses a Blockout wire, so it is a local `IntEnum` with stable values `DB=0`, `FFVB=1`, `LNV_XML=2`, and `LNV_HTML=3`.

`Format`, `Gender`, `MatchStatus`, and every other OpenAPI-owned enum remain authoritative under
`libs/shared/contracts/specs/source/shared/schemas` and generated into the private client wheel. The model-only shared
namespace remains active for those real contract schemas, and everything below the generated Python `src/**` remains
ignored and untracked.

## Enforcement

The Python enum guard reads the committed shared OpenAPI schema fragments and builds the contract enum catalog at run
time. It parses scraper Python with the standard AST and rejects either a matching contract concept name or an exact
member/value fingerprint. Distinct local `Enum`, `IntEnum`, and `StrEnum` declarations are allowed; no handwritten
allowlist exists.

PR CI, Push CI, and the local verifier run `validate:python-enum-ownership`. The previous blanket handwritten-enum
guard is removed. Generated service-specific enums remain confined to Blockout adapters, and provider or application
models do not become contract source by convenience.

The Nx Python-client generation cache hashes the authoritative OpenAPI source fragments directly. A schema deletion
therefore invalidates generated output before dependent test or build targets can restore a stale cached client.

## Compatibility And Rollback

Only the Python import owner changes. Integer comparisons and scheduling, provider, Blockout request, authentication,
retry, parsing, cache, metric, and logging behavior remain unchanged. The backend generated schema mapping and private
wheel stop containing the unused false contract enum after authoritative regeneration.

Rollback restores the MRG-435 source commit as one unit. It requires no database, event, deployment, credential, or
production action. No generated source is tracked, and no MRG-9xx or MRG-1000 work is planned, authorized, executed,
or published.
