import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { isLoopbackUrl } from "../../db-harness/target-safety.js";
import { proveB5brVisibilityAndRouteContract } from "../b5br-visibility-route-proof.js";

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL ?? "";

const canRun =
  Boolean(databaseUrl) &&
  isLoopbackUrl(databaseUrl) &&
  process.env.LOCKDIN_RUN_B5BR_DB_PROOF === "1";

describe.runIf(canRun)("B5BR visibility + route fail-closed DB proof", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("proves DEFAULT false, current-nine backfill when present, future hide, zero-route fail-closed", async () => {
    await expect(proveB5brVisibilityAndRouteContract(pool)).resolves.toBeUndefined();
  });
});

describe("B5BR proof helpers are importable without DB", () => {
  it("exports prove function", async () => {
    expect(typeof proveB5brVisibilityAndRouteContract).toBe("function");
  });
});
