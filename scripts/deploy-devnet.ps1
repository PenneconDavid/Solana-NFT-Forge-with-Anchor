# Deploy Forge program to Solana devnet (PowerShell)
# 
# Prerequisites:
# - Anchor CLI installed
# - Solana CLI installed
# - Devnet SOL in wallet (airdrop with: solana airdrop 2 --url devnet)
# - Program built: anchor build

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Forge program to devnet..." -ForegroundColor Cyan

# Switch to devnet
Write-Host "📡 Switching to devnet..." -ForegroundColor Yellow
solana config set --url devnet

# Check balance
$balanceOutput = solana balance --url devnet 2>&1
Write-Host "💰 Current balance: $balanceOutput" -ForegroundColor Yellow

# Build program
Write-Host "🔨 Building program..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "📦 Deploying program..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host ""
    $programId = (Select-String -Path "Anchor.toml" -Pattern 'forge = "([^"]+)"').Matches.Groups[1].Value
    Write-Host "Program ID: $programId" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update FORGE_PROGRAM_ID in .env files"
    Write-Host "2. Update Anchor.toml with new program ID if changed"
    Write-Host "3. Test scripts against devnet"
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

