use anchor_lang::prelude::*;

use crate::{
    errors::ForgeError,
    events::{RecipeCreated, RecipeStatusChanged, RecipeUpdated},
    state::{
        constants::{FORGE_CONFIG_SEED, RECIPE_SEED},
        CreatorShare, ForgeConfig, IngredientConstraint, OutputKind, Recipe, RecipeStatus,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateRecipeArgs {
    pub slug: String,
    pub version: u16,
    pub output_kind: OutputKind,
    pub supply_cap: Option<u64>,
    pub metadata_uri: String,
    pub creators: Vec<CreatorShare>,
    pub collection_mint: Option<Pubkey>,
    pub go_live_unix_time: Option<i64>,
    pub ingredient_constraints: Vec<IngredientConstraint>,
    pub status: RecipeStatus,
    pub previous_version: Option<Pubkey>,
}

#[derive(Accounts)]
#[instruction(args: CreateRecipeArgs)]
pub struct CreateRecipe<'info> {
    #[account(
        mut,
        seeds = [FORGE_CONFIG_SEED, forge_config.authority.as_ref()],
        bump = forge_config.bump
    )]
    pub forge_config: Account<'info, ForgeConfig>,
    #[account(
        init,
        payer = authority,
        space = Recipe::space(
            args.slug.len(),
            &args.output_kind,
            args.metadata_uri.len(),
            &args.creators,
            &args.ingredient_constraints
        ),
        seeds = [
            RECIPE_SEED,
            forge_config.key().as_ref(),
            args.slug.as_bytes(),
            &args.version.to_le_bytes()
        ],
        bump
    )]
    pub recipe: Account<'info, Recipe>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_recipe(ctx: Context<CreateRecipe>, args: CreateRecipeArgs) -> Result<()> {
    let CreateRecipe {
        forge_config,
        recipe,
        authority,
        ..
    } = ctx.accounts;

    require!(
        forge_config.recipe_creation_enabled,
        ForgeError::RecipeCreationDisabled
    );
    require_keys_eq!(
        authority.key(),
        forge_config.authority,
        ForgeError::UnauthorizedAuthority
    );
    require!(
        args.status != RecipeStatus::Retired,
        ForgeError::RecipeInvalidInitialStatus
    );

    Recipe::validate_lengths(&args.slug, &args.metadata_uri, &args.creators)?;
    Recipe::validate_ingredients(&args.ingredient_constraints)?;

    if let Some(cap) = args.supply_cap {
        require!(cap > 0, ForgeError::SupplyCapReached);
    }

    // Get bump from PDA derivation - Anchor finds it automatically during init
    let (_, bump) = Pubkey::find_program_address(
        &[
            RECIPE_SEED,
            forge_config.key().as_ref(),
            args.slug.as_bytes(),
            &args.version.to_le_bytes(),
        ],
        ctx.program_id,
    );
    recipe.set_inner(Recipe {
        forge_config: forge_config.key(),
        slug: args.slug.clone(),
        version: args.version,
        output_kind: args.output_kind,
        supply_cap: args.supply_cap,
        minted: 0,
        metadata_uri: args.metadata_uri.clone(),
        creators: args.creators.clone(),
        collection_mint: args.collection_mint,
        go_live_unix_time: args.go_live_unix_time,
        ingredient_constraints: args.ingredient_constraints.clone(),
        status: args.status,
        previous_version: args.previous_version,
        bump,
        _reserved: [0; 7],
    });

    emit!(RecipeCreated {
        forge_config: forge_config.key(),
        recipe: recipe.key(),
        slug: args.slug,
        version: args.version,
        status: recipe.status,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateRecipeArgs {
    pub metadata_uri: Option<String>,
    pub creators: Option<Vec<CreatorShare>>,
    pub collection_mint: Option<Option<Pubkey>>,
    pub go_live_unix_time: Option<Option<i64>>,
    pub ingredient_constraints: Option<Vec<IngredientConstraint>>,
    pub supply_cap: Option<Option<u64>>,
    pub output_kind: Option<OutputKind>,
}

#[derive(Accounts)]
#[instruction(args: UpdateRecipeArgs)]
pub struct UpdateRecipe<'info> {
    #[account(
        seeds = [FORGE_CONFIG_SEED, forge_config.authority.as_ref()],
        bump = forge_config.bump
    )]
    pub forge_config: Account<'info, ForgeConfig>,
    #[account(
        mut,
        seeds = [
            RECIPE_SEED,
            forge_config.key().as_ref(),
            recipe.slug.as_bytes(),
            &recipe.version.to_le_bytes()
        ],
        bump = recipe.bump
    )]
    pub recipe: Account<'info, Recipe>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_recipe(ctx: Context<UpdateRecipe>, args: UpdateRecipeArgs) -> Result<()> {
    let UpdateRecipe {
        forge_config,
        recipe,
        authority,
        ..
    } = ctx.accounts;

    require_keys_eq!(
        authority.key(),
        forge_config.authority,
        ForgeError::UnauthorizedAuthority
    );

    let new_metadata_uri = args
        .metadata_uri
        .unwrap_or_else(|| recipe.metadata_uri.clone());
    let new_creators = args.creators.unwrap_or_else(|| recipe.creators.clone());
    let new_collection = args.collection_mint.unwrap_or(recipe.collection_mint);
    let new_go_live = args.go_live_unix_time.unwrap_or(recipe.go_live_unix_time);
    let new_ingredients = args
        .ingredient_constraints
        .unwrap_or_else(|| recipe.ingredient_constraints.clone());
    let new_output_kind = args.output_kind.unwrap_or(recipe.output_kind);
    let new_supply_cap = args.supply_cap.unwrap_or(recipe.supply_cap);

    Recipe::validate_lengths(&recipe.slug, &new_metadata_uri, &new_creators)?;
    Recipe::validate_ingredients(&new_ingredients)?;

    if let Some(cap) = new_supply_cap {
        require!(cap >= recipe.minted, ForgeError::SupplyCapBelowMinted);
    }

    let new_space = Recipe::space(
        recipe.slug.len(),
        &new_output_kind,
        new_metadata_uri.len(),
        &new_creators,
        &new_ingredients,
    );
    let account_info = recipe.to_account_info();
    if account_info.data_len() < new_space {
        account_info.resize(new_space)?;
    }

    recipe.metadata_uri = new_metadata_uri;
    recipe.creators = new_creators;
    recipe.collection_mint = new_collection;
    recipe.go_live_unix_time = new_go_live;
    recipe.ingredient_constraints = new_ingredients;
    recipe.output_kind = new_output_kind;
    recipe.supply_cap = new_supply_cap;

    emit!(RecipeUpdated {
        forge_config: forge_config.key(),
        recipe: recipe.key(),
        slug: recipe.slug.clone(),
        version: recipe.version,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SetRecipeStatusArgs {
    pub status: RecipeStatus,
}

#[derive(Accounts)]
pub struct SetRecipeStatus<'info> {
    #[account(
        seeds = [FORGE_CONFIG_SEED, forge_config.authority.as_ref()],
        bump = forge_config.bump
    )]
    pub forge_config: Account<'info, ForgeConfig>,
    #[account(
        mut,
        seeds = [
            RECIPE_SEED,
            forge_config.key().as_ref(),
            recipe.slug.as_bytes(),
            &recipe.version.to_le_bytes()
        ],
        bump = recipe.bump
    )]
    pub recipe: Account<'info, Recipe>,
    pub authority: Signer<'info>,
}

pub fn set_recipe_status(ctx: Context<SetRecipeStatus>, args: SetRecipeStatusArgs) -> Result<()> {
    let SetRecipeStatus {
        forge_config,
        recipe,
        authority,
    } = ctx.accounts;

    require_keys_eq!(
        authority.key(),
        forge_config.authority,
        ForgeError::UnauthorizedAuthority
    );
    require!(
        recipe.status != args.status,
        ForgeError::RecipeStatusUnchanged
    );
    require!(
        recipe.status != RecipeStatus::Retired || args.status == RecipeStatus::Retired,
        ForgeError::RecipeRetiredImmutable
    );

    let previous = recipe.status;
    recipe.status = args.status;

    emit!(RecipeStatusChanged {
        forge_config: forge_config.key(),
        recipe: recipe.key(),
        previous,
        next: recipe.status,
    });

    Ok(())
}
