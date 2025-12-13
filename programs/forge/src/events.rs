use anchor_lang::prelude::*;

/// Emitted when a new forge configuration is initialized.
#[event]
pub struct ForgeInitialized {
    pub forge_config: Pubkey,
    pub authority: Pubkey,
    pub collection_mint: Option<Pubkey>,
    pub freeze_authority: Option<Pubkey>,
    pub default_royalty_bps: u16,
    pub recipe_creation_enabled: bool,
}

/// Emitted when forge configuration fields are updated.
#[event]
pub struct ForgeConfigUpdated {
    pub forge_config: Pubkey,
    pub authority: Pubkey,
    pub collection_mint: Option<Pubkey>,
    pub freeze_authority: Option<Pubkey>,
    pub default_royalty_bps: u16,
    pub recipe_creation_enabled: bool,
}

/// Emitted when a recipe is created.
#[event]
pub struct RecipeCreated {
    pub forge_config: Pubkey,
    pub recipe: Pubkey,
    pub slug: String,
    pub version: u16,
    pub status: crate::state::RecipeStatus,
}

/// Emitted when a recipe is updated.
#[event]
pub struct RecipeUpdated {
    pub forge_config: Pubkey,
    pub recipe: Pubkey,
    pub slug: String,
    pub version: u16,
}

/// Emitted when a recipe status flag changes.
#[event]
pub struct RecipeStatusChanged {
    pub forge_config: Pubkey,
    pub recipe: Pubkey,
    pub previous: crate::state::RecipeStatus,
    pub next: crate::state::RecipeStatus,
}

/// Emitted when an asset is successfully forged.
#[event]
pub struct AssetForged {
    pub forge_config: Pubkey,
    pub recipe: Pubkey,
    pub forger: Pubkey,
    pub mint: Pubkey,
    pub minted_count: u64,
    pub supply_cap: Option<u64>,
    pub input_hash: [u8; crate::state::constants::HASH_BYTES],
}
