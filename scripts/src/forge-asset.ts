#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { Command } from "commander";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  deriveForgeConfigPDA,
  deriveRecipePDA,
  deriveRecipeUsePDA,
  loadConfig,
} from "./utils/config";

// Program IDs (canonical)
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function sha256(bytes: Buffer | Uint8Array): Uint8Array {
  const h = crypto.createHash("sha256").update(bytes).digest();
  return new Uint8Array(h);
}

function parseHex32(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error("input-hash must be 32 bytes hex (64 hex chars), e.g. 0xabc...");
  }
  return new Uint8Array(Buffer.from(cleaned, "hex"));
}

function deriveMetadataPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

function deriveMasterEditionPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

function deriveAta(owner: PublicKey, mint: PublicKey): [PublicKey, number] {
  // ATA seeds: [owner, token_program, mint] with associated token program as the program.
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

const program = new Command();

program
  .name("forge-asset")
  .description(
    "Forge an asset by calling forge_asset, minting a real 1/1 NFT (mint + metadata + master edition)."
  )
  .requiredOption("-s, --slug <slug>", "Recipe slug")
  .requiredOption("-v, --version <number>", "Recipe version (u16)")
  .option(
    "-a, --authority <pubkey>",
    "Forge authority (defaults to wallet public key)"
  )
  .option(
    "--input-hash <hex>",
    "32-byte input hash (hex). If omitted and recipe has 0 ingredient constraints, uses sha256(forger_pubkey)"
  )
  .option("--dry-run", "Build the transaction but do not send", false)
  .action(async (options) => {
    try {
      const cfg = loadConfig();
      const { connection, programId, wallet } = cfg;

      const authority = options.authority
        ? new PublicKey(options.authority)
        : wallet.publicKey;

      const version = parseInt(options.version, 10);
      if (!Number.isInteger(version) || version < 0 || version > 65535) {
        throw new Error("version must be an integer between 0 and 65535");
      }

      const [forgeConfigPDA] = deriveForgeConfigPDA(programId, authority);
      const [recipePDA] = deriveRecipePDA(
        programId,
        forgeConfigPDA,
        options.slug,
        version
      );

      // Load IDL/program (Anchor 0.32 signature: (idl, provider, coder?))
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
      // @ts-ignore - Anchor Program constructor type inference issue
      const forgeProgram = new anchor.Program(idl as anchor.Idl, provider);

      console.log("\n🔥 forge-asset");
      console.log(`   Cluster: ${cfg.cluster}`);
      console.log(`   RPC: ${connection.rpcEndpoint}`);
      console.log(`   Program: ${programId.toBase58()}`);
      console.log(`   Forger: ${wallet.publicKey.toBase58()}`);
      console.log(`   Authority (ForgeConfig seed): ${authority.toBase58()}`);
      console.log(`   ForgeConfig: ${forgeConfigPDA.toBase58()}`);
      console.log(`   Recipe: ${recipePDA.toBase58()}\n`);

      // Fetch recipe so we can decide how to build input hash / remaining accounts.
      const recipeAccount = await (forgeProgram.account as any).recipe.fetch(recipePDA);
      const ingredientCount: number = recipeAccount.ingredientConstraints?.length ?? 0;
      const status = JSON.stringify(recipeAccount.status);
      console.log(`   Recipe status: ${status}`);
      console.log(`   Ingredient constraints: ${ingredientCount}`);
      console.log(
        `   Minted: ${recipeAccount.minted}/${recipeAccount.supplyCap ?? "unlimited"}\n`
      );

      let inputHash: Uint8Array;
      if (options.inputHash) {
        inputHash = parseHex32(options.inputHash);
      } else {
        if (ingredientCount !== 0) {
          throw new Error(
            "This CLI currently supports only recipes with 0 ingredient constraints unless you provide --input-hash and implement remainingAccounts mapping. " +
              "Either use a 0-ingredient recipe for now, or tell me which constraints you want to support next and I’ll extend this script."
          );
        }
        // On-chain logic for empty constraints: hashv(&[forger_pubkey]) == sha256(forger_pubkey)
        // This allows each wallet to forge once while preserving security
        inputHash = sha256(wallet.publicKey.toBuffer());
      }

      const [recipeUsePDA] = deriveRecipeUsePDA(programId, recipePDA, inputHash);

      // Mint + PDAs
      const mint = Keypair.generate();
      const [mintAta] = deriveAta(wallet.publicKey, mint.publicKey);
      const [metadata] = deriveMetadataPda(mint.publicKey);
      const [masterEdition] = deriveMasterEditionPda(mint.publicKey);

      console.log(`   Input hash: ${Buffer.from(inputHash).toString("hex")}`);
      console.log(`   RecipeUse: ${recipeUsePDA.toBase58()}`);
      console.log(`   Mint: ${mint.publicKey.toBase58()}`);
      console.log(`   Mint ATA: ${mintAta.toBase58()}`);
      console.log(`   Metadata: ${metadata.toBase58()}`);
      console.log(`   MasterEdition: ${masterEdition.toBase58()}\n`);

      // Build instruction args: Anchor expects [u8;32] as number[] or Uint8Array.
      const args = { inputHash };

      // Add compute budget instructions to prevent CU exhaustion
      // NFT minting with metadata requires more than the default 200,000 CUs
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000, // Request 400k CUs (double the default)
      });
      
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1, // Small priority fee to help with transaction processing
      });

      // Build and send
      const builder = forgeProgram.methods
        .forgeAsset(args)
        .accounts({
          forgeConfig: forgeConfigPDA,
          recipe: recipePDA,
          recipeUse: recipeUsePDA,
          forger: wallet.publicKey,
          mint: mint.publicKey,
          mintAta,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          metadata,
          masterEdition,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([]) // ingredient accounts only; empty for 0-constraint recipes
        .preInstructions([addPriorityFee, modifyComputeUnits]) // Add compute budget before forge instruction
        .signers([mint]);

      if (options.dryRun) {
        const tx = await builder.transaction();
        console.log("🧪 Dry run enabled; transaction built but not sent.");
        console.log(`   Instructions: ${tx.instructions.length}`);
        console.log(`   Signers (incl mint): 2`);
        return;
      }

      console.log("📝 Sending transaction...");
      const sig = await builder.rpc();
      console.log("\n✅ forge_asset succeeded");
      console.log(`   Signature: ${sig}`);
      console.log(`   Mint: ${mint.publicKey.toBase58()}\n`);
    } catch (err: any) {
      console.error("❌ Error:", err?.message ?? String(err));
      if (err?.logs) {
        console.error("   Logs:");
        for (const l of err.logs) console.error("   ", l);
      }
      process.exit(1);
    }
  });

program.parse();


