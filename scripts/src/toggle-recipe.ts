#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, deriveForgeConfigPDA, deriveRecipePDA } from "./utils/config";

const program = new Command();

program
  .name("toggle-recipe")
  .description("Toggle recipe status (set recipe status)")
  .requiredOption("-s, --slug <slug>", "Recipe slug")
  .requiredOption("-v, --version <number>", "Recipe version")
  .requiredOption("--status <status>", "New status: draft, active, paused, retired")
  .option("-a, --authority <pubkey>", "Forge authority (defaults to wallet)")
  .action(async (options) => {
    try {
      const config = loadConfig();
      const { connection, programId, wallet } = config;

      console.log(`\n🔄 Toggling Recipe Status...`);
      console.log(`   Slug: ${options.slug}`);
      console.log(`   Version: ${options.version}`);
      console.log(`   New Status: ${options.status}\n`);

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

      // Parse status
      const statusMap: Record<string, any> = {
        draft: { draft: {} },
        active: { active: {} },
        paused: { paused: {} },
        retired: { retired: {} },
      };
      const status = statusMap[options.status.toLowerCase()];
      if (!status) {
        throw new Error("Invalid status. Must be: draft, active, paused, or retired");
      }

      // Set recipe status
      console.log("📝 Sending transaction...");
      const tx = await forgeProgram.methods
        .setRecipeStatus(status)
        .accounts({
          forgeConfig: forgeConfigPDA,
          recipe: recipePDA,
          authority: authority,
        })
        .rpc();

      console.log(`✅ Recipe status updated successfully!`);
      console.log(`   Transaction: ${tx}`);
      console.log(`   Recipe: ${recipePDA.toString()}\n`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

