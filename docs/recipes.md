# Recipe Management Guide

This guide explains how to create, manage, and use recipes in the Solana NFT Forge program.

## What is a Recipe?

A recipe defines the requirements and specifications for forging an NFT. It includes:
- **Ingredient constraints**: What tokens, NFTs, or proofs are required
- **Output specifications**: What type of NFT will be created (1/1, edition, semi-fungible)
- **Supply limits**: Maximum number of assets that can be forged
- **Metadata**: URI pointing to the NFT metadata
- **Creators**: Royalty recipients and their shares
- **Status**: Draft, Active, Paused, or Retired

## Recipe Lifecycle

### 1. Create Recipe (Draft Status)

Recipes start in `Draft` status and cannot be used for forging until activated.

**Using CLI:**
```bash
cd scripts
npm run create-recipe -- \
  -s my-awesome-recipe \
  -v 1 \
  -k one-of-one \
  -u https://ipfs.io/ipfs/QmYourMetadataHash \
  --status draft
```

**Parameters:**
- `-s, --slug`: Recipe identifier (max 32 bytes, URL-friendly)
- `-v, --version`: Recipe version number (starts at 1)
- `-k, --output-kind`: `one-of-one`, `edition`, or `semi-fungible`
- `-u, --metadata-uri`: IPFS/Arweave URI for NFT metadata
- `--supply-cap`: Maximum mints (optional, unlimited if omitted)
- `--collection`: Collection mint pubkey (optional)
- `--go-live`: Unix timestamp for when recipe becomes active (optional)
- `--status`: Initial status (default: `draft`)

### 2. Activate Recipe

Change status from `Draft` to `Active` to enable forging:

```bash
npm run toggle-recipe -- \
  -s my-awesome-recipe \
  -v 1 \
  --status active
```

### 3. Update Recipe

Update recipe details (only works for Draft/Paused recipes):

```bash
# Update metadata URI, supply cap, etc.
# Note: Update functionality requires full Anchor integration
```

### 4. Pause Recipe

Temporarily disable forging without retiring:

```bash
npm run toggle-recipe -- \
  -s my-awesome-recipe \
  -v 1 \
  --status paused
```

### 5. Retire Recipe

Permanently disable recipe (cannot be reactivated):

```bash
npm run toggle-recipe -- \
  -s my-awesome-recipe \
  -v 1 \
  --status retired
```

## Ingredient Constraints

Recipes can require various types of ingredients:

### Token Mint Constraint
Requires user to own a specific amount of an SPL token:
```rust
TokenMint {
    mint: <token_mint_pubkey>,
    amount: <required_amount>
}
```

### Collection NFT Constraint
Requires user to own an NFT from a specific collection:
```rust
CollectionNft {
    collection_mint: <collection_pubkey>
}
```

### Allowlist Constraint
Requires a valid Merkle proof for an allowlist:
```rust
Allowlist {
    merkle_root: <32_byte_hash>
}
```

### Signer Constraint
Requires a specific wallet to sign the transaction:
```rust
Signer {
    authority: <pubkey>
}
```

### Custom Seeds Constraint
Requires custom seed bytes (for advanced use cases):
```rust
CustomSeeds {
    seed_bytes: <byte_array>
}
```

## Recipe Versioning

Recipes support versioning to allow updates without breaking existing recipes:

- Each recipe has a unique `(slug, version)` combination
- New versions can reference `previous_version` for auditability
- Old versions remain immutable once created
- Use versioning to:
  - Fix bugs or update metadata
  - Adjust supply caps
  - Modify ingredient requirements

**Example:**
```bash
# Version 1
npm run create-recipe -- -s my-recipe -v 1 ...

# Version 2 (references v1)
npm run create-recipe -- -s my-recipe -v 2 --previous-version 1 ...
```

## Supply Management

### Unlimited Supply
Omit `--supply-cap` to allow unlimited forging:
```bash
npm run create-recipe -- -s unlimited-recipe -v 1 -k semi-fungible ...
```

### Limited Supply
Set a maximum number of mints:
```bash
npm run create-recipe -- -s limited-recipe -v 1 -k one-of-one --supply-cap 100 ...
```

The program tracks `minted` count and prevents forging when `minted >= supply_cap`.

## Metadata URI

The metadata URI should point to a JSON file following the Metaplex Token Metadata standard:

```json
{
  "name": "My NFT",
  "symbol": "MNFT",
  "description": "Description of my NFT",
  "image": "https://ipfs.io/ipfs/QmImageHash",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ],
  "properties": {
    "creators": [
      {
        "address": "<creator_pubkey>",
        "share": 100
      }
    ]
  }
}
```

**Best Practices:**
- Use IPFS (Pinata, NFT.Storage) or Arweave for permanent storage
- Ensure metadata is accessible before activating recipe
- Include all required fields (name, symbol, image)

## Creators and Royalties

Recipes can specify creators who will receive royalties:

- Creators are defined in the recipe's `creators` array
- Each creator has an `address` and `share` (0-100)
- Total shares should equal 100
- Royalties are enforced by the Token Metadata program

**Note:** Creator configuration requires full Anchor integration. Currently, recipes can be created with empty creator arrays.

## Go-Live Timestamps

Use `--go-live` to schedule when a recipe becomes active:

```bash
# Set go-live to a future date
npm run create-recipe -- \
  -s scheduled-recipe \
  -v 1 \
  --go-live 1735689600 \
  --status active
```

The program checks `go_live_unix_time` before allowing forging. If set, forging is only allowed after the timestamp.

## Example Workflows

### Creating a Simple 1/1 NFT Recipe

```bash
# 1. Create recipe in draft status
npm run create-recipe -- \
  -s legendary-sword \
  -v 1 \
  -k one-of-one \
  -u https://ipfs.io/ipfs/QmMetadataHash \
  --supply-cap 1 \
  --status draft

# 2. Review recipe details
# (Check on-chain or via frontend)

# 3. Activate when ready
npm run toggle-recipe -- \
  -s legendary-sword \
  -v 1 \
  --status active
```

### Creating an Edition Recipe

```bash
npm run create-recipe -- \
  -s common-potion \
  -v 1 \
  -k edition \
  -u https://ipfs.io/ipfs/QmEditionMetadata \
  --supply-cap 1000 \
  --status active
```

### Creating a Semi-Fungible Token Recipe

```bash
npm run create-recipe -- \
  -s gold-coins \
  -v 1 \
  -k semi-fungible \
  -u https://ipfs.io/ipfs/QmTokenMetadata \
  --supply-cap 10000 \
  --status active
```

## Frontend Recipe Management

The frontend provides a UI for recipe management:

1. **View Recipes**: Navigate to `/creator/recipes`
2. **Create Recipe**: Click "Create Recipe" or navigate to `/creator/recipes/new`
3. **View Details**: Click on a recipe to see full details
4. **Toggle Status**: Use the status toggle (when implemented)

## Troubleshooting

### Recipe Not Found
- Verify slug and version match exactly
- Check that recipe was created on the correct network
- Ensure forge config exists for your authority

### Cannot Forge
- Check recipe status is `Active`
- Verify `go_live_unix_time` has passed (if set)
- Ensure supply cap hasn't been reached
- Verify all ingredient constraints are met

### Version Conflicts
- Each `(slug, version)` combination must be unique
- Use versioning to create updates, not duplicate slugs

## Best Practices

1. **Start in Draft**: Create recipes in draft status, review, then activate
2. **Use Versioning**: Create new versions for updates rather than modifying active recipes
3. **Test Metadata**: Verify metadata URI is accessible before activating
4. **Set Supply Caps**: Use supply caps to prevent unlimited minting
5. **Document Ingredients**: Clearly document what ingredients are required
6. **Monitor Usage**: Track `minted` count to understand recipe usage

## Next Steps

- See [Localnet Guide](localnet.md) for testing recipes locally
- See [Testing Guide](testing-guide.md) for integration testing
- Check `vision.md` for program architecture details

