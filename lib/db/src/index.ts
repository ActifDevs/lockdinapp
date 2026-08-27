import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export interface DatabaseConfigOptions {
  connectionString: string;
  isServerless?: boolean;
}

export interface ParsedDatabaseUrlValidation {
  isValid: boolean;
  error?: string;
  isSupabasePooler?: boolean;
  port?: number;
}

/**
 * Validates runtime DATABASE_URL configuration safely.
 *
 * In serverless runtime environments (e.g. Vercel / AWS Lambda), the Supabase
 * pooler must use transaction mode (port 6543) rather than session mode (port 5432)
 * to prevent warm isolate connection exhaustion.
 *
 * Secret safety: Never leaks credentials, passwords, or full URI in returned errors.
 */
export function validateDatabaseUrl(
  urlString: string,
  options?: { isServerless?: boolean },
): ParsedDatabaseUrlValidation {
  if (!urlString || typeof urlString !== "string") {
    return {
      isValid: false,
      error: "DATABASE_URL must be set. Did you forget to provision a database?",
    };
  }

  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
    const isSupabasePooler =
      hostname.includes(".pooler.supabase.") ||
      hostname.endsWith("pooler.supabase.com");

    const isServerless =
      options?.isServerless ??
      Boolean(
        process.env.VERCEL === "1" ||
          process.env.AWS_LAMBDA_FUNCTION_NAME ||
          process.env.FUNCTION_NAME,
      );

    if (isServerless && isSupabasePooler && port === 5432) {
      return {
        isValid: false,
        isSupabasePooler: true,
        port,
        error:
          "DATABASE_URL uses Supabase session pooling (port 5432) in a serverless runtime environment. " +
          "Application runtime requires Supabase transaction pooling (port 6543) to prevent connection pool exhaustion.",
      };
    }

    return {
      isValid: true,
      isSupabasePooler,
      port,
    };
  } catch {
    return {
      isValid: false,
      error: "DATABASE_URL is not a valid connection URL format.",
    };
  }
}

/**
 * Creates pg.Pool options configured for serverless runtime operation.
 */
export function createDatabasePoolConfig(options: DatabaseConfigOptions): pg.PoolConfig {
  const validation = validateDatabaseUrl(options.connectionString, {
    isServerless: options.isServerless,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return {
    connectionString: options.connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    // query_timeout bounds client-side execution time in node-postgres
    // to prevent queries from hanging indefinitely on stalled downstream connections.
    query_timeout: 15_000,
    // statement_timeout bounds backend Postgres query execution time (in ms).
    statement_timeout: 15_000,
    allowExitOnIdle: true,
  };
}

let _pool: pg.Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

export function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool(
      createDatabasePoolConfig({
        connectionString: process.env.DATABASE_URL,
      }),
    );
  }
  return _pool;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

/**
 * Serverless runtime database pool.
 *
 * Configured with:
 * - max: 1 connection per warm isolate
 * - idleTimeoutMillis: 5s
 * - connectionTimeoutMillis: 10s (max wait to establish a new client connection)
 * - query_timeout: 15s (client-side query execution timeout in node-postgres)
 * - statement_timeout: 15s (Postgres backend statement timeout)
 * - allowExitOnIdle: true
 */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    const activePool = getPool();
    const value = Reflect.get(activePool, prop, receiver);
    if (typeof value === "function") {
      return value.bind(activePool);
    }
    return value;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const activeDb = getDb();
    const value = Reflect.get(activeDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(activeDb);
    }
    return value;
  },
});

export * from "./schema";
