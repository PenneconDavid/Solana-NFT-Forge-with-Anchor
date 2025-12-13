use anchor_lang::prelude::*;

/// Represents the primary type of asset produced by a recipe.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum OutputKind {
    OneOfOne,
    Edition { parent_mint: Pubkey },
    SemiFungible,
}

impl OutputKind {
    /// Number of bytes required to serialize this enum instance.
    pub fn size(&self) -> usize {
        match self {
            Self::OneOfOne | Self::SemiFungible => 1, // variant tag only
            Self::Edition { .. } => 1 + 32,
        }
    }
}

/// Lifecycle status applied to a recipe.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecipeStatus {
    Draft,
    Active,
    Paused,
    Retired,
}

/// Creator entry used when configuring metadata for forged assets.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct CreatorShare {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

impl CreatorShare {
    pub const SIZE: usize = 32 + 1 + 1;
}

/// Constraint required to satisfy a recipe.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum IngredientConstraint {
    /// Requires ownership (or transfer) of an SPL token mint.
    TokenMint { mint: Pubkey, amount: u64 },
    /// Requires ownership of an NFT belonging to a collection.
    CollectionNft { collection_mint: Pubkey },
    /// Requires inclusion in an allowlist proven by a Merkle root.
    Allowlist { merkle_root: [u8; 32] },
    /// Requires a specific signer to authorize the forge request.
    Signer { authority: Pubkey },
    /// Requires derived seeds to match a deterministic recipe value.
    CustomSeeds { seeds: Vec<u8> },
}

impl IngredientConstraint {
    /// Number of bytes required to encode this constraint via Borsh.
    pub fn size(&self) -> usize {
        match self {
            Self::TokenMint { .. } => 1 + 32 + 8,
            Self::CollectionNft { .. } => 1 + 32,
            Self::Allowlist { .. } => 1 + 32,
            Self::Signer { .. } => 1 + 32,
            Self::CustomSeeds { seeds } => 1 + 4 + seeds.len(),
        }
    }
}

impl RecipeStatus {
    pub const SIZE: usize = 1;
}
