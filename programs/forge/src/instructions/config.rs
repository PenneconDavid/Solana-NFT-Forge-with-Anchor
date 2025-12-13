use anchor_lang::prelude::*;

use crate::{
    errors::ForgeError,
    events::ForgeConfigUpdated,
    state::{constants::FORGE_CONFIG_SEED, ForgeConfig},
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct SetForgeConfigArgs {
    pub collection_mint: Option<Option<Pubkey>>,
    pub freeze_authority: Option<Option<Pubkey>>,
    pub default_royalty_bps: Option<u16>,
    pub recipe_creation_enabled: Option<bool>,
}

#[derive(Accounts)]
pub struct SetForgeConfig<'info> {
    #[account(
        mut,
        seeds = [
            FORGE_CONFIG_SEED,
            forge_config.authority.as_ref()
        ],
        bump = forge_config.bump
    )]
    pub forge_config: Account<'info, ForgeConfig>,
    pub authority: Signer<'info>,
}

pub fn set_forge_config(ctx: Context<SetForgeConfig>, args: SetForgeConfigArgs) -> Result<()> {
    let SetForgeConfig {
        forge_config,
        authority,
    } = ctx.accounts;

    require_keys_eq!(
        authority.key(),
        forge_config.authority,
        ForgeError::UnauthorizedAuthority
    );

    if let Some(target_collection_mint) = args.collection_mint {
        forge_config.collection_mint = target_collection_mint;
    }

    if let Some(target_freeze_authority) = args.freeze_authority {
        forge_config.freeze_authority = target_freeze_authority;
    }

    if let Some(bps) = args.default_royalty_bps {
        require!(bps <= 10_000, ForgeError::InvalidRoyaltyBasisPoints);
        forge_config.default_royalty_bps = bps;
    }

    if let Some(enabled) = args.recipe_creation_enabled {
        forge_config.recipe_creation_enabled = enabled;
    }

    emit!(ForgeConfigUpdated {
        forge_config: forge_config.key(),
        authority: authority.key(),
        collection_mint: forge_config.collection_mint,
        freeze_authority: forge_config.freeze_authority,
        default_royalty_bps: forge_config.default_royalty_bps,
        recipe_creation_enabled: forge_config.recipe_creation_enabled,
    });

    Ok(())
}
