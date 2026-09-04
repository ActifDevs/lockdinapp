import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { proveRouteSchemaFoundation, cleanupRouteSchemaFixtures } from "../route-schema-foundation-proof.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DIRECT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Phase 7 Slice A1: Route & Reference Schema Foundation Integrity", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await cleanupRouteSchemaFixtures(pool).catch(() => undefined);
    await pool.end();
  });

  it("proves version integrity, cardinality metadata, multi-selection uniqueness, decimal weighting, year mapping, ownership cascade, and legacy compatibility", async () => {
    await expect(proveRouteSchemaFoundation(pool)).resolves.toBeUndefined();
  });
});
