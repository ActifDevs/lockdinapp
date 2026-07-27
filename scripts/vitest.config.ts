import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The db-upsert integration suite talks to a real hosted Postgres instance
    // (network round-trip bound) and shares one connection pool — run test files
    // sequentially and give each test a generous timeout to avoid both slow
    // network flakiness and cross-file lock contention/deadlocks on shared rows.
    testTimeout: 30000,
    fileParallelism: false,
  },
});
