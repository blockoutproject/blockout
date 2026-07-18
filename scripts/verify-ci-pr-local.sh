#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Long Maven generation can invalidate Nx plugin workers in the local daemon.
# Each verification command resolves the live project graph independently.
export NX_DAEMON=false

SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --skip-install)
      SKIP_INSTALL=true
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: scripts/verify-ci-pr-local.sh [--skip-install]

Runs the complete local migration verification, including the current shadow CI
surface and the deterministic generation gates that MRG-802 will later add to CI:
  1. repository configuration
  2. deterministic ignored and backend generation
  3. formatting and compilation
  4. mobile
  5. scrapers
  6. local Compose

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

VERIFY_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/blockout-local-verification.XXXXXX")"
trap 'rm -rf "$VERIFY_TMP_DIR"' EXIT

GENERATED_OUTPUT_PATHS=(
  apps/backend/pom.xml
  apps/backend/event-contracts/src/generated/java
  apps/frontend/mobile/src/api/generated/mobile-gateway
  libs/shared/contracts/clients/python/src
  libs/shared/contracts/generated/events
  libs/shared/contracts/generated/specs
)

write_manifest() {
  local destination="$1"
  shift
  node tools/scripts/generated-artifact-manifest.mjs "$@" >"$destination"
}

require_identical_manifests() {
  local expected="$1"
  local actual="$2"
  local failure_message="$3"
  if ! diff -u "$expected" "$actual"; then
    echo "$failure_message" >&2
    exit 1
  fi
}

generate_contract_artifacts() {
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-contracts
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/mobile:codegen
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-python-clients
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-event-contracts
}

echo "== Environment =="
node --version
java -version
docker ps >/dev/null
MRG433_UV_VERSION="$(uv --version)"
if [[ "$MRG433_UV_VERSION" != uv\ 0.11.29* ]]; then
  echo "MRG-433 requires uv 0.11.29; found $MRG433_UV_VERSION." >&2
  exit 1
fi

if [[ "$SKIP_INSTALL" == false ]]; then
  echo "== Install =="
  npm ci
fi

echo "== Initial contract generation =="
write_manifest "$VERIFY_TMP_DIR/backend-config-before.txt" apps/backend/pom.xml
generate_contract_artifacts
write_manifest "$VERIFY_TMP_DIR/backend-config-after.txt" apps/backend/pom.xml
require_identical_manifests \
  "$VERIFY_TMP_DIR/backend-config-before.txt" \
  "$VERIFY_TMP_DIR/backend-config-after.txt" \
  "The committed backend schemaMappings block is stale. Regenerate it before verification."

uv lock --check
npm exec nx run @blockout/python-contract-clients:sync

echo "== Repository configuration =="
npm run validate:env
npm run validate:docs
npm run validate:backend-enums-generated
npm run validate:python-enums-generated
npm run validate:generated-untracked
npm exec nx show projects
npm exec nx run @blockout/contracts:test
npm exec nx run @blockout/contracts:lint-openapi-source
npm exec nx run @blockout/contracts:test-event-contracts
npm run validate:wire-casing
npm run validate:v1-adapter-isolation
npm exec nx run @blockout/contracts:typecheck

echo "== Ignored generated artifacts =="
write_manifest "$VERIFY_TMP_DIR/generated-pass-1.txt" "${GENERATED_OUTPUT_PATHS[@]}"
generate_contract_artifacts
write_manifest "$VERIFY_TMP_DIR/generated-pass-2.txt" "${GENERATED_OUTPUT_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/generated-pass-1.txt" \
  "$VERIFY_TMP_DIR/generated-pass-2.txt" \
  "Contract artifact generation is not deterministic across two uncached runs."

echo "== Backend generation =="
mvn -f apps/backend/pom.xml -DskipTests clean generate-sources
BACKEND_GENERATED_PATHS=()
while IFS= read -r directory; do
  BACKEND_GENERATED_PATHS+=("$directory")
done < <(
  find apps/backend \
    -path '*/target/generated-sources/openapi/*/src/main/java' \
    -type d \
    -prune \
    | sort
)
if [[ "${#BACKEND_GENERATED_PATHS[@]}" -eq 0 ]]; then
  echo "Backend generation produced no OpenAPI Java source directories." >&2
  exit 1
fi
write_manifest "$VERIFY_TMP_DIR/backend-pass-1.txt" "${BACKEND_GENERATED_PATHS[@]}"
mvn -f apps/backend/pom.xml -DskipTests generate-sources
write_manifest "$VERIFY_TMP_DIR/backend-pass-2.txt" "${BACKEND_GENERATED_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/backend-pass-1.txt" \
  "$VERIFY_TMP_DIR/backend-pass-2.txt" \
  "Backend OpenAPI generation is not deterministic across two runs."

echo "== Formatting =="
FORMATTABLE_CHANGED_PATHS=()
while IFS= read -r file; do
  case "$file" in
    *.json|*.md|*.yaml|*.yml|*.js|*.cjs|*.mjs|*.ts|*.tsx)
      FORMATTABLE_CHANGED_PATHS+=("$file")
      ;;
  esac
done < <(
  {
    git diff --name-only --diff-filter=ACMR
    git ls-files --others --exclude-standard
  } | sort -u
)
if [[ "${#FORMATTABLE_CHANGED_PATHS[@]}" -gt 0 ]]; then
  npm exec -- prettier --check "${FORMATTABLE_CHANGED_PATHS[@]}"
else
  echo "No changed Prettier-supported files require a formatting check."
fi

echo "== Backend compilation =="
mvn -f apps/backend/pom.xml -DskipTests compile
for file in apps/backend/*/Dockerfile; do
  docker build --check --file "$file" apps/backend
done

echo "== Mobile =="
npm exec nx run @blockout/mobile:validate-form-boundary
npm exec nx run @blockout/mobile:test-form-contracts
npm exec nx run @blockout/mobile:typecheck
npm exec nx run @blockout/mobile:export --platform=android

echo "== Scrapers =="
npm exec nx run @blockout/python-contract-clients:test
npm exec nx run @blockout/python-contract-clients:build
PYTHON_CLIENT_WHEELS=(libs/shared/contracts/clients/python/dist/*.whl)
if [[ "${#PYTHON_CLIENT_WHEELS[@]}" -ne 1 || ! -f "${PYTHON_CLIENT_WHEELS[0]}" ]]; then
  echo "Expected exactly one generated Python client wheel." >&2
  exit 1
fi
uv run --isolated --no-project --with "${PYTHON_CLIENT_WHEELS[0]}" python -c \
  "import blockout_contract_clients.shared, blockout_contract_clients.config_service, blockout_contract_clients.matches_service"
npm exec nx run @blockout/competition-scraper:syntax-check
npm exec nx run @blockout/club-scraper:syntax-check
npm exec nx run @blockout/competition-scraper:docker-build:local
npm exec nx run @blockout/club-scraper:docker-build:local

echo "== Local Compose =="
docker compose --file infra/compose/docker-compose.third-party.yml --file infra/compose/docker-compose.app.yml config --quiet

echo "== Final checks =="
write_manifest "$VERIFY_TMP_DIR/generated-final.txt" "${GENERATED_OUTPUT_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/generated-pass-2.txt" \
  "$VERIFY_TMP_DIR/generated-final.txt" \
  "A later verification step modified generated artifacts."
npm run validate:generated-untracked
uv lock --check
git diff --check

echo "Local PR CI verification completed."
