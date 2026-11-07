#!/usr/bin/env bash
# Deploy one immutable candidate through the existing Dokploy Raw Compose resource.
# Native configuration and maintenance remain operator-owned; uncertain writes are never retried.
set +x
set -euo pipefail
umask 077

for input in DOKPLOY_URL DOKPLOY_COMPOSE_ID DOKPLOY_TOKEN PREPRODUCTION_API_URL GITHUB_RUN_ID GITHUB_RUN_ATTEMPT GITHUB_SHA; do
  [[ -n "${!input:-}" ]] || { printf 'Missing required input: %s\n' "$input" >&2; exit 1; }
done
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
title="GitHub ${GITHUB_RUN_ID}/${GITHUB_RUN_ATTEMPT}"
deployment_id=""

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

# Curl fails without printing response bodies, including private Compose environment values.
dokploy() {
  local route=$1
  shift
  curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    --header "x-api-key: $DOKPLOY_TOKEN" "${DOKPLOY_URL%/}/api/$route" "$@"
}

# Keep the native deployment history private; only IDs and known terminal states reach logs.
load_deployments() {
  dokploy deployment.allByCompose --get --data-urlencode "composeId=$DOKPLOY_COMPOSE_ID" > "$work/deployments.json"
  jq -e 'type == "array"' "$work/deployments.json" > /dev/null 2>&1 || fail "Invalid Dokploy deployment history."
}

printf 'services:\n' > "$work/images.yaml"
for application in backend collector migration; do
  image=$(cat "candidate/$application.image")
  [[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || fail "Invalid $application digest reference."
  printf '  %s:\n    image: %s\n' "$application" "$image" >> "$work/images.yaml"
done
# Preserve private interpolation and relative native file mounts. Dokploy owns the project name.
docker compose --project-name blockout-preproduction --env-file /dev/null \
  --file infra/dokploy/compose.yaml --file infra/dokploy/opensearch.backend.compose.yaml \
  --file "$work/images.yaml" config --no-interpolate --no-path-resolution --no-normalize \
  | sed '/^name:/d' > "$work/compose.yaml"

printf 'Waiting for the existing Dokploy delivery to finish.\n'
deadline=$((SECONDS + 1800))
while :; do
  load_deployments
  dokploy deployment.queueList > "$work/queue.json"
  jq -e 'type == "array"' "$work/queue.json" > /dev/null 2>&1 || fail "Invalid Dokploy queue."
  running=$(jq '[.[] | select(.status == "running")] | length' "$work/deployments.json")
  queued=$(jq --arg id "$DOKPLOY_COMPOSE_ID" '[.[] | select(.data.composeId == $id)] | length' "$work/queue.json")
  [[ "$running" == 0 && "$queued" == 0 ]] && break
  ((SECONDS < deadline)) || fail "Dokploy is still busy; no configuration was changed."
  sleep 10
done
jq -e --arg title "$title" 'all(.[]; .title != $title)' "$work/deployments.json" > /dev/null \
  || fail "This GitHub attempt already has a deployment; inspect its native record."

# F12 activation uses the operator's existing session; the bridge only checks the public state.
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
  "${PREPRODUCTION_API_URL%/}/application-access" > "$work/access.json"
jq -e '.maintenance.active == true' "$work/access.json" > /dev/null 2>&1 \
  || fail "Activate preproduction maintenance before deployment."

jq -n --arg composeId "$DOKPLOY_COMPOSE_ID" --rawfile composeFile "$work/compose.yaml" \
  '{composeId: $composeId, composeFile: $composeFile}' > "$work/update.json"
# Updating only composeFile preserves private env, custom command, domains and file mounts.
dokploy compose.update --header 'Content-Type: application/json' \
  --data-binary "@$work/update.json" --output /dev/null
jq -n --arg composeId "$DOKPLOY_COMPOSE_ID" --arg title "$title" --arg revision "$GITHUB_SHA" \
  '{composeId: $composeId, title: $title, description: $revision, freshVolumes: false}' > "$work/deploy.json"
dokploy compose.deploy --header 'Content-Type: application/json' \
  --data-binary "@$work/deploy.json" --output /dev/null

# v0.31 returns no deployment ID when enqueueing. Discover our exact title, then follow its ID.
printf 'Following Dokploy deployment for %s.\n' "$title"
deadline=$((SECONDS + 1800))
while :; do
  load_deployments
  match=$(jq -r --arg title "$title" --arg id "$deployment_id" '
    [.[] | select(if $id == "" then .title == $title else .deploymentId == $id end)]
    | if length == 0 then empty
      elif length == 1 then .[0] | [.deploymentId, .status] | @tsv
      else error("Ambiguous deployment identity") end' "$work/deployments.json")
  if [[ -n "$match" ]]; then
    read -r deployment_id status <<< "$match"
    case "$status" in
      done)
        printf 'Dokploy deployment %s completed; continue operator qualification under maintenance.\n' "$deployment_id"
        break
        ;;
      error|cancelled)
        fail "Dokploy deployment $deployment_id ended with $status; inspect its native record."
        ;;
      running) ;;
      *) fail "Unknown Dokploy deployment state; inspect its native record." ;;
    esac
  fi
  ((SECONDS < deadline)) || fail "Dokploy result is uncertain; inspect its native record before another attempt."
  sleep 10
done
