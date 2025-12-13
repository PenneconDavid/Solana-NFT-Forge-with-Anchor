#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, deriveForgeConfigPDA, deriveRecipePDA, deriveRecipeUsePDA } from "./utils/config";
import * as crypto from "crypto";

const program = new Command();

program
  .name("forge-example")
  .description("Example script to forge an asset using a recipe")
  .requiredOption("-s, --slug <slug>", "Recipe slug")
  .requiredOption("-v, --version <number>", "Recipe version")
  .option("-a, --authority <pubkey>", "Forge authority (defaults to wallet)")
  .action(async (options) => {
    try {
      const config = loadConfig();
      const { connection, programId, wallet } = config;

      console.log(`\n🔥 Forging Asset...`);
      console.log(`   Recipe Slug: ${options.slug}`);
      console.log(`   Version: ${options.version}\n`);

      // Determine authority
      const authority = options.authority
        ? new PublicKey(options.authority)
        : wallet.publicKey;

      // Derive PDAs
      const [forgeConfigPDA] = deriveForgeConfigPDA(programId, authority);
      const version = parseInt(options.version, 10);
      const [recipePDA] = deriveRecipePDA(
        programId,
        forgeConfigPDA,
        options.slug,
        version
      );

      console.log(`   Forge Config: ${forgeConfigPDA.toString()}`);
      console.log(`   Recipe: ${recipePDA.toString()}\n`);

      // Load program
      const idlPath = path.resolve(__dirname, "../idl/forge.json");
      if (!fs.existsSync(idlPath)) {
        throw new Error(`IDL not found at ${idlPath}. Run 'anchor idl build' first.`);
      }

      const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
      const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(wallet),
        anchor.AnchorProvider.defaultOptions()
      );
      // Anchor 0.32 Program constructor signature is (idl, provider, coder?).
      // The program id comes from `idl.address`.
      // @ts-ignore - Anchor Program constructor type inference issue
      const forgeProgram = new anchor.Program(idl as anchor.Idl, provider);

      // Fetch recipe to get ingredient constraints
      // Note: Type assertion needed until IDL types are generated
      const recipeAccount = await (forgeProgram.account as any).recipe.fetch(recipePDA);
      console.log(`   Recipe Status: ${JSON.stringify(recipeAccount.status)}`);
      console.log(`   Minted: ${recipeAccount.minted}/${recipeAccount.supplyCap || "unlimited"}\n`);

      // For this example, we'll create a simple input hash
      // In a real scenario, this would be computed from actual ingredient proofs
      const exampleInput = Buffer.from(`example-forge-${Date.now()}`);
      const hashBytes = crypto.createHash("sha256").update(exampleInput).digest();
      const inputHashArray = new Uint8Array(hashBytes.slice(0, 32)); // 32 bytes
      const inputHashHex = Buffer.from(inputHashArray).toString("hex");

      // Derive recipe use PDA
      const [recipeUsePDA] = deriveRecipeUsePDA(
        programId,
        recipePDA,
        inputHashArray
      );

      console.log(`   Input Hash: ${inputHashHex}`);
      console.log(`   Recipe Use PDA: ${recipeUsePDA.toString()}\n`);

      // Forge asset
      // Note: This requires all ingredient accounts to be passed via remainingAccounts
      // For this example, we'll show the structure - actual implementation depends on recipe constraints
      console.log("📝 Preparing forge transaction...");
      console.log("   ⚠️  Note: This example requires ingredient accounts in remainingAccounts");
      console.log("   ⚠️  Actual forging requires proper ingredient verification\n");

      // Build accounts
      const accounts = {
        forgeConfig: forgeConfigPDA,
        recipe: recipePDA,
        recipeUse: recipeUsePDA,
        forger: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      };

      // Note: In a real implementation, you would:
      // 1. Compute input hash from ingredient constraints
      // 2. Pass all required ingredient accounts via remainingAccounts
      // 3. Call forge_asset with proper args

      console.log("✅ Example structure prepared!");
      console.log(`   Recipe: ${recipePDA.toString()}`);
      console.log(`   Recipe Use: ${recipeUsePDA.toString()}`);
      console.log(`   Input Hash: ${inputHashHex}\n`);
      console.log("   To actually forge, ensure:");
      console.log("   1. Recipe is Active");
      console.log("   2. All ingredient constraints are satisfied");
      console.log("   3. Ingredient accounts are passed via remainingAccounts");
      console.log("   4. Input hash matches computed hash from ingredients\n");
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      if (error.logs) {
        console.error("   Logs:", error.logs);
      }
      process.exit(1);
    }
  });

program.parse();

