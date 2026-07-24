#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
query_file="${script_dir}/roadmap-project-index.graphql"
owner="${ROADMAP_OWNER:-blockoutproject}"
project_number="${ROADMAP_PROJECT_NUMBER:-4}"

command -v gh >/dev/null
command -v jq >/dev/null

authenticated_login="$(gh api user --jq .login)"

read_pages() {
  gh api graphql --paginate --slurp \
    -F owner="${owner}" \
    -F projectNumber="${project_number}" \
    -F query="@${query_file}"
}

normalize_pages() {
  jq --sort-keys --arg login "${authenticated_login}" '
  def project: .data.organization.projectV2;
  def compact_fields:
    (project.fields.nodes | map(select(.id != null) | {
      id,
      name,
      type: .__typename,
      options: (.options // [])
    }));
  def compact_item:
    . as $item | {
      itemId: $item.id,
      itemUpdatedAt: $item.updatedAt,
      itemType: $item.type,
      content: ($item.content // null),
      fields: (
        $item.fieldValues.nodes
        | map(select(.name != null and .field.name != null) | {
            key: .field.name,
            value: .name
          })
        | from_entries
      )
    };
  . as $pages
  | ($pages[0] | project) as $first
  | if ($first.fields.pageInfo.hasNextPage // false)
    then error("Project fields require pagination")
    else .
    end
  | [
      $pages[]
      | project.items.nodes[]
      | if ((.content.assignees.pageInfo.hasNextPage // false)
          or (.content.labels.pageInfo.hasNextPage // false)
          or (.fieldValues.pageInfo.hasNextPage // false))
        then error("Nested Project item connection requires pagination")
        else compact_item
        end
    ] as $items
  | {
      authenticatedLogin: $login,
      project: {
        id: $first.id,
        title: $first.title,
        updatedAt: $first.updatedAt,
        fields: ($pages[0] | compact_fields),
        items: ($items | unique_by(.itemId) | sort_by(.content.number // 0))
      }
    }
' <<<"$1"
}

pages="$(read_pages)"
snapshot="$(normalize_pages "${pages}")"

if (( $(jq 'length' <<<"${pages}") > 1 )); then
  stable=false
  for _attempt in 2 3; do
    pages="$(read_pages)"
    next_snapshot="$(normalize_pages "${pages}")"
    if [[ "${snapshot}" == "${next_snapshot}" ]]; then
      snapshot="${next_snapshot}"
      stable=true
      break
    fi
    snapshot="${next_snapshot}"
  done
  if [[ "${stable}" != true ]]; then
    echo "Project snapshot unstable after three complete reads" >&2
    exit 1
  fi
fi

printf '%s\n' "${snapshot}"
