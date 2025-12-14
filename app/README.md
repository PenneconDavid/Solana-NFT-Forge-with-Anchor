## NFT Forge — Frontend (App Router)

Next.js frontend for the Solana NFT Forge project. Neumorphic + nature accent theme, wallet adapter integration, and recipe/mint flows.

### Quick start
```bash
cd app
npm install
npm run dev
# lint/typecheck/build
npm run lint
npm run typecheck
npm run build
```

### Environment
Set in `.env.local` (browser-safe keys must be prefixed with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_CLUSTER` (e.g., `devnet` or `localnet`)
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_FORGE_PROGRAM_ID`
- `NEXT_PUBLIC_FORGE_AUTHORITY`

### Assets & theme
- Logos live in `public/logos/` (`logo-hammer.png`, `logo-lockup.png`).
- Global styling in `app/globals.css` (neumorphic surface tokens + accent palette).
- Footer is global and links to the author’s GitHub.

### Vercel deploy tips
- Project root: `app`
- Install: `npm install`
- Build: `npm run build`
- Output: `.next`
- Same env vars as above for both Preview/Production.

### Key routes
- `/` — hero + quick links
- `/creator/recipes` — creator dashboard list
- `/creator/recipes/[slug]` — recipe detail
- `/creator/recipes/new` — create recipe form (placeholder flow)
- `/mint/[slug]` — mint/forge page (uses wallet adapter)

### Notes
- Wallet connection via Solana Wallet Adapter; Phantom/Solflare supported.
- IDL is read from `public/idl/forge.json` for client program interactions.
