# BASE-001 Environment Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one safe, complete, application-local `.env.example` to every imported Blockout application.

**Architecture:** Each template mirrors only configuration read by its application, uses the monorepo Compose ports and
database names for local dependencies, and uses explicit replacement values for external credentials. Developers copy
the template to the local filename already loaded by the application: `.env.local` for Java and Expo, and `.env` or
`.env.local` for Python according to the selected scraper argument.

**Tech Stack:** Spring Boot properties, Python dotenv, Expo environment variables, Docker Compose local services.

---

### Task 1: Add backend environment examples

**Files:**

- Create:
  `apps/backend/{clubs,competition,config,matches,mobile-gateway,notification,pools,reports,search,teams,users}-service/.env.example`
- Create: `apps/backend/search-worker/.env.example`
- Create: `apps/backend/club-scraper/.env.example`
- Create: `apps/backend/competition-scraper/.env.example`

- [x] **Step 1: Add local infrastructure values**

Use the fixed application ports from `application.yaml`, PostgreSQL names and ports from
`infra/compose/docker-compose.app.yml`, RabbitMQ `blockout/blockout`, Elasticsearch `localhost:9200`, and the internal
API URLs recorded in `docs/current/source-baseline.md`.

- [x] **Step 2: Add external integration placeholders**

Represent Auth0, AWS, Mapbox, GitHub, Discord, Expo push, and external proxy values with `replace-me` values. Use a
clearly local-only PDF signing secret. Do not copy standalone credentials.

- [x] **Step 3: Remove stale standalone keys from the templates**

Do not carry `DATASOURCE_NAME`, unused resource-server `AUTH0_AUDIENCE`, `GUEST_ISSUER`, `GUEST_JWKS_URI`, `NORD_USER`,
`NORD_PASS`, or unused generic proxy variables when no current application configuration reads them.

### Task 2: Add the mobile environment example

**Files:**

- Create: `apps/frontend/mobile/.env.example`

- [x] **Step 1: Add local backend URLs**

Point the gateway and declared direct API base URLs to the current local application ports and `/api/v1/*` roots.

- [x] **Step 2: Add public integration placeholders**

Include every `EXPO_PUBLIC_*` variable referenced by the mobile source. Use a public MapLibre demo style, safe test
advertising identifiers, and replacement values for Auth0 and RevenueCat.

### Task 3: Document local usage and differences

**Files:**

- Modify: `docs/runbooks/local-development.md`
- Update the temporary local roadmap evidence (removed after the GitFlow migration)

- [x] **Step 1: Document copy conventions**

Explain that Java and Expo load `.env.local`, while the scrapers load `.env` by default and `.env.local` when invoked
with `local`.

- [x] **Step 2: Record the BASE-001 task**

Add BASE-001 to the roadmap and check it only after validation succeeds.

### Task 4: Validate and publish

**Files:**

- Verify: all fifteen `.env.example` files and the documentation diff.

- [x] **Step 1: Validate structure and coverage**

Confirm every application has exactly one tracked `.env.example`, every active source variable is represented, keys are
unique within each file, and the examples contain no standalone secret values.

- [x] **Step 2: Validate repository hygiene**

Run Prettier on Markdown, `git diff --check`, tracked-secret pattern scans, and confirm no `.env` or `.env.local` file
is tracked.

- [x] **Step 3: Publish BASE-001**

Commit the templates and documentation in English, push directly to `main`, verify the exact remote SHA, mark the goal
complete, and stop without starting runtime or refactor work.
