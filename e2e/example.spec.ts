import { test, expect } from '@playwright/test';

/**
 * Example E2E test for the Forge frontend.
 * 
 * Prerequisites:
 * - Local validator running: `solana-test-validator`
 * - Program deployed: `anchor deploy`
 * - Frontend dev server will start automatically via Playwright config
 */

test.describe('Forge Frontend', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: /Solana NFT Forge/i })).toBeVisible();
    
    // Check for wallet connect button
    await expect(page.getByRole('button', { name: /connect/i })).toBeVisible();
  });

  test('creator dashboard accessible', async ({ page }) => {
    await page.goto('/creator/recipes');
    
    // Should show wallet connection prompt or recipe list
    const walletPrompt = page.getByText(/connect your wallet/i);
    const recipeList = page.getByText(/no recipes found/i).or(page.getByRole('heading', { name: /creator recipes/i }));
    
    await expect(walletPrompt.or(recipeList)).toBeVisible();
  });

  // TODO: Add tests for:
  // - Wallet connection flow
  // - Recipe creation flow
  // - Recipe viewing
  // - Forging flow (once implemented)
  // 
  // Example:
  // test('can create recipe', async ({ page }) => {
  //   // Connect wallet (mock or real)
  //   // Navigate to create recipe
  //   // Fill form
  //   // Submit
  //   // Verify recipe appears in list
  // });
});

