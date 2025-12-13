//! Forge integration test harness.
//!
//! Integration tests are located in `src/tests/integration.rs`.
//! Run with: `anchor test` or `cargo test --package forge-tests`

#[cfg(test)]
mod tests {
    #[test]
    fn test_forge_program_compiles() {
        // Basic smoke test to ensure program compiles
        assert!(true);
    }
}
