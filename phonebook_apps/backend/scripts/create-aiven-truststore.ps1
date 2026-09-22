<#
.SYNOPSIS
    Builds the PKCS12 truststore used to verify Aiven for MySQL's TLS certificate.

.DESCRIPTION
    Only needed when running the backend outside Docker with
    DB_SSL_MODE=VERIFY_IDENTITY / VERIFY_CA. The Docker image generates this
    truststore automatically from backend/certs/aiven-ca.pem.

    Download the Aiven project CA certificate first:
      Aiven Console > MySQL service > Overview > Connection information >
      CA Certificate > Download  (save it as backend/certs/aiven-ca.pem)

.PARAMETER CaPemPath
    Path to the Aiven CA certificate (ca.pem).

.PARAMETER OutputPath
    Where to write the truststore. Defaults to backend/certs/aiven-truststore.p12

.PARAMETER StorePassword
    Truststore password (must match trustCertificateKeyStorePassword in the
    JDBC URL). Defaults to "changeit"; the truststore only holds a public CA
    certificate, so this is not treated as a secret.

.EXAMPLE
    .\create-aiven-truststore.ps1 -CaPemPath .\certs\aiven-ca.pem
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$CaPemPath,
    [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'certs\aiven-truststore.p12'),
    [string]$StorePassword = 'changeit',
    [string]$Alias = 'aiven-ca'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $CaPemPath)) {
    throw "CA certificate not found: $CaPemPath"
}

if (-not $env:JAVA_HOME) {
    throw 'JAVA_HOME is not set. Point it at your JDK so keytool can be found.'
}
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) {
    throw "keytool not found at $keytool"
}

$outDir = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
}

& $keytool -importcert -noprompt -alias $Alias `
    -file $CaPemPath `
    -keystore $OutputPath `
    -storetype PKCS12 `
    -storepass $StorePassword

if ($LASTEXITCODE -ne 0) {
    throw "keytool failed with exit code $LASTEXITCODE"
}

$resolved = (Resolve-Path -LiteralPath $OutputPath).Path
Write-Host ''
Write-Host "Truststore created: $resolved" -ForegroundColor Green
Write-Host 'Set these environment variables on the backend service:'
Write-Host '  DB_SSL_MODE=VERIFY_IDENTITY'
Write-Host "  DB_SSL_EXTRA=&trustCertificateKeyStoreUrl=file:/app/certs/aiven-truststore.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=$StorePassword"
