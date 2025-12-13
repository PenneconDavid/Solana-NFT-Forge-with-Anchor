"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ForgeClient, createForgeClient } from "@/lib/forgeClient";
import { useParams } from "next/navigation";

export default function RecipeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey || !slug) {
      setLoading(false);
      return;
    }

    const programId = new PublicKey(
      process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1"
    );

    createForgeClient(connection, programId)
      .then((client) => {
        const [forgeConfigPDA] = client.deriveForgeConfigPDA(publicKey);
        // Parse version from query params (would need useSearchParams in real implementation)
        const version = 1; // Default for now
        return client.fetchRecipe(forgeConfigPDA, slug, version);
      })
      .then((recipeData) => {
        setRecipe(recipeData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching recipe:", error);
        setLoading(false);
      });
  }, [connected, publicKey, connection, slug]);

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Please connect your wallet to view recipe details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Recipe not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{recipe.slug}</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Recipe Details</h2>
        <div className="space-y-2">
          <p><strong>Version:</strong> {recipe.version}</p>
          <p><strong>Status:</strong> {JSON.stringify(recipe.status)}</p>
          <p><strong>Output Kind:</strong> {JSON.stringify(recipe.outputKind)}</p>
          <p><strong>Supply Cap:</strong> {recipe.supplyCap || "Unlimited"}</p>
          <p><strong>Minted:</strong> {recipe.minted}</p>
          <p><strong>Metadata URI:</strong> {recipe.metadataUri}</p>
          {recipe.goLiveUnixTime && (
            <p><strong>Go Live:</strong> {new Date(recipe.goLiveUnixTime * 1000).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Ingredient Constraints</h2>
        {recipe.ingredientConstraints.length === 0 ? (
          <p className="text-gray-600">No ingredient constraints defined.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {recipe.ingredientConstraints.map((constraint: any, index: number) => (
              <li key={index}>{JSON.stringify(constraint)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

