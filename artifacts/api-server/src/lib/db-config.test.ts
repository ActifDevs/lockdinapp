import { describe, expect, it } from "vitest";
import {
  createDatabasePoolConfig,
  validateDatabaseUrl,
} from "@workspace/db";

describe("Database configuration & pooling contracts (P5-CUTOVER-01)", () => {
  const SYNTHETIC_PASSWORD = "fake-test-password";
  const SUPABASE_SESSION_URL = `postgres://postgres.synthetic-project:${SYNTHETIC_PASSWORD}@aws-0-test-region.pooler.supabase.com:5432/postgres`;
  const SUPABASE_TRANSACTION_URL = `postgres://postgres.synthetic-project:${SYNTHETIC_PASSWORD}@aws-0-test-region.pooler.supabase.com:6543/postgres`;
  const LOCAL_DB_URL = "postgres://postgres:postgres@127.0.0.1:5432/lockdin";
  const CUSTOM_HOST_URL = "postgres://user:pass@db.customhost.internal:5432/lockdin";

  describe("A. Serverless Runtime + Session Pooler (port 5432)", () => {
    it("rejects session pooler port 5432 in serverless runtime environment", () => {
      const result = validateDatabaseUrl(SUPABASE_SESSION_URL, {
        isServerless: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("uses Supabase session pooling (port 5432) in a serverless runtime environment");
      expect(result.error).toContain("transaction pooling (port 6543)");
    });

    it("throws when creating pool config with session pooler in serverless runtime", () => {
      expect(() =>
        createDatabasePoolConfig({
          connectionString: SUPABASE_SESSION_URL,
          isServerless: true,
        }),
      ).toThrowError(/Supabase session pooling \(port 5432\)/);
    });
  });

  describe("B. Serverless Runtime + Transaction Pooler (port 6543)", () => {
    it("accepts transaction pooler port 6543 in serverless runtime environment", () => {
      const result = validateDatabaseUrl(SUPABASE_TRANSACTION_URL, {
        isServerless: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.isSupabasePooler).toBe(true);
      expect(result.port).toBe(6543);
      expect(result.error).toBeUndefined();
    });

    it("creates pool config with transaction pooler in serverless runtime", () => {
      const config = createDatabasePoolConfig({
        connectionString: SUPABASE_TRANSACTION_URL,
        isServerless: true,
      });

      expect(config.connectionString).toBe(SUPABASE_TRANSACTION_URL);
      expect(config.max).toBe(1);
    });
  });

  describe("C. Auto-detected Vercel Runtime", () => {
    it("rejects session pooling without an explicit serverless override", () => {
      const originalVercel = process.env.VERCEL;

      try {
        process.env.VERCEL = "1";
        let thrown: unknown;

        try {
          createDatabasePoolConfig({
            connectionString: SUPABASE_SESSION_URL,
          });
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBeInstanceOf(Error);
        const message = (thrown as Error).message;
        expect(message).toContain("Supabase session pooling (port 5432)");
        expect(message).toContain("transaction pooling (port 6543)");
        expect(message).not.toContain(SYNTHETIC_PASSWORD);
        expect(message).not.toContain(SUPABASE_SESSION_URL);
        expect(message).not.toContain("synthetic-project");
        expect(message).not.toContain("aws-0-test-region");
      } finally {
        if (originalVercel === undefined) {
          delete process.env.VERCEL;
        } else {
          process.env.VERCEL = originalVercel;
        }
      }
    });

    it("accepts transaction pooling without an explicit serverless override", () => {
      const originalVercel = process.env.VERCEL;

      try {
        process.env.VERCEL = "1";
        const config = createDatabasePoolConfig({
          connectionString: SUPABASE_TRANSACTION_URL,
        });

        expect(config.connectionString).toBe(SUPABASE_TRANSACTION_URL);
        expect(config.max).toBe(1);
        expect(config.idleTimeoutMillis).toBe(5_000);
        expect(config.connectionTimeoutMillis).toBe(10_000);
        expect(config.query_timeout).toBe(15_000);
        expect(config.statement_timeout).toBe(15_000);
        expect(config.allowExitOnIdle).toBe(true);
      } finally {
        if (originalVercel === undefined) {
          delete process.env.VERCEL;
        } else {
          process.env.VERCEL = originalVercel;
        }
      }
    });
  });

  describe("D. Local Development / Non-Supabase Configuration", () => {
    it("accepts local Postgres on port 5432 even when serverless flag is set", () => {
      const result = validateDatabaseUrl(LOCAL_DB_URL, {
        isServerless: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.isSupabasePooler).toBe(false);
      expect(result.port).toBe(5432);
    });

    it("accepts custom non-Supabase hosts on port 5432 in serverless", () => {
      const result = validateDatabaseUrl(CUSTOM_HOST_URL, {
        isServerless: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.isSupabasePooler).toBe(false);
      expect(result.port).toBe(5432);
    });

    it("accepts session pooler when not in serverless runtime (e.g. migration / CLI tool context)", () => {
      const result = validateDatabaseUrl(SUPABASE_SESSION_URL, {
        isServerless: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.isSupabasePooler).toBe(true);
      expect(result.port).toBe(5432);
    });
  });

  describe("E. Secret Safety & Sanitization", () => {
    it("never includes passwords or credentials in validation errors", () => {
      const result = validateDatabaseUrl(SUPABASE_SESSION_URL, {
        isServerless: true,
      });

      expect(result.error).toBeDefined();
      expect(result.error).not.toContain(SYNTHETIC_PASSWORD);
      expect(result.error).not.toContain("postgres.synthetic-project");
      expect(result.error).not.toContain("aws-0-test-region.pooler.supabase.com");
    });

    it("never includes credentials in invalid URL error", () => {
      const malformedUrl = `http://user:${SYNTHETIC_PASSWORD}@`;
      const result = validateDatabaseUrl(malformedUrl, {
        isServerless: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).not.toContain(SYNTHETIC_PASSWORD);
    });
  });

  describe("F. Bounded Timeout Contract", () => {
    it("configures bounded connection, query, and statement timeouts", () => {
      const config = createDatabasePoolConfig({
        connectionString: SUPABASE_TRANSACTION_URL,
        isServerless: true,
      });

      // connectionTimeoutMillis bounds new client connection establishment in node-postgres
      expect(config.connectionTimeoutMillis).toBe(10_000);

      // query_timeout bounds client-side query execution time to prevent indefinitely unresolved queries
      expect(config.query_timeout).toBe(15_000);

      // statement_timeout sets server-side PostgreSQL execution limit
      expect(config.statement_timeout).toBe(15_000);

      // max 1 connection per warm isolate and 5s idle timeout
      expect(config.max).toBe(1);
      expect(config.idleTimeoutMillis).toBe(5_000);
      expect(config.allowExitOnIdle).toBe(true);
    });
  });
});
