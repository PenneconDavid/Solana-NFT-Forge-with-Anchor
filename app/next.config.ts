import path from "path";
import type { NextConfig } from "next";

// Set Turbopack root to the repo root (one level above /app) so tsconfig extends "../tsconfig.base.json" resolves.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
