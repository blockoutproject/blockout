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

Runs the complete local migration verification, including the current shadow CI
surface and the deterministic generation gates that MRG-802 will later add to CI:
  1. repository configuration
  2. deterministic committed and backend generation
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

COMMITTED_GENERATED_PATHS=(
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

generate_committed_artifacts() {
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-contracts
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/mobile:codegen
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-python-clients
  NX_SKIP_NX_CACHE=true npm exec nx run @blockout/contracts:generate-event-contracts
}

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
npm exec nx run @blockout/contracts:test
npm exec nx run @blockout/contracts:lint-openapi-source
npm exec nx run @blockout/contracts:test-event-contracts
npm run validate:wire-casing
npm run validate:v1-adapter-isolation
npm exec nx run @blockout/contracts:typecheck

echo "== Committed generated artifacts =="
write_manifest "$VERIFY_TMP_DIR/committed-before.txt" "${COMMITTED_GENERATED_PATHS[@]}"
generate_committed_artifacts
write_manifest "$VERIFY_TMP_DIR/committed-pass-1.txt" "${COMMITTED_GENERATED_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/committed-before.txt" \
  "$VERIFY_TMP_DIR/committed-pass-1.txt" \
  "Committed generated artifacts were stale or edited manually. Regenerate them from their authoritative sources."
generate_committed_artifacts
write_manifest "$VERIFY_TMP_DIR/committed-pass-2.txt" "${COMMITTED_GENERATED_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/committed-pass-1.txt" \
  "$VERIFY_TMP_DIR/committed-pass-2.txt" \
  "Committed artifact generation is not deterministic across two uncached runs."

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
python3 -m venv "$VERIFY_TMP_DIR/python-venv"
PYTHON_VENV_BIN="$VERIFY_TMP_DIR/python-venv/bin"
mkdir -p "$VERIFY_TMP_DIR/python-wheel"
cp -R \
  libs/shared/contracts/clients/python \
  "$VERIFY_TMP_DIR/python-client-source"
"$PYTHON_VENV_BIN/python" -m pip wheel \
  --no-deps \
  --wheel-dir "$VERIFY_TMP_DIR/python-wheel" \
  "$VERIFY_TMP_DIR/python-client-source"
PYTHON_CLIENT_WHEELS=("$VERIFY_TMP_DIR"/python-wheel/*.whl)
if [[ "${#PYTHON_CLIENT_WHEELS[@]}" -ne 1 || ! -f "${PYTHON_CLIENT_WHEELS[0]}" ]]; then
  echo "Expected exactly one generated Python client wheel." >&2
  exit 1
fi
"$PYTHON_VENV_BIN/python" -m pip install "${PYTHON_CLIENT_WHEELS[0]}"
PATH="$PYTHON_VENV_BIN:$PATH" npm exec nx run @blockout/contracts:test-python-clients
PATH="$PYTHON_VENV_BIN:$PATH" npm exec nx run @blockout/competition-scraper:syntax-check
PATH="$PYTHON_VENV_BIN:$PATH" npm exec nx run @blockout/club-scraper:syntax-check
docker build --file apps/scrapers/competition-scraper/Dockerfile --tag blockout-shadow/competition-scraper:local .
docker build --file apps/scrapers/club-scraper/Dockerfile --tag blockout-shadow/club-scraper:local .

echo "== Local Compose =="
docker compose --file infra/compose/docker-compose.third-party.yml --file infra/compose/docker-compose.app.yml config --quiet

echo "== Final checks =="
write_manifest "$VERIFY_TMP_DIR/committed-final.txt" "${COMMITTED_GENERATED_PATHS[@]}"
require_identical_manifests \
  "$VERIFY_TMP_DIR/committed-pass-2.txt" \
  "$VERIFY_TMP_DIR/committed-final.txt" \
  "A later verification step modified committed generated artifacts."
git diff --check

echo "Local PR CI verification completed."
