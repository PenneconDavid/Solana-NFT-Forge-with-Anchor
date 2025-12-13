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

export default function MintPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [recipe, setRecipe] = useState<any>(null);
  const [forgeConfig, setForgeConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [client, setClient] = useState<ForgeClient | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const loadRecipe = async () => {
      try {
        const programId = new PublicKey(
          process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID ||
            "BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN"
        );

        const forgeClient = await createForgeClient(connection, programId, anchorWallet as any);
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
      const inputHashArray = Array.from(inputHash) as [number, ...number[]] & { length: 32 };

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
      const remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [];

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
    } catch (error: any) {
      console.error("Error forging:", error);
      setError(`Error: ${error.message}`);
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Forge Asset</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Recipe: {slug}</h2>
        <p className="text-gray-600 mb-4">
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
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-2">Connected Wallet:</p>
              <p className="font-mono text-sm">{publicKey?.toString()}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 p-4 rounded">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {recipe && (
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm font-semibold mb-2">Recipe Details:</p>
                <p className="text-xs text-gray-600">Status: {recipe.status}</p>
                <p className="text-xs text-gray-600">Minted: {recipe.minted?.toString() || "0"}</p>
                {recipe.supplyCap && (
                  <p className="text-xs text-gray-600">Supply Cap: {recipe.supplyCap.toString()}</p>
                )}
                {recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Ingredient Constraints:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside">
                      {recipe.ingredientConstraints.map((c: any, i: number) => (
                        <li key={i}>
                          {c.Signer && `Signer: ${c.Signer.authority}`}
                          {c.TokenMint && `Token: ${c.TokenMint.mint} (${c.TokenMint.amount})`}
                          {c.CollectionNft && `Collection: ${c.CollectionNft.collectionMint}`}
                          {c.Allowlist && `Allowlist: ${Array.from(new Uint8Array(c.Allowlist.merkleRoot)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)}...`}
                          {c.CustomSeeds && `Custom Seeds: ${c.CustomSeeds.seeds.length} bytes`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Ingredient verification required. Ensure you have all required tokens/NFTs/allowlist proofs.
                {recipe && !recipe.ingredientConstraints?.length && " This recipe has no ingredient constraints."}
              </p>
            </div>

            <button
              onClick={handleForge}
              disabled={forging || !recipe || !forgeConfig}
              className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {forging ? "Forging..." : "Forge Asset"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Ingredient Requirements</h2>
        {recipe && recipe.ingredientConstraints && recipe.ingredientConstraints.length > 0 ? (
          <div className="space-y-2">
            {recipe.ingredientConstraints.map((constraint: any, i: number) => (
              <div key={i} className="bg-gray-50 p-3 rounded">
                {constraint.Signer && (
                  <p className="text-sm">
                    <strong>Signer:</strong> {constraint.Signer.authority}
                  </p>
                )}
                {constraint.TokenMint && (
                  <p className="text-sm">
                    <strong>Token:</strong> {constraint.TokenMint.mint} (Amount: {constraint.TokenMint.amount})
                  </p>
                )}
                {constraint.CollectionNft && (
                  <p className="text-sm">
                    <strong>Collection NFT:</strong> {constraint.CollectionNft.collectionMint}
                  </p>
                )}
                {constraint.Allowlist && (
                  <p className="text-sm">
                    <strong>Allowlist:</strong> Merkle proof required
                  </p>
                )}
                {constraint.CustomSeeds && (
                  <p className="text-sm">
                    <strong>Custom Seeds:</strong> {constraint.CustomSeeds.seeds.length} bytes
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">
            {recipe ? "This recipe has no ingredient constraints." : "Loading recipe requirements..."}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Note: If this fails with “account not found”, ensure you deployed + ran `npm run init-forge` and created/activated the recipe on the same cluster.
        </p>
      </div>
    </div>
  );
}

