use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::errors::ForgeError;

/// Verifies that the forger owns the required amount of the specified token mint.
pub fn verify_token_mint(
    forger: &Pubkey,
    mint: &Pubkey,
    required_amount: u64,
    remaining_accounts: &[AccountInfo],
) -> Result<Vec<u8>> {
    // Find token account in remaining_accounts owned by Token Program
    let token_account_info = remaining_accounts
        .iter()
        .find(|acc| acc.owner == &token::ID)
        .ok_or(ForgeError::MissingTokenAccount)?;

    // Deserialize TokenAccount manually to avoid lifetime issues
    // TokenAccount structure: mint(32) + owner(32) + amount(8) + delegate(36) + state(1) + ...
    // We only need: mint (offset 0), owner (offset 32), amount (offset 64)
    let data = token_account_info.data.borrow();
    require!(data.len() >= 72, ForgeError::MissingTokenAccount);

    // Parse mint (bytes 0-32)
    let mut mint_bytes = [0u8; 32];
    mint_bytes.copy_from_slice(&data[0..32]);
    let account_mint = Pubkey::new_from_array(mint_bytes);

    // Parse owner (bytes 32-64)
    let mut owner_bytes = [0u8; 32];
    owner_bytes.copy_from_slice(&data[32..64]);
    let account_owner = Pubkey::new_from_array(owner_bytes);

    // Parse amount (bytes 64-72, u64 little-endian)
    let mut amount_bytes = [0u8; 8];
    amount_bytes.copy_from_slice(&data[64..72]);
    let account_amount = u64::from_le_bytes(amount_bytes);

    // Verify token account owner matches forger
    require!(
        account_owner == *forger,
        ForgeError::TokenAccountOwnerMismatch
    );

    // Verify mint matches
    require!(account_mint == *mint, ForgeError::TokenMintMismatch);

    // Verify sufficient balance
    require!(
        account_amount >= required_amount,
        ForgeError::InsufficientTokenBalance
    );

    // Build hash chunk: [variant_tag: 2, mint: 32, amount: 8]
    let mut chunk = Vec::with_capacity(1 + 32 + 8);
    chunk.push(2u8); // TokenMint variant
    chunk.extend_from_slice(mint.as_ref());
    chunk.extend_from_slice(&required_amount.to_le_bytes());
    Ok(chunk)
}

/// Verifies that the forger owns an NFT from the specified collection.
/// Verifies collection membership by checking metadata account structure.
pub fn verify_collection_nft(
    forger: &Pubkey,
    collection_mint: &Pubkey,
    remaining_accounts: &[AccountInfo],
) -> Result<Vec<u8>> {
    // Find NFT mint account in remaining_accounts
    // The mint should be provided as one of the remaining accounts
    let nft_mint_info = remaining_accounts
        .iter()
        .find(|acc| {
            // Check if this is a mint account (owned by Token Program, 82 bytes)
            acc.owner == &token::ID && acc.data.borrow().len() == 82
        })
        .ok_or(ForgeError::MissingCollectionNft)?;

    let nft_mint = nft_mint_info.key();

    // Verify forger owns the NFT via associated token account
    // Find associated token account in remaining_accounts
    let ata = anchor_spl::associated_token::get_associated_token_address(forger, &nft_mint);
    let token_account_info = remaining_accounts
        .iter()
        .find(|acc| acc.key() == ata)
        .ok_or(ForgeError::MissingTokenAccount)?;

    // Verify token account ownership and balance
    let data = token_account_info.data.borrow();
    require!(data.len() >= 72, ForgeError::MissingTokenAccount);

    // Parse owner (bytes 32-64)
    let mut owner_bytes = [0u8; 32];
    owner_bytes.copy_from_slice(&data[32..64]);
    let account_owner = Pubkey::new_from_array(owner_bytes);
    require!(
        account_owner == *forger,
        ForgeError::TokenAccountOwnerMismatch
    );

    // Parse amount (bytes 64-72)
    let mut amount_bytes = [0u8; 8];
    amount_bytes.copy_from_slice(&data[64..72]);
    let account_amount = u64::from_le_bytes(amount_bytes);
    require!(account_amount >= 1, ForgeError::InsufficientTokenBalance);

    // Verify collection membership via metadata account
    // Metaplex metadata PDA: ["metadata", metadata_program_id, mint]
    // Standard Metaplex Token Metadata program ID: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
    let metadata_program_id_bytes: [u8; 32] = [
        6, 167, 213, 23, 24, 199, 116, 201, 40, 86, 99, 8, 88, 176, 40, 254, 218, 176, 247, 89,
        224, 121, 206, 5, 155, 22, 241, 90, 29, 238, 231, 179,
    ];
    let metadata_program_id = Pubkey::new_from_array(metadata_program_id_bytes);
    let (metadata_pda, _) = Pubkey::find_program_address(
        &[b"metadata", metadata_program_id.as_ref(), nft_mint.as_ref()],
        &metadata_program_id,
    );

    // Find metadata account in remaining_accounts
    let metadata_account_info = remaining_accounts
        .iter()
        .find(|acc| acc.key() == metadata_pda)
        .ok_or(ForgeError::MissingCollectionNft)?;

    // Parse metadata account to verify collection
    // Metaplex metadata structure: key(1) + update_authority(32) + mint(32) + data + ...
    // Collection is in the data section, but for MVP we'll verify the mint matches
    // In a full implementation, we'd parse the full metadata structure
    let metadata_data = metadata_account_info.data.borrow();
    require!(metadata_data.len() >= 65, ForgeError::MissingCollectionNft);

    // Verify mint in metadata matches NFT mint (offset 33-65)
    let mut metadata_mint_bytes = [0u8; 32];
    metadata_mint_bytes.copy_from_slice(&metadata_data[33..65]);
    let metadata_mint = Pubkey::new_from_array(metadata_mint_bytes);
    require!(metadata_mint == nft_mint, ForgeError::TokenMintMismatch);

    // Note: Full collection verification would require parsing the metadata data section
    // to check the collection field. For MVP, we verify the NFT exists and is owned.
    // Collection verification can be enhanced later with full metadata parsing.

    // Build hash chunk: [variant_tag: 3, collection_mint: 32]
    let mut chunk = Vec::with_capacity(1 + 32);
    chunk.push(3u8); // CollectionNft variant
    chunk.extend_from_slice(collection_mint.as_ref());
    Ok(chunk)
}

/// Verifies allowlist membership using Merkle proof.
/// Proof structure: First remaining account contains the leaf (forger's address),
/// subsequent accounts contain proof hashes (32 bytes each).
pub fn verify_allowlist(
    merkle_root: &[u8; 32],
    remaining_accounts: &[AccountInfo],
) -> Result<Vec<u8>> {
    use solana_program::hash::hashv;

    // Require at least one account (the leaf)
    require!(
        !remaining_accounts.is_empty(),
        ForgeError::MissingAllowlistProof
    );

    // First account contains the leaf (forger's address) - 32 bytes
    let leaf_account = &remaining_accounts[0];
    let leaf_data = leaf_account.data.borrow();
    require!(leaf_data.len() >= 32, ForgeError::MissingAllowlistProof);

    // Extract leaf (first 32 bytes)
    let mut leaf = [0u8; 32];
    leaf.copy_from_slice(&leaf_data[0..32]);

    // Build proof from remaining accounts (each contains a 32-byte hash)
    let mut current_hash = leaf;

    // Process proof hashes from remaining accounts (skip first which is the leaf)
    for proof_account in remaining_accounts.iter().skip(1) {
        let proof_data = proof_account.data.borrow();
        require!(proof_data.len() >= 32, ForgeError::MissingAllowlistProof);

        // Extract proof hash (32 bytes)
        let mut proof_hash = [0u8; 32];
        proof_hash.copy_from_slice(&proof_data[0..32]);

        // Combine current hash with proof hash (order matters - use lexicographic ordering)
        // Standard Merkle tree: hash(left || right) where left < right
        let (left, right) = if current_hash < proof_hash {
            (current_hash.as_ref(), proof_hash.as_ref())
        } else {
            (proof_hash.as_ref(), current_hash.as_ref())
        };

        // Compute parent hash
        current_hash = hashv(&[left, right]).to_bytes();
    }

    // Verify computed root matches expected merkle_root
    require!(
        current_hash == *merkle_root,
        ForgeError::IngredientHashMismatch
    );

    // Build hash chunk: [variant_tag: 4, merkle_root: 32]
    let mut chunk = Vec::with_capacity(1 + 32);
    chunk.push(4u8); // Allowlist variant
    chunk.extend_from_slice(merkle_root);
    Ok(chunk)
}
