"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen text-amber-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-amber-300 drop-shadow-sm">Solana NFT Forge</h1>
          <p className="text-xl text-amber-100/80 mb-8">
            Create and forge NFTs using recipe-based ingredients.
          </p>
          <div className="flex justify-center gap-4">
            <WalletMultiButton />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-12">
          <Link
            href="/creator/recipes"
            className="bg-[#2b1b10]/70 backdrop-blur border border-amber-900/60 rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:border-amber-600 transition-colors"
          >
            <h2 className="text-2xl font-semibold text-amber-200 mb-4">Creator Dashboard</h2>
            <p className="text-amber-100/80 mb-4">
              Create and manage recipes for forging NFTs. Set ingredient requirements, supply caps, and metadata.
            </p>
            <div className="text-amber-300 font-semibold">Go to Creator →</div>
          </Link>

          <div className="bg-[#2b1b10]/70 backdrop-blur border border-amber-900/60 rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <h2 className="text-2xl font-semibold text-amber-200 mb-4">Forge Assets</h2>
            <p className="text-amber-100/80 mb-4">
              Use recipes to forge new NFTs by meeting ingredient requirements. Connect your wallet and start forging.
            </p>
            {connected ? (
              <Link href="/mint/example" className="inline-block text-amber-300 font-semibold hover:text-amber-100">
                Browse Recipes →
              </Link>
            ) : (
              <p className="text-amber-200/70 text-sm">Connect wallet to forge</p>
            )}
          </div>
        </div>

        <div className="mt-16 bg-[#2b1b10]/70 backdrop-blur border border-amber-900/60 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-8 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-amber-200 mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6 text-amber-100/80">
            <div className="bg-[#1d120b] border border-amber-900/60 rounded p-4">
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="font-semibold mb-2 text-amber-200">Create Recipes</h3>
              <p className="text-sm">
                Creators define recipes with ingredient requirements and output specifications.
              </p>
            </div>
            <div className="bg-[#1d120b] border border-amber-900/60 rounded p-4">
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="font-semibold mb-2 text-amber-200">Meet Requirements</h3>
              <p className="text-sm">
                Users collect required tokens, NFTs, or allowlist proofs to meet recipe ingredients.
              </p>
            </div>
            <div className="bg-[#1d120b] border border-amber-900/60 rounded p-4">
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="font-semibold mb-2 text-amber-200">Forge Assets</h3>
              <p className="text-sm">
                Submit ingredients to forge new NFTs according to the recipe specifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
