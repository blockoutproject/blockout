#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# The fixed project/file prevent inherited Compose configuration from targeting another stack.
endpoint=${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}
case "$endpoint" in unix://*) ;; *) echo 'Foundation lifecycle requires a local Unix Docker socket' >&2; exit 2;; esac
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml)
case "${1:-}" in
  up) "${compose[@]}" up -d --wait --wait-timeout 180 ;;
  down) "${compose[@]}" down ;;
  reset) "${compose[@]}" down --volumes; "${compose[@]}" up -d --wait --wait-timeout 180 ;;
  *) echo 'Usage: local.sh up|down|reset' >&2; exit 2 ;;
esac
