use anchor_lang::prelude::*;

/// Global configuration PDA for the Forge program.
#[account]
pub struct ForgeConfig {
    /// Authority permitted to manage configuration and recipes.
    pub authority: Pubkey,
    /// Optional collection mint to associate newly forged assets with.
    pub collection_mint: Option<Pubkey>,
    /// Optional freeze authority to assign to minted assets.
    pub freeze_authority: Option<Pubkey>,
    /// Default seller fee basis points applied when recipes omit a value.
    pub default_royalty_bps: u16,
    /// Whether new recipes can currently be created.
    pub recipe_creation_enabled: bool,
    /// Bump seed used to derive the PDA.
    pub bump: u8,
    /// Reserved for future expansion / padding to 8-byte alignment.
    pub _reserved: [u8; 5],
}

impl ForgeConfig {
    /// Number of bytes required to allocate a `ForgeConfig` account.
    pub const SIZE: usize = 8  // account discriminator
        + 32 // authority
        + 1 + 32 // Option<Pubkey>
        + 1 + 32 // Option<Pubkey>
        + 2 // default_royalty_bps
        + 1 // recipe_creation_enabled
        + 1 // bump
        + 5; // reserved padding
}
