# Manual Tasks (Updated to match current codebase)

This document lists tasks that either:
- require **manual execution** on your machine (because they depend on local tooling/wallets), or
- are **future roadmap items** not yet implemented (editions, semi-fungibles, devnet demo, tests).

It is intended to stay consistent with `vision.md` (which is the canonical guide).

---

## 0) Known-good localnet prerequisites (Windows)

### 0.1 Start validator (Token Metadata required)
The Forge program CPIs into Metaplex Token Metadata (`metaqbxx...`). A fresh local validator ledger does **not** include it.

Start validator with Token Metadata cloned into genesis:

```powershell
.\scripts\start-validator.ps1 -ResetLedger -UseUserLedger -KillExisting -CloneTokenMetadata -CloneUrl devnet
```

**Checkpoint ⏸️**: In the validator banner, confirm:
- JSON RPC: `http://127.0.0.1:8899`
- WebSocket: `ws://127.0.0.1:8900`

### 0.2 Deploy program + initialize state (fresh ledger = must rerun)
When you reset the ledger, you must redeploy + reinitialize:

```powershell
# From repo root
solana program deploy target\sbpf-solana-solana\release\forge.so --program-id target\deploy\forge-keypair.json --url http://127.0.0.1:8899

cd scripts
npm run init-forge
npm run create-recipe -- --slug iron-sword --version 1 --output-kind one-of-one --metadata-uri "https://example.com/metadata.json" --status active
```

**Checkpoint ⏸️**: Save the `init-forge` and `create-recipe` signatures.

---

## 1) Current status (what’s already DONE)

- ✅ **On-chain OneOfOne minting** works via Token Metadata CPI.
- ✅ **CLI mint flow** works: `cd scripts && npm run forge-asset -- --slug iron-sword --version 1`
- ✅ **Frontend mint page transaction-building exists**, and we hardened:
  - Anchor `Program` construction (Anchor 0.32)
  - Localnet preflight check for Token Metadata program presence
  - Default program-id fallback to the real program id

---

## 2) Remaining work (manual execution / future steps)

### 2.1 Frontend E2E localnet proof (manual run)
**Goal**: Mint from the browser UI and capture signature + mint.

- Ensure:
  - `NEXT_PUBLIC_FORGE_PROGRAM_ID` is set (matches deployed program id)
  - `NEXT_PUBLIC_FORGE_AUTHORITY` is the wallet that ran `init-forge`
  - `app/public/idl/forge.json` matches your deployed program’s IDL
  - Validator was started with `-CloneTokenMetadata`

**Checkpoint ⏸️**: You click “Forge Asset” and the UI shows a confirmed signature + mint.

### 2.2 Devnet demo (manual run)
**Goal**: Deploy to devnet and mint once; record explorer links in README.

High-level steps:
- Switch to devnet (`solana config set --url devnet`)
- Airdrop SOL
- Deploy
- Initialize forge + create recipe
- Mint (CLI or frontend)

**Checkpoint ⏸️**: README contains devnet program id + a mint signature link.

### 2.3 Editions + semi-fungibles (future implementation)
**Goal**: support `OutputKind::Edition` and `OutputKind::SemiFungible`.

These require new account wiring + Token Metadata flows beyond OneOfOne.

### 2.4 Integration tests (future implementation)
**Goal**: add at least:
- one happy-path forge test
- one negative test (e.g., duplicate RecipeUse / hash replay)

---

## 3) “Stop and ask” triggers
Stop and ask before proceeding if you hit:
- Token Metadata missing on localnet (fix: restart validator with `-CloneTokenMetadata`)
- IDL mismatch error (fix: copy `target/idl/forge.json` to `app/public/idl/forge.json`)
- Recipe/ForgeConfig not found after ledger reset (fix: rerun deploy + init-forge + create-recipe)


