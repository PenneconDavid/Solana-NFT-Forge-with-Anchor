# Docker deployment script for Solana Anchor program
# Builds and deploys to devnet using Docker

$ErrorActionPreference = "Stop"

Write-Host "🐳 Using Docker to build and deploy..." -ForegroundColor Cyan

# Check if Docker is running
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check wallet file
$walletPath = "$env:USERPROFILE\.config\solana\id.json"
if (-not (Test-Path $walletPath)) {
    Write-Host "❌ Wallet file not found at: $walletPath" -ForegroundColor Red
    Write-Host "Please ensure your Solana wallet exists at this path." -ForegroundColor Yellow
    exit 1
}

Write-Host "🔨 Building Docker image with Anchor..." -ForegroundColor Yellow

# Build our custom Docker image first
docker build -f Dockerfile.deploy -t solana-forge-deploy .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker image build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image built" -ForegroundColor Green
Write-Host ""
Write-Host "🔨 Building Anchor program..." -ForegroundColor Yellow

# Build the program
docker run --rm `
    -v "${PWD}:/workspace" `
    -v "${walletPath}:/root/.config/solana/id.json:ro" `
    -w /workspace `
    solana-forge-deploy `
    bash -c "export PATH=\"/root/.cargo/bin:/root/.local/share/solana/install/active_release/bin:\$PATH\" && anchor build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Anchor build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Program built successfully" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Deploying to devnet..." -ForegroundColor Yellow

# Deploy to devnet
docker run --rm `
    -v "${PWD}:/workspace" `
    -v "${walletPath}:/root/.config/solana/id.json:ro" `
    -w /workspace `
    solana-forge-deploy `
    bash -c "export PATH=\"/root/.cargo/bin:/root/.local/share/solana/install/active_release/bin:\$PATH\"; solana config set --url devnet; anchor deploy --provider.cluster devnet"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Program ID: BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Test forging with a fresh wallet" -ForegroundColor White
    Write-Host "2. Verify multiple wallets can forge successfully" -ForegroundColor White
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}
