# Blockout Repository Profile

This overlay supplies Blockout-specific values to the portable references selected by the repository router.

## Product Authorities

- Runtime posture: `docs/current/blockout-product-runtime-context.md`
- System model: `docs/architecture/blockout-system-model-v1.md`
- Mobile model: `docs/architecture/blockout-mobile-model-v1.md`
- Ingestion model: `docs/architecture/blockout-ingestion-model-v1.md`
- Delivered baseline: `docs/releases/blockout-v1-baseline.md`
- Maaatch is read-only structural guidance and never supplies Blockout behavior or business code.

## Repository Layout And Versions

- Backend reactor: `apps/backend/pom.xml`
- Java: 21 with repository-pinned Spring Boot and Maven configuration
- Python: 3.12 with Ruff and uv
- Mobile: `apps/frontend/mobile`, iOS and Android only
- Club scraper: `apps/backend/club-scraper`
- Competition scraper: `apps/backend/competition-scraper`
- Mobile routes: `apps/frontend/mobile/src/app`
- Mobile features: `apps/frontend/mobile/src/modules/<feature>`
- Mobile shared boundaries: `src/shared/api`, `src/shared/config`, `src/shared/providers`, `src/shared/theme`, and
  `src/shared/ui`
- Shared contract sources: `libs/shared/contracts/specs/source/**`
- Bundled contract mirrors: `libs/shared/contracts/generated/specs/*.json`
- Java generated sources: `apps/backend/*/target/generated-sources/**`
- Python generated clients: `libs/shared/python-contract-clients/src/blockout_contract_clients/*/**`
- Mobile generated client: `apps/frontend/mobile/src/shared/generated/**`
- Java generated transport package: `com.blockout.shared.model`
- Python internal API adapters: `infrastructure/blockout`
- Python scraper local package: `scraper`
- Reusable Java container test support: `testkit/containers`
- Workspace task runner: Nx
- Python formatter and linter: repository-pinned Ruff
- Public application gateway: `mobile-gateway`

## Contract Generation

```bash
npm exec nx run @blockout/contracts:generate-contracts
npm exec nx run @blockout/python-contract-clients:generate
mvn -f apps/backend/pom.xml -DskipTests generate-sources
```

The mobile client is generated from the mobile-gateway contract with Orval. Python clients are built as one shared
wheel with one declarative batch entry per adopted contract.

## Application Conventions

- Repository-owned HTTP fields use native camelCase.
- Structured application logs are JSON on standard output. Java uses Logback with the Logstash encoder.
- Current provider adapters include FFVB, LNV, Auth0, Expo, Mapbox, GitHub, Discord, and S3 boundaries.
- The imported standalone applications remain the behavioral baseline unless an active issue authorizes correction.
