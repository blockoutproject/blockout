#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --skip-install)
      SKIP_INSTALL=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/verify-ci-pr-local.sh [--skip-install]

Runs the local equivalent of .github/workflows/ci-pr.yml:
  1. repository configuration
  2. backend
  3. mobile
  4. scrapers
  5. local Compose

Options:
  --skip-install  Do not run npm ci before the checks.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f package-lock.json || ! -f apps/backend/pom.xml ]]; then
  echo "Run this script from inside the Blockout repository." >&2
  exit 1
fi

echo "== Environment =="
node --version
java -version
docker ps >/dev/null

if [[ "$SKIP_INSTALL" == false ]]; then
  echo "== Install =="
  npm ci
fi

echo "== Repository configuration =="
npm run validate:env
npm run validate:docs
npm exec nx show projects
npm exec nx run @blockout/contracts:typecheck

echo "== Backend =="
mvn -f apps/backend/pom.xml -DskipTests compile
for file in apps/backend/*/Dockerfile; do
  docker build --check --file "$file" apps/backend
done

echo "== Mobile =="
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:export --platform=android

echo "== Scrapers =="
npm exec nx run @blockout/contracts:generate-python-clients
npm exec nx run @blockout/contracts:generate-python-clients --skip-nx-cache
test -z "$(git status --porcelain -- libs/shared/contracts/clients/python/src)"
python3 -m pip install libs/shared/contracts/clients/python
npm exec nx run @blockout/contracts:test-python-clients
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/club-scraper:syntax-check
docker build --file apps/scrapers/competition-scraper/Dockerfile --tag blockout-shadow/competition-scraper:local .
docker build --file apps/scrapers/club-scraper/Dockerfile --tag blockout-shadow/club-scraper:local .

echo "== Local Compose =="
docker compose --file infra/compose/docker-compose.third-party.yml --file infra/compose/docker-compose.app.yml config --quiet

echo "== Final checks =="
git diff --check

echo "Local PR CI verification completed."
