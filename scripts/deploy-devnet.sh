#!/bin/bash
# Deploy Forge program to Solana devnet
# 
# Prerequisites:
# - Anchor CLI installed
# - Solana CLI installed
# - Devnet SOL in wallet (airdrop with: solana airdrop 2 --url devnet)
# - Program built: anchor build

set -e

echo "🚀 Deploying Forge program to devnet..."

# Switch to devnet
echo "📡 Switching to devnet..."
solana config set --url devnet

# Check balance
BALANCE=$(solana balance --url devnet | grep -oP '\d+\.\d+' | head -1)
echo "💰 Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2.0" | bc -l) )); then
    echo "⚠️  Low balance! Airdropping SOL..."
    solana airdrop 2 --url devnet
fi

# Build program
echo "🔨 Building program..."
anchor build

# Deploy
echo "📦 Deploying program..."
anchor deploy --provider.cluster devnet

echo "✅ Deployment complete!"
echo ""
echo "Program ID: $(grep 'forge =' Anchor.toml | cut -d'"' -f2)"
echo ""
echo "Next steps:"
echo "1. Update FORGE_PROGRAM_ID in .env files"
echo "2. Update Anchor.toml with new program ID if changed"
echo "3. Test scripts against devnet"

