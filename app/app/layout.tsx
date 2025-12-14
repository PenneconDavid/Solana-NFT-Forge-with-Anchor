import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/lib/wallet";
import logoHammer from "@/public/logos/logo-hammer.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solana NFT Forge",
  description: "Create and forge NFTs using recipe-based ingredients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletContextProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
            <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(13,18,14,0.6)] backdrop-blur-md">
              <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                    <Image
                      src={logoHammer}
                      alt="NFT Forge logo"
                      width={36}
                      height={36}
                      className="object-contain p-1.5"
                      priority
                    />
                  </div>
                  <div>
                    <div className="text-[var(--text)] font-semibold">NFT Forge</div>
                    <div className="text-[var(--text-muted)]">Recipes → Ingredients → Assets</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-muted)]">Built by</span>
                  <a
                    href="https://github.com/PenneconDavid"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] hover:border-[rgba(255,255,255,0.14)] transition"
                  >
                    <span>{`{ David Seibold }`}</span>
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
