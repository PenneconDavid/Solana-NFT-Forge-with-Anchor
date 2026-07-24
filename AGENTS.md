# Agent Instructions — Solana NFT Forge

## Project

- **Name:** Solana-NFT-Forge-with-Anchor
- **Purpose:** Anchor Solana program for recipe-based NFT forging with Next.js UI
- **Stack:** Anchor/Rust, Next.js, Solana web3.js, Metaplex, Playwright

## Dev servers

- **Web app:** `cd app && npm run dev` → http://localhost:3000
- **Program:** Anchor build/test from program root (see README)
- **Wallet:** Phantom on devnet; defaults to deployed devnet program

## Shared config

- **Skills:** `.agents/skills/` → [cursor-skills](https://github.com/PenneconDavid/cursor-skills)
- **Rules:** `.cursor/rules/` → [cursor-rules](https://github.com/PenneconDavid/cursor-rules)
- **Connections:** see `ConnectionGuide.txt`

## Conventions

- Update `ConnectionGuide.txt` for program IDs, RPC endpoints, and API routes.
- Tier 2 UI skills apply to the Next.js app.
- Ask before installing npm/cargo/Anchor dependencies.
