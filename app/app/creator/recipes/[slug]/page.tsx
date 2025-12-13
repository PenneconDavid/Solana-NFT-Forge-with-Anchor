"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { createForgeClient } from "@/lib/forgeClient";
import { useParams } from "next/navigation";

type RecipeDetail = {
  slug: string;
  version: number;
  status?: unknown;
  outputKind?: unknown;
  supplyCap?: unknown;
  minted?: unknown;
  metadataUri?: string;
  goLiveUnixTime?: number;
  ingredientConstraints: unknown[];
};

export default function RecipeDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(!!connected);

  useEffect(() => {
    if (!connected || !publicKey || !slug) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const programId = new PublicKey(
          process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1"
        );

        const client = await createForgeClient(connection, programId);
        const [forgeConfigPDA] = client.deriveForgeConfigPDA(publicKey);
        const version = 1; // Default for now
        const recipeData = (await client.fetchRecipe(
          forgeConfigPDA,
          slug,
          version
        )) as RecipeDetail;
        if (!cancelled) setRecipe(recipeData);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching recipe:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
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

  const ingredientConstraints: Record<string, unknown>[] = Array.isArray(recipe.ingredientConstraints)
    ? (recipe.ingredientConstraints as Record<string, unknown>[])
    : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{recipe.slug}</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Recipe Details</h2>
        <div className="space-y-2">
          <p><strong>Version:</strong> {recipe.version}</p>
          <p><strong>Status:</strong> {JSON.stringify(recipe.status)}</p>
          <p><strong>Output Kind:</strong> {JSON.stringify(recipe.outputKind)}</p>
          <p><strong>Supply Cap:</strong> {String(recipe.supplyCap ?? "Unlimited")}</p>
          <p><strong>Minted:</strong> {String(recipe.minted ?? "0")}</p>
          <p><strong>Metadata URI:</strong> {recipe.metadataUri}</p>
          {recipe.goLiveUnixTime && (
            <p><strong>Go Live:</strong> {new Date(recipe.goLiveUnixTime * 1000).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Ingredient Constraints</h2>
        {ingredientConstraints.length === 0 ? (
          <p className="text-gray-600">No ingredient constraints defined.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {ingredientConstraints.map((constraint, index) => (
              <li key={index}>{JSON.stringify(constraint)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

