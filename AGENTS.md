# Agent Instructions — Solana NFT Forge

## Project

- **Name:** Solana-NFT-Forge-with-Anchor
- **Purpose:** Anchor Solana program for recipe-based NFT forging with Next.js UI
- **Stack:** Anchor/Rust, Next.js, Solana web3.js, Metaplex, Playwright

## Dev servers

- **Web app:** `cd app && npm run dev` → http://localhost:3000
- **Program:** Anchor build/test from program root (see README)
- **Wallet:** Phantom on devnet; defaults to deployed devnet program

## Commands

| Task | Command |
|------|---------|
| Install | `npm install` at root, in `app/`, and in `scripts/` |
| App dev server | `cd app && npm run dev` → http://localhost:3000 |
| Typecheck (app + scripts) | `npm run typecheck` (root) |
| Lint | `npm run lint` (root) |
| Format check | `npm run format:check` |
| App build | `cd app && npm run build` |
| Program build | `anchor build` (needs Anchor and Solana toolchain) |
| Program test | `anchor test` (starts a local validator) |
| E2E | `npm run test:e2e` (Playwright; needs the app running and a devnet wallet) |

## Definition of done

- App or script changes: `npm run typecheck`, `npm run lint`, and `npm run format:check` pass; app builds.
- Program changes: `anchor build` and `anchor test` pass.
- UI changes: `visual-qa-testing` on the changed page.
- `ConnectionGuide.txt` updated if any program ID, RPC endpoint, or route changed.
- Never deploy the program or run scripts that write to devnet without asking.

## Shared config

- **Skills:** `.agents/skills/` → [cursor-skills](https://github.com/PenneconDavid/cursor-skills)
- **Rules:** `.cursor/rules/` → [cursor-rules](https://github.com/PenneconDavid/cursor-rules)
- **Connections:** see `ConnectionGuide.txt`

## Conventions

- Update `ConnectionGuide.txt` for program IDs, RPC endpoints, and API routes.
- Tier 2 UI skills apply to the Next.js app.
- Ask before installing npm/cargo/Anchor dependencies.
