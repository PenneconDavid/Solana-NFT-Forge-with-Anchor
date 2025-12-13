#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, deriveForgeConfigPDA } from "./utils/config";
// IDL will be loaded from JSON file at runtime

const program = new Command();

program
  .name("init-forge")
  .description("Initialize a new forge configuration")
  .option("-a, --authority <pubkey>", "Authority pubkey (defaults to wallet)")
  .option("-c, --collection <pubkey>", "Collection mint pubkey (optional)")
  .option("-f, --freeze-authority <pubkey>", "Freeze authority pubkey (optional)")
  .option("-r, --royalty-bps <number>", "Default royalty basis points (0-10000)", "500")
  .option("--enable-recipe-creation", "Enable recipe creation by default", true)
  .action(async (options) => {
    try {
      const config = loadConfig();
      const { connection, programId, wallet } = config;

      console.log(`\n🔨 Initializing Forge...`);
      console.log(`   Program ID: ${programId.toString()}`);
      console.log(`   Cluster: ${config.cluster}`);
      console.log(`   RPC: ${connection.rpcEndpoint}\n`);

      // Determine authority
      const authority = options.authority
        ? new PublicKey(options.authority)
        : wallet.publicKey;

      if (!authority.equals(wallet.publicKey)) {
        throw new Error("Authority must be the wallet signer for initialization");
      }

      // Derive forge config PDA
      const [forgeConfigPDA] = deriveForgeConfigPDA(programId, authority);

      console.log(`   Forge Config PDA: ${forgeConfigPDA.toString()}\n`);

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

      // Prepare accounts
      const collectionMint = options.collection
        ? new PublicKey(options.collection)
        : null;
      const freezeAuthority = options.freezeAuthority
        ? new PublicKey(options.freezeAuthority)
        : null;
      const royaltyBps = parseInt(options.royaltyBps, 10);

      if (royaltyBps < 0 || royaltyBps > 10000) {
        throw new Error("Royalty BPS must be between 0 and 10000");
      }

      // Initialize forge
      console.log("📝 Sending transaction...");
      const tx = await forgeProgram.methods
        .initializeForge({
          collectionMint: collectionMint,
          freezeAuthority: freezeAuthority,
          defaultRoyaltyBps: royaltyBps,
          recipeCreationEnabled: options.enableRecipeCreation,
        })
        .accounts({
          forgeConfig: forgeConfigPDA,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Forge initialized successfully!`);
      console.log(`   Transaction: ${tx}`);
      console.log(`   Forge Config: ${forgeConfigPDA.toString()}\n`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

