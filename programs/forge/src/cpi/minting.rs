use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo};

use mpl_token_metadata::{
    instructions::{
        CreateMasterEditionV3Cpi, CreateMasterEditionV3CpiAccounts, CreateMasterEditionV3InstructionArgs,
        CreateMetadataAccountV3Cpi, CreateMetadataAccountV3CpiAccounts, CreateMetadataAccountV3InstructionArgs,
    },
    types::{Creator, DataV2},
};

use crate::{
    errors::ForgeError,
    state::{ingredients::CreatorShare, Recipe},
};

/// Mints a 1/1 NFT (supply = 1).
///
/// STATUS: Structure ready, requires full Token Metadata CPI integration.
///
/// Full implementation requires:
/// 1. CPI to SPL Token program to initialize mint (decimals=0, supply=0)
/// 2. CPI to Associated Token program to create ATA
/// 3. CPI to SPL Token program to mint 1 token
/// 4. CPI to Metaplex Token Metadata program to create metadata account
/// 5. Set collection (if recipe.collection_mint is Some)
/// 6. Set creators and royalty basis points
///
/// This is complex and requires:
/// - Metaplex Token Metadata program ID and account structures
/// - Proper account derivations for metadata PDA
/// - CPI account setup with all required accounts
///
/// For Phase B MVP: Core forging flow works (ingredient verification + recipe use tracking).
/// Asset minting can be completed as a follow-up with full Token Metadata integration.
pub fn mint_one_of_one<'info>(
    _recipe: &Recipe,
    creators: &[CreatorShare],
    metadata_uri: &str,
    seller_fee_basis_points: u16,
    name: &str,
    symbol: &str,
    token_metadata_program: &AccountInfo<'info>,
    metadata: &AccountInfo<'info>,
    master_edition: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    mint_ata: &AccountInfo<'info>,
    forger: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    rent: &AccountInfo<'info>,
) -> Result<Pubkey> {
    // ---------------------------------------------------------------------
    // 1) Mint exactly 1 token to the forger's ATA.
    // ---------------------------------------------------------------------
    token::mint_to(
        CpiContext::new(
            token_program.clone(),
            MintTo {
                mint: mint.clone(),
                to: mint_ata.clone(),
                authority: forger.clone(),
            },
        ),
        1,
    )?;

    // ---------------------------------------------------------------------
    // 2) Create metadata account via Metaplex Token Metadata CPI.
    // ---------------------------------------------------------------------
    let mpl_creators = if creators.is_empty() {
        None
    } else {
        Some(
            creators
                .iter()
                .map(|c| Creator {
                    address: c.address,
                    verified: c.verified,
                    share: c.share,
                })
                .collect::<Vec<_>>(),
        )
    };

    let data = DataV2 {
        name: name.to_string(),
        symbol: symbol.to_string(),
        uri: metadata_uri.to_string(),
        seller_fee_basis_points,
        creators: mpl_creators,
        collection: None,
        uses: None,
    };

    CreateMetadataAccountV3Cpi::new(
        token_metadata_program,
        CreateMetadataAccountV3CpiAccounts {
            metadata,
            mint,
            mint_authority: forger,
            payer: forger,
            update_authority: (forger, true),
            system_program,
            rent: Some(rent),
        },
        CreateMetadataAccountV3InstructionArgs {
            data,
            is_mutable: true,
            collection_details: None,
        },
    )
    .invoke()
    .map_err(|_| error!(ForgeError::MintingNotImplemented))?;

    // ---------------------------------------------------------------------
    // 3) Create master edition to mark this as an NFT and lock supply.
    // ---------------------------------------------------------------------
    CreateMasterEditionV3Cpi::new(
        token_metadata_program,
        CreateMasterEditionV3CpiAccounts {
            edition: master_edition,
            mint,
            update_authority: forger,
            mint_authority: forger,
            payer: forger,
            metadata,
            token_program,
            system_program,
            rent: Some(rent),
        },
        CreateMasterEditionV3InstructionArgs { max_supply: Some(0) },
    )
    .invoke()
    .map_err(|_| error!(ForgeError::MintingNotImplemented))?;

    Ok(mint.key())
}

/// Mints an edition NFT from a parent master edition.
///
/// STATUS: Structure ready, requires full Token Metadata CPI integration.
///
/// Full implementation requires:
/// 1. Verify parent NFT exists and is a master edition
/// 2. CPI to create edition mint (decimals=0, supply=0)
/// 3. CPI to create edition metadata account
/// 4. Link edition to parent via edition marker account
/// 5. Set creators and royalties
pub fn mint_edition<'info>(
    _recipe: &Recipe,
    _parent_mint: &Pubkey,
    _creators: &[CreatorShare],
    _metadata_uri: &str,
    _remaining_accounts: &[AccountInfo<'info>],
) -> Result<Pubkey> {
    // TODO: Implement edition minting CPI
    // See documentation above for required steps

    Err(ForgeError::MintingNotImplemented.into())
}

/// Mints a semi-fungible token (supply > 1, typically used for limited edition items).
///
/// STATUS: Structure ready, requires full Token Metadata CPI integration.
///
/// Full implementation requires:
/// 1. CPI to create mint with specified supply (decimals typically 0)
/// 2. CPI to create metadata account
/// 3. Set collection (if recipe.collection_mint is Some)
/// 4. Set creators and royalty basis points
pub fn mint_semi_fungible<'info>(
    _recipe: &Recipe,
    _creators: &[CreatorShare],
    _metadata_uri: &str,
    _remaining_accounts: &[AccountInfo<'info>],
) -> Result<Pubkey> {
    // TODO: Implement semi-fungible minting
    // See documentation above for required steps

    Err(ForgeError::MintingNotImplemented.into())
}
