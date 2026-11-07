#!/usr/bin/env bash
# Prepares private local search files, or renews only TLS for an existing local instance.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
output="$root/local/opensearch"
mode=${1:-}
if [[ $# -gt 1 || ( -n "$mode" && "$mode" != --renew-tls ) ]]; then
  echo "Usage: $0 [--renew-tls]" >&2
  exit 1
fi
if [[ "$mode" == --renew-tls ]]; then
  if [[ ! -d "$output/tls" || ! -f "$output/backend.env" || ! -f "$output/security/internal_users.yml" ]]; then
    echo 'Renewal requires an existing complete local search preparation.' >&2
    exit 1
  fi
elif [[ -e "$output" ]]; then
  echo 'Local search files already exist. Use --renew-tls to replace only certificates.' >&2
  exit 1
fi
umask 077
mkdir -p "$root/local"
temporary=$(mktemp -d "$root/local/.opensearch.XXXXXX")
trap 'rm -rf "$temporary"' EXIT
bash "$root/infra/opensearch/generate-certificates.sh" "$temporary/tls"
# The private parent protects files readable by Docker's unprivileged UID.
chmod 755 "$temporary/tls"
chmod 644 "$temporary/tls/"*.pem
if [[ "$mode" == --renew-tls ]]; then
  # Generate and verify the whole bundle before replacing files in the existing mount.
  cp "$temporary/tls/"*.pem "$output/tls/"
  chmod 755 "$output/tls"
  chmod 644 "$output/tls/ca.pem" "$output/tls/node.pem" "$output/tls/node-key.pem"
  rm -f "$output/tls/ca-key.pem" "$output/tls/node.csr" "$output/tls/node.ext" "$output/tls/ca.srl"
  echo 'Local TLS renewed. Recreate OpenSearch and restart the backend before use.'
  exit 0
fi
mkdir "$temporary/security"
cp "$root/infra/opensearch/security/"*.yml "$temporary/security/"
password=$(openssl rand -hex 24)
hash=$(docker run --rm --entrypoint /usr/share/opensearch/plugins/opensearch-security/tools/hash.sh \
  opensearchproject/opensearch:3.9.0 -p "$password" | tail -n 1)
cat > "$temporary/security/internal_users.yml" <<USERS
_meta:
  type: internalusers
  config_version: 2
blockout_search:
  hash: '$hash'
USERS
cat > "$temporary/backend.env" <<ENV
BLOCKOUT_SEARCH_ENABLED=true
BLOCKOUT_SEARCH_ENDPOINT=https://localhost:9200
BLOCKOUT_SEARCH_USERNAME=blockout_search
BLOCKOUT_SEARCH_PASSWORD=$password
SPRING_SSL_BUNDLE_PEM_OPENSEARCH_TRUSTSTORE_CERTIFICATE=$output/tls/ca.pem
ENV
chmod 755 "$temporary/security"
chmod 644 "$temporary/security/"*.yml
# Publish only after every dependency and native security file has been prepared successfully.
mv "$temporary" "$output"
