# Continuous Integration

Blockout follows the Maaatch CI shape while preserving each imported application's native toolchain. Nx is the thin
orchestration layer around OpenAPI scripts, Maven, uv/Python, and Expo.

## Branch Coverage

The repository has three non-deployment workflows:

| Workflow          | Pull requests targeting | Pushes to            |
| ----------------- | ----------------------- | -------------------- |
| `CI Pull Request` | `develop` and `main`    | Not applicable       |
| `CI Push`         | Not applicable          | `develop` and `main` |
| `Format`          | `develop` and `main`    | `develop` and `main` |

These workflows validate source only. They do not deploy, publish production artifacts, sign applications, or contact
production providers.

## Stable Checks

Pull requests expose the following stable workflow/job coordinates:

| Workflow          | Job check name                | Purpose                                                     |
| ----------------- | ----------------------------- | ----------------------------------------------------------- |
| `CI Pull Request` | `contracts`                   | Test and generate the shared OpenAPI artifact source        |
| `CI Pull Request` | `backend`                     | Verify the Java 21 backend against its local dependencies   |
| `CI Pull Request` | `python`                      | Generate and test clients, then lint and test both scrapers |
| `CI Pull Request` | `frontend`                    | Generate, lint, typecheck, test, and export the Expo app    |
| `Format`          | `Check repository formatting` | Check Prettier, Spotless, and Ruff through one command      |

Use the live check-run names when configuring repository rules. The workflow name identifies the source when GitHub
renders a coordinate such as `CI Pull Request / contracts`; the job check name is the stable check context. `CI Push`
uses the same `contracts`, `backend`, `python`, and `frontend` job names as post-push evidence, with backend compilation
instead of the pull-request verification suite.

## Local Equivalents

Install the locked dependencies first:

```bash
npm ci --legacy-peer-deps
uv sync --locked --all-packages
```

Run the contract boundary before downstream consumers:

```bash
npm exec nx run @blockout/contracts:test
npm exec nx run @blockout/contracts:generate-contracts
git diff --exit-code -- apps/backend/pom.xml
```

Run the Python boundary:

```bash
npm exec nx run @blockout/python-contract-clients:generate
npm exec nx run @blockout/python-contract-clients:test
npm exec -- nx run-many --targets=lint --projects=@blockout/club-scraper,@blockout/competition-scraper
npm exec -- nx run-many --targets=syntax-check --projects=@blockout/club-scraper,@blockout/competition-scraper
npm exec -- nx run-many --targets=test --projects=@blockout/club-scraper,@blockout/competition-scraper
```

For the pull-request backend boundary, prepare ignored `.env.local` files from the examples, start the exact Compose
dependencies listed in [`ci-pr.yml`](../../.github/workflows/ci-pr.yml), then run:

```bash
mvn -f apps/backend/pom.xml verify
```

The lighter post-push backend equivalent is:

```bash
mvn -f apps/backend/pom.xml -DskipTests compile
```

Run the mobile boundary with the safe non-secret CI values declared in the workflow:

```bash
npm exec nx run @blockout/mobile:codegen
npm exec nx run @blockout/mobile:lint
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:test
npm exec nx run @blockout/mobile:export
```

Finish every repository change with:

```bash
npm run format
npm run format:check
git diff --check
```

Generated OpenAPI bundles, generated Python clients, generated mobile clients, local environments, credentials, logs,
caches, and build output remain ignored and must not be staged.
