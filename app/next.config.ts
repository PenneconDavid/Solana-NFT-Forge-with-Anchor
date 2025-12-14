import path from "path";
import type { NextConfig } from "next";

// Set Turbopack root to the repo root (one level above /app) so tsconfig extends "../tsconfig.base.json" resolves.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  images: {
    // Serve local assets directly to avoid optimizer 400s in Vercel for bundled PNGs
    unoptimized: true,
  },
};

export default nextConfig;
