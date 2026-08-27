import { describe, expect, it } from "vitest";
import {
  createDatabasePoolConfig,
  validateDatabaseUrl,
} from "@workspace/db";

describe("Database configuration & pooling contracts (P5-CUTOVER-01)", () => {
  const REDACTED_PASSWORD = "secret_password_123";
  const SUPABASE_SESSION_URL = `postgres://postgres.hazvcdrcvsxmuwdfiucx:${REDACTED_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
  const SUPABASE_TRANSACTION_URL = `postgres://postgres.hazvcdrcvsxmuwdfiucx:${REDACTED_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`;
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

  describe("C. Local Development / Non-Supabase Configuration", () => {
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

  describe("D. Secret Safety & Sanitization", () => {
    it("never includes passwords or credentials in validation errors", () => {
      const result = validateDatabaseUrl(SUPABASE_SESSION_URL, {
        isServerless: true,
      });

      expect(result.error).toBeDefined();
      expect(result.error).not.toContain(REDACTED_PASSWORD);
      expect(result.error).not.toContain("postgres.hazvcdrcvsxmuwdfiucx");
      expect(result.error).not.toContain("aws-0-eu-west-1.pooler.supabase.com");
    });

    it("never includes credentials in invalid URL error", () => {
      const malformedUrl = `http://user:${REDACTED_PASSWORD}@`;
      const result = validateDatabaseUrl(malformedUrl, {
        isServerless: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).not.toContain(REDACTED_PASSWORD);
    });
  });

  describe("E. Bounded Timeout Contract", () => {
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
