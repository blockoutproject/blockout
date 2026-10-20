#!/usr/bin/env bash
# Creates a short-lived CA and localhost node certificate for disposable local/test use only.
set -euo pipefail
output=${1:?Supply a new certificate directory}
mkdir "$output"
umask 077
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 7 \
  -subj '/CN=Blockout disposable search CA' \
  -keyout "$output/ca-key.pem" -out "$output/ca.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout "$output/node-key.pem" -out "$output/node.csr" 2>/dev/null
cat > "$output/node.ext" <<'EXT'
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
subjectAltName=DNS:localhost,DNS:local-search,IP:127.0.0.1
EXT
openssl x509 -req -in "$output/node.csr" -CA "$output/ca.pem" \
  -CAkey "$output/ca-key.pem" -CAcreateserial -sha256 -days 7 \
  -extfile "$output/node.ext" -out "$output/node.pem" 2>/dev/null
