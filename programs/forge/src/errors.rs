use anchor_lang::prelude::*;

#[error_code]
pub enum ForgeError {
    #[msg("This functionality has not been implemented yet.")]
    Unimplemented,
    #[msg("Recipe slug exceeds maximum length.")]
    SlugTooLong,
    #[msg("Metadata URI exceeds maximum length.")]
    MetadataUriTooLong,
    #[msg("Provided creator list exceeds maximum supported size.")]
    TooManyCreators,
    #[msg("Ingredient constraint list exceeds maximum supported size.")]
    TooManyIngredients,
    #[msg("Expected bump seed not found in context.")]
    MissingBump,
    #[msg("Caller is not authorized to perform this action.")]
    UnauthorizedAuthority,
    #[msg("Royalty basis points must be between 0 and 10_000.")]
    InvalidRoyaltyBasisPoints,
    #[msg("Recipe creation is currently disabled.")]
    RecipeCreationDisabled,
    #[msg("Recipe already reached the configured supply cap.")]
    SupplyCapReached,
    #[msg("Requested supply cap is below the already minted quantity.")]
    SupplyCapBelowMinted,
    #[msg("Recipe status is unchanged.")]
    RecipeStatusUnchanged,
    #[msg("Recipe is retired and cannot transition to another status.")]
    RecipeRetiredImmutable,
    #[msg("Recipe status cannot be set to retired during creation.")]
    RecipeInvalidInitialStatus,
    #[msg("Recipe is not active.")]
    RecipeInactive,
    #[msg("Recipe is not live yet.")]
    RecipeNotLive,
    #[msg("Recipe input has already been consumed.")]
    DuplicateRecipeUse,
    #[msg("Arithmetic overflow while updating recipe state.")]
    ArithmeticOverflow,
    #[msg("Ingredient verification failed for signer requirement.")]
    MissingRequiredSigner,
    #[msg("Ingredient type currently unsupported by on-chain verifier.")]
    IngredientTypeUnsupported,
    #[msg("Computed ingredient hash does not match provided digest.")]
    IngredientHashMismatch,
    #[msg("Required token account not found in remaining accounts.")]
    MissingTokenAccount,
    #[msg("Token account owner does not match forger.")]
    TokenAccountOwnerMismatch,
    #[msg("Token account mint does not match required mint.")]
    TokenMintMismatch,
    #[msg("Token account balance is insufficient for requirement.")]
    InsufficientTokenBalance,
    #[msg("Required collection NFT not found in remaining accounts.")]
    MissingCollectionNft,
    #[msg("Allowlist proof not provided in remaining accounts.")]
    MissingAllowlistProof,
    #[msg("Asset minting functionality is not yet implemented.")]
    MintingNotImplemented,
}
