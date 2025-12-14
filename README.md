# Solana NFT Forge (Anchor + Next.js)

Production-grade forging: define recipes with ingredient constraints and mint NFTs (1/1 today; editions/semi-fungibles next). Frontend ships a neumorphic/nature-inspired theme with wallet adapter and new footer/branding.

## Current status
- Localnet: proven end-to-end 1/1 mint via CLI (`forge_asset`).
- Devnet: pending deployment (program id placeholder set in env; mint disabled until deployed).
- Frontend: Vercel-ready; global footer, logo branding, and rust-themed styling applied.

## Repo layout
```
programs/forge         # Anchor program
programs/forge-tests   # Rust integration tests
scripts/               # TypeScript CLI (init, recipe, forge)
app/                   # Next.js App Router frontend
public/logos/          # UI branding assets
docs/                  # Guides and verification notes
vision.md              # Detailed roadmap/status (to be retired when public)
```

## Quick start
```bash
npm install
cd scripts && npm install
cd ../app && npm install
```

Env (root `.env` and `app/.env.local`):
- `CLUSTER` / `NEXT_PUBLIC_CLUSTER` (localnet|devnet)
- `SOLANA_RPC_URL` / `NEXT_PUBLIC_SOLANA_RPC_URL`
- `FORGE_PROGRAM_ID` / `NEXT_PUBLIC_FORGE_PROGRAM_ID`
- `NEXT_PUBLIC_FORGE_AUTHORITY`

Localnet (requires Token Metadata clone):
```bash
.\scripts\start-validator.ps1 -ResetLedger -UseUserLedger -KillExisting -CloneTokenMetadata -CloneUrl devnet
cd scripts && npm run init-forge && npm run create-recipe
```

Frontend:
```bash
cd app
npm run dev          # local
npm run build        # production
npm run lint         # eslint
npm run typecheck    # tsc
```

CLI samples:
```bash
cd scripts
npm run forge-asset -- -s my-recipe -v 1
```

## Deployment notes
- Vercel: root `app/`, build `npm run build`, output `.next`. Use devnet env vars above. Minting will fail until the program is actually on devnet.
- Devnet: scripts `scripts/deploy-devnet.(ps1|sh)` once toolchain is unblocked.

## Assets & UI
- Logos now in `app/public/logos/` (`logo-hammer.png`, `logo-lockup.png`); footer shows “Built by { David Seibold }” with GitHub link.
- Global theme lives in `app/app/globals.css`; footer defined in `app/app/layout.tsx`.

## Testing
- Rust: `cargo check --package forge`, `cargo fmt`, (anchor tests pending toolchain unblock).
- Frontend: `npm run lint`, `npm run typecheck`, `npm run test:e2e` (Playwright scaffold).

## Roadmap highlights (brief)
- Wire frontend mint to real transaction flow (forged 1/1 already proven via CLI).
- Deploy to devnet and validate mint there.
- Add edition + semi-fungible paths; collection verification; more tests.

## License
MIT

