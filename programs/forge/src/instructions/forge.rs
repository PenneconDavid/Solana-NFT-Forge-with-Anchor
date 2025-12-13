use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    cpi::ingredients::{verify_allowlist, verify_collection_nft, verify_token_mint},
    cpi::minting::mint_one_of_one,
    errors::ForgeError,
    events::AssetForged,
    state::{
        constants::{FORGE_CONFIG_SEED, HASH_BYTES, RECIPE_SEED, RECIPE_USE_SEED},
        ForgeConfig, IngredientConstraint, Recipe, RecipeStatus, RecipeUse,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ForgeAssetArgs {
    pub input_hash: [u8; HASH_BYTES],
}

#[derive(Accounts)]
#[instruction(args: ForgeAssetArgs)]
pub struct ForgeAsset<'info> {
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
    #[account(
        init,
        payer = forger,
        space = RecipeUse::SIZE,
        seeds = [
            RECIPE_USE_SEED,
            recipe.key().as_ref(),
            args.input_hash.as_ref()
        ],
        bump
    )]
    pub recipe_use: Account<'info, RecipeUse>,
    #[account(mut)]
    pub forger: Signer<'info>,

    // ---------------------------------------------------------------------
    // Minting accounts (kept OUT of remaining_accounts to avoid breaking
    // ingredient verification heuristics).
    // ---------------------------------------------------------------------

    /// The newly-created mint for the forged NFT.
    #[account(
        init,
        payer = forger,
        mint::decimals = 0,
        mint::authority = forger,
        mint::freeze_authority = forger,
    )]
    pub mint: Account<'info, Mint>,

    /// The forger's ATA for the newly-created mint (receives 1 token).
    #[account(
        init,
        payer = forger,
        associated_token::mint = mint,
        associated_token::authority = forger,
    )]
    pub mint_ata: Account<'info, TokenAccount>,

    /// Token Metadata program.
    ///
    /// Checked by address constraint to avoid invoking an arbitrary program.
    /// CHECK: The `address = mpl_token_metadata::ID` constraint ensures this is the canonical
    /// Metaplex Token Metadata program; we only pass it as the CPI program handle.
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    /// Metaplex metadata PDA for `mint`.
    /// Derived with the Token Metadata program as the PDA program.
    /// CHECK: This is a PDA owned/managed by the Token Metadata program. We verify the PDA
    /// address via seeds + `seeds::program = token_metadata_program.key()` and only use it for CPI.
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub metadata: UncheckedAccount<'info>,

    /// Metaplex master edition PDA for `mint`.
    /// CHECK: This is a PDA owned/managed by the Token Metadata program. We verify the PDA
    /// address via seeds + `seeds::program = token_metadata_program.key()` and only use it for CPI.
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition"
        ],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn forge_asset(ctx: Context<ForgeAsset>, args: ForgeAssetArgs) -> Result<()> {
    let ForgeAsset {
        forge_config,
        recipe,
        recipe_use,
        forger,
        mint,
        mint_ata,
        token_metadata_program,
        metadata,
        master_edition,
        token_program,
        system_program,
        rent,
        ..
    } = ctx.accounts;

    require!(
        recipe.status == RecipeStatus::Active,
        ForgeError::RecipeInactive
    );

    let now = Clock::get()?.unix_timestamp;
    if let Some(go_live) = recipe.go_live_unix_time {
        require!(now >= go_live, ForgeError::RecipeNotLive);
    }

    if let Some(cap) = recipe.supply_cap {
        require!(recipe.minted < cap, ForgeError::SupplyCapReached);
    }

    // Verify ingredients inline to avoid lifetime issues with Context
    let computed_hash = {
        let mut hash_chunks: Vec<Vec<u8>> = Vec::with_capacity(recipe.ingredient_constraints.len());

        for constraint in &recipe.ingredient_constraints {
            match constraint {
                IngredientConstraint::Signer { authority } => {
                    let mut matched = forger.key() == *authority;
                    if !matched {
                        matched = ctx
                            .remaining_accounts
                            .iter()
                            .any(|acc| acc.is_signer && *acc.key == *authority);
                    }
                    require!(matched, ForgeError::MissingRequiredSigner);

                    let mut chunk = Vec::with_capacity(1 + 32);
                    chunk.push(0u8);
                    chunk.extend_from_slice(authority.as_ref());
                    hash_chunks.push(chunk);
                }
                IngredientConstraint::CustomSeeds { seeds } => {
                    let mut chunk = Vec::with_capacity(1 + seeds.len());
                    chunk.push(1u8);
                    chunk.extend_from_slice(seeds);
                    hash_chunks.push(chunk);
                }
                IngredientConstraint::TokenMint { mint, amount } => {
                    let chunk =
                        verify_token_mint(&forger.key(), mint, *amount, ctx.remaining_accounts)?;
                    hash_chunks.push(chunk);
                }
                IngredientConstraint::CollectionNft { collection_mint } => {
                    let chunk = verify_collection_nft(
                        &forger.key(),
                        collection_mint,
                        ctx.remaining_accounts,
                    )?;
                    hash_chunks.push(chunk);
                }
                IngredientConstraint::Allowlist { merkle_root } => {
                    let chunk = verify_allowlist(merkle_root, ctx.remaining_accounts)?;
                    hash_chunks.push(chunk);
                }
            }
        }

        use solana_program::hash::hashv;
        if hash_chunks.is_empty() {
            hashv(&[&[]]).to_bytes()
        } else {
            let hash_inputs: Vec<&[u8]> =
                hash_chunks.iter().map(|chunk| chunk.as_slice()).collect();
            hashv(&hash_inputs).to_bytes()
        }
    };
    require!(
        computed_hash == args.input_hash,
        ForgeError::IngredientHashMismatch
    );

    // ---------------------------------------------------------------------
    // Mint the output asset (Step 2 MVP: OneOfOne only).
    // ---------------------------------------------------------------------
    let minted_mint = match recipe.output_kind {
        crate::state::OutputKind::OneOfOne => mint_one_of_one(
            recipe,
            &recipe.creators,
            &recipe.metadata_uri,
            forge_config.default_royalty_bps,
            // Step 2 choice: derive name from slug, constant symbol.
            &recipe.slug,
            "FORGE",
            &token_metadata_program.to_account_info(),
            &metadata.to_account_info(),
            &master_edition.to_account_info(),
            &mint.to_account_info(),
            &mint_ata.to_account_info(),
            &forger.to_account_info(),
            &token_program.to_account_info(),
            &system_program.to_account_info(),
            &rent.to_account_info(),
        )?,
        _ => return Err(ForgeError::MintingNotImplemented.into()),
    };

    let new_minted = recipe
        .minted
        .checked_add(1)
        .ok_or(ForgeError::ArithmeticOverflow)?;
    recipe.minted = new_minted;

    // Get bump from PDA derivation
    let (_, bump) = Pubkey::find_program_address(
        &[
            RECIPE_USE_SEED,
            recipe.key().as_ref(),
            args.input_hash.as_ref(),
        ],
        ctx.program_id,
    );
    recipe_use.set_inner(RecipeUse {
        recipe: recipe.key(),
        input_hash: args.input_hash,
        forged_at: now,
        bump,
        _reserved: [0; 7],
    });

    emit!(AssetForged {
        forge_config: forge_config.key(),
        recipe: recipe.key(),
        forger: forger.key(),
        mint: minted_mint,
        minted_count: recipe.minted,
        supply_cap: recipe.supply_cap,
        input_hash: args.input_hash,
    });

    Ok(())
}
