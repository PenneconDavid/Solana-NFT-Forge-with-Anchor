"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function HomePage() {
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();

  return (
    <div className="min-h-screen text-[var(--text)]">
      <div className="container mx-auto px-4 py-16">
        <div className="relative overflow-hidden neu-ghost px-8 py-12 max-w-6xl mx-auto">
          <div className="absolute inset-0 opacity-50 blur-3xl bg-gradient-to-r from-[rgba(90,196,141,0.12)] via-[rgba(73,192,215,0.12)] to-[rgba(255,127,111,0.12)] pointer-events-none" />
          <div className="relative text-center space-y-5">
            <div className="flex justify-center">
              <div className="relative w-[280px] h-[80px] sm:w-[340px] sm:h-[96px] mb-2">
                <Image
                  src="/logo-lockup.png"
                  alt="NFT Forge lockup"
                  width={340}
                  height={96}
                  className="object-contain drop-shadow-[0_12px_35px_rgba(90,196,141,0.25)]"
                  priority
                />
              </div>
            </div>
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--text-muted)]">Solana NFT Forge</p>
            <h1 className="text-5xl md:text-6xl font-semibold leading-tight">
              Craft on-chain assets with <span className="text-[var(--accent-secondary)]">recipes</span> and{" "}
              <span className="text-[var(--accent-primary)]">ingredients</span>.
            </h1>
            <p className="text-lg text-[var(--text-muted)] max-w-3xl mx-auto">
              Connect your Phantom wallet and forge NFTs using recipe-based ingredients. No setup required—works out of the box with the deployed devnet forge.
            </p>
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <WalletMultiButton className="!bg-[var(--accent-primary)] !text-[#0b0f0b] !font-semibold !px-5 !py-3 !rounded-xl btn-glow" />
              {connected && (
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-3 rounded-xl border border-[rgba(255,127,111,0.3)] text-[var(--accent-secondary)] hover:bg-[rgba(255,127,111,0.1)] hover:border-[rgba(255,127,111,0.5)] transition font-semibold"
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              )}
              <Link
                href="/mint/iron-sword"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] text-[var(--accent-tertiary)] hover:text-[var(--accent-secondary)] transition"
              >
                Forge iron-sword →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-5xl mx-auto">
          <div className="neu-panel p-6">
            <div className="text-sm text-[var(--accent-tertiary)] mb-2">Devnet live</div>
            <div className="font-semibold text-lg text-[var(--text)] mb-2">
              Program: BncAjQaJFE7xN4ut2jaAGVSKdrqpuzyuHoiCGTpj1DkN
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Recipe <span className="font-mono text-[var(--accent-secondary)]">iron-sword</span> (v2) is active on devnet.
              <span className="text-xs block mt-1 opacity-75">Ready to forge! Each wallet can mint multiple times.</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-14">
          <Link href="/creator/recipes" className="neu-panel p-7 hover:scale-[1.01] transition-transform flex flex-col">
            <div className="text-sm text-[var(--accent-tertiary)] mb-2">For creators</div>
            <h2 className="text-2xl font-semibold mb-3">Creator Dashboard</h2>
            <p className="text-[var(--text-muted)] mb-4 flex-grow">
              Define recipes, set supply caps, and configure metadata. Manage your forging logic in one place.
            </p>
            <div className="text-[var(--accent-secondary)] font-semibold">Go to Creator →</div>
          </Link>

          <div className="neu-panel p-7 flex flex-col">
            <div className="text-sm text-[var(--accent-tertiary)] mb-2">For forgers</div>
            <h2 className="text-2xl font-semibold mb-3">Forge Assets</h2>
            <p className="text-[var(--text-muted)] mb-4 flex-grow">
              Connect your Phantom wallet, review recipe requirements, and forge new NFTs. Simple 3-step process: Connect → Review → Forge.
            </p>
            {connected ? (
              <Link href="/mint/iron-sword" className="inline-flex items-center gap-2 text-[var(--accent-primary)] font-semibold hover:text-[var(--accent-secondary)]">
                Forge iron-sword →
              </Link>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">Connect your Phantom wallet to get started.</p>
            )}
          </div>

          <div className="neu-panel p-7 flex flex-col">
            <div className="text-sm text-[var(--accent-tertiary)] mb-2">Cluster-aware</div>
            <h2 className="text-2xl font-semibold mb-3">Localnet / Devnet</h2>
            <p className="text-[var(--text-muted)] mb-4 flex-grow">
              Built for localnet iteration and devnet readiness. Frontend surfaces validator prereqs and recipe status.
            </p>
            <div className="text-[var(--accent-primary)] font-semibold">Docs coming →</div>
          </div>
        </div>

        <div className="mt-16 max-w-6xl mx-auto">
          <div className="neu-panel p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="neu-ghost p-6 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                <div className="text-4xl mb-3">🌿</div>
                <h3 className="font-semibold text-lg mb-2">1. Connect Wallet</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Connect your Phantom wallet (set to Devnet). Make sure you have SOL for transaction fees. Get free devnet SOL from the faucet if needed.
                </p>
              </div>
              <div className="neu-ghost p-6 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                <div className="text-4xl mb-3">🔥</div>
                <h3 className="font-semibold text-lg mb-2">2. Review Recipe</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Check the recipe requirements. The <span className="font-mono text-[var(--accent-secondary)]">iron-sword</span> recipe has no ingredient requirements—you can forge immediately!
                </p>
              </div>
              <div className="neu-ghost p-6 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                <div className="text-4xl mb-3">🛠️</div>
                <h3 className="font-semibold text-lg mb-2">3. Forge NFT</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Click "Forge Asset" to mint your NFT. Each wallet can forge multiple times—each mint creates a unique NFT!
                </p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/mint/iron-sword"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-[#0b0f0b] font-semibold hover:bg-[var(--accent-secondary)] transition"
              >
                Try Forging Now →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
