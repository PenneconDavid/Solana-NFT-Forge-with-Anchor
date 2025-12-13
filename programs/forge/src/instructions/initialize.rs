use anchor_lang::prelude::*;

use crate::{
    errors::ForgeError,
    events::ForgeInitialized,
    state::{constants::FORGE_CONFIG_SEED, ForgeConfig},
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct InitializeForgeArgs {
    pub collection_mint: Option<Pubkey>,
    pub freeze_authority: Option<Pubkey>,
    pub default_royalty_bps: u16,
    pub recipe_creation_enabled: bool,
}

#[derive(Accounts)]
#[instruction(args: InitializeForgeArgs)]
pub struct InitializeForge<'info> {
    #[account(
        init,
        payer = authority,
        space = ForgeConfig::SIZE,
        seeds = [
            FORGE_CONFIG_SEED,
            authority.key().as_ref()
        ],
        bump
    )]
    pub forge_config: Account<'info, ForgeConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_forge(ctx: Context<InitializeForge>, args: InitializeForgeArgs) -> Result<()> {
    let InitializeForge {
        forge_config,
        authority,
        ..
    } = ctx.accounts;

    // Get bump from PDA derivation
    let (_, bump) = Pubkey::find_program_address(
        &[FORGE_CONFIG_SEED, authority.key().as_ref()],
        ctx.program_id,
    );

    forge_config.set_inner(ForgeConfig {
        authority: authority.key(),
        collection_mint: args.collection_mint,
        freeze_authority: args.freeze_authority,
        default_royalty_bps: args.default_royalty_bps,
        recipe_creation_enabled: args.recipe_creation_enabled,
        bump,
        _reserved: [0; 5],
    });

    emit!(ForgeInitialized {
        forge_config: forge_config.key(),
        authority: authority.key(),
        collection_mint: args.collection_mint,
        freeze_authority: args.freeze_authority,
        default_royalty_bps: args.default_royalty_bps,
        recipe_creation_enabled: args.recipe_creation_enabled,
    });

    Ok(())
}
