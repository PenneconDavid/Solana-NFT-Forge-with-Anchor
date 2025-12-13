import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export interface ForgeConfig {
  connection: Connection;
  programId: PublicKey;
  wallet: Keypair;
  cluster: "localnet" | "devnet" | "mainnet-beta";
}

/**
 * Loads configuration from environment variables and Anchor.toml
 */
export function loadConfig(): ForgeConfig {
  const cluster = (process.env.CLUSTER || "localnet") as ForgeConfig["cluster"];
  
  // RPC URL from environment or defaults
  const rpcUrl =
    process.env.SOLANA_RPC_URL ||
    (cluster === "localnet"
      ? "http://127.0.0.1:8899"
      : cluster === "devnet"
      ? "https://api.devnet.solana.com"
      : "https://api.mainnet-beta.solana.com");

  const connection = new Connection(rpcUrl, "confirmed");

  // Program ID from Anchor.toml or environment
  const programIdStr =
    process.env.FORGE_PROGRAM_ID || "BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN";
  const programId = new PublicKey(programIdStr);

  // Load wallet keypair
  const walletPath =
    process.env.WALLET_PATH || path.resolve(process.env.HOME || process.env.USERPROFILE || "", ".config", "solana", "id.json");
  
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet file not found at ${walletPath}. Please set WALLET_PATH or ensure default wallet exists.`);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  return {
    connection,
    programId,
    wallet: walletKeypair,
    cluster,
  };
}

/**
 * Derives the ForgeConfig PDA
 */
export function deriveForgeConfigPDA(
  programId: PublicKey,
  authority: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("forge"), authority.toBuffer()],
    programId
  );
}

/**
 * Derives a Recipe PDA
 */
export function deriveRecipePDA(
  programId: PublicKey,
  forgeConfig: PublicKey,
  slug: string,
  version: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("recipe"),
      forgeConfig.toBuffer(),
      Buffer.from(slug),
      Buffer.from(new Uint8Array(new Uint16Array([version]).buffer)),
    ],
    programId
  );
}

/**
 * Derives a RecipeUse PDA
 */
export function deriveRecipeUsePDA(
  programId: PublicKey,
  recipe: PublicKey,
  inputHash: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("recipe-use"), recipe.toBuffer(), Buffer.from(inputHash)],
    programId
  );
}

