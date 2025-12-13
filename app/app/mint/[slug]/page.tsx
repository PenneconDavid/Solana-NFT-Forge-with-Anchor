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
  Signer?: { authority: string };
  TokenMint?: { mint: string; amount: number };
  CollectionNft?: { collectionMint: string };
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
  const { publicKey, connected } = useWallet();
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

        const authorityStr = process.env.NEXT_PUBLIC_FORGE_AUTHORITY;
        if (!authorityStr) {
          throw new Error(
            "Missing NEXT_PUBLIC_FORGE_AUTHORITY. Set it to the pubkey that ran `npm run init-forge` (your forge authority)."
          );
        }
        const forgeAuthority = new PublicKey(authorityStr);
        const [forgeConfigPDA] = forgeClient.deriveForgeConfigPDA(forgeAuthority);
        
        try {
          const config = await forgeClient.fetchForgeConfig(forgeAuthority);
          setForgeConfig(config);
          
          // Fetch recipe
          const recipeData = await forgeClient.fetchRecipe(forgeConfigPDA, slug, 1);
          setRecipe(recipeData);
        } catch (err) {
          console.warn("Could not fetch recipe:", err);
          // Recipe may not exist yet - show UI anyway
        }
      } catch (err) {
        console.error("Error loading recipe:", err);
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
      const authorityStr = process.env.NEXT_PUBLIC_FORGE_AUTHORITY;
      if (!authorityStr) {
        throw new Error(
          "Missing NEXT_PUBLIC_FORGE_AUTHORITY. Set it to the pubkey that ran `npm run init-forge`."
        );
      }
      const forgeAuthority = new PublicKey(authorityStr);

      // Build ingredient hash chunks
      const ingredientChunks = client.buildIngredientHashChunks(
        recipe.ingredientConstraints || [],
        publicKey
      );

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

      const sig = await client.program.methods
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
        .signers([mintKeypair])
        .rpc();

      setSuccess(`Forged successfully. Signature: ${sig}\nMint: ${mintKeypair.publicKey.toBase58()}`);
    } catch (error: unknown) {
      console.error("Error forging:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(`Error: ${message}`);
    } finally {
      setForging(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading recipe...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1208] via-[#2a1a0f] to-[#130b06] text-amber-50">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-amber-300 drop-shadow-sm">Forge Asset</h1>
          <p className="text-sm text-amber-200/70 mt-1">Rust-forge inspired: warm metals, dark hearth.</p>
        </div>

        <div className="bg-[#2b1b10]/70 backdrop-blur border border-amber-900/60 rounded-lg p-6 mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-semibold text-amber-200 mb-3">Recipe: {slug}</h2>
          <p className="text-amber-100/80 mb-4">
            Connect your wallet and ensure you meet all ingredient requirements to forge this asset.
          </p>

          {!connected ? (
            <button
              onClick={() => setVisible(true)}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#1d120b] border border-amber-900/60 p-4 rounded">
                <p className="text-sm text-amber-100/80 mb-2">Connected Wallet:</p>
                <p className="font-mono text-xs text-amber-200 break-all">{publicKey?.toString()}</p>
              </div>

              {!anchorWallet && (
                <div className="bg-amber-900/30 border border-amber-700 p-4 rounded">
                  <p className="text-sm text-amber-100">
                    Wallet adapter is not ready yet. If this persists, refresh the page and reconnect.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-700 p-4 rounded">
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-900/30 border border-emerald-700 p-4 rounded">
                  <p className="text-sm text-emerald-100 whitespace-pre-wrap">{success}</p>
                </div>
              )}

              {recipe && (
                <div className="bg-[#1d120b] border border-amber-900/60 p-4 rounded">
                  <p className="text-sm font-semibold text-amber-200 mb-2">Recipe Details:</p>
                  <p className="text-xs text-amber-100/80">
                    Status: {recipe.status?.active ? "active" : recipe.status?.paused ? "paused" : JSON.stringify(recipe.status)}
                  </p>
                  <p className="text-xs text-amber-100/80">Minted: {recipe.minted?.toString() || "0"}</p>
                  {recipe.supplyCap && (
                    <p className="text-xs text-amber-100/80">Supply Cap: {recipe.supplyCap.toString()}</p>
                  )}
                  {recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-amber-200">Ingredient Constraints:</p>
                      <ul className="text-xs text-amber-100/80 list-disc list-inside">
                        {recipe.ingredientConstraints.map((c: Constraint, i: number) => (
                          <li key={i}>
                            {c.Signer && `Signer: ${c.Signer.authority}`}
                            {c.TokenMint && `Token: ${c.TokenMint.mint} (${c.TokenMint.amount})`}
                            {c.CollectionNft && `Collection: ${c.CollectionNft.collectionMint}`}
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

              <div className="bg-amber-900/30 border border-amber-700 p-4 rounded">
                <p className="text-sm text-amber-100">
                  (Notice) Ingredient verification required. Ensure you have all required tokens/NFTs/allowlist proofs.
                  {recipe && !recipe.ingredientConstraints?.length && " This recipe has no ingredient constraints."}
                </p>
              </div>

              <button
                onClick={handleForge}
                disabled={forging || !recipe || !forgeConfig}
                className="w-full bg-amber-600 text-amber-50 px-4 py-3 rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
              >
                {forging ? "Forging..." : "Forge Asset"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-10 max-w-2xl">
        <div className="bg-[#2b1b10]/70 backdrop-blur border border-amber-900/60 rounded-lg p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-semibold text-amber-200 mb-4">Ingredient Requirements</h2>
              {recipe && recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 ? (
            <div className="space-y-2">
              {recipe.ingredientConstraints.map((constraint: Constraint, i: number) => (
                <div key={i} className="bg-[#1d120b] border border-amber-900/60 p-3 rounded">
                  {constraint.Signer && (
                    <p className="text-sm text-amber-100">
                      <strong>Signer:</strong> {constraint.Signer.authority}
                    </p>
                  )}
                  {constraint.TokenMint && (
                    <p className="text-sm text-amber-100">
                      <strong>Token:</strong> {constraint.TokenMint.mint} (Amount: {constraint.TokenMint.amount})
                    </p>
                  )}
                  {constraint.CollectionNft && (
                    <p className="text-sm text-amber-100">
                      <strong>Collection NFT:</strong> {constraint.CollectionNft.collectionMint}
                    </p>
                  )}
                  {constraint.Allowlist && (
                    <p className="text-sm text-amber-100">
                      <strong>Allowlist:</strong> Merkle proof required
                    </p>
                  )}
                  {constraint.CustomSeeds && (
                    <p className="text-sm text-amber-100">
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
            <p className="text-amber-100/80">
              {recipe ? "This recipe has no ingredient constraints." : "Loading recipe requirements..."}
            </p>
          )}
          <p className="text-sm text-amber-200/70 mt-4">
            Note: If this fails with account-not-found, ensure you deployed + ran `npm run init-forge` and
            created/activated the recipe on the same cluster.
          </p>
        </div>
      </div>
    </div>
  );
}

