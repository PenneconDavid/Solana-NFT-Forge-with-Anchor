#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, deriveForgeConfigPDA, deriveRecipePDA } from "./utils/config";

const program = new Command();

program
  .name("create-recipe")
  .description("Create a new recipe")
  .requiredOption("-s, --slug <slug>", "Recipe slug (max 32 bytes)")
  .requiredOption("-v, --version <number>", "Recipe version")
  .requiredOption("-k, --output-kind <kind>", "Output kind: one-of-one, edition, semi-fungible")
  .option("-c, --supply-cap <number>", "Supply cap (optional)")
  .requiredOption("-u, --metadata-uri <uri>", "Metadata URI")
  .option("--collection <pubkey>", "Collection mint pubkey (optional)")
  .option("--go-live <timestamp>", "Go live unix timestamp (optional)")
  .option("--status <status>", "Initial status: draft, active, paused, retired", "draft")
  .option("-a, --authority <pubkey>", "Forge authority (defaults to wallet)")
  .action(async (options) => {
    try {
      const config = loadConfig();
      const { connection, programId, wallet } = config;

      console.log(`\n📝 Creating Recipe...`);
      console.log(`   Slug: ${options.slug}`);
      console.log(`   Version: ${options.version}\n`);

      // Validate slug length
      if (Buffer.from(options.slug).length > 32) {
        throw new Error("Slug must be 32 bytes or less");
      }

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
      console.log(`   Recipe PDA: ${recipePDA.toString()}\n`);

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

      // Parse output kind
      let outputKind: any;
      if (options.outputKind === "one-of-one") {
        outputKind = { oneOfOne: {} };
      } else if (options.outputKind === "edition") {
        if (!options.parentMint) {
          throw new Error("Parent mint required for edition output kind");
        }
        outputKind = { edition: { parentMint: new PublicKey(options.parentMint) } };
      } else if (options.outputKind === "semi-fungible") {
        outputKind = { semiFungible: {} };
      } else {
        throw new Error("Invalid output kind. Must be: one-of-one, edition, or semi-fungible");
      }

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

      // Prepare args
      const args = {
        slug: options.slug,
        version: version,
        outputKind,
        supplyCap: options.supplyCap ? parseInt(options.supplyCap, 10) : null,
        metadataUri: options.metadataUri,
        creators: [], // TODO: Add creator parsing
        collectionMint: options.collection ? new PublicKey(options.collection) : null,
        goLiveUnixTime: options.goLive ? parseInt(options.goLive, 10) : null,
        ingredientConstraints: [], // TODO: Add constraint parsing
        status,
        previousVersion: null,
      };

      // Create recipe
      console.log("📝 Sending transaction...");
      const tx = await forgeProgram.methods
        .createRecipe(args)
        .accounts({
          forgeConfig: forgeConfigPDA,
          recipe: recipePDA,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`✅ Recipe created successfully!`);
      console.log(`   Transaction: ${tx}`);
      console.log(`   Recipe: ${recipePDA.toString()}\n`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

