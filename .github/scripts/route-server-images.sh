#!/usr/bin/env bash
# Route a complete immutable server image set to native Dokploy Docker applications.
# A successful POST acknowledges dispatch only; native rollout health is checked by the operator.
set -euo pipefail

release_environment="${1:?Expected preproduction or production}"
candidate_directory="${2:?Expected a candidate directory}"
case "$release_environment" in
  preproduction|production) ;;
  *) printf 'Unsupported release environment.\n' >&2; exit 1 ;;
esac

# Validate the complete set before changing either registry alias.
[[ "$BACKEND_WEBHOOK_URL" == https://*/api/deploy/* ]] || exit 1
[[ "$COLLECTOR_WEBHOOK_URL" == https://*/api/deploy/* ]] || exit 1
for application in backend collector; do
  image="$(cat "$candidate_directory/$application.image")"
  image_name="ghcr.io/$GITHUB_REPOSITORY/$application"
  digest="${image#"$image_name@"}"
  [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
done

inspection_error="$(mktemp)"
trap 'rm -f "$inspection_error"' EXIT
for application in backend collector; do
  image="$(cat "$candidate_directory/$application.image")"
  digest="${image##*@}"
  routing_tag="ghcr.io/$GITHUB_REPOSITORY/$application:$release_environment"
  if current_digest="$(docker buildx imagetools inspect "$routing_tag" --format '{{.Manifest.Digest}}' 2> "$inspection_error")"; then
    [[ "$current_digest" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
  elif grep -Eiq 'manifest unknown|manifest_unknown|: not found$' "$inspection_error"; then
    current_digest=''
  else
    cat "$inspection_error" >&2
    exit 1
  fi

  if test "$current_digest" = "$digest"; then
    printf '%s unchanged: %s\n' "$application" "$image" >> "$GITHUB_STEP_SUMMARY"
    continue
  fi
  docker buildx imagetools create --prefer-index=false --tag "$routing_tag" "$image"
  test "$(docker buildx imagetools inspect "$routing_tag" --format '{{.Manifest.Digest}}')" = "$digest"
  if test "$application" = backend; then
    webhook_url="$BACKEND_WEBHOOK_URL"
  else
    webhook_url="$COLLECTOR_WEBHOOK_URL"
  fi
  response_status="$(curl --fail --silent --show-error --connect-timeout 10 --max-time 30 --request POST --output /dev/null --write-out '%{http_code}' "$webhook_url")"
  test "$response_status" = 200
  printf '%s dispatch accepted: %s (native health remains to be checked).\n' "$application" "$image" >> "$GITHUB_STEP_SUMMARY"
done
