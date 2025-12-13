# Anchor build helper for Windows
# Fixes: cargo_build_sbf "Can't get home directory path: environment variable not found"
# Also fixes: Cargo.lock "version = 4" incompatibility with Solana/Anchor SBF toolchains on Windows.

Write-Host "Ensuring we run from repo root..." -ForegroundColor Cyan
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Write-Host "Repo root: $(Get-Location)" -ForegroundColor Gray

Write-Host "Setting HOME for Anchor/Solana tooling..." -ForegroundColor Cyan
$env:HOME = $env:USERPROFILE

# IMPORTANT (Windows): Anchor invokes `cargo-build-sbf` from PATH. If an old Solana install is first on PATH
# (e.g. 1.18.x), SBF builds can fail with an old bundled rustc (e.g. 1.75.0-dev) that can't compile modern deps.
# We prefer the validator-matching Solana/Agave tools (v2.3.13) when present.
$preferredSolanaBin = "C:\solana\install\releases\2.3.13\solana-release\bin"
$fallbackSolanaBin = "C:\solana\install\active_release\bin"

if (Test-Path (Join-Path $preferredSolanaBin "cargo-build-sbf.exe")) {
  Write-Host "Prepending Solana tools to PATH: $preferredSolanaBin" -ForegroundColor Cyan
  $env:PATH = "$preferredSolanaBin;$env:PATH"
} elseif (Test-Path (Join-Path $fallbackSolanaBin "cargo-build-sbf.exe")) {
  Write-Host "Prepending Solana tools to PATH: $fallbackSolanaBin" -ForegroundColor Cyan
  $env:PATH = "$fallbackSolanaBin;$env:PATH"
} else {
  Write-Host "Warning: Could not find a newer Solana tools directory to prepend to PATH. Anchor may use an older cargo-build-sbf." -ForegroundColor Yellow
}

if (Test-Path "Cargo.lock") {
  try {
    $m = Select-String -Path "Cargo.lock" -Pattern '^version\s*=\s*(\d+)\s*$' -ErrorAction Stop | Select-Object -First 1
    $lockVersion = [int]$m.Matches[0].Groups[1].Value
    Write-Host "Detected Cargo.lock version: $lockVersion" -ForegroundColor Gray

    if ($lockVersion -ge 4) {
      $ts = Get-Date -Format "yyyyMMdd-HHmmss"
      $backup = "Cargo.lock.v4.backup.$ts"
      Write-Host "Cargo.lock v$lockVersion is incompatible with SBF build. Backing up to $backup and removing Cargo.lock..." -ForegroundColor Yellow
      Copy-Item -Force "Cargo.lock" $backup
      Remove-Item -Force "Cargo.lock"
    }
  } catch {
    Write-Host "Warning: Could not detect Cargo.lock version; leaving it as-is. Error: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host "Running: anchor build" -ForegroundColor Cyan
anchor build

if ($LASTEXITCODE -ne 0) {
  Write-Host "`n❌ anchor build failed" -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "`n✅ anchor build succeeded" -ForegroundColor Green


