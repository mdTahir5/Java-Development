# TLS material for the backend

This folder is copied into the container image by `backend/Dockerfile`.

## Default (recommended): `DB_SSL_MODE=REQUIRED`

Aiven always serves MySQL over TLS. With `DB_SSL_MODE=REQUIRED` (the default in
`application-prod.properties`) the JDBC connection is encrypted but the server
certificate is not verified against a CA. This is the documented Aiven setup for
MySQL clients and needs no extra files in this folder.

## Hardened: `DB_SSL_MODE=VERIFY_IDENTITY`

For full verification (certificate chain **and** hostname) Aiven requires the
project's CA certificate:

1. Aiven Console → your MySQL service → **Overview** → *Connection information*
   → **CA Certificate** → *Download* (`ca.pem`). All services in a project share
   the same CA.
2. Save it here as **`aiven-ca.pem`** (public certificate material - it does not
   contain a private key, so it is safe to commit).
3. Rebuild/redeploy. The Dockerfile detects the file and generates
   `/app/certs/aiven-truststore.p12` (PKCS12, alias `aiven-ca`, password taken
   from the `TRUSTSTORE_PASSWORD` build arg, default `changeit`).
4. Set these environment variables on the service:

   ```
   DB_SSL_MODE=VERIFY_IDENTITY
   DB_SSL_EXTRA=&trustCertificateKeyStoreUrl=file:/app/certs/aiven-truststore.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=changeit
   ```

   (Keep the password identical to the build arg if you changed it.)

Running the jar on a host instead of Docker? Build the truststore with
`scripts/create-aiven-truststore.ps1` (Windows) or
`scripts/create-aiven-truststore.sh` (Linux/macOS) and point
`trustCertificateKeyStoreUrl` at the generated file.

> Aiven periodically rotates project CA certificates (bundling old + new during
> the change). Replace `aiven-ca.pem` with the freshly downloaded certificate and
> redeploy whenever Aiven announces a rotation, otherwise `VERIFY_IDENTITY`
> connections will fail after the rotation completes.
