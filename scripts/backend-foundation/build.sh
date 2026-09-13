#!/usr/bin/env bash

# Builds selected replacement images locally; accepts all|core-service|core-worker|migrations.
# Tags each image with the source revision (and dirty suffix when needed); never publishes images.
set -euo pipefail
cd "$(dirname "$0")/../.."
revision=$(git rev-parse HEAD)
if [[ -n "$(git status --porcelain)" ]]; then revision="${revision}-dirty"; fi
component=${1:-all}
case "$component" in all|core-service|core-worker|migrations) ;; *) echo 'Unknown foundation component' >&2; exit 2;; esac
for app in core-service core-worker; do
  if [[ "$component" == all || "$component" == "$app" ]]; then
    docker build --build-arg "BACKEND_APP=$app" --build-arg "APP_REVISION=$revision" -f scripts/backend-foundation/Dockerfile -t "$app:$revision" -t "$app:local" .
  fi
done
if [[ "$component" == all || "$component" == migrations ]]; then
  docker build --build-arg "APP_REVISION=$revision" -f apps/backend/migrations/Migration.Dockerfile -t "migrations:$revision" -t migrations:local .
fi
