use anchor_lang::prelude::*;

use super::{constants::*, CreatorShare, IngredientConstraint, OutputKind, RecipeStatus};

/// PDA storing the definition of a forgeable recipe.
#[account]
pub struct Recipe {
    /// Parent forge configuration PDA.
    pub forge_config: Pubkey,
    /// Human-readable slug used to reference the recipe.
    pub slug: String,
    /// Semantic version of the recipe.
    pub version: u16,
    /// Output asset semantics.
    pub output_kind: OutputKind,
    /// Optional supply cap (None = unlimited).
    pub supply_cap: Option<u64>,
    /// Number of successful mints recorded for this recipe.
    pub minted: u64,
    /// Metadata URI or template.
    pub metadata_uri: String,
    /// Creators assigned to the minted asset metadata.
    pub creators: Vec<CreatorShare>,
    /// Optional override for collection mint.
    pub collection_mint: Option<Pubkey>,
    /// Optional go-live timestamp (Unix seconds).
    pub go_live_unix_time: Option<i64>,
    /// Ingredient constraints that must be satisfied to forge.
    pub ingredient_constraints: Vec<IngredientConstraint>,
    /// Lifecycle status of the recipe.
    pub status: RecipeStatus,
    /// Optional pointer to a previous recipe version.
    pub previous_version: Option<Pubkey>,
    /// Bump seed used when deriving the PDA.
    pub bump: u8,
    /// Reserved padding.
    pub _reserved: [u8; 7],
}

impl Recipe {
    /// Calculate the number of bytes required for a recipe with the provided data.
    pub fn space(
        slug_len: usize,
        output_kind: &OutputKind,
        metadata_uri_len: usize,
        creators: &[CreatorShare],
        ingredient_constraints: &[IngredientConstraint],
    ) -> usize {
        let creators_size = 4 + creators.len() * CreatorShare::SIZE;
        let ingredient_size = 4 + ingredient_constraints
            .iter()
            .map(|c| c.size())
            .sum::<usize>();

        8 // discriminator
        + 32 // forge_config
        + 4 + slug_len
        + 2
        + output_kind.size()
        + 1 + 8 // Option<u64> supply_cap
        + 8 // minted
        + 4 + metadata_uri_len // metadata uri string
        + creators_size
        + 1 + 32 // Option<Pubkey> collection_mint
        + 1 + 8 // Option<i64> go_live_unix_time
        + ingredient_size
        + RecipeStatus::SIZE
        + 1 + 32 // Option<Pubkey> previous_version
        + 1 // bump
        + 7 // reserved padding
    }

    /// Convenience helper to cap strings at a repository-defined limit.
    pub fn validate_lengths(
        slug: &str,
        metadata_uri: &str,
        creators: &[CreatorShare],
    ) -> Result<()> {
        require!(
            slug.len() <= MAX_RECIPE_SLUG_LENGTH,
            crate::errors::ForgeError::SlugTooLong
        );
        require!(
            metadata_uri.len() <= MAX_METADATA_URI_LENGTH,
            crate::errors::ForgeError::MetadataUriTooLong
        );
        require!(
            creators.len() <= MAX_CREATORS,
            crate::errors::ForgeError::TooManyCreators
        );
        Ok(())
    }

    /// Checks the total number of ingredient constraints against limits.
    pub fn validate_ingredients(ingredients: &[IngredientConstraint]) -> Result<()> {
        require!(
            ingredients.len() <= MAX_INGREDIENTS,
            crate::errors::ForgeError::TooManyIngredients
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{constants::MAX_INGREDIENTS, CreatorShare};

    fn sample_creators() -> Vec<CreatorShare> {
        vec![CreatorShare {
            address: Pubkey::new_unique(),
            verified: false,
            share: 100,
        }]
    }

    #[test]
    fn recipe_space_scales_with_metadata() {
        let creators = sample_creators();
        let ingredients = vec![
            IngredientConstraint::Signer {
                authority: Pubkey::new_unique(),
            },
            IngredientConstraint::CustomSeeds {
                seeds: vec![1, 2, 3],
            },
        ];
        let size = Recipe::space(4, &OutputKind::OneOfOne, 32, &creators, &ingredients);
        assert!(size > 0);
    }

    #[test]
    fn validate_lengths_enforces_limits() {
        let creators = sample_creators();
        assert!(Recipe::validate_lengths("abcd", "uri", &creators).is_ok());
        let long_slug = "s".repeat(MAX_RECIPE_SLUG_LENGTH + 1);
        assert!(Recipe::validate_lengths(&long_slug, "uri", &creators).is_err());
    }

    #[test]
    fn validate_ingredients_enforces_limit() {
        let ingredients = vec![IngredientConstraint::Signer {
            authority: Pubkey::new_unique(),
        }];
        assert!(Recipe::validate_ingredients(&ingredients).is_ok());

        let too_many = vec![
            IngredientConstraint::CustomSeeds {
                seeds: vec![0u8; 1],
            };
            MAX_INGREDIENTS + 1
        ];
        assert!(Recipe::validate_ingredients(&too_many).is_err());
    }
}
