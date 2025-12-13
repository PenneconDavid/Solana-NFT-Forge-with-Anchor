use anchor_lang::prelude::*;

/// Metaplex Token Metadata program ID
/// Program ID: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
pub fn token_metadata_program_id() -> Pubkey {
    // metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
    let bytes: [u8; 32] = [
        6, 167, 213, 23, 24, 199, 116, 201, 40, 86, 99, 8, 88, 176, 40, 254, 218, 176, 247, 89,
        224, 121, 206, 5, 155, 22, 241, 90, 29, 238, 231, 179,
    ];
    Pubkey::new_from_array(bytes)
}

/// Derives the metadata PDA for a given mint
pub fn derive_metadata_pda(mint: &Pubkey) -> (Pubkey, u8) {
    let program_id = token_metadata_program_id();
    Pubkey::find_program_address(
        &[b"metadata", program_id.as_ref(), mint.as_ref()],
        &program_id,
    )
}

/// Derives the master edition PDA for a given mint
pub fn derive_master_edition_pda(mint: &Pubkey) -> (Pubkey, u8) {
    let program_id = token_metadata_program_id();
    Pubkey::find_program_address(
        &[b"metadata", program_id.as_ref(), mint.as_ref(), b"edition"],
        &program_id,
    )
}

/// Derives the edition marker PDA for a given edition number
pub fn derive_edition_marker_pda(mint: &Pubkey, edition: u64) -> (Pubkey, u8) {
    let program_id = token_metadata_program_id();
    let edition_number = edition / 248;
    Pubkey::find_program_address(
        &[
            b"metadata",
            program_id.as_ref(),
            mint.as_ref(),
            b"edition",
            &edition_number.to_le_bytes(),
        ],
        &program_id,
    )
}

/// Token Metadata account key discriminator
pub const METADATA_KEY: u8 = 4;

/// Master Edition key discriminator
pub const MASTER_EDITION_KEY: u8 = 6;

/// Edition key discriminator
pub const EDITION_KEY: u8 = 1;

/// Collection details structure (simplified)
/// Full implementation would match Metaplex's CollectionDetails enum
#[derive(Debug, Clone)]
pub struct CollectionDetails {
    pub verified: bool,
    pub size: u64,
}

/// Creator structure for metadata
#[derive(Debug, Clone)]
pub struct MetadataCreator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

// Note: Full Token Metadata CPI implementation requires:
// 1. Serializing metadata account structure (name, symbol, uri, seller_fee_basis_points, creators, collection)
// 2. CPI to Token Metadata program's CreateMetadataAccountV3 instruction
// 3. Proper account setup (metadata PDA, update authority, mint, etc.)
// 4. For collections: CPI to SetAndVerifyCollection or VerifyCollection
// 5. For editions: CPI to CreateMasterEditionV3 or MintNewEditionFromMasterEditionViaToken
//
// This is complex and typically requires:
// - Metaplex SDK bindings, OR
// - Manual instruction data serialization matching Metaplex's IDL
//
// For Phase B completion, the structure is ready. Full CPI implementation can be added
// incrementally when integrating with frontend or adding the required accounts to ForgeAsset.
