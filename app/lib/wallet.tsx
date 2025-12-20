"use client";

import React, { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER || "localnet";
  
  // Determine network and endpoint
  const { endpoint, network } = useMemo(() => {
    if (cluster === "localnet") {
      return {
        endpoint: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899",
        network: undefined as WalletAdapterNetwork | undefined, // Localnet doesn't use WalletAdapterNetwork
      };
    }
    
    // Map cluster string to WalletAdapterNetwork
    const networkMap: Record<string, WalletAdapterNetwork> = {
      devnet: WalletAdapterNetwork.Devnet,
      "mainnet-beta": WalletAdapterNetwork.Mainnet,
    };
    const network = networkMap[cluster] || WalletAdapterNetwork.Devnet;
    
    // Use custom RPC URL if provided, otherwise use clusterApiUrl
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
    
    return { endpoint, network };
  }, [cluster]);

  const wallets = useMemo(
    () => {
      const walletAdapters = [];
      
      // Configure Phantom with network if specified
      if (network !== undefined) {
        walletAdapters.push(new PhantomWalletAdapter({ network }));
      } else {
        walletAdapters.push(new PhantomWalletAdapter());
      }
      
      // Configure Solflare with network if specified
      if (network !== undefined) {
        walletAdapters.push(new SolflareWalletAdapter({ network }));
      } else {
        walletAdapters.push(new SolflareWalletAdapter());
      }
      
      return walletAdapters;
    },
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

