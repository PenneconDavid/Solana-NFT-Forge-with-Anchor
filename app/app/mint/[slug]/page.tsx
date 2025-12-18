"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { ForgeClient, createForgeClient } from "@/lib/forgeClient";
import { useParams } from "next/navigation";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function deriveAta(owner: PublicKey, mint: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

function deriveMetadataPda(mint: PublicKey): PublicKey {
  const [metadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  return metadata;
}

function deriveMasterEditionPda(mint: PublicKey): PublicKey {
  const [edition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return edition;
}

type Constraint = {
  Signer?: { authority: PublicKey | string };
  TokenMint?: { mint: PublicKey | string; amount: number | string | bigint };
  CollectionNft?: { collectionMint: PublicKey | string };
  Allowlist?: { merkleRoot: ArrayBuffer | Uint8Array | number[] };
  CustomSeeds?: { seeds: ArrayBuffer | Uint8Array | number[] };
};

type Recipe = {
  slug: string;
  version: number;
  status?: { active?: boolean; paused?: boolean };
  minted?: { toString(): string } | number;
  supplyCap?: { toString(): string };
  ingredientConstraints?: Constraint[];
};

type ForgeConfigType = Record<string, unknown>;

type MinimalWallet = {
  publicKey: PublicKey;
  signTransaction: (tx: unknown) => Promise<unknown>;
  signAllTransactions: (txs: unknown[]) => Promise<unknown[]>;
  payer?: { publicKey: PublicKey };
};

export default function MintPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, connected, disconnect } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [forgeConfig, setForgeConfig] = useState<ForgeConfigType | null>(null);
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [client, setClient] = useState<ForgeClient | null>(null);

  useEffect(() => {
    // Wait until we have a slug and a wallet adapter available; otherwise ForgeClient will throw.
    if (!slug || !anchorWallet) {
      return;
    }

    const loadRecipe = async () => {
      try {
        const programId = new PublicKey(
          process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID ||
            "BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN"
        );

        const walletForClient = anchorWallet
          ? ({ ...anchorWallet, payer: { publicKey: anchorWallet.publicKey } } as MinimalWallet)
          : undefined;

        // Wallet adapter does not expose a payer; we provide a compatible shape for browser usage.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const forgeClient = await createForgeClient(connection, programId, walletForClient as any);
        setClient(forgeClient);

        // Localnet-specific prerequisite: the Metaplex Token Metadata program must be present.
        // A fresh solana-test-validator ledger does NOT include it by default.
        const cluster = process.env.NEXT_PUBLIC_CLUSTER || "localnet";
        const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";
        const isLocalnet =
          cluster === "localnet" ||
          rpc.includes("127.0.0.1") ||
          connection.rpcEndpoint.includes("127.0.0.1");

        if (isLocalnet) {
          const metaInfo = await connection.getAccountInfo(TOKEN_METADATA_PROGRAM_ID);
          if (!metaInfo) {
            throw new Error(
              "Localnet missing Metaplex Token Metadata program (metaqbxx...). " +
                "Restart your validator with Token Metadata cloned into genesis:\n\n" +
                "  .\\scripts\\start-validator.ps1 -ResetLedger -UseUserLedger -KillExisting -CloneTokenMetadata -CloneUrl devnet\n\n" +
                "Then redeploy the program and re-run init-forge/create-recipe on the fresh ledger."
            );
          }
        }

        // Use deployed devnet authority as default if not specified
        // This allows the frontend to work out-of-the-box with the deployed forge
        const DEFAULT_FORGE_AUTHORITY = "Fx2ydi5tp6Zu2ywMJEZopCXUqhChehKWBnKNgQjcJnSA";
        const envAuthority = process.env.NEXT_PUBLIC_FORGE_AUTHORITY;
        
        // Validate environment variable if provided, otherwise use default
        let authorityStr: string;
        if (envAuthority && envAuthority.trim().length > 0) {
          // Validate the env var is a valid public key
          try {
            new PublicKey(envAuthority.trim());
            authorityStr = envAuthority.trim();
            console.log("Using FORGE_AUTHORITY from environment:", authorityStr);
          } catch (err) {
            console.warn(`Invalid NEXT_PUBLIC_FORGE_AUTHORITY env var: "${envAuthority}". Using default.`, err);
            authorityStr = DEFAULT_FORGE_AUTHORITY;
          }
        } else {
          authorityStr = DEFAULT_FORGE_AUTHORITY;
          console.log("Using default FORGE_AUTHORITY:", authorityStr);
        }
        
        let forgeAuthority: PublicKey;
        try {
          forgeAuthority = new PublicKey(authorityStr);
        } catch (err) {
          throw new Error(`Invalid FORGE_AUTHORITY: "${authorityStr}". ${err instanceof Error ? err.message : String(err)}`);
        }
        const [forgeConfigPDA] = forgeClient.deriveForgeConfigPDA(forgeAuthority);
        
        try {
          const config = (await forgeClient.fetchForgeConfig(forgeAuthority)) as ForgeConfigType;
          setForgeConfig(config);
          
          // Fetch recipe
          let recipeData: Recipe;
          try {
            recipeData = (await forgeClient.fetchRecipe(forgeConfigPDA, slug, 1)) as Recipe;
          } catch (fetchErr) {
            console.error("Error fetching recipe from chain:", fetchErr);
            throw fetchErr;
          }
          
          // Validate and normalize recipe data to handle PublicKey objects from Anchor deserialization
          if (recipeData.ingredientConstraints && Array.isArray(recipeData.ingredientConstraints)) {
            try {
              recipeData.ingredientConstraints = recipeData.ingredientConstraints.map((constraint: Constraint, idx: number) => {
                try {
                  // Normalize any PublicKey objects to strings for consistent handling
                  if (constraint.Signer?.authority) {
                    const authority = constraint.Signer.authority;
                    if (authority instanceof PublicKey) {
                      return { ...constraint, Signer: { authority: authority.toBase58() } };
                    } else if (typeof authority === "string") {
                      // Validate it's a valid public key string
                      try {
                        new PublicKey(authority);
                        return constraint; // Already a valid string
                      } catch {
                        console.warn(`Invalid authority string in Signer constraint ${idx}:`, authority);
                        return constraint; // Keep as-is, will fail later if used
                      }
                    } else {
                      console.warn(`Unexpected authority type in Signer constraint ${idx}:`, typeof authority, authority);
                      return constraint;
                    }
                  }
                  if (constraint.TokenMint?.mint) {
                    const mint = constraint.TokenMint.mint;
                    if (mint instanceof PublicKey) {
                      return { ...constraint, TokenMint: { ...constraint.TokenMint, mint: mint.toBase58() } };
                    } else if (typeof mint === "string") {
                      try {
                        new PublicKey(mint);
                        return constraint;
                      } catch {
                        console.warn(`Invalid mint string in TokenMint constraint ${idx}:`, mint);
                        return constraint;
                      }
                    } else {
                      console.warn(`Unexpected mint type in TokenMint constraint ${idx}:`, typeof mint, mint);
                      return constraint;
                    }
                  }
                  if (constraint.CollectionNft?.collectionMint) {
                    const collectionMint = constraint.CollectionNft.collectionMint;
                    if (collectionMint instanceof PublicKey) {
                      return { ...constraint, CollectionNft: { collectionMint: collectionMint.toBase58() } };
                    } else if (typeof collectionMint === "string") {
                      try {
                        new PublicKey(collectionMint);
                        return constraint;
                      } catch {
                        console.warn(`Invalid collectionMint string in CollectionNft constraint ${idx}:`, collectionMint);
                        return constraint;
                      }
                    } else {
                      console.warn(`Unexpected collectionMint type in CollectionNft constraint ${idx}:`, typeof collectionMint, collectionMint);
                      return constraint;
                    }
                  }
                  return constraint;
                } catch (constraintErr) {
                  console.error(`Error processing constraint ${idx}:`, constraintErr, constraint);
                  throw constraintErr;
                }
              });
            } catch (normalizeErr) {
              console.error("Error normalizing ingredient constraints:", normalizeErr);
              // Continue anyway - the constraints might still be usable
            }
          }
          
          setRecipe(recipeData);
        } catch (err) {
          console.warn("Could not fetch recipe:", err);
          // Recipe may not exist yet - show UI anyway
        }
      } catch (err) {
        console.error("Error loading recipe:", err);
        // Log detailed error information for debugging
        if (err instanceof Error) {
          console.error("Error name:", err.name);
          console.error("Error message:", err.message);
          console.error("Error stack:", err.stack);
          // Check if it's a PublicKey error
          if (err.message.includes("Invalid public key") || err.message.includes("InvalidPublicKey")) {
            console.error("This appears to be a PublicKey validation error. Check:");
            console.error("1. NEXT_PUBLIC_FORGE_AUTHORITY environment variable");
            console.error("2. Recipe ingredient constraints on-chain");
            console.error("3. ForgeConfig account data");
          }
        }
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [slug, connection, anchorWallet]);

  const handleForge = async () => {
    if (!connected || !publicKey || !anchorWallet || !client || !recipe || !forgeConfig) {
      if (!connected) {
        setVisible(true);
      } else {
        setError("Missing required data. Please refresh the page.");
      }
      return;
    }

    setForging(true);
    setError(null);
    setSuccess(null);

    try {
      // Check wallet balance first - need at least 0.01 SOL for rent + fees
      const balance = await connection.getBalance(publicKey);
      const minBalance = 0.01 * 1e9; // 0.01 SOL in lamports
      if (balance < minBalance) {
        const balanceSOL = (balance / 1e9).toFixed(4);
        throw new Error(
          `Insufficient SOL balance. You have ${balanceSOL} SOL, but need at least 0.01 SOL for rent and transaction fees. ` +
          `On devnet, you can get free SOL from the faucet: https://faucet.solana.com`
        );
      }

      // Use deployed devnet authority as default if not specified
      const DEFAULT_FORGE_AUTHORITY = "Fx2ydi5tp6Zu2ywMJEZopCXUqhChehKWBnKNgQjcJnSA";
      const envAuthority = process.env.NEXT_PUBLIC_FORGE_AUTHORITY;
      
      // Validate environment variable if provided, otherwise use default
      let authorityStr: string;
      if (envAuthority && envAuthority.trim().length > 0) {
        try {
          new PublicKey(envAuthority.trim());
          authorityStr = envAuthority.trim();
        } catch {
          authorityStr = DEFAULT_FORGE_AUTHORITY;
        }
      } else {
        authorityStr = DEFAULT_FORGE_AUTHORITY;
      }
      
      let forgeAuthority: PublicKey;
      try {
        forgeAuthority = new PublicKey(authorityStr);
      } catch (err) {
        throw new Error(`Invalid FORGE_AUTHORITY: "${authorityStr}". ${err instanceof Error ? err.message : String(err)}`);
      }

      // Build ingredient hash chunks
      const constraintsForHash = (recipe.ingredientConstraints || []) as Parameters<
        typeof client.buildIngredientHashChunks
      >[0];
      const ingredientChunks = client.buildIngredientHashChunks(constraintsForHash, publicKey);

      // Compute input hash
      const inputHash = await client.computeInputHash(ingredientChunks);
      const inputHashArray = Array.from(inputHash) as number[];

      // Derive PDAs
      const [forgeConfigPDA] = client.deriveForgeConfigPDA(forgeAuthority);
      const [recipePDA] = client.deriveRecipePDA(forgeConfigPDA, recipe.slug, recipe.version);
      const [recipeUsePDA] = client.deriveRecipeUsePDA(recipePDA, inputHash);

      // Mint + Token Metadata PDAs
      const mintKeypair = Keypair.generate();
      const mintAta = deriveAta(publicKey, mintKeypair.publicKey);
      const metadata = deriveMetadataPda(mintKeypair.publicKey);
      const masterEdition = deriveMasterEditionPda(mintKeypair.publicKey);

      // For the first “portfolio proof” recipe we recommend zero ingredients:
      const remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [];

      // Build transaction builder
      const txBuilder = client.program.methods
        .forgeAsset({ inputHash: inputHashArray })
        .accounts({
          forgeConfig: forgeConfigPDA,
          recipe: recipePDA,
          recipeUse: recipeUsePDA,
          forger: publicKey,
          mint: mintKeypair.publicKey,
          mintAta,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          metadata,
          masterEdition,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .signers([mintKeypair]);

      // Simulate first to catch errors early
      try {
        const simulation = await txBuilder.simulate();
        console.log("Transaction simulation successful:", simulation);
      } catch (simError: unknown) {
        console.error("Transaction simulation failed:", simError);
        // Extract more details from simulation error
        if (simError && typeof simError === "object" && "logs" in simError) {
          const logs = (simError as { logs?: string[] }).logs || [];
          const logMessage = logs.length > 0 ? `\n\nTransaction logs:\n${logs.join("\n")}` : "";
          throw new Error(
            `Transaction simulation failed. This usually means insufficient SOL for rent or account creation. ` +
            `Please ensure you have at least 0.01 SOL in your wallet.${logMessage}`
          );
        }
        throw simError;
      }

      // Send transaction
      const sig = await txBuilder.rpc();

      setSuccess(`Forged successfully. Signature: ${sig}\nMint: ${mintKeypair.publicKey.toBase58()}`);
    } catch (error: unknown) {
      console.error("Error forging:", error);
      
      // Handle Anchor SendTransactionError
      if (error && typeof error === "object" && "logs" in error) {
        const anchorError = error as { logs?: string[]; message?: string };
        const logs = anchorError.logs || [];
        const logMessage = logs.length > 0 ? `\n\nTransaction logs:\n${logs.slice(0, 10).join("\n")}` : "";
        const message = anchorError.message || "Transaction failed";
        
        // Check for common errors
        if (message.includes("Attempt to debit an account but found no record of a prior credit")) {
          setError(
            `Insufficient SOL balance. You need SOL to pay for rent and transaction fees. ` +
            `On devnet, get free SOL from: https://faucet.solana.com${logMessage}`
          );
        } else if (message.includes("insufficient funds")) {
          setError(
            `Insufficient SOL balance. Please ensure you have at least 0.01 SOL in your wallet. ` +
            `On devnet, get free SOL from: https://faucet.solana.com${logMessage}`
          );
        } else {
          setError(`Transaction failed: ${message}${logMessage}`);
        }
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        setError(`Error: ${message}`);
      }
    } finally {
      setForging(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl text-[var(--text)]">
        <div className="neu-panel p-6">
          <p className="text-[var(--text-muted)]">Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text)]">
      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">Mint</p>
            <h1 className="text-3xl font-semibold">Forge Asset</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Connect your Phantom wallet, review the recipe requirements below, and click "Forge Asset" to mint your NFT.
            </p>
          </div>

        <div className="neu-panel p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Recipe: {slug}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Step 1: Connect your Phantom wallet using the button below
                <br />
                Step 2: Review ingredient requirements (if any) in the section below
                <br />
                Step 3: Click "Forge Asset" to mint your NFT
              </p>
            </div>
            <span className="px-3 py-1 text-xs rounded-full border border-[rgba(255,255,255,0.1)] text-[var(--accent-tertiary)]">
              Cluster-aware
            </span>
          </div>

          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              className="w-full bg-[var(--accent-primary)] text-[#0b0f0b] px-4 py-3 rounded-xl font-semibold btn-glow"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="neu-ghost p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Connected Wallet:</p>
                    <p className="font-mono text-xs text-[var(--text)] break-all">{publicKey?.toString()}</p>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[rgba(255,127,111,0.3)] text-[var(--accent-secondary)] hover:bg-[rgba(255,127,111,0.1)] hover:border-[rgba(255,127,111,0.5)] transition"
                    title="Disconnect wallet"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {!anchorWallet && (
                <div className="neu-ghost p-4 border border-[rgba(255,127,111,0.35)]">
                  <p className="text-sm text-[var(--text)]">
                    Wallet adapter is not ready yet. If this persists, refresh the page and reconnect.
                  </p>
                </div>
              )}

              {error && (
                <div className="neu-ghost p-4 border border-[rgba(255,127,111,0.45)]">
                  <p className="text-sm text-[var(--accent-secondary)]">{error}</p>
                </div>
              )}

              {success && (
                <div className="neu-ghost p-4 border border-[rgba(90,196,141,0.4)]">
                  <p className="text-sm text-[var(--accent-primary)] whitespace-pre-wrap">{success}</p>
                </div>
              )}

              {recipe && (
                <div className="neu-ghost p-4">
                  <p className="text-sm font-semibold text-[var(--text)] mb-2">Recipe Details:</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Status: {recipe.status?.active ? "active" : recipe.status?.paused ? "paused" : JSON.stringify(recipe.status)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Minted: {recipe.minted?.toString() || "0"}</p>
                  {recipe.supplyCap && (
                    <p className="text-xs text-[var(--text-muted)]">Supply Cap: {recipe.supplyCap.toString()}</p>
                  )}
                  {recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-[var(--text)]">Ingredient Constraints:</p>
                      <ul className="text-xs text-[var(--text-muted)] list-disc list-inside">
                        {recipe.ingredientConstraints.map((c: Constraint, i: number) => (
                          <li key={i}>
                            {c.Signer && `Signer: ${c.Signer.authority instanceof PublicKey ? c.Signer.authority.toBase58() : c.Signer.authority}`}
                            {c.TokenMint && `Token: ${c.TokenMint.mint instanceof PublicKey ? c.TokenMint.mint.toBase58() : c.TokenMint.mint} (${c.TokenMint.amount})`}
                            {c.CollectionNft && `Collection: ${c.CollectionNft.collectionMint instanceof PublicKey ? c.CollectionNft.collectionMint.toBase58() : c.CollectionNft.collectionMint}`}
                            {c.Allowlist &&
                              `Allowlist: ${Array.from(new Uint8Array(c.Allowlist.merkleRoot as ArrayBuffer))
                                .map((b) => b.toString(16).padStart(2, "0"))
                                .join("")
                                .slice(0, 16)}...`}
                            {c.CustomSeeds &&
                              `Custom Seeds: ${
                                c.CustomSeeds.seeds instanceof Uint8Array
                                  ? c.CustomSeeds.seeds.length
                                  : Array.isArray(c.CustomSeeds.seeds)
                                    ? c.CustomSeeds.seeds.length
                                    : (c.CustomSeeds.seeds as ArrayBuffer).byteLength || 0
                              } bytes`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleForge}
                disabled={forging || !recipe || !forgeConfig}
                className="w-full bg-[var(--accent-primary)] text-[#0b0f0b] px-4 py-3 rounded-xl font-semibold btn-glow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {forging ? "Forging..." : "Forge Asset"}
              </button>

              {recipe && recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 ? (
                <div className="neu-ghost p-4 border border-[rgba(255,200,87,0.3)]">
                  <p className="text-sm font-semibold text-[var(--accent-tertiary)] mb-2">
                    ⚠️ Ingredient Requirements
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    This recipe requires specific ingredients. Make sure you have all required tokens, NFTs, or allowlist proofs in your wallet before forging.
                  </p>
                </div>
              ) : (
                <div className="neu-ghost p-4 border border-[rgba(90,196,141,0.3)]">
                  <p className="text-sm font-semibold text-[var(--accent-primary)] mb-2">
                    ✓ No Ingredient Requirements
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    This recipe has no ingredient constraints. You can forge this asset immediately after connecting your wallet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-10 max-w-2xl">
        <div className="neu-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Ingredient Requirements</h2>
            <span className="text-xs text-[var(--text-muted)]">Resolve before submit</span>
          </div>
          {recipe && recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 ? (
            <div className="space-y-2">
              {recipe.ingredientConstraints.map((constraint: Constraint, i: number) => (
                <div key={i} className="neu-ghost p-3 border border-[rgba(255,255,255,0.06)]">
                  {constraint.Signer && (
                    <p className="text-sm text-[var(--text)]">
                      <strong>Signer:</strong> {constraint.Signer.authority instanceof PublicKey ? constraint.Signer.authority.toBase58() : constraint.Signer.authority}
                    </p>
                  )}
                  {constraint.TokenMint && (
                    <p className="text-sm text-[var(--text)]">
                      <strong>Token:</strong> {constraint.TokenMint.mint instanceof PublicKey ? constraint.TokenMint.mint.toBase58() : constraint.TokenMint.mint} (Amount: {constraint.TokenMint.amount})
                    </p>
                  )}
                  {constraint.CollectionNft && (
                    <p className="text-sm text-[var(--text)]">
                      <strong>Collection NFT:</strong> {constraint.CollectionNft.collectionMint instanceof PublicKey ? constraint.CollectionNft.collectionMint.toBase58() : constraint.CollectionNft.collectionMint}
                    </p>
                  )}
                  {constraint.Allowlist && (
                    <p className="text-sm text-[var(--text)]">
                      <strong>Allowlist:</strong> Merkle proof required
                    </p>
                  )}
                  {constraint.CustomSeeds && (
                    <p className="text-sm text-[var(--text)]">
                      <strong>Custom Seeds:</strong>{" "}
                      {(() => {
                        const seeds = constraint.CustomSeeds?.seeds;
                        if (!seeds) return 0;
                        if (seeds instanceof Uint8Array) return seeds.length;
                        if (Array.isArray(seeds)) return seeds.length;
                        return (seeds as ArrayBuffer).byteLength || 0;
                      })()}{" "}
                      bytes
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-muted)]">
              {recipe ? "This recipe has no ingredient constraints." : "Loading recipe requirements..."}
            </p>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-sm text-[var(--text-muted)]">
              <strong>How to forge:</strong> Connect your Phantom wallet, ensure you meet any ingredient requirements shown above, then click "Forge Asset". 
              The transaction will mint a new NFT to your wallet.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              <strong>Note:</strong> You'll need SOL in your wallet for transaction fees. On devnet, you can get free SOL from the faucet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

