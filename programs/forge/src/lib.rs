use anchor_lang::prelude::*;

pub mod cpi;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
pub use instructions::{
    CreateRecipe, CreateRecipeArgs, ForgeAsset, ForgeAssetArgs, InitializeForge,
    InitializeForgeArgs, SetForgeConfig, SetForgeConfigArgs, SetRecipeStatus, SetRecipeStatusArgs,
    UpdateRecipe, UpdateRecipeArgs,
};

declare_id!("BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN");

#[program]
pub mod forge {
    use super::*;

    pub fn initialize_forge(
        ctx: Context<InitializeForge>,
        args: InitializeForgeArgs,
    ) -> Result<()> {
        instructions::initialize_forge(ctx, args)
    }

    pub fn set_forge_config(ctx: Context<SetForgeConfig>, args: SetForgeConfigArgs) -> Result<()> {
        instructions::set_forge_config(ctx, args)
    }

    pub fn create_recipe(ctx: Context<CreateRecipe>, args: CreateRecipeArgs) -> Result<()> {
        instructions::create_recipe(ctx, args)
    }

    pub fn update_recipe(ctx: Context<UpdateRecipe>, args: UpdateRecipeArgs) -> Result<()> {
        instructions::update_recipe(ctx, args)
    }

    pub fn set_recipe_status(
        ctx: Context<SetRecipeStatus>,
        args: SetRecipeStatusArgs,
    ) -> Result<()> {
        instructions::set_recipe_status(ctx, args)
    }

    pub fn forge_asset(ctx: Context<ForgeAsset>, args: ForgeAssetArgs) -> Result<()> {
        instructions::forge_asset(ctx, args)
    }
}
