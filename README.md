# Solana NFT Forge (Anchor + Next.js)

Production-grade forging: define recipes with ingredient constraints and mint NFTs (1/1 today; editions/semi-fungibles next). Frontend ships a neumorphic/nature-inspired theme with wallet adapter and new footer/branding.

## Current status
- Localnet: proven end-to-end 1/1 mint via CLI (`forge_asset`).
- Devnet: **deployed and proven** (built via Docker with solana-cli 3.0.13, rustc 1.92.0).
  - Program ID: `BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN`
  - IDL account: `5icFcScscSR7XBBCtKz6ipPc63QRkmLYYpvfpeL2UDSm`
  - Forge Config PDA: `AijiehS47c9CdZhCp2swXTdWg8LmBkqM25u4DS1kiYVE`
  - Recipe: slug `iron-sword`, v1, PDA `7vhHcp7GmLe7ypbvA2tztB4QH6que6GhwB35KMzjqj6Z`
  - Forge tx: `GEsmRwLGMkuPAcjGLi4obV5UZ45PWyCxoKoBrKJC8WGRFv4ycc7mpHwzhvTfZ5PZDiUYB5XoavNy8FFq87HtuKm`
  - Mint: `96V7rQjb48r28NySW7h3N3ZunncCZZP5KfAgCWvac8rz`
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
- Vercel:
  - Root directory: `app/`
  - Build command: `npm run build`
  - Output: `.next`
  - Environment variables (Project → Settings → Environment Variables):
    - `NEXT_PUBLIC_CLUSTER=devnet`
    - `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com`
    - `NEXT_PUBLIC_FORGE_PROGRAM_ID=BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN`
    - `NEXT_PUBLIC_FORGE_AUTHORITY=Fx2ydi5tp6Zu2ywMJEZopCXUqhChehKWBnKNgQjcJnSA`
    - (optional) `NEXT_PUBLIC_FORGE_IDL_URL` if you host the IDL separately; otherwise rely on `app/public/idl/forge.json`.
- Devnet: already deployed; scripts in `scripts/` run with `CLUSTER=devnet` and `SOLANA_RPC_URL=https://api.devnet.solana.com`.

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

