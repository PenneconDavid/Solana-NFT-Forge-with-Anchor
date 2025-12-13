# Solana NFT Forge with Anchor

A production-grade Solana program for creating and forging NFTs using recipe-based ingredient systems.

## Features

- **Recipe-Based Forging**: Define recipes with ingredient requirements (tokens, NFTs, allowlists)
- **Multiple Output Types**: Support for 1/1 NFTs, editions, and semi-fungible tokens
- **Ingredient Verification**: Full verification of token ownership, collection membership, and Merkle proofs
- **Supply Management**: Configurable supply caps and mint tracking
- **Creator Tools**: Admin dashboard for recipe creation and management
- **Wallet Integration**: Full Solana wallet adapter support

## Project Structure

```
├── programs/
│   ├── forge/              # Anchor program (Rust)
│   └── forge-tests/        # Integration tests
├── app/                    # Next.js frontend
│   ├── app/                # App Router routes
│   └── lib/                # Shared client library
├── scripts/                # CLI scripts (TypeScript)
│   ├── src/
│   │   ├── init-forge.ts
│   │   ├── create-recipe.ts
│   │   ├── toggle-recipe.ts
│   │   └── forge-example.ts
│   └── idl/                # IDL files
├── target/idl/            # Generated IDL
└── docs/                   # Documentation
```

## Quick Start

### Prerequisites

- Rust (latest stable)
- Node.js 20+
- Solana CLI
- Anchor CLI

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   cd scripts && npm install
   cd ../app && npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate IDL**:
   ```bash
   .\scripts\generate-idl.ps1
   # Or manually:
   $env:HOME = $env:USERPROFILE
   anchor idl build -p forge -o target/idl/forge.json
   ```

4. **Start local validator** (in separate terminal):
   ```bash
   solana-test-validator
   ```

5. **Initialize forge**:
   ```bash
   cd scripts
   npm run init-forge
   ```

6. **Start frontend**:
   ```bash
   cd app
   npm run dev
   ```

## Usage

### CLI Scripts

**Initialize Forge**:
```bash
cd scripts
npm run init-forge -- --royalty-bps 500 --enable-recipe-creation
```

**Create Recipe**:
```bash
npm run create-recipe -- -s my-recipe -v 1 -k one-of-one -u https://ipfs.io/ipfs/...
```

**Toggle Recipe Status**:
```bash
npm run toggle-recipe -- -s my-recipe -v 1 --status active
```

**Example Forge**:
```bash
npm run forge-example -- -s my-recipe -v 1
```

### Frontend

1. **Start development server**:
   ```bash
   cd app
   npm run dev
   ```

2. **Access**:
   - Home: http://localhost:3000
   - Creator Dashboard: http://localhost:3000/creator/recipes
   - Mint Page: http://localhost:3000/mint/[slug]

## Program Instructions

- `initialize_forge` - Initialize forge configuration
- `set_forge_config` - Update forge settings
- `create_recipe` - Create new recipe
- `update_recipe` - Update existing recipe
- `set_recipe_status` - Change recipe status
- `forge_asset` - Forge asset using recipe

## Development

### Build Program
```bash
anchor build
```

### Run Tests
```bash
anchor test
```

### Format Code
```bash
cargo fmt
npm run format
```

### Type Check
```bash
# Check Rust program
cargo check --package forge

# Check scripts
cd scripts && npm run typecheck

# Check frontend
cd app && npm run typecheck
```

### Test Status
- ✅ Program compiles successfully
- ✅ Scripts type-check successfully  
- ✅ Frontend type-checks successfully
- ✅ IDL generation working
- ✅ Integration test structure ready
- ✅ E2E test framework (Playwright) configured
- 🚧 Integration tests require local validator (run manually)
- 🚧 E2E tests require frontend dev server (auto-started by Playwright)

### Run E2E Tests
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### Deploy to Devnet
```bash
# Windows
.\scripts\deploy-devnet.ps1

# Linux/Mac
./scripts/deploy-devnet.sh
```

## Documentation

- [Testing Guide](docs/testing-guide.md)
- [Recipes Guide](docs/recipes.md) - Recipe creation and management
- [Localnet Guide](docs/localnet.md) - Local development setup
- [Verification Results](docs/verification-results.md)
- [IDL Generation Solution](docs/idl-generation-solution.md)
- [Phase B Status](vision.md#phase-b-status)
- [Phase C Status](vision.md#phase-c--off-chain-integrations)
- [Phase D Status](vision.md#phase-d--quality--stretch)

## Environment Variables

See `.env.example` for all available configuration options:

- `CLUSTER` - Network (localnet/devnet/mainnet-beta)
- `SOLANA_RPC_URL` - RPC endpoint
- `FORGE_PROGRAM_ID` - Program ID
- `WALLET_PATH` - Path to keypair
- `PINATA_JWT` - Pinata API token (for metadata uploads)

## License

MIT

