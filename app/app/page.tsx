"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Solana NFT Forge
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create and forge NFTs using recipe-based ingredients
          </p>
          <div className="flex justify-center gap-4">
            <WalletMultiButton />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          <Link
            href="/creator/recipes"
            className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-4">Creator Dashboard</h2>
            <p className="text-gray-600 mb-4">
              Create and manage recipes for forging NFTs. Set ingredient requirements,
              supply caps, and metadata.
            </p>
            <div className="text-blue-600 font-semibold">Go to Creator →</div>
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Forge Assets</h2>
            <p className="text-gray-600 mb-4">
              Use recipes to forge new NFTs by meeting ingredient requirements.
              Connect your wallet and start forging.
            </p>
            {connected ? (
              <Link
                href="/mint/example"
                className="inline-block text-blue-600 font-semibold"
              >
                Browse Recipes →
              </Link>
            ) : (
              <p className="text-gray-500 text-sm">Connect wallet to forge</p>
            )}
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="font-semibold mb-2">Create Recipes</h3>
              <p className="text-sm text-gray-600">
                Creators define recipes with ingredient requirements and output specifications.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="font-semibold mb-2">Meet Requirements</h3>
              <p className="text-sm text-gray-600">
                Users collect required tokens, NFTs, or allowlist proofs to meet recipe ingredients.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="font-semibold mb-2">Forge Assets</h3>
              <p className="text-sm text-gray-600">
                Submit ingredients to forge new NFTs according to the recipe specifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
