"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ForgeClient, createForgeClient } from "@/lib/forgeClient";
import Link from "next/link";

export default function CreatorRecipesPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [forgeClient, setForgeClient] = useState<ForgeClient | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setLoading(false);
      return;
    }

    const programId = new PublicKey(
      process.env.NEXT_PUBLIC_FORGE_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWxTWqk1Rd9j9DJ6mM7a34P6vhi1"
    );

    createForgeClient(connection, programId)
      .then((client) => {
        setForgeClient(client);
        // Fetch forge config and recipes
        return client.fetchForgeConfig(publicKey).then((config) => {
          const [forgeConfigPDA] = client.deriveForgeConfigPDA(publicKey);
          return client.fetchAllRecipes(forgeConfigPDA);
        });
      })
        .then((recipeAccounts) => {
          setRecipes(recipeAccounts.map((acc: any) => ({ ...acc.account, pubkey: acc.publicKey })));
          setLoading(false);
        })
      .catch((error) => {
        console.error("Error fetching recipes:", error);
        setLoading(false);
      });
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
                Minted: {recipe.minted} / {recipe.supplyCap || "∞"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

