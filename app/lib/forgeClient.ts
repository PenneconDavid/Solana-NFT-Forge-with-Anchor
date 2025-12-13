import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Umi, createUmi } from "@metaplex-foundation/umi";
// UMI adapters - will be properly integrated when UMI wallet adapter is added
// import { createSolanaRpcFromWeb3JsConnection } from "@metaplex-foundation/umi-web3js-adapters";
// import { walletAdapterIdentity } from "@metaplex-foundation/umi-bundle-defaults";

// IDL type - will be loaded dynamically
type ForgeIDL = anchor.Idl;

export interface ForgeClientConfig {
  connection: Connection;
  programId: PublicKey;
  // In the browser this should be the wallet-adapter AnchorWallet (implements Anchor wallet interface).
  // IMPORTANT: Do not use `new anchor.Wallet(...)` in the browser; the Anchor browser build does not export it.
  wallet?: anchor.Wallet;
}

/**
 * Shared client library for interacting with the Forge program.
 * Provides PDA derivations, account fetchers, and transaction builders.
 */
export class ForgeClient {
  public readonly program: anchor.Program<anchor.Idl>;
  public readonly connection: Connection;
  public readonly programId: PublicKey;
  public readonly umi: Umi;

  constructor(config: ForgeClientConfig, idl?: ForgeIDL) {
    this.connection = config.connection;
    this.programId = config.programId;
    
    // Initialize Anchor program
    // In the browser, callers MUST pass the wallet-adapter AnchorWallet.
    // Anchor's browser build does not export the `Wallet` helper class.
    if (!config.wallet) {
      throw new Error(
        "ForgeClient requires a wallet. In the browser, pass the wallet-adapter AnchorWallet (useAnchorWallet())."
      );
    }
    const wallet = config.wallet;
    
    // Use provided IDL. In browser, IDL should be loaded from /idl/forge.json.
    const provider = new anchor.AnchorProvider(
      this.connection,
      wallet,
      anchor.AnchorProvider.defaultOptions()
    );
    // Anchor 0.32 Program constructor signature is (idl, provider, coder?).
    // The program id comes from `idl.address`.
    if (!idl || !(idl as any).instructions) {
      throw new Error(
        "ForgeClient requires a valid Anchor IDL. In the browser, ensure /idl/forge.json is available (copy target/idl/forge.json to app/public/idl/forge.json)."
      );
    }

    const programIdl = idl as anchor.Idl;
    const idlAddress = (programIdl as any).address as string | undefined;
    if (idlAddress) {
      const idlProgramId = new PublicKey(idlAddress);
      if (!idlProgramId.equals(this.programId)) {
        throw new Error(
          `IDL program id mismatch. IDL address=${idlProgramId.toBase58()} but NEXT_PUBLIC_FORGE_PROGRAM_ID=${this.programId.toBase58()}. ` +
            "Ensure app/public/idl/forge.json matches the deployed program ID."
        );
      }
    }

    // @ts-ignore - Anchor Program constructor type inference issue
    this.program = new anchor.Program(programIdl, provider);

    // Initialize UMI
    this.umi = createUmi();
    // UMI RPC adapter will be added when UMI wallet integration is implemented
    // this.umi.use(createSolanaRpcFromWeb3JsConnection(this.connection));
  }

  /**
   * Derives the ForgeConfig PDA for a given authority
   */
  deriveForgeConfigPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("forge"), authority.toBuffer()],
      this.programId
    );
  }

  /**
   * Derives a Recipe PDA
   */
  deriveRecipePDA(
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
      this.programId
    );
  }

  /**
   * Derives a RecipeUse PDA
   */
  deriveRecipeUsePDA(
    recipe: PublicKey,
    inputHash: Uint8Array
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("recipe-use"), recipe.toBuffer(), Buffer.from(inputHash)],
      this.programId
    );
  }

  /**
   * Fetches the ForgeConfig account
   */
  async fetchForgeConfig(authority: PublicKey) {
    const [forgeConfigPDA] = this.deriveForgeConfigPDA(authority);
    // Type assertion needed until IDL types are properly loaded
    return await (this.program.account as any).forgeConfig.fetch(forgeConfigPDA);
  }

  /**
   * Fetches a Recipe account
   */
  async fetchRecipe(forgeConfig: PublicKey, slug: string, version: number) {
    const [recipePDA] = this.deriveRecipePDA(forgeConfig, slug, version);
    // Type assertion needed until IDL types are properly loaded
    return await (this.program.account as any).recipe.fetch(recipePDA);
  }

  /**
   * Fetches all recipes for a forge config
   */
  async fetchAllRecipes(forgeConfig: PublicKey) {
    // Type assertion needed until IDL types are properly loaded
    return await (this.program.account as any).recipe.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: forgeConfig.toBase58(),
        },
      },
    ]);
  }

  /**
   * Fetches a RecipeUse account
   */
  async fetchRecipeUse(recipe: PublicKey, inputHash: Uint8Array) {
    const [recipeUsePDA] = this.deriveRecipeUsePDA(recipe, inputHash);
    try {
      // Type assertion needed until IDL types are properly loaded
      return await (this.program.account as any).recipeUse.fetch(recipeUsePDA);
    } catch {
      return null; // RecipeUse may not exist yet
    }
  }

  /**
   * Computes input hash from ingredient constraints
   * This matches the on-chain hash computation using SHA256 (hashv)
   * 
   * On-chain uses: solana_program::hash::hashv(&hash_inputs)
   * This is SHA256 of concatenated inputs
   */
  async computeInputHash(ingredientChunks: Uint8Array[]): Promise<Uint8Array> {
    // Use Web Crypto API for browser compatibility
    const encoder = new TextEncoder();
    
    if (ingredientChunks.length === 0) {
      // Empty hash: hashv(&[&[]])
      const emptyData = new Uint8Array(0);
      const hashBuffer = await crypto.subtle.digest("SHA-256", emptyData);
      return new Uint8Array(hashBuffer).slice(0, 32);
    }

    // Concatenate all chunks (matching hashv behavior)
    const totalLength = ingredientChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const concatenated = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of ingredientChunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }
    
    // SHA256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", concatenated);
    return new Uint8Array(hashBuffer).slice(0, 32);
  }

  /**
   * Builds ingredient hash chunks from recipe constraints
   * Matches on-chain logic in forge_asset instruction
   */
  buildIngredientHashChunks(
    constraints: any[],
    forgerPubkey: PublicKey,
    remainingAccounts: any[] = []
  ): Uint8Array[] {
    const chunks: Uint8Array[] = [];

    for (const constraint of constraints) {
      if (constraint.Signer) {
        // Variant tag 0 + authority pubkey (32 bytes)
        const authorityPubkey = new PublicKey(constraint.Signer.authority);
        const chunk = new Uint8Array(33);
        chunk[0] = 0;
        chunk.set(authorityPubkey.toBytes(), 1);
        chunks.push(chunk);
      } else if (constraint.CustomSeeds) {
        // Variant tag 1 + seed bytes
        const seedBytes = new Uint8Array(constraint.CustomSeeds.seeds);
        const chunk = new Uint8Array(1 + seedBytes.length);
        chunk[0] = 1;
        chunk.set(seedBytes, 1);
        chunks.push(chunk);
      } else if (constraint.TokenMint) {
        // Variant tag 2 + mint (32 bytes) + amount (8 bytes)
        const mint = new PublicKey(constraint.TokenMint.mint);
        const amount = BigInt(constraint.TokenMint.amount);
        const chunk = new Uint8Array(41);
        chunk[0] = 2;
        chunk.set(mint.toBytes(), 1);
        // Write amount as little-endian u64
        const amountBytes = new Uint8Array(8);
        const view = new DataView(amountBytes.buffer);
        view.setBigUint64(0, amount, true); // true = little endian
        chunk.set(amountBytes, 33);
        chunks.push(chunk);
      } else if (constraint.CollectionNft) {
        // Variant tag 3 + collection_mint (32 bytes)
        const collectionMint = new PublicKey(constraint.CollectionNft.collectionMint);
        const chunk = new Uint8Array(33);
        chunk[0] = 3;
        chunk.set(collectionMint.toBytes(), 1);
        chunks.push(chunk);
      } else if (constraint.Allowlist) {
        // Variant tag 4 + merkle_root (32 bytes)
        const merkleRoot = new Uint8Array(constraint.Allowlist.merkleRoot);
        const chunk = new Uint8Array(33);
        chunk[0] = 4;
        chunk.set(merkleRoot, 1);
        chunks.push(chunk);
      }
    }

    return chunks;
  }
}

/**
 * Creates a ForgeClient instance from environment configuration
 * IDL will be loaded from /idl/forge.json in the browser
 */
export async function createForgeClient(
  connection: Connection,
  programId: PublicKey,
  wallet?: anchor.Wallet
): Promise<ForgeClient> {
  let idl: ForgeIDL | undefined;

  // In the browser we REQUIRE the IDL so we can build instructions.
  if (typeof window !== "undefined") {
    const response = await fetch("/idl/forge.json");
    if (!response.ok) {
      throw new Error(
        `Failed to load IDL from /idl/forge.json (HTTP ${response.status}). Did you copy target/idl/forge.json to app/public/idl/forge.json?`
      );
    }
    idl = (await response.json()) as ForgeIDL;
  }

  if (!idl) {
    throw new Error(
      "createForgeClient() is intended for browser usage where the IDL can be fetched from /idl/forge.json. " +
        "For non-browser usage, load the IDL yourself and use createForgeClientSync()."
    );
  }

  return new ForgeClient({ connection, programId, wallet }, idl);
}

/**
 * Synchronous version for server-side usage (with pre-loaded IDL)
 */
export function createForgeClientSync(
  connection: Connection,
  programId: PublicKey,
  idl: ForgeIDL,
  wallet?: anchor.Wallet
): ForgeClient {
  return new ForgeClient(
    {
      connection,
      programId,
      wallet,
    },
    idl
  );
}

