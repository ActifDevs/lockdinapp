import { defineConfig } from "drizzle-kit";

// Prefer a direct (non-transaction-pooler) connection for drizzle-kit's own
// DDL operations (migrate/push/introspect); fall back to DATABASE_URL for
// setups that only have one connection string. See
// docs/supabase-local-setup.md for why the transaction-mode pooler
// (:6543) is a poor fit for migrations.
const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required");
}

// Relative paths are required: drizzle-kit 0.31 resolves out/meta by
// prefixing `./`, which breaks when `path.join(__dirname, …)` is absolute.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
