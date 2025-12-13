use anchor_lang::prelude::*;

use super::constants::HASH_BYTES;

/// PDA that tracks deterministic ingredient combinations already used.
#[account]
pub struct RecipeUse {
    /// Recipe PDA associated with this usage record.
    pub recipe: Pubkey,
    /// Hash of the deterministic input set that has been consumed.
    pub input_hash: [u8; HASH_BYTES],
    /// Unix timestamp of the forge event (set when instruction executes).
    pub forged_at: i64,
    /// Bump seed for PDA derivation.
    pub bump: u8,
    /// Reserved padding.
    pub _reserved: [u8; 7],
}

impl RecipeUse {
    pub const SIZE: usize = 8 // discriminator
        + 32 // recipe
        + HASH_BYTES // input hash
        + 8 // forged_at
        + 1 // bump
        + 7; // reserved padding
}
