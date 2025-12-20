# Solana NFT Forge (Anchor + Next.js)

A production-grade Solana program for forging NFTs using recipe-based ingredient constraints. Define recipes with requirements (tokens, NFTs, allowlists), and users can forge new assets once they meet those requirements.

**Live Demo**: [Deployed on Vercel](https://solana-nft-forge.vercel.app) (devnet)

## 🎯 For Users (Forgers)

Want to forge an NFT? Here's how:

### Quick Start (Using the Live Demo)

1. **Visit the deployed frontend** (link above) or run locally (see Developer Setup below)
2. **Connect your Phantom wallet** - Click "Connect Wallet" and approve the connection
3. **Navigate to a recipe** - Visit `/mint/[recipe-slug]` (e.g., `/mint/iron-sword`)
4. **Review requirements** - Check if the recipe has ingredient requirements (tokens, NFTs, etc.)
5. **Forge your asset** - Click "Forge Asset" to mint your NFT

**Requirements:**
- Phantom wallet (or Solflare) installed
- SOL in your wallet for transaction fees (on devnet, use the [Solana Faucet](https://faucet.solana.com/))
- Any required ingredients (tokens, NFTs, allowlist proofs) as specified by the recipe

### What You'll Get

- A new NFT minted to your wallet
- Metadata attached via Metaplex Token Metadata
- Transaction signature for verification

---

## 👨‍💻 For Developers & Contributors

### Prerequisites

- **Node.js** v20+ and npm
- **Rust** (latest stable) and Cargo
- **Anchor** CLI v0.32+ (`avm install 0.32.1`)
- **Solana CLI** v2.3+ (for localnet) or v3.0+ (for devnet builds)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Solana-NFT-Forge-with-Anchor.git
cd Solana-NFT-Forge-with-Anchor

# Install root dependencies
npm install

# Install scripts dependencies
cd scripts && npm install && cd ..

# Install frontend dependencies
cd app && npm install && cd ..
```

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables** (see `.env.example` for details):
   - `CLUSTER`: `localnet` for local development, `devnet` for shared testing
   - `SOLANA_RPC_URL`: RPC endpoint (defaults provided)
   - `FORGE_PROGRAM_ID`: Program ID (already set to deployed devnet program)
   - `NEXT_PUBLIC_FORGE_AUTHORITY`: Forge authority pubkey (defaults to deployed devnet authority)

   **Note:** The frontend defaults to the deployed devnet forge authority, so you can use it immediately without additional setup.

3. **For frontend** (`app/.env.local`):
   ```bash
   cd app
   cp ../.env.example .env.local
   # Edit .env.local if needed (defaults work for devnet)
   ```

### Local Development Setup

#### Option 1: Use Deployed Devnet Program (Easiest)

The program is already deployed on devnet. Just run the frontend:

```bash
cd app
npm run dev
```

Visit `http://localhost:3000` and connect your Phantom wallet (set to devnet).

#### Option 2: Full Local Development (Localnet)

1. **Start local validator** (Windows):
   ```powershell
   .\scripts\start-validator.ps1 -ResetLedger -UseUserLedger -KillExisting -CloneTokenMetadata -CloneUrl devnet
   ```

   **Note:** The `-CloneTokenMetadata` flag is required because Metaplex Token Metadata program must be present for CPI calls.

2. **Build and deploy the program:**
   ```bash
   anchor build
   anchor deploy
   ```

3. **Initialize forge:**
   ```bash
   cd scripts
   npm run init-forge
   ```

4. **Create a recipe:**
   ```bash
   npm run create-recipe -- -s iron-sword -n "Iron Sword" -u "https://example.com/metadata.json"
   ```

5. **Run frontend:**
   ```bash
   cd ../app
   npm run dev
   ```

### Project Structure

```
Solana-NFT-Forge-with-Anchor/
├── programs/
│   ├── forge/              # Anchor program (Rust)
│   └── forge-tests/        # Integration tests
├── scripts/                # TypeScript CLI tools
│   ├── src/
│   │   ├── init-forge.ts   # Initialize forge config
│   │   ├── create-recipe.ts # Create new recipes
│   │   ├── toggle-recipe.ts # Enable/disable recipes
│   │   └── forge-asset.ts  # CLI forging example
│   └── idl/                # Generated IDL
├── app/                    # Next.js frontend
│   ├── app/
│   │   ├── mint/[slug]/    # Minting page
│   │   └── creator/        # Creator dashboard
│   └── lib/
│       ├── forgeClient.ts  # Client SDK
│       └── wallet.tsx      # Wallet adapter setup
├── docs/                   # Documentation
└── ConnectionGuide.txt     # Ports and endpoints reference
```

### Available Scripts

**Root:**
- `npm install` - Install all dependencies
- `anchor build` - Build the Anchor program
- `anchor deploy` - Deploy to configured cluster
- `anchor test` - Run integration tests

**Scripts (`scripts/`):**
- `npm run init-forge` - Initialize forge configuration
- `npm run create-recipe` - Create a new recipe
- `npm run toggle-recipe` - Enable/disable a recipe
- `npm run forge-asset` - Forge an asset via CLI

**Frontend (`app/`):**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run test:e2e` - Run Playwright E2E tests

### Development Workflow

1. **Make changes** to program, scripts, or frontend
2. **Build program:** `anchor build`
3. **Deploy to localnet:** `anchor deploy` (after starting validator)
4. **Test via CLI:** `cd scripts && npm run forge-asset`
5. **Test via frontend:** `cd app && npm run dev`
6. **Run tests:** `anchor test` and `npm run test:e2e`

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run tests and linting (`npm run lint`, `npm run typecheck`, `anchor test`)
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feat/your-feature`)
7. Open a Pull Request

### Code Style

- **Rust:** Use `cargo fmt` and `cargo clippy`
- **TypeScript:** Use ESLint and Prettier (configured)
- **Commits:** Use conventional commit messages

---

## 📚 Documentation

- **[Recipes Guide](docs/recipes.md)** - How to create and manage recipes
- **[Localnet Setup](docs/localnet.md)** - Detailed localnet configuration
- **[Manual Tasks](docs/manual-tasks.md)** - Step-by-step operational tasks
- **[Connection Guide](ConnectionGuide.txt)** - Ports, endpoints, and connection details

---

## 🚀 Deployment

### Devnet (Already Deployed)

- **Program ID:** `BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN`
- **Forge Config PDA:** `AijiehS47c9CdZhCp2swXTdWg8LmBkqM25u4DS1kiYVE`
- **Active Recipe:** `iron-sword` (v1)

### Vercel Frontend Deployment

1. Connect your GitHub repository to Vercel
2. Set root directory to `app/`
3. Configure environment variables:
   - `NEXT_PUBLIC_CLUSTER=devnet`
   - `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`
   - `NEXT_PUBLIC_FORGE_PROGRAM_ID=BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN`
   - `NEXT_PUBLIC_FORGE_AUTHORITY=Fx2ydi5tp6Zu2ywMJEZopCXUqhChehKWBnKNgQjcJnSA`
4. Deploy

---

## 🧪 Testing

- **Rust:** `cargo check --package forge`, `cargo fmt`, `anchor test`
- **TypeScript:** `npm run lint`, `npm run typecheck`
- **E2E:** `npm run test:e2e` (Playwright)

---

## 📋 Current Status

- ✅ **Core Program:** Complete - All 6 instructions implemented
- ✅ **Devnet Deployment:** Deployed and proven working (multiple successful mints)
- ✅ **Frontend:** Wallet integration, minting UI complete, deployed on Vercel
- ✅ **Multiple Mints:** Each wallet can forge multiple times (hash includes mint pubkey)
- ✅ **Network Validation:** Frontend validates devnet connection and program existence
- ✅ **CLI Tools:** All scripts functional
- ⏳ **Testing:** Structure ready, tests pending
- ⏳ **Editions/Semi-Fungibles:** Planned for future

---

## 🛣️ Roadmap

- [ ] Frontend transaction flow hardening
- [ ] Edition and semi-fungible asset support
- [ ] Collection verification workflows
- [ ] Comprehensive test suite
- [ ] Compressed NFT (Bubblegum) support

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

Built with:
- [Anchor](https://www.anchor-lang.com/) - Solana framework
- [Metaplex](https://www.metaplex.com/) - Token Metadata standard
- [Next.js](https://nextjs.org/) - React framework
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter) - Wallet integration

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/Solana-NFT-Forge-with-Anchor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/Solana-NFT-Forge-with-Anchor/discussions)

---

**Built by [David Seibold](https://github.com/PenneconDavid)**
