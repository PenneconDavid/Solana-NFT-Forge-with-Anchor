import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from incorrectly inferring a parent workspace root (due to multiple lockfiles).
  // This repo is intentionally nested under another directory that may also have a lockfile.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
