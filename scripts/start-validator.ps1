param(
  # If set, deletes ./test-ledger before starting the validator.
  [switch]$ResetLedger,

  # Optional: override the validator binary path.
  # NOTE: On some Windows setups, Agave v3.x `solana-test-validator` can fail to unpack genesis with `os error 5`.
  # v2.3.13 has been observed to work reliably on Windows for localnet.
  [string]$ValidatorExe = 'C:\solana\install\releases\2.3.13\solana-release\bin\solana-test-validator.exe',

  # Optional: ledger directory (relative to repo root by default).
  [string]$LedgerDir = "test-ledger",

  # If set, uses a ledger under your user profile to avoid Windows folder protections/locks in the repo directory.
  [switch]$UseUserLedger,

  # If set, kills any existing solana-test-validator process before starting (prevents port-in-use errors).
  [switch]$KillExisting,

  # If set, clones the Metaplex Token Metadata program (and programdata) from the cluster specified by $CloneUrl
  # into genesis. This is required for localnet CPI calls to the Token Metadata program id:
  # metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
  #
  # NOTE: Cloning only affects genesis. Use this together with -ResetLedger (or a non-existent ledger dir).
  [switch]$CloneTokenMetadata,

  # Cluster to clone from when using -CloneTokenMetadata. Common values: devnet, mainnet-beta.
  [string]$CloneUrl = "devnet",

  # Faucet port (default: 9900). Change this if you have a conflicting process.
  [int]$FaucetPort = 9900
)

$ErrorActionPreference = "Stop"

function Require-RepoRoot {
  $root = Split-Path -Parent $PSScriptRoot
  Set-Location $root
}

Require-RepoRoot

if ($UseUserLedger) {
  $LedgerDir = Join-Path $env:LOCALAPPDATA "solana-test-ledger"
}

if ($KillExisting) {
  $procs = Get-Process solana-test-validator -ErrorAction SilentlyContinue
  if ($procs) {
    Write-Host "Stopping existing solana-test-validator processes..."
    $procs | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 250
  }
}

if (-not (Test-Path $ValidatorExe)) {
  throw "Validator binary not found at: $ValidatorExe"
}

if ($ResetLedger -and (Test-Path $LedgerDir)) {
  Write-Host "Resetting ledger: $LedgerDir"
  Remove-Item -Recurse -Force $LedgerDir
}

Write-Host "Using validator: $ValidatorExe"
Write-Host "Ledger: $LedgerDir"

$args = @("--ledger", $LedgerDir, "--faucet-port", $FaucetPort)

if ($CloneTokenMetadata) {
  $tokenMetadataProgramId = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  Write-Host "Cloning Token Metadata program from: $CloneUrl"
  $args += @("--url", $CloneUrl, "--clone-upgradeable-program", $tokenMetadataProgramId)
}

& $ValidatorExe @args


