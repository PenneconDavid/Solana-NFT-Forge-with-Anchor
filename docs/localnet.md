# Localnet Development Guide

This guide explains how to set up and use a local Solana validator for testing the Forge program.

## What is Localnet?

Localnet is a local Solana blockchain running on your machine. It's perfect for:
- Rapid development and testing
- No transaction fees
- Full control over the network state
- Testing without spending SOL

## Prerequisites

- Solana CLI installed (`solana --version`)
- Anchor CLI installed (`anchor --version`)
- Sufficient RAM (4GB+ recommended)
- Ports 8899 (RPC) and 8900 (WebSocket) available

## Quick Start

### 1. Start Local Validator

In a terminal, start the validator:

```bash
solana-test-validator
```

**Keep this terminal open** - the validator must stay running.

The validator will:
- Start on `http://127.0.0.1:8899` (RPC)
- Create a test keypair with airdropped SOL
- Reset state on each restart

### 2. Configure Solana CLI

In a **new terminal**, configure Solana to use localnet:

```bash
solana config set --url localhost
```

Verify configuration:
```bash
solana config get
```

Should show:
```
Config File: ~/.config/solana/cli/config.yml
RPC URL: http://localhost:8899
WebSocket URL: ws://localhost:8890
Keypair Path: ~/.config/solana/id.json
Commitment: confirmed
```

### 3. Build and Deploy Program

Build the program (requires admin on Windows):
```bash
# Windows note: if Anchor/Solana can't find your home directory, set HOME and retry:
#   $env:HOME = $env:USERPROFILE
#   anchor build
#
# Windows note: if you see:
#   "Cargo.lock version 4 requires -Znext-lockfile-bump"
# it means your Rust toolchain generated a v4 lockfile that Solana/Anchor SBF tooling can't read.
# Use the helper script below (it auto-backs-up/removes Cargo.lock v4 before building).
#
# Or use the helper script:
#   .\scripts\anchor-build.ps1
anchor build
```

Deploy to localnet:
```bash
anchor deploy
```

**Note:** The program ID in `Anchor.toml` must match your program's declared ID.

### 4. Initialize Forge

Initialize the forge configuration:
```bash
cd scripts
npm run init-forge
```

This creates the `ForgeConfig` PDA on-chain.

### 5. Start Frontend

In another terminal, start the frontend:
```bash
cd app
npm run dev
```

Access at `http://localhost:3000`

## Validator Options

### Custom Ports

```bash
solana-test-validator --rpc-port 8899 --rpc-bind-address 127.0.0.1
```

### Reset Validator State

Stop validator (Ctrl+C) and restart. State resets automatically.

### Persist State (Optional)

```bash
solana-test-validator --reset
```

Use `--reset` to clear persisted state.

### Load Program on Startup

```bash
solana-test-validator --bpf-program <PROGRAM_ID> <PROGRAM_SO_PATH>
```

## Testing Workflow

### 1. Reset Validator

Stop validator (Ctrl+C) and restart to reset state:
```bash
solana-test-validator
```

### 2. Deploy Program

```bash
anchor build
anchor deploy
```

### 3. Initialize Forge

```bash
cd scripts
npm run init-forge
```

### 4. Create Test Recipe

```bash
npm run create-recipe -- \
  -s test-recipe \
  -v 1 \
  -k one-of-one \
  -u https://ipfs.io/ipfs/QmTest \
  --status active
```

### 5. Test Forging

```bash
npm run forge-example -- -s test-recipe -v 1
```

### 6. Verify on Frontend

- Open `http://localhost:3000`
- Connect wallet (Phantom/Solflare in dev mode)
- Navigate to `/creator/recipes` to see your recipe
- Navigate to `/mint/test-recipe` to test forging

## Environment Configuration

### Scripts

Create `.env` in project root:
```bash
CLUSTER=localnet
SOLANA_RPC_URL=http://127.0.0.1:8899
FORGE_PROGRAM_ID=Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1
WALLET_PATH=~/.config/solana/id.json
```

### Frontend

Create `app/.env.local`:
```bash
NEXT_PUBLIC_CLUSTER=localnet
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_FORGE_PROGRAM_ID=Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1
```

## Wallet Setup

### Default Wallet

The validator creates a default keypair at `~/.config/solana/id.json` with airdropped SOL.

Check balance:
```bash
solana balance
```

### Generate New Wallet

```bash
solana-keygen new --outfile ~/.config/solana/test-keypair.json
```

Use with scripts:
```bash
export WALLET_PATH=~/.config/solana/test-keypair.json
```

### Airdrop SOL

```bash
solana airdrop 10
```

## Common Issues

### Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 8899
netstat -ano | findstr :8899

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different port
solana-test-validator --rpc-port 8898
```

### Program Already Deployed

**Error:** `Program account data is invalid`

**Solution:**
```bash
# Close existing program
solana program close <PROGRAM_ID>

# Or reset validator
# Stop validator and restart
```

### Insufficient SOL

**Error:** `Insufficient funds`

**Solution:**
```bash
# Airdrop more SOL
solana airdrop 10

# Check balance
solana balance
```

### Wrong Network

**Error:** `Invalid program ID` or `Account not found`

**Solution:**
```bash
# Verify network
solana config get

# Should show localhost
# If not:
solana config set --url localhost
```

## Validator Logs

The validator terminal shows:
- Transaction confirmations
- Program logs
- Account changes
- Errors and warnings

**Useful for debugging:**
- Watch for program errors
- Monitor transaction flow
- Debug CPI calls

## Testing Tips

### 1. Use Scripts for Quick Testing

```bash
# Initialize forge
npm run init-forge

# Create recipe
npm run create-recipe -- -s test -v 1 -k one-of-one -u https://ipfs.io/ipfs/QmTest --status active

# Toggle status
npm run toggle-recipe -- -s test -v 1 --status paused
```

### 2. Monitor Validator Output

Watch the validator terminal for:
- Transaction signatures
- Program logs
- Account changes

### 3. Use Solana CLI for Inspection

```bash
# Check account
solana account <ACCOUNT_PUBKEY>

# Check program
solana program show <PROGRAM_ID>

# View transaction
solana confirm <TRANSACTION_SIGNATURE>
```

### 4. Reset Frequently

Reset validator state when:
- Testing initialization flows
- Debugging state issues
- Starting fresh test scenarios

## Integration with CI/CD

For automated testing, use Anchor's test framework:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;

    #[tokio::test]
    async fn test_initialize_forge() {
        // Anchor test framework handles validator setup
        // See programs/forge-tests/ for examples
    }
}
```

Run tests:
```bash
anchor test
```

## Performance Considerations

### Validator Resources

- **RAM**: 4GB+ recommended
- **CPU**: Multi-core helps with parallel transactions
- **Disk**: Fast SSD improves validator performance

### Optimization Tips

1. **Reduce Logging**: Use `--log` flag to control verbosity
2. **Limit Accounts**: Use `--limit-ledger-size` for faster resets
3. **Disable PoH**: Use `--no-bpf-jit` for faster startup (testing only)

## Next Steps

- See [Recipes Guide](recipes.md) for recipe management
- See [Testing Guide](testing-guide.md) for integration testing
- Check `README.md` for project overview

## Troubleshooting Checklist

- [ ] Validator is running (`solana-test-validator`)
- [ ] Solana CLI configured to localhost (`solana config get`)
- [ ] Program deployed (`anchor deploy`)
- [ ] Forge initialized (`npm run init-forge`)
- [ ] Wallet has SOL (`solana balance`)
- [ ] Environment variables set correctly
- [ ] Ports 8899/8900 not blocked by firewall
- [ ] Frontend configured for localnet

## Resources

- [Solana Test Validator Docs](https://docs.solana.com/developing/test-validator)
- [Anchor Testing Guide](https://www.anchor-lang.com/docs/testing)
- [Local Development Best Practices](https://docs.solana.com/developing/programming-model/runtime#program-deployment)

