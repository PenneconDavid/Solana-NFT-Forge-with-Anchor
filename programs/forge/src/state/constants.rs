//! Shared constants and sizing helpers for Forge accounts.

/// Maximum number of creators allowed per recipe metadata.
pub const MAX_CREATORS: usize = 5;

/// Maximum length of the recipe slug (in bytes). Seed-safe (≤32).
pub const MAX_RECIPE_SLUG_LENGTH: usize = 32;

/// Maximum length of the metadata URI stored on a recipe.
pub const MAX_METADATA_URI_LENGTH: usize = 200;

/// Maximum number of ingredient constraints supported by a recipe.
pub const MAX_INGREDIENTS: usize = 10;

/// Size of a 32-byte hash (used for recipe-use records).
pub const HASH_BYTES: usize = 32;

/// Seed prefix used when deriving the `ForgeConfig` PDA.
pub const FORGE_CONFIG_SEED: &[u8] = b"forge";

/// Seed prefix used when deriving a `Recipe` PDA.
pub const RECIPE_SEED: &[u8] = b"recipe";

/// Seed prefix used when deriving a `RecipeUse` PDA.
pub const RECIPE_USE_SEED: &[u8] = b"recipe-use";
