import { defineConfig } from "vitest/config";

/**
 * Non-skipping local Supabase integration suite.
 * Invoked only via `pnpm test:integration` after require-local-supabase.mjs.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
