#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# The fixed project/file prevent inherited Compose configuration from targeting another stack.
endpoint=${DOCKER_HOST:-$(docker context inspect --format '{{.Endpoints.docker.Host}}')}
case "$endpoint" in unix://*) ;; *) echo 'Foundation lifecycle requires a local Unix Docker socket' >&2; exit 2;; esac
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml)
case "${1:-}" in
  up) "${compose[@]}" up -d --wait --wait-timeout 180 ;;
  observe) "${compose[@]}" --profile observability up -d --wait --wait-timeout 180 ;;
  down) "${compose[@]}" --profile observability down ;;
  reset) "${compose[@]}" --profile observability down --volumes; "${compose[@]}" up -d --wait --wait-timeout 180 ;;
  *) echo 'Usage: local.sh up|observe|down|reset' >&2; exit 2 ;;
esac
