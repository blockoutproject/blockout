#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
revision=$(git rev-parse HEAD)
if [[ -n "$(git status --porcelain)" ]]; then revision="${revision}-dirty"; fi
component=${1:-all}
case "$component" in all|backend-api|backend-worker|backend-migrations) ;; *) echo 'Unknown foundation component' >&2; exit 2;; esac
for app in backend-api backend-worker; do
  if [[ "$component" == all || "$component" == "$app" ]]; then
    docker build --build-arg "BACKEND_APP=$app" --build-arg "APP_REVISION=$revision" -f scripts/backend-foundation/Dockerfile -t "$app:$revision" -t "$app:local" .
  fi
done
if [[ "$component" == all || "$component" == backend-migrations ]]; then
  docker build --build-arg "APP_REVISION=$revision" -f apps/backend/backend-migrations/Migration.Dockerfile -t "backend-migrations:$revision" -t backend-migrations:local .
fi
