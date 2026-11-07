#!/usr/bin/env bash
# Creates one-year localhost TLS files in a new directory for local/test use only.
set -euo pipefail
output=${1:?Supply a new certificate directory}
umask 077
mkdir "$output"
# This script owns only the new directory; failures leave the caller free to retry.
trap 'rm -rf "$output"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
  -subj '/CN=Blockout disposable search CA' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -addext 'subjectKeyIdentifier=hash' \
  -keyout "$output/ca-key.pem" -out "$output/ca.pem"
openssl req -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout "$output/node-key.pem" -out "$output/node.csr"
cat > "$output/node.ext" <<'EXT'
basicConstraints=CA:FALSE
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth,clientAuth
subjectAltName=DNS:localhost,DNS:local-search,IP:127.0.0.1
EXT
openssl x509 -req -in "$output/node.csr" -CA "$output/ca.pem" \
  -CAkey "$output/ca-key.pem" -CAcreateserial -sha256 -days 365 \
  -extfile "$output/node.ext" -out "$output/node.pem"
openssl verify -x509_strict -CAfile "$output/ca.pem" -verify_hostname localhost "$output/node.pem"
# Only the node key and public certificates are needed after signing.
rm "$output/ca-key.pem" "$output/node.csr" "$output/node.ext" "$output/ca.srl"
trap - EXIT
