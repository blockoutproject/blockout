#!/usr/bin/env bash
# Prepares new ignored local TLS and native security files; never changes an existing cluster.
set -euo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
output="$root/local/opensearch"
mkdir -p "$root/local"
mkdir "$output"
umask 077
bash "$root/infra/opensearch/generate-certificates.sh" "$output/tls"
mkdir "$output/security"
cp "$root/infra/opensearch/security/"*.yml "$output/security/"
password=$(openssl rand -hex 24)
hash=$(docker run --rm --entrypoint /usr/share/opensearch/plugins/opensearch-security/tools/hash.sh \
  opensearchproject/opensearch:3.9.0 -p "$password" | tail -n 1)
cat > "$output/security/internal_users.yml" <<USERS
_meta:
  type: internalusers
  config_version: 2
blockout_search:
  hash: '$hash'
USERS
cat > "$output/backend.env" <<ENV
BLOCKOUT_SEARCH_ENABLED=true
BLOCKOUT_SEARCH_ENDPOINT=https://localhost:9200
BLOCKOUT_SEARCH_USERNAME=blockout_search
BLOCKOUT_SEARCH_PASSWORD=$password
SPRING_SSL_BUNDLE_PEM_OPENSEARCH_TRUSTSTORE_CERTIFICATE=$output/tls/ca.pem
ENV
# Docker's unprivileged UID needs these mounted files; the enclosing directory stays private.
chmod 700 "$output"
chmod 755 "$output/tls" "$output/security"
chmod 644 "$output/tls/ca.pem" "$output/tls/node.pem" "$output/tls/node-key.pem" "$output/security/"*.yml
