#!/usr/bin/env bash
#
# Builds the PKCS12 truststore used to verify Aiven for MySQL's TLS certificate.
#
# Only needed when running the backend outside Docker with
# DB_SSL_MODE=VERIFY_IDENTITY / VERIFY_CA. The Docker image generates this
# truststore automatically from backend/certs/aiven-ca.pem.
#
# Download the Aiven project CA certificate first:
#   Aiven Console > MySQL service > Overview > Connection information >
#   CA Certificate > Download  (save it as backend/certs/aiven-ca.pem)
#
# Usage:
#   ./create-aiven-truststore.sh ./certs/aiven-ca.pem [output.p12] [password]
set -euo pipefail

CA_PEM_PATH="${1:-}"
OUTPUT_PATH="${2:-$(dirname "$0")/../certs/aiven-truststore.p12}"
STORE_PASSWORD="${3:-changeit}"
ALIAS="aiven-ca"

if [[ -z "${CA_PEM_PATH}" ]]; then
  echo "Usage: $0 <ca.pem> [output.p12] [password]" >&2
  exit 1
fi

if [[ ! -f "${CA_PEM_PATH}" ]]; then
  echo "CA certificate not found: ${CA_PEM_PATH}" >&2
  exit 1
fi

if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/keytool" ]]; then
  KEYTOOL="${JAVA_HOME}/bin/keytool"
elif command -v keytool >/dev/null 2>&1; then
  KEYTOOL="keytool"
else
  echo "keytool not found. Install a JDK or set JAVA_HOME." >&2
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT_PATH}")"
rm -f "${OUTPUT_PATH}"

"${KEYTOOL}" -importcert -noprompt \
  -alias "${ALIAS}" \
  -file "${CA_PEM_PATH}" \
  -keystore "${OUTPUT_PATH}" \
  -storetype PKCS12 \
  -storepass "${STORE_PASSWORD}"

echo
echo "Truststore created: ${OUTPUT_PATH}"
echo "Set these environment variables on the backend service:"
echo "  DB_SSL_MODE=VERIFY_IDENTITY"
echo "  DB_SSL_EXTRA=&trustCertificateKeyStoreUrl=file:/app/certs/aiven-truststore.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=${STORE_PASSWORD}"
