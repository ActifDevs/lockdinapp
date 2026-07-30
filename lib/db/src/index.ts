import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Session-mode Supabase pooler caps concurrent clients (currently pool_size: 15).
 * Default node-pg Pool max is 10 per process; Vercel can run many concurrent
 * lambdas, and routes that `Promise.all` per-subject queries open one client each.
 * That exhausts the pooler with:
 *   (EMAXCONNSESSION) max clients reached in session mode
 * Keep max at 1 so each serverless isolate reuses a single connection; parallel
 * awaits queue on the pool instead of opening N sessions.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
