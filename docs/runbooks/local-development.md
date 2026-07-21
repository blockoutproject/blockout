# Local Development

## Prerequisites

- Node.js 22 and npm 10
- Java 21 and Maven 3.9
- Python 3.12
- Docker with Compose
- Android or iOS tooling only when running a native mobile build

Install the root JavaScript workspace once:

```bash
npm ci
```

## Application environments

Every application owns a committed `.env.example`. The examples use the ports, database names, and local credentials
declared by the monorepo Compose files. Values containing `replace-me` require a development credential or an
environment-specific endpoint before the related integration can work.

Java applications already import `.env.local` from their application directory. For example:

```bash
cd apps/backend/clubs-service
cp .env.example .env.local
```

Expo also loads `.env.local` from the mobile application directory:

```bash
cd apps/frontend/mobile
cp .env.example .env.local
```

The mobile examples use `localhost`. Replace it with the host machine address when running on a physical device.

The Python scrapers load `.env` by default and `.env.local` when started with the `local` argument:

```bash
cd apps/backend/club-scraper
cp .env.example .env
python3.12 main.py

cp .env.example .env.local
python3.12 main.py local
```

The templates intentionally omit stale standalone variables that the imported applications no longer read, including
`DATASOURCE_NAME`, the old guest issuer settings, and the competition scraper's unused proxy-account variables. External
Auth0, AWS, Mapbox, RevenueCat, GitHub, Discord, Expo push, and FFVB proxy integrations still require valid development
values where used.

List every project and inspect one project's native targets:

```bash
npm exec nx show projects
npm exec nx show project @blockout/clubs-service
npm exec nx show project @blockout/mobile
```

## Local infrastructure

Start the application databases and the shared third-party services:

```bash
docker compose \
  -f infra/compose/docker-compose.app.yml \
  -f infra/compose/docker-compose.third-party.yml \
  up -d
```

Stop them without deleting local database volumes:

```bash
docker compose \
  -f infra/compose/docker-compose.app.yml \
  -f infra/compose/docker-compose.third-party.yml \
  down
```

The local database username, password, and database name all match the bounded context name. RabbitMQ uses `blockout`
for both the local username and password. pgAdmin uses `admin@blockout.com` and `admin`. These values are local
development defaults only.

## Java applications

Build the complete backend reactor without running tests:

```bash
mvn -f pom.xml clean package -DskipTests
```

Run a single native Maven target through Nx:

```bash
npm exec nx run @blockout/clubs-service:mvn-package
```

For a database-backed service, use the matching local database port. Example placeholders for clubs service:

```bash
export DATASOURCE_URL=jdbc:postgresql://localhost:5437/clubs
export DATASOURCE_USERNAME=clubs
export DATASOURCE_PASSWORD=clubs
export RABBITMQ_HOST=localhost
export RABBITMQ_PORT=5672
export RABBITMQ_USERNAME=blockout
export RABBITMQ_PASSWORD=blockout
export AUTH0_ISSUER=https://example.invalid/
```

Replace authentication placeholders with valid development tenant values before starting an application that validates
tokens or requests machine credentials. Internal API URLs use the application ports recorded in the source baseline.

## Mobile application

Start Expo through Nx:

```bash
npm exec nx run @blockout/mobile:start
```

Load the public Expo configuration or create a local Android export:

```bash
cd apps/frontend/mobile
npm exec expo config -- --type public
cd ../../..
npm exec nx run @blockout/mobile:export -- --platform android
```

Verify the mobile TypeScript sources through Nx:

```bash
npm exec -- nx run @blockout/mobile:typecheck
npm exec -- nx run @blockout/mobile:test
npm exec -- nx run @blockout/mobile:web-export
```

React Native Web is a local characterization aid, not a supported desktop product. When inspecting it in a browser,
use a phone-sized viewport such as 390 x 844 rather than treating a 1920 x 1080 layout as an acceptance target.

Run native debug builds from the mobile application directory when the matching SDK is installed:

```bash
cd apps/frontend/mobile
npm run ios
npm run android
```

The Android emulator can reach a gateway running on the host through `adb reverse tcp:8089 tcp:8089`. The iOS simulator
can use `localhost`; a physical device requires the host machine address in its ignored `.env.local`.

## Python scrapers

The scrapers intentionally keep their standalone `requirements.txt` files and Dockerfiles. Nx only invokes native
commands.

```bash
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/club-scraper:docker-build
npm exec nx run @blockout/competition-scraper:docker-build
```

Running a scraper outside Docker requires installing its declared requirements in a local Python 3.12 environment. Use
non-secret development values for `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, and the
required `*_API_URL` variables.
