"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { createForgeClient } from "@/lib/forgeClient";
import Link from "next/link";

type RecipeSummary = {
  slug: string;
  version: number;
  status?: unknown;
  minted?: unknown;
  supplyCap?: unknown;
  pubkey: PublicKey;
};

export default function CreatorRecipesPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(!!connected);

  useEffect(() => {
    if (!connected || !publicKey) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const programId = new PublicKey(
          process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1"
        );

        const client = await createForgeClient(connection, programId);
        const [forgeConfigPDA] = client.deriveForgeConfigPDA(publicKey);
        const recipeAccounts = await client.fetchAllRecipes(forgeConfigPDA);
        if (cancelled) return;
        setRecipes(
          recipeAccounts.map((acc) => {
            const account = acc.account as Record<string, unknown>;
            return {
              ...(account as object),
              pubkey: acc.publicKey,
            } as RecipeSummary;
          })
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching recipes:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection]);

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Creator Recipes</h1>
        <p className="text-gray-600">Please connect your wallet to view recipes.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Creator Recipes</h1>
        <p>Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Creator Recipes</h1>
        <Link
          href="/creator/recipes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <p className="text-gray-600 mb-4">No recipes found.</p>
          <Link
            href="/creator/recipes/new"
            className="text-blue-600 hover:underline"
          >
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe, index) => (
            <Link
              key={index}
              href={`/creator/recipes/${recipe.slug}?version=${recipe.version}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{recipe.slug}</h2>
              <p className="text-sm text-gray-600 mb-2">Version: {recipe.version}</p>
              <p className="text-sm text-gray-600 mb-2">
                Status: {JSON.stringify(recipe.status)}
              </p>
              <p className="text-sm text-gray-600">
                Minted: {String(recipe.minted ?? "0")} / {String(recipe.supplyCap ?? "∞")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

