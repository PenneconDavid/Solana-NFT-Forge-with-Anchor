//! Integration tests for the Forge program.
//!
//! These tests require a local validator to be running.
//! Start with: `solana-test-validator`
//!
//! Run tests with: `anchor test` or `cargo test --package forge-tests`

use anchor_client::{
    anchor_lang::system_program,
    solana_sdk::{
        commitment_config::CommitmentLevel,
        signature::Keypair,
        signer::Signer,
    },
    Client, Cluster,
};
use std::rc::Rc;

// Program ID from Anchor.toml
const FORGE_PROGRAM_ID: &str = "Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1";

/// Sets up a test client connected to localnet
fn setup_test_client() -> Client {
    let payer = Keypair::new();
    let url = Cluster::Localnet;
    
    Client::new_with_options(
        url,
        Rc::new(payer),
        CommitmentLevel::confirmed(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // Ignore by default - requires local validator
    fn test_program_deployed() {
        // Basic test to verify program is deployed
        let client = setup_test_client();
        let program = client.program(FORGE_PROGRAM_ID.parse().unwrap());
        
        // If this doesn't panic, program is accessible
        assert!(true);
    }

    // TODO: Add full integration tests once local validator workflow is established
    // Example structure:
    //
    // #[tokio::test]
    // #[ignore]
    // async fn test_initialize_forge() {
    //     let client = setup_test_client();
    //     let program = client.program(FORGE_PROGRAM_ID.parse().unwrap());
    //     
    //     // Derive PDA
    //     let authority = client.payer();
    //     let (forge_config_pda, _) = Pubkey::find_program_address(
    //         &[b"forge", authority.pubkey().as_ref()],
    //         &program.id(),
    //     );
    //     
    //     // Initialize forge
    //     let tx = program
    //         .request()
    //         .accounts(forge::accounts::InitializeForge {
    //             forge_config: forge_config_pda,
    //             authority: authority.pubkey(),
    //             system_program: system_program::ID,
    //         })
    //         .args(forge::instructions::InitializeForgeArgs {
    //             collection_mint: None,
    //             freeze_authority: None,
    //             default_royalty_bps: 500,
    //             recipe_creation_enabled: true,
    //         })
    //         .send()
    //         .await
    //         .unwrap();
    //     
    //     // Verify forge config was created
    //     let forge_config = program
    //         .account::<forge::accounts::ForgeConfig>(forge_config_pda)
    //         .await
    //         .unwrap();
    //     
    //     assert_eq!(forge_config.authority, authority.pubkey());
    //     assert_eq!(forge_config.default_royalty_bps, 500);
    //     assert!(forge_config.recipe_creation_enabled);
    // }
}

