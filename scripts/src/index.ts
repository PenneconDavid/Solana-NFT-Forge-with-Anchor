#!/usr/bin/env node

/**
 * Main entry point for Forge CLI scripts.
 * 
 * Individual scripts can be run directly:
 * - ts-node src/init-forge.ts
 * - ts-node src/create-recipe.ts
 * - ts-node src/toggle-recipe.ts
 * - ts-node src/forge-example.ts
 * - ts-node src/forge-asset.ts
 */

export * from "./init-forge";
export * from "./create-recipe";
export * from "./toggle-recipe";
export * from "./forge-asset";
