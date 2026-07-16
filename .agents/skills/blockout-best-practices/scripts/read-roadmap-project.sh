#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
query_file="${script_dir}/roadmap-project-index.graphql"
owner="${ROADMAP_OWNER:-blockoutproject}"
project_number="${ROADMAP_PROJECT_NUMBER:?Set ROADMAP_PROJECT_NUMBER to the Blockout Roadmap project number}"

command -v gh >/dev/null
command -v jq >/dev/null

authenticated_login="$(gh api user --jq .login)"
pages="$(gh api graphql --paginate --slurp -F owner="${owner}" -F projectNumber="${project_number}" -F query="@${query_file}")"

jq --sort-keys --arg login "${authenticated_login}" '
  def project: .data.organization.projectV2;
  {
    authenticatedLogin: $login,
    project: {
      id: (.[0] | project.id),
      title: (.[0] | project.title),
      updatedAt: (.[0] | project.updatedAt),
      fields: (.[0] | project.fields.nodes),
      items: ([.[] | project.items.nodes[]] | unique_by(.id) | sort_by(.content.number // 0))
    }
  }
' <<<"${pages}"
