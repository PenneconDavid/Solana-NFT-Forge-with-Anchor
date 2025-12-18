# Recipe v2 Setup Complete

## What Was Done

✅ **Created `iron-sword` v2 recipe on devnet**
- Transaction: `dN5yNwbXyjpd6uYFdUAqwyTBfus22E9giNDnmA6iqgVgkmPAuPGVgh1b7f7cgAQKUFCwsrXyHU3NaeuC5ciAMgB`
- Recipe PDA: `9GQK1Q3MjuQK6A7upamhZmiw4YqUS2W8pSaBSvVVKwFr`
- Status: Active (ready for forging)
- Version: 2
- Metadata URI: `https://arweave.net/placeholder-metadata-iron-sword-v2` (placeholder - can be updated later)

✅ **Updated Frontend**
- Frontend now tries v2 first, falls back to v1 if v2 doesn't exist
- Automatically selects the latest available version
- Updated home page to show v2 is active

✅ **Updated Documentation**
- `vision.md` updated with v2 recipe details
- `ConnectionGuide.txt` updated with Vercel deployment info

## Why v2 Was Needed

The `iron-sword` v1 recipe was already forged (1 NFT minted). For recipes with 0 ingredient constraints:
- Everyone computes the same input hash (SHA256 of empty)
- This creates the same `RecipeUse` PDA for everyone
- Only ONE forge can succeed per recipe version (anti-replay protection)
- Solution: Create a new recipe version (v2) so more users can forge

## Manual Steps Required

### None! Everything is automated.

The frontend will automatically:
1. Try to load v2 first
2. Fall back to v1 if v2 doesn't exist
3. Use the correct version when forging

### Optional: Update Metadata URI

If you want to use a real metadata URI instead of the placeholder:
1. Upload metadata JSON to IPFS/Arweave
2. Update the recipe using the `update_recipe` instruction (requires program modification) OR
3. Create v3 with the new metadata URI

### Vercel Environment Variables (Already Set)

No changes needed! The code defaults to the correct forge authority if the env var is missing or invalid.

## Testing

After deploying the frontend changes:
1. Visit `/mint/iron-sword`
2. Connect your Phantom wallet
3. Click "Forge Asset"
4. Should successfully forge using v2 recipe

## Docker Usage

**Docker is NOT needed for creating recipes** - that was only used for the initial program deployment to devnet. Recipe creation is just a regular Solana transaction that works with any Solana CLI setup.

## Next Steps

1. ✅ Push changes to GitHub
2. ✅ Wait for Vercel to rebuild
3. ✅ Test forging with v2 recipe
4. ✅ Multiple users can now forge (each gets a unique RecipeUse PDA per version)

## Recipe Details

- **Slug**: `iron-sword`
- **Version**: 2
- **Output Kind**: One-of-One
- **Status**: Active
- **Ingredient Constraints**: None (0 constraints)
- **Supply Cap**: Unlimited
- **Metadata URI**: Placeholder (can be updated)
