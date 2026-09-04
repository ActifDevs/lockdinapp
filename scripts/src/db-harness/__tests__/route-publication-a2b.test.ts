import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  cleanupRouteImmutabilityFixtures,
  proveRouteReferenceImmutability,
} from "../route-immutability-proof.js";
import {
  cleanupRoutePublicationFixtures,
  proveRoutePublication,
} from "../../route-manifest/publication-proof.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DIRECT_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Phase 7 Slice A2B: Route publication + immutability", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  afterAll(async () => {
    await cleanupRouteImmutabilityFixtures(pool).catch(() => undefined);
    await cleanupRoutePublicationFixtures(pool).catch(() => undefined);
    await pool.end();
  });

  it("enforces 0017 immutability state machine and route revision uniqueness", async () => {
    await expect(proveRouteReferenceImmutability(pool)).resolves.toBeUndefined();
  });

  it("publishes synthetic manifests with idempotency, replacement, rollback, and locking", async () => {
    await expect(proveRoutePublication(pool)).resolves.toBeUndefined();
  });
});
