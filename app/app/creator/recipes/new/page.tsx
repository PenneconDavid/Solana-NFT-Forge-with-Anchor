"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export default function NewRecipePage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { setVisible } = useWalletModal();
  const [formData, setFormData] = useState({
    slug: "",
    version: "1",
    outputKind: "one-of-one",
    supplyCap: "",
    metadataUri: "",
    collectionMint: "",
    goLive: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Create New Recipe</h1>
        <p className="text-gray-600 mb-4">Please connect your wallet to create a recipe.</p>
        <button
          onClick={() => setVisible(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Implement recipe creation via Anchor client
      // This would call the create-recipe script or use the client directly
      alert("Recipe creation will be implemented with full Anchor integration");
      
      // For now, just show success
      router.push("/creator/recipes");
    } catch (error: unknown) {
      console.error("Error creating recipe:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`Error: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Recipe</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Slug *</label>
          <input
            type="text"
            required
            maxLength={32}
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
            placeholder="my-recipe"
          />
          <p className="text-xs text-gray-500 mt-1">Max 32 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Version *</label>
          <input
            type="number"
            required
            min="1"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Output Kind *</label>
          <select
            value={formData.outputKind}
            onChange={(e) => setFormData({ ...formData, outputKind: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
          >
            <option value="one-of-one">One of One (1/1 NFT)</option>
            <option value="edition">Edition</option>
            <option value="semi-fungible">Semi-Fungible</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Supply Cap</label>
          <input
            type="number"
            min="1"
            value={formData.supplyCap}
            onChange={(e) => setFormData({ ...formData, supplyCap: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Metadata URI *</label>
          <input
            type="text"
            required
            value={formData.metadataUri}
            onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
            placeholder="https://ipfs.io/ipfs/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Collection Mint</label>
          <input
            type="text"
            value={formData.collectionMint}
            onChange={(e) => setFormData({ ...formData, collectionMint: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
            placeholder="Optional collection pubkey"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--text)]">Go Live Date</label>
          <input
            type="datetime-local"
            value={formData.goLive}
            onChange={(e) => {
              const timestamp = e.target.value
                ? Math.floor(new Date(e.target.value).getTime() / 1000)
                : "";
              setFormData({ ...formData, goLive: timestamp.toString() });
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-[#0d120e] bg-white"
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ Note: Ingredient constraints and creators will be added in a future update.
            This form creates a basic recipe structure.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Recipe"}
          </button>
        </div>
      </form>
    </div>
  );
}

